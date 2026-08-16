import { ref, watch } from 'vue'

const STORAGE_KEY = 'cc_terminal'

function load(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

// Module-level singleton shared by SwitcherPanel (launch) and SettingsPanel (edit)
const terminalPath = ref<string>(load())

watch(terminalPath, (v) => {
  try {
    localStorage.setItem(STORAGE_KEY, v)
  } catch {}
})

export function useTerminal() {
  /** Opens the native file picker; returns true when a terminal was chosen */
  async function pickTerminal(): Promise<boolean> {
    const picked = await window.electronAPI.selectTerminal()
    if (picked) {
      terminalPath.value = picked
      return true
    }
    return false
  }

  /**
   * Open a new terminal window running `command`. Prompts for a terminal
   * via the file picker on first use.
   */
  async function launchInTerminal(command: string): Promise<{ ok: boolean; error?: string }> {
    if (!terminalPath.value) {
      const chosen = await pickTerminal()
      if (!chosen) return { ok: false, error: 'cancelled' }
    }
    return window.electronAPI.launchTerminal({ terminalPath: terminalPath.value, command })
  }

  return { terminalPath, pickTerminal, launchInTerminal }
}
