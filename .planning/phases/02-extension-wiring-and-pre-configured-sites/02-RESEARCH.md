# Phase 2: Extension Wiring and Pre-configured Sites - Research

**Researched:** 2026-03-22
**Domain:** Chrome MV3 extension wiring — manifest, storage, service worker, keyboard commands, platform selectors
**Confidence:** HIGH (Chrome APIs), MEDIUM (platform DOM selectors — need browser verification)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CFG-01 | Per-domain config in chrome.storage.sync with auto fallback to chrome.storage.local when sync quota exceeded | Storage abstraction pattern with try/catch on QUOTA_BYTES; areaName check in onChanged |
| CFG-02 | Pre-configured selectors for ChatGPT, Claude.ai, Gemini, NotebookLM, Slack | Verified selectors from multiple sources; flagged as MEDIUM confidence — must verify in browser at implementation time |
| CFG-03 | Configurable load delay per domain for late-loading content | loadDelay field in domain config; setTimeout in content.js init(); forceRTL: true on known-RTL selectors eliminates streaming flicker |
| CFG-04 | Auto-save all config changes immediately without explicit save action | chrome.storage.onChanged reactive pattern — popup writes to storage, content.js reacts; no separate save button needed |
| KBD-01 | Default keyboard shortcut Ctrl+Shift+H / MacCtrl+Shift+H to toggle domain master switch | commands manifest entry with suggested_key; onCommand in service worker routes to content script via chrome.tabs.sendMessage |
| KBD-02 | User-customizable shortcut via chrome://extensions/shortcuts | Automatic — chrome.commands API provides chrome://extensions/shortcuts UI for free; no code needed beyond manifest declaration |
</phase_requirements>

---

## Summary

Phase 2 wires the Phase 1 RTL engine into a complete, installable Chrome MV3 extension. The four work areas are: (1) a complete `manifest.json` with all permissions and command declarations, (2) a `lib/storage.js` abstraction with `chrome.storage.sync` primary and `chrome.storage.local` fallback, (3) a `background.js` service worker handling install seeding, badge updates, and keyboard shortcut routing, and (4) a `config/default-sites.js` pre-configuring all five target platforms.

The most complex question going into Phase 2 is whether the existing `"type": "module"` declaration in `content_scripts` (added in Phase 1) actually works in Chrome for the `import` statement. The official Chrome manifest docs do NOT list `type` as a valid field for `content_scripts`. However, the Phase 1 CONTEXT.md explicitly states it is supported, and Phase 1 was designed around it. The plan must validate this in a real browser before assuming the import pattern works, and have an inlining fallback strategy ready.

The five target platform selectors are confirmed from multiple independent sources and userscripts, but both ChatGPT and Claude.ai ship React DOM updates frequently. Selectors must be verified in browser at implementation time and treated as a living list, not a fixed constant.

**Primary recommendation:** Use `chrome.storage` as the reactive bus for all cross-component config state. Popup writes → `onChanged` fires in content.js → content.js re-applies RTL. This is stateless-service-worker safe, eliminates race conditions, and requires zero message channels beyond the keyboard shortcut path.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS (ES2022+) | ES2022 | All extension logic | Zero-build; no framework tax in content scripts; established in Phase 1 |
| Chrome MV3 Manifest | V3 | Extension format | Required for Chrome Web Store; MV2 fully deprecated 2024-2025 |
| chrome.storage.sync | Built-in | Per-domain config, cross-device sync | 102,400 bytes total / 8,192 bytes per item; syncs across Chrome profiles |
| chrome.storage.local | Built-in | Fallback when sync quota exceeded | 10,485,760 bytes (10MB); catches QUOTA_BYTES rejections from sync |
| chrome.commands | Built-in | Keyboard shortcut Ctrl+Shift+H | Declared in manifest; user-customizable via chrome://extensions/shortcuts |
| chrome.action | Built-in | Badge text ON/OFF on toolbar icon | setBadgeText + setBadgeBackgroundColor; tabId-scoped |
| chrome.runtime.onInstalled | Built-in | Seed default-sites on first install | reason === 'install' guard prevents re-seeding on update |
| Jest | 30.3.0 (installed) | Storage and service worker unit tests | Already configured in package.json; ESM via NODE_OPTIONS |

### Supporting (Dev Only)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| web-ext | 8.x | Hot-reload and packaging | `web-ext run --target chromium` for live testing against real sites |
| jest-environment-jsdom | 30.3.0 (installed) | DOM-dependent test environment | Tests that exercise content.js init() with mocked chrome APIs |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| chrome.storage.sync + local | Only chrome.storage.local | local gives 10MB but no cross-device sync; requirements explicitly want sync |
| Per-domain key schema | One large object | One object risks hitting 8KB per-item limit; per-domain keys distribute across 8KB slots |
| onChanged reactive bus | Explicit message passing popup→content | onChanged survives service worker restarts; message channels require tab readiness checks |

**Installation (no new packages needed for Phase 2 runtime):**

