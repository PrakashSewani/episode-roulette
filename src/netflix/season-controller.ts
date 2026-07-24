import type { SeasonDescriptor } from '../types'
import { SeasonControllerError } from '../types'
import { resilientQuery, resilientQueryAll, waitForElement } from './dom-utils'
import {
  EPISODE_SELECTOR,
  EPISODE_ROW,
  SEASON_DROPDOWN_ITEM,
  SEASON_DROPDOWN_MENU,
  SEASON_DROPDOWN_TOGGLE,
  SECTION_EXPAND,
} from './selectors'

const IMPLICIT_SEASON: SeasonDescriptor = {
  key: 'implicit',
  label: 'Episodes',
  seasonNumber: null,
  expectedEpisodeCount: null,
}

function createAbortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError')
}

function assertNotAborted(signal: AbortSignal): void {
  if (signal.aborted) throw createAbortError()
}

function remainingTime(deadline: number): number {
  return Math.max(0, deadline - performance.now())
}

function normalizeLines(element: Element): string[] {
  const value = 'innerText' in element && typeof element.innerText === 'string'
    ? element.innerText
    : element.textContent ?? ''
  return value
    .normalize('NFKC')
    .split(/\r?\n/u)
    .map((line) => line.trim().replace(/\s+/gu, ' '))
    .filter(Boolean)
}

function parseSeasonIdentity(label: string): Pick<SeasonDescriptor, 'key' | 'label' | 'seasonNumber'> {
  const normalizedLabel = label.normalize('NFKC').trim().replace(/\s+/gu, ' ')
  if (normalizedLabel === '') {
    throw new SeasonControllerError('unsupported-layout', 'Season label is empty')
  }

  const seasonMatch = normalizedLabel.match(/^season (\d+)$/iu)
  const seasonNumber = seasonMatch?.[1] === undefined
    ? null
    : Number(seasonMatch[1])
  if (seasonNumber !== null) {
    if (!Number.isSafeInteger(seasonNumber) || seasonNumber <= 0) {
      throw new SeasonControllerError(
        'unsupported-layout',
        `Unsupported season option: ${normalizedLabel}`,
      )
    }
    return {
      key: `season ${seasonNumber}`,
      label: normalizedLabel,
      seasonNumber,
    }
  }

  return {
    key: `label:${normalizedLabel.toLocaleLowerCase('en-US')}`,
    label: normalizedLabel,
    seasonNumber: null,
  }
}

function parseSeasonElement(element: Element): SeasonDescriptor | null {
  const lines = normalizeLines(element)
  const firstLine = lines[0] ?? ''
  if (/^see all episodes$/iu.test(firstLine)) return null
  const identity = parseSeasonIdentity(firstLine)

  let expectedEpisodeCount: number | null = null
  for (const line of lines.slice(1)) {
    const countMatch = line.match(/^\((\d+) episodes?\)$/iu)
    if (countMatch?.[1] === undefined) continue
    const count = Number(countMatch[1])
    if (Number.isSafeInteger(count) && count > 0) {
      expectedEpisodeCount = count
      break
    }
  }

  return {
    ...identity,
    expectedEpisodeCount,
  }
}

function snapshotRows(root: ParentNode): string {
  return JSON.stringify(getValidEpisodeRows(root).map((row, index) => [
    row.getAttribute('aria-label') ?? '',
    (row.textContent ?? '').normalize('NFKC').trim().replace(/\s+/gu, ' '),
    index,
  ]))
}

function minimumReadyRowCount(season: SeasonDescriptor): number {
  return season.expectedEpisodeCount !== null && season.expectedEpisodeCount >= 2 ? 2 : 1
}

function resolveLiveEpisodeSelector(titleRoot: HTMLElement): HTMLElement | null {
  const candidates = new Set<HTMLElement>()
  for (const selector of EPISODE_SELECTOR.selectors) {
    for (const match of titleRoot.querySelectorAll<HTMLElement>(selector)) {
      candidates.add(match)
    }
  }
  const valid = [...candidates].filter((element) => element.isConnected && isVisible(element))
  return valid.length === 1 ? valid[0]! : null
}

