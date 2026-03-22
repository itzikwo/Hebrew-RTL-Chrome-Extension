# System Architecture

**Project:** Hebrew RTL Chrome Extension
**Researched:** 2026-03-22
**Confidence:** HIGH (Chrome MV3 architecture is well-documented and stable)

---

## Component Boundaries

### 1. `manifest.json` — Extension Declaration

Declares all permissions, content script injection rules, keyboard shortcut commands, and links all components together.

```json
{
  "manifest_version": 3,
  "name": "Hebrew RTL",
  "permissions": ["storage", "activeTab", "tabs"],
  "background": { "service_worker": "background.js" },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }],
  "action": { "default_popup": "popup/popup.html" },
  "commands": {
    "toggle-rtl": {
      "suggested_key": { "default": "Ctrl+Shift+H" },
      "description": "Toggle RTL for current domain"
    }
  }
}
```

**Key decisions:**
- `"<all_urls>"` match pattern — extension must work on any domain the user configures
- `run_at: document_idle` — content script runs after DOM is ready, not blocking parse
- `activeTab` permission — allows popup to query current tab URL without broad `tabs` permission for reading URLs (but `tabs` needed for `sendMessage` to specific tab)

---

### 2. `background.js` (Service Worker)

**Role:** Extension lifecycle, badge management, keyboard shortcut handling, install-time preset injection, message routing.

**MV3 critical constraint:** The service worker terminates after ~30 seconds of inactivity. No persistent in-memory state is possible. Every handler must read from `chrome.storage` at the start.

```javascript
// background.js — all handlers are stateless, read from storage

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    // Inject pre-configured site selectors on first install
    const presets = await import('./config/default-sites.js');
    await chrome.storage.sync.set({ domains: presets.DEFAULT_DOMAINS });
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-rtl') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_DOMAIN' });
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  // Update badge when domain enabled state changes
  updateBadgeForActiveTab();
});

async function updateBadgeForActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
  const host = new URL(tab.url).hostname;
  const key = `domains.${host}`;
  const data = await chrome.storage.sync.get(key);
  const enabled = data[key]?.enabled ?? false;
  chrome.action.setBadgeText({ text: enabled ? 'ON' : '', tabId: tab.id });
  chrome.action.setBadgeBackgroundColor({ color: '#2563EB', tabId: tab.id });
}
```

---

### 3. `content.js` (Content Script)

**Role:** RTL engine, MutationObserver DOM processing, element picker mode, storage listener for config changes.

**Critical:** `MutationObserver` is ONLY available in content scripts, not in service workers. All DOM work lives here.

```javascript
// content.js — loads once per matching page, persists for tab lifetime

let config = null; // cached from storage, refreshed on storage change
let observer = null;

async function init() {
  const host = location.hostname;
  const key = `domains.${host}`;
  const data = await chrome.storage.sync.get(key);
  config = data[key] ?? null;

  if (config?.loadDelay > 0) {
    await new Promise(r => setTimeout(r, config.loadDelay));
  }

  if (config?.enabled) {
    processAllSelectors();
    startObserver();
  }
}

// Refresh config reactively when user changes popup settings
chrome.storage.onChanged.addListener((changes) => {
  const key = `domains.${location.hostname}`;
  if (changes[key]) {
    config = changes[key].newValue;
    if (config?.enabled) {
      processAllSelectors();
      if (!observer) startObserver();
    } else {
      observer?.disconnect();
      observer = null;
    }
  }
});

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.type === 'ENTER_PICKER') enterPickerMode();
  if (msg.type === 'TOGGLE_DOMAIN') toggleDomain();
  if (msg.type === 'PING') respond({ ready: true });
});

init();
```

---

### 4. `popup/popup.html` + `popup.js`

**Role:** Domain-specific configuration UI. The popup is destroyed every time it closes — it cannot hold state.

**On every open:**
1. Query current tab URL → extract hostname
2. Load config from `chrome.storage.sync`
3. Render selector list, toggle states, domain enabled state

**Key constraint:** MV3 popup HTML cannot contain `<script>` tags with inline code. All JS in external files.

---

### 5. `lib/storage.js` — Storage Abstraction

Centralizes all storage reads/writes with sync→local fallback.

