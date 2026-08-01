import type { PopupMessage, PopupMessageResponse, PopupStatus } from '../types'

const PREFIX = '[Episode Roulette][popup]'

function log(message: string, details?: unknown): void {
  if (details === undefined) console.log(`${PREFIX} ${message}`)
  else console.log(`${PREFIX} ${message}`, details)
}

const statusEl = document.getElementById('status') as HTMLParagraphElement | null
const rollEl = document.getElementById('roll') as HTMLButtonElement | null

const statusText: Record<PopupStatus, string> = {
  'no-series': 'Open a Netflix TV series to roll a random episode.',
  'ready': 'Series detected. Click to roll a random episode.',
  'loading': 'Rolling... discovering all seasons.',
  'error': 'Last attempt failed. Click to try again.',
}

function setStatus(status: PopupStatus): void {
  log('setStatus', { status, rollDisabled: status === 'no-series' || status === 'loading' })
  if (statusEl !== null) {
    statusEl.textContent = statusText[status] ?? status
  }
  if (rollEl !== null) {
    rollEl.disabled = status === 'no-series' || status === 'loading'
    rollEl.classList.toggle('rolling', status === 'loading')
  }
}

async function sendMessage(message: PopupMessage): Promise<PopupMessageResponse | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const tab = tabs[0]
  if (tab?.id === undefined) {
    log('sendMessage: no active tab')
    return null
  }
  try {
    log('sendMessage', { type: message.type, tabId: tab.id })
    const response = await chrome.tabs.sendMessage(tab.id, message) as PopupMessageResponse
    log('sendMessage response', response)
    return response ?? null
  } catch (error) {
    log('sendMessage failed', error)
    return null
  }
}

async function refreshStatus(): Promise<void> {
  setStatus('no-series')
  const response = await sendMessage({ type: 'getStatus' })
  if (response?.type === 'status') {
    setStatus(response.status)
  }
}

async function handleRoll(): Promise<void> {
  if (rollEl === null || rollEl.disabled) {
    log('roll click ignored', { disabled: rollEl?.disabled ?? true })
    return
  }
  log('roll clicked')
  setStatus('loading')
  const response = await sendMessage({ type: 'roll' })
  if (response?.type === 'roll-accepted') {
    log('roll accepted; closing popup')
    window.close()
    return
  }
  if (response?.type === 'roll-rejected') {
    log('roll rejected', response)
    setStatus('no-series')
  }
  setTimeout(() => void refreshStatus(), 500)
}

if (rollEl !== null) {
  rollEl.addEventListener('click', () => void handleRoll())
}

log('popup opened')
void refreshStatus()
