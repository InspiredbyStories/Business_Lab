/**
 * DATABASE LAYER
 * --------------
 * One SQLite file: app/data/library.db
 *
 * The schema follows the data model in the build specification (section 18):
 *
 *   ReligionCategory -> SourceGroup -> Collection -> Entry
 *                                                     |- Attachment
 *                                                     |- Tag (many-to-many)
 *                                                     |- EntryRelationship
 *
 * Version 1 only creates the "Islam" religion category, but nothing here is
 * hard-coded to Islam: adding Christianity later is one row in `religion`
 * plus its source groups.
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

let db = null;
let paths = null;

/**
 * Everything the user owns lives under one directory.
 * When installed, that is the Windows per-user application data folder;
 * when run from source it is app/data.
 */
export function dataPaths(dataDir) {
  return {
    dataDir,
    filesDir: path.join(dataDir, 'files'),
    dbFile: path.join(dataDir, 'library.db'),
    backupsDir: path.join(dataDir, 'backups'),
  };
}

export function open(dataDir) {
  if (db) return db;
  paths = dataPaths(dataDir);
  fs.mkdirSync(paths.dataDir, { recursive: true });
  fs.mkdirSync(paths.filesDir, { recursive: true });
  fs.mkdirSync(paths.backupsDir, { recursive: true });

  db = new DatabaseSync(paths.dbFile);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  migrate();
  seedTaxonomy();
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not opened');
  return db;
}

