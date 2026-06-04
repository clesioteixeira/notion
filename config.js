const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class Config {
  constructor() {
    this.configDir = path.join(app.getPath('userData'), 'config');
    this.configFile = path.join(this.configDir, 'preferences.json');
    this.sessionFile = path.join(this.configDir, 'session.json');
    
    // Criar diretório de configuração se não existir
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    
    this.preferences = this.loadPreferences();
    this.session = this.loadSession();
  }

  loadPreferences() {
    try {
      if (fs.existsSync(this.configFile)) {
        const data = fs.readFileSync(this.configFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.error('Erro ao carregar preferências:', err);
    }
    
    return {
      theme: 'system', // 'light', 'dark', 'system'
      minimizeToTray: true,
      closeToTray: true,
      autoUpdate: true,
      notificationsEnabled: true,
      offlineMode: false,
      globalShortcutEnabled: true,
      openWindowShortcut: 'CommandOrControl+Shift+N',
      windowBounds: { width: 1400, height: 900, x: undefined, y: undefined }
    };
  }

  loadSession() {
    try {
      if (fs.existsSync(this.sessionFile)) {
        const data = fs.readFileSync(this.sessionFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.error('Erro ao carregar sessão:', err);
    }
    
    return {
      lastUrl: 'https://www.notion.so',
      windowState: null,
      cookies: []
    };
  }

  savePreferences() {
    try {
      fs.writeFileSync(
        this.configFile,
        JSON.stringify(this.preferences, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.error('Erro ao salvar preferências:', err);
    }
  }

  saveSession() {
    try {
      fs.writeFileSync(
        this.sessionFile,
        JSON.stringify(this.session, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.error('Erro ao salvar sessão:', err);
    }
  }

  get(key, defaultValue = null) {
    return this.preferences[key] ?? defaultValue;
  }

  set(key, value) {
    this.preferences[key] = value;
    this.savePreferences();
  }

  getSession(key, defaultValue = null) {
    return this.session[key] ?? defaultValue;
  }

  setSession(key, value) {
    this.session[key] = value;
    this.saveSession();
  }

  clear() {
    this.preferences = {};
    this.session = {};
    this.savePreferences();
    this.saveSession();
  }
}

module.exports = new Config();
