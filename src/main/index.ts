import { app, BrowserWindow, ipcMain, clipboard, dialog } from 'electron'
import { execSync } from 'child_process'
import fs from 'fs'
import os from 'os'
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

  // Recover from the occasional renderer crash by reloading the window
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason !== 'clean-exit') {
      console.error('Renderer process gone:', details.reason, '— reloading')
      mainWindow?.webContents.reload()
    }
  })
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

// IPC: pick the terminal application used by "Open in terminal"
ipcMain.handle('select-terminal', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose terminal application',
    defaultPath: '/System/Applications/Utilities',
    properties: ['openFile'],
    filters: [
      { name: 'Applications', extensions: ['app'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return result.canceled ? null : result.filePaths[0]
})

// IPC: detect env keys in Claude Code settings that override terminal env.
// settings.json `env` takes precedence over the process environment, silently
// defeating the model this app injects — surface and offer to clean it.
const OVERRIDE_KEY = (k: string) =>
  k.startsWith('ANTHROPIC_') || k === 'CLAUDE_CODE_SUBAGENT_MODEL' || k === 'MAX_THINKING_TOKENS'

function claudeSettingsFiles(): string[] {
  const dir = path.join(os.homedir(), '.claude')
  return [path.join(dir, 'settings.json'), path.join(dir, 'settings.local.json')]
}

function overrideKeysIn(file: string): string[] {
  try {
    const cfg = JSON.parse(fs.readFileSync(file, 'utf8'))
    return Object.keys(cfg.env ?? {})
      .filter(OVERRIDE_KEY)
      .sort()
  } catch {
    return []
  }
}

ipcMain.handle('get-claude-env-overrides', () =>
  claudeSettingsFiles()
    .map((file) => ({ file, keys: overrideKeysIn(file) }))
    .filter((e) => e.keys.length > 0)
)

ipcMain.handle('clear-claude-env-overrides', (): { ok: boolean; count?: number; error?: string } => {
  let count = 0
  try {
    for (const file of claudeSettingsFiles()) {
      const keys = overrideKeysIn(file)
      if (keys.length === 0) continue
      const raw = fs.readFileSync(file, 'utf8')
      fs.writeFileSync(`${file}.cc-backup-${Date.now()}`, raw)
      const cfg = JSON.parse(raw)
      for (const k of keys) delete cfg.env[k]
      if (Object.keys(cfg.env).length === 0) delete cfg.env
      fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n')
      count += keys.length
    }
    return { ok: true, count }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) }
  }
})

/** Escape a string for use inside a double-quoted AppleScript string literal */
function applescriptEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/** Quote a string as one safe shell argument (single-quote wrapping) */
function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`
}

// IPC: open a new terminal window running `command` in the chosen terminal app
ipcMain.handle(
  'launch-terminal',
  async (_event, payload: { terminalPath: string; command: string }): Promise<{ ok: boolean; error?: string }> => {
    const { terminalPath, command } = payload
    try {
      const appName = path.basename(terminalPath, '.app')
      const isAppBundle = terminalPath.endsWith('.app')

      if (isAppBundle && appName === 'Terminal') {
        const script = `tell application "Terminal" to do script "${applescriptEscape(command)}"`
        execSync(`osascript -e ${shellQuote('tell application "Terminal" to activate')} -e ${shellQuote(script)}`)
        return { ok: true }
      }

      if (isAppBundle && appName.startsWith('iTerm')) {
        const script = `tell application "iTerm2" to create window with default profile command "${applescriptEscape(command)}"`
        execSync(
          `osascript -e ${shellQuote('tell application "iTerm2" to activate')} -e ${shellQuote(script)}`
        )
        return { ok: true }
      }

      // Generic fallback: write a runnable .command file and open it with the
      // chosen app (or the default terminal when no .app bundle was given).
      const tmp = path.join(os.tmpdir(), `cc-mode-${Date.now()}.command`)
      fs.writeFileSync(tmp, `#!/bin/zsh\n${command}\n`, { mode: 0o755 })
      try {
        execSync(`open -a "${terminalPath}" "${tmp}"`)
      } catch {
        execSync(`open "${tmp}"`)
      }
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) }
    }
  }
)

// IPC: install CLI symlink — removed: /usr/local/bin needs sudo on modern macOS
// and the symlink only relaunched the GUI. Terminal aliases replaced it.