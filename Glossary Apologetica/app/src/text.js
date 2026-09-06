/**
 * TEXT UTILITIES
 * --------------
 * Normalising, tokenising and light stemming. Shared by the indexer and the
 * search engine so that what gets indexed and what gets searched are treated
 * identically.
 *
 * Nothing here reaches outside the application. It is plain string handling.
 */

/** Words too common to be worth scoring on their own. */
export const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'of', 'in', 'on', 'at', 'to', 'for',
  'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'have', 'has', 'had', 'it', 'its', 'this', 'that', 'these',
  'those', 'there', 'here', 'what', 'which', 'who', 'whom', 'how', 'when', 'where',
  'why', 'about', 'into', 'than', 'then', 'so', 'such', 'can', 'could', 'would',
  'should', 'may', 'might', 'will', 'shall', 'i', 'you', 'he', 'she', 'we', 'they',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'their', 'our', 'said',
  'say', 'says', 'also', 'any', 'all', 'some', 'more', 'most', 'other', 'up', 'out',
  'over', 'under', 'again', 'only', 'own', 'same', 'too', 'very', 'just', 'does',
]);

/**
 * Lower-cases, strips accents and the various apostrophes used in
 * transliterated Arabic (Qur'an, Qurʾan, Qur`an all become "quran").
 */
export function normalize(input) {
  if (!input) return '';
  return String(input)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')                    // combining accents
    .replace(/[ʻʼʾʿ‘’ˋ'`]/g, '') // hamza / ayn / apostrophes
    .replace(/[‐-―]/g, '-')                   // dashes
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Splits normalised text into word tokens. Keeps Arabic script as-is. */
export function tokenize(input) {
  const norm = normalize(input);
  if (!norm) return [];
  return norm
    .split(/[^0-9a-z؀-ۿ]+/u)
    .filter((w) => w.length > 0);
}

/** Tokens minus stopwords and single characters. */
export function contentTokens(input) {
  return tokenize(input).filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/**
 * Light suffix stemmer. Deliberately conservative: it is better to miss a
 * stem than to collapse two words that mean different things in a religious
 * text ("prophet" and "prophecy" stay distinct, "crucified" and "crucifixion"
 * both reduce to "crucif").
 */
export function stem(word) {
  let w = word;
  if (w.length <= 3) return w;

  const rules = [
    [/(ification|ifications)$/, 'if'],
    [/(fixion|fixions|fixation)$/, 'f'],
    [/(ified|ifies|ifying|ify)$/, 'if'],
    [/(ization|isation)$/, 'iz'],
    [/(ousness|iveness|fulness)$/, ''],
    [/(ements|ement)$/, ''],
    [/(ations|ation)$/, 'at'],
    [/(ities|ity)$/, ''],
    [/(ingly|edly)$/, ''],
    [/(ies)$/, 'i'],
    [/(ied)$/, 'i'],
    [/(sses)$/, 'ss'],
    [/(ing)$/, ''],
    [/(edly)$/, ''],
    [/(ed)$/, ''],
    [/(ly)$/, ''],
    [/(es)$/, ''],
    [/(s)$/, ''],
  ];

  for (const [re, rep] of rules) {
    if (re.test(w)) {
      const candidate = w.replace(re, rep);
      if (candidate.length >= 3) return candidate;
    }
  }
  return w;
}

/** Stems every content token, de-duplicated. */
export function stemSet(input) {
  return new Set(contentTokens(input).map(stem));
}

/** Escapes a value for safe inclusion in an FTS5 MATCH string. */
export function ftsQuote(value) {
  return '"' + String(value).replace(/"/g, '""') + '"';
}

/**
 * Pulls an excerpt around the first place a term appears, so result cards
 * show the part of the passage that actually matched.
 */
export function excerptAround(text, terms, radius = 190) {
  if (!text) return '';
  const flat = String(text).replace(/\s+/g, ' ').trim();
  if (!terms || terms.length === 0) return truncate(flat, radius * 2);

  const hay = normalize(flat);
  let best = -1;
  for (const t of terms) {
    const needle = normalize(t);
    if (!needle) continue;
    const at = hay.indexOf(needle);
    if (at !== -1 && (best === -1 || at < best)) best = at;
  }
  if (best === -1) return truncate(flat, radius * 2);

  let start = Math.max(0, best - radius);
  let end = Math.min(flat.length, best + radius);
  // snap to word edges
  if (start > 0) {
    const sp = flat.indexOf(' ', start);
    if (sp !== -1 && sp - start < 25) start = sp + 1;
  }
  if (end < flat.length) {
    const sp = flat.lastIndexOf(' ', end);
    if (sp !== -1 && end - sp < 25) end = sp;
  }
  return (start > 0 ? '… ' : '') + flat.slice(start, end).trim() + (end < flat.length ? ' …' : '');
}

export function truncate(text, max) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : flat.slice(0, max).trim() + ' …';
}

/** Counts non-overlapping occurrences of a phrase in text (both normalised). */
export function countOccurrences(haystack, needle) {
  const h = normalize(haystack);
  const n = normalize(needle);
  if (!h || !n) return 0;
  let count = 0;
  let idx = h.indexOf(n);
  while (idx !== -1) {
    count += 1;
    idx = h.indexOf(n, idx + n.length);
  }
  return count;
}

/** True when the phrase appears with word boundaries around it. */
export function hasWord(haystack, word) {
  const tokens = tokenize(haystack);
  const target = normalize(word);
  return tokens.includes(target);
}
