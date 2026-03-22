# Phase 3: Popup UI and Config Actions - Research

**Researched:** 2026-03-22
**Domain:** Chrome Extension MV3 Popup — vanilla JS, no framework, no bundler
**Confidence:** HIGH

## Summary

Phase 3 builds `popup/popup.html` + `popup/popup.js`: the user-facing control panel for the extension. All decisions on visual design, behavior, and integration points are locked via the CONTEXT.md discussion. The technical domain is well-understood: MV3 extension popups are plain HTML/JS pages with full Chrome API access, ES module imports work normally, and the existing Phase 2 storage and message infrastructure is already in place.

The primary engineering challenges are: (1) correct use of `chrome.tabs.query` to get the active tab's hostname, (2) real-time hover highlights via `chrome.tabs.sendMessage` to content.js (which must handle new message types), and (3) the JSON export blob download pattern. All three are well-documented in official Chrome extension docs and have clear, tested patterns from prior phases.

**Primary recommendation:** Build popup as a single-file JS module (`popup/popup.js`) that imports directly from `lib/storage.js`. Keep all DOM manipulation explicit and plain — no virtual DOM, no framework. Mirror the test pattern from Phase 2 (extract handlers into testable functions, mock chrome API with `createChromeMock()`).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Popup visual design:**
- Width: ~280px, auto height (no fixed max-height — scrollable list if needed)
- Color scheme: light only, system default — no dark mode for v1
- Selector rows: full row always visible — selector text (truncated with ellipsis if needed) + enable/disable checkbox + delete button; no hover-reveal controls
- Selector text is read-only in the popup — no inline editing. The picker (Phase 4) is the intended UX for adding selectors
- Actions menu: single dropdown button labeled "Actions ▾" containing: Export Config, Delete All Selectors, User Guide, Keyboard Shortcuts
- "User Guide" opens `chrome://extensions/shortcuts` in a new tab (routes user directly to Chrome's built-in shortcut editor)
- "Keyboard Shortcuts" also opens `chrome://extensions/shortcuts` (same destination — or omit as duplicate; Claude's discretion)
- Badge already wired in Phase 2 via `updateBadgeForActiveTab` — popup just triggers a storage write and the existing `chrome.storage.onChanged` listener will refresh the badge automatically

**Master toggle behavior:**
- When master toggle is OFF: toggle is visually in the off state, selector list remains visible but visually grayed out (opacity reduced, interaction disabled)
- Toggle changes take effect immediately (write to storage → content script reacts via storage listener already wired in Phase 2)

**Add Selector button:**
- The `+` / "Add Selector" button is present and visible
- Clicking it shows a brief inline message: "Coming soon — element picker in next update"
- No modal, no navigation — just a placeholder message in the popup (Phase 4 will replace this behavior)

**Destructive action safeguards:**
- **Delete All Selectors**: requires a confirmation dialog with text: "Delete all selectors for [domain]? This cannot be undone." Two buttons: Confirm and Cancel
- After Delete All is confirmed: popup stays open and renders the empty state (selector list area shows the + button and a prompt)
- **Delete single selector row**: immediate on click — no confirmation required

**Hover highlight style (POP-04):**
- Mechanism: popup sends a `chrome.tabs.sendMessage` message to the content script with the selector string; content script applies/removes highlight styles
- Highlight appearance: **2px solid blue outline** (`outline: 2px solid #2563EB`) applied to all matching elements simultaneously
- Cleanup: highlights removed immediately when mouse leaves the selector row (mouseleave event → send clearHighlight message)
- If content script is not injected (chrome://, extension pages, etc.): catch the sendMessage error and silently do nothing — no user-facing error in popup

### Claude's Discretion
- Exact CSS for the grayed-out selector list (opacity value, pointer-events)
- HTML structure and class naming for popup components
- Whether "User Guide" and "Keyboard Shortcuts" Actions menu items are merged into one entry (both go to same URL) or kept separate
- Error handling for storage failures in the popup
- Export JSON filename format (e.g., `hebrew-rtl-config-YYYY-MM-DD.json`)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| POP-01 | Popup shows current domain name and master enable/disable toggle prominently at the top (FR-200) | `chrome.tabs.query` returns active tab URL; `new URL(tab.url).hostname` extracts domain; `getDomainConfig(hostname)` from storage.js retrieves enabled state |
| POP-02 | Popup lists all configured selectors for the current domain with: enable/disable checkbox, delete button, and element picker trigger per row (FR-201) | Config schema `selectors: [{selector, enabled, forceRTL}]` already defined; `setDomainConfig` persists row changes; picker trigger is a Phase 4 placeholder in this phase |
| POP-03 | Popup includes an Add Selector button (+) that creates a new empty selector row ready for picker activation (FR-202) | Locked: clicking shows "Coming soon — element picker in next update" inline message; no actual row creation until Phase 4 |
| POP-04 | Hovering over a selector row highlights matching elements on the page in real time (FR-203) | `chrome.tabs.sendMessage(tabId, {type: 'HIGHLIGHT_SELECTOR', selector})` and `{type: 'CLEAR_HIGHLIGHT'}` — content.js must add handlers for these two new message types |
| POP-05 | Popup includes an Actions menu with: Export Config, Delete All Selectors, User Guide link, Keyboard Shortcut configuration (FR-204) | Export: `getAllConfigs()` → JSON blob → anchor download trick; Delete All: `setDomainConfig(hostname, {...config, selectors: []})` with confirmation; User Guide: `chrome.tabs.create({url: 'chrome://extensions/shortcuts'})` |
| CFG-05 | Extension supports configuration export as a downloadable JSON file (FR-108) | Blob + Object URL + programmatic anchor click; standard browser download pattern; no server required |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS (ES2022+) | — | All popup logic | Project-wide constraint: zero-build, no framework |
| chrome.tabs API | MV3 | Query active tab, send messages | Only way to reach content scripts from popup |
| chrome.storage API | MV3 | Read/write domain config | Already abstracted in lib/storage.js |
| Blob + URL.createObjectURL | Browser built-in | JSON file download (CFG-05) | No library needed; standard DOM pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Jest 30 + jest-environment-jsdom | ^30.3.0 | Unit tests for popup handlers | Already installed; all tests use this setup |
| createChromeMock() | internal | Mock Chrome API in tests | Factory pattern established in Phase 2 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vanilla JS | React/Preact | Violates zero-build constraint; adds bundler requirement |
| Blob download | chrome.downloads API | Requires `downloads` permission; Blob approach needs no extra permission |
| confirm() dialog | Custom modal HTML | `confirm()` is blocked in extension popups (Chrome restriction) — MUST use custom HTML modal or inline confirmation UI |

**Installation:** No new packages needed. All tooling is already installed.

**Critical note on confirm():** Native `window.confirm()` and `window.alert()` are **blocked in Chrome extension popups** (returns `undefined`/empty immediately). All confirmation dialogs MUST be implemented as custom HTML elements within the popup DOM.

## Architecture Patterns

### Recommended Project Structure
```
popup/
├── popup.html          # Extension popup shell (linked to popup.js as module)
└── popup.js            # All popup logic — imports from lib/storage.js
tests/
└── popup.test.js       # Unit tests for extracted popup handler functions
```

Manifest update:
```json
"action": {
  "default_title": "Hebrew RTL",
  "default_popup": "popup/popup.html"
}
```

### Pattern 1: Active Tab Hostname Resolution
**What:** Get the current domain so the popup knows which config to load/save.
**When to use:** On popup load (DOMContentLoaded).
**Example:**
```javascript
// Source: Chrome Extensions docs — chrome.tabs.query
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const hostname = new URL(tab.url).hostname;
```
Edge cases: `tab.url` may be undefined on chrome:// pages or PDFs; wrap in try/catch.

### Pattern 2: Storage Read → Render
**What:** Load domain config from storage and render the full popup UI.
**When to use:** On DOMContentLoaded and after any storage write.
**Example:**
```javascript
import { getDomainConfig, setDomainConfig, getAllConfigs } from '../lib/storage.js';

const config = await getDomainConfig(hostname);
// config may be null (new domain, no config yet)
const selectors = config?.selectors ?? [];
const enabled = config?.enabled ?? false;
```

### Pattern 3: Real-Time Hover Highlight via sendMessage
**What:** Popup sends highlight/clear messages to content.js on mouseenter/mouseleave.
**When to use:** Per selector row events.
**Example:**
```javascript
// In popup.js
row.addEventListener('mouseenter', async () => {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'HIGHLIGHT_SELECTOR', selector: sel.selector });
  } catch (_) {
    // Content script not present — silent no-op
  }
});
row.addEventListener('mouseleave', async () => {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'CLEAR_HIGHLIGHT' });
  } catch (_) {}
});
```

Content script additions (in content.js message listener):
```javascript
if (msg.type === 'HIGHLIGHT_SELECTOR') {
  // Remove any existing highlights first
  document.querySelectorAll('[data-hrtl-highlight]').forEach(el => {
    el.style.outline = '';
    el.removeAttribute('data-hrtl-highlight');
  });
  try {
    document.querySelectorAll(msg.selector).forEach(el => {
      el.style.outline = '2px solid #2563EB';
      el.setAttribute('data-hrtl-highlight', '1');
    });
  } catch (_) {} // invalid selector
  sendResponse({ ok: true });
}
if (msg.type === 'CLEAR_HIGHLIGHT') {
  document.querySelectorAll('[data-hrtl-highlight]').forEach(el => {
    el.style.outline = '';
    el.removeAttribute('data-hrtl-highlight');
  });
  sendResponse({ ok: true });
}
```

### Pattern 4: JSON Export (CFG-05)
**What:** Download all config as a JSON file via Blob + anchor click.
**When to use:** "Export Config" Actions menu item.
**Example:**
```javascript
const allConfigs = await getAllConfigs();
const json = JSON.stringify(allConfigs, null, 2);
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
a.href = url;
a.download = `hebrew-rtl-config-${date}.json`;
a.click();
URL.revokeObjectURL(url);
```

### Pattern 5: Custom Confirmation Dialog (Delete All)
**What:** Since `confirm()` is blocked in extension popups, use inline HTML for confirmations.
**When to use:** Delete All Selectors action.
**Example approach:** Show/hide a `<div class="confirm-dialog">` within the popup DOM. The dialog contains the exact text and two buttons (Confirm/Cancel). Show it on action click; remove/hide on button click.

### Pattern 6: Master Toggle with Grayed-Out Selectors
**What:** When toggle is off, selector list is visually disabled.
**When to use:** Render pass after loading config.
**Example (Claude's discretion — recommended values):**
```css
.selector-list--disabled {
  opacity: 0.4;
  pointer-events: none;
}
```
Apply/remove class based on `config.enabled` state.

### Pattern 7: Actions Dropdown
**What:** "Actions ▾" button reveals a dropdown menu.
**When to use:** User clicks the Actions button.
**Approach:** Toggle a `<ul class="actions-menu">` with `display:none`/`display:block`. Close on outside click via `document.addEventListener('click', ...)` with event target check. No library needed.

### Anti-Patterns to Avoid
- **Using window.confirm() or window.alert():** Blocked in Chrome extension popups — silently returns false/undefined.
- **Importing from content.js in popup.js:** content.js is a plain script (not a module); popup cannot `import` from it. Communication is via `chrome.tabs.sendMessage` only.
- **Forgetting `return true` in onMessage listener:** If content.js message handler uses `sendResponse` asynchronously, the message channel must stay open with `return true`.
- **Writing storage on every keystroke:** popup.js should write on meaningful events (checkbox change, delete button) — not required here since selector text is read-only.
- **Assuming tab.url exists:** chrome:// pages, extension pages, PDFs may have undefined or restricted URLs — always guard with try/catch.
- **Building the popup in the wrong directory:** manifest references `popup/popup.html` — file must live in the `popup/` subfolder.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File download | Custom server endpoint | Blob + URL.createObjectURL + anchor click | No server, no permission, single function |
| Storage abstraction | Direct chrome.storage calls | `lib/storage.js` getDomainConfig / setDomainConfig / getAllConfigs | Already battle-tested, handles sync/local fallback |
| Message passing to content script | New background relay | Direct `chrome.tabs.sendMessage` from popup | Popup has full chrome API access; no relay needed |
| Confirmation dialog | window.confirm() | Custom HTML inline dialog | confirm() blocked in extension popups |

**Key insight:** The Chrome extension popup context is a full browser page with all Web APIs — but native dialogs (`confirm`, `alert`, `prompt`) are explicitly blocked. Every "blocking" interaction must be implemented as custom DOM.

## Common Pitfalls

### Pitfall 1: confirm() Silently Fails
**What goes wrong:** `if (confirm('Delete all?'))` always evaluates as `false`/falsy in an extension popup. Delete All fires without confirmation or never fires.
**Why it happens:** Chrome blocks synchronous native dialogs in extension pages to prevent UI lockup.
**How to avoid:** Build a custom `<div class="confirm-dialog">` that shows/hides inline.
**Warning signs:** Delete fires immediately without waiting for user input.

### Pitfall 2: Tab Without URL (chrome:// Pages, PDFs)
**What goes wrong:** `new URL(tab.url)` throws if `tab.url` is undefined or `chrome://`.
**Why it happens:** `chrome.tabs.query` can return tabs where the extension doesn't have access to the URL.
**How to avoid:** Wrap in try/catch; show a "Not available on this page" state in the popup.
**Warning signs:** Uncaught TypeError in popup DevTools console.

### Pitfall 3: Content Script Not Injected — sendMessage Fails
**What goes wrong:** `chrome.tabs.sendMessage` throws when no content script is listening. This happens on chrome:// pages, extension pages, and pages loaded before the extension was installed.
**Why it happens:** Chrome throws an error when no listener exists for the message.
**How to avoid:** Wrap every `sendMessage` call in try/catch and silently swallow the error.
**Warning signs:** "Could not establish connection" error in popup DevTools.

### Pitfall 4: popup.html Path Mismatch with manifest.json
**What goes wrong:** Extension toolbar button doesn't open a popup, or opens a blank page.
**Why it happens:** `default_popup` path in manifest is relative to the extension root; file must exist at that exact path.
**How to avoid:** Verify `"default_popup": "popup/popup.html"` matches the actual file location `popup/popup.html`.

### Pitfall 5: ES Module Import in popup.js — Relative Path Depth
**What goes wrong:** `import { getDomainConfig } from '../lib/storage.js'` fails if popup.js is in `popup/` but the path is wrong.
**Why it happens:** Extension page module resolution uses the actual file path, not the extension root.
**How to avoid:** popup.js lives in `popup/` so import path is `../lib/storage.js` — one level up.

### Pitfall 6: Actions Dropdown Stays Open on Outside Click
**What goes wrong:** Clicking elsewhere in the popup doesn't close the Actions menu.
**Why it happens:** Without a document-level click listener, the dropdown has no dismiss trigger.
**How to avoid:** Add `document.addEventListener('click', closeDropdown)` and check `event.target.closest('.actions-btn')` to avoid toggling on the button itself.

### Pitfall 7: Highlight Outline Not Cleared on Popup Close
**What goes wrong:** User closes the popup while hovering a selector row; blue outline stays on page permanently.
**Why it happens:** `mouseleave` doesn't fire when popup closes; `CLEAR_HIGHLIGHT` never sent.
**How to avoid:** Send `CLEAR_HIGHLIGHT` in a `window.addEventListener('beforeunload', ...)` handler in popup.js, or rely on content.js to auto-clear on next HIGHLIGHT_SELECTOR or page navigation.

## Code Examples

Verified patterns based on official Chrome Extension MV3 documentation and existing Phase 2 codebase patterns:

### popup.html Shell
```html
<!DOCTYPE html>
<html lang="he" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hebrew RTL</title>
  <style>
    body { width: 280px; font-family: system-ui, sans-serif; margin: 0; padding: 12px; }
    /* ... component styles ... */
  </style>
</head>
<body>
  <header>
    <span id="domain-name">loading...</span>
    <label class="toggle">
      <input type="checkbox" id="master-toggle">
      <span class="toggle-slider"></span>
    </label>
  </header>
  <section id="selector-list"></section>
  <footer>
    <button id="add-selector-btn">+ Add Selector</button>
    <div class="actions-wrapper">
      <button id="actions-btn">Actions &#9662;</button>
      <ul id="actions-menu" hidden>
        <li><button data-action="export">Export Config</button></li>
        <li><button data-action="delete-all">Delete All Selectors</button></li>
        <li><button data-action="guide">User Guide / Shortcuts</button></li>
      </ul>
    </div>
  </footer>
  <div id="confirm-dialog" hidden>
    <p id="confirm-text"></p>
    <button id="confirm-ok">Confirm</button>
    <button id="confirm-cancel">Cancel</button>
  </div>
  <p id="add-selector-msg" hidden>Coming soon — element picker in next update</p>
  <script type="module" src="popup.js"></script>
</body>
</html>
```

### DOMContentLoaded Bootstrap in popup.js
```javascript
import { getDomainConfig, setDomainConfig, getAllConfigs } from '../lib/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  let tabId, hostname, config;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = tab.id;
    hostname = new URL(tab.url).hostname;
  } catch (_) {
    document.getElementById('domain-name').textContent = 'Not available';
    return;
  }
  config = await getDomainConfig(hostname) ?? { enabled: false, selectors: [], loadDelay: 0 };
  render(hostname, config, tabId);
});
```

### Selector Row Rendering
```javascript
function renderSelectorRow(sel, index, config, hostname, tabId) {
  const row = document.createElement('div');
  row.className = 'selector-row';

  const label = document.createElement('span');
  label.className = 'selector-text';
  label.textContent = sel.selector;
  label.title = sel.selector; // full text on hover

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = sel.enabled;
  checkbox.addEventListener('change', async () => {
    config.selectors[index].enabled = checkbox.checked;
    await setDomainConfig(hostname, config);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '✕';
  deleteBtn.addEventListener('click', async () => {
    config.selectors.splice(index, 1);
    await setDomainConfig(hostname, config);
    row.remove();
  });

  row.addEventListener('mouseenter', () => sendHighlight(tabId, sel.selector));
  row.addEventListener('mouseleave', () => clearHighlight(tabId));

  row.append(label, checkbox, deleteBtn);
  return row;
}
```

### highlight / clearHighlight Helpers
```javascript
async function sendHighlight(tabId, selector) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'HIGHLIGHT_SELECTOR', selector });
  } catch (_) {}
}

async function clearHighlight(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'CLEAR_HIGHLIGHT' });
  } catch (_) {}
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MV2 `browser_action` + `page_action` | MV3 unified `action` | Chrome 88 (2021) | Single `chrome.action` API; manifest already uses this |
| Persistent background pages | Service workers (event-driven) | MV3 | Background.js already implemented as service worker |
| `chrome.extension.sendMessage` | `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage` | MV3 | Already in use throughout codebase |

**Deprecated/outdated:**
- `window.confirm()` in extension pages: works in MV2 content scripts but blocked in extension popup pages in MV3 (and some MV2 cases). Use custom HTML dialog.
- `webkitURL`: use `URL` directly — universally supported.

## Open Questions

1. **Highlight cleanup on unexpected popup close**
   - What we know: `beforeunload` fires when popup window closes; `mouseleave` does not.
   - What's unclear: Reliability of `beforeunload` in extension popup context (short-lived page).
   - Recommendation: Use `window.addEventListener('unload', ...)` to send CLEAR_HIGHLIGHT; also have content.js clear highlights when it receives any new HIGHLIGHT_SELECTOR (replacing the previous one), and use a short timeout (e.g., 5s) auto-clear as a belt-and-suspenders safeguard.

2. **"User Guide" vs "Keyboard Shortcuts" — duplicate or single entry**
   - What we know: Both Actions menu items point to `chrome://extensions/shortcuts` (same URL). CONTEXT.md gives Claude discretion.
   - What's unclear: User expectation — will having both confuse users?
   - Recommendation: Merge into one entry labeled "Keyboard Shortcuts" for clarity and reduced menu clutter.

3. **Empty state when hostname has no config**
   - What we know: `getDomainConfig` returns `null` for unconfigured domains.
   - What's unclear: Whether to show master toggle ON or OFF by default for new domains.
   - Recommendation: Show toggle OFF, empty selector list, and a friendly prompt "No selectors configured — add one with +" in the list area.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30 with jest-environment-jsdom 30 |
| Config file | `package.json` (jest key) — testEnvironment: node by default, switch to jsdom per test file via docblock |
| Quick run command | `NODE_OPTIONS=--experimental-vm-modules npx jest tests/popup.test.js` |
| Full suite command | `NODE_OPTIONS=--experimental-vm-modules npx jest` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POP-01 | Domain name shown, master toggle reflects enabled state | unit | `npx jest tests/popup.test.js -t "master toggle"` | ❌ Wave 0 |
| POP-01 | Toggle write → setDomainConfig called with correct enabled value | unit | `npx jest tests/popup.test.js -t "toggle change"` | ❌ Wave 0 |
| POP-02 | Selector rows rendered for each configured selector | unit | `npx jest tests/popup.test.js -t "selector list"` | ❌ Wave 0 |
| POP-02 | Checkbox change → setDomainConfig persists new enabled state | unit | `npx jest tests/popup.test.js -t "selector checkbox"` | ❌ Wave 0 |
| POP-02 | Delete button → selector removed from config | unit | `npx jest tests/popup.test.js -t "delete selector"` | ❌ Wave 0 |
| POP-03 | Add Selector click → inline message shown, no row created | unit | `npx jest tests/popup.test.js -t "add selector"` | ❌ Wave 0 |
| POP-04 | mouseenter on row → sendMessage called with HIGHLIGHT_SELECTOR | unit | `npx jest tests/popup.test.js -t "hover highlight"` | ❌ Wave 0 |
| POP-04 | mouseleave on row → sendMessage called with CLEAR_HIGHLIGHT | unit | `npx jest tests/popup.test.js -t "clear highlight"` | ❌ Wave 0 |
| POP-04 | sendMessage error on chrome:// → silently caught, no throw | unit | `npx jest tests/popup.test.js -t "highlight error"` | ❌ Wave 0 |
| POP-05 | Export Config → Blob created with full config JSON | unit | `npx jest tests/popup.test.js -t "export config"` | ❌ Wave 0 |
| POP-05 | Delete All → confirmation dialog shown before deletion | unit | `npx jest tests/popup.test.js -t "delete all"` | ❌ Wave 0 |
| POP-05 | Delete All confirmed → selectors array emptied in storage | unit | `npx jest tests/popup.test.js -t "delete all confirm"` | ❌ Wave 0 |
| POP-05 | User Guide/Shortcuts → chrome.tabs.create called with chrome://extensions/shortcuts | unit | `npx jest tests/popup.test.js -t "user guide"` | ❌ Wave 0 |
| CFG-05 | getAllConfigs() used for export; JSON includes all domain keys | unit | `npx jest tests/popup.test.js -t "export json"` | ❌ Wave 0 |
| POP-04 | content.js HIGHLIGHT_SELECTOR handler outlines all matching elements | unit | `npx jest tests/content.test.js -t "HIGHLIGHT_SELECTOR"` | ❌ Wave 0 |
| POP-04 | content.js CLEAR_HIGHLIGHT handler removes all outlines | unit | `npx jest tests/content.test.js -t "CLEAR_HIGHLIGHT"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `NODE_OPTIONS=--experimental-vm-modules npx jest tests/popup.test.js`
- **Per wave merge:** `NODE_OPTIONS=--experimental-vm-modules npx jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/popup.test.js` — covers POP-01 through POP-05, CFG-05 (full popup handler tests)
- [ ] `tests/__mocks__/chrome.js` — extend `createChromeMock()` to include `chrome.tabs.create` mock
- [ ] `popup/popup.html` — HTML shell for the popup page
- [ ] `popup/popup.js` — popup logic (ES module, imports lib/storage.js)
- [ ] content.js — add HIGHLIGHT_SELECTOR and CLEAR_HIGHLIGHT message handlers

**Note on test environment for popup.test.js:** popup.js manipulates DOM (creates elements, reads DOM state). Tests should use `@jest-environment jsdom` docblock to override the default node environment, consistent with existing `mutation.test.js` pattern.

## Sources

### Primary (HIGH confidence)
- Official Chrome Extension docs (chrome.tabs API, chrome.action API, MV3 popup) — verified via existing Phase 2 code which already uses these APIs correctly
- Existing codebase: `lib/storage.js`, `lib/background-handlers.js`, `content.js`, `tests/__mocks__/chrome.js` — direct inspection; all integration points confirmed

### Secondary (MEDIUM confidence)
- Chrome Extension docs on `window.confirm()` blocking: cross-referenced with known community knowledge that native dialogs are blocked in extension popup pages (consistent with Chrome's security model for extension pages)
- Blob + URL.createObjectURL download pattern: standard Web API, universally documented

### Tertiary (LOW confidence)
- `window.unload` / `beforeunload` reliability for CLEAR_HIGHLIGHT cleanup in popup close scenario — behavior may vary; belt-and-suspenders content.js fallback recommended

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero-build constraint is locked; all APIs already in use in prior phases
- Architecture: HIGH — direct inspection of all integration points (storage.js, content.js, background.js, manifest.json, chrome mock)
- Pitfalls: HIGH — confirm() blocking is a well-known Chrome extension constraint; all other pitfalls derived from direct code inspection

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable Chrome MV3 APIs; popup patterns don't change frequently)
