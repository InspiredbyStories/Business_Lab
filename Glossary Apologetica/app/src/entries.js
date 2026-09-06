/**
 * APPLICATION LOGIC — entries
 * ---------------------------
 * Everything that creates, reads, changes or deletes research material.
 * The user interface never touches SQL; it calls the HTTP API, which calls
 * these functions.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDb, getPaths, newUid, nowIso } from './db.js';

/* ------------------------------------------------------------------ */
/* Reading                                                             */
/* ------------------------------------------------------------------ */

const ENTRY_COLUMNS = `
  e.id, e.uid, e.religion_id, e.source_group_id, e.collection_id,
  e.title, e.source, e.book, e.chapter, e.reference, e.author, e.date,
  e.language, e.type, e.text, e.notes, e.created_at, e.updated_at,
  g.slug  AS group_slug,
  g.name  AS group_name,
  g.color_light AS group_color_light,
  g.color_dark  AS group_color_dark,
  r.slug  AS religion_slug,
  r.name  AS religion_name,
  c.name  AS collection_name
`;

const FROM_ENTRY = `
  FROM entry e
  JOIN source_group g ON g.id = e.source_group_id
  JOIN religion r     ON r.id = e.religion_id
  LEFT JOIN collection c ON c.id = e.collection_id
`;

export function allEntries(religionId) {
  const db = getDb();
  const rows = db.prepare(
    `SELECT ${ENTRY_COLUMNS} ${FROM_ENTRY} WHERE e.religion_id = ? ORDER BY e.updated_at DESC`
  ).all(religionId);
  return rows.map(attachTags);
}

/**
 * Orders entries the way a reader would expect: by source group, then by
 * chapter and verse number when the entry has them (so Quran 6:114 sits
 * between 6:113 and 6:115, not wherever "6:114" would fall alphabetically),
 * falling back to the title for entries without a numeric reference.
 */
const NATURAL_ORDER = `
  g.sort_order,
  CAST(e.chapter AS INTEGER),
  CASE WHEN INSTR(e.reference, ':') > 0
       THEN CAST(SUBSTR(e.reference, INSTR(e.reference, ':') + 1) AS INTEGER)
       ELSE CAST(e.reference AS INTEGER)
  END,
  e.title COLLATE NOCASE
`;

export function listEntries({ religionId, groupSlugs = [], search = '', limit = 10000, offset = 0 }) {
  const db = getDb();
  const params = [religionId];
  let sql = `SELECT ${ENTRY_COLUMNS} ${FROM_ENTRY} WHERE e.religion_id = ?`;

  if (groupSlugs.length) {
    sql += ` AND g.slug IN (${groupSlugs.map(() => '?').join(',')})`;
    params.push(...groupSlugs);
  }
  if (search) {
    sql += ' AND (e.title LIKE ? OR e.reference LIKE ? OR e.author LIKE ? OR e.book LIKE ? OR c.name LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like, like, like);
  }
  sql += ` ORDER BY ${NATURAL_ORDER} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return db.prepare(sql).all(...params).map(attachTags);
}

export function getEntry(id) {
  const db = getDb();
  const row = db.prepare(`SELECT ${ENTRY_COLUMNS} ${FROM_ENTRY} WHERE e.id = ?`).get(id);
  if (!row) return null;
  const entry = attachTags(row);
  entry.attachments = db.prepare(
    'SELECT id, filename, stored_name, mime, size, created_at FROM attachment WHERE entry_id = ? ORDER BY id'
  ).all(id);
  entry.related = db.prepare(
    `SELECT e.id, e.uid, e.title, g.slug AS group_slug, g.name AS group_name
     FROM entry_relation er
     JOIN entry e        ON e.id = er.related_id
     JOIN source_group g ON g.id = e.source_group_id
     WHERE er.entry_id = ?
     ORDER BY ${NATURAL_ORDER}`
  ).all(id);
  return entry;
}

export function getEntriesByIds(ids) {
  if (!ids.length) return [];
  const db = getDb();
  const rows = db.prepare(
    `SELECT ${ENTRY_COLUMNS} ${FROM_ENTRY} WHERE e.id IN (${ids.map(() => '?').join(',')})`
  ).all(...ids);
  return rows.map(attachTags);
}

function attachTags(row) {
  const db = getDb();
  row.tags = db.prepare(
    'SELECT t.name FROM entry_tag et JOIN tag t ON t.id = et.tag_id WHERE et.entry_id = ? ORDER BY t.name'
  ).all(row.id).map((r) => r.name);
  return row;
}

/* ------------------------------------------------------------------ */
/* Writing                                                             */
/* ------------------------------------------------------------------ */

const TEXT_FIELDS = [
  'title', 'source', 'book', 'chapter', 'reference',
  'author', 'date', 'language', 'type', 'text', 'notes',
];

export function createEntry(payload) {
  const db = getDb();
  const religionId = requireReligion(payload.religion_slug || 'islam');
  const groupId = requireGroup(religionId, payload.group_slug);
  const collectionId = resolveCollection(religionId, groupId, payload.collection_name);

  const values = {};
  for (const f of TEXT_FIELDS) values[f] = String(payload[f] ?? '').trim();
  if (!values.title) values.title = deriveTitle(values, payload.group_slug);
  if (!values.title) throw new HttpError(400, 'An entry needs a title.');
  if (!values.text && !values.notes) {
    throw new HttpError(400, 'An entry needs either text or personal notes.');
  }

  const uid = String(payload.uid || '').trim() || newUid(uidPrefix(payload.religion_slug || 'islam', payload.group_slug));
  if (db.prepare('SELECT 1 FROM entry WHERE uid = ?').get(uid)) {
    throw new HttpError(400, `The identifier "${uid}" is already used by another entry.`);
  }

  const ts = nowIso();
  const res = db.prepare(
    `INSERT INTO entry
       (uid, religion_id, source_group_id, collection_id, title, source, book, chapter,
        reference, author, date, language, type, text, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    uid, religionId, groupId, collectionId, values.title, values.source, values.book,
    values.chapter, values.reference, values.author, values.date, values.language,
    values.type, values.text, values.notes, ts, ts
  );

  const id = Number(res.lastInsertRowid);
  setTags(id, payload.tags || []);
  setRelated(id, payload.related_ids || []);
  reindexEntry(id);
  return getEntry(id);
}

