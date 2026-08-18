import { BrowserWindow } from 'electron'
import * as pty from 'node-pty'
import path from 'path'
import os from 'os'
import fs from 'fs'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SessionMeta {
  id: string
  /** Tab title, e.g. "🧠 Planner (glm47) #2" */
  label: string
  /** Absolute project working directory */
  cwd: string
  /** Absolute path of the system-prompt file */
  systemPrompt: string
  /** Role id at session creation time */
  roleId: string
  /** Window that currently owns this session */
  ownerId: number
  /** Project / command title hint */
  titleHint: string
}

export interface SessionEntry {
  meta: SessionMeta
  pty: pty.IPty
  buffer: string
  alive: boolean
  cleanup: () => void
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const RING_BUFFER_LIMIT = 2 * 1024 * 1024 // 2 MiB
const sessions = new Map<string, SessionEntry>()
let seq = 0

// -----------------------------------------------------------------------------
// Session helpers
// -----------------------------------------------------------------------------

export function listSessions(): SessionMeta[] {
  return Array.from(sessions.values()).map((e) => e.meta)
}

export function getSession(id: string): SessionEntry | undefined {
  return sessions.get(id)
}

export function genSessionId(): string {
  return `s${Date.now().toString(36)}-${(++seq).toString(36)}`
}

// -----------------------------------------------------------------------------
// IPC broadcast
// -----------------------------------------------------------------------------

function broadcast(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send(channel, payload)
  }
}

// -----------------------------------------------------------------------------
// Ring buffer
// -----------------------------------------------------------------------------

function pushBuffer(entry: SessionEntry, chunk: string): void {
  entry.buffer += chunk
  if (entry.buffer.length > RING_BUFFER_LIMIT) {
    entry.buffer = entry.buffer.slice(entry.buffer.length - RING_BUFFER_LIMIT)
  }
}

// -----------------------------------------------------------------------------
// Shell selection
// -----------------------------------------------------------------------------

function pickShell(): string {
  // macOS — Apple ships /bin/zsh. Skip $SHELL here because Electron's GUI
  // process often has no login-shell environment set.
  if (process.platform === 'darwin') {
    if (fs.existsSync('/bin/zsh')) return '/bin/zsh'
    if (fs.existsSync('/bin/bash')) return '/bin/bash'
    return '/bin/sh'
  }
  // Windows
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'powershell.exe'
  }
  // Linux / other Unix — prefer $SHELL
  const envShell = process.env.SHELL
  if (envShell && fs.existsSync(envShell)) return envShell
  if (fs.existsSync('/bin/bash')) return '/bin/bash'
  return '/bin/sh'
}

// -----------------------------------------------------------------------------
// CWD resolution (with stat validation)
// -----------------------------------------------------------------------------

function resolveCwd(cwd: string | undefined): string {
  const home = os.homedir()
  let resolved: string
  if (!cwd || cwd === '~') {
    resolved = home
  } else if (cwd.startsWith('~/')) {
    resolved = path.join(home, cwd.slice(2))
  } else if (path.isAbsolute(cwd)) {
    resolved = cwd
  } else {
    resolved = path.resolve(home, cwd)
  }
  try {
    if (fs.statSync(resolved).isDirectory()) return resolved
  } catch {
    /* fall through */
  }
  console.warn(`[PTY] Invalid cwd "${resolved}", falling back to "${home}"`)
  return home
}

// -----------------------------------------------------------------------------
// Environment construction
//
// Electron's GUI process often inherits a stripped PATH — npm-global installs,
// brew, bun all land in locations the OS app shell never sees. We explicitly
// add the common ones so `claude` resolves even if it's not on $PATH yet.
// -----------------------------------------------------------------------------

function buildPtyEnv(
  extra: Record<string, string> = {},
  settingsFile?: string
): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) env[k] = v
  }

  env.TERM = 'xterm-256color'
  env.HOME = env.HOME || os.homedir()
  env.SHELL = env.SHELL || pickShell()

  if (process.platform === 'darwin') {
    const currentPath = env.PATH || ''
    const required = [
      path.join(env.HOME, '.local/bin'),
      path.join(env.HOME, '.npm-global/bin'),
      path.join(env.HOME, '.bun/bin'),
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      '/usr/local/bin',
      '/usr/local/sbin',
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin'
    ]
    const seen = new Set(currentPath.split(':').filter(Boolean))
    for (const p of required) if (!seen.has(p)) seen.add(p)
    env.PATH = Array.from(seen).join(':')
  }

  if (settingsFile) env.CC_MS_SETTINGS_FILE = settingsFile
  Object.assign(env, extra)
  return env
}

// -----------------------------------------------------------------------------
// Temp session files
// -----------------------------------------------------------------------------

interface SessionFiles {
  dir: string
  settingsFile: string
  launchScriptPath: string
}

function createSessionFiles(): SessionFiles {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-ms-'))
  return {
    dir,
    settingsFile: path.join(dir, 'settings.json'),
    launchScriptPath: path.join(dir, 'launch.sh')
  }
}