function waitForCondition(
  root: Node,
  deadline: number,
  signal: AbortSignal,
  reason: 'render-timeout' | 'transition-timeout' | 'expansion-failed',
  condition: () => boolean,
  observeOptions: MutationObserverInit = { childList: true, subtree: true, attributes: true },
): Promise<void> {
  assertNotAborted(signal)
  if (condition()) return Promise.resolve()

  const timeout = remainingTime(deadline)
  if (timeout <= 0) {
    return Promise.reject(new SeasonControllerError(reason, 'Season operation timed out'))
  }

  return new Promise((resolve, reject) => {
    let observer: MutationObserver | null = new MutationObserver(() => {
      if (condition()) settle(resolve)
    })
    let timer: number | null = window.setTimeout(() => {
      settle(() => reject(new SeasonControllerError(reason, 'Season operation timed out')))
    }, timeout)
    const abort = (): void => settle(() => reject(createAbortError()))
    const settle = (complete: () => void): void => {
      observer?.disconnect()
      observer = null
      if (timer !== null) window.clearTimeout(timer)
      timer = null
      signal.removeEventListener('abort', abort)
      complete()
    }

    observer.observe(root, observeOptions)
    signal.addEventListener('abort', abort, { once: true })
  })
}

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element)
  const hasLayoutBox = [...element.getClientRects()].some(
    (rect) => rect.width > 0 && rect.height > 0,
  )

  return hasLayoutBox
    && style.display !== 'none'
    && style.visibility !== 'hidden'
}

export function getValidEpisodeRows(episodeSelector: ParentNode): HTMLElement[] {
  const candidates = new Set<HTMLElement>()

  for (const selector of EPISODE_ROW.selectors) {
    for (const match of episodeSelector.querySelectorAll<HTMLElement>(selector)) {
      candidates.add(match)
    }
  }

  return [...candidates]
    .filter((row) => (
      row.isConnected
      && row.getAttribute('role') === 'button'
      && isVisible(row)
    ))
    .sort((left, right) => (
      left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_PRECEDING
        ? 1
        : -1
    ))
}

export async function enumerateSeasons(
  titleRoot: HTMLElement,
  episodeSelector: HTMLElement,
  deadline: number,
  signal: AbortSignal,
): Promise<SeasonDescriptor[]> {
  assertNotAborted(signal)
  const toggle = resilientQuery<HTMLElement>(SEASON_DROPDOWN_TOGGLE.selectors, episodeSelector)
  if (toggle === null) {
    if (getValidEpisodeRows(episodeSelector).length > 0) return [IMPLICIT_SEASON]
    throw new SeasonControllerError('unsupported-layout', 'No supported season control')
  }

  let menu = resilientQuery<HTMLElement>(SEASON_DROPDOWN_MENU.selectors, titleRoot)
  if (menu === null) {
    toggle.click()
    menu = await waitForElement<HTMLElement>(
      SEASON_DROPDOWN_MENU.selectors,
      remainingTime(deadline),
      titleRoot,
      signal,
    )
  }
  if (menu === null) {
    throw new SeasonControllerError('render-timeout', 'Season menu did not render')
  }

  try {
    const descriptors: SeasonDescriptor[] = []
    const keys = new Set<string>()
    for (const item of resilientQueryAll<HTMLElement>(SEASON_DROPDOWN_ITEM.selectors, menu)) {
      const descriptor = parseSeasonElement(item)
      if (descriptor === null) continue
      if (keys.has(descriptor.key)) {
        throw new SeasonControllerError(
          'unsupported-layout',
          `Duplicate season option: ${descriptor.key}`,
        )
      }
      keys.add(descriptor.key)
      descriptors.push(descriptor)
    }
    if (descriptors.length === 0) {
      throw new SeasonControllerError('unsupported-layout', 'No supported seasons found')
    }
    return descriptors
  } finally {
    if (menu.isConnected || toggle.getAttribute('aria-expanded') === 'true') {
      toggle.click()
    }
  }
}

export function getActiveSeasonKey(episodeSelector: ParentNode): string | null {
  const toggle = resilientQuery(SEASON_DROPDOWN_TOGGLE.selectors, episodeSelector)
  if (toggle === null) {
    return getValidEpisodeRows(episodeSelector).length > 0 ? 'implicit' : null
  }

  try {
    return parseSeasonElement(toggle)?.key ?? null
  } catch {
    return null
  }
}

