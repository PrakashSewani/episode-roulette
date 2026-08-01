# Agent Instructions — Episode Roulette

## Purpose

This file governs all AI agent behavior when working on this project. Every agent **must** follow these rules without exception.

---

## Core Rules

### 1. Docs Are the Source of Truth

- **All design decisions, architecture, module specs, and implementation plans live in the `docs/` folder.**
- Before writing ANY code, the agent **must** read and understand the relevant docs.
- Code must strictly follow what is documented. No shortcuts, no "I know better" deviations.
- The root `knowledge-transfer/` folder is the required implementation-orientation layer. It explains the current code topology, operational workflows, maintenance risks, and future-provider planning, but it does not override `docs/`.
- Before substantial work, agents must read both the relevant normative documents and the relevant knowledge-transfer material.
- If `knowledge-transfer/`, code, and `docs/` disagree, stop and resolve the discrepancy through the authoritative docs and user clarification before implementation.

### 2. Never Deviate From the Design

- If a doc says Module X does Y, Module X must do Y — nothing more, nothing less.
- If a doc says "use MutationObserver for SPA detection", do not use a polling-only approach instead.
- If a doc says "centralize selectors in `selectors.ts`", do not scatter selectors across multiple files.
- **Every implementation decision must trace back to a documented specification.**

### 3. Ask Questions When Unclear

- If any part of the docs is ambiguous, incomplete, or contradictory — **stop and ask the user.**
- Do not guess. Do not assume. Do not "figure it out as you go."
- Examples of when to ask:
  - A module's responsibility is unclear
  - Two docs contradict each other
  - A selector strategy is ambiguous
  - An error handling path is not documented
  - A dependency choice is not specified

### 4. Update Docs When Clarity Is Given

- When the user answers a question or provides clarification, **update the relevant doc first.**
- Then implement based on the updated doc.
- This keeps docs as the single source of truth going forward.

### 5. No Implementation Without a Plan

- Before starting any new phase of work, the agent must:
  1. Read all relevant docs
  2. Confirm understanding of what needs to be built
  3. Present a brief plan of what it will do
  4. Wait for user confirmation (or ask questions)
- Only then should code be written.

### 6. Maintain the Persistent Project Tracker

- `docs/project-todos.md` is the persistent status and handoff tracker.
- `docs/implementation-plan.md` remains authoritative for phase order, scope, deliverables, and exit criteria. The tracker must never redefine or override it.
- At the start of every implementation session, read `docs/project-todos.md` after this file and identify the first incomplete phase.
- Before substantial work, update the active phase to `in progress` and record the exact item being started.
- Update the tracker as meaningful work completes, verification runs, scope changes, or blockers appear. Do not wait until the end to reconstruct progress.
- Keep exactly one phase `in progress`. Later phases remain `not started` unless the implementation plan and user approval explicitly permit otherwise.
- Mark a phase `complete` only when every documented exit criterion has been verified. Record the commands, manual checks, and outcomes that support completion.
- Before ending a session with incomplete work, replace the Current Handoff section with the current phase, completed work, verification, blockers, changed files, and exact next action.
- Do not put temporary scratch notes, speculative design, or unverified claims in the tracker.

### 7. Use Two Levels of Todos

- Use `docs/project-todos.md` for durable project and phase progress that the next agent must inherit.
- Use the agent's session todo tool for the current turn's concrete work items.
- Session todos do not replace the persistent tracker. Keep both synchronized when status changes matter beyond the current turn.

### 8. Maintain Knowledge Transfer

- `knowledge-transfer/` is required onboarding and implementation context for every new agent.
- Update authoritative `docs/` first whenever approved behavior or architecture changes, then update `knowledge-transfer/` so it accurately explains the resulting implementation.
- Update the knowledge-transfer material when module topology, state ownership, dependency direction, build/release workflow, debugging procedure, or approved provider strategy changes.
- Do not place normative requirements only in `knowledge-transfer/`; behavioral and architectural decisions belong in `docs/`.
- Future-provider guides in `knowledge-transfer/` are planning aids only. They do not authorize implementation without an approved implementation-plan phase and normative provider specifications.

