# Technology Stack

**Project:** Hebrew RTL Chrome Extension
**Researched:** 2026-03-22
**Confidence:** HIGH (Chrome MV3 APIs are stable; vanilla JS decision is explicit in PROJECT.md constraints)

---

## Decision Context

The PROJECT.md explicitly mandates: **"vanilla JS (no framework dependency in content script — performance critical)"**. This is the right call for a content script that runs inside every page the user visits. Framework overhead, hydration costs, and bundle size all hurt real-world extension performance. This STACK.md respects that constraint and expands it into a complete, opinionated build picture.

---

## Recommended Stack

### Core Extension Architecture

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Chrome Manifest V3 | V3 (current) | Extension manifest format | Required for Chrome Web Store submission; MV2 deprecated and phased out 2024-2025 |
| Vanilla JavaScript (ES2022+) | ES2022 | Content script + all extension logic | No framework tax; content scripts run in every matched page — every KB and every ms matters. Chrome 88+ supports all needed ES2022 features (private class fields, structuredClone, at(), Array.at). |
| HTML + CSS | Standard | Popup UI (popup.html) | No framework needed for a ~200-line settings popup; plain HTML is simpler, faster, and avoids CSP violations from inline scripts blocked by MV3 |
| Service Worker (background.js) | MV3 standard | Extension lifecycle, badge updates, message routing | MV3 replaces persistent background pages with event-driven service workers; must not store state in memory |

---

### Build Tooling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| No bundler (zero-build) | — | Development and production delivery | Given vanilla JS with no runtime npm dependencies, there is nothing to bundle. Zero-build eliminates webpack/rollup configuration overhead, keeps source readable and auditable, and avoids the MV3 CSP problem where bundlers inject runtime helpers that violate `script-src 'self'`. |
| ESLint | 9.x | Code quality | Catches common extension bugs: accessing `window` in service worker context, forgetting `await` on storage calls, accidental sync API usage. |
| web-ext | 8.x | Extension dev server, testing, and packaging | `web-ext run --target chromium` opens a clean Chrome profile with extension hot-reloaded. `web-ext build` produces the Chrome Web Store zip. Industry-standard tool for extension development. |
| Jest | 29.x | Unit testing | Test the RTL detection algorithm and selector generation logic in Node environment. No DOM needed for pure BiDi logic tests. |
| Playwright | Latest | Integration / E2E testing | Playwright supports Chrome extensions via `--load-extension` flag. Verify that content scripts apply RTL styles on real target sites. |

**What NOT to use:**
- **Webpack, Vite, Rollup, Parcel** — overkill for a zero-dependency project; introduces CSP complications and makes source harder to audit for Chrome Web Store review.
- **TypeScript** — adds a build step without meaningful benefit for a small, focused codebase. Use JSDoc `@type` annotations with VS Code's `checkJs` if type hints are desired.
- **React, Vue, Svelte** — explicitly excluded by project constraints; inappropriate for content scripts on performance and bundle-size basis.

---

### Chrome APIs

| API | Purpose | MV3 Notes |
|-----|---------|-----------|
| `chrome.storage.sync` | Per-domain selector configuration, synced across devices | 100KB total, 8KB per item, 1800 items max. Store one key per domain. |
| `chrome.storage.local` | Fallback for configs exceeding sync quota | 10MB quota. Do NOT request `unlimitedStorage` — triggers Web Store scrutiny. |
| `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage` | Popup ↔ content script communication | One-shot messages for toggle, config sync, picker activation. |
| `chrome.commands` | Keyboard shortcut Ctrl+Shift+H | Declared in `manifest.json` under `commands`; handled in service worker. |
| `chrome.action` | Popup badge (enabled/disabled indicator per domain) | `chrome.action.setBadgeText` from service worker on storage change events. |
| `chrome.tabs.query` | Get current active tab URL for popup | Required to show the correct domain's config in popup. |
| `MutationObserver` | Real-time DOM change detection | Available in content script. NOT available in service worker. |

---

### Unicode BiDi and Hebrew Detection

**Decision: Custom implementation, no npm library.**

The algorithm is approximately 60-80 lines of vanilla JavaScript. No npm library is needed.

**Unicode ranges for Hebrew:**

| Block | Range | Notes |
|-------|-------|-------|
| Hebrew | U+0590–U+05FF | Consonants, vowel marks (nikkud), cantillation marks |
| Hebrew Presentation Forms | U+FB1D–U+FB4F | Alternative letter forms and ligatures |

**Algorithm (two-pass):**

