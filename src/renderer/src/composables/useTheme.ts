import { ref, watch } from 'vue'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'cc_theme'

function loadTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

// Module-level singleton; defaults to dark
const theme = ref<Theme>(loadTheme())

function apply(t: Theme): void {
  document.documentElement.dataset.theme = t
}

watch(theme, (v) => {
  try {
    localStorage.setItem(STORAGE_KEY, v)
  } catch {}
  apply(v)
})
// apply before first paint (main.ts imports this module early)
apply(theme.value)

export function useTheme() {
  function toggleTheme(): void {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  return { theme, toggleTheme }
}
