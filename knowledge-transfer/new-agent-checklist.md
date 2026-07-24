# New Agent Checklist

## First Ten Minutes

1. Read `AGENTS.md` completely.
2. Read `docs/project-todos.md` and identify the current phase, active item, blockers, and exact next action.
3. Read the relevant phase in `docs/implementation-plan.md`.
4. Read `docs/architecture.md` and `knowledge-transfer/current-system.md`.
5. Read the relevant module specs before opening implementation files.
6. Read `knowledge-transfer/module-map.md` for dependency and change impact.
7. Inspect `git status` without reverting or modifying unrelated work.
8. Create session todos for non-trivial work.

## Authority Check

Before making a decision, identify its authority:

- Behavior and architecture: `docs/`
- Current execution status: `docs/project-todos.md`
- Selector implementation contract: `docs/module-specs/selectors.ts.md`
- Live selector evidence: `docs/selectors-reference.md`
- Current implementation map and maintenance implications: `knowledge-transfer/`
- Actual implementation details: source and tests

If sources disagree and the answer affects behavior, stop and ask the user.

## Reading Paths by Task

### Lifecycle, Cache, or Integration

Read:

- `docs/module-specs/content.ts.md`
- `docs/architecture.md`
- `docs/data-model.md`
- `docs/error-handling.md`
- `docs/testing.md`
- `knowledge-transfer/current-system.md`
- `knowledge-transfer/maintenance-playbook.md`
- `src/content.ts`
- `tests/integration/content-lifecycle.test.ts`

### Route Observation

Read:

- `docs/module-specs/observer.ts.md`
- `docs/module-specs/content.ts.md`
- `knowledge-transfer/current-system.md`
- `src/netflix/observer.ts`
- `tests/unit/observer.test.ts`

### Detection or Root Resolution

Read:

- `docs/module-specs/detector.ts.md`
- `docs/module-specs/content.ts.md`
- `docs/module-specs/selectors.ts.md`
- `docs/selectors-reference.md`
- `src/netflix/detector.ts`
- `src/content.ts`
- Detector and content lifecycle tests

### Selector Maintenance

Read:

- `docs/module-specs/selectors.ts.md`
- `docs/selectors-reference.md`
- Every consuming module spec
- `knowledge-transfer/maintenance-playbook.md`
- `src/netflix/selectors.ts`

Gather and document current live evidence before implementation.

### Season Discovery

Read:

- `docs/module-specs/season-controller.ts.md`
- `docs/module-specs/season-traverser.ts.md`
- `docs/module-specs/episode-collector.ts.md`
- `docs/module-specs/episode-identity.ts.md`
- `docs/error-handling.md`
- `knowledge-transfer/current-system.md`
- `knowledge-transfer/module-map.md`
- Controller and traversal source/tests

### Episode Matching or Playback

Read:

- `docs/module-specs/episode-identity.ts.md`
- `docs/module-specs/navigator.ts.md`
- `docs/module-specs/season-controller.ts.md`
- `docs/module-specs/content.ts.md`
- `knowledge-transfer/maintenance-playbook.md`
- Identity, navigator, and content lifecycle tests

### UI

Read:

- `docs/module-specs/button.ts.md`
- `docs/module-specs/styles.ts.md`
- `docs/module-specs/feedback.ts.md`
- `docs/module-specs/content.ts.md`
- UI source and tests

### Build, CI, Chrome, or Safari

Read:

- Relevant implementation-plan phases
- `docs/testing.md`
- `docs/safari.md`
- `knowledge-transfer/build-testing-release.md`
- `package.json`
- `.github/workflows/ci.yml`
- Relevant scripts

### Amazon Prime Video or Another Provider

Read:

- All architecture and current-system material
- `knowledge-transfer/provider-expansion.md`
- Current manifest and package assertions
- Current provider-specific source and fixtures

Then stop and confirm that authoritative multi-provider docs and phase approval exist. The KT playbook is not implementation approval.

## Before Coding

1. Confirm the requested behavior is documented.
2. Identify exact files and test boundaries.
3. Identify state ownership and cancellation implications.
4. Check whether permissions, packaging, or browser scope change.
5. Check whether data-model or cache identity changes.
6. Ask one focused question for any ambiguity.
7. Present a brief implementation plan.
8. Wait for user confirmation.
9. Mark persistent and session trackers in progress.

## During Coding

1. Make the smallest correct change.
2. Preserve module boundaries.
3. Keep Netflix selector strings centralized.
4. Keep generic DOM utilities provider-neutral.
5. Preserve abort and generation guards.
6. Preserve complete-catalog atomicity.
7. Preserve durable metadata without DOM references.
8. Preserve unique live re-resolution and safe failure.
9. Do not modify unrelated worktree changes.
10. Update the persistent tracker as meaningful work completes.

## Verification Selection

At minimum, run focused tests for the changed boundary.

Before declaring a substantial implementation complete, prefer:

```bash
npx tsc --noEmit
npm test
npm run build
npm run assert:webextension
```

On macOS for packaging-affecting work, also run:

```bash
npm run safari:build
npm run assert:safari
```

Always run:

```bash
git diff --check
```

Do not claim a command passed unless it actually ran successfully in the current session or is clearly labeled as previously recorded evidence.

## Before Finishing

1. Inspect `git status` and the final diff.
2. Confirm no unrelated changes were reverted or included unintentionally.
3. Update authoritative docs if behavior changed.
4. Update this KT folder if architecture, topology, operations, or maintenance knowledge changed.
5. Update `docs/project-todos.md` with exact verification evidence.
6. Leave one exact next action when work remains.
7. Keep manual Chrome/Safari checks pending unless the user reports results.
8. Commit or push only when explicitly requested.

## Fast Invariant Review

Before approving a change, ask:

- Does route identity still remain separate from series classification?
- Are queries scoped to the active provider root?
- Does discovery still begin only on click?
- Is the catalog complete before selection?
- Are partial results discarded?
- Are all async side effects current-context guarded?
- Does cache ownership remain in orchestration?
- Is selection still uniform, independent, and history-free?
- Is playback uniquely re-resolved from live DOM?
- Can ambiguity or stale work cause a wrong click?
- Do Chrome and Safari still share one emitted runtime?
- Are permissions still minimal and explicit?
