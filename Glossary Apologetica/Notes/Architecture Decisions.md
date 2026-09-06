# Architecture Decisions

## The layers (kept separate on purpose)

```
USER INTERFACE      →  app/public/       (HTML, CSS, JS — swappable)
APPLICATION LOGIC   →  app/src/          (entries, validation, files)
SEARCH ENGINE       →  app/src/search.js (hybrid ranking)
DATABASE            →  app/data/library.db (SQLite)
```

Spec section 22 requires this separation so a mobile or web version can be built later
against the same database. The UI talks to the logic only through a small local HTTP API,
so replacing the UI does not touch the search engine or the data.

---

## Decision 1 — No installers, no build step

**Chosen:** Plain Node.js server + plain HTML/CSS/JS front end.

Node 24 is already on this machine. Nothing gets compiled, nothing downloads from npm,
there is no `node_modules` folder. The whole app is files you can read. That means it
cannot break because of a failed package install, and it will still run in five years.

## Decision 2 — Database is SQLite, using Node's built-in engine

**Chosen:** `node:sqlite` (built into Node 24), single file at `app/data/library.db`.

Verified on this machine: SQLite 3.53.1 with **FTS5** full-text search, `bm25()` relevance
ranking and `snippet()` excerpt extraction all available with **zero external packages**.

Normally full-text search in Node needs a compiled native package that frequently fails to
install on Windows. This avoids that entirely.

SQLite is a single portable file — backing up the research library means copying one file.

## Decision 3 — "Desktop app" without Electron

**Chosen:** One-click `.bat` starts a local server and opens a chrome-less app window
(Edge/Chrome `--app=` mode: no address bar, no tabs, own taskbar icon).

Electron would add a ~250 MB download and a build pipeline. Tauri would need a Rust compile.
Neither adds anything the user can see. This gives a real desktop window today, and the app
can be wrapped in a proper `.exe` later without changing a single line of the application.

## Decision 4 — Semantic search runs offline

Spec section 15 forbids reaching the internet. So semantic search is built in two parts:

1. **Concept layer (always on, no dependencies)** — a curated Islamic-studies concept map
   (Isa ↔ Jesus ↔ son of Mary; crucifixion ↔ crucified ↔ killed ↔ died; and so on) plus word
   stemming, so a search for *crucifixion* finds text saying *they did not kill him*.
2. **Vector layer (optional, added later)** — a small embedding model stored inside the app
   folder. Off by default; when enabled it never calls out to the internet.

Version 1 ships the concept layer. It is deterministic, instant, and inspectable — the user
can see and edit the concept map, which matters for a religious research tool where a hidden
model quietly deciding what "means the same thing" would be a liability.

## Decision 5 — Ranking

```
score = exact phrase + exact keyword + partial keyword + metadata + tags + concept match
```

Exact matches are weighted so a strong exact match always outranks a merely related one
(spec section 5C). Weights live in one place: `app/src/search.js` → `WEIGHTS`.

## Decision 6 — Original files are copied, never moved

Uploaded PDFs/images are copied into `app/data/files/`. The user's original file stays where
it was. Nothing the app does can lose their source material.
