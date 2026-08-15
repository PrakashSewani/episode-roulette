/**
 * Production diagnostics.
 *
 * `logInfo` is silenced for store shipping: verbose pre-publish tracing is
 * not needed in production. `logWarning` and `logError` remain for real
 * operational failures (see docs/error-handling.md).
 */

const PREFIX = '[Episode Roulette]'

export function logInfo(_message: string, _details?: unknown): void {
  // Silenced in production builds.
}

export function logWarning(message: string, details?: unknown): void {
  if (details === undefined) {
    console.warn(`${PREFIX} ${message}`)
    return
  }
  console.warn(`${PREFIX} ${message}`, details)
}

export function logError(message: string, details?: unknown): void {
  if (details === undefined) {
    console.error(`${PREFIX} ${message}`)
    return
  }
  console.error(`${PREFIX} ${message}`, details)
}
