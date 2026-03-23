---
phase: 04-visual-element-picker
verified: 2026-03-23T00:00:00Z
status: human_needed
score: 11/11 must-haves verified
re_verification: false
human_verification:
  - test: "Full picker flow end-to-end in Chrome"
    expected: "Popup '+' click activates picker (crosshair cursor, orange banner), hover shows orange outline and tooltip with tag/classes/selector, Escape resets cleanly, clicking element opens Selector Builder overlay at bottom, ancestor dropdown changes live blue highlight, Save writes selector visible in popup list, Cancel/Escape from overlay resets without saving"
    why_human: "Shadow DOM rendering, z-index stacking, cursor changes, and cross-page interaction cannot be verified programmatically"
---

# Phase 4: Visual Element Picker Verification Report

**Phase Goal:** Deliver a visual element picker that lets users select page elements using a hover-and-click UI, builds a CSS selector from the chosen element, and saves it to storage so the RTL engine applies to that selector on future page loads.
**Verified:** 2026-03-23
**Status:** human_needed — all automated checks pass, one human verification item required
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Clicking '+' in popup sends PICKER_ACTIVATE to content script and closes popup | VERIFIED | `popup/popup.js` line 126: `chrome.tabs.sendMessage(_tabId, { type: 'PICKER_ACTIVATE', hostname: _hostname })` + line 128: `window.close()`. No `add-selector-msg` logic remains. |
| 2 | Hovering over any element shows orange outline and tooltip with tag, classes, selector | VERIFIED | `lib/picker.js`: `applyPickerOutline` sets `outline: 2px solid #F59E0B`; `injectPickerTooltip` renders `ancestorLabel(el)<br>generateSelector(el)` in Shadow DOM |
| 3 | Pressing Escape fully resets page to pre-picker state | VERIFIED | `onPickerKeyDown` calls `pickerReset()`; `pickerReset` removes banner, tooltip, overlay, outline, cursor, all event listeners, clears live preview |
| 4 | Clicks on page elements during picker hover are intercepted | VERIFIED | `onPickerClick` (capture phase): `e.stopPropagation(); e.preventDefault()` before any other action |
| 5 | Hovering inside shadow root correctly identifies inner element via composedPath | VERIFIED | `onPickerMouseMove`: `const composedPath = e.composedPath ? e.composedPath() : [e.target]; const target = composedPath[0]` |
| 6 | Selector Builder overlay appears after clicking an element | VERIFIED | `pickerOpenOverlay(target)` creates `hrtl-picker-overlay-host` with full Shadow DOM panel; not a stub (`console.log` stub replaced) |
| 7 | Ancestor dropdown updates live page highlight | VERIFIED | `selectEl.addEventListener('change', ...)` → `rebuildFilters(chain[idx])` + `updateSelectorPreview()` → `livePreviewSelector(selectorStr)` applies `data-hrtl-highlight` blue outline |
| 8 | Class/attribute filter toggles update selector preview in real time | VERIFIED | Checkboxes wire to `updateSelectorPreview()` which calls `buildSelector(ancestor, checkedClasses, checkedAttrs)` and updates `#selector-preview` textContent |
| 9 | Save writes generated selector to chrome.storage.sync for current domain | VERIFIED | `pickerSave(selectorString)` at line 676: `chrome.storage.sync.set({ [key]: config })` with `local.set` fallback; config appends `{ selector, enabled: true, forceRTL: true }` |
| 10 | Cancel/Escape from overlay cleans up without saving | VERIFIED | Cancel button and close (×) button both call `pickerReset()`; `onPickerKeyDown` Escape also calls `pickerReset()` which runs `clearLivePreview()` before removing all DOM |
| 11 | After saving, popup shows new selector (via storage.onChanged) | VERIFIED | `pickerSave` writes to `chrome.storage.sync`; existing `storage.onChanged` listener in `content.js` and popup's `storage.onChanged` re-render the selector list — no additional wiring needed |

