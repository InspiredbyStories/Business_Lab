/**
 * CONCEPT MAP  —  the offline "meaning" layer of the search engine
 * ----------------------------------------------------------------
 * The build specification requires semantic search: searching for
 * "crucifixion" must find a passage that says "they did not kill him",
 * even though the word never appears.
 *
 * It also forbids the application from reaching the internet or leaning on
 * general AI knowledge (section 15). So meaning is handled by an explicit,
 * inspectable concept map instead of a hidden model. Every association the
 * search engine makes is written down in this file and can be read, corrected
 * or extended by the user.
 *
 * SHAPE OF A CONCEPT
 *   id      short stable key
 *   label   human-readable name, shown in the UI when a concept is matched
 *   terms   words and transliteration variants that all point at the concept
 *   tension other concept ids this one is commonly in tension with; used only
 *           to *retrieve* potentially contradicting material for the user to
 *           judge. It never asserts that a contradiction exists.
 */

export const CONCEPTS = [
  /* ---- God and the divine ---------------------------------------- */
  { id: 'god', label: 'God', terms: ['god', 'allah', 'lord', 'creator', 'divine', 'deity', 'almighty', 'rabb', 'ilah'] },
  { id: 'tawhid', label: 'Oneness of God (Tawhid)', terms: ['tawhid', 'tawheed', 'oneness', 'monotheism', 'one god', 'unity of god', 'indivisible', 'no partner', 'ikhlas'], tension: ['trinity', 'sonship'] },
  { id: 'shirk', label: 'Shirk (associating partners with God)', terms: ['shirk', 'associating partners', 'polytheism', 'idolatry', 'idol', 'idols', 'mushrik', 'pagan'], tension: ['trinity'] },
  { id: 'attributes', label: 'Attributes of God', terms: ['merciful', 'mercy', 'rahman', 'raheem', 'compassionate', 'just', 'justice', 'omniscient', 'all knowing', 'all powerful', 'sovereign', 'wise', 'hakim'] },

  /* ---- Jesus and Christology ------------------------------------- */
  { id: 'jesus', label: 'Jesus (Isa)', terms: ['jesus', 'isa', 'eesa', 'iesa', 'yasu', 'christ', 'messiah', 'masih', 'maseeh', 'son of mary', 'ibn maryam', 'word of god', 'kalimatullah', 'spirit from him', 'ruhullah'] },
  { id: 'mary', label: 'Mary (Maryam)', terms: ['mary', 'maryam', 'virgin', 'virginity', 'mother of jesus', 'chosen above the women'] },
  { id: 'crucifixion', label: 'Crucifixion', terms: ['crucifixion', 'crucified', 'crucify', 'cross', 'nailed', 'golgotha', 'calvary'], tension: ['substitution', 'denial'] },
  { id: 'death', label: 'Death and killing', terms: ['death', 'died', 'die', 'dead', 'killed', 'kill', 'killing', 'slain', 'slay', 'murdered', 'perished', 'martyred'] },
  { id: 'substitution', label: 'Substitution / it was made to appear so', terms: ['made to appear', 'appeared to them', 'shubbiha', 'likeness', 'resemblance', 'substitute', 'another was made to look'] },
  { id: 'raised', label: 'Raised up / ascension', terms: ['raised', 'raised up', 'ascension', 'ascended', 'lifted', 'rafa', 'taken up', 'took him up', 'raised him to himself'] },
  { id: 'resurrection', label: 'Resurrection', terms: ['resurrection', 'resurrected', 'risen', 'rose again', 'raised from the dead', 'empty tomb', 'third day'] },
  { id: 'return', label: 'Second coming / return of Jesus', terms: ['second coming', 'return of jesus', 'descend', 'descent', 'nuzul', 'break the cross', 'kill the swine', 'end times', 'dajjal', 'antichrist', 'mahdi'] },
  { id: 'sonship', label: 'Sonship of Christ', terms: ['son of god', 'begotten', 'begat', 'father and son', 'divine sonship', 'only begotten', 'walad'], tension: ['tawhid'] },
  { id: 'trinity', label: 'Trinity', terms: ['trinity', 'triune', 'three in one', 'father son and holy spirit', 'godhead', 'hypostasis', 'thalatha', 'third of three'], tension: ['tawhid', 'shirk'] },
  { id: 'incarnation', label: 'Incarnation', terms: ['incarnation', 'incarnate', 'god became man', 'word became flesh', 'hypostatic union', 'nature of christ'] },
  { id: 'atonement', label: 'Atonement / redemption', terms: ['atonement', 'atone', 'redemption', 'redeem', 'ransom', 'propitiation', 'sacrifice for sin', 'blood of christ', 'saviour', 'savior', 'salvation'], tension: ['bearing_burdens'] },
  { id: 'bearing_burdens', label: 'No soul bears another burden', terms: ['bear the burden', 'no bearer of burdens', 'wazira', 'each soul is responsible', 'own deeds', 'nobody carries the sin of another'], tension: ['atonement', 'originalsin'] },
  { id: 'originalsin', label: 'Original sin', terms: ['original sin', 'inherited sin', 'fallen nature', 'sin of adam', 'total depravity'], tension: ['fitra', 'bearing_burdens'] },
  { id: 'fitra', label: 'Fitra (natural disposition)', terms: ['fitra', 'fitrah', 'born pure', 'natural disposition', 'innate nature'], tension: ['originalsin'] },

  /* ---- Prophets --------------------------------------------------- */
  { id: 'prophethood', label: 'Prophethood', terms: ['prophet', 'prophets', 'prophethood', 'messenger', 'messengers', 'nabi', 'rasul', 'apostle', 'sent one'] },
  { id: 'muhammad', label: 'Muhammad', terms: ['muhammad', 'mohammed', 'mohammad', 'muhammed', 'ahmad', 'the messenger of allah', 'prophet muhammad', 'mustafa', 'seal of the prophets', 'khatam'] },
  { id: 'earlier_prophets', label: 'Earlier prophets', terms: ['adam', 'noah', 'nuh', 'abraham', 'ibrahim', 'moses', 'musa', 'david', 'dawud', 'solomon', 'sulayman', 'joseph', 'yusuf', 'jonah', 'yunus', 'job', 'ayyub', 'john the baptist', 'yahya', 'zachariah', 'zakariya', 'lot', 'lut', 'aaron', 'harun', 'jacob', 'yaqub', 'isaac', 'ishaq', 'ishmael', 'ismail'] },
  { id: 'infallibility', label: 'Sinlessness of prophets (isma)', terms: ['isma', 'infallible', 'infallibility', 'sinless', 'protected from sin', 'masum'] },
  { id: 'miracles', label: 'Miracles and signs', terms: ['miracle', 'miracles', 'sign', 'signs', 'ayah', 'ayat', 'wonder', 'healed the blind', 'raised the dead', 'clay bird', 'splitting of the moon', 'inimitability', 'ijaz'] },

  /* ---- Scripture -------------------------------------------------- */
  { id: 'quran', label: 'Quran', terms: ['quran', 'koran', 'qoran', 'surah', 'sura', 'surat', 'ayah', 'ayat', 'verse', 'recitation', 'mushaf', 'the book', 'kitab'] },
  { id: 'revelation', label: 'Revelation', terms: ['revelation', 'revealed', 'wahy', 'inspired', 'inspiration', 'sent down', 'tanzil', 'descended upon'] },
  { id: 'previous_scripture', label: 'Previous scriptures', terms: ['torah', 'tawrat', 'tawrah', 'gospel', 'injil', 'injeel', 'psalms', 'zabur', 'bible', 'scripture', 'scriptures', 'old testament', 'new testament', 'suhuf', 'scrolls'] },
  { id: 'confirmation', label: 'Confirming what came before', terms: ['confirming', 'confirmation', 'musaddiq', 'attesting', 'verifying what is between his hands', 'guardian over it', 'muhaymin'], tension: ['tahrif'] },
  { id: 'tahrif', label: 'Corruption of scripture (tahrif)', terms: ['tahrif', 'corrupted', 'corruption', 'distorted', 'distortion', 'altered', 'changed the words', 'wrote with their own hands', 'twist their tongues', 'concealed'], tension: ['confirmation', 'preservation'] },
  { id: 'preservation', label: 'Preservation of scripture', terms: ['preserved', 'preservation', 'guarded', 'we have sent down the reminder', 'no change in the words of allah', 'incorruptible', 'protected text'], tension: ['tahrif', 'variants'] },
  { id: 'variants', label: 'Textual variants and readings', terms: ['variant', 'variants', 'qiraat', 'ahruf', 'seven letters', 'manuscript', 'codex', 'ibn masud', 'ubayy', 'uthmanic', 'sanaa palimpsest', 'textual criticism'], tension: ['preservation'] },
  { id: 'abrogation', label: 'Abrogation (naskh)', terms: ['abrogation', 'abrogated', 'naskh', 'mansukh', 'nasikh', 'superseded', 'replaced a verse'], tension: ['preservation'] },
  { id: 'tafsir', label: 'Exegesis (tafsir)', terms: ['tafsir', 'tafseer', 'exegesis', 'commentary', 'interpretation', 'asbab al nuzul', 'occasion of revelation', 'ibn kathir', 'tabari', 'qurtubi', 'jalalayn', 'razi'] },
  { id: 'clarity', label: 'Clear and ambiguous verses', terms: ['muhkam', 'mutashabih', 'ambiguous', 'clear verses', 'allegorical', 'literal', 'metaphor', 'metaphorical'] },

  /* ---- Hadith science --------------------------------------------- */
  { id: 'hadith', label: 'Hadith', terms: ['hadith', 'hadeeth', 'ahadith', 'narration', 'narrated', 'report', 'tradition', 'sunnah', 'athar'] },
  { id: 'collections', label: 'Hadith collections', terms: ['bukhari', 'muslim', 'abu dawud', 'dawood', 'tirmidhi', 'nasai', 'ibn majah', 'muwatta', 'malik', 'musnad', 'ahmad', 'sahihayn', 'sunan', 'jami'] },
  { id: 'isnad', label: 'Chain of transmission (isnad)', terms: ['isnad', 'chain', 'narrator', 'narrators', 'transmitter', 'rijal', 'jarh', 'tadil', 'mutawatir', 'ahad', 'grading'] },
  { id: 'authenticity', label: 'Authenticity grading', terms: ['sahih', 'saheeh', 'hasan', 'daif', 'weak', 'mawdu', 'fabricated', 'forged', 'authentic', 'unreliable', 'sound chain'] },
  { id: 'companions', label: 'Companions (sahaba)', terms: ['sahaba', 'companion', 'companions', 'abu bakr', 'umar', 'uthman', 'ali', 'aisha', 'abu hurayrah', 'abu hurairah', 'ibn abbas', 'anas', 'tabiun'] },

  /* ---- Belief and practice ---------------------------------------- */
  { id: 'iman', label: 'Faith (iman)', terms: ['iman', 'faith', 'belief', 'believe', 'believer', 'believers', 'mumin', 'creed', 'aqidah', 'shahada', 'testimony'] },
  { id: 'kufr', label: 'Disbelief (kufr)', terms: ['kufr', 'disbelief', 'disbeliever', 'kafir', 'kuffar', 'unbeliever', 'rejecter', 'infidel', 'apostasy', 'apostate', 'ridda', 'murtad'] },
  { id: 'pillars', label: 'Pillars of Islam', terms: ['pillar', 'pillars', 'salah', 'salat', 'prayer', 'pray', 'zakat', 'charity', 'alms', 'sawm', 'fasting', 'fast', 'ramadan', 'hajj', 'pilgrimage', 'umrah', 'kaaba', 'qibla'] },
  { id: 'worship', label: 'Worship and devotion', terms: ['worship', 'ibadah', 'dhikr', 'remembrance', 'dua', 'supplication', 'invocation', 'prostration', 'sujud', 'ruku', 'wudu', 'ablution', 'purity', 'tahara'] },
  { id: 'sin', label: 'Sin and repentance', terms: ['sin', 'sins', 'sinner', 'wrongdoing', 'transgression', 'evil deed', 'repentance', 'repent', 'tawba', 'forgiveness', 'forgive', 'pardon', 'maghfira', 'istighfar'] },
  { id: 'law', label: 'Islamic law', terms: ['sharia', 'shariah', 'fiqh', 'jurisprudence', 'halal', 'haram', 'permissible', 'forbidden', 'obligatory', 'wajib', 'sunnah act', 'makruh', 'mubah', 'madhhab', 'hanafi', 'maliki', 'shafii', 'hanbali', 'ijma', 'qiyas', 'ijtihad', 'fatwa', 'hudud'] },
  { id: 'ethics', label: 'Ethics and conduct', terms: ['justice', 'mercy', 'honesty', 'truthfulness', 'patience', 'sabr', 'humility', 'oppression', 'zulm', 'lying', 'deception', 'trust', 'amana', 'gratitude', 'shukr'] },

  /* ---- Community and history -------------------------------------- */
  { id: 'ummah', label: 'The Muslim community', terms: ['ummah', 'community', 'muslims', 'believers community', 'jamaah', 'congregation'] },
  { id: 'sects', label: 'Sects and schools', terms: ['sunni', 'shia', 'shiite', 'ibadi', 'sufi', 'sufism', 'tasawwuf', 'salafi', 'wahhabi', 'mutazila', 'ashari', 'maturidi', 'kharijite', 'ahmadiyya', 'sect', 'schism'] },
  { id: 'caliphate', label: 'Caliphate and governance', terms: ['caliph', 'caliphate', 'khilafah', 'imam', 'imamate', 'rashidun', 'umayyad', 'abbasid', 'ottoman', 'sultan', 'governance', 'ruler'] },
  { id: 'jihad', label: 'Jihad and warfare', terms: ['jihad', 'struggle', 'striving', 'fight', 'fighting', 'qital', 'war', 'battle', 'badr', 'uhud', 'khandaq', 'khaybar', 'conquest', 'sword', 'martyrdom', 'shahid'] },
  { id: 'people_of_book', label: 'People of the Book', terms: ['people of the book', 'ahl al kitab', 'jews', 'jewish', 'yahud', 'christians', 'christian', 'nasara', 'nazarenes', 'sabians', 'dhimmi', 'jizya', 'covenant'] },
  { id: 'dawah', label: 'Invitation and debate (dawah)', terms: ['dawah', 'dawa', 'invitation', 'preaching', 'debate', 'polemic', 'apologetics', 'refutation', 'argue in the best manner', 'mubahala', 'munazara'] },

  /* ---- Unseen and the hereafter ----------------------------------- */
  { id: 'angels', label: 'Angels', terms: ['angel', 'angels', 'malak', 'malaika', 'gabriel', 'jibril', 'jibreel', 'michael', 'mikail', 'israfil', 'munkar', 'nakir'] },
  { id: 'jinn', label: 'Jinn and Satan', terms: ['jinn', 'jinnee', 'genie', 'satan', 'shaytan', 'shaitan', 'iblis', 'devil', 'demon', 'whisper', 'waswas', 'possession', 'sihr', 'magic', 'sorcery', 'evil eye'] },
  { id: 'judgment', label: 'Day of Judgment', terms: ['judgment', 'judgement', 'day of judgment', 'last day', 'qiyamah', 'hour', 'reckoning', 'hisab', 'scales', 'mizan', 'accountability', 'trumpet'] },
  { id: 'afterlife', label: 'Paradise and Hell', terms: ['paradise', 'jannah', 'garden', 'gardens', 'heaven', 'hell', 'hellfire', 'jahannam', 'fire', 'punishment', 'reward', 'eternal', 'barzakh', 'grave', 'houri', 'hur'] },
  { id: 'intercession', label: 'Intercession (shafaah)', terms: ['intercession', 'intercede', 'shafaah', 'shafaa', 'mediator', 'mediation', 'plead on behalf'] },
  { id: 'predestination', label: 'Predestination (qadar)', terms: ['predestination', 'qadar', 'qada', 'decree', 'destiny', 'fate', 'preordained', 'written', 'lawh mahfuz', 'preserved tablet'], tension: ['freewill'] },
  { id: 'freewill', label: 'Free will and responsibility', terms: ['free will', 'freewill', 'choice', 'choose', 'responsible', 'responsibility', 'accountable', 'let him believe or disbelieve', 'no compulsion'], tension: ['predestination'] },
  { id: 'soul', label: 'Soul and spirit', terms: ['soul', 'souls', 'nafs', 'spirit', 'ruh', 'rooh', 'life force', 'breath of life'] },

  /* ---- Social topics common in research --------------------------- */
  { id: 'marriage', label: 'Marriage and family', terms: ['marriage', 'married', 'marry', 'wife', 'wives', 'husband', 'divorce', 'talaq', 'polygamy', 'mahr', 'dowry', 'custody', 'inheritance', 'orphan'] },
  { id: 'women', label: 'Women', terms: ['woman', 'women', 'female', 'daughter', 'mother', 'hijab', 'veil', 'niqab', 'modesty', 'awrah', 'testimony of women', 'guardianship', 'qawwamun'] },
  { id: 'slavery', label: 'Slavery and captives', terms: ['slave', 'slaves', 'slavery', 'bondsman', 'captive', 'captives', 'concubine', 'right hand possesses', 'manumission', 'freeing a slave'] },
  { id: 'intoxicants', label: 'Intoxicants and gambling', terms: ['wine', 'alcohol', 'khamr', 'intoxicant', 'intoxicants', 'drunk', 'gambling', 'maysir'] },
  { id: 'food', label: 'Food and dietary law', terms: ['food', 'eat', 'eating', 'pork', 'swine', 'pig', 'carrion', 'blood', 'slaughter', 'dhabiha', 'halal food', 'lawful food'] },
];

