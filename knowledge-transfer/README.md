# Episode Roulette Knowledge Transfer

## Purpose

This folder gives a new engineer or AI agent a practical mental model of the implemented application. It explains how the repository fits together, where state and behavior live, how to investigate failures, and how to approach a future provider such as Amazon Prime Video without destabilizing Netflix.

This folder is not a second specification.

- `docs/` is normative. It defines approved architecture, behavior, data contracts, phase scope, errors, tests, packaging, and release criteria.
- `knowledge-transfer/` is explanatory. It maps those contracts to the current codebase and records maintenance workflows, change impact, and future design questions.
- Code shows the current implementation, but code must not be used to silently override an explicit specification.
- `docs/project-todos.md` is the current status and handoff authority.

If this folder disagrees with `docs/`, stop and resolve the discrepancy by updating the appropriate authoritative document with user approval before changing implementation.

## Current Product

Episode Roulette is a Manifest V3 WebExtension for desktop Netflix. It runs one shared TypeScript content-script implementation in Chrome and macOS Safari. It detects the active Netflix series details surface, injects a `Random Episode` button, discovers a complete episode catalog through Netflix's rendered UI, selects uniformly, and starts playback by clicking the uniquely re-resolved Netflix episode row.

The product deliberately has:

- No background page or service worker
- No Netflix API interception
- No persisted catalog or playback history
- No repeat prevention or weighting
- No browser-specific Netflix runtime fork
- Netflix-only host access in the current manifest

Read `docs/project-todos.md` for live completion status. Do not infer release readiness from this overview.

## Reading Order

For a first session, read:

1. `AGENTS.md`
2. `docs/project-todos.md`
3. `docs/implementation-plan.md`
4. `docs/architecture.md`
5. `knowledge-transfer/current-system.md`
6. `knowledge-transfer/module-map.md`
7. The relevant module specs under `docs/module-specs/`
8. `knowledge-transfer/maintenance-playbook.md`
9. `knowledge-transfer/build-testing-release.md` when changing build, CI, Chrome, or Safari behavior
10. `knowledge-transfer/provider-expansion.md` only for multi-provider or Amazon Prime Video planning

Use `knowledge-transfer/new-agent-checklist.md` as the operational start and end checklist.

## Folder Map

| File | Use |
|---|---|
| `current-system.md` | Runtime lifecycle, state ownership, data flow, and non-negotiable invariants |
| `module-map.md` | File-by-file responsibilities, dependencies, call graph, and change impact |
| `build-testing-release.md` | Build outputs, test layers, CI, Safari packaging, generated files, and release gates |
| `maintenance-playbook.md` | Debugging and safe-change workflows for selectors, lifecycle, discovery, playback, cache, and packaging |
| `provider-expansion.md` | Evidence-first plan for adding Amazon Prime Video or another provider |
| `new-agent-checklist.md` | Required reading paths, implementation workflow, verification, and handoff checklist |

## Authority Matrix

| Question | Authority |
|---|---|
| What behavior is approved? | Relevant document under `docs/` |
| What phase may be worked on? | `docs/implementation-plan.md` and `docs/project-todos.md` |
| What is currently blocked or complete? | `docs/project-todos.md` |
| What selectors are normative? | `docs/module-specs/selectors.ts.md` |
| What selectors were observed live? | `docs/selectors-reference.md` |
| How does current code realize the design? | This folder plus source inspection |
| What commands produce release artifacts? | `package.json`, scripts, CI, and `docs/safari.md` |
| Is Amazon Prime Video approved architecture? | No. `provider-expansion.md` is a planning guide only |

## Update Rule

Update this folder when a change alters any of the following:

- Runtime lifecycle or state ownership
- Module topology or dependency direction
- Important invariants or failure boundaries
- Build, package, CI, signing, or release workflow
- Debugging or operational procedures
- Approved provider architecture

Update the authoritative `docs/` first whenever behavior or architecture changes. Then update this folder to explain the resulting implementation.
