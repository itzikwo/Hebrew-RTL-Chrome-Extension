---
phase: 02-extension-wiring-and-pre-configured-sites
plan: 04
subsystem: config
tags: [chrome-extension, content-script, storage, rtl, default-sites, selectors]

requires:
  - phase: 01-rtl-engine
    provides: applyDirection, processElement, startObserver, stopObserver, MutationObserver integration
  - phase: 02-02
    provides: chrome.storage.sync/local abstraction (getDomainConfig, setDomainConfig)
  - phase: 02-01
    provides: manifest.json with content_scripts (no type:module), background service worker

provides:
  - config/default-sites.js — DEFAULT_DOMAINS with pre-configured selectors for 5 AI/work platforms
  - content.js — storage-integrated content script with init(), loadDelay, onChanged, TOGGLE_DOMAIN handler
  - tests/default-sites.test.js — 7 tests validating shape and constraints of DEFAULT_DOMAINS

affects:
  - 02-03 (background.js install seeding imports DEFAULT_DOMAINS)
  - phase 3 (popup reads from storage, content.js reacts via onChanged)

tech-stack:
  added: []
  patterns:
    - "Option B inline strategy: bidi-detect functions inlined into content.js so Chrome loads it without type:module"
    - "chrome guard pattern: typeof chrome !== 'undefined' wraps all chrome API calls for Jest test isolation"
    - "toHaveProperty([host]) array form: use array syntax for keys containing dots to avoid path traversal"
    - "Reactive storage bus: onChanged fires in content.js when popup or background writes config"

key-files:
  created:
    - config/default-sites.js
    - (tests/default-sites.test.js — replaced stubs with real tests)
  modified:
    - content.js
    - tests/default-sites.test.js

key-decisions:
  - "Option B (inline): bidi-detect functions copied into content.js instead of imported — Chrome content scripts run without type:module so ES import fails in browser; inlining avoids the issue while keeping lib/bidi-detect.js for background.js"
  - "typeof chrome guard: wraps init(), onChanged, and onMessage listeners — prevents ReferenceError in Jest which does not define globalThis.chrome by default in content.test.js and mutation.test.js"
  - "toHaveProperty array form: Jest's toHaveProperty treats dot as path separator; keys like 'chatgpt.com' must use toHaveProperty(['chatgpt.com']) to match literally"
  - "Slack loadDelay=1000ms (>= 200 requirement): set to 1000 matching research finding that Slack SPA loads very late"

patterns-established:
  - "Chrome guard pattern: all chrome API calls guarded with typeof check for test portability"
  - "Option B inline: when ES module imports are unavailable in content scripts, inline from lib/ files"
  - "TDD RED-GREEN: write failing tests first (module not found), then create implementation"

requirements-completed: [CFG-02, CFG-03]

duration: 15min
completed: 2026-03-22
---

# Phase 2 Plan 04: Default Sites Config and Content Script Storage Wiring Summary

**Pre-configured selectors for 5 AI platforms (ChatGPT, Claude, Gemini, NotebookLM, Slack) with content.js wired to chrome.storage for init, reactive updates, and TOGGLE_DOMAIN keyboard shortcut**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-22T14:25:00Z
- **Completed:** 2026-03-22T14:40:12Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `config/default-sites.js` with DEFAULT_DOMAINS for all 5 target platforms with correct loadDelay values and typed selector arrays
- Replaced 7 `it.todo()` stubs in `tests/default-sites.test.js` with real tests covering shape, constraints, and per-platform loadDelay rules
- Wired `content.js` to read domain config from `chrome.storage.sync` on page load (with `chrome.storage.local` fallback), apply `loadDelay`, process all enabled selectors, and start the MutationObserver
- Added reactive config updates via `chrome.storage.onChanged` listener and `TOGGLE_DOMAIN` / `PING` message handling
- Inlined bidi-detect functions into content.js (Option B) to work without ES module imports in Chrome content scripts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create default-sites config and fill in tests** - `f7ff9ba` (feat)
2. **Task 2: Wire content.js to storage, loadDelay, and message handler** - `8c750c6` (feat)

**Plan metadata:** (docs commit — see below)

_Note: Task 1 used TDD: RED (tests failing with module-not-found) → GREEN (config created, all 7 tests pass)_

## Files Created/Modified

- `config/default-sites.js` — DEFAULT_DOMAINS object with pre-configured selectors for 5 platforms
- `tests/default-sites.test.js` — 7 real tests replacing it.todo() stubs
- `content.js` — Inlined bidi-detect functions, added Phase 2 storage integration block with init(), onChanged, onMessage

## Decisions Made

- **Option B (inline bidi-detect):** Since "type": "module" was removed from content_scripts in 02-01, ES module `import` fails in Chrome for content scripts. Inlined the three bidi-detect functions into content.js with underscore-prefixed names to avoid collision. lib/bidi-detect.js stays for background.js which does support modules.
- **typeof chrome guard:** All Phase 2 chrome API calls wrapped in `if (typeof chrome !== 'undefined')` so content.test.js and mutation.test.js can import from content.js without setting up chrome mocks.
- **toHaveProperty array form:** Fixed test failure where `toHaveProperty('chatgpt.com')` was interpreted as path traversal. Used `toHaveProperty(['chatgpt.com'])` to match literal dot-containing keys.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed toHaveProperty dot-path traversal in tests**
- **Found during:** Task 1 (TDD GREEN phase — tests ran but one assertion failed)
- **Issue:** `expect(DEFAULT_DOMAINS).toHaveProperty('chatgpt.com')` — Jest interprets the string as a nested path `chatgpt` > `com`, not as a literal key. The assertion failed even though the key exists.
- **Fix:** Changed to `toHaveProperty([host])` (array form) which treats the string as a literal property name
- **Files modified:** tests/default-sites.test.js
- **Verification:** All 7 default-sites tests pass
- **Committed in:** f7ff9ba (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test assertion)
**Impact on plan:** Essential fix for test correctness. No scope creep.

## Issues Encountered

- The test file was briefly reverted by the system mid-execution (write tool error: "file modified since read"). Re-read the file, confirmed it already had the correct content, and continued.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `config/default-sites.js` ready to be imported by `background.js` (02-03) for install seeding
- `content.js` ready to receive config from popup (Phase 3) via `chrome.storage.onChanged`
- All 60 tests green; Phase 2 content script wiring complete
- Concern: Selectors in default-sites.js are MEDIUM confidence — need browser validation before shipping v1.0

## Self-Check: PASSED

All artifacts verified:
- config/default-sites.js: FOUND
- content.js: FOUND
- tests/default-sites.test.js: FOUND
- 02-04-SUMMARY.md: FOUND
- Commit f7ff9ba (Task 1): FOUND
- Commit 8c750c6 (Task 2): FOUND

---
*Phase: 02-extension-wiring-and-pre-configured-sites*
*Completed: 2026-03-22*