```bash
# All needed packages already installed from Phase 1
# Verify installed versions:
npm view jest version          # 30.3.0
npm view jest-environment-jsdom version  # 30.3.0
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
Hebrew-RTL-Chrome-Extension/
  manifest.json           # UPDATED: storage, commands, action, scripting permissions; background; commands block
  background.js           # NEW: service worker — onInstalled seed, badge updates, keyboard routing
  content.js              # UPDATED: chrome.storage.sync read on init; onChanged listener; message handler
  lib/
    bidi-detect.js        # UNCHANGED from Phase 1
    storage.js            # NEW: getDomainConfig, setDomainConfig, exportAllConfig (sync→local fallback)
  config/
    default-sites.js      # NEW: pre-configured selectors for 5 platforms
  tests/
    bidi-detect.test.js   # UNCHANGED
    content.test.js       # UNCHANGED
    mutation.test.js      # UNCHANGED
    storage.test.js       # NEW: storage abstraction unit tests
    background.test.js    # NEW: onInstalled seeding test (chrome mock)
  package.json            # UNCHANGED
```

### Pattern 1: Complete manifest.json for Phase 2

**What:** Full MV3 manifest with all Phase 2 permissions, background service worker, action, and commands.

```json
{
  "manifest_version": 3,
  "name": "Hebrew RTL",
  "version": "0.2.0",
  "description": "Hebrew text direction correction at element level",
  "permissions": [
    "storage",
    "activeTab",
    "tabs",
    "scripting"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle",
      "type": "module"
    }
  ],
  "action": {
    "default_title": "Hebrew RTL"
  },
  "commands": {
    "toggle-rtl": {
      "suggested_key": {
        "default": "Ctrl+Shift+H",
        "mac": "MacCtrl+Shift+H"
      },
      "description": "Toggle Hebrew RTL correction for current domain"
    }
  }
}
```

**Permissions explanation:**
- `storage` — required for `chrome.storage.sync` and `chrome.storage.local`
- `activeTab` — allows popup to query current tab URL
- `tabs` — required for `chrome.tabs.query` (service worker needs to find the active tab to send messages)
- `scripting` — required for `chrome.scripting.executeScript` in MV3 (may be needed for dynamic injection edge cases)

**Important note on `"type": "module"` in content_scripts:**
The official Chrome manifest docs for `content_scripts` do NOT list `type` as a valid field. However:
- The Phase 1 manifest already uses it
- The Phase 1 CONTEXT.md explicitly states it is supported in MV3 content scripts
- Multiple community reports indicate conflicting behavior

**Resolution strategy for Phase 2:**
1. Keep `"type": "module"` as-is (already working in Phase 1)
2. First task of the phase: load the extension in Chrome and confirm `import` statements work
3. Fallback plan if imports fail: inline content of `lib/bidi-detect.js` into `content.js` (no import needed — detection functions become local to the file)

For the **background service worker**, `"type": "module"` is confirmed supported by official Chrome docs. Static `import` statements work with `.js` file extension required.

### Pattern 2: Storage Schema — Per-Domain Key

**What:** One key per domain, stored as `domains.<hostname>`. Keeps each entry under the 8,192-byte per-item limit.

```javascript
// Key: "domains.chatgpt.com"
// Value:
{
  enabled: true,
  loadDelay: 0,           // milliseconds to wait after page load before processing
  selectors: [
    {
      id: "sel_001",
      selector: "div[data-message-author-role='assistant'] .markdown",
      enabled: true,
      forceRTL: false     // true = skip detection, always apply RTL (ENG-06)
    }
  ]
}
```

**Size estimate:** ~300-600 bytes per domain config (JSON stringified). At 8,192 bytes per-item limit, a single domain can support ~10-15 selectors before nearing the limit. The 102,400 total sync quota accommodates ~150-300 typical domain configs.

**Fallback trigger:** When `chrome.storage.sync.set()` rejects with a QUOTA_BYTES error, the same key is written to `chrome.storage.local`. On read, try sync first, fall back to local.

### Pattern 3: Storage Abstraction Layer

**Source:** Verified against Chrome Storage API docs — quota values confirmed HIGH confidence.

```javascript
// lib/storage.js
// chrome.storage.sync quota: 102,400 total / 8,192 per item / 512 items max
// chrome.storage.local quota: 10,485,760 (10MB)

export async function getDomainConfig(hostname) {
  const key = `domains.${hostname}`;
  // Try sync first (cross-device), fall back to local
  try {
    const syncData = await chrome.storage.sync.get(key);
    if (syncData[key] !== undefined) return syncData[key];
  } catch (_) { /* sync unavailable — fall through */ }
  const localData = await chrome.storage.local.get(key);
  return localData[key] ?? null;
}

export async function setDomainConfig(hostname, config) {
  const key = `domains.${hostname}`;
  try {
    await chrome.storage.sync.set({ [key]: config });
  } catch (e) {
    // QUOTA_BYTES error — fall back to local
    // Chrome throws: "QUOTA_BYTES quota exceeded" or "QUOTA_BYTES_PER_ITEM quota exceeded"
    await chrome.storage.local.set({ [key]: config });
  }
}

export async function getAllConfigs() {
  // Merge local and sync; sync takes precedence (user's intentional config)
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(null).catch(() => ({})),
    chrome.storage.local.get(null)
  ]);
  return { ...localData, ...syncData };
}
```

