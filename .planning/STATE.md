---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
stopped_at: Completed 04-01-PLAN.md (element picker hover mode)
last_updated: "2026-03-23T09:06:05.631Z"
last_activity: "2026-03-22 — Phase 2 plan 04 complete: DEFAULT_DOMAINS for 5 platforms, content.js storage wiring, 60 tests green"
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 14
  completed_plans: 13
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-22)

**Core value:** Hebrew speakers can read and write naturally on any website without broken layout, reversed punctuation, or misaligned text — with zero page-level CSS hacks.
**Current focus:** Phase 2 — Extension Wiring and Pre-configured Sites

## Current Position

Phase: 2 of 4 (Extension Wiring and Pre-configured Sites)
Plan: 5 of 5 in current phase (02-00, 02-01, 02-02, 02-03, and 02-04 complete)
Status: in_progress
Last activity: 2026-03-22 — Phase 2 plan 04 complete: DEFAULT_DOMAINS for 5 platforms, content.js storage wiring, 60 tests green

Progress: [██████████] 100% of Phase 2

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

| Phase 02-03 P03 | 8 min | 1 task | 3 files |
| Phase 02-04 P04 | 15 min | 2 tasks | 3 files |
| Phase 03 P01 | 8min | 3 tasks | 5 files |
| Phase 03 P02 | 6min | 3 tasks | 4 files |
| Phase 03-popup-ui-and-config-actions P03-03 | 1min | 2 tasks | 2 files |
| Phase 04-visual-element-picker P01 | 4min | 2 tasks | 6 files |

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
- [Phase 2, plan 02]: null (not undefined) returned when no domain config found — explicit null sentinel
- [Phase 2, plan 02]: setDomainConfig catches all errors from sync.set (not just QUOTA_BYTES) — simpler and more resilient
- [Phase 2, plan 02]: getAllConfigs filters to domain-prefixed keys only (startsWith 'domains.') — excludes unrelated storage
- [Phase 02-03]: Handler extraction to lib/background-handlers.js — avoids Jest ESM caching issues with top-level service worker listener registration
- [Phase 02-03]: handleInstalled receives defaultDomains as parameter — enables clean mocking without jest.unstable_mockModule cache-busting complexity
- [Phase 02-04]: Option B inline: bidi-detect functions inlined into content.js (no ES import) since Chrome loads content scripts without type:module
- [Phase 02-04]: typeof chrome guard wraps all chrome API calls in content.js — prevents ReferenceError in Jest test environment
- [Phase 02-04]: toHaveProperty([host]) array form required for dot-containing keys like 'chatgpt.com' to avoid Jest path traversal
- [Phase 03]: Clone-and-replace DOM nodes on each renderPopup call prevents duplicate event listener accumulation
- [Phase 03]: Export initPopup, renderPopup, renderSelectorRow for testability — no DOMContentLoaded coupling in tests
- [Phase 03]: tabs.create added to createChromeMock() for Keyboard Shortcuts action forward compatibility
- [Phase 03]: ESM module caching: content.js onMessage listener captured once per describe block — import fires only once in Jest
- [Phase 03]: renderPopup syncs _tabId/_hostname/_config module-level state — enables tests calling renderPopup directly to work with window unload handler
- [Phase 03-popup-ui-and-config-actions]: Phase 3 delivers Add Selector (+) as a Coming soon placeholder — element picker activation is Phase 4 scope (PICK-01)
- [Phase 04-01]: lib/picker.js dual-role: ES module exports for Jest + window._hrtlPicker for content script — same file serves both consumers without duplication
- [Phase 04-01]: Named functions for picker event handlers (onPickerMouseMove, onPickerClick, onPickerKeyDown) — required for removeEventListener symmetry with same function reference
- [Phase 04-01]: window.close() in popup requires jest.fn() mock in tests — jsdom destroys document context on window.close(); production code stays correct

### Roadmap Evolution

- Phase 1 complete: RTL Engine — 4 plans, 38 tests, lib/bidi-detect.js + content.js + manifest.json

### Pending Todos

None.

### Blockers/Concerns

- [Research flag]: Slack's Shadow DOM mode (open vs. closed) must be confirmed before writing Phase 2 selectors. If closed shadow root, Slack pre-config may not be feasible in v1.
- [Research flag]: ChatGPT and Claude selector stability — both platforms ship frequent React DOM updates; validate selectors at Phase 2 start.
- [Research flag]: Keyboard shortcut Ctrl+Shift+H conflicts with Slack's "highlight unread" shortcut — verify Chrome extension priority takes precedence.

## Session Continuity

Last session: 2026-03-23T09:06:05.629Z
Stopped at: Completed 04-01-PLAN.md (element picker hover mode)
Resume file: None
