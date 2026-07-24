# Provider Expansion Playbook

## Status

This document is a future-planning guide. It is not approved multi-provider architecture and does not authorize Amazon Prime Video implementation.

The current approved product is Netflix-only. Before adding another provider, the user must approve updated authoritative documentation, phase scope, permissions, data contracts, tests, and release criteria.

The goal of this playbook is to prevent a future agent from either duplicating the whole application or prematurely rewriting working Netflix code into speculative abstractions.

## Current Coupling Assessment

The repository has useful separation of concerns, but it is not currently a provider framework.

### Fully Netflix-Specific Today

- Manifest description, hosts, and content-script matches
- Package assertions for allowed hosts
- URL identity through `jbv` and `/title/<id>`
- `/watch/` playback confirmation
- Active details-root structure
- All selectors
- Series confirmation DOM
- Season dropdown, label, action, count, expansion, and transition behavior
- Episode title/number extraction sources
- Button placement beside Netflix Play
- Native playback through a Netflix episode row
- Netflix fixtures and manual checklists

### Genuinely Reusable Today

- Uniform independent random selection
- Generic DOM query/wait mechanics in `dom-utils.ts`
- Toast ownership and stale-timer protection
- AbortController plus generation-based stale-work protection as a design pattern
- Complete-catalog-only product policy
- In-memory, history-free cache policy
- Shared Chrome/Safari WebExtension packaging model
- Byte-identical Safari resource mirroring

### Reusable Concepts With Netflix-Coupled Implementations

- SPA observer
- Orchestrator lifecycle
- Durable episode metadata
- Season traversal and bounded retry
- Episode identity and unique re-resolution
- Button state machine
- Playback safety

Do not call these implementations provider-neutral until the code and approved contracts make that true.

## Required Decisions Before Code

### Product Scope

Decide and document:

- Whether current Netflix release validation must finish first
- Whether an explicit sequencing exception is approved
- Whether Amazon support is experimental or part of the next release
- Whether Amazon must work in both Chrome and macOS Safari
- Supported desktop profiles, languages, and regions

### Exact Host Scope

Observe and approve exact Prime Video hostnames and regional behavior. Do not guess broad patterns such as all Amazon domains.

Document:

- Required content-script match patterns
- Required host permissions
- Cross-domain navigation during detail and playback flows
- Why every host is necessary

Avoid `<all_urls>`, broad retail-domain access, optional hosts, cookies, web request, history, native messaging, and a background runtime unless separately justified.

### Content-Script Topology

Choose one approved model:

1. One content-script entry that dispatches to a provider by host
2. Separate provider content-script entries that call a shared orchestrator factory

A strong future option is separate host-bound entries with one shared lifecycle factory. It reduces provider cross-talk while retaining shared behavior. This is a proposal, not a current decision; verify CRXJS output before approval.

### Provider Identity and Cache Keys

The current `Map<string, SeriesInfo>` can collide when two providers use the same local title ID.

Approve an explicit provider identity, for example:

```typescript
type ProviderId = 'netflix' | 'prime-video'
```

Then decide:

- Whether `TitleContext` carries `provider`
- Whether `Episode` carries `provider`
- Whether `SeriesInfo.id` remains provider-local
- How cache keys become provider-qualified
- Whether a provider needs an opaque durable episode identity

Do not add an unstructured bag of provider metadata without a documented reason.

### Provider Boundary

A provider will likely need to own:

- URL recognition and title identity
- Playback-context recognition
- Active-root discovery and validation
- Series confirmation
- Provider selectors
- Button anchor and placement
- Complete catalog discovery
- Season/list interaction
- Episode parsing and live matching
- Native playback action
- Provider-specific technical error mapping

Shared orchestration should continue to own:

- Start/stop/pagehide
- Generation and cancellation
- Detection timing policy where applicable
- Extension UI state and toast lifecycle
- Complete-catalog cache policy
- Uniform random selection
- One stale-catalog refresh policy
- User-facing error categories

The provider boundary may be one adapter initially or several capabilities. Avoid designing many interfaces before live Amazon evidence proves their need.

### Discovery Boundary

Two designs are possible:

1. Shared season traversal over a provider controller
2. Provider-owned complete discovery returning `SeriesInfo`

