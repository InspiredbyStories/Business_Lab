/**
 * GLOSSARY APOLOGETICA — user interface
 * -------------------------------------
 * Plain JavaScript, no framework, no build step. It talks to the local server
 * over a small JSON API and never contacts anything else.
 */

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const state = {
  boot: null,
  religion: 'islam',            // slug of the currently selected religion
  groups: [],
  groupBySlug: new Map(),
  groupsByReligion: new Map(), // slug -> that religion's source groups (cache)
  view: 'search',
  filters: new Set(),          // empty means "All"
  lastQuery: '',
  lastResults: null,
  exploreMode: null,
  entry: null,                 // entry currently open
  editingId: null,
  formTags: [],
  formRelated: [],             // { id, title }
  pendingFiles: [],            // files chosen before the entry exists
  savedFiles: [],              // files already stored against the entry
  returnTo: 'search',
  faqReligion: null,           // slug of the religion sub-tab currently shown
  faqEditingId: null,
  faqEntries: [],              // { id, title } linked in the open FAQ form
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

async function api(pathname, options = {}) {
  const res = await fetch(pathname, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 401 && !pathname.startsWith('/api/auth/')) {
    // The session ended (logged out elsewhere, or it expired) — go back to
    // the login screen rather than leaving the app silently broken.
    window.location.reload();
    return new Promise(() => {}); // reload is already underway
  }
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const post = (p, body) => api(p, { method: 'POST', body: JSON.stringify(body || {}) });
const put = (p, body) => api(p, { method: 'PUT', body: JSON.stringify(body || {}) });
const del = (p) => api(p, { method: 'DELETE' });

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/**
 * Every source group carries its own light/dark colour from the database
 * (set per religion — see src/db.js), so this reads the real value for the
 * group and the current theme, rather than assuming a fixed Islam palette.
 */
function isDarkTheme() {
  const t = document.documentElement.dataset.theme;
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function groupColorVar(slug) {
  let g = state.groupBySlug.get(slug);
  if (!g) {
    // A group from a religion other than the one currently selected — look
    // through whatever other religions' groups have already been loaded
    // (e.g. from following a cross-religion related-entry link).
    for (const groups of state.groupsByReligion.values()) {
      g = groups.find((x) => x.slug === slug);
      if (g) break;
    }
  }
  if (!g) return 'var(--text-secondary)';
  return isDarkTheme() ? g.color_dark : g.color_light;
}

function groupName(slug) {
  let g = state.groupBySlug.get(slug);
  if (!g) {
    for (const groups of state.groupsByReligion.values()) {
      g = groups.find((x) => x.slug === slug);
      if (g) break;
    }
  }
  return g?.name || slug;
}

function fileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

let toastTimer = null;
function toast(message, kind = 'ok') {
  const el = $('#toast');
  el.textContent = message;
  el.className = kind === 'error' ? 'toast is-error' : 'toast';
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, kind === 'error' ? 6000 : 3200);
}

function confirmDialog(title, text, confirmLabel = 'Delete') {
  return new Promise((resolve) => {
    const modal = $('#modal');
    $('#modal-title').textContent = title;
    $('#modal-text').textContent = text;
    $('#modal-confirm').textContent = confirmLabel;
    modal.hidden = false;

    const done = (answer) => {
      modal.hidden = true;
      $('#modal-confirm').removeEventListener('click', onYes);
      $('#modal-cancel').removeEventListener('click', onNo);
      resolve(answer);
    };
    const onYes = () => done(true);
    const onNo = () => done(false);
    $('#modal-confirm').addEventListener('click', onYes);
    $('#modal-cancel').addEventListener('click', onNo);
  });
}

/* ------------------------------------------------------------------ */
/* Authentication                                                      */
/* ------------------------------------------------------------------ */

async function init() {
  let status;
  try {
    status = await api('/api/auth/status');
  } catch (err) {
    document.body.innerHTML =
      `<div style="padding:48px;font-family:system-ui"><h1>Could not start</h1><p>${esc(err.message)}</p></div>`;
    return;
  }

  if (status.authenticated) {
    $('#authscreen').hidden = true;
    $('#app-root').hidden = false;
    startApp();
    return;
  }

  $('#app-root').hidden = true;
  $('#authscreen').hidden = false;
  $('#auth-setup').hidden = status.passwordSet;
  $('#auth-login').hidden = !status.passwordSet;
  wireAuthForms();
  if (status.passwordSet) $('#login-password').focus();
  else $('#setup-password').focus();
}

function wireAuthForms() {
  $('#setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = $('#setup-password').value;
    const confirm = $('#setup-password-confirm').value;
    const errEl = $('#setup-error');
    errEl.hidden = true;

    if (pw.length < 8) {
      errEl.textContent = 'Use a password of at least 8 characters.';
      errEl.hidden = false;
      return;
    }
    if (pw !== confirm) {
      errEl.textContent = 'Those two passwords do not match.';
      errEl.hidden = false;
      return;
    }
    try {
      await post('/api/auth/setup', { password: pw });
      $('#authscreen').hidden = true;
      $('#app-root').hidden = false;
      startApp();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    }
  });

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('#login-error');
    errEl.hidden = true;
    try {
      await post('/api/auth/login', { password: $('#login-password').value });
      $('#authscreen').hidden = true;
      $('#app-root').hidden = false;
      startApp();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
      $('#login-password').value = '';
      $('#login-password').focus();
    }
  });
}

