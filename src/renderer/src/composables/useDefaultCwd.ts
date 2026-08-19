/**
 * useDefaultCwd — read / write the persistent "Default Working Directory".
 *
 * Persists a single absolute path string in `localStorage` under
 * `cc_default_cwd`. Empty string = not set; null = never been set (used by
 * the first-run prompt trigger).
 *
 * Why localStorage (not main YAML / electron-store):
 * - Single source of truth for UI prefs already lives in renderer
 *   (cc_theme / cc_locale / cc_terminal / cc_workspace_cwd_history)
 * - No new dependency, no IPC schema change
 * - Renderer reads synchronously on mount; no async wait
 * - main receives the value as IPC payload when needed (no main-side cache)
 *
 * See plans/004-default-working-directory.md §3.1 for the full design.
 */
import { ref } from 'vue'

const STORAGE_KEY = 'cc_default_cwd'

/**
 * null  → key never written (first-run trigger fires)
 * ''    → key written but empty (treated as "unset" everywhere else)
 * '...' → absolute path, normalized
 */
const defaultCwd = ref<string | null>(load())

function load(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    return raw
  } catch {
    return null
  }
}

/** Read the current default cwd. null = never set (first run); '' → = unset. */
export function getDefaultCwd(): string | null {
  return defaultCwd.value
}

/** Read with a homedir fallback for display in the SettingsPanel. */
export function getDefaultCwdOrHome(home: string): string {
  if (defaultCwd.value === null || defaultCwd.value === '') return home
  return defaultCwd.value
}

export function setDefaultCwd(path: string): void {
  defaultCwd.value = path
  try {
    localStorage.setItem(STORAGE_KEY, path)
  } catch {
    /* best effort — localStorage may be disabled in some sandboxes */
  }
}

export function resetDefaultCwdToHome(home: string): void {
  setDefaultCwd(home)
}

/** Clear the first-run marker so the prompt can fire again (dev / testing only). */
export function clearDefaultCwdForDev(): void {
  defaultCwd.value = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* best effort */
  }
}