/**
 * GLOSSARY APOLOGETICA — local application server
 * -----------------------------------------------
 * Runs on this computer only, bound to 127.0.0.1, with no outbound network
 * access of any kind. It serves the user interface and a small JSON API that
 * sits in front of the application logic.
 *
 *   BROWSER WINDOW  ->  this server  ->  src/entries.js, src/search.js  ->  SQLite
 *
 * Start it with:  node server.js
 * or by double-clicking "Start Glossary Apologetica.bat".
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { spawn, execFile } from 'node:child_process';

import * as dbm from './src/db.js';
import * as entriesApi from './src/entries.js';
import { HttpError } from './src/entries.js';
import * as searchApi from './src/search.js';
import { extractText, SUPPORTED } from './src/extract.js';
import { SAMPLE_ENTRIES } from './src/samples.js';
import * as auth from './src/auth.js';
import { readTunnelStatus } from './src/tunnel.js';
import * as faqApi from './src/faqs.js';

const APP_ROOT = path.dirname(url.fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(APP_ROOT, 'public');
/* In the installed application the code is inside an archive, but the OCR
   helper has to be a real file on disk for PowerShell to run it, so it is
   unpacked alongside. In development this replacement does nothing. */
const TOOLS_DIR = path.join(APP_ROOT, 'tools').replace('app.asar', 'app.asar.unpacked');
const START_PORT = Number(process.env.GA_PORT || 7325);
const MAX_BODY = 90 * 1024 * 1024; // generous enough for a large scanned PDF

/**
 * Where the user's library lives. The installed application sets GA_DATA_DIR to
 * the Windows per-user data folder so that reinstalling or updating the program
 * never touches the research material.
 */
const DATA_DIR = process.env.GA_DATA_DIR || path.join(APP_ROOT, 'data');

/* Written to by the independent Cloudflare Tunnel background task (see
   "Set Up Remote Access.ps1"), read here only to report status. */
const TUNNEL_LOG = path.join(DATA_DIR, 'tunnel.log');

dbm.open(DATA_DIR);
const ISLAM = dbm.religionBySlug('islam');

/* Paths that work without being logged in: the auth API itself (so you can
   log in at all) and the static app shell (so the login screen can render).
   Every other /api/ route requires a valid session once a password exists. */
const PUBLIC_API_PREFIXES = ['/api/auth/'];

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, 'http://127.0.0.1');
  const pathname = decodeURIComponent(parsed.pathname);

  try {
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname, parsed.searchParams);
    } else {
      serveStatic(res, pathname);
    }
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error('[error]', err);
    sendJson(res, status, { error: err.message || 'Something went wrong.' });
  }
});

