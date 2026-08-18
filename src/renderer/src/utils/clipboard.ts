/**
 * Copy text via Electron IPC. Falls back to a hidden DOM textarea + execCommand
 * if IPC is unavailable (e.g. running outside Electron).
 *
 * Returns true on success so the caller can give visual feedback.
 */
export async function copyText(text: string): Promise<boolean> {
  // Try the Electron IPC first.
  if (window.electronAPI?.copyToClipboard) {
    try {
      const ok = await window.electronAPI.copyToClipboard(text)
      if (ok) return true
    } catch (err) {
      console.warn('[clipboard] IPC failed, falling back to DOM:', err)
    }
  }
  // DOM fallback — works in any browser context.
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch (err) {
    console.error('[clipboard] DOM fallback also failed:', err)
    return false
  }
}