**Score:** 11/11 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/picker.js` | Picker state machine, selector utilities, banner/tooltip/overlay Shadow DOM, pickerSave, livePreviewSelector | VERIFIED | 740 lines; exports `PICKER_STATE`, `generateSelector`, `buildAncestorChain`, `ancestorLabel`, `buildSelector`, `pickerActivate`, `pickerReset`, `pickerOpenOverlay`, `pickerSave`, `livePreviewSelector`, `clearLivePreview`, `getRelevantAttributes`; sets `window._hrtlPicker` |
| `lib/picker.browser.js` | Browser-safe (no ESM export) version of picker.js loaded as content script | VERIFIED | 724 lines; identical implementation to `lib/picker.js` but without `export {}` statement — loads as classic script in Chrome without SyntaxError; sets `window._hrtlPicker` |
| `content.js` | PICKER_ACTIVATE and PICKER_DEACTIVATE message handlers, visibilitychange auto-reset | VERIFIED | Lines 250-254: `visibilitychange` listener; lines 305-314: `PICKER_ACTIVATE` and `PICKER_DEACTIVATE` handlers delegating to `window._hrtlPicker` |
| `popup/popup.js` | Replaced Coming Soon handler with PICKER_ACTIVATE message send + window.close() | VERIFIED | Lines 120-130: `async` click handler sends `PICKER_ACTIVATE` with hostname; calls `window.close()`; no `add-selector-msg` logic |
| `manifest.json` | content_scripts loads picker before content.js | VERIFIED | `"js": ["lib/picker.browser.js", "content.js"]` — picker loads first, `window._hrtlPicker` is available when content.js runs |
| `tests/picker.test.js` | 45 unit tests covering all picker functions | VERIFIED | 45 tests pass: generateSelector, buildAncestorChain, ancestorLabel, buildSelector, PICKER_STATE, pickerActivate, pickerReset, Escape key, getRelevantAttributes, livePreviewSelector, pickerOpenOverlay, pickerSave |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `popup/popup.js` | `content.js` | `chrome.tabs.sendMessage({ type: 'PICKER_ACTIVATE' })` | WIRED | Line 126 sends message; line 305 in content.js receives it |
| `content.js` | `lib/picker.browser.js` | `window._hrtlPicker` namespace set before content.js runs | WIRED | manifest loads `picker.browser.js` first; content.js checks `typeof window._hrtlPicker !== 'undefined'` before each call |
| `manifest.json` | `lib/picker.browser.js` | content_scripts js array, first entry | WIRED | `"js": ["lib/picker.browser.js", "content.js"]` |
| `lib/picker.js (pickerSave)` | `chrome.storage.sync` | `chrome.storage.sync.set` with `domains.hostname` key | WIRED | Line 688: `await chrome.storage.sync.set({ [key]: config })` + line 690 local fallback |
| `lib/picker.js (livePreviewSelector)` | `document.querySelectorAll` | `data-hrtl-highlight` attribute pattern | WIRED | Lines 237-247: clears existing highlights, applies `outline: 2px solid #2563EB` + `data-hrtl-highlight="1"` |
| `lib/picker.js (overlay dropdown)` | `livePreviewSelector` | direct call in `updateSelectorPreview()` closure | WIRED | Line 643: `livePreviewSelector(selectorStr)` called in `updateSelectorPreview` wired to dropdown `change` event |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PICK-01 | 04-01-PLAN.md | Visual element picker: hover outline + tooltip, click to select | SATISFIED | `pickerActivate` → hover outline + tooltip via Shadow DOM; click interception in `onPickerClick` |
| PICK-02 | 04-02-PLAN.md | Selector Builder overlay with ancestor dropdown, live preview, class/attr filters | SATISFIED | `pickerOpenOverlay` creates full Shadow DOM panel with all 6 spec sections; live preview wired |
| PICK-03 | 04-02-PLAN.md | Save writes selector to chrome.storage.sync; Cancel discards | SATISFIED | `pickerSave` writes to sync storage; Cancel/Escape calls `pickerReset()` without storage write |

No orphaned requirements — all three PICK-* IDs claimed in plan frontmatter are satisfied. REQUIREMENTS.md marks all three as complete for Phase 4.

---

## Notable Implementation Deviations

**1. picker.browser.js vs lib/picker.js in manifest**

The plan specified `"lib/picker.js"` in manifest.json. The final implementation uses `"lib/picker.browser.js"` — a separately generated file that is identical to `lib/picker.js` but strips the `export {}` statement. This was required because `lib/picker.js` has ESM `export` syntax which causes a Chrome SyntaxError when loaded as a classic content script. The browser file is the correct approach for Chrome MV3 compatibility without `"type": "module"` in content_scripts. Commit `fc77661` documents this intentional fix.

**2. forceRTL: true instead of false**

The plan spec said `{ selector, enabled: true, forceRTL: false }`. The implementation uses `forceRTL: true` (commit `99025b4`: "fix: default forceRTL:true when saving picker selector"). This is a deliberate product decision — selectors added via the picker should always apply RTL regardless of content detection. Tests confirm `forceRTL: true` is the expected value.

Both deviations improve correctness over the plan spec.

---

## Anti-Patterns Found

None found. No TODO/FIXME/placeholder comments in modified files. `pickerOpenOverlay` stub replaced with full implementation. No empty handlers.

---

## Human Verification Required

### 1. Full Picker Flow End-to-End

**Test:** Load the extension unpacked in Chrome. Navigate to any content site (e.g. chatgpt.com). Open popup, click '+'. Hover over page elements. Press Escape. Repeat and click an element. Interact with the Selector Builder overlay. Save a selector. Open popup and check the list. Test Cancel and Escape from overlay.

**Expected:** Crosshair cursor and orange banner appear after '+'; hovering shows orange outline + dark tooltip with tag/selector text; Escape resets all (no outline, no banner, default cursor); clicking element shows fixed bottom panel "Configure Selector" with ancestor dropdown, class/attr filter checkboxes, selector preview; changing dropdown updates blue highlight on page; Save closes overlay, resets page, new selector appears in popup list; Cancel and Escape reset without saving.

**Why human:** Shadow DOM rendering, z-index stacking context correctness, cursor change visibility, real browser composedPath behavior, cross-page interaction timing, and popup re-render after storage write cannot be verified programmatically.

---

## Summary

All 11 observable truths are verified against the codebase. All 6 required artifacts exist, are substantive (not stubs), and are properly wired. All 3 requirement IDs (PICK-01, PICK-02, PICK-03) are satisfied. 138 tests pass (45 picker-specific). The only gap is the blocking human checkpoint in Plan 02 (Task 2), which is expected for visual/browser behavior. The automated implementation is complete and correct.

---

_Verified: 2026-03-23_
_Verifier: Claude (gsd-verifier)_
