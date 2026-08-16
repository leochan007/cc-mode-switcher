import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
}

// Module-level singleton so any component can push toasts
const toasts = ref<ToastItem[]>([])
let seq = 0

export function useToast() {
  function push(type: ToastType, message: string, duration = 3500): void {
    const id = ++seq
    toasts.value.push({ id, type, message })
    setTimeout(() => dismiss(id), duration)
  }

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return {
    toasts,
    dismiss,
    success: (msg: string) => push('success', msg),
    error: (msg: string) => push('error', msg),
    info: (msg: string) => push('info', msg)
  }
}
