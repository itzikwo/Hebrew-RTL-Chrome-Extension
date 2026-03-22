---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
stopped_at: "Completed 02-00-PLAN.md — Chrome mock + 22 todo test stubs"
last_updated: "2026-03-22"
last_activity: "2026-03-22 — Phase 2 plan 00 complete: Chrome API mock factory + 3 test stub files (22 todos)"
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 8
  completed_plans: 6
  percent: 37
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-22)

**Core value:** Hebrew speakers can read and write naturally on any website without broken layout, reversed punctuation, or misaligned text — with zero page-level CSS hacks.
**Current focus:** Phase 2 — Extension Wiring and Pre-configured Sites

## Current Position

Phase: 2 of 4 (Extension Wiring and Pre-configured Sites)
Plan: 2 of 4 in current phase (02-00 and 02-01 complete)
Status: in_progress
Last activity: 2026-03-22 — Phase 2 plan 00 complete: Chrome mock + 22 todo test stubs (Wave 0 scaffold)

Progress: [████░░░░░░] 37%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: —
- Total execution time: 1 session

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. RTL Engine | 4/4 | 1 session | — |

**Recent Trend:**
- Last 4 plans: 01-00, 01-01, 01-02, 01-03 — all green
- Trend: on track

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-phase]: Hebrew-only detection (not Arabic/Persian) — simpler engine, sharper Israeli market positioning
- [Pre-phase]: Element-level inline styles (not page-level) — prevents breaking navigation, images, code blocks
- [Pre-phase]: chrome.storage.sync with local fallback — cross-device sync without quota risk
- [Pre-phase]: Free-only v1 — maximize installs before monetizing
- [Phase 1]: Pass 1 only short-circuits for Hebrew first-strong; LTR first-strong falls through to 30% threshold
- [Phase 1]: `jest-environment-jsdom` installed as separate devDep; `jest` imported from `@jest/globals` in ESM
- [Phase 1]: MutationObserver tests require `async` + `await Promise.resolve()` before `advanceTimersByTime`
- [Phase 1]: manifest.json created as minimal MV3 (no permissions/background/action — Phase 2 additions)
- [Phase 2, plan 00]: createChromeMock() factory pattern (not singleton) — ensures no shared state between tests
- [Phase 2, plan 00]: it.todo() stubs for Wave 0 — stubs skip cleanly until implementation plans fill in real code
- [Phase 2, plan 01]: Removed "type: module" from content_scripts — not listed in Chrome manifest docs; plan 02-04 handles import resolution
- [Phase 2, plan 01]: Background service worker declared with type: module — confirmed supported
- [Phase 2, plan 01]: Version bumped to 0.2.0 to mark Phase 2 manifest boundary

### Roadmap Evolution

- Phase 1 complete: RTL Engine — 4 plans, 38 tests, lib/bidi-detect.js + content.js + manifest.json

### Pending Todos

None.

### Blockers/Concerns

- [Research flag]: Slack's Shadow DOM mode (open vs. closed) must be confirmed before writing Phase 2 selectors. If closed shadow root, Slack pre-config may not be feasible in v1.
- [Research flag]: ChatGPT and Claude selector stability — both platforms ship frequent React DOM updates; validate selectors at Phase 2 start.
- [Research flag]: Keyboard shortcut Ctrl+Shift+H conflicts with Slack's "highlight unread" shortcut — verify Chrome extension priority takes precedence.

## Session Continuity

Last session: 2026-03-22
Stopped at: Completed 02-00-PLAN.md — Chrome API mock + 22 todo stubs (Wave 0 scaffold done)
Resume file: .planning/phases/02-extension-wiring-and-pre-configured-sites/
