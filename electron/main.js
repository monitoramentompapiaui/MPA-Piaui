const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const url = require('url');

// Mapa de tipos MIME
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.eot':  'application/vnd.ms-fontobject',
  '.pdf':  'application/pdf',
};

// Caminho para a pasta dist (dentro do pacote)
const distPath = app.isPackaged
  ? path.join(process.resourcesPath, 'dist')
  : path.join(__dirname, '../dist');

let serverPort = 0;
let server;

function startLocalServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      let reqPath = url.parse(req.url).pathname;

      // Remove query string e decode URI
      try { reqPath = decodeURIComponent(reqPath); } catch(e) {}

      let filePath = path.join(distPath, reqPath);

      // Se for diretório ou não encontrar, serve index.html (SPA fallback)
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distPath, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });

    // Usa porta fixa consistente para manter o mesmo origin local e preservar o login do usuário
    const FIXED_PORT = 38472;

    server.listen(FIXED_PORT, '127.0.0.1', () => {
      serverPort = FIXED_PORT;
      resolve(serverPort);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        server.listen(0, '127.0.0.1', () => {
          serverPort = server.address().port;
          resolve(serverPort);
        });
      } else {
        reject(err);
      }
    });
  });
}

function createWindow(port) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Infopesca',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#0f172a',
    show: false,
  });

  win.loadURL(`http://127.0.0.1:${port}/index.html`);

  win.once('ready-to-show', () => {
    win.show();
  });

  // Garante que o webContents mantenha o foco e não trave cliques/digitação
  win.on('focus', () => {
    if (win && win.webContents) {
      win.webContents.focus();
    }
  });

  // Links externos abrem no browser padrão
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  // Remove completamente o menu padrão (File, Edit, View, Window, Help)
  Menu.setApplicationMenu(null);

  const port = await startLocalServer();
  createWindow(port);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(port);
    }
  });
});

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