Start with provider-owned complete discovery unless Amazon is observed to share Netflix's mutable season-by-season interaction model. Preserve the existing Netflix traverser behind the Netflix provider. Extract common traversal only after two real implementations demonstrate the same policy and inputs.

### Playback Confirmation

Netflix success is `/watch/`. Amazon may use a different route or player DOM state.

Observe and document whether confirmation uses:

- Route predicate
- Player DOM predicate
- Both
- Another stable signal

Do not assume a `/watch/` equivalent exists.

### Eligible Episode Definition

Before randomization, define which Amazon items are eligible. Live observation must resolve treatment of:

- Unavailable episodes
- Purchase or rental requirements
- Add-on channel requirements
- Trailers and bonus content
- Duplicated versions
- Resume versus Play controls
- Content outside the user's entitlement

Uniform selection is only meaningful over a clearly defined complete eligible catalog.

### UI and Theme

The current button state logic is reusable, but placement and styling are Netflix-oriented.

Approve one approach:

- Provider-neutral visual style
- Provider-specific theme
- Shared structural CSS with provider theme variables

Keep ownership of button state centralized even if placement is provider-specific. Do not let each provider independently create unmanaged extension buttons.

### Locale Contract

Netflix's first release uses English-specific count and action parsing. Amazon requires its own observed language contract.

Document:

- Supported UI languages
- Season label formats
- Episode count formats
- Non-season actions
- Episode number/title formats

Do not reuse Netflix text parsers or denylist entries by assumption.

## Evidence Collection Before Amazon Implementation

Create a dated Amazon selector and behavior reference based on live desktop observation.

Capture:

1. Exact hostname and browser
2. Series detail URL forms
3. Movie detail URL forms
4. Playback URL or player-state transitions
5. Active title-root candidates and stable structure
6. Series-only episodic signals
7. Button placement anchor
8. Season controls and menu scope
9. Single-season behavior
10. Episode list rendering and pagination/expansion
11. Episode identity attributes and text
12. Playability or entitlement markers
13. Native episode playback action
14. Root replacement and SPA mutation behavior
15. Differences between Chrome and Safari
16. Language and region assumptions

Record screenshots and sanitized DOM snippets where useful. Never commit credentials, cookies, tokens, account details, or personal data.

## Recommended Migration Sequence

### Stage 0: Establish Baseline

Prefer completing current Netflix release gates first. If not, document an explicit sequencing exception and require Netflix revalidation after architecture migration.

Record passing:

- Type check
- All tests
- Universal build and assertions
- Safari build and assertions
- Current Chrome and Safari live behavior when available

### Stage 1: Approve Multi-Provider Docs

Update authoritative documents before code:

- `docs/architecture.md`
- `docs/implementation-plan.md`
- `docs/project-todos.md`
- `docs/data-model.md`
- `docs/error-handling.md`
- `docs/testing.md`
- `docs/safari.md`
- Relevant existing and new module specs

Likely new specs:

- Provider contract
- Shared orchestrator factory
- Prime Video routes/root detection
- Prime Video selectors
- Prime Video discovery
- Prime Video episode identity
- Prime Video playback
- Prime Video manual validation

### Stage 2: Characterize Netflix

Before moving code, make current Netflix behavior observable through tests at public boundaries. Preserve:

- Absolute detection deadline
- Root ambiguity handling
- User-triggered discovery
- Cache survival and clearing
- One stale refresh
- Independent reselection
- Final synchronous click guard
- `/watch/` confirmation

### Stage 3: Extract Only Proven-Neutral Utilities

Potential low-risk moves:

- Move or re-export generic DOM utilities to a neutral directory
- Move or re-export neutral observation mechanics if approved

Keep signatures and behavior unchanged. Run the full Netflix matrix after each move.

### Stage 4: Add Explicit Provider Identity

Introduce provider-qualified contexts and cache keys without adding Amazon behavior yet. Verify no Netflix behavior changes.

### Stage 5: Put Netflix Behind the Provider Contract

The first Netflix adapter should delegate to existing modules rather than rewrite them.

It should bind:

- Current detector
- Current root logic
- Current placement logic
- Current discovery pipeline
- Current navigator
- Current playback confirmation

Run all Netflix tests and manual smoke checks after this stage.

### Stage 6: Separate Shared UI Mechanics From Placement

Preserve one shared button owner and state machine. Let a provider resolve its placement anchor and theme only through the approved contract.

