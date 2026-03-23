---
phase: 03-popup-ui-and-config-actions
plan: 02
subsystem: ui
tags: [chrome-extension, popup, vanilla-js, jsdom, jest, highlight, actions-menu, export]

# Dependency graph
requires:
  - phase: 03-01
    provides: popup/popup.html shell, popup/popup.js core (renderPopup, renderSelectorRow, initPopup), tests/popup.test.js scaffold
  - phase: 02-extension-wiring
    provides: lib/storage.js getAllConfigs/getDomainConfig/setDomainConfig, content.js message listener
provides:
  - content.js — HIGHLIGHT_SELECTOR and CLEAR_HIGHLIGHT message handlers
  - popup/popup.js — hover wiring (mouseenter/mouseleave), window unload cleanup, Export Config (Blob download), Escape key handler
  - tests/content.test.js — 8 new tests for highlight handlers (19 total content tests)
  - tests/popup.test.js — 13 new tests for hover + actions menu (25 total popup tests)
affects: [end-to-end popup UX, highlight preview feature, config export/management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Import content.js once per describe block (not per test) — ESM module caching means onMessage listener captured at first import"
    - "renderPopup syncs module-level _tabId/_hostname/_config state — enables tests calling renderPopup directly to work with window unload handler"
    - "Blob + URL.createObjectURL for in-browser JSON file download (no server needed)"
    - "event delegation via individual querySelector listeners (consistent with Plan 01 clone-and-replace pattern)"

key-files:
  created: []
  modified:
    - content.js
    - popup/popup.js
    - tests/content.test.js
    - tests/popup.test.js

key-decisions:
  - "ESM module caching: content.js onMessage listener captured once per describe block (not per beforeEach) to avoid stale listener references across tests"
  - "renderPopup syncs _tabId so window unload handler works when tests call renderPopup directly (without initPopup)"
  - "Escape key listener added in renderPopup body (not initPopup) — re-registered on each render, consistent with clone-and-replace pattern"

patterns-established:
  - "Highlight test pattern: import content.js once, capture onMessage listener, reset DOM in beforeEach, call listener directly"

requirements-completed: [POP-04, POP-05, CFG-05]

# Metrics
duration: 6min
completed: 2026-03-23
---

# Phase 3 Plan 02: Interactive Features and Actions Menu Summary

**Hover highlights (content.js message handlers) + Actions menu (Export/Delete All/Shortcuts) — 21 new tests, 93 total green**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-23T07:13:22Z
- **Completed:** 2026-03-23T07:19:11Z
- **Tasks:** 3 (all TDD with RED/GREEN cycle)
- **Files modified:** 4

## Accomplishments

- content.js: HIGHLIGHT_SELECTOR handler applies `2px solid #2563EB` outline + `data-hrtl-highlight="1"` attribute to matching DOM elements; clears previous highlights first; auto-clear timeout (5s); invalid selector caught silently
- content.js: CLEAR_HIGHLIGHT handler removes outline and attribute from all highlighted elements; both handlers call `sendResponse({ ok: true })`
- popup.js: hover wiring on every selector row — mouseenter sends HIGHLIGHT_SELECTOR, mouseleave sends CLEAR_HIGHLIGHT, errors silently swallowed
- popup.js: window unload listener sends CLEAR_HIGHLIGHT when popup closes
- popup.js: Export Config fully implemented — calls `getAllConfigs()`, creates Blob with `application/json`, triggers anchor download as `hebrew-rtl-config-YYYY-MM-DD.json`
- popup.js: Escape key listener closes actions menu
- popup.js: no `window.confirm()` anywhere — custom HTML confirm dialog used throughout
- Full suite: 93 tests, 7 suites, all green; up from 72 tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Add HIGHLIGHT_SELECTOR and CLEAR_HIGHLIGHT handlers to content.js** - `2f389e3` (feat)
2. **Task 2: Wire popup hover highlights and popup close cleanup** - `7bfc5eb` (feat)
3. **Task 3: Implement Actions menu (Export, Delete All, Shortcuts)** - `3fa00aa` (feat)

_All 3 tasks used TDD (RED → GREEN cycle)_

## Files Created/Modified

- `content.js` — Added HIGHLIGHT_SELECTOR and CLEAR_HIGHLIGHT message handlers with auto-clear timer
- `popup/popup.js` — Added mouseenter/mouseleave hover wiring, window unload cleanup, Export Config Blob download, Escape key handler, `getAllConfigs` import; renderPopup now syncs module-level state
- `tests/content.test.js` — 8 new tests for highlight handlers using ESM single-import pattern
- `tests/popup.test.js` — 13 new tests: 4 hover tests + 9 actions menu tests; `mockGetAllConfigs` extracted as controllable variable

## Decisions Made

- **ESM module caching for content.js tests:** `content.js` is imported once per describe block (not per beforeEach) because ESM modules are cached after first import. The `chrome.runtime.onMessage.addListener` call fires only once, so the listener is captured from `mock.calls[calls.length - 1]` after the first import, then reused across all tests with fresh DOM state.
- **renderPopup syncs module-level state:** Added `_hostname = hostname; _config = config; _tabId = tabId` at the top of `renderPopup` so that the window unload handler (registered at module load time, closed over `_tabId`) gets the correct tabId even when tests call `renderPopup` directly without going through `initPopup`.
- **Escape handler in renderPopup body:** Consistent with the Plan 01 pattern of registering all event listeners inside `renderPopup`. This means the handler is re-added on each render but only reads from the live DOM, not stale closures.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Popup is feature-complete for v1: toggle, selector list (hover highlights), add-selector placeholder, Export Config, Delete All (custom confirm), Keyboard Shortcuts
- Phase 04 (end-to-end testing / packaging) can begin with no popup blockers
- content.js highlight handlers are ready for any future popup features that need visual preview

---
*Phase: 03-popup-ui-and-config-actions*
*Completed: 2026-03-23*