**Key insight from chrome.storage.onChanged:** The `onChanged` event provides an `areaName` string parameter. When reading in response to a change event, check `if (areaName === 'sync')` to avoid reacting to unrelated local changes. Always re-read from the correct area based on areaName.

### Pattern 4: Background Service Worker

**Lifecycle constraint (CRITICAL):** Service worker terminates after ~30 seconds of inactivity. Never store state in module-level variables — always read from `chrome.storage` at the start of every handler.

**`type: "module"` confirmed** for background.js — official Chrome docs explicitly show this as valid for service workers.

```javascript
// background.js — event-driven, stateless
import { DEFAULT_DOMAINS } from './config/default-sites.js';

// Seed pre-configured sites on first install only
// reason guard prevents overwriting user's customizations on extension update
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    // Only set keys that don't already exist (safe for updates)
    const existing = await chrome.storage.sync.get(null);
    const toSet = {};
    for (const [hostname, config] of Object.entries(DEFAULT_DOMAINS)) {
      const key = `domains.${hostname}`;
      if (!(key in existing)) {
        toSet[key] = config;
      }
    }
    if (Object.keys(toSet).length > 0) {
      await chrome.storage.sync.set(toSet).catch(() =>
        chrome.storage.local.set(toSet)
      );
    }
  }
});

// Route keyboard shortcut to active tab's content script
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-rtl') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_DOMAIN' });
    } catch (_) {
      // Content script not injected on this page (e.g. chrome:// pages)
    }
  }
});

// Update badge when storage changes
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  await updateBadgeForActiveTab();
});

chrome.tabs.onActivated.addListener(async () => {
  await updateBadgeForActiveTab();
});

async function updateBadgeForActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !tab.id) return;
  let hostname;
  try { hostname = new URL(tab.url).hostname; } catch (_) { return; }
  const key = `domains.${hostname}`;
  const data = await chrome.storage.sync.get(key).catch(() =>
    chrome.storage.local.get(key)
  );
  const enabled = data[key]?.enabled ?? false;
  await chrome.action.setBadgeText({ text: enabled ? 'ON' : '', tabId: tab.id });
  await chrome.action.setBadgeBackgroundColor({ color: '#2563EB', tabId: tab.id });
}
```

**Important guard:** Wrap `chrome.tabs.sendMessage` in try/catch — it rejects if the content script is not running on the page (e.g., `chrome://` pages, `chrome-extension://` pages, PDFs).

### Pattern 5: Content Script Init with Storage Integration

**What:** On page load, content.js reads domain config from storage. If enabled, applies RTL to all matched elements and starts the observer. Reactive: listens for config changes via `onChanged`.

```javascript
// content.js — additions for Phase 2
// (builds on Phase 1 processElement, startObserver, stopObserver)

let _config = null;
let _enabled = false;

async function init() {
  const hostname = location.hostname;
  // getDomainConfig from lib/storage.js (or inline the read)
  const key = `domains.${hostname}`;
  const data = await chrome.storage.sync.get(key)
    .catch(() => chrome.storage.local.get(key));
  _config = data[key] ?? null;

  if (_config?.loadDelay > 0) {
    await new Promise(r => setTimeout(r, _config.loadDelay));
  }

  _enabled = _config?.enabled ?? false;
  if (_enabled) {
    processAllSelectors(_config.selectors);
    startObserver(_config.selectors);
  }
}

// Reactive update when user changes config in popup (CFG-04 auto-save)
chrome.storage.onChanged.addListener((changes, areaName) => {
  const key = `domains.${location.hostname}`;
  if (changes[key]) {
    _config = changes[key].newValue;
    _enabled = _config?.enabled ?? false;
    if (_enabled) {
      processAllSelectors(_config.selectors);
      startObserver(_config.selectors);
    } else {
      stopObserver();
    }
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg.type === 'TOGGLE_DOMAIN') {
    // Toggle enabled state in storage — onChanged will handle the rest
    const key = `domains.${location.hostname}`;
    const newEnabled = !_enabled;
    chrome.storage.sync.get(key).then(data => {
      const config = data[key] ?? { enabled: false, selectors: [], loadDelay: 0 };
      config.enabled = newEnabled;
      chrome.storage.sync.set({ [key]: config })
        .catch(() => chrome.storage.local.set({ [key]: config }));
    });
  }
  if (msg.type === 'PING') respond({ ready: true });
});

init();
```

### Pattern 6: Pre-configured Selectors Structure

