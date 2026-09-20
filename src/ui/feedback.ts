const DEFAULT_DURATION_MS = 5_000
const EXIT_DURATION_MS = 300

let currentToast: HTMLElement | null = null
let dismissTimer: number | null = null
let exitTimer: number | null = null
let toastToken = 0

type ToastKind = 'error' | 'status'

export interface ToastAction {
  label: string
  href: string
}

export interface ErrorToastOptions {
  duration?: number
  action?: ToastAction
}

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

function createToast(
  message: string,
  kind: ToastKind,
  action?: ToastAction,
): HTMLDivElement {
  const toast = document.createElement('div')
  toast.className = 'ep-roulette-toast'
  toast.dataset.kind = kind
  toast.setAttribute('role', kind === 'error' ? 'alert' : 'status')
  toast.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite')

  const text = document.createElement('span')
  text.className = 'ep-roulette-toast-text'
  text.textContent = message
  toast.append(text)

  if (action !== undefined) {
    const dismissSelf = (): void => {
      if (currentToast === toast) {
        dismissToast()
      }
    }

    const link = document.createElement('a')
    link.className = 'ep-roulette-toast-action'
    link.href = action.href
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.textContent = action.label
    link.addEventListener('click', dismissSelf)
    toast.append(link)

    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'ep-roulette-toast-close'
    close.setAttribute('aria-label', 'Dismiss notification')
    close.textContent = '✕'
    close.addEventListener('click', dismissSelf)
    toast.append(close)
  }

  return toast
}

function showToast(
  message: string,
  kind: ToastKind,
  duration = DEFAULT_DURATION_MS,
  action?: ToastAction,
): void {
  dismissToast()
  const token = toastToken
  const toast = createToast(message, kind, action)
  document.body.append(toast)
  currentToast = toast

  if (action !== undefined) {
    // The snackbar carries a user action, so it stays until the user takes it,
    // dismisses it, or navigation cleanup removes it.
    return
  }

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
  options: ErrorToastOptions = {},
): void {
  showToast(message, 'error', options.duration, options.action)
}

export function showStatusToast(
  message: string,
  duration = DEFAULT_DURATION_MS,
): void {
  showToast(message, 'status', duration)
}
