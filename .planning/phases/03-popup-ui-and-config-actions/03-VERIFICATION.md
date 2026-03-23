---
phase: 03-popup-ui-and-config-actions
verified: 2026-03-23T09:00:00Z
status: human_needed
score: 15/15 must-haves verified
re_verification: true
  previous_status: gaps_found
  previous_score: 13/15
  gaps_closed:
    - "ROADMAP.md Success Criterion 5 updated to describe 'Coming soon' placeholder delivery — criterion now matches implementation"
    - "REQUIREMENTS.md POP-02 updated: element picker trigger per row noted as deferred to Phase 4 (PICK-01)"
    - "REQUIREMENTS.md POP-03 updated: full picker activation noted as delivered in Phase 4 (PICK-01)"
    - "Traceability table rows for POP-02 and POP-03 changed to 'Partial (picker trigger/activation in Phase 4)'"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Load extension unpacked, navigate to chatgpt.com, click the extension icon"
    expected: "Popup opens showing 'chatgpt.com' in header, master toggle reflects stored enabled state, all configured selectors appear as rows with checkboxes and delete buttons"
    why_human: "Chrome extension popup rendering requires a real browser; jsdom tests verify logic only"
  - test: "With popup open on chatgpt.com, hover over a selector row (e.g. .message-content)"
    expected: "Matching elements on the page immediately gain a blue (2px solid #2563EB) outline; moving mouse off the row removes the outline"
    why_human: "Cross-context messaging between popup and content script requires a live browser with the extension loaded"
  - test: "Open Actions menu, click Export Config"
    expected: "Browser triggers a download of hebrew-rtl-config-YYYY-MM-DD.json containing valid JSON with all domain configurations"
    why_human: "Blob + URL.createObjectURL file download requires a real browser"
  - test: "Open Actions menu, click Delete All Selectors"
    expected: "Custom HTML confirm dialog appears inside the popup (not browser native window.confirm); clicking Confirm empties the list and shows empty state"
    why_human: "Dialog visual appearance and positioning requires a real browser"
  - test: "Open Actions menu, click Keyboard Shortcuts"
    expected: "A new browser tab opens to chrome://extensions/shortcuts"
    why_human: "chrome:// URL navigation requires a real Chrome context"
---

# Phase 3: Popup UI and Config Actions — Verification Report

**Phase Goal:** Users can view and control their Hebrew correction settings for any domain through a popup without opening DevTools
**Verified:** 2026-03-23T09:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (plan 03-03)

---

## Re-Verification Summary

**Previous status:** gaps_found (13/15)
**Current status:** human_needed (15/15)

Both documentation gaps from the initial verification are now closed:

1. **Gap 1 closed** — ROADMAP.md Phase 3 Success Criterion 5 was rewritten in commit `b6a0f27`. It now reads: *"Clicking the Add Selector (+) button shows a 'Coming soon' placeholder message — the element picker that creates new selector rows is delivered in Phase 4."* The criterion now matches the implementation exactly.

2. **Gap 2 closed** — REQUIREMENTS.md was updated in commit `6e7f249`. POP-02 now reads: *"Popup lists all configured selectors for the current domain with: enable/disable checkbox and delete button per row (FR-201). Element picker trigger per row deferred to Phase 4 (PICK-01)."* POP-03 now reads: *"Popup includes an Add Selector button (+) that shows a 'Coming soon' placeholder (FR-202). Full picker activation delivered in Phase 4 (PICK-01)."* The traceability table rows for both are updated to "Phase 3 + Phase 4 / Partial (picker trigger/activation in Phase 4)".