```javascript
// lib/bidi-detect.js
const HEBREW_RE = /[\u0590-\u05FF\uFB1D-\uFB4F]/;
const HEBREW_LETTER_RE = /[\u05D0-\u05EA\u05F0-\u05F4\uFB1D-\uFB4F]/;
const SKIP_RE = /[\d\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u00BF]|[\uD800-\uDFFF]/;

export function detectDirection(text) {
  const chars = [...text]; // spread handles emoji surrogate pairs correctly

  // Pass 1: first-strong-character algorithm
  for (const ch of chars) {
    if (SKIP_RE.test(ch)) continue;
    if (HEBREW_RE.test(ch)) return 'rtl';
    return 'ltr';
  }

  // Pass 2: mixed-content 30% threshold
  const letterCount = chars.filter(ch => /\p{L}/u.test(ch)).length;
  if (letterCount === 0) return 'ltr';
  const hebrewCount = chars.filter(ch => HEBREW_LETTER_RE.test(ch)).length;
  return hebrewCount / letterCount >= 0.30 ? 'rtl' : 'ltr';
}

export function isExemptElement(el) {
  const tag = el.tagName?.toLowerCase();
  if (['code', 'pre', 'kbd', 'samp'].includes(tag)) return true;
  if (el.matches?.('.katex, .math, [class*="math"], [class*="latex"]')) return true;
  const text = el.textContent?.trim() ?? '';
  if (/^(https?|ftp|file):\/\//i.test(text)) return true;
  if (/^\/[a-z0-9._/-]+$/i.test(text)) return true;
  return false;
}
```

**Libraries rejected:**
- `bidi-js` — Full UAX#9 algorithm, ~15KB, overkill
- `rtl-detect` — Detects locale/language, not character-level BiDi
- `unicode-bidi` — Full BiDi implementation, ~30KB+

---

### Content Script CSS Injection Strategy

**Use inline style property API (not stylesheet injection):**

```javascript
function applyRTL(el) {
  el.style.direction = 'rtl';
  el.style.textAlign = 'right';
  el.setAttribute('data-hrtl-processed', '1');
}
```

**Why inline styles:** Element-specific, survive DOM replacement, do not clobber other inline styles.

**What NOT to use:** `chrome.scripting.insertCSS` (page-wide only), `document.styleSheets` manipulation (fragile), CSS `!important` rules.

---

### Element Picker and Selector Builder UI

**Use Shadow DOM isolation (`mode: 'closed'`) for all injected UI.**

Any overlay injected into host pages must be isolated from host page CSS using Shadow DOM.

---

### MV3 vs MV2: Key Differences

| Concern | MV3 Impact |
|---------|-----------|
| Background persistence | Service worker sleeps; all state in `chrome.storage`, not memory |
| `MutationObserver` | NOT available in service worker — stays in content.js |
| Inline scripts in HTML | Prohibited — popup HTML must use `<script src="...">` only |
| `eval()` | Prohibited |
| Remote code fetching | Prohibited |

---

### Storage Architecture

```javascript
// Key pattern: domains.<hostname>
const key = `domains.${new URL(tab.url).hostname}`;

// Structure per key (must stay under 8KB)
const domainConfig = {
  enabled: true,
  loadDelay: 0,
  selectors: [
    { id: 'sel_001', selector: '.markdown .prose p', enabled: true, contentBased: true, forceRTL: false }
  ]
};
```

At ~500 bytes per domain config, ~16 domains fit in sync storage before hitting limits. Fall back transparently to `chrome.storage.local` for power users.

---

### Project Structure

```
Hebrew-RTL-Chrome-Extension/
  manifest.json           # MV3 manifest
  background.js           # Service worker
  content.js              # MutationObserver + RTL engine entry point
  picker.js               # Element picker mode (activated on demand)
  popup/
    popup.html
    popup.css
    popup.js
  lib/
    bidi-detect.js        # Custom Hebrew BiDi detection (~80 lines)
    selector-builder.js   # Ancestor chain traversal + CSS selector generation
    storage.js            # chrome.storage wrapper with sync/local fallback
  config/
    default-sites.js      # Pre-configured selectors: ChatGPT, Claude, Gemini, NotebookLM, Slack
  icons/
    icon16.png
    icon48.png
    icon128.png
  tests/
    bidi-detect.test.js
    selector-builder.test.js
  package.json
```

---

### Dev Dependencies

```bash
# No runtime npm dependencies — zero-build approach
npm init -y
npm install --save-dev eslint web-ext jest @playwright/test
```

---

## Key Findings Summary

- **Zero-build, vanilla JS** is correct and required. No bundler, no framework, no runtime npm dependencies.
- **Custom BiDi detection** (~80 lines): implement first-strong-character algorithm using U+0590–U+05FF and U+FB1D–U+FB4F.
- **MV3 service worker** does not support `MutationObserver` — all DOM work stays in `content.js`.
- **Inline `el.style.direction`** is the correct CSS injection strategy for per-element content-based detection.
- **Shadow DOM** (`mode: 'closed'`) is mandatory for picker and selector builder overlays.
- **chrome.storage.sync** with per-domain keys stays under the 8KB per-item quota.
- **web-ext** is the standard extension development and packaging CLI.
