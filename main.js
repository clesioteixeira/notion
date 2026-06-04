const { app, BrowserWindow, Menu, shell, Tray, Notification, ipcMain, globalShortcut, nativeTheme } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('./config');

const isDev = !app.isPackaged;
let mainWindow;
let preferencesWindow;
let tray;
let offlineCacheIndex = {};
const offlineCacheDir = path.join(app.getPath('userData'), 'offline-cache');
const offlineCacheIndexFile = path.join(offlineCacheDir, 'cacheIndex.json');

function applyTheme() {
  const theme = config.get('theme', 'system');
  nativeTheme.themeSource = theme;
}

function registerGlobalShortcuts() {
  globalShortcut.unregisterAll();
  if (!config.get('globalShortcutEnabled', true)) {
    return;
  }

  const shortcut = config.get('openWindowShortcut', 'CommandOrControl+Shift+N');
  globalShortcut.register(shortcut, () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

function createPreferencesWindow() {
  if (preferencesWindow) {
    preferencesWindow.focus();
    return;
  }

  preferencesWindow = new BrowserWindow({
    width: 520,
    height: 650,
    minWidth: 520,
    minHeight: 560,
    title: 'Preferências',
    resizable: false,
    parent: mainWindow,
    modal: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  preferencesWindow.loadFile(path.join(__dirname, 'preferences.html'));
  preferencesWindow.removeMenu();

  preferencesWindow.on('closed', () => {
    preferencesWindow = null;
  });
}

function initOfflineCache() {
  if (!fs.existsSync(offlineCacheDir)) {
    fs.mkdirSync(offlineCacheDir, { recursive: true });
  }
  try {
    offlineCacheIndex = fs.existsSync(offlineCacheIndexFile)
      ? JSON.parse(fs.readFileSync(offlineCacheIndexFile, 'utf-8'))
      : {};
  } catch (err) {
    console.error('Não foi possível ler cache offline:', err);
    offlineCacheIndex = {};
  }
}

function saveOfflineIndex() {
  try {
    fs.writeFileSync(offlineCacheIndexFile, JSON.stringify(offlineCacheIndex, null, 2), 'utf-8');
  } catch (err) {
    console.error('Não foi possível salvar cache offline:', err);
  }
}

function getCacheFileName(url) {
  const hash = crypto.createHash('sha256').update(url).digest('hex');
  return `cache-${hash}.html`;
}

function getCachedPagePath(url) {
  const fileName = getCacheFileName(url);
  return path.join(offlineCacheDir, fileName);
}

function cacheCurrentPage(url, html) {
  const filePath = getCachedPagePath(url);
  try {
    fs.writeFileSync(filePath, html, 'utf-8');
    offlineCacheIndex[url] = {
      path: filePath,
      updatedAt: new Date().toISOString()
    };
    saveOfflineIndex();
  } catch (err) {
    console.error('Falha ao salvar cache da página:', err);
  }
}

function getCachedPage(url) {
  const info = offlineCacheIndex[url];
  if (!info) return null;
  try {
    return fs.existsSync(info.path) ? fs.readFileSync(info.path, 'utf-8') : null;
  } catch (err) {
    console.error('Erro ao ler cache offline:', err);
    return null;
  }
}

function loadOfflineFallback(win, url, errorDescription) {
  if (!win) return;
  win.offlineUrl = url;
  win.offlineError = errorDescription;
  win.loadFile(path.join(__dirname, 'offline.html'));
}

function createWindow(initialUrl = null) {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const windowBounds = config.get('windowBounds');
  
  const win = new BrowserWindow({
    width: windowBounds?.width || 1400,
    height: windowBounds?.height || 900,
    minWidth: 1024,
    minHeight: 600,
    x: windowBounds?.x,
    y: windowBounds?.y,
    icon: isDev ? undefined : iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      enableRemoteModule: false,
      spellcheck: true,
      partition: 'persist:notion' // Persistir cookies/sessão
    }
  });

  mainWindow = win;

  // Content Security Policy
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' https: data: blob:; " +
          "script-src 'self' https: 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' https: 'unsafe-inline'; " +
          "img-src 'self' https: data: blob:; " +
          "font-src 'self' https: data:; " +
          "connect-src 'self' https: wss: ws:; " +
          "frame-src 'self' https:"
        ]
      }
    });
  });

  // Carregar a URL inicial ou a última URL visitada (persistência de sessão)
  const lastUrl = initialUrl || config.getSession('lastUrl', 'https://www.notion.so');
  win.loadURL(lastUrl);

  // Salvar URL quando navegar
  win.webContents.on('did-navigate', (event, url) => {
    if (url.startsWith('https://') && !url.includes('accounts.google')) {
      config.setSession('lastUrl', url);
    }
  });

  win.webContents.on('did-finish-load', () => {
    if (config.get('offlineMode', false) && win.webContents.getURL().startsWith('https://www.notion.so')) {
      win.webContents
        .executeJavaScript('document.documentElement.outerHTML')
        .then((html) => cacheCurrentPage(win.webContents.getURL(), html))
        .catch((err) => console.error('Erro ao capturar página para cache:', err));
    }
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && validatedURL.startsWith('https://')) {
      const cache = getCachedPage(validatedURL);
      if (config.get('offlineMode', false) && cache) {
        win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(cache)}`);
      } else {
        loadOfflineFallback(win, validatedURL, errorDescription);
      }
    }
  });

  // Open DevTools only in development
  if (isDev) {
    win.webContents.openDevTools();
  }

  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    const allowed = url.startsWith('https://www.notion.so') || url.startsWith('https://notion.so');
    if (allowed) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!(url.startsWith('https://www.notion.so') || url.startsWith('https://notion.so'))) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Salvar posição e tamanho da janela
  win.on('moved', () => {
    const bounds = win.getBounds();
    config.set('windowBounds', bounds);
  });

  win.on('resized', () => {
    const bounds = win.getBounds();
    config.set('windowBounds', bounds);
  });

  // Handle close/minimize to tray
  win.on('close', (event) => {
    if (config.get('closeToTray') && !app.isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  createMenu();
  createTray();

  // Auto-update notifications
  autoUpdater.on('update-downloaded', () => {
    if (config.get('notificationsEnabled')) {
      new Notification({
        title: 'Atualização disponível',
        body: 'A atualização será instalada ao reiniciar',
        icon: iconPath
      }).show();
    }
  });

  return win;
}

function createTray() {
  if (tray) return;
  
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Minimizar para bandeja ao fechar',
      type: 'checkbox',
      checked: config.get('minimizeToTray'),
      click: (menuItem) => {
        config.set('minimizeToTray', menuItem.checked);
        config.set('closeToTray', menuItem.checked);
      }
    },
    {
      label: 'Notificações ativadas',
      type: 'checkbox',
      checked: config.get('notificationsEnabled'),
      click: (menuItem) => {
        config.set('notificationsEnabled', menuItem.checked);
      }
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('Notion');

  // Click na bandeja abre/fecha a janela
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createMenu() {
  const template = [
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Nova Janela',
          accelerator: 'CmdOrCtrl+N',
          click: () => createWindow()
        },
        {
          label: 'Preferências',
          accelerator: 'CmdOrCtrl+,',
          click: () => createPreferencesWindow()
        },
        { type: 'separator' },
        {
          label: 'Tema',
          submenu: [
            {
              label: 'Sistema',
              type: 'radio',
              checked: config.get('theme') === 'system',
              click: () => {
                config.set('theme', 'system');
                applyTheme();
              }
            },
            {
              label: 'Claro',
              type: 'radio',
              checked: config.get('theme') === 'light',
              click: () => {
                config.set('theme', 'light');
                applyTheme();
              }
            },
            {
              label: 'Escuro',
              type: 'radio',
              checked: config.get('theme') === 'dark',
              click: () => {
                config.set('theme', 'dark');
                applyTheme();
              }
            }
          ]
        },
        {
          label: 'Modo Offline',
          type: 'checkbox',
          checked: config.get('offlineMode', false),
          click: (menuItem) => {
            config.set('offlineMode', menuItem.checked);
          }
        },
        {
          label: 'Atualizar cache offline',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.reload();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Sair',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'Exibir',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Sobre Notion',
          click: () => {
            if (mainWindow && config.get('notificationsEnabled')) {
              new Notification({
                title: 'Notion Electron',
                body: 'Versão: 1.0.0\nElectron wrapper para o Notion',
                icon: path.join(__dirname, 'assets', 'icon.png')
              }).show();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Verificar atualizações',
          click: () => {
            autoUpdater.checkForUpdates();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Handle when app should quit
app.on('before-quit', () => {
  app.isQuitting = true;
});

app.whenReady().then(() => {
  initOfflineCache();
  applyTheme();
  createWindow();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers para comunicação com renderer
ipcMain.handle('get-config', (event, key) => {
  return config.get(key);
});

ipcMain.handle('set-config', (event, key, value) => {
  config.set(key, value);
  if (key === 'openWindowShortcut' || key === 'globalShortcutEnabled') {
    registerGlobalShortcuts();
  }
  if (key === 'theme') {
    applyTheme();
  }
  return true;
});

ipcMain.handle('get-all-config', () => {
  return {
    theme: config.get('theme', 'system'),
    minimizeToTray: config.get('minimizeToTray', true),
    closeToTray: config.get('closeToTray', true),
    autoUpdate: config.get('autoUpdate', true),
    notificationsEnabled: config.get('notificationsEnabled', true),
    offlineMode: config.get('offlineMode', false),
    globalShortcutEnabled: config.get('globalShortcutEnabled', true),
    openWindowShortcut: config.get('openWindowShortcut', 'CommandOrControl+Shift+N')
  };
});

ipcMain.handle('retry-offline', () => {
  if (mainWindow && mainWindow.offlineUrl) {
    const url = mainWindow.offlineUrl;
    mainWindow.offlineUrl = null;
    mainWindow.offlineError = null;
    mainWindow.loadURL(url);
  }
});

ipcMain.handle('get-offline-info', () => {
  return {
    url: mainWindow?.offlineUrl || '',
    error: mainWindow?.offlineError || '',
    cached: !!getCachedPage(mainWindow?.offlineUrl || '')
  };
});

ipcMain.handle('load-cached-page', (event, url) => {
  if (!mainWindow || !url) return false;
  const cachedHtml = getCachedPage(url);
  if (!cachedHtml) return false;
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(cachedHtml)}`);
  return true;
});