No regressions detected. Code artifacts are unchanged from initial verification (popup.js 298 lines, popup.html 364 lines, content.js 300 lines).

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Opening the popup shows domain name and master toggle that immediately enables/disables correction | VERIFIED | `initPopup()` calls `chrome.tabs.query`, sets `#domain-name` from hostname, master toggle bound to `config.enabled`; `setDomainConfig` called on change |
| 2 | Popup lists configured selectors with enable/disable checkboxes and delete buttons | VERIFIED | `renderSelectorRow` creates `.selector-row` with checkbox + delete-btn; picker trigger explicitly deferred to Phase 4 per updated POP-02 |
| 3 | Hovering a selector row highlights matching elements on the live page in real time | VERIFIED | `mouseenter` sends `{ type: 'HIGHLIGHT_SELECTOR', selector }` via `chrome.tabs.sendMessage`; `mouseleave` sends `CLEAR_HIGHLIGHT` |
| 4 | Actions menu lets user download entire config as JSON file | VERIFIED | `getAllConfigs()` called, `Blob` with `application/json`, anchor with `hebrew-rtl-config-YYYY-MM-DD.json` download attribute triggered |
| 5 | Clicking Add Selector (+) shows "Coming soon" placeholder message | VERIFIED | `add-selector-msg` shown for 3 seconds on click. ROADMAP SC5 now accurately describes this behavior. |
| 6 | Master toggle ON — selector list is active; OFF — selector list is visually disabled | VERIFIED | `selector-list--disabled` class (opacity 0.4, pointer-events none) toggled on `config.enabled` change |
| 7 | Delete button removes selector from config and persists | VERIFIED | `splice(index,1)` then `setDomainConfig(hostname, config)` then `renderPopup()` |
| 8 | Actions menu opens on click, closes on outside-click or Escape | VERIFIED | `e.stopPropagation()` on button; document click listener checks `.actions-wrapper` containment; `keydown` Escape handler |
| 9 | Delete All shows custom confirm dialog (not window.confirm) | VERIFIED | `showConfirmDialog()` manipulates `#confirm-dialog` hidden attribute; zero occurrences of `window.confirm` in popup.js |
| 10 | Confirming Delete All empties selectors, persists, and re-renders empty state | VERIFIED | `config.selectors = []`, `setDomainConfig`, `renderPopup` sequence in confirm-ok handler |
| 11 | Keyboard Shortcuts opens chrome://extensions/shortcuts in new tab | VERIFIED | `chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })` in shortcuts handler |
| 12 | Popup shows not-available state on chrome:// pages | VERIFIED | URL parse in `try/catch`; `showNotAvailable()` called on error |
| 13 | Closing popup clears any lingering highlights | VERIFIED | `window.addEventListener('unload', ...)` sends `CLEAR_HIGHLIGHT` to tabId |
| 14 | content.js handles HIGHLIGHT_SELECTOR — blue outline + data-hrtl-highlight attribute | VERIFIED | `outline: '2px solid #2563EB'`, `setAttribute('data-hrtl-highlight', '1')`, 5s auto-clear timer |
| 15 | content.js handles CLEAR_HIGHLIGHT — removes all highlights | VERIFIED | Clears outline and removes `data-hrtl-highlight` attribute |

**Score:** 15/15 truths verified

---

### Required Artifacts

#### Plan 03-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `popup/popup.html` | Full UI shell with all components | VERIFIED | 364 lines. All required IDs present: `master-toggle`, `domain-name`, `selector-list`, `add-selector-btn`, `actions-btn`, `actions-menu`, `confirm-dialog`, `add-selector-msg`, `empty-state`, `not-available`. |
| `popup/popup.js` | Core popup logic | VERIFIED | 298 lines. Imports `getDomainConfig`, `setDomainConfig`, `getAllConfigs`. All handlers implemented. |
| `manifest.json` | default_popup pointing to popup/popup.html | VERIFIED | `"default_popup": "popup/popup.html"` in action block. |
| `tests/popup.test.js` | Unit tests for popup functions | VERIFIED | 413 lines, 25 `it()` calls. All pass. |

#### Plan 03-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `content.js` | HIGHLIGHT_SELECTOR and CLEAR_HIGHLIGHT handlers | VERIFIED | 300 lines. Both handlers present with blue outline and auto-clear timer. |
| `popup/popup.js` | Hover wiring, actions menu, export, delete-all, shortcuts | VERIFIED | All present. `getAllConfigs()`, `Blob`, download anchor, `chrome.tabs.create` shortcuts URL, `config.selectors = []`, no `window.confirm`. |
| `tests/popup.test.js` | Tests for hover, actions, export, delete-all | VERIFIED | 25 tests including hover and actions menu groups. All pass. |
| `tests/content.test.js` | Tests for highlight message handlers | VERIFIED | 8 highlight handler tests. All pass. |

