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

function createAbortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError')
}

export function waitForElement<T extends Element = HTMLElement>(
  selectors: string[],
  timeoutMs: number,
  root: ParentNode,
  signal: AbortSignal,
): Promise<T | null> {
  if (signal.aborted) {
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
      signal.removeEventListener('abort', handleAbort)
      complete()
    }

    observer.observe(root as Node, { childList: true, subtree: true })
    signal.addEventListener('abort', handleAbort, { once: true })
  })
}
