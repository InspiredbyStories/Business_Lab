# Build Log

## 2026-08-23 — Version 1 built and working

Built the whole Version 1 application in one session. It runs, and every part below
was tested against a real database before being written down here.

### What exists now

| Spec priority | Feature | State |
|---|---|---|
| 1 | Local desktop application | Working — own window, no browser chrome |
| 2 | One religion category: Islam | Working |
| 3 | Source groups: Quran, Hadith, Scholarly Work, Personal Notes | Working |
| 4 | Add New Entry | Working |
| 5 | Manual text entry | Working |
| 6 | File upload | Working — TXT, MD, HTML, DOCX, PDF, images |
| 7 | Local database storage | Working — SQLite, one file |
| 8 | Hybrid search (phrase, keyword, concept) | Working |
| 9 | Ranked and grouped results | Working |
| 10 | Entry viewer and editor | Working |
| 11 | Related material | Working |
| 12 | Supporting / potentially contradicting material | Working |

### Verified by test, not by assumption

- **Exact phrase beats related.** Searching `"son of Mary"` in quotation marks returns only
  entries actually containing that phrase, ranked Very High.
- **Concept search works.** Searching `crucifixion` finds an entry whose text says
  *they did not kill him* — the word never appears in it.
- **Grouping is correct.** A search returns Quran, Hadith, Scholarly Work and Personal Notes
  as separate blocks, and empty groups are not displayed.
- **Personal notes stay separate.** When a match is found inside personal notes on a Quran
  entry, it appears twice: once as the Quran entry, once under Personal Notes clearly marked
  *"Your personal note on Quran · Quran 4:157"*. It is never presented as scripture.
- **The strict data boundary holds.** Searching for material that is not in the database
  (tested with Norse mythology terms) returns
  *"No sufficiently relevant material was found in your current database"* — never an invented answer.
- **File reading works.** Tested with a Word document, an uncompressed PDF, a compressed
  (FlateDecode) PDF and a PNG image. All four returned their text correctly. The image went
  through the OCR engine built into Windows.
- **Nothing is destroyed.** Deleting an entry removes its stored copies; the user's original
  files are never touched. Verified the files folder empties correctly on delete.
- **Both themes are exact.** Light mode measured at `#F5F1E8` background / `#1E293B` text;
  dark mode at `#0B1120` / `#E8E6E1`, sidebar `#111827`, active filter `#123D31` with
  `#2FA879` text — matching the colour specification value for value.

### Notable engineering decisions

See [[Architecture Decisions]]. The short version:

- **Zero dependencies.** No npm install, no `node_modules`, no build step. Node 24's built-in
  SQLite turned out to include FTS5 with `bm25()` ranking, which removed the one library this
  normally needs.
- **PDF and DOCX are read by hand.** DOCX is a ZIP file, so the archive is parsed directly and
  the document part inflated with Node's built-in zlib. PDF content streams are inflated the
  same way and the text-showing operators read out. Both warn the user to check the result.
- **OCR uses Windows' own engine** through a small PowerShell helper (`app/tools/ocr.ps1`).
  No image ever leaves the computer.

### Left for a later version

- Additional religion categories (the database and theme system already support them).
- A vector/embedding semantic layer alongside the concept map.
- Bulk import of an entire folder of files at once.
- Packaging as a signed `.exe`.

### Things worth knowing

- Five clearly-marked **example entries** are loaded, so the application is not empty on first
  open. Every one is tagged `example` and can be deleted. Their text is placeholder summary
  wording, not a translation — replace it with the translation you actually use.
- The **concept map** that drives meaning-based search is a plain readable file at
  `app/src/concepts.js`. It can be extended as the research grows.