---

## Workflow

```
1. Read AGENTS.md, docs/project-todos.md, and knowledge-transfer/README.md
2. Identify the first incomplete phase and the exact current handoff
3. Read every relevant architecture, data-model, module-spec, error-handling, testing, and knowledge-transfer document
4. Inspect the current implementation and tests without assuming they override docs
5. If anything is unclear → ASK THE USER
6. If user provides new info → UPDATE THE AUTHORITATIVE DOCS
7. Present implementation plan for the next task
8. Get confirmation from user
9. Mark the phase/item in progress in the persistent tracker and session todos
10. Implement strictly per docs
11. Verify against docs and record evidence
12. Update knowledge-transfer material when implementation context changed
13. Update the persistent tracker and leave an exact handoff if work remains
```

---

## Docs Structure

```
docs/
├── implementation-plan.md   # Overall implementation phases and order
├── project-todos.md         # Persistent phase status, verification, and agent handoff
├── architecture.md          # Module structure and data flow
├── module-specs/
│   ├── observer.ts.md       # SPA navigation detection spec
│   ├── content.ts.md        # Integration orchestration and title lifecycle spec
│   ├── detector.ts.md       # Series page detection spec
│   ├── selectors.ts.md      # DOM selector configuration spec
│   ├── dom-utils.ts.md      # Resilient DOM query helpers spec
│   ├── season-controller.ts.md # Shared Netflix season interaction spec
│   ├── episode-identity.ts.md # Shared episode identity parsing spec
│   ├── season-traverser.ts.md  # Episode discovery via season traversal spec
│   ├── episode-collector.ts.md # Episode parsing spec
│   ├── button.ts.md         # UI button injection spec
│   ├── styles.ts.md         # CSS injection spec
│   ├── feedback.ts.md       # Loading/error states spec
│   ├── randomizer.ts.md     # Random selection spec
│   ├── navigator.ts.md      # Playback navigation spec
│   └── restart.ts.md        # Seek-to-beginning after /watch/
├── data-model.md            # TypeScript types and interfaces
├── selectors-reference.md   # All Netflix DOM selectors
├── error-handling.md        # Error scenarios and handling
├── testing.md               # Testing strategy
└── safari.md                # macOS Safari packaging and validation
```

## Knowledge Transfer Structure

```
knowledge-transfer/
├── README.md                  # Entry point, authority, and reading order
├── current-system.md         # Runtime lifecycle, state ownership, and invariants
├── module-map.md             # File responsibilities, dependencies, and change impact
├── build-testing-release.md  # Build, CI, Safari packaging, and release workflows
├── maintenance-playbook.md   # Debugging and safe-change procedures
├── provider-expansion.md     # Future provider planning; not implementation approval
└── new-agent-checklist.md    # Task reading paths and session checklist
```

---

## What This Means in Practice

| Situation | Correct Action |
|-----------|---------------|
| You're about to write code for `button.ts` | Read `docs/module-specs/button.ts.md` and `docs/architecture.md` first |
| Two docs disagree on a selector | Ask the user which is correct, update the losing doc |
| A module needs a behavior not in any doc | Stop, describe the gap to the user, get clarification, update docs |
| You think a better approach exists | Present it to the user as a question, do not just implement it |
| The user gives you new info mid-task | Update the relevant doc, then continue |
| You start or finish a phase item | Update `docs/project-todos.md` and the session todo list |
| You stop before a phase is complete | Leave an exact Current Handoff in `docs/project-todos.md` |
| You need to understand how current code realizes the specs | Read the relevant file in `knowledge-transfer/`, then inspect source and tests |
| A change alters module topology or operational workflow | Update authoritative docs if needed, then update `knowledge-transfer/` |
| You are asked to add Amazon Prime Video | Read `knowledge-transfer/provider-expansion.md`, then require approved normative docs and phase scope before coding |

---

## Forbidden Actions

