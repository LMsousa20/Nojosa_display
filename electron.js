const { app, BrowserWindow, globalShortcut, screen, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const userDataPath = app.getPath('userData');
process.env.STORAGE_DIR = userDataPath;

const configDest = path.join(userDataPath, 'config.json');
if (!fs.existsSync(configDest)) {
    const configSrc = path.join(__dirname, 'config.json');
    if (fs.existsSync(configSrc)) {
        try { fs.copyFileSync(configSrc, configDest); } catch(e) {}
    }
}

require('./server.js');

let tray = null;

function createWindow() {
    const displays = screen.getAllDisplays();
    const externalDisplay = displays.find(display => display.bounds.x !== 0 || display.bounds.y !== 0);

    const winOptions = {
        width: 1280,
        height: 720,
        kiosk: true, 
        alwaysOnTop: true,
        autoHideMenuBar: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
    };

    if (externalDisplay) {
        winOptions.x = externalDisplay.bounds.x;
        winOptions.y = externalDisplay.bounds.y;
    }

    const mainWindow = new BrowserWindow(winOptions);

    globalShortcut.register('CommandOrControl+Q', () => app.quit());

    setTimeout(() => {
        mainWindow.loadURL('http://localhost:3000');
    }, 2000);
}

app.whenReady().then(() => {
    createWindow();

    const iconPath = path.join(__dirname, 'public', 'logo.png');
    let icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
    
    tray = new Tray(icon.resize({ width: 16, height: 16 }));
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Abrir Painel Administrativo', click: () => shell.openExternal('http://localhost:3000/admin.html') },
        { type: 'separator' },
        { label: 'Sair do CFD', click: () => app.quit() }
    ]);
    tray.setToolTip('Customer Facing Display (PDV)');
    tray.setContextMenu(contextMenu);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
