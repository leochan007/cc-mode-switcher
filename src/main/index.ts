import { app, BrowserWindow, ipcMain, clipboard, dialog, Menu, shell } from 'electron'
import { execSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  loadConfig,
  saveModels,
  saveRoles,
  resetRoles,
  writeRolesYaml,
  readRolesYamlRaw,
  configDirPath,
  ConfigBundle,
  ModelConfig,
  RoleConfig
} from './config'
import {
  createSession,
  writeToSession,
  resizeSession,
  killSession,
  listSessions,
  replayBuffer,
  SessionMeta,
  DEFAULT_CWD
} from './pty'

let mainWindow: BrowserWindow | null = null

// -----------------------------------------------------------------------------
// Window helpers
// -----------------------------------------------------------------------------

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  win.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason !== 'clean-exit') {
      console.error('Renderer process gone:', details.reason, '— reloading')
      win?.webContents.reload()
    }
  })

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })

  return win
}

// -----------------------------------------------------------------------------
// App lifecycle
// -----------------------------------------------------------------------------

app.whenReady().then(() => {
  // Eagerly load config so any boot-time errors surface in the main console
  loadConfig()

  mainWindow = createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// -----------------------------------------------------------------------------
// Application menu (Shell + Help). The renderer listens for `menu:*` events.
// Recent cwd history is pushed from the renderer whenever it changes; we
// rebuild the menu so the Open Recent submenu reflects the latest list.
// -----------------------------------------------------------------------------

let recentCwds: string[] = []

function sendMenuCommand(channel: string, ...args: unknown[]): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, ...args)
  }
}

function buildAppMenu(): void {
  const isMac = process.platform === 'darwin'
  const recentSubmenu: Electron.MenuItemConstructorOptions[] =
    recentCwds.length === 0
      ? [{ label: '(no recent folders)', enabled: false }]
      : recentCwds.map((p) => ({
          label: shortenPathForMenu(p),
          toolTip: p,
          click: () => sendMenuCommand('menu:open-recent-path', p)
        }))

  const shellSubmenu: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'New Session',
      submenu: [
        {
          label: 'Internal Terminal',
          accelerator: isMac ? 'Cmd+T' : 'Ctrl+T',
          click: () => sendMenuCommand('menu:new-session-internal')
        },
        {
          label: 'External Terminal',
          click: () => sendMenuCommand('menu:new-session-external')
        }
      ]
    },
    {
      label: 'New Session With Role',
      submenu: [
        {
          label: 'Internal Terminal',
          accelerator: isMac ? 'Cmd+N' : 'Ctrl+N',
          click: () => sendMenuCommand('menu:new-session-with-role-internal')
        },
        {
          label: 'External Terminal',
          click: () => sendMenuCommand('menu:new-session-with-role-external')
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Open Folder…',
      accelerator: isMac ? 'Cmd+O' : 'Ctrl+O',
      click: () => sendMenuCommand('menu:open-folder')
    },
    {
      label: 'Open Recent',
      submenu: recentSubmenu
    }
  ]

  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu (macOS only — auto-injects Quit / Hide)
    ...(isMac
      ? ([{ role: 'appMenu' }] as Electron.MenuItemConstructorOptions[])
      : []),
    {
      label: 'Shell',
      submenu: shellSubmenu
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Switcher Help',
          click: () => shell.openExternal('https://leochan007.github.io/cc-mode-switcher/')
        }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

/** Collapse $HOME to ~ for the menu label; keep the full path as toolTip */
function shortenPathForMenu(p: string): string {
  const home = app.getPath('home')
  if (p === home) return '~'
  if (p.startsWith(home + '/')) return '~' + p.slice(home.length)
  return p
}

ipcMain.handle('set-recent-cwds', async (_event, paths: string[]) => {
  recentCwds = Array.isArray(paths) ? paths.slice(0, 10).map(String) : []
  buildAppMenu()
  return true
})

buildAppMenu()

// -----------------------------------------------------------------------------
// Misc IPC kept from v1 (clipboard, connection test, terminal picker)
// -----------------------------------------------------------------------------

ipcMain.handle('clipboard:write', async (_event, text: string) => {
  clipboard.writeText(text)
  return true
})

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

/** Native folder picker — used when launching a new shell with no cwd history. */
ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose working directory for the new shell',
    defaultPath: app.getPath('home'),
    properties: ['openDirectory', 'createDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

/**
 * Pick a file to use as a role's system prompt. Defaults to the user's
 * ~/.cc-mode-switcher/prompts/ folder and filters to .md files; the user can
 * still type any path in the input (absolute or ~/...) — this picker is just
 * a shortcut.
 */
ipcMain.handle('select-prompt-file', async () => {
  if (!mainWindow) return null
  const home = app.getPath('home')
  const defaultDir = path.join(home, '.cc-mode-switcher', 'prompts')
  const startIn = fs.existsSync(defaultDir) ? defaultDir : home
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose system prompt file',
    defaultPath: startIn,
    properties: ['openFile'],
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return result.canceled ? null : result.filePaths[0]
})

/**
 * Read a text file (used by the renderer to inline the system prompt into
 * the launch script — the claude CLI doesn't accept `--system-prompt-file`).
 */
ipcMain.handle('read-text-file', async (_event, filePath: string): Promise<string> => {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch (err: any) {
    return ''
  }
})

function applescriptEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`
}

/**
 * Write the launch script to a runnable `.command` file and open it with the
 * user's terminal app. The whole script runs in a single shell invocation —
 * critical, because `do script` over AppleScript feeds each newline as a
 * separate input which loses mktemp / export state between lines.
 */
function launchViaDotCommand(terminalPath: string, command: string): void {
  const tmp = path.join(os.tmpdir(), `cc-mode-${Date.now()}.command`)
  fs.writeFileSync(tmp, `#!/bin/zsh\n${command}\nexit 0\n`, { mode: 0o755 })
  // Clean up the temp file after 60 seconds so it doesn't pile up.
  setTimeout(() => {
    try { fs.unlinkSync(tmp) } catch { /* gone */ }
  }, 60_000)
  try {
    execSync(`open -a "${terminalPath}" "${tmp}"`)
  } catch {
    execSync(`open "${tmp}"`)
  }
}

ipcMain.handle(
  'launch-terminal',
  async (_event, payload: { terminalPath: string; command: string }): Promise<{ ok: boolean; error?: string }> => {
    const { terminalPath, command } = payload
    try {
      launchViaDotCommand(terminalPath, command)
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) }
    }
  }
)

