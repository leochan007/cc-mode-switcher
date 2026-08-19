import { app, BrowserWindow, ipcMain, clipboard, dialog, Menu, MenuItem, shell } from 'electron'
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
  pruneLaunchCache,
  SessionMeta,
  DEFAULT_CWD
} from './pty'

let mainWindow: BrowserWindow | null = null

// -----------------------------------------------------------------------------
// Window helpers
// -----------------------------------------------------------------------------

function createMainWindow(): BrowserWindow {
  // In packaged builds electron-builder writes the .icns/.ico into the .app
  // bundle / installer, so the OS picks up the icon automatically. In dev mode
  // there's no bundle, so we point BrowserWindow at build/icon.png directly —
  // this affects the Windows taskbar and Linux window list.
  //
  // electron-vite compiles the main process to out/main/index.js, so
  // __dirname === <project-root>/out/main. Going up two levels reaches the
  // project root where build/icon.png lives.
  const devIcon = path.join(__dirname, '../../build/icon.png')
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    icon: devIcon,
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

/**
 * Wire up the right-click context menu for any webContents so inputs / text
 * areas / selectable content get Cut / Copy / Paste / Select All. Without this
 * Electron shows nothing on right-click — keyboard shortcuts still work, but
 * users pasting long strings (API keys, base URLs) instinctively reach for
 * the context menu and conclude "copy-paste is broken".
 *
 * Uses Electron's built-in roles so the actual clipboard work is handled by
 * Chromium against the focused element. The renderer's own @contextmenu
 * handlers (XtermTab, RoleDetailPanel, RolesTable, TerminalTabs) call
 * .preventDefault() on the renderer-side event, which suppresses this
 * handler — so custom menus stay custom.
 */
function wireContextMenu(win: BrowserWindow): void {
  win.webContents.on('context-menu', (_event, params) => {
    const menu = new Menu()
    const f = params.editFlags

    if (f.canUndo || f.canRedo) {
      if (f.canUndo) menu.append(new MenuItem({ label: 'Undo', role: 'undo' }))
      if (f.canRedo) menu.append(new MenuItem({ label: 'Redo', role: 'redo' }))
      menu.append(new MenuItem({ type: 'separator' }))
    }

    if (f.canCut || f.canCopy || f.canPaste) {
      if (f.canCut)   menu.append(new MenuItem({ label: 'Cut',  role: 'cut'  }))
      if (f.canCopy)  menu.append(new MenuItem({ label: 'Copy', role: 'copy' }))
      if (f.canPaste) menu.append(new MenuItem({ label: 'Paste', role: 'paste' }))
      menu.append(new MenuItem({ type: 'separator' }))
    }

    if (f.canSelectAll) {
      menu.append(new MenuItem({ label: 'Select All', role: 'selectAll' }))
    }

    if (menu.items.length > 0) {
      menu.popup({ window: win })
    }
  })
}

// -----------------------------------------------------------------------------
// App lifecycle
// -----------------------------------------------------------------------------

app.whenReady().then(() => {
  // Eagerly load config so any boot-time errors surface in the main console
  loadConfig()

  // macOS Dock icon in dev mode — packaged builds get this from the .app
  // bundle's Info.plist, but `pnpm run dev` runs Electron directly without a
  // bundle, so we set it imperatively here. No-op on Windows/Linux.
  //
  // __dirname === <project-root>/out/main in dev (see createMainWindow above);
  // ../../build/icon.png resolves to <project-root>/build/icon.png.
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(path.join(__dirname, '../../build/icon.png'))
  }

  // Prune stale .launch-cache entries (rev6: shared with external terminals,
  // so cleanup policy applies uniformly). 1 day cutoff by default — by then
  // any running shell has already sourced launch.sh and the cc-<role>()
  // functions live in shell memory.
  pruneLaunchCache()

  mainWindow = createMainWindow()
  wireContextMenu(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
      wireContextMenu(mainWindow)
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

ipcMain.handle('test-connection', async (_event, url: string, apiKey?: string, modelId?: string) => {
  const started = Date.now()
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('invalid URL protocol')
    }
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01'
    }
    if (apiKey) {
      // Send x-api-key (Anthropic's official header) AND Authorization: Bearer
      // — most Anthropic-compatible providers accept either, but a few reject
      // the wrong one outright, so belt-and-braces is cheap here.
      headers['x-api-key'] = apiKey
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    // Primary probe: GET /v1/models (auth + URL + model-list existence).
    // We deliberately DO NOT POST /v1/messages here — that would consume
    // MiniMax-style providers' message-quota budget, and clicking Test
    // Connection repeatedly would burn through rate-limit tokens. The deeper
    // POST probe is available as a separate one-time diagnostic (see below).
    const modelsUrl = parsed.toString().replace(/\/+$/, '') + '/v1/models'
    const modelsRes = await fetch(modelsUrl, {
      method: 'GET',
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(15000)
    })

    if (modelsRes.status >= 200 && modelsRes.status < 300) {
      return { ok: true, ms: Date.now() - started, status: modelsRes.status, probe: 'models' }
    }

    // Fallback: POST /v1/messages — only fires if GET did NOT succeed.
    // This is the deeper probe (validates the runtime path Claude Code uses)
    // but we keep it as a fallback to avoid burning message quota when
    // GET already proved URL + auth + model-existence are correct.
    let postStatus = 0
    let postError: string | null = null
    const messagesUrl = parsed.toString().replace(/\/+$/, '') + '/v1/messages'
    const body = JSON.stringify({
      model: modelId || 'claude-3-5-haiku-latest',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }]
    })
    try {
      const messagesRes = await fetch(messagesUrl, {
        method: 'POST',
        headers,
        body,
        redirect: 'manual',
        signal: AbortSignal.timeout(30000)
      })
      postStatus = messagesRes.status
    } catch (err: any) {
      const cause = err?.cause?.code ?? err?.cause?.message
      postError = cause ?? (err?.name === 'TimeoutError' ? 'timeout' : err?.message ?? 'unknown error')
    }

    return {
      ok: false,
      ms: Date.now() - started,
      status: postStatus || modelsRes.status,
      probe: postError ? 'messages' : 'fallback',
      postError,
      fallbackStatus: modelsRes.status
    }
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

/**
 * Native folder picker — used when launching a new shell with no cwd history,
 * or by the first-run / settings-page default-cwd prompt.
 *
 * opts.purpose:
 *   - 'default' → "Choose your default working directory" (used by first-run
 *                 prompt + SettingsPanel Change… button)
 *   - 'oneoff'  → "Choose working directory for the new shell" (legacy;
 *                 Open Folder…/Cmd+O and the legacy fallback path)
 *
 * opts.defaultCwd: preferred dialog starting path. Renderer passes its
 * localStorage `cc_default_cwd` so the dialog opens at the user's chosen
 * default. main does NOT read localStorage — single-source rule.
 */
ipcMain.handle(
  'select-directory',
  async (_event, opts?: { purpose?: 'default' | 'oneoff'; defaultCwd?: string } = {}) => {
    if (!mainWindow) return null
    const purpose = opts.purpose ?? 'oneoff'
    const title = purpose === 'default'
      ? 'Choose your default working directory'
      : 'Choose working directory for the new shell'
    const defaultPath = (typeof opts.defaultCwd === 'string' && opts.defaultCwd.length > 0)
      ? opts.defaultCwd
      : app.getPath('home')
    const result = await dialog.showOpenDialog(mainWindow, {
      title,
      defaultPath,
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  }
)

/**
 * NOTE: The old `select-prompt-file` and `read-text-file` IPC handlers were
 * removed when systemPrompt became inline YAML content (no more external
 * .md files). The role edit modal now uses a <textarea>; the launch script
 * reads role.systemPrompt directly with no file I/O.
 */

function applescriptEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`
}

/**
 * Write the launch script to a runnable `.command` file and open it with the
 * user's terminal app.
 *
 * rev8: shebang is plain `#!/bin/zsh`. We tried `#!/bin/zsh -i` in rev7,
 * but macOS Launch Services invokes `.command` files via `zsh <file>`
 * (non-interactive). The `-i` flag is not reliably passed through; once
 * the script body ends the shell exits and Terminal.app shows
 * "[Process completed]". So the script body itself ends with `exec /bin/zsh`
 * (see buildExternalSessionScript) which hands the session over to a fresh
 * zsh that picks up the cc-<role>() functions via a transient ZDOTDIR hook.
 *
 * rev6 path selection: write to `$HOME/.cc-mode-switcher/.launch-cache/cmds/`
 * (NOT /tmp). macOS Gatekeeper treats /tmp as an untrusted download dir and
 * pops a "Yes, I trust this folder / No, exit" dialog; picking "No" makes
 * Terminal.app quit the entire process. Home-dir files are user-authored.
 */
function launchViaDotCommand(terminalPath: string, command: string): void {
  const cmdsDir = path.join(app.getPath('home'), '.cc-mode-switcher', '.launch-cache', 'cmds')
  fs.mkdirSync(cmdsDir, { recursive: true })
  const tmp = path.join(cmdsDir, `cc-mode-${Date.now()}.command`)
  fs.writeFileSync(tmp, `#!/bin/zsh\n${command}\n`, { mode: 0o755 })
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