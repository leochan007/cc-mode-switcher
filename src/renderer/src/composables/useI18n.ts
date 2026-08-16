import { ref, watch } from 'vue'
import en from '../i18n/en'
import zh from '../i18n/zh'

export type Locale = 'en' | 'zh'

const STORAGE_KEY = 'cc_locale'

const messages: Record<Locale, Record<string, unknown>> = { en, zh }

function loadLocale(): Locale {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'zh' ? 'zh' : 'en'
  } catch {
    return 'en'
  }
}

// Module-level singleton; defaults to English
const locale = ref<Locale>(loadLocale())

watch(locale, (v) => {
  try {
    localStorage.setItem(STORAGE_KEY, v)
  } catch {}
  document.documentElement.dataset.locale = v
})
// keep the <html> attribute in sync from the start
document.documentElement.dataset.locale = locale.value

function lookup(obj: Record<string, unknown>, key: string): string | undefined {
  const val = key.split('.').reduce<unknown>((o, p) => {
    if (o && typeof o === 'object') return (o as Record<string, unknown>)[p]
    return undefined
  }, obj)
  return typeof val === 'string' ? val : undefined
}

export function useI18n() {
  /** Translate a dotted key, with `{param}` interpolation; falls back to English, then the key */
  function t(key: string, params?: Record<string, string | number | undefined>): string {
    let s = lookup(messages[locale.value], key) ?? lookup(messages.en, key) ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) s = s.split(`{${k}}`).join(String(v))
      }
    }
    return s
  }

  function toggleLocale(): void {
    locale.value = locale.value === 'en' ? 'zh' : 'en'
  }

  return { locale, t, toggleLocale }
}
