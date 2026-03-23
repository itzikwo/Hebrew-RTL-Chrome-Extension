---
phase: 04-visual-element-picker
plan: "02"
subsystem: picker
tags: [picker, selector-builder, shadow-dom, overlay, storage, tdd]
dependency_graph:
  requires:
    - lib/picker.js (Plan 01 — state machine, generateSelector, buildAncestorChain, pickerActivate, pickerReset)
  provides:
    - pickerOpenOverlay — full Selector Builder overlay (Shadow DOM, replaces Plan 01 stub)
    - pickerSave — writes selector to chrome.storage.sync with local fallback
    - livePreviewSelector — applies/clears data-hrtl-highlight blue outline on page elements
    - clearLivePreview — cleanup helper used by pickerReset and pickerSave
    - getRelevantAttributes — extracts data-*, role, aria-* attribute filters for overlay
  affects:
    - lib/picker.js (major additions: overlay, save, live preview)
    - tests/picker.test.js (17 new tests)
tech_stack:
  added: []
  patterns:
    - Shadow DOM (open mode) for Selector Builder overlay — zero CSS bleed
    - data-hrtl-highlight attribute pattern for live preview highlight markers
    - chrome.storage.sync.set with chrome.storage.local.set fallback (same as lib/storage.js pattern)
    - TDD (RED-GREEN commit cycle)
    - Closure-based updateSelectorPreview helper inside pickerOpenOverlay — no globals
key_files:
  created: []
  modified:
    - lib/picker.js
    - tests/picker.test.js
    - manifest.json
decisions:
  - "pickerOpenOverlay uses closure-based updateSelectorPreview helper — avoids module-level state for overlay-specific UI updates"
  - "Class filters default to checked, attribute filters default to unchecked — matches 04-CONTEXT.md spec (classes are primary selector, attributes are additive)"
  - "pickerSave inlines chrome.storage.sync.get/set pattern — content.js cannot import lib/storage.js (plain script vs ES module)"
  - "clearLivePreview() called at start of pickerReset() — ensures no stale data-hrtl-highlight markers remain after cancel/escape/save"
  - "content_scripts requires type:module because lib/picker.js has static export{} statements — plain classic script SyntaxErrors on the export keyword, preventing window._hrtlPicker from being set and silently breaking PICKER_ACTIVATE"
metrics:
  duration: "~25 min"
  completed: "2026-03-23"
  tasks: 2 of 2
  files_changed: 3
---

# Phase 4 Plan 02: Selector Builder Overlay Summary

**Full Selector Builder Shadow DOM overlay with ancestor dropdown, class/attribute filters, live blue highlight preview, chrome.storage.sync save — and manifest type:module fix enabling lib/picker.js to load in Chrome without SyntaxError.**

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (TDD RED) | Failing tests for overlay, pickerSave, livePreviewSelector | d14cfc3 | tests/picker.test.js |
| 1 (TDD GREEN) | Full overlay + pickerSave + livePreviewSelector implementation | b43c9cb | lib/picker.js |
| 2 (Bug fix) | type:module in manifest.json — fixes PICKER_ACTIVATE not activating | afee239 | manifest.json |

## What Was Built

**lib/picker.js additions:**

