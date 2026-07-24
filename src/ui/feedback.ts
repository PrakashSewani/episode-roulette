const DEFAULT_DURATION_MS = 5_000
const EXIT_DURATION_MS = 300

let currentToast: HTMLElement | null = null
let dismissTimer: number | null = null
let exitTimer: number | null = null
let toastToken = 0

type ToastKind = 'error' | 'status'

function clearTimers(): void {
  if (dismissTimer !== null) {
    window.clearTimeout(dismissTimer)
    dismissTimer = null
  }
  if (exitTimer !== null) {
    window.clearTimeout(exitTimer)
    exitTimer = null
  }
}

export function dismissToast(): void {
  toastToken += 1
  clearTimers()
  currentToast?.remove()
  currentToast = null
}

function showToast(
  message: string,
  kind: ToastKind,
  duration = DEFAULT_DURATION_MS,
): void {
  dismissToast()
  const token = toastToken
  const toast = document.createElement('div')
  toast.className = 'ep-roulette-toast'
  toast.dataset.kind = kind
  toast.setAttribute('role', kind === 'error' ? 'alert' : 'status')
  toast.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite')
  toast.textContent = message
  document.body.append(toast)
  currentToast = toast

  dismissTimer = window.setTimeout(() => {
    if (toastToken !== token || currentToast !== toast) {
      return
    }

    dismissTimer = null
    toast.classList.add('ep-roulette-toast-exit')
    exitTimer = window.setTimeout(() => {
      if (toastToken !== token || currentToast !== toast) {
        return
      }

      exitTimer = null
      toast.remove()
      currentToast = null
    }, EXIT_DURATION_MS)
  }, duration)
}

export function showErrorToast(
  message: string,
  duration = DEFAULT_DURATION_MS,
): void {
  showToast(message, 'error', duration)
}

export function showStatusToast(
  message: string,
  duration = DEFAULT_DURATION_MS,
): void {
  showToast(message, 'status', duration)
}
