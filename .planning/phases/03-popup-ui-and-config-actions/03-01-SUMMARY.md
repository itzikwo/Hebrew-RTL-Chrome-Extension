---
phase: 03-popup-ui-and-config-actions
plan: 01
subsystem: ui
tags: [chrome-extension, popup, vanilla-js, jsdom, jest, storage]

# Dependency graph
requires:
  - phase: 02-extension-wiring
    provides: lib/storage.js getDomainConfig/setDomainConfig, tests/__mocks__/chrome.js factory
provides:
  - popup/popup.html — full UI shell with all components per UI-SPEC
  - popup/popup.js — init, render, toggle, delete, add-selector placeholder, not-available state
  - manifest.json default_popup field wired to popup/popup.html
  - tests/popup.test.js — 12 tests covering POP-01, POP-02, POP-03 behaviors
affects: [03-02-interactive-features, future-phases-using-popup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Clone-and-replace node pattern for detaching stale event listeners before re-render
    - Export handler functions (initPopup, renderPopup, renderSelectorRow) for testability
    - jest.unstable_mockModule + dynamic import pattern for popup.js tests (same as background-handlers.js pattern)

key-files:
  created:
    - popup/popup.html
    - popup/popup.js
    - tests/popup.test.js
  modified:
    - manifest.json
    - tests/__mocks__/chrome.js

key-decisions:
  - "Clone-and-replace DOM nodes on each renderPopup call to prevent duplicate event listeners accumulating across re-renders"
  - "Export initPopup, renderPopup, renderSelectorRow — allows tests to call them directly without DOMContentLoaded coupling"
  - "Module-level _hostname/_config/_tabId state: set during initPopup, used by re-render triggers inside event handlers"
  - "tabs.create mock added to createChromeMock() — needed for Keyboard Shortcuts action; low-cost forward compatibility"

patterns-established:
  - "Popup init pattern: chrome.tabs.query → URL parse → getDomainConfig ?? default → renderPopup"
  - "Selector row pattern: clone-based index capture avoids stale closures in forEach"

requirements-completed: [POP-01, POP-02, POP-03]

# Metrics
duration: 8min
completed: 2026-03-23
---

# Phase 3 Plan 01: Popup UI Shell Summary

**Popup HTML/CSS/JS shell with master toggle, selector list, add-selector placeholder, and not-available state — 12 tests, 72 total green**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-23T07:07:20Z
- **Completed:** 2026-03-23T07:15:30Z
- **Tasks:** 3 (TDD: 2 tasks with RED/GREEN cycle, 1 pure implementation)
- **Files modified:** 5

## Accomplishments
- Popup HTML shell with all UI components per UI-SPEC: header toggle, selector list, footer actions menu, confirm dialog, empty/not-available states — all inline CSS, zero-build
- popup.js exports testable handler functions (initPopup, renderPopup, renderSelectorRow) that cover all POP-01/02/03 behaviors
- 12 popup unit tests pass; full suite grows from 60 to 72 tests with no regressions
- manifest.json wired with default_popup pointing to popup/popup.html

## Task Commits

Each task was committed atomically:

1. **Task 1: Create test scaffold and extend Chrome mock** - `3e0b6f4` (test)
2. **Task 2: Build popup HTML shell and CSS** - `5abdb5d` (feat)
3. **Task 3: Implement popup.js core logic and update manifest** - `2db6a6f` (feat)

_Note: Tasks 1 and 3 used TDD (RED → GREEN cycle)_

## Files Created/Modified
- `popup/popup.html` - Full popup UI shell with inline CSS: header, toggle, selector list, footer, confirm dialog, state elements
- `popup/popup.js` - Popup controller: initPopup, renderPopup, renderSelectorRow, event handlers for toggle/delete/add-placeholder
- `manifest.json` - Added `"default_popup": "popup/popup.html"` to action block
- `tests/popup.test.js` - 12 unit tests covering all popup behaviors with jsdom + jest.unstable_mockModule
- `tests/__mocks__/chrome.js` - Extended tabs object with `create: jest.fn()` mock

## Decisions Made
- **Clone-and-replace for event listeners:** On each `renderPopup()` call, interactive elements (master toggle, add-selector-btn, actions-btn, confirm buttons) are cloned and replaced to prevent duplicate listener accumulation. This is simpler than tracking and removing listeners manually.
- **Export testable functions:** `initPopup`, `renderPopup`, `renderSelectorRow` are all exported so tests can call them directly without triggering the DOMContentLoaded event loop.
- **Module-level state variables:** `_hostname`, `_config`, `_tabId` are set during `initPopup()` and carry context through the lifecycle — consistent with the single-page popup model.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- popup/popup.html and popup/popup.js are ready for Plan 03-02 to add hover-highlight messaging, actions menu handlers (export, delete-all confirm), and keyboard shortcut navigation
- All 12 popup tests are in place; Plan 03-02 can extend them with additional behaviors
- Chrome mock now includes `tabs.create` for the shortcuts action

---
*Phase: 03-popup-ui-and-config-actions*
*Completed: 2026-03-23*