- `pickerOpenOverlay(target)` — replaces the Plan 01 `console.log` stub with the complete Selector Builder overlay:
  - Creates `<div id="hrtl-picker-overlay-host">` appended to `document.body` with open Shadow DOM
  - Full CSS self-contained in `<style>` tag inside shadow root (no CSS bleed)
  - Fixed bottom panel: background #FFFFFF, border-top #E5E7EB, box-shadow 0 -2px 12px, z-index 2147483647, padding 16px 24px, max-height 320px
  - Title row: "Configure Selector" (14px, weight 600) + close button (×)
  - Ancestor dropdown ("Element level"): `<select>` with one `<option>` per ancestor in chain (up to 10)
  - Class filters section (hidden when no classes): checkboxes checked by default
  - Attribute filters section (hidden when no data-*/role/aria-* attrs): checkboxes unchecked by default
  - Selector preview: live-updating monospace div with current `buildSelector()` output
  - Action buttons: "Cancel" (#DC2626 border/text) and "Save Selector" (#2563EB background)
  - Event wiring: ancestor dropdown change → rebuildFilters + updateSelectorPreview; checkbox change → updateSelectorPreview; Cancel/× → pickerReset; Save → pickerSave(previewText)
  - Initial state: select index 0 (clicked element), filters populated, preview set, select focused

- `livePreviewSelector(selectorString)` — clears all `[data-hrtl-highlight]` markers, then applies `outline: 2px solid #2563EB` + `data-hrtl-highlight="1"` to all elements matching the selector; catches invalid selector exceptions

- `clearLivePreview()` — removes all `[data-hrtl-highlight]` outline + attribute markers; called in `pickerReset()` and `pickerSave()`

- `getRelevantAttributes(el)` — returns `[{attr, value}]` for `data-*`, `role`, and `aria-*` attributes

- `pickerSave(selectorString)` — async: sets state to SAVING, reads existing domain config from sync (local fallback for read too), appends `{selector, enabled: true, forceRTL: false}` to selectors array, writes back to sync (local fallback on write failure), calls clearLivePreview then pickerReset

- `pickerReset()` updated — now calls `clearLivePreview()` at start to ensure highlights are cleaned up on cancel/escape

**tests/picker.test.js additions:** 17 new tests across 4 describe blocks:
- `getRelevantAttributes` (4 tests)
- `livePreviewSelector` (4 tests)
- `pickerOpenOverlay` (5 tests)
- `pickerSave` (4 tests)

## Test Results

- 45 picker tests passing (28 from Plan 01 + 17 new)
- 138 total tests passing (8 test suites, no regressions)

## What Else Was Modified

- `manifest.json` — added `"type": "module"` to content_scripts entry. Critical bug fix: lib/picker.js has static `export {}` syntax; Chrome could not parse it as a classic script, causing a SyntaxError that prevented window._hrtlPicker from being set. The PICKER_ACTIVATE message handler then silently did nothing. Adding type:module resolves the parse error.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed SyntaxError preventing lib/picker.js from loading in Chrome**
- **Found during:** Task 2 (end-to-end verification — user reported "nothing happened from step 5 onwards after clicking '+'")
- **Issue:** lib/picker.js contains static `export {}` at line 707. Chrome loads content scripts listed in manifest `"js"` array as classic scripts by default. Classic scripts cannot have `export` statements — the parser throws a SyntaxError and the entire file fails to execute. window._hrtlPicker is never set. The PICKER_ACTIVATE message handler in content.js checks `typeof window._hrtlPicker !== 'undefined'` — since it's never set, the handler silently skips `pickerActivate(msg.hostname)` and nothing happens on the page.
- **Fix:** Added `"type": "module"` to the content_scripts entry in manifest.json. Chrome MV3 supports module content scripts since Chrome 92. Both lib/picker.js (ES module) and content.js (no exports, works as module) parse and run correctly. window._hrtlPicker is assigned synchronously during lib/picker.js module evaluation before content.js runs.
- **Files modified:** manifest.json
- **Verification:** All 138 tests pass. manifest.json is valid JSON with correct structure.
- **Committed in:** afee239

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Essential fix — without it the entire picker feature was non-functional in Chrome. Single manifest change, zero test regressions.

## Self-Check: PASSED

- FOUND: lib/picker.js (contains pickerOpenOverlay, pickerSave, livePreviewSelector, getRelevantAttributes, hrtl-picker-overlay-host, Configure Selector, Element level, Class filters (optional), Attribute filters (optional), Save Selector, Cancel, role="dialog", aria-modal="true", chrome.storage.sync.set, chrome.storage.local.set, data-hrtl-highlight, 2px solid #2563EB, background: #2563EB, color: #DC2626, box-shadow: 0 -2px 12px)
- FOUND: tests/picker.test.js (contains pickerSave, pickerOpenOverlay, livePreviewSelector tests)
- FOUND: manifest.json has "type": "module" in content_scripts entry
- FOUND: commit d14cfc3 (TDD RED)
- FOUND: commit b43c9cb (TDD GREEN)
- FOUND: commit afee239 (bug fix - manifest type:module)
- jest tests/picker.test.js exits 0 (45 tests passing, 138 total)