- Writing code that isn't backed by a doc
- "Improving" architecture without user approval
- Skipping a module's spec and just winging it
- Adding dependencies not listed in docs
- Changing the project structure without updating `architecture.md`
- Treating `knowledge-transfer/` as authority over `docs/`
- Implementing a future-provider proposal from `knowledge-transfer/` without approved normative specs
- Implementing stretch goals before core is complete (unless explicitly told to)

---

## Production / Deploy Readiness Checklist

When the user asks **"are we ready to deploy?"**, **"ready to publish?"**, **"ship it?"**, or similar, the agent **must** run this checklist against the live repo and `docs/project-todos.md`. Do not answer from memory alone. Report each item as pass / fail / N/A with evidence.

### 1. Open ship gates (tracker)

1. Read `docs/project-todos.md` Current Handoff and Phase Tracker.
2. List every non-`complete` item that blocks release (especially **Temporary development logs** and any incomplete verification).
3. If any ship gate is open, answer **not ready** until the user explicitly waives it.

### 2. Development logs (required before store publish)

Verbose pre-publish diagnostics are intentional until publish. Before shipping:

1. Remove or silence non-essential `logInfo` / debug noise from production paths (`src/debug.ts` and all call sites in content, UI, discovery, season-controller, navigator, restart, observer, popup).
2. Keep concise `logError` / `logWarning` for real operational failures (see `docs/error-handling.md`).
3. Confirm the popup does not emit noisy development-only logs, or that they are similarly gated.
4. Update `docs/project-todos.md` Temporary development logs to `complete` only after cleanup and a rebuild.
5. Update README Known limitations if it still claims verbose logs are present.

### 3. Product and docs consistency

1. `README.md` season support and known limitations match live-validated behavior.
2. Normative docs (`architecture.md`, module specs, `error-handling.md`, `selectors-reference.md`) do not still claim named seasons as an unsupported first-release limitation if that was fixed.
3. `knowledge-transfer/` matches current lifecycle (named seasons, scoped list scroll, dropdown readiness wait, cache policy).
4. Version in `package.json` matches the intended release; Safari marketing version sync is part of `safari:sync` when packaging.

### 4. Automated verification

Run and record outcomes:

1. `npx tsc --noEmit`
2. `npm test`
3. `npm run build`
4. `npm run assert:webextension`
5. On macOS when shipping Safari: `npm run safari:sync`, `npm run safari:build`, and package assertions as documented in `docs/safari.md` / `knowledge-transfer/build-testing-release.md`
6. Confirm CI (GitHub Actions) is green for the commit being released when CI is in use

### 5. Manual smoke (do not invent results)

Only claim what the user has confirmed or what was recorded in the tracker:

1. Desktop Chrome: series detect → button → full discovery → random play → `/watch/` → restart-near-start when armed
2. Cached re-roll after returning from `/watch/` without false season-control failure
3. Named-season multi-season series (e.g. JoJo) if claiming named-season support
4. Numeric `Season N` series still works
5. macOS Safari smoke when shipping Safari
6. Kids profiles, non-English UI, and mobile remain out of scope unless newly validated

### 6. Packaging and store hygiene

1. Manifest hosts remain Netflix-only; no background service worker unless an approved doc adds one
2. Icons, popup, content script present in `dist/webextension/`
3. No secrets, local signing files, or generated Safari resources committed
4. Privacy policy / store listing / screenshots / permissions justification current if publishing to Chrome Web Store or Safari
5. Follow existing publish scripts/docs (`npm run publish:chrome` only when the user requests publish and credentials/env are ready)

### 7. Answer format

Respond with:

1. **Ready / Not ready**
2. A short table or list of checklist results
3. Exact remaining work if not ready
4. If ready: the exact next publish commands the user should approve (do not publish without explicit ask)

---

## Commitment

By following this file, we ensure:
- The project stays true to its design
- Documentation stays accurate and useful
- The user always knows what's happening and why
- Changes are predictable and maintainable
- Deploy readiness is evaluated against a fixed production checklist, not vibes
