import { logInfo, logWarning } from '../debug'
import type { SeasonDescriptor } from '../types'
import { SeasonControllerError } from '../types'
import { isVisible, resilientQuery, resilientQueryAll, waitForElement } from './dom-utils'
import { parseEpisodeRowIdentity } from './episode-identity'
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

const TRAILING_EPISODE_COUNT = /\s*\(\s*(\d+)\s*episodes?\s*\)\s*$/iu
const STANDALONE_EPISODE_COUNT = /^\(\s*(\d+)\s*episodes?\s*\)$/iu

function parseTrailingEpisodeCount(line: string): { label: string; count: number | null } {
  const match = line.match(TRAILING_EPISODE_COUNT)
  if (match?.[1] === undefined) {
    return { label: line, count: null }
  }
  const count = Number(match[1])
  if (!Number.isSafeInteger(count) || count <= 0) {
    return { label: line, count: null }
  }
  const label = line.slice(0, match.index).normalize('NFKC').trim().replace(/\s+/gu, ' ')
  return { label, count }
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

  const { label: identityLine, count: trailingCount } = parseTrailingEpisodeCount(firstLine)
  if (identityLine === '') {
    throw new SeasonControllerError('unsupported-layout', 'Season label is empty')
  }
  const identity = parseSeasonIdentity(identityLine)

  let expectedEpisodeCount: number | null = trailingCount
  if (expectedEpisodeCount === null) {
    for (const line of lines.slice(1)) {
      const countMatch = line.match(STANDALONE_EPISODE_COUNT)
      if (countMatch?.[1] === undefined) continue
      const count = Number(countMatch[1])
      if (Number.isSafeInteger(count) && count > 0) {
        expectedEpisodeCount = count
        break
      }
    }
  }

  return {
    ...identity,
    expectedEpisodeCount,
  }
}

function snapshotRows(rows: HTMLElement[]): string {
  return JSON.stringify(rows.map((row, index) => {
    const identity = parseEpisodeRowIdentity(row, index)
    return [
      identity.normalizedTitle ?? '',
      identity.episodeNumber,
      index,
    ]
  }))
}

function minimumReadyRowCount(season: SeasonDescriptor): number {
  return season.expectedEpisodeCount !== null && season.expectedEpisodeCount >= 2 ? 2 : 1
}

