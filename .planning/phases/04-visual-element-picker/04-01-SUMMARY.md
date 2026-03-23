---
phase: 04-visual-element-picker
plan: "01"
subsystem: picker
tags: [picker, selector, shadow-dom, content-script, state-machine, tdd]
dependency_graph:
  requires: []
  provides:
    - lib/picker.js (picker state machine, generateSelector, buildAncestorChain, ancestorLabel, buildSelector)
    - window._hrtlPicker namespace bridge for content.js
    - PICKER_ACTIVATE / PICKER_DEACTIVATE message handlers in content.js
    - popup '+' button activation flow
  affects:
    - content.js (new message handlers + visibilitychange)
    - popup/popup.js (add-selector-btn replaced with real activation)
    - manifest.json (lib/picker.js prepended to content_scripts)
tech_stack:
  added: []
  patterns:
    - Shadow DOM (open mode) for picker banner and tooltip — zero style bleed
    - composedPath() for shadow DOM element identification
    - Named event handler functions for addEventListener/removeEventListener symmetry
    - window._hrtlPicker namespace bridge (ESM exports + plain-script consumption)
    - TDD (RED-GREEN commit cycle)
key_files:
  created:
    - lib/picker.js
    - tests/picker.test.js
  modified:
    - content.js
    - popup/popup.js
    - manifest.json
    - tests/popup.test.js
decisions:
  - "lib/picker.js dual-role: ES module exports for Jest + window._hrtlPicker for content script — same file serves both consumers without duplication"
  - "window.close() in popup add-selector-btn handler requires mocking in Jest (jsdom destroys document on window.close) — mock in test, leave production code correct"
  - "Named functions for all picker event handlers (onPickerMouseMove, onPickerClick, onPickerKeyDown) — required for removeEventListener to work correctly with exact same function reference"
  - "pickerOpenOverlay is a stub placeholder console.log — Plan 02 delivers the Selector Builder overlay"
metrics:
  duration: "4 min"
  completed: "2026-03-23"
  tasks: 2
  files_changed: 6
---

# Phase 4 Plan 01: Element Picker Hover Mode Summary

**One-liner:** Picker state machine with Shadow DOM banner/tooltip, orange outline, composedPath shadow root identification, and PICKER_ACTIVATE wired from popup through content script.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (TDD RED) | Failing picker tests | 1b5decf | tests/picker.test.js |
| 1 (TDD GREEN) | lib/picker.js implementation | 325f90f | lib/picker.js |
| 2 | Wire picker into content.js, popup.js, manifest.json | 6cf8109 | content.js, popup/popup.js, manifest.json, tests/popup.test.js |

## What Was Built

**lib/picker.js** — Full picker state machine with four states (INACTIVE, HOVERING, ELEMENT_SELECTED, SAVING):
- `generateSelector(el)` — id > classes > bare tag, CSS.escape applied
- `buildAncestorChain(el)` — walks up to but not including body, max 10 entries
- `ancestorLabel(el)` — tag#id or tag.classes or bare tag format
- `buildSelector(ancestor, enabledClasses, enabledAttrs)` — assembles selector string
- `pickerActivate(hostname)` — transitions to HOVERING, injects banner, sets crosshair cursor, registers mousemove/click/keydown handlers
- `pickerReset()` — fully restores page to pre-picker state (removes banner, tooltip, outline, cursor, all event listeners)
- `pickerOpenOverlay(target)` — stub placeholder (Plan 02 will deliver the Selector Builder overlay)
- `getPickerState()` — returns current state (testing helper)
- Banner injected via Shadow DOM (open mode): fixed top bar, 40px, z-index 2147483647, orange left border, "Click an element to configure Hebrew RTL — Esc to cancel"
- Tooltip injected via Shadow DOM: dark background, 2-line content (ancestorLabel + generateSelector), positioned 8px above or below hovered element
- Hover outline: 2px solid #F59E0B, saves/restores previous outline values
- `composedPath()` used for shadow DOM element identification

**Integration:**
- `manifest.json`: `lib/picker.js` prepended to content_scripts so `window._hrtlPicker` is available when content.js loads
- `content.js`: PICKER_ACTIVATE and PICKER_DEACTIVATE message handlers added; visibilitychange listener auto-resets picker when tab becomes hidden
- `popup/popup.js`: add-selector-btn handler replaced — sends PICKER_ACTIVATE with hostname then calls window.close()

## Test Results

- 28 picker unit tests added and passing (generateSelector, buildAncestorChain, ancestorLabel, buildSelector, PICKER_STATE enum, pickerActivate, pickerReset, Escape key)
- 121 total tests passing (8 test suites, no regressions)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] window.close() destroys jsdom document context in popup tests**
- **Found during:** Task 2 full suite run
- **Issue:** The new `add-selector-btn` click handler calls `window.close()` (correct for Chrome extension); in jsdom, `window.close()` destroys the window/document context, causing all subsequent popup tests in the same file to fail with `TypeError: Cannot read properties of undefined (reading 'body')`
- **Fix:** Updated the popup test for add-selector-btn to mock `window.close = jest.fn()` before clicking, then restore it. Also updated the test assertion to verify the new PICKER_ACTIVATE behavior (was: checks `add-selector-msg.hidden === false`; now: checks `chrome.tabs.sendMessage` called with PICKER_ACTIVATE and `window.close` called)
- **Files modified:** tests/popup.test.js
- **Commit:** 6cf8109

## Self-Check: PASSED

- FOUND: lib/picker.js
- FOUND: tests/picker.test.js
- FOUND: commit 1b5decf (TDD RED)
- FOUND: commit 325f90f (TDD GREEN)
- FOUND: commit 6cf8109 (Task 2 wiring)
