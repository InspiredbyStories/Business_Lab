# Glossary Apologetica

Private, local desktop **religious studies search engine**. Version 1 covers **Islam** only
(Quran, Hadith, Islamic Scholarly Work, Personal Notes), with the architecture built so other
traditions can be added later without a rewrite.

It is a **retrieval tool, not an AI assistant**. It searches only material the user has entered.
It never generates theological answers, never invents interpretations, and every byte of the
library — entries, notes, uploaded files — stays on this one computer regardless of how it's
reached.

---

## Status

| | |
|---|---|
| Version | 1 — built and working |
| Started | 2026-08-23 |
| Location | `Glossary Apologetica/app/` |
| Data lives | `%APPDATA%\glossary-apologetica\data\` on this PC only |
| Desktop app | Installed via `installer/Glossary-Apologetica-Setup-1.0.0.exe` |
| Remote access | Optional, password-protected — see below |

---

## Specifications

- [[01 - Build Specification]] — what the application does
- [[02 - UI and Button Design]] — layout, shapes, buttons, interaction states
- [[03 - Color System]] — light/dark themes, Islam accent, source-type colors

## Working notes

- [[Architecture Decisions]] — the stack chosen and why
- [[Build Log]] — what has been built, in order

---

## How to open the app

Double-click **Glossary Apologetica** on the Desktop.

Or, from inside the vault:

```
Glossary Apologetica\app\Start Glossary Apologetica.bat
```

It opens in its own window, with no address bar. A small black console box stays open behind
it — that is the application itself running. Closing that box shuts everything down.

---

## Using it from another computer

Run **`Set Up Remote Access.ps1`** once (right-click → Run with PowerShell). It:

1. Downloads `cloudflared`, a small tool that opens a one-way connection out to Cloudflare —
   nothing is opened on the router, and the home IP address is never exposed.
2. Registers two background tasks that start automatically whenever this PC is signed into
   Windows: the library server (so it's reachable even with the app window closed) and the
   tunnel itself.
3. Prints a web address like `https://random-words.trycloudflare.com`.

That address opens the same login screen as the desktop app, from any browser, anywhere.
**The password is required either way** — the account settings never made this login-optional.

Two things worth remembering:

- **The address changes if this computer restarts**, since no domain name is attached (a
  domain gives a permanent address instead — ask if that's ever wanted). The *current* address
  is always shown in the app itself, under **Settings → Remote access**.
- **This computer has to be on and signed in** for the remote address to work. There's no
  version of "reachable from anywhere" that doesn't depend on this machine being up.

Run **`Remove Remote Access.ps1`** to turn it back off — the library itself is never touched.

---

## The four source groups

| Group | Colour | Contains |
|---|---|---|
| Quran | Emerald | Surahs, ayahs, translations |
| Hadith | Muted teal | Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, others |
| Islamic Scholarly Work | Muted blue | Papers, books, articles, commentary, history |
| Personal Notes | Muted amber | The user's own observations — never shown as scripture |