#### Plan 03-03 Artifacts (documentation)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.planning/ROADMAP.md` | SC5 updated to describe placeholder delivery | VERIFIED | SC5 now reads "shows a 'Coming soon' placeholder message — the element picker... is delivered in Phase 4" (commit `b6a0f27`) |
| `.planning/REQUIREMENTS.md` | POP-02 and POP-03 updated with Phase 4 deferral note | VERIFIED | Both requirements updated with Phase 4 picker deferral notes; traceability table rows updated to Partial status (commit `6e7f249`) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `popup/popup.js` | `lib/storage.js` | ES module import | VERIFIED | `import { getDomainConfig, setDomainConfig, getAllConfigs } from '../lib/storage.js'` |
| `popup/popup.js` | `chrome.tabs.query` | active tab hostname resolution | VERIFIED | `await chrome.tabs.query({ active: true, currentWindow: true })` |
| `manifest.json` | `popup/popup.html` | default_popup field | VERIFIED | `"default_popup": "popup/popup.html"` in action block |
| `popup/popup.js` | `content.js` | chrome.tabs.sendMessage HIGHLIGHT_SELECTOR / CLEAR_HIGHLIGHT | VERIFIED | `mouseenter` and `mouseleave` handlers send correct message types |
| `popup/popup.js` | `lib/storage.js` | getAllConfigs for JSON export | VERIFIED | `const allConfigs = await getAllConfigs()` in export handler |
| `content.js` | page DOM | outline style + data-hrtl-highlight attribute | VERIFIED | `el.style.outline = '2px solid #2563EB'` and `el.setAttribute('data-hrtl-highlight', '1')` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| POP-01 | 03-01 | Domain name + master toggle at top | SATISFIED | `#domain-name` set from `new URL(tab.url).hostname`; `#master-toggle` bound to `config.enabled` |
| POP-02 | 03-01 | Selector list with checkbox and delete button per row (picker trigger deferred to Phase 4) | SATISFIED (Phase 3 scope) | Checkbox and delete verified. Picker trigger explicitly noted as Phase 4 (PICK-01) in REQUIREMENTS.md. |
| POP-03 | 03-01 | Add Selector button shows "Coming soon" placeholder (full activation in Phase 4) | SATISFIED (Phase 3 scope) | "Coming soon" tooltip shown for 3 seconds. ROADMAP SC5 and REQUIREMENTS.md now accurately describe this. |
| POP-04 | 03-02 | Hover over selector row highlights matching elements in real time | SATISFIED | mouseenter/mouseleave send HIGHLIGHT_SELECTOR/CLEAR_HIGHLIGHT; content.js applies blue outline |
| POP-05 | 03-02 | Actions menu: Export Config, Delete All, Keyboard Shortcut config | SATISFIED | All three implemented and tested. User Guide link absent from both ROADMAP criteria and plan scope — intentional omission. |
| CFG-05 | 03-02 | Configuration export as downloadable JSON | SATISFIED | Blob download with all-domain config from `getAllConfigs()` implemented and tested |

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `popup/popup.html` line 347 | "Coming soon — element picker in next update" in `#add-selector-msg` | Info | Intentional placeholder per plan. ROADMAP and REQUIREMENTS now align with this delivery. |
| `popup/popup.js` line 128 | `setTimeout(() => { msg.hidden = true; }, 3000)` | Info | Correct use — auto-hides "Coming soon" message after 3 seconds per spec. Not a stub. |

No blocking anti-patterns. No stubs returning empty data. No `window.confirm`. No orphaned artifacts.

---

### Test Suite Status

| Suite | Tests | Result |
|-------|-------|--------|
| `tests/popup.test.js` | 25 | All pass |
| `tests/content.test.js` | 19 (includes 8 highlight handler tests) | All pass |
| Full suite | 93 | All pass — no regressions |

Commits in history: `b6a0f27` (ROADMAP update), `6e7f249` (REQUIREMENTS update), `e0ee5e2` (plan 03-03 completion)

---

### Human Verification Required

All automated checks pass. The following require a real Chrome browser with the extension loaded.

#### 1. Popup rendering in Chrome

**Test:** Load the extension unpacked, navigate to chatgpt.com, click the extension icon.
**Expected:** Popup opens showing "chatgpt.com" in the header, master toggle reflects stored enabled state, all pre-configured selectors appear as rows with checkboxes and delete buttons.
**Why human:** Chrome extension popup rendering requires a real browser; jsdom tests verify logic only.

#### 2. Real-time hover highlighting

**Test:** With the popup open on chatgpt.com, hover over a selector row (e.g. `.message-content`).
**Expected:** Matching elements on the page immediately gain a blue (2px solid #2563EB) outline. Moving mouse off the row removes the outline.
**Why human:** Cross-context messaging between popup and content script requires a live browser with the extension loaded.

#### 3. Export Config download

**Test:** Open Actions menu, click Export Config.
**Expected:** Browser triggers a download of `hebrew-rtl-config-YYYY-MM-DD.json`. File contains valid JSON with all domain configurations.
**Why human:** Blob + URL.createObjectURL file download requires a real browser.

#### 4. Delete All custom confirm dialog

**Test:** Open Actions menu, click Delete All Selectors.
**Expected:** Custom HTML confirm dialog appears inside the popup (not the browser's native `window.confirm` dialog). Clicking Confirm empties the list and shows empty state.
**Why human:** Dialog visual appearance and positioning requires a real browser.

#### 5. Keyboard Shortcuts navigation

**Test:** Open Actions menu, click Keyboard Shortcuts.
**Expected:** A new browser tab opens to `chrome://extensions/shortcuts`.
**Why human:** `chrome://` URL navigation requires a real Chrome context.

---

### Gaps Summary

No gaps. Both documentation gaps from the initial verification are closed:

- ROADMAP.md Phase 3 Success Criterion 5 now accurately describes placeholder Add Selector delivery and defers element picker to Phase 4.
- REQUIREMENTS.md POP-02 and POP-03 now reflect partial Phase 3 delivery with Phase 4 picker completion. Traceability table updated to Partial status for both.

All 15 observable truths are verified. All artifacts are substantive and wired. All requirements are satisfied within their Phase 3 scope. Phase goal is achieved.

---

_Verified: 2026-03-23T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
