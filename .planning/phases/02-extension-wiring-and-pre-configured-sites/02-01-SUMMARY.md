---
phase: 02-extension-wiring-and-pre-configured-sites
plan: "01"
subsystem: infra
tags: [manifest, chrome-extension, mv3, keyboard-shortcut, service-worker, permissions]

# Dependency graph
requires:
  - phase: 01-rtl-engine
    provides: content.js and manifest.json minimal MV3 skeleton from Phase 1

provides:
  - Complete MV3 manifest with storage/activeTab/tabs/scripting permissions
  - Background service worker declaration (background.js, type module)
  - Action block for badge API support
  - toggle-rtl command with Ctrl+Shift+H (Windows/Linux) and MacCtrl+Shift+H (macOS)

affects:
  - 02-02-background-worker (reads background.service_worker from manifest)
  - 02-03-storage-and-badge (reads permissions.storage and action block)
  - 02-04-content-wiring (reads content_scripts block and permissions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MV3 manifest as single contract: all Chrome APIs declared upfront, version bumped per phase"
    - "Commands block provides user-customizable keyboard shortcuts at no code cost (chrome://extensions/shortcuts)"

key-files:
  created: []
  modified:
    - manifest.json

key-decisions:
  - "Removed 'type: module' from content_scripts — not officially listed in Chrome manifest docs; plan 02-04 handles import resolution"
  - "Background service worker declared with type: module — confirmed supported by Chrome MV3"
  - "Version bumped to 0.2.0 to mark Phase 2 manifest boundary"

patterns-established:
  - "Pattern 1: Manifest version mirrors phase — 0.1.0 = Phase 1, 0.2.0 = Phase 2"
  - "Pattern 2: All four permissions (storage, activeTab, tabs, scripting) declared together as Phase 2 baseline"

requirements-completed: [KBD-01, KBD-02]

# Metrics
duration: 1min
completed: 2026-03-22
---

# Phase 2 Plan 01: Manifest Expansion Summary

**MV3 manifest upgraded to 0.2.0 with storage/tabs/scripting permissions, background service worker, action block, and toggle-rtl keyboard command (Ctrl+Shift+H)**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-22T14:29:29Z
- **Completed:** 2026-03-22T14:30:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Manifest version bumped from 0.1.0 to 0.2.0 as Phase 2 baseline
- Four permissions added: storage, activeTab, tabs, scripting
- Background service worker declared pointing to background.js with type: module
- Action block added enabling chrome.action badge API
- Commands block added with toggle-rtl (Ctrl+Shift+H default, MacCtrl+Shift+H macOS) satisfying KBD-01 and KBD-02
- Removed unsupported `"type": "module"` from content_scripts
- All 38 existing tests still pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand manifest.json with Phase 2 declarations** - `a2c21ee` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `manifest.json` - Full Phase 2 MV3 manifest: permissions, background worker, action, commands

## Decisions Made
- Removed `"type": "module"` from content_scripts: Chrome's official manifest reference does not list `type` as a valid content_scripts field. Plan 02-04 will resolve content.js module imports by a different strategy.
- Background service worker declared with `"type": "module"`: confirmed supported by Chrome MV3 specification.
- Version bumped to 0.2.0 to clearly mark the Phase 2 manifest boundary.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- manifest.json is now the complete contract for all Phase 2 components
- 02-02 can implement background.js service worker (declaration in place)
- 02-03 can implement storage and badge API (permissions + action block in place)
- 02-04 can implement content.js wiring (content_scripts block ready, type: module removal noted)
- Keyboard shortcut toggle-rtl is now user-customizable via chrome://extensions/shortcuts without any code changes (KBD-02 satisfied)

---
*Phase: 02-extension-wiring-and-pre-configured-sites*
*Completed: 2026-03-22*
