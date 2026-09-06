/**
 * EXAMPLE ENTRIES
 * ---------------
 * Optional. Nothing loads these unless the user presses "Load example entries"
 * in Settings, and every one of them can be deleted in a click.
 *
 * They exist only to show how the four source groups, tags, personal notes and
 * the search ranking behave before the user has added their own material.
 *
 * IMPORTANT: the TEXT fields below are short plain-English summaries written as
 * placeholders. They are deliberately NOT presented as a translation of
 * scripture — the user is expected to paste the translation they trust. Each
 * one says so in its own text, and every example carries the tag "example".
 */

export const SAMPLE_ENTRIES = [
  {
    uid: 'QUR-EXAMPLE-4157',
    group_slug: 'quran',
    title: 'Quran 4:157',
    source: 'Quran',
    collection_name: 'The Quran',
    book: 'Surah An-Nisa',
    chapter: '4',
    reference: '4:157',
    language: 'English',
    type: 'Primary Religious Text',
    text:
      'EXAMPLE ENTRY — replace this with the translation you use.\n\n' +
      'Summary of the passage: it denies that the Jewish opponents killed or crucified Jesus, ' +
      'son of Mary, and says the matter was made to appear so to them, that those who differ ' +
      'about it are in doubt, and that they did not kill him with certainty.',
    notes:
      'This is the passage most often raised in Christian–Muslim discussion of the crucifixion. ' +
      'Note which of the two verbs is denied first, and who the denial is addressed to. ' +
      'Compare with the following verse about being raised up.',
    tags: ['example', 'Jesus', 'Isa', 'crucifixion', 'An-Nisa'],
  },
  {
    uid: 'QUR-EXAMPLE-3055',
    group_slug: 'quran',
    title: 'Quran 3:55',
    source: 'Quran',
    collection_name: 'The Quran',
    book: 'Surah Al-Imran',
    chapter: '3',
    reference: '3:55',
    language: 'English',
    type: 'Primary Religious Text',
    text:
      'EXAMPLE ENTRY — replace this with the translation you use.\n\n' +
      'Summary of the passage: God addresses Jesus, saying that He will take him and raise him ' +
      'to Himself, purify him from those who disbelieved, and place those who follow him above ' +
      'those who disbelieved until the Day of Resurrection.',
    notes:
      'The verb translated "take" (mutawaffika) is the centre of a long exegetical argument: ' +
      'does it mean death, sleep, or being taken up whole? Worth collecting the tafsir positions ' +
      'side by side in this library.',
    tags: ['example', 'Jesus', 'Isa', 'raised', 'Al-Imran'],
  },
  {
    uid: 'HAD-EXAMPLE-0001',
    group_slug: 'hadith',
    title: 'Narration on the descent of Jesus',
    source: 'Hadith',
    collection_name: 'Sahih al-Bukhari',
    book: 'Book of Prophets',
    reference: 'Example reference — enter the real one',
    author: 'Narrated by Abu Hurayrah',
    language: 'English',
    type: 'Hadith',
    text:
      'EXAMPLE ENTRY — replace this with the wording of the narration you are working from, ' +
      'together with its collection, book and number.\n\n' +
      'Summary: a narration reporting that Jesus, son of Mary, will descend as a just ruler, ' +
      'break the cross, and that wealth will become abundant.',
    notes:
      'Check the grading and the chain before relying on this. Compare the different wordings ' +
      'across collections — they are not identical, and the differences matter.',
    tags: ['example', 'Jesus', 'return', 'Bukhari', 'end times'],
  },
  {
    uid: 'SCH-EXAMPLE-0001',
    group_slug: 'scholarly',
    title: 'Reading notes: substitution theories in classical tafsir',
    source: 'Islamic Scholarly Work',
    collection_name: 'Reading notes',
    author: 'Enter the author here',
    date: '2026',
    language: 'English',
    type: 'Personal Research',
    text:
      'EXAMPLE ENTRY — replace this with your own summary of a paper, book or commentary.\n\n' +
      'Classical commentators offered several readings of the phrase "it was made to appear so ' +
      'to them": that another person was made to resemble Jesus, that the crucifixion happened ' +
      'to someone else entirely, or that the denial concerns the opponents claiming the deed as ' +
      'their own achievement. The readings differ sharply and are not interchangeable.',
    notes:
      'When adding scholarly material, keep the author and the page reference. The value of this ' +
      'library is being able to go back to the source.',
    tags: ['example', 'tafsir', 'crucifixion', 'substitution'],
  },
  {
    uid: 'NOTE-EXAMPLE-0001',
    group_slug: 'notes',
    title: 'Question: which claim is actually being denied?',
    source: 'Personal Notes',
    type: 'Personal Research',
    language: 'English',
    text:
      'EXAMPLE ENTRY — this shows how a standalone personal note looks. Notes appear in their ' +
      'own amber-marked group and are never mixed in with primary sources.\n\n' +
      'Working question: in the crucifixion passage, is the denial aimed at the fact of the ' +
      'execution, or at the opponents boasting that they accomplished it? Collect every passage ' +
      'and commentary bearing on that question before drawing a conclusion.',
    notes:
      'Next step: add the relevant verses, then the tafsir positions, then look at what the ' +
      '"potentially contradicting material" button surfaces.',
    tags: ['example', 'crucifixion', 'open question'],
  },
];