export function getPaths() {
  return paths;
}

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS religion (
      id           INTEGER PRIMARY KEY,
      slug         TEXT NOT NULL UNIQUE,
      name         TEXT NOT NULL,
      accent_light TEXT NOT NULL,
      accent_dark  TEXT NOT NULL,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      enabled      INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS source_group (
      id          INTEGER PRIMARY KEY,
      religion_id INTEGER NOT NULL REFERENCES religion(id) ON DELETE CASCADE,
      slug        TEXT NOT NULL,
      name        TEXT NOT NULL,
      color_light TEXT NOT NULL,
      color_dark  TEXT NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      UNIQUE (religion_id, slug)
    );

    CREATE TABLE IF NOT EXISTS collection (
      id              INTEGER PRIMARY KEY,
      religion_id     INTEGER NOT NULL REFERENCES religion(id) ON DELETE CASCADE,
      source_group_id INTEGER REFERENCES source_group(id) ON DELETE SET NULL,
      name            TEXT NOT NULL,
      UNIQUE (religion_id, name)
    );

    CREATE TABLE IF NOT EXISTS entry (
      id              INTEGER PRIMARY KEY,
      uid             TEXT NOT NULL UNIQUE,
      religion_id     INTEGER NOT NULL REFERENCES religion(id) ON DELETE CASCADE,
      source_group_id INTEGER NOT NULL REFERENCES source_group(id),
      collection_id   INTEGER REFERENCES collection(id) ON DELETE SET NULL,
      title           TEXT NOT NULL,
      source          TEXT NOT NULL DEFAULT '',
      book            TEXT NOT NULL DEFAULT '',
      chapter         TEXT NOT NULL DEFAULT '',
      reference       TEXT NOT NULL DEFAULT '',
      author          TEXT NOT NULL DEFAULT '',
      date            TEXT NOT NULL DEFAULT '',
      language        TEXT NOT NULL DEFAULT '',
      type            TEXT NOT NULL DEFAULT '',
      text            TEXT NOT NULL DEFAULT '',
      notes           TEXT NOT NULL DEFAULT '',
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entry_religion ON entry(religion_id);
    CREATE INDEX IF NOT EXISTS idx_entry_group    ON entry(source_group_id);

    CREATE TABLE IF NOT EXISTS tag (
      id   INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE
    );

    CREATE TABLE IF NOT EXISTS entry_tag (
      entry_id INTEGER NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
      tag_id   INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
      PRIMARY KEY (entry_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS attachment (
      id          INTEGER PRIMARY KEY,
      entry_id    INTEGER NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
      filename    TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime        TEXT NOT NULL DEFAULT '',
      size        INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entry_relation (
      entry_id   INTEGER NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
      related_id INTEGER NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
      PRIMARY KEY (entry_id, related_id)
    );

    CREATE TABLE IF NOT EXISTS setting (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    /* Frequently Asked Questions: a curated question with the user's own
       written answer, per religion, optionally pointing at supporting
       entries already in the library. The answer text is always something
       the user wrote — nothing here is ever generated by the application. */
    CREATE TABLE IF NOT EXISTS faq (
      id          INTEGER PRIMARY KEY,
      religion_id INTEGER NOT NULL REFERENCES religion(id) ON DELETE CASCADE,
      question    TEXT NOT NULL,
      answer      TEXT NOT NULL DEFAULT '',
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_faq_religion ON faq(religion_id);

    CREATE TABLE IF NOT EXISTS faq_entry (
      faq_id   INTEGER NOT NULL REFERENCES faq(id) ON DELETE CASCADE,
      entry_id INTEGER NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
      PRIMARY KEY (faq_id, entry_id)
    );

    /* Traditional (keyword / phrase / metadata) search index.
       A standalone FTS5 table, kept in step with the entry table by entries.js. */
    CREATE VIRTUAL TABLE IF NOT EXISTS entry_fts USING fts5(
      title, body, notes, meta, tags,
      tokenize = 'unicode61 remove_diacritics 2'
    );
  `);
}

/* ------------------------------------------------------------------ */
/* Religion taxonomy                                                    */
/* ------------------------------------------------------------------ */
/* Each religion gets the same shape — two primary-source groups, a
   scholarly-work group, and a personal-notes group — so the interface
   stays consistent no matter which tradition is selected. Nothing here is
   the actual religious content; it is just the filing structure the user's
   own material goes into (build spec §17: "the database should conceptually
   support Religion → Source Group → Collection → Entry"). */

const RELIGIONS = [
  {
    slug: 'islam', name: 'Islam', sort: 1, accent: ['#0F6B4F', '#2FA879'],
    groups: [
      { slug: 'quran',     name: 'Quran',                  color: ['#0F6B4F', '#2FA879'] },
      { slug: 'hadith',    name: 'Hadith',                 color: ['#2D7A78', '#4FA9A5'] },
      { slug: 'scholarly', name: 'Islamic Scholarly Work', color: ['#4B6B8A', '#7D9DBD'] },
      { slug: 'notes',     name: 'Personal Notes',         color: ['#A66B16', '#D49A3A'] },
    ],
  },
  {
    slug: 'christianity', name: 'Christianity', sort: 2, accent: ['#7A2438', '#C1697E'],
    groups: [
      { slug: 'bible',     name: 'Bible',                       color: ['#7A2438', '#C1697E'] },
      { slug: 'fathers',   name: 'Church Fathers & Tradition',  color: ['#2D6A7A', '#5FA6B8'] },
      { slug: 'scholarly', name: 'Christian Scholarly Work',    color: ['#4B6B8A', '#7D9DBD'] },
      { slug: 'notes',     name: 'Personal Notes',              color: ['#A66B16', '#D49A3A'] },
    ],
  },
  {
    slug: 'judaism', name: 'Judaism', sort: 3, accent: ['#1E4E8C', '#6699E0'],
    groups: [
      { slug: 'tanakh',    name: 'Tanakh',                       color: ['#1E4E8C', '#6699E0'] },
      { slug: 'talmud',    name: 'Talmud & Rabbinic Literature', color: ['#5A4A8A', '#9C8BD1'] },
      { slug: 'scholarly', name: 'Jewish Scholarly Work',        color: ['#4B6B8A', '#7D9DBD'] },
      { slug: 'notes',     name: 'Personal Notes',               color: ['#A66B16', '#D49A3A'] },
    ],
  },
  {
    slug: 'hinduism', name: 'Hinduism', sort: 4, accent: ['#B5651D', '#E0955A'],
    groups: [
      { slug: 'vedas',     name: 'Vedas & Upanishads',    color: ['#B5651D', '#E0955A'] },
      { slug: 'epics',     name: 'Epics & Puranas',       color: ['#8A3A3A', '#C97D7D'] },
      { slug: 'scholarly', name: 'Hindu Scholarly Work',  color: ['#4B6B8A', '#7D9DBD'] },
      { slug: 'notes',     name: 'Personal Notes',        color: ['#A66B16', '#D49A3A'] },
    ],
  },
  {
    slug: 'buddhism', name: 'Buddhism', sort: 5, accent: ['#8A6D1F', '#D4B04A'],
    groups: [
      { slug: 'sutras',    name: 'Sutras & Canon',              color: ['#8A6D1F', '#D4B04A'] },
      { slug: 'tradition', name: 'Commentaries & Tradition',    color: ['#2D6A5C', '#5FAF9A'] },
      { slug: 'scholarly', name: 'Buddhist Scholarly Work',     color: ['#4B6B8A', '#7D9DBD'] },
      { slug: 'notes',     name: 'Personal Notes',              color: ['#A66B16', '#D49A3A'] },
    ],
  },
  {
    slug: 'greek-mythology', name: 'Greek Mythology', sort: 6, accent: ['#1F6F78', '#5AB3BD'],
    groups: [
      { slug: 'primary',   name: 'Primary Sources',            color: ['#1F6F78', '#5AB3BD'] },
      { slug: 'tradition', name: 'Commentary & Interpretation', color: ['#5A4A8A', '#9C8BD1'] },
      { slug: 'scholarly', name: 'Scholarly Work',              color: ['#4B6B8A', '#7D9DBD'] },
      { slug: 'notes',     name: 'Personal Notes',              color: ['#A66B16', '#D49A3A'] },
    ],
  },
  {
    slug: 'norse-mythology', name: 'Norse Mythology', sort: 7, accent: ['#3E5C76', '#8FAEC9'],
    groups: [
      { slug: 'primary',   name: 'Eddas & Sagas',               color: ['#3E5C76', '#8FAEC9'] },
      { slug: 'tradition', name: 'Commentary & Interpretation', color: ['#5A4A8A', '#9C8BD1'] },
      { slug: 'scholarly', name: 'Scholarly Work',              color: ['#4B6B8A', '#7D9DBD'] },
      { slug: 'notes',     name: 'Personal Notes',              color: ['#A66B16', '#D49A3A'] },
    ],
  },
  {
    slug: 'pagan-traditions', name: 'Pagan Traditions', sort: 8, accent: ['#6B5B2E', '#B39B5C'],
    groups: [
      { slug: 'primary',   name: 'Primary Sources',            color: ['#6B5B2E', '#B39B5C'] },
      { slug: 'tradition', name: 'Commentary & Interpretation', color: ['#5A4A8A', '#9C8BD1'] },
      { slug: 'scholarly', name: 'Scholarly Work',              color: ['#4B6B8A', '#7D9DBD'] },
      { slug: 'notes',     name: 'Personal Notes',              color: ['#A66B16', '#D49A3A'] },
    ],
  },
];

function seedTaxonomy() {
  const findReligion = db.prepare('SELECT id FROM religion WHERE slug = ?');
  const insReligion = db.prepare(
    'INSERT INTO religion (slug, name, accent_light, accent_dark, sort_order, enabled) VALUES (?, ?, ?, ?, ?, 1)'
  );
  const insGroup = db.prepare(
    'INSERT OR IGNORE INTO source_group (religion_id, slug, name, color_light, color_dark, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  );

  for (const rel of RELIGIONS) {
    let religionId;
    const has = findReligion.get(rel.slug);
    if (!has) {
      const r = insReligion.run(rel.slug, rel.name, rel.accent[0], rel.accent[1], rel.sort);
      religionId = Number(r.lastInsertRowid);
    } else {
      religionId = has.id;
    }
    rel.groups.forEach((g, i) => {
      insGroup.run(religionId, g.slug, g.name, g.color[0], g.color[1], i + 1);
    });
  }
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

export function newUid(prefix = 'ISL') {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM setting WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  db.prepare(
    'INSERT INTO setting (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, String(value));
}

export function religions() {
  return db.prepare('SELECT * FROM religion WHERE enabled = 1 ORDER BY sort_order, name').all();
}

export function sourceGroups(religionId) {
  return db.prepare('SELECT * FROM source_group WHERE religion_id = ? ORDER BY sort_order, name').all(religionId);
}

export function religionBySlug(slug) {
  return db.prepare('SELECT * FROM religion WHERE slug = ?').get(slug);
}