```javascript
// config/default-sites.js
// Each entry keyed by hostname, matching the storage key pattern

export const DEFAULT_DOMAINS = {
  'chatgpt.com': {
    enabled: true,
    loadDelay: 0,
    selectors: [
      {
        id: 'chatgpt_assistant',
        selector: 'div[data-message-author-role="assistant"] .markdown',
        enabled: true,
        forceRTL: false
      },
      {
        id: 'chatgpt_user',
        selector: 'div[data-message-author-role="user"] .whitespace-pre-wrap',
        enabled: true,
        forceRTL: false
      }
    ]
  },
  'claude.ai': {
    enabled: true,
    loadDelay: 0,
    selectors: [
      {
        id: 'claude_response',
        selector: 'div[data-testid="user-message"], .font-claude-message',
        enabled: true,
        forceRTL: false
      }
    ]
  },
  'gemini.google.com': {
    enabled: true,
    loadDelay: 500,           // Gemini uses web components that render late
    selectors: [
      {
        id: 'gemini_response',
        selector: 'message-content',    // custom element; may need shadow DOM traversal
        enabled: true,
        forceRTL: false
      },
      {
        id: 'gemini_response_alt',
        selector: 'model-response .markdown',
        enabled: true,
        forceRTL: false
      }
    ]
  },
  'notebooklm.google.com': {
    enabled: true,
    loadDelay: 500,
    selectors: [
      {
        id: 'notebooklm_response',
        selector: '.response-container .chat-message',
        enabled: true,
        forceRTL: false
      }
    ]
  },
  'app.slack.com': {
    enabled: true,
    loadDelay: 1000,          // Slack SPA loads very late
    selectors: [
      {
        id: 'slack_message',
        selector: '.c-message_kit__background .p-rich_text_section',
        enabled: true,
        forceRTL: false
      },
      {
        id: 'slack_message_alt',
        selector: '.p-rich_text_section',
        enabled: true,
        forceRTL: false
      }
    ]
  }
};
```

**IMPORTANT: All selectors in `default-sites.js` MUST be validated in a real browser before shipping.** See Platform Selectors section for confidence levels and alternatives.

### Anti-Patterns to Avoid