/* Words that flag a statement as denying, limiting or opposing something.
   Used only for the "potentially contradicting material" retrieval. */
export const CONTRAST_MARKERS = [
  'not', 'no', 'never', 'nor', 'neither', 'none', 'cannot', 'without',
  'did not', 'do not', 'does not', 'was not', 'were not', 'is not', 'are not',
  'rather', 'instead', 'however', 'but', 'yet', 'although', 'though', 'whereas',
  'contrary', 'contradict', 'contradiction', 'contradicts', 'deny', 'denies',
  'denied', 'denial', 'reject', 'rejects', 'rejected', 'refute', 'refutes',
  'refuted', 'disagree', 'disputed', 'dispute', 'false', 'wrong', 'error',
  'objection', 'problem', 'against', 'oppose', 'opposed', 'opposite',
  'on the other hand', 'in contrast', 'far removed', 'exalted above',
];

/* ------------------------------------------------------------------ */
/* Lookup index                                                        */
/* ------------------------------------------------------------------ */

import { normalize, stem, contentTokens } from './text.js';

const byId = new Map();
const singleWordIndex = new Map(); // stemmed word -> Set(conceptId)
const phraseList = [];             // { phrase, conceptId }

for (const c of CONCEPTS) {
  byId.set(c.id, c);
  for (const term of c.terms) {
    const norm = normalize(term);
    if (norm.includes(' ')) {
      phraseList.push({ phrase: norm, conceptId: c.id });
    } else {
      const key = stem(norm);
      if (!singleWordIndex.has(key)) singleWordIndex.set(key, new Set());
      singleWordIndex.get(key).add(c.id);
    }
  }
}
// Longest phrases first so "son of god" wins over "god".
phraseList.sort((a, b) => b.phrase.length - a.phrase.length);

