import type { PopupMessage, PopupMessageResponse, PopupStatus } from '../types'

const statusEl = document.getElementById('status') as HTMLParagraphElement | null
const rollEl = document.getElementById('roll') as HTMLButtonElement | null

const statusText: Record<PopupStatus, string> = {
  'no-series': 'Open a Netflix TV series to roll a random episode.',
  'ready': 'Series detected. Click to roll a random episode.',
  'loading': 'Rolling... discovering all seasons.',
  'error': 'Last attempt failed. Click to try again.',
}

function setStatus(status: PopupStatus): void {
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
  if (tab?.id === undefined) return null
  try {
    const response = await chrome.tabs.sendMessage(tab.id, message) as PopupMessageResponse
    return response ?? null
  } catch {
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
  if (rollEl === null || rollEl.disabled) return
  setStatus('loading')
  const response = await sendMessage({ type: 'roll' })
  if (response?.type === 'roll-accepted') {
    window.close()
    return
  }
  if (response?.type === 'roll-rejected') {
    setStatus('no-series')
  }
  setTimeout(() => void refreshStatus(), 500)
}

if (rollEl !== null) {
  rollEl.addEventListener('click', () => void handleRoll())
}

void refreshStatus()
