import { app, BrowserWindow, ipcMain, clipboard } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 720,
    minWidth: 700,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({
      mode: 'detach'
    })
  } else {
    mainWindow.loadFile(
      path.join(__dirname, '../renderer/index.html')
    )
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// IPC: copy text to system clipboard
ipcMain.handle('clipboard:write', async (_event, text: string) => {
  clipboard.writeText(text)
  return true
})

// IPC: probe a model base URL for connectivity (no CORS in the main process)
// Any HTTP response counts as reachable; only network/timeout errors fail.
ipcMain.handle('test-connection', async (_event, url: string) => {
  const started = Date.now()
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('invalid URL protocol')
    }
    const res = await fetch(parsed, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(8000)
    })
    return { ok: true, ms: Date.now() - started, status: res.status }
  } catch (err: any) {
    const cause = err?.cause?.code ?? err?.cause?.message
    const reason = cause ?? (err?.name === 'TimeoutError' ? 'timeout' : err?.message) ?? 'unknown error'
    return { ok: false, ms: Date.now() - started, error: reason }
  }
})

// IPC: install CLI symlink so user can run `cc-mode-switcher` from terminal
ipcMain.handle('install-cli', async () => {
  const { execSync } = await import('child_process')
  const appPath = process.execPath
  const binPath = '/usr/local/bin/cc-mode-switcher'

  try {
    execSync(`rm -f "${binPath}"`)
    execSync(`ln -s "${appPath}" "${binPath}"`)
    return { success: true, path: binPath }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})