```javascript
// lib/storage.js

const SYNC_QUOTA_BYTES = 100 * 1024; // 100KB
const WARN_AT = 0.8;

export async function getDomainConfig(hostname) {
  const key = `domains.${hostname}`;
  const data = await chrome.storage.sync.get(key);
  return data[key] ?? null;
}

export async function setDomainConfig(hostname, config) {
  const key = `domains.${hostname}`;
  try {
    await chrome.storage.sync.set({ [key]: config });
  } catch (e) {
    if (e.message?.includes('QUOTA_BYTES')) {
      // Fall back to local storage
      await chrome.storage.local.set({ [key]: config });
    } else {
      throw e;
    }
  }
}

export async function exportAllConfig() {
  const syncData = await chrome.storage.sync.get(null);
  const localData = await chrome.storage.local.get(null);
  return { ...localData, ...syncData }; // sync takes precedence
}
```

---

## Message Passing Architecture

```
┌─────────────┐         chrome.tabs.sendMessage          ┌──────────────────┐
│  popup.js   │ ──────────────────────────────────────── │  content.js      │
│  (popup)    │ ◄────────────────────────────────────── │  (content script)│
└─────────────┘         response (sync)                  └──────────────────┘
      │                                                          │
      │ chrome.storage.sync.set/get                              │ chrome.storage.onChanged
      │                                                          │
      ▼                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        chrome.storage.sync                                  │
│                    (reactive bus for config state)                          │
└─────────────────────────────────────────────────────────────────────────────┘
      ▲                                                          ▲
      │ chrome.storage.onChanged                                 │ chrome.runtime.sendMessage
      │                                                          │
┌─────────────┐         chrome.commands.onCommand         ┌──────────────────┐
│background.js│ ──────────────────────────────────────── │  (keyboard)      │
│(service wkr)│                                           └──────────────────┘
└─────────────┘
```

**Design principle:** `chrome.storage` is the reactive bus. Rather than complex message channels, most cross-component communication flows through storage changes. Popup writes config → storage change event fires → content script reads and applies. This pattern is robust to service worker termination.

---

## MutationObserver Pattern

```javascript
// content.js — MutationObserver with debouncing and element marking

const MARKER = 'data-hrtl-processed';
const DEBOUNCE_MS = 100;
let debounceTimer = null;
const pendingNodes = new Set();

function startObserver() {
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE && !node.hasAttribute(MARKER)) {
            pendingNodes.add(node);
          }
        });
      }
      // characterData: re-evaluate the parent element direction
      if (mutation.type === 'characterData' && mutation.target.parentElement) {
        const el = mutation.target.parentElement;
        if (el.hasAttribute(MARKER)) {
          el.removeAttribute(MARKER); // allow re-evaluation
          pendingNodes.add(el);
        }
      }
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      processNodes([...pendingNodes]);
      pendingNodes.clear();
    }, DEBOUNCE_MS);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
    // NOTE: attributes: true intentionally OMITTED — causes infinite loop
    // because our own setAttribute(MARKER) would trigger mutations
  });
}
```

---

## Element Picker State Machine

```
NORMAL ──[click magnifying glass in popup]──► PICKING
  ▲                                              │
  │                                              │ [Escape key]
  │                                              ▼
  │                                         [overlay active,
  │                                          mousemove highlights,
  │                                          click captures element]
  │                                              │
  │                                    [click on element]
  │                                              │
  │                                              ▼
  │                                          BUILDING
  │                                         [Selector Builder
  │                                          overlay shown]
  │                                              │
  │                              [Save] ◄────────┤────► [Cancel]
  │                                │              │
  │                          [write selector      │
  │                           to storage]         │
  └──────────────────────────────────────────────┘
                  NORMAL
```

**Picker implementation:**

```javascript
// picker.js

let pickerOverlay = null;
let highlightEl = null;

export function enterPickerMode() {
  // Create full-viewport overlay
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    cursor: 'crosshair',
    // Do NOT set background — overlay must be transparent
  });
  document.documentElement.appendChild(overlay);
  pickerOverlay = overlay;

  // Track hovered element via elementFromPoint (bypasses overlay pointer-events)
  overlay.style.pointerEvents = 'auto'; // overlay catches events
  overlay.addEventListener('mousemove', onPickerMouseMove);
  overlay.addEventListener('click', onPickerClick);
  document.addEventListener('keydown', onPickerKeyDown);
}

function onPickerMouseMove(e) {
  // Temporarily hide overlay to hit-test underlying element
  pickerOverlay.style.pointerEvents = 'none';
  const el = document.elementFromPoint(e.clientX, e.clientY);
  pickerOverlay.style.pointerEvents = 'auto';

  if (el && el !== highlightEl) {
    if (highlightEl) highlightEl.style.outline = '';
    el.style.outline = '2px solid #2563EB';
    highlightEl = el;
  }
}

function onPickerClick(e) {
  e.preventDefault();
  e.stopPropagation();
  exitPickerMode();
  openSelectorBuilder(highlightEl);
}

function onPickerKeyDown(e) {
  if (e.key === 'Escape') exitPickerMode();
}

function exitPickerMode() {
  if (highlightEl) highlightEl.style.outline = '';
  pickerOverlay?.remove();
  pickerOverlay = null;
  highlightEl = null;
  document.removeEventListener('keydown', onPickerKeyDown);
}
```

