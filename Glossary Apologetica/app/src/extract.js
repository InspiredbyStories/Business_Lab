/**
 * TEXT EXTRACTION FROM UPLOADED FILES
 * -----------------------------------
 * Supported: TXT, MD, CSV, JSON, HTML, DOCX, PDF, and images via Windows OCR.
 *
 * Everything here is best-effort and always returns text the user can review
 * and correct before saving — the specification (section 10, step 5) requires
 * that the extracted text be editable, precisely because extraction is never
 * perfect on scanned or unusual documents.
 *
 * No external libraries: DOCX is unzipped and PDF streams are inflated using
 * Node's built-in zlib.
 */

import zlib from 'node:zlib';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';

export const SUPPORTED = {
  '.txt': 'text', '.md': 'text', '.markdown': 'text', '.csv': 'text',
  '.json': 'text', '.log': 'text', '.htm': 'html', '.html': 'html',
  '.docx': 'docx', '.pdf': 'pdf',
  '.png': 'image', '.jpg': 'image', '.jpeg': 'image',
  '.bmp': 'image', '.tif': 'image', '.tiff': 'image', '.gif': 'image',
};

export async function extractText(filename, buffer, toolsDir) {
  const ext = path.extname(filename || '').toLowerCase();
  const kind = SUPPORTED[ext];

  try {
    switch (kind) {
      case 'text':
        return { text: stripBom(buffer.toString('utf8')), ok: true };
      case 'html':
        return { text: htmlToText(buffer.toString('utf8')), ok: true };
      case 'docx':
        return extractDocx(buffer);
      case 'pdf':
        return extractPdf(buffer);
      case 'image':
        return await extractImage(filename, buffer, toolsDir);
      default:
        return {
          text: '',
          ok: false,
          warning: `This application does not read ${ext || 'that file type'} yet. The file has still been attached to the entry — type or paste its text into the Text box yourself.`,
        };
    }
  } catch (err) {
    return {
      text: '',
      ok: false,
      warning: `The text could not be read automatically (${err.message}). The file is still attached — you can type or paste the text yourself.`,
    };
  }
}

function stripBom(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/* ------------------------------------------------------------------ */
/* HTML                                                                */
/* ------------------------------------------------------------------ */

function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function decodeEntities(s) {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', mdash: '—', ndash: '–', hellip: '…',
  };
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => named[n.toLowerCase()] ?? m);
}

/* ------------------------------------------------------------------ */
/* DOCX — a ZIP container holding word/document.xml                    */
/* ------------------------------------------------------------------ */

function extractDocx(buffer) {
  const xml = readZipEntry(buffer, 'word/document.xml');
  if (!xml) {
    return { text: '', ok: false, warning: 'That .docx file could not be opened (its document part is missing).' };
  }
  const text = decodeEntities(
    xml.toString('utf8')
      .replace(/<w:tab[^>]*\/>/g, '\t')
      .replace(/<w:br[^>]*\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
  ).replace(/\n{3,}/g, '\n\n').trim();

  return { text, ok: text.length > 0, warning: text ? '' : 'No readable text was found in that document.' };
}

/** Minimal ZIP reader: finds one file inside the archive and inflates it. */
function readZipEntry(buf, wantedName) {
  const EOCD_SIG = 0x06054b50;
  let eocd = -1;
  const from = Math.max(0, buf.length - 66000);
  for (let i = buf.length - 22; i >= from; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) { eocd = i; break; }
  }
  if (eocd === -1) return null;

  const entryCount = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);

  for (let n = 0; n < entryCount; n++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) break;
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);

    if (name === wantedName) {
      const lhNameLen = buf.readUInt16LE(localOffset + 26);
      const lhExtraLen = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lhNameLen + lhExtraLen;
      const raw = buf.subarray(start, start + compSize);
      return method === 0 ? raw : zlib.inflateRawSync(raw);
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* PDF — inflate content streams and read the text-showing operators   */
/* ------------------------------------------------------------------ */

function extractPdf(buffer) {
  const chunks = [];
  const marker = Buffer.from('stream');
  const endMarker = Buffer.from('endstream');

  let pos = 0;
  while (pos < buffer.length) {
    const s = buffer.indexOf(marker, pos);
    if (s === -1) break;
    let dataStart = s + marker.length;
    if (buffer[dataStart] === 0x0d) dataStart += 1;
    if (buffer[dataStart] === 0x0a) dataStart += 1;

    const e = buffer.indexOf(endMarker, dataStart);
    if (e === -1) break;

    const raw = buffer.subarray(dataStart, e);
    let content = null;
    try {
      content = zlib.inflateSync(raw);
    } catch {
      try { content = zlib.inflateRawSync(raw); } catch { content = null; }
    }
    if (!content && looksLikeText(raw)) content = raw;
    if (content) chunks.push(content.toString('latin1'));

    pos = e + endMarker.length;
  }

  if (!chunks.length) {
    return {
      text: '',
      ok: false,
      warning: 'No readable text layer was found in that PDF. It is probably a scan — attach it, then use an image upload for OCR, or type the text yourself.',
    };
  }

  const text = chunks.map(readPdfContentStream).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!text) {
    return {
      text: '',
      ok: false,
      warning: 'That PDF stores its text in a form this reader cannot decode (often a scanned or specially encoded document). The file is attached — type or paste the text yourself.',
    };
  }
  return {
    text,
    ok: true,
    warning: 'PDF text was extracted automatically. Please read it over and correct anything that came out wrong before saving.',
  };
}

