const { app, BrowserWindow, shell } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

let mainWindow;
let localServer;
let localUrl;
const appRoot = __dirname;

function startLocalServer() {
  return new Promise((resolve, reject) => {
    localServer = http.createServer((req, res) => {
      const requestPath = new URL(req.url, 'http://127.0.0.1').pathname;
      if (requestPath !== '/' && requestPath !== '/index.html') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }
      fs.readFile(path.join(appRoot, 'index.html'), (error, data) => {
        if (error) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Friendly Discord no pudo cargar index.html.');
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        });
        res.end(data);
      });
    });
    localServer.once('error', reject);
    localServer.listen(0, '127.0.0.1', () => {
      const address = localServer.address();
      localUrl = `http://127.0.0.1:${address.port}/`;
      resolve(localUrl);
    });
  });
}

async function createWindow() {
  const url = await startLocalServer();
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Friendly Discord',
    backgroundColor: '#17171d',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (/^https?:\/\//i.test(targetUrl)) shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (targetUrl !== localUrl && !targetUrl.startsWith(localUrl)) {
      event.preventDefault();
      if (/^https?:\/\//i.test(targetUrl)) shell.openExternal(targetUrl);
    }
  });

  await mainWindow.loadURL(url);
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow).catch((error) => {
  console.error('No se pudo iniciar Friendly Discord:', error);
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (localServer) localServer.close();
  if (process.platform !== 'darwin') app.quit();
});
