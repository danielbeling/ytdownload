const { contextBridge, ipcRenderer, shell } = require('electron');

// Exponha APIs seguras para o frontend através do contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  // Você pode adicionar funções aqui no futuro se precisar de comunicação IPC real
  platform: process.platform,
  openFolder: () => ipcRenderer.send('open-downloads-folder'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  notify: (title, body) => ipcRenderer.send('notify', { title, body }),
  onUpdateMessage: (callback) => ipcRenderer.on('update-message', (event, msg) => callback(msg)),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, info) => callback(info)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
  onUpdateProgress: (callback) => ipcRenderer.on('update-download-progress', (event, progress) => callback(progress)),
  restartApp: () => ipcRenderer.send('restart-app'),
  getVersion: () => ipcRenderer.invoke('get-app-version'),
});