export function resolveLiveEpisodeSelector(titleRoot: HTMLElement): HTMLElement | null {
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
  reason: 'render-timeout' | 'transition-timeout' | 'expansion-failed' | 'count-mismatch',
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

function classifySeasonControl(
  episodeSelector: HTMLElement,
): 'dropdown' | 'implicit' | null {
  if (resilientQuery(SEASON_DROPDOWN_TOGGLE.selectors, episodeSelector) !== null) {
    return 'dropdown'
  }
  if (getValidEpisodeRows(episodeSelector).length > 0) {
    return 'implicit'
  }
  return null
}

async function waitForSeasonControlReady(
  episodeSelector: HTMLElement,
  deadline: number,
  signal: AbortSignal,
): Promise<'dropdown' | 'implicit'> {
  const immediate = classifySeasonControl(episodeSelector)
  if (immediate !== null) return immediate

  logInfo('Waiting for season control readiness', {
    remainingMs: remainingTime(deadline),
  })
  let ready: 'dropdown' | 'implicit' | null = null
  try {
    await waitForCondition(
      episodeSelector,
      deadline,
      signal,
      'render-timeout',
      () => {
        ready = classifySeasonControl(episodeSelector)
        return ready !== null
      },
    )
  } catch (error) {
    if (error instanceof SeasonControllerError && error.reason === 'render-timeout') {
      throw new SeasonControllerError('unsupported-layout', 'No supported season control')
    }
    throw error
  }
  if (ready === null) {
    throw new SeasonControllerError('unsupported-layout', 'No supported season control')
  }
  logInfo('Season control ready', { strategy: ready })
  return ready
}

async function waitForDropdownToggle(
  episodeSelector: HTMLElement,
  deadline: number,
  signal: AbortSignal,
): Promise<HTMLElement> {
  const existing = resilientQuery<HTMLElement>(SEASON_DROPDOWN_TOGGLE.selectors, episodeSelector)
  if (existing !== null) return existing

  logInfo('Waiting for season dropdown toggle', {
    remainingMs: remainingTime(deadline),
  })
  const found = await waitForElement<HTMLElement>(
    SEASON_DROPDOWN_TOGGLE.selectors,
    remainingTime(deadline),
    episodeSelector,
    signal,
  )
  if (found === null) {
    throw new SeasonControllerError('strategy-mismatch', 'Season dropdown is missing')
  }
  logInfo('Season dropdown toggle appeared')
  return found
}

export async function enumerateSeasons(
  titleRoot: HTMLElement,
  episodeSelector: HTMLElement,
  deadline: number,
  signal: AbortSignal,
): Promise<SeasonDescriptor[]> {
  assertNotAborted(signal)
  const strategy = await waitForSeasonControlReady(episodeSelector, deadline, signal)
  if (strategy === 'implicit') {
    logInfo('enumerateSeasons: implicit single season')
    return [IMPLICIT_SEASON]
  }

  const toggle = resilientQuery<HTMLElement>(SEASON_DROPDOWN_TOGGLE.selectors, episodeSelector)
  if (toggle === null) {
    throw new SeasonControllerError('unsupported-layout', 'No supported season control')
  }

  logInfo('enumerateSeasons: opening custom dropdown', {
    toggleText: toggle.textContent?.trim() ?? '',
  })
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
    const items = resilientQueryAll<HTMLElement>(SEASON_DROPDOWN_ITEM.selectors, menu)
    logInfo('enumerateSeasons: menu items found', { count: items.length })
    for (const item of items) {
      const descriptor = parseSeasonElement(item)
      if (descriptor === null) {
        logInfo('enumerateSeasons: ignored menu item', {
          text: (item.textContent ?? '').trim().slice(0, 80),
        })
        continue
      }
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
    logInfo('enumerateSeasons: descriptors', {
      seasons: descriptors.map((season) => ({
        key: season.key,
        label: season.label,
        expectedEpisodeCount: season.expectedEpisodeCount,
      })),
    })
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
  if (season.key !== 'implicit') {
    await waitForDropdownToggle(episodeSelector, deadline, signal)
  }

  const activeKey = getActiveSeasonKey(episodeSelector)
  logInfo('activateSeason', {
    requestedKey: season.key,
    activeKey,
    remainingMs: remainingTime(deadline),
  })
  if (activeKey === season.key && episodeSelector.isConnected) {
    logInfo('activateSeason: already active; no click')
    return episodeSelector
  }

  if (season.key === 'implicit' || activeKey === 'implicit') {
    throw new SeasonControllerError('strategy-mismatch', 'Season strategy changed')
  }

  const toggle = resilientQuery<HTMLElement>(SEASON_DROPDOWN_TOGGLE.selectors, episodeSelector)
  if (toggle === null) {
    throw new SeasonControllerError('strategy-mismatch', 'Season dropdown is missing')
  }

  const previousSnapshot = snapshotRows(getValidEpisodeRows(episodeSelector))
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
    logWarning('activateSeason: unique menu match failed', {
      requestedKey: season.key,
      matchCount: matchingItems.length,
    })
    if (menu.isConnected) toggle.click()
    throw new SeasonControllerError('season-missing', `Season not found: ${season.key}`)
  }

  logInfo('activateSeason: clicking menu item', { key: season.key })
  matchingItems[0]!.click()
  let liveEpisodeSelector: HTMLElement | null = null
  await waitForCondition(
    titleRoot,
    deadline,
    signal,
    'transition-timeout',
    () => {
      const current = resolveLiveEpisodeSelector(titleRoot)
      if (current === null) {
        return false
      }
      if (getActiveSeasonKey(current) !== season.key) {
        return false
      }
      const currentRows = getValidEpisodeRows(current)
      if (snapshotRows(currentRows) === previousSnapshot) {
        return false
      }
      if (currentRows.length < minimumReadyRowCount(season)) {
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
  logInfo('activateSeason: transition complete', {
    key: season.key,
    rowCount: getValidEpisodeRows(resolvedEpisodeSelector).length,
  })
  return resolvedEpisodeSelector
}

function isScrollable(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element)
  const overflowY = style.overflowY
  return (
    (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
    && element.scrollHeight > element.clientHeight + 1
  )
}

function findNearestScrollable(start: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = start
  while (current !== null) {
    if (current === document.body || current === document.documentElement) {
      return null
    }
    if (isScrollable(current)) return current
    current = current.parentElement
  }
  return null
}

/** Encourage Netflix lazy episode loading when declared count is incomplete and expand is absent. */
function encourageMoreEpisodeRows(
  episodeSelector: HTMLElement,
  rows: HTMLElement[],
): void {
  // Scope to the episode list only — never scroll document/body (twitches the details modal).
  const scrollable = findNearestScrollable(episodeSelector)
  if (scrollable !== null) {
    scrollable.scrollTop = scrollable.scrollHeight
  }

  const lastRow = rows[rows.length - 1]
  if (lastRow !== undefined && typeof lastRow.scrollIntoView === 'function') {
    lastRow.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
}

function waitForStableRows(
  episodeSelector: HTMLElement,
  season: SeasonDescriptor,
  deadline: number,
  signal: AbortSignal,
): Promise<HTMLElement[]> {
  assertNotAborted(signal)

  return new Promise((resolve, reject) => {
    let frameId: number | null = null
    let timer: number | null = null
    let previousSnapshot: string | null = null
    let stableFrames = 0

    const cleanup = (): void => {
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
      const snapshot = snapshotRows(rows)
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
  logInfo('expandAndValidateSeason start', {
    key: season.key,
    expectedEpisodeCount: season.expectedEpisodeCount,
    remainingMs: remainingTime(deadline),
  })

  const incompleteCountMismatch = (found: number): SeasonControllerError => (
    new SeasonControllerError(
      'count-mismatch',
      `Expected ${season.expectedEpisodeCount} episodes, found ${found}`,
    )
  )

  while (true) {
    assertNotAborted(signal)
    if (remainingTime(deadline) <= 0) {
      const found = getValidEpisodeRows(episodeSelector).length
      if (
        season.expectedEpisodeCount !== null
        && found > 0
        && found < season.expectedEpisodeCount
      ) {
        throw incompleteCountMismatch(found)
      }
      throw new SeasonControllerError('render-timeout', 'Season expansion timed out')
    }

    const expand = resilientQuery<HTMLElement>(SECTION_EXPAND.selectors, episodeSelector)
    if (expand !== null) {
      logInfo('Clicking section-expand', { key: season.key })
      expand.click()
      await waitForCondition(
        episodeSelector,
        deadline,
        signal,
        'expansion-failed',
        () => resilientQuery(SECTION_EXPAND.selectors, episodeSelector) === null,
      )
      logInfo('section-expand disappeared', { key: season.key })
    }

    let rows: HTMLElement[]
    try {
      rows = await waitForStableRows(episodeSelector, season, deadline, signal)
    } catch (error) {
      // Deadline during incomplete declared-count load → count-mismatch, not generic timeout.
      if (
        error instanceof SeasonControllerError
        && error.reason === 'render-timeout'
        && season.expectedEpisodeCount !== null
      ) {
        const found = getValidEpisodeRows(episodeSelector).length
        if (found > 0 && found < season.expectedEpisodeCount) {
          throw incompleteCountMismatch(found)
        }
      }
      throw error
    }
    logInfo('Stable rows observed', {
      key: season.key,
      rowCount: rows.length,
      expectedEpisodeCount: season.expectedEpisodeCount,
    })
    if (resilientQuery(SECTION_EXPAND.selectors, episodeSelector) !== null) {
      logInfo('section-expand reappeared; looping', { key: season.key })
      continue
    }

    if (season.expectedEpisodeCount === null) {
      return rows
    }

    if (rows.length === season.expectedEpisodeCount) {
      logInfo('Declared count matched', {
        key: season.key,
        count: rows.length,
      })
      return rows
    }

    if (rows.length > season.expectedEpisodeCount) {
      throw incompleteCountMismatch(rows.length)
    }

    // Declared count not yet reached: scroll to encourage lazy load, wait for progress.
    const incompleteCount = rows.length
    const incompleteSnapshot = snapshotRows(rows)
    logInfo('Declared count incomplete; encouraging load then waiting', {
      key: season.key,
      found: incompleteCount,
      expected: season.expectedEpisodeCount,
      remainingMs: remainingTime(deadline),
    })
    encourageMoreEpisodeRows(episodeSelector, rows)

    const progressDeadline = Math.min(
      deadline,
      performance.now() + 1_500,
    )
    try {
      await waitForCondition(
        episodeSelector,
        progressDeadline,
        signal,
        'count-mismatch',
        () => {
          if (resilientQuery(SECTION_EXPAND.selectors, episodeSelector) !== null) {
            return true
          }
          const currentRows = getValidEpisodeRows(episodeSelector)
          return currentRows.length !== incompleteCount
            || snapshotRows(currentRows) !== incompleteSnapshot
        },
      )
    } catch (error) {
      if (
        error instanceof SeasonControllerError
        && error.reason === 'count-mismatch'
      ) {
        if (remainingTime(deadline) <= 0) {
          throw incompleteCountMismatch(incompleteCount)
        }
        // Short progress window elapsed without change; loop to scroll again.
        logInfo('No new rows after scroll encourage; retrying within deadline', {
          key: season.key,
          found: incompleteCount,
          remainingMs: remainingTime(deadline),
        })
        continue
      }
      throw error
    }
  }
}
