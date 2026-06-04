const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getOfflineInfo: () => ipcRenderer.invoke('get-offline-info'),
  retryOffline: () => ipcRenderer.invoke('retry-offline'),
  loadCachedPage: (url) => ipcRenderer.invoke('load-cached-page', url),
  getConfig: (key) => ipcRenderer.invoke('get-config', key),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),
  getAllConfig: () => ipcRenderer.invoke('get-all-config')
});