export async function activateSeason(
  titleRoot: HTMLElement,
  episodeSelector: HTMLElement,
  season: SeasonDescriptor,
  deadline: number,
  signal: AbortSignal,
): Promise<HTMLElement> {
  assertNotAborted(signal)
  const activeKey = getActiveSeasonKey(episodeSelector)
  if (activeKey === season.key && episodeSelector.isConnected) {
    return episodeSelector
  }

  if (season.key === 'implicit' || activeKey === 'implicit') {
    throw new SeasonControllerError('strategy-mismatch', 'Season strategy changed')
  }

  const toggle = resilientQuery<HTMLElement>(SEASON_DROPDOWN_TOGGLE.selectors, episodeSelector)
  if (toggle === null) {
    throw new SeasonControllerError('strategy-mismatch', 'Season dropdown is missing')
  }

  const previousSnapshot = snapshotRows(episodeSelector)
  let menu = resilientQuery<HTMLElement>(SEASON_DROPDOWN_MENU.selectors, titleRoot)
  if (menu === null) {
    toggle.click()
    menu = await waitForElement<HTMLElement>(
      SEASON_DROPDOWN_MENU.selectors,
      remainingTime(deadline),
      titleRoot,
      signal,
    )
  }
  if (menu === null) {
    throw new SeasonControllerError('render-timeout', 'Season menu did not render')
  }

  const matchingItems = resilientQueryAll<HTMLElement>(SEASON_DROPDOWN_ITEM.selectors, menu)
    .filter((item) => {
      try {
        return parseSeasonElement(item)?.key === season.key
      } catch {
        return false
      }
    })
  if (matchingItems.length !== 1) {
    if (menu.isConnected) toggle.click()
    throw new SeasonControllerError('season-missing', `Season not found: ${season.key}`)
  }

  matchingItems[0]!.click()
  let liveEpisodeSelector: HTMLElement | null = null
  await waitForCondition(
    titleRoot,
    deadline,
    signal,
    'transition-timeout',
    () => {
      const current = resolveLiveEpisodeSelector(titleRoot)
      if (
        current === null
        || getActiveSeasonKey(current) !== season.key
        || snapshotRows(current) === previousSnapshot
        || getValidEpisodeRows(current).length < minimumReadyRowCount(season)
      ) {
        return false
      }
      liveEpisodeSelector = current
      return true
    },
  )
  const resolvedEpisodeSelector = liveEpisodeSelector as HTMLElement | null
  if (resolvedEpisodeSelector === null) {
    throw new SeasonControllerError('transition-timeout', 'Season transition did not resolve')
  }
  return resolvedEpisodeSelector
}

function waitForStableRows(
  episodeSelector: HTMLElement,
  season: SeasonDescriptor,
  deadline: number,
  signal: AbortSignal,
): Promise<HTMLElement[]> {
  assertNotAborted(signal)

  return new Promise((resolve, reject) => {
    let observer: MutationObserver | null = null
    let frameId: number | null = null
    let timer: number | null = null
    let previousSnapshot: string | null = null
    let stableFrames = 0

    const cleanup = (): void => {
      observer?.disconnect()
      observer = null
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      if (timer !== null) window.clearTimeout(timer)
      signal.removeEventListener('abort', abort)
    }
    const abort = (): void => {
      cleanup()
      reject(createAbortError())
    }
    const check = (): void => {
      assertNotAborted(signal)
      const rows = getValidEpisodeRows(episodeSelector)
      const snapshot = snapshotRows(episodeSelector)
      if (rows.length < minimumReadyRowCount(season)) {
        stableFrames = 0
      } else if (snapshot === previousSnapshot) {
        stableFrames += 1
      } else {
        stableFrames = 0
      }
      previousSnapshot = snapshot
      if (stableFrames >= 2) {
        cleanup()
        resolve(rows)
        return
      }
      frameId = window.requestAnimationFrame(check)
    }

    observer = new MutationObserver(() => {})
    observer.observe(episodeSelector, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'role'],
    })
    timer = window.setTimeout(() => {
      cleanup()
      reject(new SeasonControllerError('render-timeout', 'Episode rows did not stabilize'))
    }, remainingTime(deadline))
    signal.addEventListener('abort', abort, { once: true })
    frameId = window.requestAnimationFrame(check)
  })
}

export async function expandAndValidateSeason(
  episodeSelector: HTMLElement,
  season: SeasonDescriptor,
  deadline: number,
  signal: AbortSignal,
): Promise<HTMLElement[]> {
  assertNotAborted(signal)
  const expand = resilientQuery<HTMLElement>(SECTION_EXPAND.selectors, episodeSelector)
  if (expand !== null) {
    expand.click()
    await waitForCondition(
      episodeSelector,
      deadline,
      signal,
      'expansion-failed',
      () => resilientQuery(SECTION_EXPAND.selectors, episodeSelector) === null,
    )
  }

  const rows = await waitForStableRows(episodeSelector, season, deadline, signal)
  if (resilientQuery(SECTION_EXPAND.selectors, episodeSelector) !== null) {
    throw new SeasonControllerError('expansion-failed', 'Expand control is still present')
  }
  if (
    season.expectedEpisodeCount !== null
    && rows.length !== season.expectedEpisodeCount
  ) {
    throw new SeasonControllerError(
      'count-mismatch',
      `Expected ${season.expectedEpisodeCount} episodes, found ${rows.length}`,
    )
  }
  return rows
}