function cleanupSessionFiles(files: SessionFiles): void {
  try {
    fs.rmSync(files.dir, { recursive: true, force: true })
  } catch {
    /* best effort */
  }
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export interface CreateSessionOptions {
  cwd: string
  command?: string
  label: string
  roleId: string
  systemPrompt: string
  ownerId: number
  cols?: number
  rows?: number
  env?: Record<string, string>
  /** JSON written to a per-session temp file; path exposed as $CC_MS_SETTINGS_FILE */
  settingsJson?: string
}

// -----------------------------------------------------------------------------
// Create PTY session
// -----------------------------------------------------------------------------

export function createSession(opts: CreateSessionOptions): { id: string; meta: SessionMeta } {
  const id = genSessionId()
  const cwd = resolveCwd(opts.cwd)
  const meta: SessionMeta = {
    id,
    label: opts.label,
    cwd,
    systemPrompt: opts.systemPrompt,
    roleId: opts.roleId,
    ownerId: opts.ownerId,
    titleHint: path.basename(cwd) || '~'
  }

  const files = createSessionFiles()
  if (opts.settingsJson !== undefined) {
    fs.writeFileSync(files.settingsFile, opts.settingsJson, 'utf8')
  }
  if (opts.command) {
    fs.writeFileSync(files.launchScriptPath, opts.command, { encoding: 'utf8', mode: 0o700 })
  }

  const env = buildPtyEnv(opts.env ?? {}, files.settingsFile)
  const shell = pickShell()
  const args = process.platform === 'win32' ? [] : ['-l']

  console.log('[PTY] Creating session', {
    id,
    shell,
    args,
    cwd,
    cwdExists: fs.existsSync(cwd),
    home: env.HOME,
    path: env.PATH,
    cols: opts.cols ?? 100,
    rows: opts.rows ?? 30
  })

  let ptyProc: pty.IPty
  try {
    ptyProc = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: Math.max(1, opts.cols ?? 100),
      rows: Math.max(1, opts.rows ?? 30),
      cwd,
      env
    })
  } catch (error) {
    console.error('[PTY] Failed to spawn shell:', error)
    cleanupSessionFiles(files)
    throw error
  }

  const entry: SessionEntry = {
    meta,
    pty: ptyProc,
    buffer: '',
    alive: true,
    cleanup: () => cleanupSessionFiles(files)
  }
  sessions.set(id, entry)

  ptyProc.onData((data) => {
    if (!entry.alive) return
    pushBuffer(entry, data)
    broadcast('session:data', { id, data })
  })

  ptyProc.onExit(({ exitCode, signal }) => {
    if (!entry.alive) return
    entry.alive = false
    console.log('[PTY] Session exited:', { id, exitCode, signal })
    broadcast('session:exit', { id, exitCode, signal })
    entry.cleanup()
    sessions.delete(id)
  })

  // Source the launch script (no echo, no heredoc). `exec claude` inside the
  // script replaces the shell with the Claude process.
  setImmediate(() => {
    if (!entry.alive || !opts.command) return
    const scriptPath = files.launchScriptPath
    const escaped = scriptPath.replaceAll("'", "'\\''")
    try {
      ptyProc.write(`stty -echo 2>/dev/null; set +x; . '${escaped}'\n`)
    } catch (error) {
      console.error('[PTY] Failed to write launch command:', error)
    }
  })

  return { id, meta }
}

// -----------------------------------------------------------------------------
// Write
// -----------------------------------------------------------------------------

export function writeToSession(id: string, data: string): boolean {
  const entry = sessions.get(id)
  if (!entry || !entry.alive) return false
  try {
    entry.pty.write(data)
    return true
  } catch (error) {
    console.error(`[PTY] write failed for ${id}:`, error)
    return false
  }
}

// -----------------------------------------------------------------------------
// Resize
// -----------------------------------------------------------------------------

export function resizeSession(id: string, cols: number, rows: number): boolean {
  const entry = sessions.get(id)
  if (!entry || !entry.alive) return false
  try {
    entry.pty.resize(Math.max(1, Math.floor(cols)), Math.max(1, Math.floor(rows)))
    return true
  } catch (error) {
    console.error(`[PTY] resize failed for ${id}:`, error)
    return false
  }
}

// -----------------------------------------------------------------------------
// Kill
// -----------------------------------------------------------------------------

export function killSession(id: string): boolean {
  const entry = sessions.get(id)
  if (!entry) return false
  entry.alive = false
  try { entry.pty.kill() } catch { /* already dead */ }
  entry.cleanup()
  sessions.delete(id)
  return true
}

// -----------------------------------------------------------------------------
// Replay
// -----------------------------------------------------------------------------

export function replayBuffer(id: string): string | null {
  const entry = sessions.get(id)
  return entry ? entry.buffer : null
}

// -----------------------------------------------------------------------------
// Owner
// -----------------------------------------------------------------------------

export function setOwner(id: string, ownerId: number): boolean {
  const entry = sessions.get(id)
  if (!entry) return false
  entry.meta.ownerId = ownerId
  return true
}

// -----------------------------------------------------------------------------
// Default CWD
// -----------------------------------------------------------------------------

export const DEFAULT_CWD = os.homedir()

// -----------------------------------------------------------------------------
// Debug helper — bypasses the session system to test raw node-pty
// -----------------------------------------------------------------------------

export function testBarePty(): pty.IPty {
  const shell = process.platform === 'darwin' ? '/bin/zsh' : pickShell()
  const cwd = os.homedir()
  const env: Record<string, string> = {
    HOME: os.homedir(),
    SHELL: shell,
    TERM: 'xterm-256color',
    PATH: process.env.PATH || '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin'
  }
  console.log('[PTY TEST]', { shell, cwd, cwdExists: fs.existsSync(cwd), env })
  const proc = pty.spawn(shell, [], { name: 'xterm-256color', cols: 100, rows: 30, cwd, env })
  proc.onData((data) => console.log('[PTY TEST DATA]', JSON.stringify(data)))
  proc.onExit((event) => console.log('[PTY TEST EXIT]', event))
  setTimeout(() => {
    try { proc.write('echo "[PTY TEST] HELLO"\r') } catch { /* gone */ }
  }, 100)
  return proc
}