export function resilientQuery<T extends Element = HTMLElement>(
  selectors: string[],
  root: ParentNode = document,
): T | null {
  for (const selector of selectors) {
    const match = root.querySelector<T>(selector)
    if (match !== null) {
      return match
    }
  }

  return null
}

export function resilientQueryAll<T extends Element = HTMLElement>(
  selectors: string[],
  root: ParentNode = document,
): T[] {
  for (const selector of selectors) {
    const matches = [...root.querySelectorAll<T>(selector)]
    if (matches.length > 0) {
      return matches
    }
  }

  return []
}

export function getTextContent(
  selectors: string[],
  root: ParentNode,
): string | null {
  const text = resilientQuery(selectors, root)?.textContent?.trim()
  return text ? text : null
}

function createAbortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError')
}

export function waitForElement<T extends Element = HTMLElement>(
  selectors: string[],
  timeoutMs = 5_000,
  root: Element = document.body,
  signal?: AbortSignal,
): Promise<T | null> {
  if (signal?.aborted) {
    return Promise.reject(createAbortError())
  }

  const existing = resilientQuery<T>(selectors, root)
  if (existing !== null) {
    return Promise.resolve(existing)
  }

  return new Promise((resolve, reject) => {
    let observer: MutationObserver | null = new MutationObserver(() => {
      const match = resilientQuery<T>(selectors, root)
      if (match !== null) {
        settle(() => resolve(match))
      }
    })
    let livenessObserver: MutationObserver | null = null
    let timeoutId: number | null = window.setTimeout(() => {
      settle(() => resolve(null))
    }, timeoutMs)

    const handleAbort = (): void => {
      settle(() => reject(createAbortError()))
    }

    const settle = (complete: () => void): void => {
      observer?.disconnect()
      observer = null
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
      livenessObserver?.disconnect()
      livenessObserver = null
      signal?.removeEventListener('abort', handleAbort)
      complete()
    }

    observer.observe(root as Node, { childList: true, subtree: true })
    if (root !== document.body && root.ownerDocument?.documentElement !== null) {
      livenessObserver = new MutationObserver(() => {
        if (!root.isConnected) {
          settle(() => resolve(null))
        }
      })
      livenessObserver.observe(root.ownerDocument.documentElement, {
        childList: true,
        subtree: true,
      })
    }
    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}