async function handleApi(req, res, pathname, params) {
  const method = req.method.toUpperCase();
  const seg = pathname.split('/').filter(Boolean); // ['api', ...]

  const isPublic = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isPublic) {
    if (!auth.hasPassword()) {
      throw new HttpError(403, 'Set a password for this application first.');
    }
    if (!auth.isAuthenticated(req)) {
      throw new HttpError(401, 'Please log in.');
    }
  }

  /* --- authentication ---------------------------------------------- */
  if (pathname === '/api/auth/status' && method === 'GET') {
    return sendJson(res, 200, {
      passwordSet: auth.hasPassword(),
      authenticated: auth.hasPassword() && auth.isAuthenticated(req),
    });
  }

  if (pathname === '/api/auth/setup' && method === 'POST') {
    if (auth.hasPassword()) throw new HttpError(409, 'A password is already set. Use the login form.');
    const body = await readJson(req);
    auth.setPassword(body.password || '');
    const token = auth.createSession();
    auth.setSessionCookie(res, token);
    return sendJson(res, 200, { authenticated: true });
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const key = auth.clientKey(req);
    if (auth.isLockedOut(key)) {
      throw new HttpError(429, 'Too many attempts. Wait about 15 minutes and try again.');
    }
    const body = await readJson(req);
    if (!auth.hasPassword() || !auth.verifyPassword(body.password || '')) {
      auth.recordFailure(key);
      throw new HttpError(401, 'That password is not correct.');
    }
    auth.clearFailures(key);
    const token = auth.createSession();
    auth.setSessionCookie(res, token);
    return sendJson(res, 200, { authenticated: true });
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    const token = auth.readSessionToken(req);
    if (token) auth.destroySession(token);
    auth.setSessionCookie(res, null, { clear: true });
    return sendJson(res, 200, { authenticated: false });
  }

  if (pathname === '/api/auth/change-password' && method === 'POST') {
    const body = await readJson(req);
    if (!auth.verifyPassword(body.currentPassword || '')) {
      throw new HttpError(401, 'Your current password is not correct.');
    }
    const problem = auth.passwordProblem(body.newPassword || '');
    if (problem) throw new HttpError(400, problem);
    auth.setPassword(body.newPassword);
    // setPassword() clears every session, including this one — issue a
    // fresh one immediately so the person who just changed it stays in.
    const token = auth.createSession();
    auth.setSessionCookie(res, token);
    return sendJson(res, 200, { authenticated: true });
  }

  /* --- remote access status ----------------------------------------- */
  if (pathname === '/api/tunnel/status' && method === 'GET') {
    return sendJson(res, 200, readTunnelStatus(TUNNEL_LOG));
  }

  /* --- bootstrap ------------------------------------------------- */
  if (pathname === '/api/bootstrap' && method === 'GET') {
    const religion = params.get('religion') ? dbm.religionBySlug(params.get('religion')) : ISLAM;
    if (!religion) throw new HttpError(400, `Unknown religion category "${params.get('religion')}".`);
    return sendJson(res, 200, {
      religions: dbm.religions(),
      religion,
      groups: dbm.sourceGroups(religion.id),
      stats: entriesApi.stats(religion.id),
      tags: entriesApi.listTags(religion.id),
      collections: entriesApi.listCollections(religion.id),
      settings: {
        theme: dbm.getSetting('theme', 'system'),
        semantic: dbm.getSetting('semantic', 'on'),
        exactPriority: dbm.getSetting('exactPriority', 'high'),
      },
      supportedUploads: Object.keys(SUPPORTED),
      version: '1.0.0',
      // True only for the always-on background instance started by
      // "Set Up Remote Access.ps1" — the desktop app hides its shutdown
      // control in that case, since closing it would also take down
      // remote access until the next Windows sign-in.
      managed: process.env.GA_MANAGED === '1',
    });
  }

  /* --- search ---------------------------------------------------- */
  if (pathname === '/api/search' && method === 'GET') {
    const groups = (params.get('groups') || '').split(',').filter(Boolean);
    const result = searchApi.search({
      religionId: religionIdFromSlug(params.get('religion')),
      query: params.get('q') || '',
      groupSlugs: groups,
      limit: Number(params.get('limit') || 60),
      useConcepts: (params.get('semantic') || dbm.getSetting('semantic', 'on')) !== 'off',
      exactPriority: params.get('exact') || dbm.getSetting('exactPriority', 'high'),
    });
    return sendJson(res, 200, result);
  }

  if (pathname === '/api/explore' && method === 'POST') {
    const body = await readJson(req);
    const result = searchApi.explore({
      religionId: religionIdFromSlug(body.religion_slug),
      query: body.query || '',
      mode: body.mode,
      groupSlugs: body.groups || [],
      excludeIds: body.excludeIds || [],
      limit: Number(body.limit || 12),
      useConcepts: (body.semantic || dbm.getSetting('semantic', 'on')) !== 'off',
    });
    return sendJson(res, 200, result);
  }

  /* --- entries --------------------------------------------------- */
  if (pathname === '/api/entries' && method === 'GET') {
    return sendJson(res, 200, {
      entries: entriesApi.listEntries({
        religionId: religionIdFromSlug(params.get('religion')),
        groupSlugs: (params.get('groups') || '').split(',').filter(Boolean),
        search: params.get('q') || '',
        limit: Number(params.get('limit') || 10000),
        offset: Number(params.get('offset') || 0),
      }),
    });
  }

  if (pathname === '/api/entries' && method === 'POST') {
    const body = await readJson(req);
    const entry = entriesApi.createEntry({ ...body, religion_slug: body.religion_slug || 'islam' });
    searchApi.clearCache();
    return sendJson(res, 201, { entry });
  }

  if (seg[1] === 'entries' && seg[2] && seg.length === 3) {
    const id = Number(seg[2]);
    if (method === 'GET') {
      const entry = entriesApi.getEntry(id);
      if (!entry) throw new HttpError(404, 'Entry not found.');
      return sendJson(res, 200, { entry });
    }
    if (method === 'PUT') {
      const body = await readJson(req);
      const entry = entriesApi.updateEntry(id, { ...body, religion_slug: body.religion_slug || 'islam' });
      searchApi.clearCache();
      return sendJson(res, 200, { entry });
    }
    if (method === 'DELETE') {
      const out = entriesApi.deleteEntry(id);
      searchApi.clearCache();
      return sendJson(res, 200, out);
    }
  }

  if (seg[1] === 'entries' && seg[3] === 'similar' && method === 'GET') {
    const target = entriesApi.getEntry(Number(seg[2]));
    if (!target) throw new HttpError(404, 'Entry not found.');
    return sendJson(res, 200, { results: searchApi.similarTo(Number(seg[2]), target.religion_id) });
  }

  if (seg[1] === 'entries' && seg[3] === 'attachments' && method === 'POST') {
    const body = await readJson(req);
    const buffer = Buffer.from(body.data || '', 'base64');
    const att = entriesApi.addAttachment(Number(seg[2]), {
      filename: body.filename,
      mime: body.mime,
      buffer,
    });
    return sendJson(res, 201, { attachment: att });
  }

  /* --- file text extraction (before an entry exists) -------------- */
  if (pathname === '/api/extract' && method === 'POST') {
    const body = await readJson(req);
    const buffer = Buffer.from(body.data || '', 'base64');
    const out = await extractText(body.filename || '', buffer, TOOLS_DIR);
    return sendJson(res, 200, out);
  }

  /* --- attachments ----------------------------------------------- */
  if (seg[1] === 'attachments' && seg[2]) {
    const id = Number(seg[2]);
    if (method === 'GET' && seg.length === 3) {
      const att = entriesApi.getAttachment(id);
      if (!att) throw new HttpError(404, 'File not found.');
      const file = path.join(dbm.getPaths().filesDir, att.stored_name);
      if (!fs.existsSync(file)) throw new HttpError(404, 'The stored copy of this file is missing.');
      res.writeHead(200, {
        'Content-Type': att.mime || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${att.filename.replace(/"/g, '')}"`,
        'Cache-Control': 'no-store',
      });
      return fs.createReadStream(file).pipe(res);
    }
    if (method === 'POST' && seg[3] === 'open') {
      const att = entriesApi.getAttachment(id);
      if (!att) throw new HttpError(404, 'File not found.');
      const file = path.join(dbm.getPaths().filesDir, att.stored_name);
      openWithOs(file);
      return sendJson(res, 200, { opened: true });
    }
    if (method === 'DELETE') {
      return sendJson(res, 200, entriesApi.deleteAttachment(id));
    }
  }

  /* --- vocabulary ------------------------------------------------ */
  if (pathname === '/api/tags' && method === 'GET') {
    return sendJson(res, 200, { tags: entriesApi.listTags(religionIdFromSlug(params.get('religion'))) });
  }
  if (pathname === '/api/collections' && method === 'GET') {
    return sendJson(res, 200, { collections: entriesApi.listCollections(religionIdFromSlug(params.get('religion'))) });
  }

  /* --- frequently asked questions --------------------------------- */
  if (pathname === '/api/faqs' && method === 'GET') {
    const religionId = religionIdFromSlug(params.get('religion'));
    return sendJson(res, 200, { faqs: faqApi.listFaqs(religionId) });
  }

  if (pathname === '/api/faqs' && method === 'POST') {
    const body = await readJson(req);
    const religionId = religionIdFromSlug(body.religion_slug);
    const faq = faqApi.createFaq({
      religionId, question: body.question, answer: body.answer, entryIds: body.entry_ids,
    });
    return sendJson(res, 201, { faq });
  }

  if (seg[1] === 'faqs' && seg[2] && seg.length === 3) {
    const id = Number(seg[2]);
    if (method === 'PUT') {
      const body = await readJson(req);
      const faq = faqApi.updateFaq(id, {
        question: body.question, answer: body.answer, entryIds: body.entry_ids,
      });
      return sendJson(res, 200, { faq });
    }
    if (method === 'DELETE') {
      return sendJson(res, 200, faqApi.deleteFaq(id));
    }
  }

  if (pathname === '/api/faqs/reorder' && method === 'POST') {
    const body = await readJson(req);
    const religionId = religionIdFromSlug(body.religion_slug);
    return sendJson(res, 200, { faqs: faqApi.reorderFaqs(religionId, body.order || []) });
  }

  /* --- settings and maintenance ---------------------------------- */
  if (pathname === '/api/settings' && method === 'PUT') {
    const body = await readJson(req);
    for (const [k, v] of Object.entries(body)) dbm.setSetting(k, v);
    return sendJson(res, 200, { saved: true });
  }

  if (pathname === '/api/maintenance/reindex' && method === 'POST') {
    searchApi.clearCache();
    return sendJson(res, 200, entriesApi.reindexAll());
  }

  if (pathname === '/api/maintenance/backup' && method === 'POST') {
    return sendJson(res, 200, backupDatabase());
  }

  if (pathname === '/api/maintenance/export' && method === 'GET') {
    const data = exportEverything();
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="glossary-apologetica-export-${stamp()}.json"`,
    });
    return res.end(JSON.stringify(data, null, 2));
  }

  if (pathname === '/api/maintenance/open-data-folder' && method === 'POST') {
    openWithOs(dbm.getPaths().dataDir);
    return sendJson(res, 200, { opened: true });
  }

  if (pathname === '/api/maintenance/samples' && method === 'POST') {
    return sendJson(res, 200, loadSamples());
  }

  if (pathname === '/api/shutdown' && method === 'POST') {
    sendJson(res, 200, { closing: true });
    setTimeout(() => process.exit(0), 250);
    return undefined;
  }

  throw new HttpError(404, `Unknown request: ${method} ${pathname}`);
}

/* ------------------------------------------------------------------ */
/* Maintenance helpers                                                 */
/* ------------------------------------------------------------------ */

function religionIdFromSlug(slug) {
  const religion = slug ? dbm.religionBySlug(slug) : ISLAM;
  if (!religion) throw new HttpError(400, `Unknown religion category "${slug}".`);
  return religion.id;
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function backupDatabase() {
  const paths = dbm.getPaths();
  const target = path.join(paths.backupsDir, `library-${stamp()}.db`);
  dbm.getDb().exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  return { backup: target, size: fs.statSync(target).size };
}

function exportEverything() {
  const db = dbm.getDb();
  const religions = dbm.religions().map((religion) => {
    const entries = entriesApi.allEntries(religion.id).map((e) => ({
      ...e,
      attachments: db.prepare('SELECT filename, stored_name, mime, size FROM attachment WHERE entry_id = ?').all(e.id),
      related: db.prepare('SELECT related_id FROM entry_relation WHERE entry_id = ?').all(e.id).map((r) => r.related_id),
    }));
    return {
      religion,
      source_groups: dbm.sourceGroups(religion.id),
      collections: entriesApi.listCollections(religion.id),
      faqs: faqApi.listFaqs(religion.id),
      entry_count: entries.length,
      entries,
    };
  });

  return {
    exported_at: new Date().toISOString(),
    application: 'Glossary Apologetica',
    version: '1.0.0',
    entry_count: religions.reduce((sum, r) => sum + r.entry_count, 0),
    religions,
  };
}

function loadSamples() {
  let created = 0;
  for (const s of SAMPLE_ENTRIES) {
    const exists = dbm.getDb().prepare('SELECT 1 FROM entry WHERE uid = ?').get(s.uid);
    if (exists) continue;
    entriesApi.createEntry({ ...s, religion_slug: 'islam' });
    created += 1;
  }
  searchApi.clearCache();
  return { created, total: SAMPLE_ENTRIES.length };
}

function openWithOs(target) {
  if (process.platform === 'win32') {
    execFile('cmd', ['/c', 'start', '', target], { windowsHide: true }, () => {});
  } else if (process.platform === 'darwin') {
    execFile('open', [target], () => {});
  } else {
    execFile('xdg-open', [target], () => {});
  }
}

/* ------------------------------------------------------------------ */
/* HTTP plumbing                                                       */
/* ------------------------------------------------------------------ */

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, 'That file is too large (the limit is about 90 MB).'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'The request could not be read.'));
      }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function serveStatic(res, pathname) {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.join(PUBLIC_DIR, rel);

  // Never serve anything outside public/
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
}

