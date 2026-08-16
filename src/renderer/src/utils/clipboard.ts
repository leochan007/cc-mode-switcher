/** Copy text via Electron IPC, falling back to the DOM API outside Electron */
export async function copyText(text: string): Promise<void> {
  try {
    await window.electronAPI.copyToClipboard(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}