export function conceptById(id) {
  return byId.get(id);
}

/**
 * Which concepts does this piece of text touch?
 * Returns a Map of conceptId -> hit count.
 */
export function conceptsIn(text) {
  const hits = new Map();
  if (!text) return hits;

  const norm = normalize(text);
  for (const { phrase, conceptId } of phraseList) {
    if (norm.includes(phrase)) {
      hits.set(conceptId, (hits.get(conceptId) || 0) + 2);
    }
  }
  for (const word of contentTokens(text)) {
    const ids = singleWordIndex.get(stem(word));
    if (!ids) continue;
    for (const id of ids) hits.set(id, (hits.get(id) || 0) + 1);
  }
  return hits;
}

/**
 * Expands a query into extra search terms drawn from every concept the query
 * touches. These are scored far lower than the words the user actually typed.
 *
 * Returns { conceptIds, terms, labels }.
 */
export function expandQuery(query) {
  const hits = conceptsIn(query);
  const conceptIds = [...hits.keys()];
  const terms = new Set();
  const labels = [];

  for (const id of conceptIds) {
    const c = byId.get(id);
    if (!c) continue;
    labels.push(c.label);
    for (const t of c.terms) terms.add(normalize(t));
  }
  // Do not re-add what the user already typed; those score as exact matches.
  for (const w of contentTokens(query)) terms.delete(w);

  return { conceptIds, terms: [...terms], labels };
}

/** Concept ids commonly in tension with the given ones. */
export function tensionsFor(conceptIds) {
  const out = new Set();
  for (const id of conceptIds) {
    const c = byId.get(id);
    if (c && c.tension) for (const t of c.tension) out.add(t);
  }
  return [...out];
}

/** True if the text carries denial / contrast language. */
export function contrastScore(text) {
  if (!text) return 0;
  const norm = ' ' + normalize(text) + ' ';
  let score = 0;
  for (const marker of CONTRAST_MARKERS) {
    if (marker.includes(' ')) {
      if (norm.includes(' ' + marker + ' ')) score += 2;
    } else if (norm.includes(' ' + marker + ' ')) {
      score += 1;
    }
  }
  return score;
}

export function conceptLabels(ids) {
  return ids.map((id) => byId.get(id)?.label).filter(Boolean);
}