/* ------------------------------------------------------------------ */
/* Start up, then open the application window                          */
/* ------------------------------------------------------------------ */

/**
 * Starts listening on the first free port from `port` upwards and resolves
 * with the address. Used both by the installed desktop application and by the
 * plain "run from source" launcher.
 */
export function startServer({ port = START_PORT, attempts = 20 } = {}) {
  return new Promise((resolve, reject) => {
    const tryPort = (p, left) => {
      const onError = (err) => {
        if (err.code === 'EADDRINUSE' && left > 0) {
          server.removeListener('error', onError);
          tryPort(p + 1, left - 1);
        } else {
          reject(err);
        }
      };
      server.once('error', onError);
      server.listen(p, '127.0.0.1', () => {
        server.removeListener('error', onError);
        resolve({ url: `http://127.0.0.1:${p}/`, port: p, dataDir: dbm.getPaths().dataDir });
      });
    };
    tryPort(port, attempts);
  });
}

export function stopServer() {
  return new Promise((resolve) => server.close(resolve));
}

/**
 * Opens the interface in its own window with no address bar or tabs, so it
 * behaves like a desktop application rather than a web page.
 */
function openAppWindow(address) {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  const browser = candidates.find((p) => fs.existsSync(p));

  if (browser) {
    const child = spawn(browser, [
      `--app=${address}`,
      '--window-size=1500,950',
      '--no-first-run',
      '--no-default-browser-check',
    ], { detached: true, stdio: 'ignore' });
    child.unref();
  } else {
    openWithOs(address);
  }
}

/* Running this file directly (the "Start Glossary Apologetica" launcher) starts
   the server and opens a window. When the installed application loads this
   module instead, it calls startServer() itself and supplies its own window. */
const launchedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === url.fileURLToPath(import.meta.url);

if (launchedDirectly) {
  startServer()
    .then(({ url: address }) => {
      console.log('');
      console.log('  GLOSSARY APOLOGETICA');
      console.log('  ' + '-'.repeat(46));
      console.log('  Running at   ' + address);
      console.log('  Library file ' + dbm.getPaths().dbFile);
      console.log('');
      console.log('  Leave this window open while you use the application.');
      console.log('  Close it to shut the application down.');
      console.log('');
      if (process.env.GA_NO_WINDOW !== '1') openAppWindow(address);
    })
    .catch((err) => {
      console.error('Could not start:', err.message);
      process.exit(1);
    });
}
