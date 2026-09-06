/**
 * GLOSSARY APOLOGETICA — desktop application shell
 * ------------------------------------------------
 * This is what runs when the installed program is opened. It:
 *
 *   1. points the application at the user's data folder,
 *   2. starts the local server inside this process,
 *   3. opens a real application window onto it.
 *
 * The window is a normal desktop window: it has no address bar, no tabs and no
 * connection to any browser the user has installed. Nothing here reaches the
 * network — the server listens on 127.0.0.1 only.
 */

const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const APP_DIR = path.join(__dirname, '..');
const isDev = !app.isPackaged;

/* The library lives outside the program folder, so updating or reinstalling
   the application can never disturb the user's research. */
const DATA_DIR = path.join(app.getPath('userData'), 'data');
process.env.GA_DATA_DIR = DATA_DIR;

let mainWindow = null;
let serverInfo = null;

/* ------------------------------------------------------------------ */
/* Window size and position are remembered between sessions            */
/* ------------------------------------------------------------------ */

const stateFile = path.join(app.getPath('userData'), 'window-state.json');

function readWindowState() {
  try {
    const s = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (Number.isFinite(s.width) && Number.isFinite(s.height)) return s;
  } catch { /* first run */ }
  return { width: 1500, height: 950 };
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const bounds = mainWindow.getNormalBounds();
  try {
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    fs.writeFileSync(stateFile, JSON.stringify({ ...bounds, maximized: mainWindow.isMaximized() }));
  } catch { /* not worth bothering the user about */ }
}

/* ------------------------------------------------------------------ */
/* Start-up                                                            */
/* ------------------------------------------------------------------ */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(start);
}

const DEFAULT_PORT = 7325;

/**
 * If "Set Up Remote Access.ps1" has been run, a server for this same library
 * is already running in the background at all times (so the library stays
 * reachable even with this window closed). In that case the window should
 * just open onto it rather than starting a second, separate instance.
 */
async function findRunningServer(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/status`, {
      signal: AbortSignal.timeout(800),
    });
    if (res.ok) return { url: `http://127.0.0.1:${port}/`, port, dataDir: DATA_DIR, external: true };
  } catch { /* nothing listening there — this window will start its own */ }
  return null;
}

async function start() {
  Menu.setApplicationMenu(buildMenu());

  try {
    serverInfo = await findRunningServer(DEFAULT_PORT);
    if (!serverInfo) {
      const server = await import(pathToFileUrl(path.join(APP_DIR, 'server.js')));
      serverInfo = await server.startServer({ port: DEFAULT_PORT });
    }
  } catch (err) {
    dialog.showErrorBox(
      'Glossary Apologetica could not start',
      `The application could not open your library.\n\n${err.message}\n\nYour data folder is:\n${DATA_DIR}`
    );
    app.quit();
    return;
  }

  createWindow();
}

function pathToFileUrl(p) {
  return require('node:url').pathToFileURL(p).href;
}

function createWindow() {
  const state = readWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 900,
    minHeight: 620,
    show: false,
    title: 'Glossary Apologetica',
    backgroundColor: '#0F172A',
    autoHideMenuBar: true,
    icon: path.join(APP_DIR, 'build', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  if (state.maximized) mainWindow.maximize();

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('close', saveWindowState);
  mainWindow.on('closed', () => { mainWindow = null; });

  /* Anything that is not our own page opens in the user's normal browser
     rather than inside the application. */
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(serverInfo.url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(serverInfo.url);
  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
}

app.on('window-all-closed', () => app.quit());

/* ------------------------------------------------------------------ */
/* Menu                                                                */
/* ------------------------------------------------------------------ */

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: '&File',
      submenu: [
        {
          label: 'Open data folder',
          click: () => shell.openPath(DATA_DIR),
        },
        {
          label: 'Back up the library now',
          click: async () => {
            try {
              const res = await fetch(`${serverInfo.url}api/maintenance/backup`, { method: 'POST' });
              const out = await res.json();
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Backup complete',
                message: 'A copy of your library has been saved.',
                detail: out.backup,
              });
            } catch (err) {
              dialog.showErrorBox('Backup failed', err.message);
            }
          },
        },
        { type: 'separator' },
        { role: 'quit', label: 'Exit' },
      ],
    },
    {
      label: '&Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: '&View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Actual size' },
        { role: 'zoomIn', label: 'Zoom in' },
        { role: 'zoomOut', label: 'Zoom out' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: '&Help',
      submenu: [
        {
          label: 'About Glossary Apologetica',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About',
              message: `Glossary Apologetica ${app.getVersion()}`,
              detail:
                'A private search and retrieval tool for your own religious research material.\n\n' +
                'It runs entirely on this computer. It does not use the internet, does not ' +
                'generate answers, and returns nothing you did not put into it yourself.\n\n' +
                `Your library: ${DATA_DIR}`,
            });
          },
        },
      ],
    },
  ]);
}