export function updateEntry(id, payload) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM entry WHERE id = ?').get(id);
  if (!existing) throw new HttpError(404, 'Entry not found.');

  const religionId = requireReligion(payload.religion_slug || 'islam');
  const groupId = requireGroup(religionId, payload.group_slug);
  const collectionId = resolveCollection(religionId, groupId, payload.collection_name);

  const values = {};
  for (const f of TEXT_FIELDS) values[f] = String(payload[f] ?? '').trim();
  if (!values.title) throw new HttpError(400, 'An entry needs a title.');

  const uid = String(payload.uid || existing.uid).trim();
  const clash = db.prepare('SELECT id FROM entry WHERE uid = ? AND id <> ?').get(uid, id);
  if (clash) throw new HttpError(400, `The identifier "${uid}" is already used by another entry.`);

  db.prepare(
    `UPDATE entry SET
       uid = ?, religion_id = ?, source_group_id = ?, collection_id = ?,
       title = ?, source = ?, book = ?, chapter = ?, reference = ?, author = ?,
       date = ?, language = ?, type = ?, text = ?, notes = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    uid, religionId, groupId, collectionId, values.title, values.source, values.book,
    values.chapter, values.reference, values.author, values.date, values.language,
    values.type, values.text, values.notes, nowIso(), id
  );

  setTags(id, payload.tags || []);
  setRelated(id, payload.related_ids || []);
  reindexEntry(id);
  return getEntry(id);
}

export function deleteEntry(id) {
  const db = getDb();
  const entry = db.prepare('SELECT id FROM entry WHERE id = ?').get(id);
  if (!entry) throw new HttpError(404, 'Entry not found.');

  const files = db.prepare('SELECT stored_name FROM attachment WHERE entry_id = ?').all(id);
  db.prepare('DELETE FROM entry WHERE id = ?').run(id);
  db.prepare('DELETE FROM entry_fts WHERE rowid = ?').run(id);

  // Remove the copies this application made. Originals are never touched.
  for (const f of files) {
    const p = path.join(getPaths().filesDir, f.stored_name);
    try { fs.unlinkSync(p); } catch { /* already gone */ }
  }
  pruneOrphanTags();
  return { deleted: id };
}

/* ------------------------------------------------------------------ */
/* Tags, collections, relationships                                    */
/* ------------------------------------------------------------------ */

function setTags(entryId, tags) {
  const db = getDb();
  db.prepare('DELETE FROM entry_tag WHERE entry_id = ?').run(entryId);

  const clean = [...new Set(
    (Array.isArray(tags) ? tags : String(tags).split(','))
      .map((t) => String(t).trim())
      .filter(Boolean)
  )];

  const findTag = db.prepare('SELECT id FROM tag WHERE name = ?');
  const insTag = db.prepare('INSERT INTO tag (name) VALUES (?)');
  const link = db.prepare('INSERT OR IGNORE INTO entry_tag (entry_id, tag_id) VALUES (?, ?)');

  for (const name of clean) {
    let row = findTag.get(name);
    if (!row) {
      const r = insTag.run(name);
      row = { id: Number(r.lastInsertRowid) };
    }
    link.run(entryId, row.id);
  }
  pruneOrphanTags();
}

function setRelated(entryId, relatedIds) {
  const db = getDb();
  db.prepare('DELETE FROM entry_relation WHERE entry_id = ?').run(entryId);
  const ins = db.prepare('INSERT OR IGNORE INTO entry_relation (entry_id, related_id) VALUES (?, ?)');
  for (const rid of relatedIds || []) {
    const n = Number(rid);
    if (!Number.isInteger(n) || n === entryId) continue;
    if (!db.prepare('SELECT 1 FROM entry WHERE id = ?').get(n)) continue;
    ins.run(entryId, n);
    ins.run(n, entryId); // relationships read both ways
  }
}

function pruneOrphanTags() {
  getDb().exec('DELETE FROM tag WHERE id NOT IN (SELECT tag_id FROM entry_tag)');
}

function resolveCollection(religionId, groupId, name) {
  const clean = String(name || '').trim();
  if (!clean) return null;
  const db = getDb();
  const found = db.prepare('SELECT id FROM collection WHERE religion_id = ? AND name = ?').get(religionId, clean);
  if (found) return found.id;
  const r = db.prepare(
    'INSERT INTO collection (religion_id, source_group_id, name) VALUES (?, ?, ?)'
  ).run(religionId, groupId, clean);
  return Number(r.lastInsertRowid);
}

export function listCollections(religionId) {
  return getDb().prepare(
    `SELECT c.id, c.name, g.slug AS group_slug,
            (SELECT COUNT(*) FROM entry e WHERE e.collection_id = c.id) AS entry_count
     FROM collection c
     LEFT JOIN source_group g ON g.id = c.source_group_id
     WHERE c.religion_id = ?
     ORDER BY c.name COLLATE NOCASE`
  ).all(religionId);
}

export function listTags(religionId) {
  return getDb().prepare(
    `SELECT t.name, COUNT(*) AS uses
     FROM tag t
     JOIN entry_tag et ON et.tag_id = t.id
     JOIN entry e      ON e.id = et.entry_id
     WHERE e.religion_id = ?
     GROUP BY t.name
     ORDER BY uses DESC, t.name COLLATE NOCASE`
  ).all(religionId);
}

/* ------------------------------------------------------------------ */
/* Attachments                                                         */
/* ------------------------------------------------------------------ */

export function addAttachment(entryId, { filename, mime, buffer }) {
  const db = getDb();
  if (!db.prepare('SELECT 1 FROM entry WHERE id = ?').get(entryId)) {
    throw new HttpError(404, 'Entry not found.');
  }
  const safeExt = path.extname(filename || '').slice(0, 12).replace(/[^.a-zA-Z0-9]/g, '');
  const storedName = `${crypto.randomBytes(8).toString('hex')}${safeExt}`;
  const dest = path.join(getPaths().filesDir, storedName);
  fs.writeFileSync(dest, buffer);

  const r = db.prepare(
    'INSERT INTO attachment (entry_id, filename, stored_name, mime, size, created_at) VALUES (?,?,?,?,?,?)'
  ).run(entryId, filename || storedName, storedName, mime || '', buffer.length, nowIso());
  return db.prepare('SELECT * FROM attachment WHERE id = ?').get(Number(r.lastInsertRowid));
}

export function getAttachment(id) {
  return getDb().prepare('SELECT * FROM attachment WHERE id = ?').get(id);
}

export function deleteAttachment(id) {
  const db = getDb();
  const row = getAttachment(id);
  if (!row) throw new HttpError(404, 'File not found.');
  db.prepare('DELETE FROM attachment WHERE id = ?').run(id);
  try { fs.unlinkSync(path.join(getPaths().filesDir, row.stored_name)); } catch { /* already gone */ }
  return { deleted: id };
}

/* ------------------------------------------------------------------ */
/* Search index                                                        */
/* ------------------------------------------------------------------ */

export function indexPayload(entryId) {
  const db = getDb();
  const e = db.prepare(`SELECT ${ENTRY_COLUMNS} ${FROM_ENTRY} WHERE e.id = ?`).get(entryId);
  if (!e) return null;
  const tags = db.prepare(
    'SELECT t.name FROM entry_tag et JOIN tag t ON t.id = et.tag_id WHERE et.entry_id = ?'
  ).all(entryId).map((r) => r.name);

  const meta = [
    e.uid, e.source, e.collection_name, e.book, e.chapter, e.reference,
    e.author, e.date, e.language, e.type, e.group_name,
  ].filter(Boolean).join(' · ');

  return { title: e.title, body: e.text, notes: e.notes, meta, tags: tags.join(' · ') };
}

export function reindexEntry(entryId) {
  const db = getDb();
  const p = indexPayload(entryId);
  db.prepare('DELETE FROM entry_fts WHERE rowid = ?').run(entryId);
  if (!p) return;
  db.prepare(
    'INSERT INTO entry_fts (rowid, title, body, notes, meta, tags) VALUES (?,?,?,?,?,?)'
  ).run(entryId, p.title, p.body, p.notes, p.meta, p.tags);
}

export function reindexAll() {
  const db = getDb();
  db.exec('DELETE FROM entry_fts');
  const ids = db.prepare('SELECT id FROM entry').all();
  for (const { id } of ids) reindexEntry(id);
  return { reindexed: ids.length };
}

/* ------------------------------------------------------------------ */
/* Statistics                                                          */
/* ------------------------------------------------------------------ */

export function stats(religionId) {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) AS n FROM entry WHERE religion_id = ?').get(religionId).n;
  const byGroup = db.prepare(
    `SELECT g.slug, g.name, COUNT(e.id) AS n
     FROM source_group g
     LEFT JOIN entry e ON e.source_group_id = g.id
     WHERE g.religion_id = ?
     GROUP BY g.id
     ORDER BY g.sort_order`
  ).all(religionId);
  const attachments = db.prepare(
    `SELECT COUNT(*) AS n FROM attachment a JOIN entry e ON e.id = a.entry_id WHERE e.religion_id = ?`
  ).get(religionId).n;
  const tags = db.prepare(
    `SELECT COUNT(DISTINCT t.id) AS n FROM tag t
     JOIN entry_tag et ON et.tag_id = t.id
     JOIN entry e ON e.id = et.entry_id WHERE e.religion_id = ?`
  ).get(religionId).n;
  const withNotes = db.prepare(
    "SELECT COUNT(*) AS n FROM entry WHERE religion_id = ? AND TRIM(notes) <> ''"
  ).get(religionId).n;

  return { total, byGroup, attachments, tags, withNotes };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireReligion(slug) {
  const row = getDb().prepare('SELECT id FROM religion WHERE slug = ?').get(slug);
  if (!row) throw new HttpError(400, `Unknown religion category "${slug}".`);
  return row.id;
}

function requireGroup(religionId, slug) {
  if (!slug) throw new HttpError(400, 'Choose a source: Quran, Hadith, Scholarly Work or Personal Notes.');
  const row = getDb().prepare(
    'SELECT id FROM source_group WHERE religion_id = ? AND slug = ?'
  ).get(religionId, slug);
  if (!row) throw new HttpError(400, `Unknown source group "${slug}".`);
  return row.id;
}

const RELIGION_PREFIX = {
  islam: 'ISL', christianity: 'CHR', judaism: 'JUD', hinduism: 'HIN', buddhism: 'BUD',
  'greek-mythology': 'GRK', 'norse-mythology': 'NRS', 'pagan-traditions': 'PAG',
};

function uidPrefix(religionSlug, groupSlug) {
  // Islam's four groups keep their original per-group codes, since those
  // are already in use across thousands of existing entries. Every other
  // religion gets a prefix from its own slug, not Islam's default.
  if (religionSlug === 'islam') {
    return ({ quran: 'QUR', hadith: 'HAD', scholarly: 'SCH', notes: 'NOTE' })[groupSlug] || 'ISL';
  }
  return RELIGION_PREFIX[religionSlug] || String(religionSlug || 'GEN').slice(0, 3).toUpperCase();
}

function deriveTitle(values, groupSlug) {
  if (values.reference && values.book) return `${values.book} ${values.reference}`;
  if (values.reference) return values.reference;
  if (values.book) return values.book;
  if (values.text) return values.text.split(/\s+/).slice(0, 8).join(' ');
  if (groupSlug === 'notes') return 'Untitled note';
  return '';
}
