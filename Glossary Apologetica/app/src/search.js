/**
 * SEARCH ENGINE
 * -------------
 * Hybrid retrieval, as required by the build specification (sections 5 and 19):
 *
 *   final score = exact phrase
 *               + exact keyword
 *               + partial keyword
 *               + metadata
 *               + tags
 *               + concept (semantic) similarity
 *
 * An exact match always outranks a merely related one, because the concept
 * contribution is capped (CONCEPT_CAP) while exact matches are not.
 *
 * The engine only ever reads the user's own database. There is no external
 * lookup of any kind anywhere in this file.
 */

import { getDb } from './db.js';
import { getEntriesByIds } from './entries.js';
import {
  normalize, contentTokens, stem, tokenize,
  countOccurrences, excerptAround, truncate,
} from './text.js';
import { expandQuery, conceptsIn, tensionsFor, conceptLabels, contrastScore } from './concepts.js';

/* ------------------------------------------------------------------ */
/* Tuning — every weight in the engine lives here                      */
/* ------------------------------------------------------------------ */

export const WEIGHTS = {
  phrase: 55,      // the user's exact phrase appears
  word: 10,        // an exact word the user typed appears
  partial: 3.2,    // a word starts with / stems to what the user typed
  concept: 2.4,    // a related term from the concept map appears
  coverage: 30,    // proportion of the user's words that were found anywhere
  tagPhrase: 18,   // a tag matches the query outright
  relationBonus: 6,
};

/** How much a match counts depending on where it was found. */
export const FIELD_WEIGHTS = {
  title: 3.0,
  meta: 1.5,   // collection, book, author, reference, language, type, identifier
  tags: 1.9,
  body: 1.0,   // the primary text of the entry
  notes: 0.95, // the user's own personal notes
};

/** Semantic matching can never overwhelm a real exact match. */
const CONCEPT_CAP = 42;
/** Below this, material is not considered relevant enough to show. */
const MIN_SCORE = 7;

/* ------------------------------------------------------------------ */
/* A small cache so repeat searches do not re-tokenise the library     */
/* ------------------------------------------------------------------ */

const docCache = new Map(); // entryId -> { stamp, fields }

function docFor(entry) {
  const cached = docCache.get(entry.id);
  if (cached && cached.stamp === entry.updated_at) return cached.fields;

  const meta = [
    entry.uid, entry.source, entry.collection_name, entry.book, entry.chapter,
    entry.reference, entry.author, entry.date, entry.language, entry.type, entry.group_name,
  ].filter(Boolean).join(' · ');

  const fields = {
    title: buildField(entry.title),
    meta: buildField(meta),
    tags: buildField((entry.tags || []).join(' · ')),
    body: buildField(entry.text),
    notes: buildField(entry.notes),
  };
  fields.conceptHits = conceptsIn(
    [entry.title, meta, (entry.tags || []).join(' '), entry.text, entry.notes].join('\n')
  );
  fields.contrast = contrastScore([entry.text, entry.notes].join('\n'));

  docCache.set(entry.id, { stamp: entry.updated_at, fields });
  return fields;
}

function buildField(raw) {
  const text = String(raw || '');
  const norm = normalize(text);
  const tokens = tokenize(text);
  const counts = new Map();
  const stems = new Map();
  for (const t of tokens) {
    counts.set(t, (counts.get(t) || 0) + 1);
    const s = stem(t);
    stems.set(s, (stems.get(s) || 0) + 1);
  }
  return { text, norm, counts, stems, tokenList: tokens };
}

export function clearCache() {
  docCache.clear();
}

/* ------------------------------------------------------------------ */
/* Query parsing                                                       */
/* ------------------------------------------------------------------ */

export function parseQuery(raw, { useConcepts = true } = {}) {
  const original = String(raw || '').trim();
  const quoted = [];
  const withoutQuotes = original.replace(/"([^"]+)"/g, (_m, p1) => {
    quoted.push(normalize(p1));
    return ' ';
  });

  const terms = contentTokens(withoutQuotes);
  const allTerms = contentTokens(original);
  const phrases = [...quoted];

  // The whole query counts as a phrase too, so "Jesus son of Mary" gets the
  // phrase boost without the user having to add quotation marks.
  const wholeNorm = normalize(original);
  if (!quoted.length && wholeNorm.split(' ').length > 1) phrases.push(wholeNorm);

  const expansion = useConcepts
    ? expandQuery(original)
    : { conceptIds: [], labels: [], terms: [] };

  return {
    original,
    terms: allTerms,
    stems: allTerms.map(stem),
    phrases: phrases.filter((p) => p.length >= 3),
    requiredPhrases: quoted,
    conceptIds: expansion.conceptIds,
    conceptLabels: expansion.labels,
    expansionTerms: expansion.terms,
  };
}

