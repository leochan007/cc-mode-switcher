<template>
  <div class="xterm-host" ref="hostEl" @contextmenu.prevent="onContextMenu" />

  <Teleport to="body">
    <div
      v-if="menu.open"
      class="xterm-menu"
      :style="{ top: menu.y + 'px', left: menu.x + 'px' }"
      @click.stop
    >
      <button :disabled="!term?.getSelection()" @click="copySelection">
        📋 Copy
      </button>
      <button @click="pasteFromClipboard">📥 Paste</button>
      <button @click="selectAll">🔲 Select All</button>
      <hr />
      <button @click="closeMenu">✕ Close</button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

const props = defineProps<{
  sessionId: string | null
  isActive: boolean
}>()

const emit = defineEmits<{ (e: 'ready'): void }>()

const hostEl = ref<HTMLDivElement | null>(null)
const term = ref<Terminal | null>(null)
let fit: FitAddon | null = null
let unsubData: (() => void) | null = null
let unsubExit: (() => void) | null = null
let resizeObs: ResizeObserver | null = null
let lastWritten = '' // dedup output arriving before terminal is ready

const menu = reactive({ open: false, x: 0, y: 0 })

function writeSafe(data: string): void {
  if (term.value) term.value.write(data)
  else lastWritten += data
}

function flushPending(): void {
  if (term.value && lastWritten) {
    term.value.write(lastWritten)
    lastWritten = ''
  }
}

function closeMenu(): void {
  menu.open = false
}

function onContextMenu(ev: MouseEvent): void {
  menu.open = true
  menu.x = ev.clientX
  menu.y = ev.clientY
}

async function copySelection(): Promise<void> {
  const sel = term.value?.getSelection()
  if (!sel) return
  try {
    // Try Electron IPC first (most reliable), fall back to navigator.clipboard
    if (window.electronAPI?.copyToClipboard) {
      await window.electronAPI.copyToClipboard(sel)
    } else {
      await navigator.clipboard.writeText(sel)
    }
  } catch (err) {
    console.warn('[xterm] copySelection failed:', err)
  }
  closeMenu()
}

async function pasteFromClipboard(): Promise<void> {
  if (!props.sessionId) return
  let text = ''
  try {
    text = await navigator.clipboard.readText()
  } catch {
    /* clipboard blocked */
  }
  if (text) {
    window.electronAPI.writeSession(props.sessionId, text)
  }
  closeMenu()
}

function selectAll(): void {
  term.value?.selectAll()
  closeMenu()
}

onMounted(() => {
  if (!hostEl.value) return
  term.value = new Terminal({
    fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace',
    fontSize: 12,
    cursorBlink: true,
    theme: {
      background: '#09090b',
      foreground: '#e4e4e7',
      cursor: '#fafafa',
      selectionBackground: '#3b82f6'
    }
  })
  fit = new FitAddon()
  term.value.loadAddon(fit)
  term.value.open(hostEl.value)

  const doFit = () => {
    if (!fit || !term.value || !props.sessionId) return
    try {
      fit.fit()
      window.electronAPI.resizeSession(props.sessionId, term.value.cols, term.value.rows)
    } catch {
      /* not ready */
    }
  }
  doFit()
  requestAnimationFrame(doFit)

  resizeObs = new ResizeObserver(() => doFit())
  resizeObs.observe(hostEl.value)

  term.value.onData((data) => {
    if (!props.sessionId) return
    window.electronAPI.writeSession(props.sessionId, data)
  })

  // Keyboard shortcuts: Cmd+C with selection copies; Cmd+V pastes.
  // Without selection, Cmd+C must NOT be intercepted (it should reach the pty
  // as a literal interrupt).
  term.value.attachCustomKeyEventHandler((ev) => {
    if (ev.type !== 'keydown') return true
    const isMod = ev.metaKey || ev.ctrlKey
    if (isMod && (ev.key === 'c' || ev.key === 'C')) {
      const sel = term.value?.getSelection()
      if (sel) {
        navigator.clipboard.writeText(sel).catch(() => undefined)
        term.value?.clearSelection()
        return false
      }
    }
    if (isMod && (ev.key === 'v' || ev.key === 'V')) {
      navigator.clipboard
        .readText()
        .then((t) => {
          if (t && props.sessionId) {
            window.electronAPI.writeSession(props.sessionId, t)
          }
        })
        .catch(() => undefined)
      return false
    }
    return true
  })

  unsubData = window.electronAPI.onSessionData((p) => {
    if (p.id !== props.sessionId) return
    writeSafe(p.data)
  })
  unsubExit = window.electronAPI.onSessionExit((p) => {
    if (p.id !== props.sessionId) return
    if (term.value) {
      term.value.write(`\r\n\x1b[33m[session exited: code=${p.exitCode}]\x1b[0m\r\n`)
    }
  })

  emit('ready')
  flushPending()
})

onBeforeUnmount(() => {
  unsubData?.()
  unsubExit?.()
  resizeObs?.disconnect()
  // Dispose the fit addon FIRST, then the terminal — otherwise the terminal's
  // internal addon cleanup throws "Could not dispose an addon that has not
  // been loaded" on Electron/Chromium in some lifecycle orders.
  try {
    fit?.dispose()
  } catch {
    /* addon may already be torn down */
  }
  fit = null
  if (term.value) {
    try {
      term.value.dispose()
    } catch {
      /* terminal may already be torn down */
    }
    term.value = null
  }
  document.removeEventListener('click', onDocClick)
})

/** Close the context menu on any outside click */
function onDocClick(): void {
  if (menu.open) closeMenu()
}
document.addEventListener('click', onDocClick)

watch(
  () => props.sessionId,
  async (id) => {
    if (!id || !term.value) return
    const buf = await window.electronAPI.replaySession(id)
    if (buf) term.value.write(buf)
  },
  { immediate: true }
)
</script>

<style scoped>
.xterm-host {
  width: 100%;
  height: 100%;
  background: #09090b;
  padding: 8px;
  overflow: hidden;
}

.xterm-menu {
  position: fixed;
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
  z-index: 2500;
  display: flex;
  flex-direction: column;
  min-width: 160px;
  padding: 4px;
}
.xterm-menu button {
  background: transparent;
  color: var(--text);
  border: none;
  padding: 6px 10px;
  text-align: left;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
}
.xterm-menu button:hover:not(:disabled) {
  background: var(--bg-hover);
}
.xterm-menu button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.xterm-menu hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 4px 0;
}
</style>