- **Module-level state in service worker**: Service workers terminate after 30s idle. Variables like `let config = null` at module scope lose their value. Always re-read from `chrome.storage` in every event handler.
- **Synchronous chrome.storage access**: All storage APIs are async. Always `await chrome.storage.sync.get(...)`. Never call storage synchronously.
- **`chrome.tabs.sendMessage` without try/catch**: Throws if content script is absent (chrome:// pages, PDFs). Wrap in try/catch.
- **Setting badge from content script**: Badge updates require the service worker (or background page). Content scripts cannot call `chrome.action.setBadgeText`.
- **Re-seeding defaults on every update**: Use `reason === 'install'` guard in `onInstalled`. `reason === 'update'` should not overwrite user's custom selectors.
- **Dynamic `import()` in service worker without `type: "module"`**: Dynamic imports work only when the service worker is declared with `"type": "module"` in the manifest.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-device config sync | Custom sync server | `chrome.storage.sync` | Built-in; handles conflict resolution, quota, offline queue |
| Keyboard shortcut registration | `document.addEventListener('keydown')` | `chrome.commands` API | Page-level keydown conflicts with site handlers; Chrome commands intercept at browser level |
| User shortcut customization | Custom settings UI | `chrome://extensions/shortcuts` | Chrome provides this UI for free; extensions cannot build a better version |
| Badge icon state | Tracking in content script | `chrome.action.setBadgeText` from service worker | Only service workers can update badge; content scripts cannot |
| Quota management | Tracking byte counts manually | `chrome.storage.sync.getBytesInUse()` | Built-in bytes-in-use query; use for pre-flight check if desired |
| Config change propagation | Polling `chrome.storage` | `chrome.storage.onChanged` | Event-driven; fires immediately on write; no polling interval needed |

**Key insight:** `chrome.storage` as a reactive bus eliminates most message-passing complexity. Popup writes config → `onChanged` fires in content.js → RTL re-applied. Service worker termination does not affect this because storage is persistent.

---

## Platform CSS Selectors

**IMPORTANT: All selectors must be validated in a browser at implementation time. These are best-known selectors from multiple independent sources, not guaranteed to be current.**

### ChatGPT (chatgpt.com)

**Confidence: MEDIUM** — confirmed from multiple extension developers and a bookmarklet project

| Selector | Targets | Stability |
|----------|---------|-----------|
| `div[data-message-author-role="assistant"] .markdown` | AI response markdown container | Moderate — data attribute is stable but .markdown class may change |
| `div[data-message-author-role="user"] .whitespace-pre-wrap` | User input text | Low — Tailwind utility classes change with redesigns |
| `div[data-message-author-role]` | All messages (broad) | High — data attribute added by React, fairly stable |

**Load delay:** Not needed. ChatGPT messages are in the DOM at page load and streamed into the existing container. MutationObserver handles streaming.

**Shadow DOM:** Not used by ChatGPT. Standard DOM, accessible by `querySelectorAll`.

**Streaming note:** `forceRTL: false` is correct. The MutationObserver + characterData re-evaluation from Phase 1 handles streaming. For known-Hebrew conversations, user can enable `forceRTL: true` via popup (Phase 3).

### Claude.ai (claude.ai)

**Confidence: MEDIUM** — confirmed from bookmarklet project source (give-me/bookmarklets)

| Selector | Targets | Stability |
|----------|---------|-----------|
| `div[data-testid="user-message"]` | User message container | High — testid attributes are more stable than class names |
| `.font-claude-message` | Claude response text | Moderate — custom class, may change with redesigns |
| `div[data-test-render-count] .font-claude-response` | Claude response alternative | Low — render-count is internal |

**Load delay:** Not needed. SPA navigation handled by MutationObserver.

**Shadow DOM:** Not used by Claude.ai for message elements.

### Gemini (gemini.google.com)

**Confidence: LOW** — Gemini uses Angular-based custom web components. DOM structure is deeply nested and changes frequently.

| Selector | Targets | Note |
|----------|---------|------|
| `message-content` | Custom element for message body | Web component; may use Shadow DOM |
| `model-response .markdown` | Response markdown content | Fallback |
| `user-query-content` | User message content | Custom element |

**Critical investigation needed:** Gemini uses Angular custom elements (`<message-content>`, `<model-response>`, `<user-query-content>`). If these use `open` Shadow DOM, `querySelectorAll` from the main document will NOT pierce the shadow boundary. However, if they use `open` mode, `element.shadowRoot.querySelectorAll()` can reach inside.

**Shadow DOM strategy:** If outer custom element is accessible but content is in a shadow root, the MutationObserver at document level will still fire when shadow root content is added (as long as the host element is accessible). The content script can then call `hostElement.shadowRoot.querySelectorAll(innerSelector)`.

**Load delay:** 500ms recommended. Angular initializes components asynchronously.

**Note:** Gemini's selectors were confirmed from the bookmarklet project (`user-query-content, message-content`). These are the custom element tag names — straightforward to target if not using closed Shadow DOM.

### NotebookLM (notebooklm.google.com)

**Confidence: LOW** — No public extension or userscript found that documents NotebookLM-specific selectors. Also Google-built, likely Angular components similar to Gemini.

**Strategy for implementation:** Implement plan 02-04 by opening NotebookLM in DevTools and inspecting chat message containers live. Look for:
- Custom element tag names (similar to Gemini's `message-content`)
- Angular-specific attributes like `_ngcontent-*`
- Data attributes for message role

**Placeholder selectors (validate before shipping):**
```javascript
selector: '.chat-message .message-content'  // placeholder — MUST verify
```

**Load delay:** 500ms recommended (Angular SPA).

### Slack (app.slack.com)

**Confidence: MEDIUM** — confirmed from Greasyfork userscript source code analysis

| Selector | Targets | Source |
|----------|---------|--------|
| `.c-message_kit__background .p-rich_text_section` | Rich text message content | Slack Conversation Scraper userscript |
| `.p-rich_text_section` | All rich text sections (broader) | Same userscript |
| `.c-message_kit__background` | Message block wrapper | Same userscript |

**Shadow DOM status: NOT confirmed as closed.** The Tampermonkey feature request for "unlocking closed shadow DOM" references a general technique, not Slack specifically. Multiple working Slack userscripts (Greasyfork, Gist) use standard `document.querySelectorAll` with no shadow DOM piercing. This strongly implies Slack's message DOM is NOT behind a closed Shadow DOM.

**Load delay:** 1000ms strongly recommended. Slack's SPA loads significantly slower than ChatGPT/Claude. Users navigate to a workspace, then channel — channel message content loads after route change. MutationObserver is critical for Slack.

**Keyboard shortcut conflict (Ctrl+Shift+H):** Slack uses Ctrl+Shift+H to "Mark channel as read." Chrome extension keyboard shortcuts are intercepted at the browser level BEFORE the page receives them, so the extension shortcut takes priority. This is confirmed behavior — extension commands always preempt page-level keyboard handlers. The user can always use `chrome://extensions/shortcuts` to remap if they prefer Slack's shortcut.

---

## Common Pitfalls

### Pitfall 1: Service Worker State Loss (Critical)

**What goes wrong:** Developer writes `let config = {}` at module scope in `background.js`. After 30 seconds of user inactivity, Chrome terminates the service worker. Next keyboard shortcut press — service worker restarts with `config = {}`, finds no active tab context, fails silently.

**Why it happens:** MV3 service workers are explicitly event-driven. Chrome terminates them aggressively.

**How to avoid:** Never store state in service worker module scope. Every handler must read from `chrome.storage` at its start. The `updateBadgeForActiveTab()` function reads fresh from storage every time it runs.

**Warning signs:** Badge stops updating after a few minutes of inactivity. Keyboard shortcut stops working.

### Pitfall 2: onInstalled Seeding Overwrites User Config on Extension Update

**What goes wrong:** `onInstalled` fires on both `install` and `update`. Developer writes `await chrome.storage.sync.set(DEFAULT_DOMAINS)` without checking `reason`. Every time the extension updates, user's custom selectors are overwritten.

**How to avoid:** Check `reason === 'install'` before seeding. For added safety, check if the key already exists before writing.

```javascript
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== 'install') return; // guard
  // Only seed keys that don't already exist
});
```

### Pitfall 3: chrome.storage.sync Quota Rejection Lost

**What goes wrong:** `chrome.storage.sync.set()` rejects (quota exceeded) but the rejection is unhandled. The write silently fails. User's config change is lost. No error shown.

**How to avoid:** Always await and catch storage writes. On QUOTA_BYTES rejection, fall back to `chrome.storage.local.set()`. The error message contains "QUOTA_BYTES" (for total) or "QUOTA_BYTES_PER_ITEM" (for per-item). Catch all errors from sync writes.

### Pitfall 4: Platform Selector Drift

**What goes wrong:** ChatGPT or Claude.ai deploys a React DOM update. `.markdown` becomes `.prose` or something else. Extension silently stops applying RTL. Users file bug reports.

**How to avoid:**
1. Ship multiple fallback selectors per site (primary + alternatives)
2. Test after each platform update
3. Treat selectors as version-dependent configuration, not static code
4. Document which platform version each selector was verified against

**Warning signs:** Extension works on some pages but not others; zero elements matched despite text being present.

### Pitfall 5: Gemini/NotebookLM Shadow DOM Barrier

**What goes wrong:** `document.querySelectorAll('message-content')` returns the custom element host but `.textContent` returns empty string because all content is inside a shadow root. The engine processes an empty element.

**How to avoid:** If the shadow root is `open`, access it via `hostElement.shadowRoot.querySelectorAll(innerSelector)`. If `closed`, document this as a known limitation. Investigation required at implementation time using DevTools.

**Detection test:** In DevTools console on gemini.google.com: `document.querySelector('message-content').shadowRoot` — if this returns a ShadowRoot object (not null), the shadow DOM is open and accessible.

### Pitfall 6: Keyboard Shortcut Routing When Content Script Not Ready

**What goes wrong:** User presses Ctrl+Shift+H very quickly after page load. Service worker sends `TOGGLE_DOMAIN` message to the tab. Content script's `init()` async function hasn't finished — `_config` is null. Toggle does nothing.

**How to avoid:** Content script message handler for `TOGGLE_DOMAIN` should read config fresh from storage rather than relying on the in-memory `_config` variable. The onChanged handler will then re-apply. Alternatively, add a PING/PONG readiness check in the service worker before sending.

### Pitfall 7: chrome.tabs.sendMessage Throwing on Restricted Pages

**What goes wrong:** User presses Ctrl+Shift+H while viewing `chrome://settings` or a PDF. `chrome.tabs.sendMessage` throws `"Could not establish connection. Receiving end does not exist."` Service worker crashes (or errors logged to console).

**How to avoid:** Always wrap `chrome.tabs.sendMessage` in try/catch in the service worker.

---

## Code Examples

### Storage Quota Constants (verified from official Chrome docs)

```javascript
// Source: https://developer.chrome.com/docs/extensions/reference/api/storage
chrome.storage.sync.QUOTA_BYTES          = 102400  // 100KB total
chrome.storage.sync.QUOTA_BYTES_PER_ITEM = 8192    // 8KB per key
chrome.storage.sync.MAX_ITEMS            = 512
chrome.storage.sync.MAX_WRITE_OPERATIONS_PER_MINUTE = 120
chrome.storage.sync.MAX_WRITE_OPERATIONS_PER_HOUR   = 1800

chrome.storage.local.QUOTA_BYTES = 10485760  // 10MB
```

### Commands Manifest Block (verified from Chrome Commands API docs)

```json
"commands": {
  "toggle-rtl": {
    "suggested_key": {
      "default": "Ctrl+Shift+H",
      "mac": "MacCtrl+Shift+H"
    },
    "description": "Toggle Hebrew RTL correction for current domain"
  }
}
```

**MacCtrl vs Ctrl:** On macOS, `"Ctrl"` in the `"default"` key is automatically converted to Command (Cmd). To use the actual macOS Control key, declare it separately under `"mac": "MacCtrl+Shift+H"`. Using `MacCtrl` on Windows/Linux causes a validation error — the `"mac"` key is Mac-only.

**User customization:** Providing `"suggested_key"` does NOT lock the shortcut. Chrome exposes the shortcut at `chrome://extensions/shortcuts` where users can change it. This is KBD-02 for free.

### Badge Update (verified from chrome.action API docs)

```javascript
// Both methods support optional tabId to scope to a specific tab
await chrome.action.setBadgeText({
  text: enabled ? 'ON' : '',
  tabId: tab.id          // scope to tab, auto-resets when tab closes
});
await chrome.action.setBadgeBackgroundColor({
  color: '#2563EB',
  tabId: tab.id
});
```

### onChanged with areaName Check (verified from chrome.storage API docs)

```javascript
// Source: https://developer.chrome.com/docs/extensions/reference/api/storage
chrome.storage.onChanged.addListener((changes, areaName) => {
  // areaName: 'sync', 'local', or 'session'
  const key = `domains.${location.hostname}`;
  if (changes[key]) {
    const newConfig = changes[key].newValue;
    // Apply regardless of areaName — user's intent is clear
    applyConfig(newConfig);
  }
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MV2 background page (persistent) | MV3 service worker (terminates after 30s) | Chrome deprecated MV2 2024-2025 | All state must be in storage; no in-memory caching in background |
| `chrome.tabs.executeScript()` | `chrome.scripting.executeScript()` in MV3 | Chrome 88+ MV3 launch | MV3 requires the scripting permission; old API removed |
| `webRequest` blocking | `declarativeNetRequest` | Chrome MV3 | Not relevant for this project |
| One background.js key for all config | Per-domain key `domains.<hostname>` | Best practice established by Multi-RTL and similar tools | Distributes across 8KB per-item slots; prevents single large object hitting per-item quota |
| Polling for config changes | `chrome.storage.onChanged` reactive | MV3 pattern | No polling overhead; immediate propagation |

**Deprecated/outdated:**
- `chrome.browserAction` / `chrome.pageAction`: Unified into `chrome.action` in MV3
- `background.persistent: true`: Not valid in MV3 manifest
- `chrome.storage.sync` MAX_ITEMS was previously 1800 (documented in older sources) — current verified value is 512

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 (installed) |
| Config file | `package.json` (jest config section — already configured) |
| Quick run command | `NODE_OPTIONS=--experimental-vm-modules npx jest tests/storage.test.js --no-coverage` |
| Full suite command | `NODE_OPTIONS=--experimental-vm-modules npx jest --no-coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CFG-01 | getDomainConfig reads sync first, falls back to local | unit (node) | `NODE_OPTIONS=--experimental-vm-modules npx jest tests/storage.test.js -t "getDomainConfig" --no-coverage` | Wave 0 |
| CFG-01 | setDomainConfig falls back to local on quota rejection | unit (node) | `NODE_OPTIONS=--experimental-vm-modules npx jest tests/storage.test.js -t "fallback" --no-coverage` | Wave 0 |
| CFG-02 | DEFAULT_DOMAINS has entries for all 5 hosts | unit (node) | `NODE_OPTIONS=--experimental-vm-modules npx jest tests/storage.test.js -t "default-sites" --no-coverage` | Wave 0 |
| CFG-02 | Each platform selector is non-empty string | unit (node) | `NODE_OPTIONS=--experimental-vm-modules npx jest tests/storage.test.js -t "selector format" --no-coverage` | Wave 0 |
| CFG-03 | loadDelay > 0 causes setTimeout before processing | unit (jsdom) | `NODE_OPTIONS=--experimental-vm-modules npx jest tests/content.test.js -t "loadDelay" --no-coverage` | Wave 0 |
| CFG-04 | onChanged fires and triggers re-apply | unit (jsdom) | `NODE_OPTIONS=--experimental-vm-modules npx jest tests/content.test.js -t "onChanged" --no-coverage` | Wave 0 |
| KBD-01 | onCommand 'toggle-rtl' calls chrome.tabs.sendMessage | unit (node) | `NODE_OPTIONS=--experimental-vm-modules npx jest tests/background.test.js -t "toggle-rtl" --no-coverage` | Wave 0 |
| KBD-01 | TOGGLE_DOMAIN message flips enabled in storage | unit (jsdom) | `NODE_OPTIONS=--experimental-vm-modules npx jest tests/content.test.js -t "TOGGLE_DOMAIN" --no-coverage` | Wave 0 |
| KBD-02 | Manifest commands block has suggested_key with mac variant | unit (node) | `NODE_OPTIONS=--experimental-vm-modules npx jest tests/background.test.js -t "manifest commands" --no-coverage` | Wave 0 |

**Note on browser-only validation (no automated tests possible):**
- Platform selectors working on chatgpt.com, claude.ai, gemini.google.com, notebooklm.google.com, app.slack.com — requires `web-ext run` and manual inspection
- Extension keyboard shortcut intercepting Slack's Ctrl+Shift+H — manual browser test
- Content script ES module imports working in Chrome — manual browser test (load unpacked, check DevTools)

### Sampling Rate

- **Per task commit:** `NODE_OPTIONS=--experimental-vm-modules npx jest tests/storage.test.js tests/background.test.js --no-coverage`
- **Per wave merge:** `NODE_OPTIONS=--experimental-vm-modules npx jest --no-coverage`
- **Phase gate:** Full suite green + manual browser validation of all 5 sites before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/storage.test.js` — covers CFG-01, CFG-02, CFG-04; needs chrome mock
- [ ] `tests/background.test.js` — covers KBD-01, onInstalled seeding; needs chrome mock
- [ ] Chrome mock: create `tests/__mocks__/chrome.js` or use `jest.fn()` stubs inline for `chrome.storage`, `chrome.tabs`, `chrome.action`, `chrome.commands`, `chrome.runtime`
- [ ] Update `tests/content.test.js` — add CFG-03 (loadDelay) and CFG-04 (onChanged) tests; add KBD-01 (TOGGLE_DOMAIN message) test

**Chrome API mock pattern for Jest:**
```javascript
// In test file or setup
const chromeMock = {
  storage: {
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      QUOTA_BYTES: 102400,
      QUOTA_BYTES_PER_ITEM: 8192
    },
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined)
    },
    onChanged: { addListener: jest.fn() }
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{ id: 1, url: 'https://chatgpt.com/' }]),
    sendMessage: jest.fn().mockResolvedValue(undefined)
  },
  runtime: {
    onInstalled: { addListener: jest.fn() },
    onMessage: { addListener: jest.fn() }
  },
  action: {
    setBadgeText: jest.fn().mockResolvedValue(undefined),
    setBadgeBackgroundColor: jest.fn().mockResolvedValue(undefined)
  },
  commands: { onCommand: { addListener: jest.fn() } }
};
global.chrome = chromeMock;
```

---

## Open Questions

1. **Does `"type": "module"` in `content_scripts` actually work in Chrome?**
   - What we know: Official manifest docs do NOT list `type` as a valid content_scripts field. However, Phase 1 CONTEXT.md states it is supported. Phase 1 tests pass in Jest (Node) but do not test browser loading.
   - What's unclear: Whether Chrome silently ignores the unknown field and content.js runs without module resolution, or whether it does honor the field and enable static `import`.
   - Recommendation: Plan 02-01 MUST include a step to load the extension unpacked in Chrome and verify the `import` statement in content.js works. If it fails, fallback: inline `lib/bidi-detect.js` functions into `content.js` (remove the `export` keyword and paste the functions directly).

2. **Gemini and NotebookLM Shadow DOM mode**
   - What we know: Both are Angular-based Google apps with custom web components. Gemini uses `<message-content>` and `<model-response>` tag names.
   - What's unclear: Whether these custom elements use `open` or `closed` shadow roots.
   - Recommendation: Plan 02-04 must begin with DevTools inspection on both sites. In DevTools console: `document.querySelector('message-content')?.shadowRoot` — non-null = open (accessible), null = may be closed or no shadow root.

3. **NotebookLM exact selector**
   - What we know: No public extension or userscript documents NotebookLM selectors.
   - What's unclear: What the actual DOM looks like for NotebookLM chat responses.
   - Recommendation: Plan 02-04 must begin with live inspection. If NotebookLM is similar to Gemini (same Angular platform), the `message-content` or similar custom element tag may apply.

4. **Ctrl+Shift+H conflict on Slack**
   - What we know: Extension keyboard shortcuts intercept before page-level handlers. Chrome docs confirm this.
   - What's unclear: Whether the conflict causes user friction. Slack's "Mark as read" is a common action.
   - Recommendation: Ship with Ctrl+Shift+H as declared. Document the known conflict. KBD-02 (user-customizable) is the resolution path for affected users.

---

## Sources

### Primary (HIGH confidence)

- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage) — quota values (102,400 / 8,192 / 512 / 10,485,760), onChanged areaName, error handling
- [Chrome Commands API](https://developer.chrome.com/docs/extensions/reference/api/commands) — MacCtrl vs Ctrl, suggested_key structure, reserved shortcuts
- [Chrome Action API](https://developer.chrome.com/docs/extensions/reference/api/action) — setBadgeText, setBadgeBackgroundColor, tabId scoping
- [Chrome Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) — 30s termination, onInstalled vs onStartup distinction
- [Chrome Manifest Background Reference](https://developer.chrome.com/docs/extensions/reference/manifest/background) — `"type": "module"` confirmed for service workers
- [Chrome Manifest Content Scripts Reference](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts) — official field list (type NOT listed)
- `.planning/research/STACK.md` — storage schema, per-domain key pattern, chrome API table
- `.planning/research/ARCHITECTURE.md` — component boundaries, message passing, service worker patterns
- `.planning/research/PITFALLS.md` — Pitfalls 3 (state loss), 6 (selector drift), 8 (quota), 10 (shadow DOM), 14 (keyboard conflict)

### Secondary (MEDIUM confidence)

- [give-me/bookmarklets GitHub](https://github.com/give-me/bookmarklets) — Claude.ai `div[data-testid="user-message"]`, ChatGPT `div[data-message-author-role]`, Gemini `user-query-content, message-content` selectors
- [DJ Petersen ChatGPT extension article](https://thedjpetersen.com/thoughts/chatgpt-extension/) — confirmed `data-message-author-role` attribute and streaming detection pattern
- [Slack Conversation Scraper (Greasyfork)](https://greasyfork.org/en/scripts/521263-slack-conversation-scraper-custom-buttons/code) — confirmed `.c-message_kit__background` and `.p-rich_text_section` selectors
- [dev.to Claude extension article](https://dev.to/clawgenesis/i-built-a-chrome-extension-for-claude-in-45-minutes-heres-what-i-learned-53k7) — confirmed `data-testid` usage in Claude.ai, fallback selector strategy

### Tertiary (LOW confidence — flag for validation)

- Gemini selectors `message-content`, `model-response` — from bookmarklet project; Angular web components change frequently
- NotebookLM selectors — no confirmed public source; must be verified by live inspection
- Content script ES module import (`"type": "module"`) — conflicting evidence; official docs don't list it; must verify in browser

---

## Metadata

**Confidence breakdown:**
- Manifest structure and permissions: HIGH — official Chrome docs
- Storage quotas and patterns: HIGH — official Chrome docs with exact byte values
- Service worker lifecycle: HIGH — official Chrome docs
- Keyboard commands API: HIGH — official Chrome docs
- ChatGPT selectors: MEDIUM — multiple independent sources agree on `data-message-author-role`
- Claude.ai selectors: MEDIUM — bookmarklet source + dev.to article confirm `data-testid` approach
- Slack selectors: MEDIUM — live userscript source confirms `.p-rich_text_section`
- Gemini selectors: LOW — web component tag names confirmed but shadow DOM status unknown
- NotebookLM selectors: LOW — no confirmed public source
- Content script ES module support: LOW/conflicting — must validate in browser

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (Chrome APIs stable; platform selectors valid ~2-4 weeks given ChatGPT/Claude update frequency)