function looksLikeText(buf) {
  const sample = buf.subarray(0, 400);
  let printable = 0;
  for (const b of sample) if (b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127)) printable += 1;
  return sample.length > 0 && printable / sample.length > 0.85;
}

/** Reads Tj / TJ / ' / " text-showing operators out of a PDF content stream. */
function readPdfContentStream(content) {
  const out = [];
  let i = 0;
  let pendingLine = false;

  while (i < content.length) {
    const ch = content[i];

    if (ch === '(') {
      const { value, next } = readPdfString(content, i);
      out.push(value);
      i = next;
      continue;
    }
    if (ch === '<' && content[i + 1] !== '<') {
      const close = content.indexOf('>', i);
      if (close !== -1) {
        out.push(hexToString(content.slice(i + 1, close)));
        i = close + 1;
        continue;
      }
    }
    // Operators that move to a new line
    if (
      (ch === 'T' && (content[i + 1] === 'D' || content[i + 1] === '*')) ||
      (ch === 'T' && content[i + 1] === 'd') ||
      (ch === 'E' && content[i + 1] === 'T')
    ) {
      pendingLine = true;
    }
    if (pendingLine && out.length && !out[out.length - 1].endsWith('\n')) {
      out.push('\n');
      pendingLine = false;
    }
    i += 1;
  }

  return out.join('')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length)
    .join('\n');
}

function readPdfString(s, start) {
  let i = start + 1;
  let depth = 1;
  let out = '';
  while (i < s.length && depth > 0) {
    const c = s[i];
    if (c === '\\') {
      const n = s[i + 1];
      const simple = { n: '\n', r: '\n', t: '\t', b: '', f: '', '(': '(', ')': ')', '\\': '\\' };
      if (n in simple) { out += simple[n]; i += 2; continue; }
      if (/[0-7]/.test(n)) {
        const oct = s.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)[0];
        out += String.fromCharCode(parseInt(oct, 8));
        i += 1 + oct.length;
        continue;
      }
      i += 2;
      continue;
    }
    if (c === '(') { depth += 1; out += c; i += 1; continue; }
    if (c === ')') { depth -= 1; if (depth > 0) out += c; i += 1; continue; }
    out += c;
    i += 1;
  }
  return { value: out, next: i };
}

function hexToString(hex) {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  let out = '';
  for (let i = 0; i + 1 < clean.length; i += 2) {
    const code = parseInt(clean.slice(i, i + 2), 16);
    if (code >= 32 || code === 10 || code === 9) out += String.fromCharCode(code);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Images — OCR through the engine built into Windows                  */
/* ------------------------------------------------------------------ */

async function extractImage(filename, buffer, toolsDir) {
  if (process.platform !== 'win32') {
    return { text: '', ok: false, warning: 'Text recognition from images is only available on Windows. The image is attached — type its text yourself.' };
  }
  const script = path.join(toolsDir, 'ocr.ps1');
  if (!fs.existsSync(script)) {
    return { text: '', ok: false, warning: 'The text-recognition helper is missing. The image is attached — type its text yourself.' };
  }

  const tmp = path.join(os.tmpdir(), `ga-ocr-${crypto.randomBytes(6).toString('hex')}${path.extname(filename) || '.png'}`);
  fs.writeFileSync(tmp, buffer);

  try {
    const result = await runPowerShell(script, [tmp]);
    const text = result.trim();
    if (!text) {
      return { text: '', ok: false, warning: 'No text could be recognised in that image. It is attached — type its text yourself.' };
    }
    return {
      text,
      ok: true,
      warning: 'Text was recognised from the image automatically. Please read it over and correct anything that came out wrong before saving.',
    };
  } catch (err) {
    return {
      text: '',
      ok: false,
      warning: `Text recognition did not run (${String(err.message).slice(0, 160)}). The image is attached — type its text yourself.`,
    };
  } finally {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
}

function runPowerShell(scriptPath, args) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args],
      { timeout: 60000, maxBuffer: 8 * 1024 * 1024, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(String(stderr || err.message).split('\n')[0]));
        resolve(String(stdout));
      }
    );
  });
}
