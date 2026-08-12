import { logInfo, logWarning } from '../debug'
import type { ButtonController, ButtonPlacement, ButtonState } from '../types'

const BUTTON_SELECTOR = '[data-uia="random-episode-btn"]'
interface OwnedButton {
  root: HTMLElement
  element: HTMLButtonElement
  controller: ButtonController
}

interface PendingButton {
  root: HTMLElement
  element: HTMLButtonElement
  promise: Promise<ButtonController | null>
}

let ownedButton: OwnedButton | null = null
let pendingButton: PendingButton | null = null

function createButton(): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'ep-roulette-btn'
  button.dataset.uia = 'random-episode-btn'

  const icon = document.createElement('span')
  icon.className = 'ep-roulette-icon'
  icon.setAttribute('aria-hidden', 'true')
  icon.textContent = '🎲'

  const text = document.createElement('span')
  text.className = 'ep-roulette-text'
  text.textContent = 'Random Episode'

  button.append(icon, text)
  return button
}

function createSpawnIndicator(): HTMLButtonElement {
  const button = createButton()
  const text = button.querySelector<HTMLElement>('.ep-roulette-text')

  button.dataset.phase = 'spawn'
  if (text !== null) {
    text.textContent = 'Loading Episode Roulette'
  }
  applyState(button, 'loading')
  button.setAttribute('aria-label', 'Loading Episode Roulette')
  return button
}

function applyState(
  button: HTMLButtonElement,
  state: ButtonState,
  errorMessage?: string,
): void {
  button.dataset.state = state
  button.setAttribute('aria-label', state === 'error' && errorMessage
    ? `Random Episode. Error: ${errorMessage}`
    : 'Random Episode')

  if (state === 'loading') {
    button.disabled = true
    button.setAttribute('aria-disabled', 'true')
    button.setAttribute('aria-busy', 'true')
  } else {
    button.disabled = false
    button.setAttribute('aria-disabled', 'false')
    button.removeAttribute('aria-busy')
  }

  if (state === 'error' && errorMessage) {
    button.dataset.error = errorMessage
  } else {
    delete button.dataset.error
  }
}

function createAbortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError')
}

function waitForPlacement(
  placementPromise: Promise<ButtonPlacement | null>,
  signal: AbortSignal,
): Promise<ButtonPlacement | null> {
  if (signal.aborted) {
    return Promise.reject(createAbortError())
  }

  return new Promise((resolve, reject) => {
    const abort = (): void => {
      signal.removeEventListener('abort', abort)
      reject(createAbortError())
    }
    signal.addEventListener('abort', abort, { once: true })
    placementPromise.then(
      (placement) => {
        signal.removeEventListener('abort', abort)
        resolve(placement)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', abort)
        reject(error)
      },
    )
  })
}

function createController(
  root: HTMLElement,
  button: HTMLButtonElement,
): ButtonController {
  let state: ButtonState = 'ready'
  let clickHandler: (() => void) | null = null

  const controller: ButtonController = {
    setState(nextState, errorMessage) {
      logInfo('Button setState', {
        from: state,
        to: nextState,
        disabled: nextState === 'loading',
        errorMessage: errorMessage ?? null,
      })
      state = nextState
      applyState(button, nextState, errorMessage)
    },
    getState() {
      return state
    },
    onClick(handler) {
      clickHandler = handler
      logInfo('Button click handler registered')
    },
    remove() {
      logInfo('Button removed from DOM', { state })
      button.remove()
      if (ownedButton?.controller === controller) {
        ownedButton = null
      }
    },
  }

  button.addEventListener('click', () => {
    logInfo('Button DOM click', {
      state,
      disabled: button.disabled,
      hasHandler: clickHandler !== null,
      phase: button.dataset.phase ?? 'ready',
    })
    if (state === 'loading' || clickHandler === null) {
      logWarning('Button click ignored', {
        reason: state === 'loading' ? 'loading' : 'no-handler',
        state,
        disabled: button.disabled,
      })
      return
    }

    if (state === 'error') {
      controller.setState('loading')
    }
    clickHandler()
  })

  controller.setState('ready')
  ownedButton = { root, element: button, controller }
  logInfo('Ready button controller created', {
    disabled: button.disabled,
    state: button.dataset.state,
  })
  return controller
}

export async function injectButton(
  root: HTMLElement,
  placementPromise: Promise<ButtonPlacement | null>,
  signal: AbortSignal,
): Promise<ButtonController | null> {

  if (
    ownedButton !== null
    && ownedButton.root === root
    && ownedButton.element.isConnected
    && root.contains(ownedButton.element)
  ) {
    logInfo('Reusing existing ready button for same root')
    return ownedButton.controller
  }

  if (pendingButton?.root === root && pendingButton.element.isConnected) {
    logInfo('Reusing in-flight button injection for same root')
    return pendingButton.promise
  }

  if (ownedButton !== null) {
    if (ownedButton.element.isConnected) {
      logWarning('Another connected button exists on a different root; skip inject')
      return null
    }
    ownedButton.controller.remove()
  }
  pendingButton?.element.remove()
  pendingButton = null
  for (const orphan of root.querySelectorAll(BUTTON_SELECTOR)) {
    orphan.remove()
  }

  if (signal.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError')
  }

  logInfo('Showing spawn indicator')
  const indicator = createSpawnIndicator()
  root.append(indicator)

  const pending: PendingButton = {
    root,
    element: indicator,
    promise: Promise.resolve(null),
  }
  const promise = (async (): Promise<ButtonController | null> => {
    try {
      const placement = await waitForPlacement(placementPromise, signal)
      if (pendingButton !== pending) {
        logInfo('Pending button injection superseded')
        return null
      }
      if (placement === null) {
        logWarning('Provider button placement was unavailable')
        return null
      }
      if (signal.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError')
      }

      if (ownedButton !== null) {
        if (
          ownedButton.root === root
          && ownedButton.element.isConnected
          && root.contains(ownedButton.element)
        ) {
          logInfo('Owned button appeared while waiting; reusing')
          return ownedButton.controller
        }
        if (ownedButton.element.isConnected) {
          logWarning('Owned button connected on another root; skip inject')
          return null
        }
        ownedButton.controller.remove()
      }

      const button = createButton()
      placement.place(button)
      logInfo('Inserted ready button through provider placement')
      return createController(root, button)
    } finally {
      indicator.remove()
      if (pendingButton === pending) {
        pendingButton = null
      }
    }
  })()

  pending.promise = promise
  pendingButton = pending
  return promise
}
