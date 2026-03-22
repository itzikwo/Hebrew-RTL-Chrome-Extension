---
phase: 02-extension-wiring-and-pre-configured-sites
plan: 03
subsystem: background-worker
tags: [chrome-extension, service-worker, mv3, keyboard-shortcut, badge, storage]

# Dependency graph
requires:
  - phase: 02-02
    provides: lib/storage.js storage abstraction (getDomainConfig, setDomainConfig, getAllConfigs)
  - phase: 02-01
    provides: manifest.json with 'toggle-rtl' command, background service_worker declaration
  - phase: 02-00
    provides: createChromeMock() test factory for Chrome API stubs
provides:
  - background.js: MV3 service worker registering 4 Chrome event listeners
  - lib/background-handlers.js: exported handler functions (handleInstalled, handleCommand, updateBadgeForActiveTab)
affects:
  - 02-04 (content script integration — TOGGLE_DOMAIN message handler needed)
  - 02-05 (popup — can read badge state and domain enable/disable)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Handler extraction pattern: background.js registers listeners, lib/background-handlers.js exports the logic for testability
    - Stateless service worker: no module-scope state, every handler reads fresh from chrome.storage
    - Silent error catch: chrome.tabs.sendMessage wrapped in try/catch for chrome:// pages and PDFs

key-files:
  created:
    - background.js
    - lib/background-handlers.js
  modified:
    - tests/background.test.js

key-decisions:
  - "Handler extraction to lib/background-handlers.js for testability — avoids Jest ESM module caching issues with top-level listener registration in service workers"
  - "handleInstalled receives defaultDomains as parameter — enables clean mocking without jest.unstable_mockModule ESM cache-busting complexity"
  - "Silent catch on sendMessage errors — correct for chrome:// pages, PDFs, extension pages where content script is absent"

patterns-established:
  - "background.js is a thin registration shell; logic lives in lib/background-handlers.js"
  - "Install seeding checks existing keys before writing — safe idempotent seed that preserves user customizations"

requirements-completed: [KBD-01, CFG-01]

# Metrics
duration: 8min
completed: 2026-03-22
---

# Phase 2 Plan 03: Background Service Worker Summary

**MV3 service worker with install seeding (5 default domains), Ctrl+Shift+H keyboard routing via TOGGLE_DOMAIN, and live badge reflecting domain enabled state from storage**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-22T14:30:00Z
- **Completed:** 2026-03-22T14:38:52Z
- **Tasks:** 1 (TDD)
- **Files modified:** 3 (background.js created, lib/background-handlers.js created, tests/background.test.js filled in)

## Accomplishments
- background.js service worker registering all 4 required Chrome event listeners (onInstalled, onCommand, onChanged, onActivated)
- lib/background-handlers.js with exported handleInstalled, handleCommand, updateBadgeForActiveTab — testable without ESM module caching complications
- Install seeding: reads existing storage keys first, only sets configs for domains not already configured
- Badge shows 'ON' for enabled domains, '' for disabled, always color #2563EB
- 8 tests passing, 60 total suite green

## Task Commits

Each task was committed atomically:

1. **Task 1: Background service worker with install seeding and keyboard routing** - `00eaaec` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `background.js` - MV3 service worker; thin registration shell delegating to background-handlers
- `lib/background-handlers.js` - Exported handler functions for testability; contains all logic
- `tests/background.test.js` - 8 tests covering onInstalled (3), onCommand (2), updateBadgeForActiveTab (3)

## Decisions Made
- **Handler extraction pattern:** The plan offered two approaches — dynamic import with cache busting (tricky ESM) vs extracting handlers to a separate module. Chose extraction because it's cleaner, avoids Jest ESM caching edge cases, and produces better-organized code.
- **defaultDomains as parameter to handleInstalled:** Passing DEFAULT_DOMAINS as a parameter rather than using jest.unstable_mockModule eliminates the ESM mock complexity entirely. The handler doesn't care where the domains come from.
- **Minimal background.js wrapper:** background.js calls handler functions without awaiting (fire-and-forget registration pattern) matching Chrome MV3 service worker expectations.

## Deviations from Plan

None — plan executed exactly as written. The plan explicitly pre-authorized the handler extraction approach as an alternative if dynamic import with cache-busting proved difficult.

## Issues Encountered
- `tests/default-sites.test.js` existed with real tests (filled in by a parallel plan run) and had a jest `toHaveProperty` dot-path issue. On inspection, it already used the array form `toHaveProperty([host])` — this was a false alarm from stash/unstash cycle confusion during investigation. No fix needed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- background.js is ready; content script (02-04) needs to handle the TOGGLE_DOMAIN message
- Badge logic is complete — popup (02-05) can build on it for UI state
- Pre-configured sites seeding is working — 02-04 default-sites.js is the prerequisite data source

---
*Phase: 02-extension-wiring-and-pre-configured-sites*
*Completed: 2026-03-22*