---

## Selector Builder

```javascript
// lib/selector-builder.js

export function buildAncestorChain(element) {
  const chain = [];
  let el = element;
  while (el && el !== document.body) {
    chain.push({
      element: el,
      selector: computeSelector(el),
      label: `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${
        [...el.classList].slice(0, 2).map(c => '.' + c).join('')
      }`
    });
    el = el.parentElement;
  }
  return chain; // [0] = clicked element, [chain.length-1] = closest to body
}

function computeSelector(el) {
  const parts = [];
  if (el.id) return `#${el.id}`; // ID is unique enough
  parts.push(el.tagName.toLowerCase());
  if (el.classList.length > 0) {
    [...el.classList].slice(0, 3).forEach(c => parts.push('.' + c));
  }
  return parts.join('');
}
```

---

## Build Order (Phase Dependencies)

1. **Storage schema** — Define `chrome.storage.sync` key structure. Everything reads from storage.
2. **`lib/storage.js`** — Storage abstraction (sync/local fallback, export helper).
3. **`lib/bidi-detect.js`** — Hebrew detection engine (first-strong + 30% threshold). Pure function, no DOM.
4. **`manifest.json`** — Declare all components, permissions, content script rules, commands.
5. **`config/default-sites.js`** — Pre-configured selectors for 5 platforms (ChatGPT, Claude, Gemini, NotebookLM, Slack).
6. **`content.js` core** — Selector processing, RTL application, list bullet fix, LTR exemption checks.
7. **`content.js` observer** — MutationObserver with debounce and element marking.
8. **`popup/popup.js`** — Domain state display, master toggle, selector list.
9. **`background.js`** — Install handler (seed presets), badge updates, keyboard shortcut routing.
10. **`picker.js` + `lib/selector-builder.js`** — Element picker mode and Selector Builder overlay.

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It Fails |
|--------------|-------------|
| In-memory state in service worker | Service worker terminates; state lost. Store everything in `chrome.storage`. |
| `attributes: true` in MutationObserver | Our own `setAttribute('data-hrtl-processed')` triggers new mutations → infinite loop. |
| `document.querySelectorAll()` on every mutation | During AI streaming, this runs hundreds of times per second on the full DOM → CPU spike. Only process nodes from `mutation.addedNodes`. |
| iframe for picker/builder overlay | Cross-origin restrictions, complex message passing, z-index wars. Use regular DOM elements with Shadow DOM. |
| Page-level `direction:rtl` on `<html>` or `<body>` | Flips navigation, images, code blocks, date pickers. Element-level only. |
| Duplicating selector state in content script memory | State diverges from storage when popup updates. Use `chrome.storage.onChanged` as the single source of truth. |
| Synchronous `chrome.storage` access | All storage APIs are async. Always `await chrome.storage.sync.get(...)`. Sync-looking wrappers break under race conditions. |

---

## Data Flow Summary

```
Page Load
  ↓
content.js init()
  ↓
Read config from chrome.storage.sync (domains.<hostname>)
  ↓
If enabled: processAllSelectors() → applyRTL() on matched elements
  ↓
startObserver() → watch for DOM changes
  ↓
[mutation] → debounce 100ms → processNodes(addedNodes)
  ↓
For each node: isExemptElement()? skip : detectDirection() → applyRTL()
  ↓
Mark element with data-hrtl-processed="1"


User opens popup
  ↓
popup.js reads chrome.storage.sync
  ↓
User toggles selector or master switch
  ↓
popup.js writes to chrome.storage.sync
  ↓
chrome.storage.onChanged fires in content.js
  ↓
content.js re-reads config, applies/removes RTL


User clicks magnifying glass in popup
  ↓
popup.js sends ENTER_PICKER to content.js via chrome.tabs.sendMessage
  ↓
popup closes
  ↓
content.js enters PICKING state (transparent overlay)
  ↓
User hovers and clicks element
  ↓
Selector Builder overlay shown (BUILDING state)
  ↓
User selects ancestor level, clicks Save
  ↓
content.js writes new selector to chrome.storage.sync
  ↓
chrome.storage.onChanged → content.js re-processes selectors
```
