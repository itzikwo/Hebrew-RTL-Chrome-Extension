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
decisions:
  - "pickerOpenOverlay uses closure-based updateSelectorPreview helper — avoids module-level state for overlay-specific UI updates"
  - "Class filters default to checked, attribute filters default to unchecked — matches 04-CONTEXT.md spec (classes are primary selector, attributes are additive)"
  - "pickerSave inlines chrome.storage.sync.get/set pattern — content.js cannot import lib/storage.js (plain script vs ES module)"
  - "clearLivePreview() called at start of pickerReset() — ensures no stale data-hrtl-highlight markers remain after cancel/escape/save"
metrics:
  duration: "~3 min"
  completed: "2026-03-23"
  tasks: 1 of 2 (Task 2 is checkpoint:human-verify — awaiting human approval)
  files_changed: 2
---

# Phase 4 Plan 02: Selector Builder Overlay Summary

**One-liner:** Full Selector Builder Shadow DOM overlay with ancestor dropdown, class/attribute filters, live blue highlight preview, and chrome.storage.sync save with local fallback.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (TDD RED) | Failing tests for overlay, pickerSave, livePreviewSelector | d14cfc3 | tests/picker.test.js |
| 1 (TDD GREEN) | Full overlay + pickerSave + livePreviewSelector implementation | b43c9cb | lib/picker.js |

## Task 2 — Pending

**Task 2: Human verify full picker flow end-to-end** — `checkpoint:human-verify` gate awaiting manual Chrome browser verification.

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

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: lib/picker.js (contains pickerOpenOverlay, pickerSave, livePreviewSelector, getRelevantAttributes, hrtl-picker-overlay-host, Configure Selector, Element level, Class filters (optional), Attribute filters (optional), Save Selector, Cancel, role="dialog", aria-modal="true", chrome.storage.sync.set, chrome.storage.local.set, data-hrtl-highlight, 2px solid #2563EB, background: #2563EB, color: #DC2626, box-shadow: 0 -2px 12px)
- FOUND: tests/picker.test.js (contains pickerSave, pickerOpenOverlay, livePreviewSelector tests)
- FOUND: commit d14cfc3 (TDD RED)
- FOUND: commit b43c9cb (TDD GREEN)
- jest tests/picker.test.js exits 0 (45 tests passing)