async function logOut() {
  await post('/api/auth/logout').catch(() => {});
  window.location.reload();
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

async function startApp() {
  state.boot = await api(`/api/bootstrap?religion=${encodeURIComponent(state.religion)}`);
  applyBoot(state.boot);

  applyTheme(state.boot.settings.theme || 'system');
  $$('#theme-row input').forEach((r) => { r.checked = r.value === (state.boot.settings.theme || 'system'); });
  $('#set-semantic').checked = state.boot.settings.semantic !== 'off';
  $('#set-exact').value = state.boot.settings.exactPriority || 'high';

  renderReligionList();
  renderFilters();
  renderGroupSelect();
  renderPageHeaders();
  renderSearchIdle();
  refreshTunnelStatus();
  wireEvents();

  if (state.boot.managed) {
    $('#btn-quit').hidden = true;
    $('#managed-note').hidden = false;
  }
}

/** Applies a freshly-fetched bootstrap payload to shared state. */
function applyBoot(data) {
  state.groups = data.groups;
  state.groupBySlug = new Map(state.groups.map((g) => [g.slug, g]));
  state.groupsByReligion.set(data.religion.slug, data.groups);
}

/**
 * Groups for a religion other than the one currently selected in the
 * sidebar — needed because the Add/Edit Entry form can show a different
 * religion (when editing an entry reached via a cross-religion link), and
 * because "related entries" search deliberately spans every religion.
 */
async function groupsForReligion(slug) {
  if (state.groupsByReligion.has(slug)) return state.groupsByReligion.get(slug);
  const data = await api(`/api/bootstrap?religion=${encodeURIComponent(slug)}`);
  state.groupsByReligion.set(slug, data.groups);
  return data.groups;
}

async function refreshCounts() {
  const data = await api(`/api/bootstrap?religion=${encodeURIComponent(state.religion)}`);
  state.boot = data;
  applyBoot(data);
  renderReligionList();
  renderFilters();
  renderStats();
  renderDatalists();
}

/**
 * Switches the active religion: refetches its taxonomy and counts, clears
 * anything scoped to the previous religion (filters, search results, the
 * open entry), and refreshes whichever view is currently on screen.
 */
async function switchReligion(slug) {
  if (slug === state.religion) return;
  state.religion = slug;
  state.filters.clear();
  state.lastQuery = '';
  state.lastResults = null;

  state.boot = await api(`/api/bootstrap?religion=${encodeURIComponent(state.religion)}`);
  applyBoot(state.boot);

  renderReligionList();
  renderFilters();
  renderGroupSelect();
  renderPageHeaders();
  renderDatalists();

  if (state.view === 'search') { $('#search-input').value = ''; renderSearchIdle(); }
  if (state.view === 'library') loadLibrary();
  if (state.view === 'settings') renderStats();
  if (state.view === 'faq') { state.faqReligion = state.religion; initFaqView(); }
}

function renderReligionList() {
  const religions = state.boot?.religions || [];
  $('#religion-list').innerHTML = religions.map((r) => `
    <button class="religion${r.slug === state.religion ? ' is-active' : ''}" data-religion="${esc(r.slug)}" type="button"
      style="--religion-color:${esc(isDarkTheme() ? r.accent_dark : r.accent_light)}">
      <span class="religion__dot" aria-hidden="true"></span>
      <span class="religion__name">${esc(r.name)}</span>
      <span class="religion__count">${r.slug === state.religion ? (state.boot.stats?.total ?? '') : ''}</span>
    </button>`).join('');

  $$('.religion', $('#religion-list')).forEach((b) =>
    b.addEventListener('click', () => switchReligion(b.dataset.religion))
  );
}

/** Updates the page titles/subtitles that name the current religion and its groups. */
function renderPageHeaders() {
  const religionName = state.boot?.religion?.name || 'Religious Studies';
  const groupNames = state.groups.map((g) => g.name);
  const primary = groupNames.slice(0, -1).join(', ');
  const notesLabel = groupNames[groupNames.length - 1] || 'personal notes';

  $('#search-title').textContent = `${religionName} Studies`;
  $('#search-subtitle').textContent = groupNames.length
    ? `Search your ${primary ? primary + ' and ' : ''}${notesLabel}.`.replace(/^Search your and /, 'Search your ')
    : `Search your ${religionName} research.`;
  $('#library-subtitle').textContent = `Everything stored in the ${religionName} category.`;

  const placeholder = $('#search-input');
  if (placeholder) placeholder.placeholder = `Search ${groupNames.join(', ') || religionName}…`;
}

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

function showView(name, opts = {}) {
  state.view = name;
  $$('.view').forEach((v) => v.classList.toggle('is-visible', v.id === `view-${name}`));
  $$('.navitem').forEach((b) => b.classList.toggle('is-active', b.dataset.view === name));
  window.scrollTo({ top: 0, behavior: 'auto' });

  if (name === 'library') loadLibrary();
  if (name === 'settings') { renderStats(); renderDataNote(); refreshTunnelStatus(); }
  if (name === 'form' && !opts.keepForm) resetForm();
  if (name === 'search') $('#search-input').focus();
  if (name === 'faq') initFaqView();
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

function renderFilters() {
  const counts = new Map((state.boot?.stats.byGroup || []).map((g) => [g.slug, g.n]));

  const build = (target, onToggle) => {
    const row = $(target);
    if (!row) return;
    row.innerHTML = '';

    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'pill' + (state.filters.size === 0 ? ' is-active' : '');
    all.textContent = 'All';
    all.addEventListener('click', () => { state.filters.clear(); renderFilters(); onToggle(); });
    row.appendChild(all);

    for (const g of state.groups) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pill' + (state.filters.has(g.slug) ? ' is-active' : '');
      b.innerHTML =
        `<span class="pill__dot" style="background:${groupColorVar(g.slug)}"></span>` +
        `${esc(g.name)} <span class="pill__count">${counts.get(g.slug) ?? 0}</span>`;
      b.addEventListener('click', () => {
        if (state.filters.has(g.slug)) state.filters.delete(g.slug);
        else state.filters.add(g.slug);
        renderFilters();
        onToggle();
      });
      row.appendChild(b);
    }
  };

  build('#filter-row', () => { if (state.lastQuery) runSearch(state.lastQuery); });
  build('#library-filters', () => loadLibrary());
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

function renderSearchIdle() {
  const total = state.boot?.stats.total ?? 0;
  const box = $('#search-results');
  $('#explore').hidden = true;
  $('#concept-note').hidden = true;

  if (total === 0) {
    box.innerHTML = `
      <div class="empty">
        <h3 class="empty__title">Your library is empty</h3>
        <p class="empty__text">
          This application searches only the material you put into it. Add a passage, a hadith,
          a paper or a note of your own, and it becomes searchable straight away.
        </p>
        <div class="empty__actions">
          <button class="btn btn--primary" data-go="form" type="button">Add your first entry</button>
          <button class="btn btn--secondary" data-go="settings" type="button">Load example entries</button>
        </div>
      </div>`;
    $$('[data-go]', box).forEach((b) => b.addEventListener('click', () => showView(b.dataset.go)));
    return;
  }

  box.innerHTML = `
    <div class="empty">
      <h3 class="empty__title">${total} ${total === 1 ? 'entry' : 'entries'} in your Islam library</h3>
      <p class="empty__text">
        Search by exact words, by a phrase in quotation marks, or by asking in your own words —
        results are grouped by Quran, Hadith, scholarly work and your personal notes.
      </p>
    </div>`;
}

async function runSearch(query) {
  state.lastQuery = query;
  state.exploreMode = null;
  $('#explore-results').innerHTML = '';
  $$('.explore-btn').forEach((b) => b.classList.remove('is-selected'));

  if (!query.trim()) { renderSearchIdle(); return; }

  const params = new URLSearchParams({ q: query, religion: state.religion });
  if (state.filters.size) params.set('groups', [...state.filters].join(','));
  params.set('semantic', $('#set-semantic').checked ? 'on' : 'off');
  params.set('exact', $('#set-exact').value);

  const box = $('#search-results');
  box.innerHTML = '<div class="empty"><p class="empty__text">Searching your library…</p></div>';

  try {
    const data = await api(`/api/search?${params}`);
    state.lastResults = data;
    renderResults(data);
  } catch (err) {
    box.innerHTML = `<div class="empty"><h3 class="empty__title">Search failed</h3><p class="empty__text">${esc(err.message)}</p></div>`;
  }
}

function renderResults(data) {
  const box = $('#search-results');
  const note = $('#concept-note');

  if (data.concepts && data.concepts.length && $('#set-semantic').checked) {
    note.hidden = false;
    note.innerHTML = `Also searching for related wording under: <strong>${esc(data.concepts.slice(0, 6).join(', '))}</strong>`;
  } else {
    note.hidden = true;
  }

  if (data.empty) {
    box.innerHTML = `
      <div class="empty">
        <h3 class="empty__title">No sufficiently relevant material was found in your current database</h3>
        <p class="empty__text">
          Nothing you have stored matches “${esc(data.query)}” closely enough to show. This
          application never fills the gap with outside information — add the material yourself
          and it will appear here.
        </p>
        <div class="empty__actions">
          <button class="btn btn--primary" data-go="form" type="button">Add an entry</button>
        </div>
      </div>`;
    $$('[data-go]', box).forEach((b) => b.addEventListener('click', () => showView(b.dataset.go)));
    $('#explore').hidden = false;
    return;
  }

  const parts = [`
    <div class="results-head">
      <h2 class="section-title">Search results</h2>
      <span class="results-count">${data.count} ${data.count === 1 ? 'result' : 'results'} found</span>
    </div>`];

  for (const group of data.groups) {
    parts.push(`
      <section class="group" style="--group-color:${groupColorVar(group.slug)}">
        <div class="group__head">
          <span class="group__bar"></span>
          <span class="group__name">${esc(group.name)}</span>
          <span class="group__rule"></span>
          <span class="group__count">${group.results.length}</span>
        </div>
        ${group.results.map(resultCard).join('')}
      </section>`);
  }

  box.innerHTML = parts.join('');
  $$('.card', box).forEach((c) => c.addEventListener('click', () => openEntry(Number(c.dataset.id))));
  $('#explore').hidden = false;
}

function resultCard(r) {
  const metaBits = [r.collection, r.book, r.reference, r.author, r.language].filter(Boolean);
  const noteFlag = r.kind === 'note'
    ? `<div class="card__note-flag">Your personal note on ${esc(r.origin_group_name)} · ${esc(r.title)}</div>`
    : '';

  return `
    <article class="card" data-id="${r.id}" style="--group-color:${groupColorVar(r.group_slug)}" tabindex="0">
      <div class="card__top">
        <span class="badge"><span class="badge__square"></span>${esc(r.group_name)}</span>
        <span class="card__spacer"></span>
        <span class="relevance">Relevance: <strong>${esc(r.relevance)}</strong></span>
      </div>
      ${noteFlag}
      <h3 class="card__title">${esc(r.title)}</h3>
      ${metaBits.length ? `<div class="card__meta">${esc(metaBits.join(' · '))}</div>` : ''}
      <p class="card__excerpt">${esc(r.excerpt)}</p>
      ${r.tags.length ? `<div class="tagrow">${r.tags.slice(0, 6).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="card__foot" style="margin-top:var(--space-md)">
        <span class="card__why">${esc(r.why)}</span>
        <span class="card__action">View entry &rarr;</span>
      </div>
    </article>`;
}

/* ------------------------------------------------------------------ */
/* Explore: related / supporting / contradicting                       */
/* ------------------------------------------------------------------ */

const EXPLORE_COPY = {
  related: {
    title: 'Related material',
    note: 'Entries in your library that share concepts or wording with this search.',
  },
  supporting: {
    title: 'Supporting material',
    note: 'Entries that speak to this search without denying or contrasting language. This is a retrieval result, not a verdict — read them and judge for yourself.',
  },
  contradicting: {
    title: 'Potentially contradicting material',
    note: 'Entries that touch the same subject but carry denying, contrasting or opposing wording, or that belong to a topic commonly held in tension with your search. The application is not claiming any contradiction exists — it is showing you what to weigh.',
  },
};

async function runExplore(mode) {
  if (!state.lastQuery) { toast('Search for something first.'); return; }
  state.exploreMode = mode;
  $$('.explore-btn').forEach((b) => b.classList.toggle('is-selected', b.dataset.mode === mode));

  const shown = [];
  for (const g of state.lastResults?.groups || []) for (const r of g.results) shown.push(r.id);

  const panel = $('#explore-results');
  panel.innerHTML = '<div class="empty"><p class="empty__text">Looking through your library…</p></div>';

  try {
    const data = await post('/api/explore', {
      religion_slug: state.religion,
      query: state.lastQuery,
      mode,
      groups: [...state.filters],
      excludeIds: mode === 'related' ? shown : [],
      semantic: $('#set-semantic').checked ? 'on' : 'off',
    });
    renderExplore(data);
  } catch (err) {
    panel.innerHTML = `<div class="empty"><p class="empty__text">${esc(err.message)}</p></div>`;
  }
}

function renderExplore(data) {
  const copy = EXPLORE_COPY[data.mode];
  const panel = $('#explore-results');

  if (data.empty) {
    panel.innerHTML = `
      <div class="explore-panel">
        <div class="explore-panel__head"><h3 class="explore-panel__title">${esc(copy.title)}</h3></div>
        <p class="explore-panel__disclaimer">${esc(copy.note)}</p>
        <p class="empty__text">Nothing in your current database qualifies. Add more material on this subject.</p>
      </div>`;
    return;
  }

  panel.innerHTML = `
    <div class="explore-panel">
      <div class="explore-panel__head">
        <h3 class="explore-panel__title">${esc(copy.title)}</h3>
        <span class="results-count">${data.results.length}</span>
      </div>
      <p class="explore-panel__disclaimer">${esc(copy.note)}</p>
      ${data.results.map((r) => `
        <button class="mini" data-id="${r.id}" type="button">
          <span class="badge" style="--group-color:${groupColorVar(r.group_slug)}"><span class="badge__square"></span>${esc(r.group_name)}</span>
          <div class="mini__title">${esc(r.title)}</div>
          <div class="mini__meta">${esc([r.collection, r.reference, r.author].filter(Boolean).join(' · '))}${r.why ? ` — ${esc(r.why)}` : ''}</div>
          <div class="mini__excerpt">${esc(r.excerpt)}</div>
        </button>`).join('')}
    </div>`;

  $$('.mini', panel).forEach((b) => b.addEventListener('click', () => openEntry(Number(b.dataset.id))));
}

/* ------------------------------------------------------------------ */
/* Entry viewer                                                        */
/* ------------------------------------------------------------------ */

async function openEntry(id, from) {
  state.returnTo = from || (state.view === 'library' ? 'library' : 'search');
  const { entry } = await api(`/api/entries/${id}`);
  state.entry = entry;
  renderEntry(entry);
  showView('entry');
  loadSimilar(id);
}

function renderEntry(e) {
  const color = groupColorVar(e.group_slug);
  const meta = [
    ['Identifier', e.uid, 'mono'],
    ['Category', e.religion_name],
    ['Source group', e.group_name],
    ['Collection', e.collection_name],
    ['Book / Surah', e.book],
    ['Chapter', e.chapter],
    ['Verse / Number', e.reference],
    ['Author', e.author],
    ['Date', e.date],
    ['Language', e.language],
    ['Type', e.type],
    ['Added', new Date(e.created_at).toLocaleDateString()],
  ].filter(([, v]) => v);

  $('#entry-body').innerHTML = `
    <article class="entry" style="--group-color:${color}">
      <header class="entry__head">
        <div>
          <span class="badge"><span class="badge__square"></span>${esc(e.group_name)}</span>
          <h1 class="entry__title">${esc(e.title)}</h1>
          <div class="entry__crumbs">
            <span>${esc(e.religion_name)}</span>
            ${e.collection_name ? `<span>·</span><span>${esc(e.collection_name)}</span>` : ''}
            ${e.reference ? `<span>·</span><span>${esc(e.reference)}</span>` : ''}
          </div>
        </div>
        <div class="entry__actions">
          <button class="btn btn--outline btn--small" id="entry-edit" type="button">Edit entry</button>
        </div>
      </header>

      ${e.text ? `
        <section class="entry__section">
          <h2 class="entry__section-title">Full text</h2>
          <div class="entry__text">${esc(e.text)}</div>
        </section>` : ''}

      ${e.tags.length ? `
        <section class="entry__section">
          <h2 class="entry__section-title">Tags</h2>
          <div class="tagrow" style="margin-top:0">${e.tags.map((t) => `<button class="tag" data-tag="${esc(t)}" type="button">${esc(t)}</button>`).join('')}</div>
        </section>` : ''}

      ${e.notes ? `
        <section class="entry__section">
          <h2 class="entry__section-title">Personal notes</h2>
          <div class="entry__notes">
            <span class="entry__notes-flag">Your own notes — not part of the source text</span>${esc(e.notes)}
          </div>
        </section>` : ''}

      <section class="entry__section">
        <h2 class="entry__section-title">Metadata</h2>
        <div class="metagrid">
          ${meta.map(([k, v, mono]) => `
            <div>
              <div class="metagrid__key">${esc(k)}</div>
              <div class="metagrid__value ${mono ? 'metagrid__value--mono' : ''}">${esc(v)}</div>
            </div>`).join('')}
        </div>
      </section>

      ${e.attachments.length ? `
        <section class="entry__section">
          <h2 class="entry__section-title">Original files</h2>
          ${e.attachments.map((a) => `
            <div class="filerow">
              <span class="filerow__name">${esc(a.filename)}</span>
              <span class="filerow__size">${fileSize(a.size)}</span>
              <button class="btn btn--secondary btn--small" data-open="${a.id}" type="button">Open original file</button>
            </div>`).join('')}
        </section>` : ''}

      ${e.related.length ? `
        <section class="entry__section">
          <h2 class="entry__section-title">Linked entries</h2>
          ${e.related.map((r) => `
            <button class="mini" data-id="${r.id}" type="button" style="--group-color:${groupColorVar(r.group_slug)}">
              <span class="badge"><span class="badge__square"></span>${esc(r.group_name)}</span>
              <div class="mini__title">${esc(r.title)}</div>
            </button>`).join('')}
        </section>` : ''}

      <section class="entry__section" id="similar-section" hidden>
        <h2 class="entry__section-title">Related material in your library</h2>
        <div id="similar-list"></div>
      </section>
    </article>`;

  $('#entry-edit').addEventListener('click', () => startEdit(e));
  $$('[data-open]', $('#entry-body')).forEach((b) =>
    b.addEventListener('click', async () => {
      try { await post(`/api/attachments/${b.dataset.open}/open`); toast('Opening the file…'); }
      catch (err) { toast(err.message, 'error'); }
    })
  );
  $$('[data-tag]', $('#entry-body')).forEach((b) =>
    b.addEventListener('click', () => {
      showView('search');
      $('#search-input').value = b.dataset.tag;
      runSearch(b.dataset.tag);
    })
  );
  $$('.mini[data-id]', $('#entry-body')).forEach((b) =>
    b.addEventListener('click', () => openEntry(Number(b.dataset.id)))
  );
}

async function loadSimilar(id) {
  try {
    const { results } = await api(`/api/entries/${id}/similar`);
    if (!results.length) return;
    const section = $('#similar-section');
    if (!section) return;
    section.hidden = false;
    $('#similar-list').innerHTML = results.map((r) => `
      <button class="mini" data-id="${r.id}" type="button" style="--group-color:${groupColorVar(r.group_slug)}">
        <span class="badge"><span class="badge__square"></span>${esc(r.group_name)}</span>
        <div class="mini__title">${esc(r.title)}</div>
        <div class="mini__meta">${esc(r.why)}</div>
        <div class="mini__excerpt">${esc(r.excerpt)}</div>
      </button>`).join('');
    $$('.mini', $('#similar-list')).forEach((b) =>
      b.addEventListener('click', () => openEntry(Number(b.dataset.id)))
    );
  } catch { /* similarity is a nicety; never block the page on it */ }
}

/* ------------------------------------------------------------------ */
/* Entry form                                                          */
/* ------------------------------------------------------------------ */

function renderGroupSelect(religionSlug) {
  const groups = state.groupsByReligion.get(religionSlug) || [];
  $('#f-group').innerHTML =
    '<option value="">Choose a source…</option>' +
    groups.map((g) => `<option value="${g.slug}">${esc(g.name)}</option>`).join('');
}

function renderFormReligionSelect() {
  $('#f-religion').innerHTML = (state.boot?.religions || [])
    .map((r) => `<option value="${esc(r.slug)}">${esc(r.name)}</option>`).join('');
}

/** Switches which religion the open Add/Edit Entry form targets. */
async function setFormReligion(slug) {
  const groups = await groupsForReligion(slug);
  state.groupsByReligion.set(slug, groups);
  $('#f-religion').value = slug;
  renderGroupSelect(slug);
}

function renderDatalists() {
  $('#tag-list').innerHTML = (state.boot?.tags || []).map((t) => `<option>${esc(t.name)}</option>`).join('');
  $('#collection-list').innerHTML = (state.boot?.collections || []).map((c) => `<option>${esc(c.name)}</option>`).join('');
}

async function resetForm() {
  state.editingId = null;
  state.formTags = [];
  state.formRelated = [];
  state.pendingFiles = [];
  state.savedFiles = [];
  $('#entry-form').reset();
  $('#f-id').value = '';
  $('#form-title').textContent = 'Add New Entry';
  $('#form-sub').textContent = 'Everything except the source and the text is optional.';
  $('#form-submit').textContent = 'Submit new entry';
  $('#form-delete').hidden = true;
  $('#file-status').hidden = true;
  $('#attachment-list').innerHTML = '';
  renderFormReligionSelect();
  await setFormReligion(state.religion);
  renderFormTags();
  renderFormRelated();
  renderAttachments();
  renderDatalists();
}

async function startEdit(e) {
  await resetForm();
  showView('form', { keepForm: true });
  state.editingId = e.id;
  $('#f-id').value = e.id;
  // The entry may belong to a different religion than the one currently
  // selected in the sidebar (it can be reached via a cross-religion link),
  // so the form must show — and preserve — that entry's own religion.
  await setFormReligion(e.religion_slug);
  $('#f-group').value = e.group_slug;
  $('#f-title').value = e.title;
  $('#f-collection').value = e.collection_name || '';
  $('#f-book').value = e.book || '';
  $('#f-chapter').value = e.chapter || '';
  $('#f-reference').value = e.reference || '';
  $('#f-author').value = e.author || '';
  $('#f-date').value = e.date || '';
  $('#f-language').value = e.language || '';
  $('#f-type').value = e.type || '';
  $('#f-uid').value = e.uid;
  $('#f-text').value = e.text || '';
  $('#f-notes').value = e.notes || '';
  state.formTags = [...e.tags];
  state.formRelated = e.related.map((r) => ({ id: r.id, title: r.title }));

  $('#form-title').textContent = 'Edit entry';
  $('#form-sub').textContent = e.title;
  $('#form-submit').textContent = 'Save changes';
  $('#form-delete').hidden = false;
  state.savedFiles = [...e.attachments];
  renderFormTags();
  renderFormRelated();
  renderAttachments();
}

/** Renders saved attachments and not-yet-saved ones as a single list. */
function renderAttachments() {
  const saved = state.savedFiles.map((a) => `
    <div class="attachment">
      <span class="attachment__name">${esc(a.filename)}</span>
      <span class="filerow__size">${fileSize(a.size)}</span>
      <button class="btn btn--danger-quiet btn--small" data-del-att="${a.id}" type="button">Remove</button>
    </div>`).join('');

  const pending = state.pendingFiles.map((f, i) => `
    <div class="attachment">
      <span class="attachment__name">${esc(f.filename)}</span>
      <span class="filerow__size">will be attached when you save</span>
      <button class="btn btn--danger-quiet btn--small" data-del-pending="${i}" type="button">Remove</button>
    </div>`).join('');

  const list = $('#attachment-list');
  list.innerHTML = saved + pending;

  $$('[data-del-att]', list).forEach((b) =>
    b.addEventListener('click', async () => {
      const ok = await confirmDialog(
        'Remove this file?',
        'The copy stored in your library will be deleted. Your original file is not touched.',
        'Remove'
      );
      if (!ok) return;
      await del(`/api/attachments/${b.dataset.delAtt}`);
      state.savedFiles = state.savedFiles.filter((a) => String(a.id) !== b.dataset.delAtt);
      renderAttachments();
      toast('File removed.');
    })
  );

  $$('[data-del-pending]', list).forEach((b) =>
    b.addEventListener('click', () => {
      state.pendingFiles.splice(Number(b.dataset.delPending), 1);
      renderAttachments();
    })
  );
}

function renderFormTags() {
  $('#tag-row').innerHTML = state.formTags.map((t, i) => `
    <span class="tag tag--removable">${esc(t)}<button class="tag__x" data-i="${i}" type="button" aria-label="Remove tag">&times;</button></span>
  `).join('');
  $$('#tag-row .tag__x').forEach((b) =>
    b.addEventListener('click', () => {
      state.formTags.splice(Number(b.dataset.i), 1);
      renderFormTags();
    })
  );
}

function addTagFromInput() {
  const input = $('#f-tag');
  const raw = input.value.trim();
  if (!raw) return;
  for (const t of raw.split(',').map((x) => x.trim()).filter(Boolean)) {
    if (!state.formTags.some((x) => x.toLowerCase() === t.toLowerCase())) state.formTags.push(t);
  }
  input.value = '';
  renderFormTags();
}

function renderFormRelated() {
  $('#related-chosen').innerHTML = state.formRelated.map((r, i) => `
    <span class="tag tag--removable">${esc(r.title)}<button class="tag__x" data-i="${i}" type="button" aria-label="Unlink">&times;</button></span>
  `).join('');
  $$('#related-chosen .tag__x').forEach((b) =>
    b.addEventListener('click', () => {
      state.formRelated.splice(Number(b.dataset.i), 1);
      renderFormRelated();
    })
  );
}

async function searchRelated(term) {
  const box = $('#related-suggestions');
  if (!term.trim()) { box.innerHTML = ''; return; }
  const { entries } = await api(`/api/entries?q=${encodeURIComponent(term)}&limit=6`);
  box.innerHTML = entries
    .filter((e) => e.id !== state.editingId && !state.formRelated.some((r) => r.id === e.id))
    .map((e) => `<button class="relatedsuggest__item" data-id="${e.id}" data-title="${esc(e.title)}" type="button">${esc(e.title)} <span style="color:var(--text-secondary)">— ${esc(e.group_name)}</span></button>`)
    .join('');

  $$('.relatedsuggest__item', box).forEach((b) =>
    b.addEventListener('click', () => {
      state.formRelated.push({ id: Number(b.dataset.id), title: b.dataset.title });
      $('#related-search').value = '';
      box.innerHTML = '';
      renderFormRelated();
    })
  );
}

/* ---- file handling ---- */

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('The file could not be read.'));
    reader.readAsDataURL(file);
  });
}

async function handleFile(file) {
  if (!file) return;
  const status = $('#file-status');
  status.hidden = false;
  status.className = 'filestatus';
  status.textContent = `Reading ${file.name}…`;

  try {
    const data = await readFileAsBase64(file);
    const result = await post('/api/extract', { filename: file.name, data });

    state.pendingFiles.push({ filename: file.name, mime: file.type, data });

    const textBox = $('#f-text');
    if (result.text) {
      textBox.value = textBox.value.trim()
        ? `${textBox.value.trim()}\n\n${result.text}`
        : result.text;
    }

    if (result.ok) {
      status.className = 'filestatus is-good';
      status.textContent = result.warning
        ? `${file.name} — ${result.warning}`
        : `${file.name} — text extracted. Read it over before saving.`;
    } else {
      status.className = 'filestatus is-warn';
      status.textContent = `${file.name} — ${result.warning || 'no text could be read.'}`;
    }

    renderAttachments();
  } catch (err) {
    status.className = 'filestatus is-warn';
    status.textContent = err.message;
  }
}

async function submitForm(event) {
  event.preventDefault();
  const submit = $('#form-submit');
  submit.disabled = true;

  const payload = {
    religion_slug: $('#f-religion').value,
    group_slug: $('#f-group').value,
    title: $('#f-title').value,
    collection_name: $('#f-collection').value,
    book: $('#f-book').value,
    chapter: $('#f-chapter').value,
    reference: $('#f-reference').value,
    author: $('#f-author').value,
    date: $('#f-date').value,
    language: $('#f-language').value,
    type: $('#f-type').value,
    uid: $('#f-uid').value,
    text: $('#f-text').value,
    notes: $('#f-notes').value,
    source: (state.groupsByReligion.get($('#f-religion').value) || []).find((g) => g.slug === $('#f-group').value)?.name || '',
    tags: state.formTags,
    related_ids: state.formRelated.map((r) => r.id),
  };

  try {
    const saved = state.editingId
      ? await put(`/api/entries/${state.editingId}`, payload)
      : await post('/api/entries', payload);

    const entryId = saved.entry.id;

    for (const f of state.pendingFiles) {
      await post(`/api/entries/${entryId}/attachments`, {
        filename: f.filename, mime: f.mime, data: f.data,
      });
    }
    state.pendingFiles = [];

    await refreshCounts();
    toast(state.editingId ? 'Entry saved.' : 'Entry added to your library.');
    await openEntry(entryId, 'search');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    submit.disabled = false;
  }
}

/* ------------------------------------------------------------------ */
/* Library                                                             */
/* ------------------------------------------------------------------ */

async function loadLibrary() {
  const params = new URLSearchParams({ religion: state.religion });
  const term = $('#library-filter').value.trim();
  if (term) params.set('q', term);
  if (state.filters.size) params.set('groups', [...state.filters].join(','));

  const { entries } = await api(`/api/entries?${params}`);
  const box = $('#library-list');

  if (!entries.length) {
    box.innerHTML = `
      <div class="empty">
        <h3 class="empty__title">Nothing here yet</h3>
        <p class="empty__text">No entries match. Add material, or clear the filters.</p>
      </div>`;
    return;
  }

  const byGroup = new Map();
  for (const e of entries) {
    if (!byGroup.has(e.group_slug)) byGroup.set(e.group_slug, []);
    byGroup.get(e.group_slug).push(e);
  }

  const order = ['quran', 'hadith', 'scholarly', 'notes'];
  box.innerHTML = [...byGroup.entries()]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([slug, list]) => `
      <section class="group" style="--group-color:${groupColorVar(slug)}">
        <div class="group__head">
          <span class="group__bar"></span>
          <span class="group__name">${esc(groupName(slug))}</span>
          <span class="group__rule"></span>
          <span class="group__count">${list.length}</span>
        </div>
        ${list.map((e) => `
          <button class="libraryrow" data-id="${e.id}" type="button">
            <div class="libraryrow__main">
              <div class="libraryrow__title">${esc(e.title)}</div>
              <div class="libraryrow__meta">${esc([e.collection_name, e.reference, e.author, e.tags.slice(0, 3).join(', ')].filter(Boolean).join(' · '))}</div>
            </div>
            <span class="libraryrow__badge">${esc(e.uid)}</span>
          </button>`).join('')}
      </section>`).join('');

  $$('.libraryrow', box).forEach((b) =>
    b.addEventListener('click', () => openEntry(Number(b.dataset.id), 'library'))
  );
}

/* ------------------------------------------------------------------ */
/* Frequently Asked Questions                                          */
/* ------------------------------------------------------------------ */

function initFaqView() {
  if (!state.faqReligion) state.faqReligion = state.religion;
  renderFaqReligionTabs();
  loadFaqs();
}

function renderFaqReligionTabs() {
  const religions = state.boot?.religions || [state.boot.religion];
  const row = $('#faq-religion-row');
  row.innerHTML = religions.map((r) => `
    <button class="pill${r.slug === state.faqReligion ? ' is-active' : ''}" data-religion="${esc(r.slug)}" type="button">
      <span class="pill__dot" style="background:${esc(isDarkTheme() ? r.accent_dark : r.accent_light)}"></span>${esc(r.name)}
    </button>`).join('');

  $$('.pill', row).forEach((b) =>
    b.addEventListener('click', () => {
      state.faqReligion = b.dataset.religion;
      renderFaqReligionTabs();
      loadFaqs();
    })
  );
}

async function loadFaqs() {
  const box = $('#faq-list');
  box.innerHTML = '<div class="empty"><p class="empty__text">Loading…</p></div>';
  const { faqs } = await api(`/api/faqs?religion=${encodeURIComponent(state.faqReligion)}`);
  renderFaqList(faqs);
}

function renderFaqList(faqs) {
  const box = $('#faq-list');
  if (!faqs.length) {
    box.innerHTML = `
      <div class="empty">
        <h3 class="empty__title">No questions here yet</h3>
        <p class="empty__text">
          Add a question and write the answer yourself, drawing on your own research — this
          application never writes one for you. Link the entries that support it so the
          reasoning stays traceable back to your sources.
        </p>
      </div>`;
    return;
  }

  box.innerHTML = faqs.map((f) => `
    <article class="faq-card" data-id="${f.id}">
      <div class="faq-card__top">
        <h3 class="faq-card__question">${esc(f.question)}</h3>
        <div class="faq-card__actions">
          <button class="btn btn--secondary btn--small" data-edit="${f.id}" type="button">Edit</button>
          <button class="btn btn--danger-quiet btn--small" data-del="${f.id}" type="button">Delete</button>
        </div>
      </div>
      ${f.answer
        ? `<p class="faq-card__answer">${esc(f.answer)}</p>`
        : `<p class="faq-card__answer faq-card__answer--empty">No answer written yet.</p>`}
      ${f.entries.length ? `
        <div class="faq-card__entries">
          ${f.entries.map((e) => `
            <button class="faq-entry-chip" data-open="${e.id}" type="button" style="--chip-color:${groupColorVar(e.group_slug)}">
              <span class="faq-entry-chip__dot"></span>${esc(e.title)}
            </button>`).join('')}
        </div>` : ''}
    </article>`).join('');

  $$('[data-edit]', box).forEach((b) =>
    b.addEventListener('click', () => openFaqModal(Number(b.dataset.edit)))
  );
  $$('[data-del]', box).forEach((b) =>
    b.addEventListener('click', async () => {
      const ok = await confirmDialog('Delete this question?', 'This removes the question and your answer. The linked entries themselves are not affected.', 'Delete');
      if (!ok) return;
      await del(`/api/faqs/${b.dataset.del}`);
      loadFaqs();
    })
  );
  $$('[data-open]', box).forEach((b) =>
    b.addEventListener('click', () => openEntry(Number(b.dataset.open), 'faq'))
  );
}

async function openFaqModal(id) {
  state.faqEditingId = id || null;
  state.faqEntries = [];
  $('#faq-id').value = '';
  $('#faq-question').value = '';
  $('#faq-answer').value = '';
  $('#faq-entry-search').value = '';
  $('#faq-entry-suggestions').innerHTML = '';
  $('#faq-modal-title').textContent = id ? 'Edit question' : 'Add a question';
  $('#faq-modal-save').textContent = id ? 'Save changes' : 'Save question';

  if (id) {
    const faqs = await api(`/api/faqs?religion=${encodeURIComponent(state.faqReligion)}`);
    const faq = faqs.faqs.find((f) => f.id === id);
    if (faq) {
      $('#faq-id').value = faq.id;
      $('#faq-question').value = faq.question;
      $('#faq-answer').value = faq.answer;
      state.faqEntries = faq.entries.map((e) => ({ id: e.id, title: e.title }));
    }
  }
  renderFaqEntryChosen();
  $('#faq-modal').hidden = false;
  $('#faq-question').focus();
}

function closeFaqModal() {
  $('#faq-modal').hidden = true;
}

function renderFaqEntryChosen() {
  $('#faq-entry-chosen').innerHTML = state.faqEntries.map((e, i) => `
    <span class="tag tag--removable">${esc(e.title)}<button class="tag__x" data-i="${i}" type="button" aria-label="Unlink">&times;</button></span>
  `).join('');
  $$('#faq-entry-chosen .tag__x').forEach((b) =>
    b.addEventListener('click', () => {
      state.faqEntries.splice(Number(b.dataset.i), 1);
      renderFaqEntryChosen();
    })
  );
}

async function searchFaqEntries(term) {
  const box = $('#faq-entry-suggestions');
  if (!term.trim()) { box.innerHTML = ''; return; }
  const { entries } = await api(`/api/entries?q=${encodeURIComponent(term)}&limit=6`);
  box.innerHTML = entries
    .filter((e) => !state.faqEntries.some((x) => x.id === e.id))
    .map((e) => `<button class="relatedsuggest__item" data-id="${e.id}" data-title="${esc(e.title)}" type="button">${esc(e.title)} <span style="color:var(--text-secondary)">— ${esc(e.group_name)}</span></button>`)
    .join('');

  $$('.relatedsuggest__item', box).forEach((b) =>
    b.addEventListener('click', () => {
      state.faqEntries.push({ id: Number(b.dataset.id), title: b.dataset.title });
      $('#faq-entry-search').value = '';
      box.innerHTML = '';
      renderFaqEntryChosen();
    })
  );
}

async function submitFaqForm(event) {
  event.preventDefault();
  const question = $('#faq-question').value.trim();
  if (!question) { toast('A question is required.', 'error'); return; }

  const payload = {
    religion_slug: state.faqReligion,
    question,
    answer: $('#faq-answer').value,
    entry_ids: state.faqEntries.map((e) => e.id),
  };

  try {
    if (state.faqEditingId) await put(`/api/faqs/${state.faqEditingId}`, payload);
    else await post('/api/faqs', payload);
    closeFaqModal();
    loadFaqs();
    toast('Question saved.');
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

function renderStats() {
  const s = state.boot?.stats;
  if (!s) return;
  const cards = [
    { value: s.total, label: 'Total entries', color: 'var(--accent-primary)' },
    ...s.byGroup.map((g) => ({ value: g.n, label: g.name, color: groupColorVar(g.slug) })),
    { value: s.tags, label: 'Tags', color: 'var(--text-secondary)' },
    { value: s.attachments, label: 'Attached files', color: 'var(--text-secondary)' },
    { value: s.withNotes, label: 'With personal notes', color: 'var(--source-notes)' },
  ];
  $('#stat-grid').innerHTML = cards.map((c) => `
    <div class="stat" style="--group-color:${c.color}">
      <div class="stat__value">${c.value}</div>
      <div class="stat__label">${esc(c.label)}</div>
      <div class="stat__bar"></div>
    </div>`).join('');
}

function renderDataNote() {
  $('#data-note').textContent =
    'Everything lives in one folder on this computer: the library file, your uploaded originals and your backups. Nothing is sent anywhere.';
}

async function refreshTunnelStatus() {
  const note = $('#tunnel-note');
  const actions = $('#tunnel-actions');
  try {
    const status = await api('/api/tunnel/status');
    if (!status.configured) {
      actions.hidden = true;
      note.textContent =
        'Remote access is not set up yet. Run "Set Up Remote Access.ps1" once to get a web address you can use from another computer.';
      return;
    }
    if (status.connected && status.url) {
      actions.hidden = false;
      $('#tunnel-url').value = status.url;
      note.textContent = 'Your library is reachable from other computers at the address below, with your password required.';
    } else {
      actions.hidden = true;
      note.textContent = 'Remote access is set up but not currently connected. It should reconnect on its own shortly.';
    }
  } catch {
    actions.hidden = true;
    note.textContent = 'Could not check remote-access status.';
  }
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

function wireEvents() {
  /* navigation */
  $$('.navitem').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));
  $('#entry-back').addEventListener('click', () => showView(state.returnTo));
  $('#form-back').addEventListener('click', () => showView(state.returnTo === 'library' ? 'library' : 'search'));

  /* faq */
  $('#faq-add-btn').addEventListener('click', () => openFaqModal(null));
  $('#faq-modal-cancel').addEventListener('click', closeFaqModal);
  $('#faq-form').addEventListener('submit', submitFaqForm);
  let faqSearchTimer = null;
  $('#faq-entry-search').addEventListener('input', (e) => {
    clearTimeout(faqSearchTimer);
    faqSearchTimer = setTimeout(() => searchFaqEntries(e.target.value), 180);
  });

  /* search */
  $('#search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    runSearch($('#search-input').value);
  });
  $('#search-input').addEventListener('input', (e) => {
    $('#search-clear').hidden = !e.target.value;
  });
  $('#search-clear').addEventListener('click', () => {
    $('#search-input').value = '';
    $('#search-clear').hidden = true;
    state.lastQuery = '';
    renderSearchIdle();
    $('#search-input').focus();
  });
  $$('.explore-btn').forEach((b) => b.addEventListener('click', () => runExplore(b.dataset.mode)));

  /* form */
  $('#entry-form').addEventListener('submit', submitForm);
  $('#f-religion').addEventListener('change', (e) => setFormReligion(e.target.value));
  $('#form-cancel').addEventListener('click', () => showView(state.returnTo === 'library' ? 'library' : 'search'));
  $('#tag-add').addEventListener('click', addTagFromInput);
  $('#f-tag').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTagFromInput(); }
  });
  $('#related-search').addEventListener('input', (e) => searchRelated(e.target.value));

  $('#form-delete').addEventListener('click', async () => {
    const ok = await confirmDialog(
      'Delete this entry?',
      'The entry, its notes and the copies of any files attached to it will be removed from your library. This cannot be undone.',
      'Delete entry'
    );
    if (!ok) return;
    await del(`/api/entries/${state.editingId}`);
    await refreshCounts();
    toast('Entry deleted.');
    showView('library');
  });

  /* uploads */
  const dz = $('#dropzone');
  dz.addEventListener('click', () => $('#f-file').click());
  $('#f-file').addEventListener('change', (e) => handleFile(e.target.files[0]));
  ['dragenter', 'dragover'].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('is-over'); })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('is-over'); })
  );
  dz.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));

  /* library */
  let libTimer = null;
  $('#library-filter').addEventListener('input', () => {
    clearTimeout(libTimer);
    libTimer = setTimeout(loadLibrary, 180);
  });

  /* settings */
  $$('#theme-row input').forEach((r) =>
    r.addEventListener('change', async () => {
      applyTheme(r.value);
      await put('/api/settings', { theme: r.value });
    })
  );
  $('#set-semantic').addEventListener('change', async (e) => {
    await put('/api/settings', { semantic: e.target.checked ? 'on' : 'off' });
    if (state.lastQuery) runSearch(state.lastQuery);
  });
  $('#set-exact').addEventListener('change', async (e) => {
    await put('/api/settings', { exactPriority: e.target.value });
    if (state.lastQuery) runSearch(state.lastQuery);
  });

  $('#btn-copy-url').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('#tunnel-url').value);
      toast('Address copied.');
    } catch {
      $('#tunnel-url').select();
      toast('Select and copy the address shown.');
    }
  });

  $('#btn-change-password').addEventListener('click', async () => {
    const current = $('#pw-current').value;
    const next = $('#pw-new').value;
    if (!current || !next) { toast('Enter both your current and new password.', 'error'); return; }
    try {
      await post('/api/auth/change-password', { currentPassword: current, newPassword: next });
      $('#pw-current').value = '';
      $('#pw-new').value = '';
      toast('Password changed. Other devices have been signed out.');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  $('#btn-logout').addEventListener('click', async () => {
    const ok = await confirmDialog('Log out?', 'You will need your password to open your library again.', 'Log out');
    if (!ok) return;
    logOut();
  });

  $('#btn-backup').addEventListener('click', async () => {
    try { const r = await post('/api/maintenance/backup'); toast(`Backup saved (${fileSize(r.size)}).`); }
    catch (err) { toast(err.message, 'error'); }
  });
  $('#btn-export').addEventListener('click', () => { window.location.href = '/api/maintenance/export'; });
  $('#btn-folder').addEventListener('click', () => post('/api/maintenance/open-data-folder'));
  $('#btn-reindex').addEventListener('click', async () => {
    const r = await post('/api/maintenance/reindex');
    toast(`Search index rebuilt for ${r.reindexed} entries.`);
  });
  $('#btn-samples').addEventListener('click', async () => {
    const r = await post('/api/maintenance/samples');
    await refreshCounts();
    toast(r.created ? `${r.created} example entries loaded.` : 'The example entries are already loaded.');
  });
  $('#btn-quit').addEventListener('click', async () => {
    const ok = await confirmDialog('Close the application?', 'The server will stop. You can start it again from the desktop shortcut.', 'Close');
    if (!ok) return;
    await post('/api/shutdown').catch(() => {});
    document.body.innerHTML =
      '<div style="display:grid;place-items:center;height:100vh;font-family:var(--font-serif);font-size:18px;color:var(--text-secondary)">Glossary Apologetica has closed. You can close this window.</div>';
  });

  /* keyboard */
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      showView('search');
      $('#search-input').focus();
    }
    if (e.key === 'Escape' && !$('#modal').hidden) $('#modal-cancel').click();
  });
}

/* ------------------------------------------------------------------ */

init().catch((err) => {
  document.body.innerHTML =
    `<div style="padding:48px;font-family:system-ui"><h1>Could not start</h1><p>${esc(err.message)}</p></div>`;
});