/* ------------------------------------------------------------------ */
/* Candidate selection                                                 */
/* ------------------------------------------------------------------ */

/**
 * For a personal library (up to a few thousand entries) scoring everything is
 * both fast and perfectly accurate. Above that the FTS5 index narrows the
 * field first. Either way the scoring below is what decides the ranking.
 */
function candidates(religionId, q, groupSlugs) {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) AS n FROM entry WHERE religion_id = ?').get(religionId).n;

  let ids;
  if (total <= 4000) {
    ids = db.prepare('SELECT id FROM entry WHERE religion_id = ?').all(religionId).map((r) => r.id);
  } else {
    ids = ftsCandidates(q, religionId);
  }

  let rows = getEntriesByIds(ids);
  if (groupSlugs && groupSlugs.length) {
    const wanted = new Set(groupSlugs);
    rows = rows.filter((r) => wanted.has(r.group_slug));
  }
  return { rows, total };
}

function ftsCandidates(q, religionId) {
  const db = getDb();
  const pieces = [];
  for (const p of q.phrases) pieces.push('"' + p.replace(/"/g, '') + '"');
  for (const t of q.terms) pieces.push('"' + t.replace(/"/g, '') + '"*');
  for (const e of q.expansionTerms.slice(0, 60)) {
    pieces.push(e.includes(' ') ? '"' + e.replace(/"/g, '') + '"' : '"' + e.replace(/"/g, '') + '"');
  }
  if (!pieces.length) return [];

  try {
    const rows = db.prepare(
      `SELECT f.rowid AS id FROM entry_fts f
       JOIN entry e ON e.id = f.rowid
       WHERE entry_fts MATCH ? AND e.religion_id = ?
       LIMIT 1200`
    ).all(pieces.join(' OR '), religionId);
    return rows.map((r) => r.id);
  } catch {
    return db.prepare('SELECT id FROM entry WHERE religion_id = ? LIMIT 1200').all(religionId).map((r) => r.id);
  }
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

function scoreEntry(entry, q) {
  const doc = docFor(entry);
  let score = 0;
  let conceptScore = 0;
  const matchedTerms = new Set();
  const reasons = [];
  const hitTerms = new Set();
  const fieldsHit = new Set();

  for (const [fieldName, weight] of Object.entries(FIELD_WEIGHTS)) {
    const field = doc[fieldName];
    if (!field || !field.norm) continue;

    /* 1. Exact phrase ------------------------------------------------ */
    for (const phrase of q.phrases) {
      const occ = countOccurrences(field.norm, phrase);
      if (occ > 0) {
        score += WEIGHTS.phrase * weight * (1 + Math.log(occ));
        fieldsHit.add(fieldName);
        hitTerms.add(phrase);
        for (const t of contentTokens(phrase)) matchedTerms.add(t);
        reasons.push({ kind: 'phrase', field: fieldName, value: phrase });
      }
    }

    /* 2. Exact keyword, 3. Partial keyword --------------------------- */
    for (const term of q.terms) {
      const exact = field.counts.get(term) || 0;
      if (exact > 0) {
        score += WEIGHTS.word * weight * (1 + Math.log(exact));
        matchedTerms.add(term);
        hitTerms.add(term);
        fieldsHit.add(fieldName);
        continue;
      }
      const s = stem(term);
      const stemHit = field.stems.get(s) || 0;
      if (stemHit > 0) {
        score += WEIGHTS.partial * weight * (1 + Math.log(stemHit));
        matchedTerms.add(term);
        hitTerms.add(term);
        fieldsHit.add(fieldName);
        continue;
      }
      // prefix match: "cruci" finds "crucifixion"
      if (term.length >= 4) {
        let prefixHits = 0;
        for (const tok of field.counts.keys()) {
          if (tok.startsWith(term)) { prefixHits += 1; hitTerms.add(tok); }
        }
        if (prefixHits > 0) {
          score += WEIGHTS.partial * 0.7 * weight * prefixHits;
          matchedTerms.add(term);
          fieldsHit.add(fieldName);
        }
      }
    }

    /* 6. Concept (semantic) ------------------------------------------ */
    for (const exp of q.expansionTerms) {
      if (exp.includes(' ')) {
        if (field.norm.includes(exp)) {
          conceptScore += WEIGHTS.concept * 1.6 * weight;
          hitTerms.add(exp);
          fieldsHit.add(fieldName);
        }
      } else if (field.stems.has(stem(exp))) {
        conceptScore += WEIGHTS.concept * weight;
        hitTerms.add(exp);
        fieldsHit.add(fieldName);
      }
    }
  }

  /* 4./5. Tag and metadata matches are handled by FIELD_WEIGHTS above,
     with an extra boost when a tag matches the query outright. */
  for (const tag of entry.tags || []) {
    const nt = normalize(tag);
    if (q.phrases.includes(nt) || q.terms.includes(nt)) {
      score += WEIGHTS.tagPhrase;
      reasons.push({ kind: 'tag', field: 'tags', value: tag });
    }
  }

  /* Coverage: how much of what the user typed was found at all. */
  if (q.terms.length) {
    const coverage = matchedTerms.size / q.terms.length;
    score += WEIGHTS.coverage * Math.pow(coverage, 1.5);
  }

  const cap = q.conceptCap ?? CONCEPT_CAP;
  score += Math.min(conceptScore, cap);

  /* Quoted phrases are mandatory. */
  if (q.requiredPhrases.length) {
    const haystack = [doc.title.norm, doc.body.norm, doc.notes.norm, doc.meta.norm, doc.tags.norm].join(' ');
    for (const rp of q.requiredPhrases) {
      if (!haystack.includes(rp)) return null;
    }
  }

  return {
    score,
    conceptScore: Math.min(conceptScore, cap),
    matchedTerms: [...matchedTerms],
    hitTerms: [...hitTerms],
    fieldsHit: [...fieldsHit],
    reasons,
    doc,
  };
}

/* ------------------------------------------------------------------ */
/* Public: search                                                      */
/* ------------------------------------------------------------------ */

export function search({
  religionId, query, groupSlugs = [], limit = 60,
  useConcepts = true, exactPriority = 'high',
}) {
  const q = parseQuery(query, { useConcepts });
  q.conceptCap = exactPriority === 'balanced' ? CONCEPT_CAP * 1.9 : CONCEPT_CAP;
  if (!q.original) {
    return { query: '', groups: [], count: 0, concepts: [], empty: true };
  }

  const { rows } = candidates(religionId, q, groupSlugs);
  const scored = [];

  for (const entry of rows) {
    const s = scoreEntry(entry, q);
    if (!s || s.score < MIN_SCORE) continue;
    scored.push({ entry, ...s });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);
  const best = top.length ? top[0].score : 0;

  /* Build the result items, including separate Personal Notes results for
     notes attached to entries that are not themselves notes. */
  const items = [];
  for (const r of top) {
    items.push(buildResult(r, q, best, 'entry'));

    const noteHit = r.fieldsHit.includes('notes');
    if (noteHit && r.entry.group_slug !== 'notes' && String(r.entry.notes || '').trim()) {
      items.push(buildResult(r, q, best, 'note'));
    }
  }

  return {
    query: q.original,
    concepts: q.conceptLabels,
    count: items.length,
    groups: groupResults(items),
    empty: items.length === 0,
  };
}

function buildResult(r, q, best, kind) {
  const e = r.entry;
  const isNote = kind === 'note';
  const sourceText = isNote ? e.notes : (e.text || e.notes);
  const ratio = best > 0 ? r.score / best : 0;

  return {
    kind,
    id: e.id,
    uid: e.uid,
    title: e.title,
    group_slug: isNote ? 'notes' : e.group_slug,
    group_name: isNote ? 'Personal Notes' : e.group_name,
    origin_group_name: e.group_name,
    origin_group_slug: e.group_slug,
    collection: e.collection_name || '',
    book: e.book || '',
    reference: e.reference || '',
    author: e.author || '',
    language: e.language || '',
    type: e.type || '',
    tags: e.tags || [],
    excerpt: excerptAround(sourceText, r.hitTerms.length ? r.hitTerms : q.terms),
    score: Math.round(r.score * 10) / 10,
    relevance: relevanceLabel(ratio),
    relevance_ratio: Math.round(ratio * 100) / 100,
    why: describeMatch(r, q, isNote),
    semantic_only: r.matchedTerms.length === 0 && r.conceptScore > 0,
  };
}

function relevanceLabel(ratio) {
  if (ratio >= 0.75) return 'Very High';
  if (ratio >= 0.45) return 'High';
  if (ratio >= 0.22) return 'Medium';
  return 'Low';
}

function describeMatch(r, q, isNote) {
  const bits = [];
  const phraseHit = r.reasons.find((x) => x.kind === 'phrase');
  if (phraseHit) bits.push(`exact phrase in ${fieldLabel(phraseHit.field)}`);
  if (r.reasons.some((x) => x.kind === 'tag')) bits.push('tag match');

  const words = r.matchedTerms.filter((t) => !phraseHit || !phraseHit.value.includes(t));
  if (words.length) bits.push(`words: ${words.slice(0, 6).join(', ')}`);

  if (r.conceptScore > 0 && q.conceptLabels.length) {
    bits.push(`related concepts: ${q.conceptLabels.slice(0, 3).join(', ')}`);
  }
  if (isNote) bits.unshift('found in your personal notes');
  else if (r.fieldsHit.includes('notes') && r.fieldsHit.length === 1) {
    bits.unshift('found in your personal notes');
  }
  return bits.join(' · ') || 'related material';
}

function fieldLabel(field) {
  return ({ title: 'the title', body: 'the text', notes: 'your notes', meta: 'the metadata', tags: 'the tags' })[field] || field;
}

const GROUP_ORDER = ['quran', 'hadith', 'scholarly', 'notes'];

function groupResults(items) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.group_slug)) {
      map.set(item.group_slug, { slug: item.group_slug, name: item.group_name, results: [] });
    }
    map.get(item.group_slug).results.push(item);
  }
  // Only groups that actually contain results are returned (spec 14).
  return [...map.values()].sort(
    (a, b) => GROUP_ORDER.indexOf(a.slug) - GROUP_ORDER.indexOf(b.slug)
  );
}

/* ------------------------------------------------------------------ */
/* Public: explore — related / supporting / potentially contradicting  */
/* ------------------------------------------------------------------ */

/**
 * A retrieval tool, not a judgement. It surfaces material from the user's own
 * database that stands near a question, and says plainly why it was surfaced.
 * It never states that anything is true, false, supported or refuted.
 */
export function explore({
  religionId, query, mode, groupSlugs = [], excludeIds = [], limit = 12, useConcepts = true,
}) {
  const q = parseQuery(query, { useConcepts });
  if (!q.original) return { mode, results: [], empty: true, basis: [] };

  const queryConcepts = new Set(q.conceptIds);
  const tensions = new Set(tensionsFor(q.conceptIds));
  const exclude = new Set(excludeIds.map(Number));

  const { rows } = candidates(religionId, q, groupSlugs);
  const out = [];

  for (const entry of rows) {
    if (exclude.has(entry.id)) continue;
    const doc = docFor(entry);

    let overlap = 0;
    const shared = [];
    for (const id of queryConcepts) {
      const hits = doc.conceptHits.get(id);
      if (hits) { overlap += Math.min(hits, 4); shared.push(id); }
    }

    let tensionOverlap = 0;
    const sharedTension = [];
    for (const id of tensions) {
      const hits = doc.conceptHits.get(id);
      if (hits) { tensionOverlap += Math.min(hits, 4); sharedTension.push(id); }
    }

    const lexical = scoreEntry(entry, q);
    const lexScore = lexical ? lexical.score : 0;
    const contrast = doc.contrast;

    let score = 0;
    let reason = '';

    if (mode === 'related') {
      score = overlap * 6 + lexScore * 0.35 + tensionOverlap * 2;
      if (score <= 0) continue;
      reason = shared.length
        ? `shares: ${conceptLabels(shared).slice(0, 3).join(', ')}`
        : 'shares wording with your search';
    } else if (mode === 'supporting') {
      if (overlap === 0 && lexScore < MIN_SCORE) continue;
      score = overlap * 7 + lexScore * 0.5 - contrast * 2.5;
      if (score <= 0) continue;
      const subject = conceptLabels(shared).slice(0, 3).join(', ') || 'your search terms';
      reason = contrast === 0
        ? `discusses ${subject}, with no denying or contrasting wording`
        : `discusses ${subject} — note that it also contains some contrasting wording`;
    } else if (mode === 'contradicting') {
      const nearby = overlap > 0 || lexScore >= MIN_SCORE;
      if (!nearby && tensionOverlap === 0) continue;
      score = tensionOverlap * 8 + contrast * 3 + overlap * 3 + lexScore * 0.2;
      if (contrast === 0 && tensionOverlap === 0) continue;
      const why = [];
      if (tensionOverlap > 0) why.push(`touches ${conceptLabels(sharedTension).slice(0, 2).join(', ')}`);
      if (contrast > 0) why.push('contains denying or contrasting wording');
      reason = why.join(' · ');
    } else {
      continue;
    }

    out.push({
      entry,
      score,
      reason,
      hitTerms: lexical ? lexical.hitTerms : [],
    });
  }

  out.sort((a, b) => b.score - a.score);
  const top = out.slice(0, limit);
  const best = top.length ? top[0].score : 0;

  return {
    mode,
    basis: q.conceptLabels,
    empty: top.length === 0,
    results: top.map((r) => ({
      kind: 'entry',
      id: r.entry.id,
      uid: r.entry.uid,
      title: r.entry.title,
      group_slug: r.entry.group_slug,
      group_name: r.entry.group_name,
      collection: r.entry.collection_name || '',
      reference: r.entry.reference || '',
      author: r.entry.author || '',
      tags: r.entry.tags || [],
      excerpt: excerptAround(r.entry.text || r.entry.notes, r.hitTerms.length ? r.hitTerms : q.terms, 150),
      relevance: relevanceLabel(best > 0 ? r.score / best : 0),
      why: r.reason,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Public: similar entries (used on the entry page)                    */
/* ------------------------------------------------------------------ */

export function similarTo(entryId, religionId, limit = 6) {
  const db = getDb();
  const target = getEntriesByIds([entryId])[0];
  if (!target) return [];

  const targetDoc = docFor(target);
  const targetConcepts = targetDoc.conceptHits;
  const targetTags = new Set((target.tags || []).map(normalize));
  const targetStems = new Set([
    ...targetDoc.title.stems.keys(),
    ...[...targetDoc.body.stems.keys()].slice(0, 400),
  ]);

  const ids = db.prepare('SELECT id FROM entry WHERE religion_id = ? AND id <> ?').all(religionId, entryId).map((r) => r.id);
  const rows = getEntriesByIds(ids);
  const scored = [];

  for (const other of rows) {
    const doc = docFor(other);
    let score = 0;
    const why = [];

    let conceptOverlap = 0;
    const sharedConcepts = [];
    for (const [id, hits] of targetConcepts) {
      const otherHits = doc.conceptHits.get(id);
      if (otherHits) {
        conceptOverlap += Math.min(hits, 3) * Math.min(otherHits, 3);
        sharedConcepts.push(id);
      }
    }
    score += conceptOverlap * 1.5;

    let tagOverlap = 0;
    for (const t of other.tags || []) if (targetTags.has(normalize(t))) tagOverlap += 1;
    score += tagOverlap * 12;

    let wordOverlap = 0;
    for (const s of doc.body.stems.keys()) if (targetStems.has(s)) wordOverlap += 1;
    score += Math.min(wordOverlap, 40) * 0.6;

    if (score < 6) continue;
    if (tagOverlap) why.push(`${tagOverlap} shared tag${tagOverlap > 1 ? 's' : ''}`);
    if (sharedConcepts.length) why.push(conceptLabels(sharedConcepts).slice(0, 3).join(', '));

    scored.push({
      id: other.id,
      uid: other.uid,
      title: other.title,
      group_slug: other.group_slug,
      group_name: other.group_name,
      reference: other.reference || '',
      excerpt: truncate(other.text || other.notes, 140),
      why: why.join(' · '),
      score,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