// -----------------------------------------------------------------------------
// Config IPC (M1-T2)
// -----------------------------------------------------------------------------

ipcMain.handle('config:load', async (): Promise<ConfigBundle> => loadConfig())
ipcMain.handle('config:save-models', async (_event, models: ModelConfig[]): Promise<ConfigBundle> => {
  saveModels(models)
  return loadConfig()
})
ipcMain.handle('config:save-roles', async (_event, roles: RoleConfig[]): Promise<ConfigBundle> => {
  saveRoles(roles)
  return loadConfig()
})
ipcMain.handle('config:reset-roles', async (): Promise<ConfigBundle> => resetRoles())
ipcMain.handle('config:read-roles-yaml', async (): Promise<string> => readRolesYamlRaw())
ipcMain.handle(
  'config:write-roles-yaml',
  async (_event, raw: string): Promise<{ ok: true; bundle: ConfigBundle } | { ok: false; error: string }> =>
    writeRolesYaml(raw)
)
ipcMain.handle('config:dir', async (): Promise<string> => configDirPath())

// -----------------------------------------------------------------------------
// pty IPC (M3-T9 / M4-T13)
// -----------------------------------------------------------------------------

function ownerIdFor(event: Electron.IpcMainInvokeEvent): number {
  return event.sender.id
}

ipcMain.handle(
  'session:create',
  async (
    event,
    payload: { cwd: string; command?: string; label: string; roleId: string; systemPrompt: string; cols?: number; rows?: number; settingsJson?: string }
  ) => {
    const owner = ownerIdFor(event)
    return createSession({
      cwd: payload.cwd || DEFAULT_CWD,
      command: payload.command,
      label: payload.label,
      roleId: payload.roleId,
      systemPrompt: payload.systemPrompt,
      ownerId: owner,
      cols: payload.cols,
      rows: payload.rows,
      settingsJson: payload.settingsJson
    })
  }
)

ipcMain.handle('session:input', async (_event, payload: { id: string; data: string }): Promise<boolean> => {
  return writeToSession(payload.id, payload.data)
})

ipcMain.handle(
  'session:resize',
  async (_event, payload: { id: string; cols: number; rows: number }): Promise<boolean> => {
    return resizeSession(payload.id, payload.cols, payload.rows)
  }
)

ipcMain.handle('session:kill', async (_event, payload: { id: string }): Promise<boolean> => {
  return killSession(payload.id)
})

ipcMain.handle('session:list', async (): Promise<SessionMeta[]> => listSessions())

ipcMain.handle('session:replay', async (_event, payload: { id: string }): Promise<string | null> => {
  return replayBuffer(payload.id)
})