### Stage 7: Implement Amazon Fixtures and Provider Modules

Implement Amazon-specific routes, selectors, root detection, discovery, identity, placement, native action, and confirmation from observed evidence. Do not add branches inside Netflix modules.

### Stage 8: Expand Manifest and Package Assertions

After host approval:

1. Add exact provider hosts to `src/manifest.ts`.
2. Replace the Netflix-only assertion with an explicit approved host allowlist.
3. Assert content scripts map to the correct hosts.
4. Preserve no-background and no-permission contracts.
5. Verify Chrome and Safari consume the same manifest.

### Stage 9: Cross-Provider Validation

Run:

- Full Netflix suite
- Full Amazon suite
- Provider dispatch or content-script mapping tests
- Cache isolation tests
- Host permission assertions
- Chrome live tests for both providers
- Safari live tests for both providers when in scope

Netflix regression remains a release gate.

## Suggested Future Structure

This is illustrative and requires architecture approval:

```text
src/
├── entries/
│   ├── netflix.ts
│   └── prime-video.ts
├── core/
│   ├── orchestrator.ts
│   ├── observer.ts
│   ├── dom-utils.ts
│   └── provider.ts
├── providers/
│   ├── netflix/
│   └── prime-video/
├── ui/
├── engine/
└── types.ts
```

Do not move files into this structure merely because it looks cleaner. First approve contracts, then migrate incrementally with Netflix characterization tests.

## Required Test Matrix

### Shared Orchestrator Tests

Use a fake provider to test provider-neutral lifecycle:

- Context creation and invalidation
- Root discovery and ambiguity
- Absolute detection deadline
- Generation suppression
- User-triggered discovery
- Complete-catalog caching
- Provider-qualified cache keys
- One stale refresh
- Uniform selection
- Provider playback confirmation
- Stop/pagehide cleanup

### Provider Isolation Tests

- Netflix host selects only Netflix logic
- Amazon host selects only Amazon logic
- Unsupported host activates nothing
- Provider selectors never run on another provider
- Same local title ID does not share cache across providers

### Amazon Fixture Tests

Based on observed layouts:

- Movie exclusion
- Series confirmation
- Single-season catalog
- Multi-season catalog
- Delayed rendering
- Expansion, pagination, or lazy loading
- Complete eligible episode count
- Bounded retry and atomic failure
- Missing and ambiguous identity
- Native playback action
- Playback confirmation
- Cancellation and root replacement

### Package Tests

- Exact approved host allowlist
- No broad wildcard access
- Correct content-script mapping
- No new extension permissions
- No background runtime
- Chrome/Safari manifest equality
- No duplicated provider source in the Safari wrapper

## Fixture Organization

Keep external DOM fixtures provider-specific:

```text
tests/fixtures/
├── netflix/
├── prime-video/
└── core/
    └── fake-provider.ts
```

Do not create one giant fixture builder with provider conditionals. Fixtures should represent observed provider DOM, while core tests use a fake provider contract rather than real-site markup.

## Anti-Patterns

Do not:

- Add Amazon selectors to `src/netflix/selectors.ts`
- Add `if (provider === ...)` branches throughout shared modules
- Copy `content.ts` into an Amazon entry and maintain two orchestrators
- Force Amazon into Netflix's dropdown and `/watch/` assumptions
- Generalize every module before observing Amazon
- Add broad Amazon permissions for convenience
- Intercept private APIs without approved architecture
- Add a background service worker without a concrete responsibility
- Persist catalogs or playback history as part of provider work
- Allow partial Amazon catalogs to randomize
- Weaken unique episode resolution to increase apparent success
- Mark Amazon support complete from fixtures without live authenticated testing
- Change Netflix architecture and Amazon behavior in one unreviewable rewrite

## Definition of Done for a Future Provider

A provider is not complete until:

1. Authoritative provider contracts are approved.
2. Exact hosts and permissions are approved and asserted.
3. Provider-specific selectors and evidence are documented.
4. Complete eligible catalog discovery is proven by fixtures and live tests.
5. Durable identity uniquely re-resolves the selected episode.
6. Cancellation and stale-generation behavior match shared contracts.
7. Chrome live validation passes.
8. Safari live validation passes when in scope.
9. Netflix regression tests and live checks pass.
10. CI, package assertions, tracker, and KT are updated.
