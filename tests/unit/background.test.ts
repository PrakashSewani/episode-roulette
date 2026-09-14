import { beforeEach, describe, expect, it, vi } from 'vitest'

const INSTALL_URL = 'https://episode-roulette.prakashsewani.com/thanks'
const UNINSTALL_URL = 'https://episode-roulette.prakashsewani.com/uninstalled'

interface InstalledDetails {
  reason: string
}

interface Harness {
  listeners: ((details: InstalledDetails) => void)[]
  setUninstallURL: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
}

function createHarness(
  options: { hasSetUninstallURL?: boolean; createRejects?: boolean } = {},
): Harness {
  const listeners: ((details: InstalledDetails) => void)[] = []
  const setUninstallURL = vi.fn()
  const create = options.createRejects
    ? vi.fn(() => Promise.reject(new Error('tabs.create failed')))
    : vi.fn(() => Promise.resolve({ id: 1 }))

  const runtime: Record<string, unknown> = {
    onInstalled: {
      addListener: (listener: (details: InstalledDetails) => void) => {
        listeners.push(listener)
      },
    },
  }

  if (options.hasSetUninstallURL !== false) {
    runtime.setUninstallURL = setUninstallURL
  }

  globalThis.chrome = { runtime, tabs: { create } } as unknown as typeof chrome

  return { listeners, setUninstallURL, create }
}

async function loadBackgroundWorker(): Promise<void> {
  vi.resetModules()
  await import('../../src/background')
}

beforeEach(() => {
  vi.resetModules()
})

describe('background onboarding hooks', () => {
  it('registers the uninstall survey URL when the worker starts', async () => {
    const harness = createHarness()

    await loadBackgroundWorker()

    expect(harness.setUninstallURL).toHaveBeenCalledWith(UNINSTALL_URL)
  })

  it('opens the onboarding page on a fresh install', async () => {
    const harness = createHarness()

    await loadBackgroundWorker()
    harness.listeners[0]?.({ reason: 'install' })

    expect(harness.create).toHaveBeenCalledWith({ url: INSTALL_URL })
  })

  it('does not open the onboarding page on update', async () => {
    const harness = createHarness()

    await loadBackgroundWorker()
    harness.listeners[0]?.({ reason: 'update' })

    expect(harness.create).not.toHaveBeenCalled()
    expect(harness.setUninstallURL).toHaveBeenCalledTimes(2)
  })

  it('skips the uninstall hook when the browser does not implement it', async () => {
    const harness = createHarness({ hasSetUninstallURL: false })

    await expect(loadBackgroundWorker()).resolves.toBeUndefined()
    harness.listeners[0]?.({ reason: 'install' })

    expect(harness.setUninstallURL).not.toHaveBeenCalled()
    expect(harness.create).toHaveBeenCalledWith({ url: INSTALL_URL })
  })

  it('logs a rejected onboarding tab without throwing', async () => {
    const harness = createHarness({ createRejects: true })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await loadBackgroundWorker()
    expect(() => harness.listeners[0]?.({ reason: 'install' })).not.toThrow()

    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalled()
    })
  })
})
