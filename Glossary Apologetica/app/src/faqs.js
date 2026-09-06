/**
 * APPLICATION LOGIC — frequently asked questions
 * -----------------------------------------------
 * A curated question with the user's own written answer, filed under a
 * religion, optionally pointing at supporting entries already in the
 * library. Same boundary as the rest of the app: the answer text is always
 * something the user wrote themselves — nothing here is generated.
 */

import { getDb, nowIso } from './db.js';
import { HttpError } from './entries.js';

const FAQ_COLUMNS = `f.id, f.religion_id, f.question, f.answer, f.sort_order, f.created_at, f.updated_at`;

export function listFaqs(religionId) {
  const db = getDb();
  const rows = db.prepare(
    `SELECT ${FAQ_COLUMNS} FROM faq f WHERE f.religion_id = ? ORDER BY f.sort_order, f.created_at`
  ).all(religionId);
  return rows.map(attachEntries);
}

export function getFaq(id) {
  const db = getDb();
  const row = db.prepare(`SELECT ${FAQ_COLUMNS} FROM faq f WHERE f.id = ?`).get(id);
  if (!row) return null;
  return attachEntries(row);
}

function attachEntries(row) {
  const db = getDb();
  row.entries = db.prepare(
    `SELECT e.id, e.uid, e.title, g.slug AS group_slug, g.name AS group_name, e.reference
     FROM faq_entry fe
     JOIN entry e        ON e.id = fe.entry_id
     JOIN source_group g ON g.id = e.source_group_id
     WHERE fe.faq_id = ?
     ORDER BY g.sort_order, e.title COLLATE NOCASE`
  ).all(row.id);
  return row;
}

export function createFaq({ religionId, question, answer, entryIds }) {
  const db = getDb();
  const q = String(question || '').trim();
  if (!q) throw new HttpError(400, 'A question is required.');

  const ts = nowIso();
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM faq WHERE religion_id = ?').get(religionId).m;

  const res = db.prepare(
    'INSERT INTO faq (religion_id, question, answer, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(religionId, q, String(answer || '').trim(), maxOrder + 1, ts, ts);

  const id = Number(res.lastInsertRowid);
  setEntries(id, entryIds || []);
  return getFaq(id);
}

export function updateFaq(id, { question, answer, entryIds }) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM faq WHERE id = ?').get(id);
  if (!existing) throw new HttpError(404, 'Question not found.');

  const q = String(question || '').trim();
  if (!q) throw new HttpError(400, 'A question is required.');

  db.prepare('UPDATE faq SET question = ?, answer = ?, updated_at = ? WHERE id = ?')
    .run(q, String(answer || '').trim(), nowIso(), id);

  if (entryIds !== undefined) setEntries(id, entryIds);
  return getFaq(id);
}

export function deleteFaq(id) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM faq WHERE id = ?').get(id);
  if (!existing) throw new HttpError(404, 'Question not found.');
  db.prepare('DELETE FROM faq WHERE id = ?').run(id);
  return { deleted: id };
}

export function reorderFaqs(religionId, orderedIds) {
  const db = getDb();
  const stmt = db.prepare('UPDATE faq SET sort_order = ? WHERE id = ? AND religion_id = ?');
  orderedIds.forEach((id, i) => stmt.run(i + 1, Number(id), religionId));
  return listFaqs(religionId);
}

function setEntries(faqId, entryIds) {
  const db = getDb();
  db.prepare('DELETE FROM faq_entry WHERE faq_id = ?').run(faqId);
  const ins = db.prepare('INSERT OR IGNORE INTO faq_entry (faq_id, entry_id) VALUES (?, ?)');
  for (const rid of entryIds || []) {
    const n = Number(rid);
    if (!Number.isInteger(n)) continue;
    if (!db.prepare('SELECT 1 FROM entry WHERE id = ?').get(n)) continue;
    ins.run(faqId, n);
  }
}
