# Provider Contract

## Status

Approved and implemented for Phases 9–11. The Netflix and Prime Video providers satisfy the contract and are release-validated (2026-08-16).

## Responsibilities

A provider runtime supplies route identity, title-root resolution, series detection, observation, complete eligible-catalog discovery, durable episode identity, live episode resolution, native playback, and playback confirmation.

The shared orchestrator owns provider selection, generation/cancellation, UI state, cache, uniform randomization, stale-cache policy, shared button state, and cleanup. Providers must not own catalog caches or selection history. Provider-specific placement is exposed as a placement capability consumed by the shared button owner; providers must not create unmanaged extension buttons.

```typescript
interface ButtonPlacement {
  readonly spawnRoot: HTMLElement
  place(button: HTMLButtonElement): void
}
```

`PageChangeCallback` is the existing neutral page-event callback from `src/types.ts`. `start()` owns provider observer registration and `stop()` owns provider observer teardown.

`spawnRoot` is where the shared owner renders its temporary loading indicator. `place()` inserts the ready operation button at the provider-approved anchor. A provider must return `null` when its placement anchor is not available; the shared owner must not guess a selector or placement.

## Contract shape

The eventual TypeScript contract must expose equivalent capabilities to:

```typescript
interface ProviderRuntime {
  readonly id: ProviderId
  matches(url: string): boolean
  start(callback: PageChangeCallback): void
  stop(): void
  getTitleContext(url: string): TitleContext | null
  resolveTitleRoot(): HTMLElement | null
  detectSeries(context: TitleContext, root: HTMLElement): DetectionResult
  observeForTitleRoot(generation: number): void
  observeTitleRoot(root: HTMLElement, generation: number): void
  clearObservation(): void
  waitForButtonPlacement(root: HTMLElement, signal: AbortSignal): Promise<ButtonPlacement | null>
  discoverEpisodes(context: TitleContext, root: HTMLElement, signal: AbortSignal): Promise<SeriesInfo>
  playEpisode(episode: Episode, root: HTMLElement, signal: AbortSignal, assertCurrent: () => void): Promise<void>
  waitForPlaybackConfirmation(episode: Episode, signal: AbortSignal): Promise<void>
  isInternalNavigation(url: string): boolean
  getPendingPlayback(): Episode | null
  resumePendingPlayback(episode: Episode, root: HTMLElement, signal: AbortSignal, assertCurrent: () => void): Promise<void>
  hasPendingOperation(): boolean
  notifyRouteChange(url: string): void
}
```

Names may change during implementation only if behavior and ownership remain equivalent.

## Invariants

- Unsupported hosts activate no provider.
- Provider-local IDs are opaque and cache-qualified.
- Provider placement is explicit; missing placement evidence returns no placement rather than guessing.
- Discovery is complete-or-fail; partial catalogs are never cached or randomized.
- Durable records contain no DOM references, media URLs, credentials, or session identifiers.
- Missing or ambiguous live identity never triggers a native click.
- Abort and stale-generation paths are silent and cannot update current UI/cache.
