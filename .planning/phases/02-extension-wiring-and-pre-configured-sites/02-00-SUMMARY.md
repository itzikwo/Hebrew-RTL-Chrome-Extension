---
phase: 02-extension-wiring-and-pre-configured-sites
plan: 00
subsystem: testing
tags: [jest, chrome-api, mocks, esm, test-scaffold]

# Dependency graph
requires:
  - phase: 01-rtl-engine
    provides: "Jest ESM test infrastructure, @jest/globals import pattern"
provides:
  - "tests/__mocks__/chrome.js — reusable Chrome API mock factory for all Phase 2 tests"
  - "tests/storage.test.js — todo stubs for lib/storage.js (7 tests)"
  - "tests/background.test.js — todo stubs for background.js (8 tests)"
  - "tests/default-sites.test.js — todo stubs for config/default-sites.js (7 tests)"
affects:
  - 02-01-default-sites
  - 02-02-storage
  - 02-03-background
  - 02-04-content-wiring

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "createChromeMock() factory pattern — returns fresh mock per call, no shared state between tests"
    - "globalThis.chrome = createChromeMock() in beforeEach for per-test isolation"
    - "it.todo() stubs for Wave 0 — stubs fail red until implementation plans supply production code"

key-files:
  created:
    - tests/__mocks__/chrome.js
    - tests/storage.test.js
    - tests/background.test.js
    - tests/default-sites.test.js
  modified: []

key-decisions:
  - "Factory function pattern (not module-level singleton) ensures no shared mock state between tests"
  - "it.todo() stubs chosen over empty describe blocks so test runner reports correct todo count (22 stubs)"
  - "storage.test.js kept as todo stubs in Wave 0 — full tests require lib/storage.js which is Plan 02-02"

patterns-established:
  - "Chrome mock: import createChromeMock from './__mocks__/chrome.js', set globalThis.chrome in beforeEach"
  - "Wave 0 scaffold: todo stubs compile and run as skipped, not failures"

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-03-22
---

# Phase 2 Plan 00: Test Scaffold and Chrome API Mocks Summary

**Chrome API mock factory and 22 todo test stubs establishing the test-first foundation for all Phase 2 implementation plans**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-22T14:29:41Z
- **Completed:** 2026-03-22T14:37:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `tests/__mocks__/chrome.js` with `createChromeMock()` factory covering storage.sync, storage.local, storage.onChanged, tabs, runtime, action, and commands APIs
- Created three test stub files (storage, background, default-sites) with 22 todo stubs covering all Phase 2 requirements
- Full test suite runs green: 22 todos (skipped) + 38 passing Phase 1 tests, zero failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Chrome API mock module** - `8163bfd` (feat)
2. **Task 2: Create test stub files for storage, background, and default-sites** - `d55c6f6` (feat)

**Plan metadata:** _(final docs commit hash — appended after state update)_

## Files Created/Modified

- `tests/__mocks__/chrome.js` — createChromeMock() factory with jest.fn() stubs for all Chrome Extension APIs
- `tests/storage.test.js` — 7 todo stubs for getDomainConfig, setDomainConfig, getAllConfigs
- `tests/background.test.js` — 8 todo stubs for onInstalled, onCommand toggle-rtl, updateBadgeForActiveTab
- `tests/default-sites.test.js` — 7 todo stubs for DEFAULT_DOMAINS (5 platform entries)

## Decisions Made

- Used factory function pattern (`createChromeMock()`) instead of a module-level singleton, so each `beforeEach` gets a fresh mock with no state bleed between tests
- Kept `storage.test.js` as pure todo stubs even though tooling attempted to auto-fill full tests — Wave 0 scope is stubs only; full tests belong to Plan 02-02 when `lib/storage.js` exists

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] storage.test.js auto-replaced with full implementation tests by tooling**
- **Found during:** Task 2 (test stub creation)
- **Issue:** External tooling replaced todo stubs with full tests importing `lib/storage.js` (which doesn't exist in Wave 0), causing suite failure
- **Fix:** Restored storage.test.js to todo-stub form matching plan spec via `git checkout`
- **Files modified:** tests/storage.test.js
- **Verification:** `npm test --no-coverage` reports 22 todos + 38 passing, zero failures
- **Committed in:** d55c6f6 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix restored plan-correct behavior. No scope creep.

## Issues Encountered

The plan's `<verify>` command for Task 1 (`node -e "import('./tests/__mocks__/chrome.js')..."`) fails outside Jest context because `@jest/globals` named exports only work within Jest's runtime. The verification was performed via `npm test` instead, which is the correct approach for Jest-specific modules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 22 todo stubs are in place — implementation plans (02-01 through 02-04) can run `npm test` immediately as verification
- Chrome mock covers all APIs needed for background.js and storage.js tests
- Phase 1 tests (38 passing) remain unaffected
