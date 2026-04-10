import { app, BrowserWindow, ipcMain, shell, dialog, Notification, utilityProcess } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;

// --- Sistema de Logs ---
const logPath = path.join(app.getPath('userData'), 'app.log');
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

function safeLog(msg, level = 'info') {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}\n`;
  console.log(msg);
  logStream.write(line);
}

safeLog(`=== App Iniciado (v${app.getVersion()}) ===`);

// --- Configurações e Persistência ---
const configPath = path.join(app.getPath('userData'), 'settings.json');
let settings = {
  downloadFolder: path.join(app.getPath('downloads'), 'YTDownload')
};

// Carrega configurações ao iniciar
if (fs.existsSync(configPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    settings = { ...settings, ...data };
  } catch (e) {
    console.error('Erro ao ler settings.json', e);
  }
}

// Salva configurações
function saveSettings(newSettings) {
  settings = { ...settings, ...newSettings };
  fs.writeFileSync(configPath, JSON.stringify(settings, null, 2));
}

// --- Processos Filhos (Backend) ---
let serverProcess;

function getBackendPath() {
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'server.js')
    : path.join(__dirname, 'backend', 'server.js');
    
  safeLog(`[Electron] Usando backend em: ${backendPath}`);
  return backendPath;
}

function startBackend() {
  const backendPath = getBackendPath();
  
  if (!fs.existsSync(backendPath)) {
    safeLog(`[Electron Error] Arquivo do backend não encontrado: ${backendPath}`, 'error');
    return;
  }

  serverProcess = utilityProcess.fork(backendPath, [], {
    stdio: 'pipe',
    env: { 
      ...process.env, 
      ELECTRON_RUNNING: 'true',
      USER_DOWNLOADS_DIR: path.dirname(settings.downloadFolder)
    }
  });

  serverProcess.stdout.on('data', (data) => safeLog(`[Backend Log] ${data.toString().trim()}`));
  serverProcess.stderr.on('data', (data) => safeLog(`[Backend Error] ${data.toString().trim()}`, 'error'));
  
  serverProcess.on('exit', (code) => {
    safeLog(`[Backend] Processo finalizado com código: ${code}`);
  });
}

// --- Janelas ---
let mainWindow;
let splashWindow;

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 350,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { nodeIntegration: false }
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Inicia escondido para esperar o Vite/Splash
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    title: "YouTube Converter Pro",
    autoHideMenuBar: true
  });

  mainWindow.setMenuBarVisibility(false);

  const startURL = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, 'frontend/dist/index.html')}`;

  const loadURLWithRetry = () => {
    mainWindow.loadURL(startURL).catch(() => {
      setTimeout(loadURLWithRetry, 1000);
    });
  };

  loadURLWithRetry();

  // Quando o conteúdo estiver pronto, troca do splash para a main
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (splashWindow) splashWindow.close();
      mainWindow.maximize();
      mainWindow.show();
    }, 1500); 
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') && !url.includes('localhost:5173')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  if (isDev) mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => (mainWindow = null));
}

// --- IPC Handlers ---

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.on('open-downloads-folder', () => {
  if (!fs.existsSync(settings.downloadFolder)) {
    fs.mkdirSync(settings.downloadFolder, { recursive: true });
  }
  shell.openPath(settings.downloadFolder);
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const newPath = path.join(result.filePaths[0], 'YTDownload');
    saveSettings({ downloadFolder: newPath });
    
    // Reinicia o backend para aplicar o novo caminho (opcional, ou apenas atualiza env)
    if (serverProcess) serverProcess.kill();
    startBackend();
    
    return newPath;
  }
  return null;
});

ipcMain.handle('get-settings', () => settings);

ipcMain.on('notify', (event, { title, body }) => {
  new Notification({ 
    title, 
    body, 
    icon: path.join(__dirname, 'icon.png') 
  }).show();
});

// --- Auto-Update Config ---
autoUpdater.autoDownload = true;
autoUpdater.allowPrerelease = false;

function setupAutoUpdater(window) {
  autoUpdater.on('checking-for-update', () => {
    window.webContents.send('update-message', 'Verificando atualizações...');
  });
  
  autoUpdater.on('update-available', (info) => {
    window.webContents.send('update-message', 'Atualização disponível! Baixando...');
    window.webContents.send('update-available', info);
  });
  
  autoUpdater.on('update-not-available', () => {
    window.webContents.send('update-message', 'App atualizado.');
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    window.webContents.send('update-download-progress', progressObj);
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    window.webContents.send('update-downloaded', info);
    window.webContents.send('update-message', 'Atualização baixada. Reinicie para aplicar.');
  });
  
  autoUpdater.on('error', (err) => {
    window.webContents.send('update-message', 'Erro na atualização.');
    safeLog(`[Update Error] ${err.stack || err}`, 'error');
  });
}

ipcMain.on('restart-app', () => {
  autoUpdater.quitAndInstall();
});

// --- App Lifecycle ---
app.whenReady().then(() => {
  createSplash();
  startBackend();
  createWindow();
  
  if (mainWindow && !isDev) {
    setupAutoUpdater(mainWindow);
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
