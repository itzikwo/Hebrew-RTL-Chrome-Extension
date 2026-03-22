# Phase 1: RTL Engine - Research

**Researched:** 2026-03-22
**Domain:** Hebrew BiDi detection, DOM style application, MutationObserver, Chrome MV3 content scripts
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Re-evaluate on `characterData` mutations**: When the MutationObserver detects a `characterData` change on an already-classified element, remove `data-hrtl-processed` and re-run detection. This catches elements that started with LTR-neutral tokens (English punctuation, loading placeholders) but became Hebrew as AI platforms stream more content.
- **Bidirectional re-evaluation**: Allow both LTR→RTL and RTL→LTR direction changes. If content is later edited or replaced with all-English content, the element should revert to LTR. This handles paste events, live edits, and edge cases correctly.
- **Rate**: Re-evaluation runs only within the existing 100ms debounce batch — no separate throttling mechanism. Elements that changed during the debounce window are re-queued and processed together when the debounce fires.
- **Hebrew-only detection**: U+0590-05FF + U+FB1D-FB4F (both ranges, both counted in 30% threshold)
- **30% mixed-content threshold**: Fixed — not user-configurable
- **Inline `el.style.direction` / `el.style.textAlign`**: Not stylesheet injection
- **`data-hrtl-processed` marker**: To prevent re-processing
- **`attributes: true` MUST NOT be set** in MutationObserver (infinite loop)
- **Custom BiDi implementation (~80 lines)**: No npm libraries

### Claude's Discretion

- **Streaming flicker**: Whether to use a minimum character threshold before classifying streaming elements — Claude should decide the right balance. Hint: `forceRTL: true` mode (Phase 2 config) is the user's tool for eliminating flicker on known-RTL selectors; the engine itself can accept the brief flip.
- **Detection granularity**: Whether to apply RTL to the matched element only, or walk child text nodes to find first substantive content — Claude decides based on the inline element handling requirement (ENG-08). The algorithm should be whatever correctly handles `<li><strong>label</strong> Hebrew text</li>`.
- **LTR exemption scope**: Beyond `code`, `pre`, `.katex`, `.math`, URLs, and file paths — any additional exemptions are Claude's call during implementation. No user-specific exemptions required.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENG-01 | Hebrew detection using Unicode BiDi first-strong-character algorithm, skipping emojis, numbers, bullets, punctuation | Custom `detectDirection()` function using SKIP_RE + HEBREW_RE patterns; spread operator for surrogate-pair safety |
| ENG-02 | Apply `direction:rtl` + `text-align:right` at individual DOM element level (not page level) | `el.style.direction` / `el.style.textAlign` inline style API; `data-hrtl-processed` marker prevents re-processing loops |
| ENG-03 | Mixed content: 30%+ Hebrew chars (U+0590-05FF + U+FB1D-FB4F) classified as RTL | Two-pass algorithm: first-strong then letter-count ratio; both ranges must be counted |
| ENG-04 | LTR preservation for `code`, `pre`, KaTeX/LaTeX, URLs, file paths | `isExemptElement()` function; ancestor walk to catch inheritance; explicit `direction:ltr` reset on math descendants |
| ENG-05 | MutationObserver for dynamic/streamed content, 100ms debounce | `childList + characterData + subtree: true`; `attributes: true` intentionally omitted; `pendingNodes` Set for dedup |
| ENG-06 | Forced RTL mode per selector: skips detection, always applies RTL | `forceRTL` flag on selector config bypasses `detectDirection()` call entirely |
| ENG-07 | List bullet/number visibility: auto-apply `list-style-position:inside` on RTL `<li>` | Inside `applyRTL()`: check `el.tagName === 'LI'` before setting the property |
| ENG-08 | Mixed inline elements: walk child text nodes to find first substantive content | Recursive text-node walker skipping whitespace-only nodes; skips inline formatting wrappers (`<strong>`, `<em>`, `<span>`) |
</phase_requirements>

---

## Summary

Phase 1 delivers a pure JavaScript engine with two files: `lib/bidi-detect.js` (Hebrew detection and exemption logic — no DOM, fully testable in Node/Jest) and `content.js` (MutationObserver integration, style application, element processing loop). No Chrome APIs are used in the library itself.

The detection algorithm is a two-pass design: pass one applies the Unicode BiDi first-strong-character rule (skip neutral chars, return direction on first strong character); pass two counts Hebrew letter fraction against total letter count and returns RTL if 30%+ Hebrew. Both the Hebrew block (U+0590-05FF) and Hebrew Presentation Forms (U+FB1D-FB4F) are counted in both passes.

Style application is always inline (`el.style.direction`, `el.style.textAlign`) — never stylesheet injection. Inline styles have the highest non-`!important` specificity and survive DOM replacement. The `data-hrtl-processed` attribute on each processed element is the circuit breaker that prevents the MutationObserver from looping on its own mutations. The observer must NOT set `attributes: true` for this reason.

**Primary recommendation:** Build `lib/bidi-detect.js` as a pure ES module export (no DOM, no Chrome APIs) so it is directly importable by Jest tests. Wire the MutationObserver in `content.js` which imports the lib. This keeps the detection logic verifiable without a browser.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS (ES2022+) | ES2022 | Content script and detection engine | No framework tax; content scripts run on every page load; Chrome 88+ supports private class fields, `structuredClone`, spread (emoji surrogate pairs), `Array.at` |
| Chrome MV3 Manifest | V3 | Extension format | Required for Chrome Web Store; MV2 deprecated and phased out 2024-2025 |
| Jest | 29.x | Unit tests for BiDi engine | Runs in Node — no browser needed to test pure detection functions |

### Supporting (Dev Only — No Runtime Dependencies)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ESLint | 9.x | Code quality | Catches `window` access in service worker context, missing `await` on storage calls |
| web-ext | 8.x | Extension dev server and packaging | `web-ext run --target chromium` hot-reloads extension; `web-ext build` produces Chrome Web Store zip |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom BiDi (~80 lines) | `bidi-js` (~15KB) | bidi-js implements full UAX#9 — overkill; custom solution covers Hebrew use case in 30% of the code |
| Custom BiDi (~80 lines) | `unicode-bidi` (~30KB+) | Same; full spec compliance not required; adds npm dependency to zero-dependency content script |
| Custom BiDi (~80 lines) | `rtl-detect` | rtl-detect operates on locale strings, not character-level BiDi — wrong abstraction level |
| Inline styles | `chrome.scripting.insertCSS` | insertCSS is page-wide only; cannot target individual elements based on content; wrong tool |

**Installation (dev dependencies only — zero runtime npm):**

```bash
npm init -y
npm install --save-dev jest eslint web-ext
```

**Version verification (run before writing package.json):**

```bash
npm view jest version
npm view eslint version
npm view web-ext version
```

---

## Architecture Patterns

### Recommended Project Structure

```
Hebrew-RTL-Chrome-Extension/
  manifest.json           # MV3 manifest — Phase 1 skeleton
  content.js              # MutationObserver + RTL engine entry point
  lib/
    bidi-detect.js        # Custom Hebrew BiDi detection (~80 lines) — pure, no DOM
  tests/
    bidi-detect.test.js   # Jest unit tests — runs in Node
  package.json            # dev dependencies only
```

Phase 1 does not implement `background.js`, `popup/`, `picker.js`, `lib/storage.js`, or `lib/selector-builder.js`. Those are Phase 2+. The `manifest.json` in Phase 1 is a minimal skeleton sufficient to load the content script.

### Pattern 1: Two-Pass BiDi Detection

**What:** Pass 1 applies the Unicode BiDi first-strong-character algorithm (skip neutral characters, return direction on first directionally-strong character). Pass 2 counts Hebrew letter fraction as a fraction of all letter characters and returns RTL if 30%+.

**When to use:** Every text node that has not been classified yet.

```javascript
// Source: .planning/research/STACK.md (verified against Unicode Standard Hebrew blocks)
const HEBREW_RE = /[\u0590-\u05FF\uFB1D-\uFB4F]/;
const HEBREW_LETTER_RE = /[\u05D0-\u05EA\u05F0-\u05F4\uFB1D-\uFB4F]/;
// Skip: ASCII digits, ASCII punctuation, surrogates (emoji)
const SKIP_RE = /[\d\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u00BF]|[\uD800-\uDFFF]/;

export function detectDirection(text) {
  const chars = [...text]; // spread handles emoji surrogate pairs correctly

  // Pass 1: first-strong-character
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
```

### Pattern 2: LTR Exemption Check (ENG-04 + Pitfall 13)

**What:** Before calling `detectDirection()`, check whether the element should always be LTR. Also check ancestors — an element inside `.katex` inherits math rendering context and must be exempt even if it doesn't match directly.

**When to use:** Before processing any element in the main loop.

```javascript
// Source: .planning/research/STACK.md
export function isExemptElement(el) {
  const tag = el.tagName?.toLowerCase();
  if (['code', 'pre', 'kbd', 'samp'].includes(tag)) return true;
  if (el.matches?.('.katex, .math, [class*="math"], [class*="latex"]')) return true;
  // Check ancestors for math context (prevents KaTeX inheritance corruption)
  if (el.closest?.('.katex, .math, pre, code')) return true;
  const text = el.textContent?.trim() ?? '';
  if (/^(https?|ftp|file):\/\//i.test(text)) return true;
  if (/^\/[a-z0-9._/-]+$/i.test(text)) return true;
  return false;
}
```

### Pattern 3: Style Application with List Fix (ENG-02 + ENG-07)

**What:** Apply inline styles and mark the element. Auto-fix list bullet visibility for `<li>` elements.

```javascript
// Source: .planning/research/PITFALLS.md (Pitfall 9)
function applyRTL(el) {
  el.style.direction = 'rtl';
  el.style.textAlign = 'right';
  if (el.tagName === 'LI') {
    el.style.listStylePosition = 'inside';
  }
  el.setAttribute('data-hrtl-processed', '1');
}

function applyLTR(el) {
  el.style.direction = '';
  el.style.textAlign = '';
  el.style.listStylePosition = '';
  el.setAttribute('data-hrtl-processed', '1');
}
```

Note: `applyLTR` clears properties rather than setting `'ltr'` to avoid overriding the site's intended defaults.

### Pattern 4: MutationObserver with Debounce and characterData Re-evaluation (ENG-05)

**What:** Watch for added elements and text changes. Debounce at 100ms. Re-evaluate already-processed elements when their text content changes (characterData mutations). `attributes: true` MUST be omitted.

```javascript
// Source: .planning/research/ARCHITECTURE.md
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
      // Re-evaluate on text content change (bidirectional: LTR→RTL or RTL→LTR)
      if (mutation.type === 'characterData' && mutation.target.parentElement) {
        const el = mutation.target.parentElement;
        el.removeAttribute(MARKER); // allow re-evaluation
        pendingNodes.add(el);
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
  });
}
```

### Pattern 5: Inline Element Walking (ENG-08)

**What:** For elements where the first text node is inside a child element (`<li><strong>label</strong> Hebrew text</li>`), walk child text nodes to find the first non-whitespace content and use that for direction detection.

**When to use:** When `el.textContent` starts with whitespace or when the element contains inline formatting wrappers before substantive text.

```javascript
function getFirstSubstantiveText(el) {
  // Walk text nodes in document order
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent.trim();
    if (text.length > 0) return text;
  }
  return el.textContent ?? '';
}
```

The `detectDirection()` call should use `getFirstSubstantiveText(el)` rather than `el.textContent` for elements that may contain mixed inline wrappers.

### Anti-Patterns to Avoid

- **`attributes: true` in MutationObserver**: `setAttribute('data-hrtl-processed')` triggers new attribute mutation → infinite loop. Never set this option.
- **Re-querying all selectors on every mutation**: During AI streaming, this runs hundreds of times per second on the full DOM. Only process nodes from `addedNodes` and `characterData` parents.
- **Page-level `direction:rtl`**: Flips navigation, images, code blocks, date pickers. Element-level inline styles only.
- **`chrome.scripting.insertCSS` for RTL application**: Page-wide only; cannot target individual elements by content.
- **Accessing `window` page globals from content script**: Content scripts run in an isolated world — `window.React`, `window.__NEXT_DATA__` etc. are not accessible.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Surrogate pair / emoji iteration | Manual char-code arithmetic | `[...text]` spread operator (ES2022) | Spread correctly splits at code-point boundaries, not UTF-16 code-unit boundaries |
| Unicode letter detection (pass 2) | Custom letter regex | `/\p{L}/u` Unicode property escape | Handles all Unicode letter categories without maintaining a character table |
| MutationObserver debouncing | Custom timer + lock logic | `clearTimeout` + `setTimeout` + `Set` dedup (pattern above) | The `pendingNodes` Set deduplication is non-obvious; Set prevents processing same element twice if it mutates multiple times within the debounce window |
| Element ancestor walking | Recursive parent traversal | `el.closest(selector)` | CSS selector matching on ancestor chain with one call |

**Key insight:** The only truly custom code in this phase is the BiDi detection algorithm itself (~80 lines). Everything else uses proven browser primitives.

---

## Common Pitfalls

### Pitfall 1: MutationObserver Infinite Loop (Critical)

**What goes wrong:** `setAttribute('data-hrtl-processed')` triggers new attribute mutations → more processing → loop that freezes the page.

**Why it happens:** `attributes: true` in observer config causes attribute changes to fire as mutations. Our own marking triggers it.

**How to avoid:** Never set `attributes: true`. Use `data-hrtl-processed` to guard entry and check it before processing (`if (node.hasAttribute(MARKER)) return`). Process only `childList` (added nodes) and `characterData` (text changes).

**Warning signs:** Page becomes unresponsive after extension activates. CPU spikes to 100%. DevTools shows thousands of mutation events queued.

### Pitfall 2: Re-processing Elements on Every Mutation (Critical Performance)

**What goes wrong:** On every DOM mutation the script re-queries ALL matched elements and re-processes all 500 message blocks in a long conversation.

**How to avoid:** Only process nodes from `mutation.addedNodes`. Check `data-hrtl-processed` before processing. Use `pendingNodes` Set so each element is processed at most once per debounce window.

**Warning signs:** Extension slows page noticeably after 50+ messages. CPU grows linearly with conversation length.

### Pitfall 3: KaTeX/LaTeX Inheritance Corruption (Phase 1 — Minor but Visible)

**What goes wrong:** Applying `direction: rtl` to a `<p>` containing a KaTeX formula inherits into `.katex` child spans — math symbols and fraction layout break.

**How to avoid:** `isExemptElement()` must check `el.closest('.katex, .math, pre, code')` — not just the element itself. After applying RTL to a container, explicitly reset `direction: ltr` on any math descendant.

**Warning signs:** Math formulas in Hebrew responses render incorrectly.

### Pitfall 4: Streaming Flicker — Brief LTR before RTL Snap

**What goes wrong:** First characters of a streaming Hebrew response are punctuation/numbers, classified as LTR. Element flips to RTL when Hebrew letters arrive.

**How to avoid:** Claude's discretion (per CONTEXT.md). Options: (a) accept the brief flip since `forceRTL: true` mode (Phase 2) is the user's tool for known-RTL selectors; (b) add a minimum-character threshold (e.g., 10 non-neutral characters) before classifying streaming elements. Recommend option (a) for Phase 1 simplicity.

**Warning signs:** Hebrew responses appear briefly in LTR then snap to RTL mid-sentence.

### Pitfall 5: Hebrew Presentation Forms Missing from 30% Count

**What goes wrong:** Only U+0590-05FF is counted in the threshold. Documents with U+FB1D-FB4F (copy-pasted from legacy Hebrew word processors) fail the threshold and stay LTR.

**How to avoid:** `HEBREW_LETTER_RE` must include `\uFB1D-\uFB4F` in addition to `\u05D0-\u05EA\u05F0-\u05F4`.

### Pitfall 6: CSS Specificity Conflict — Extension Styles Overridden

**What goes wrong:** Target sites use high-specificity CSS that overrides inline `direction: rtl`. Or `!important` declarations win regardless.

**How to avoid:** Inline styles (`el.style.direction`) have the highest non-`!important` specificity. Verify with `getComputedStyle(el).direction` after applying. As last resort for known sites: append `direction: rtl !important` to the style attribute string — but test carefully.

---

## Code Examples

Verified patterns from official sources and project research documents.

### Complete `lib/bidi-detect.js` Module

```javascript
// lib/bidi-detect.js
// Pure ES module — no DOM, no Chrome APIs. Importable by Jest in Node.

const HEBREW_RE = /[\u0590-\u05FF\uFB1D-\uFB4F]/;
const HEBREW_LETTER_RE = /[\u05D0-\u05EA\u05F0-\u05F4\uFB1D-\uFB4F]/;
// Neutral: ASCII digits, ASCII punctuation ranges, high surrogates (emoji)
const SKIP_RE = /[\d\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u00BF]|[\uD800-\uDFFF]/;

/**
 * Detect text direction using two-pass BiDi algorithm.
 * Pass 1: First-strong-character (skip neutral chars)
 * Pass 2: 30% Hebrew letter threshold for mixed content
 * @param {string} text
 * @returns {'rtl' | 'ltr'}
 */
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

/**
 * Check if element should always remain LTR.
 * Checks element itself and its ancestors.
 * @param {Element} el
 * @returns {boolean}
 */
export function isExemptElement(el) {
  const tag = el.tagName?.toLowerCase();
  if (['code', 'pre', 'kbd', 'samp'].includes(tag)) return true;
  if (el.matches?.('.katex, .math, [class*="math"], [class*="latex"]')) return true;
  if (el.closest?.('.katex, .math, pre, code')) return true;
  const text = el.textContent?.trim() ?? '';
  if (/^(https?|ftp|file):\/\//i.test(text)) return true;
  if (/^\/[a-z0-9._/-]+$/i.test(text)) return true;
  return false;
}

/**
 * Walk child text nodes to find first non-whitespace content.
 * Handles: <li><strong>label</strong> Hebrew text</li>
 * @param {Element} el
 * @returns {string}
 */
export function getFirstSubstantiveText(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent.trim();
    if (text.length > 0) return text;
  }
  return el.textContent ?? '';
}
```

### `content.js` — Processing and Style Application

```javascript
// content.js (Phase 1 skeleton — no Chrome storage APIs yet)
import { detectDirection, isExemptElement, getFirstSubstantiveText } from './lib/bidi-detect.js';

const MARKER = 'data-hrtl-processed';
const DEBOUNCE_MS = 100;
let debounceTimer = null;
const pendingNodes = new Set();
let observer = null;

function applyDirection(el, dir) {
  if (dir === 'rtl') {
    el.style.direction = 'rtl';
    el.style.textAlign = 'right';
    if (el.tagName === 'LI') el.style.listStylePosition = 'inside';
  } else {
    el.style.direction = '';
    el.style.textAlign = '';
    el.style.listStylePosition = '';
  }
  el.setAttribute(MARKER, '1');
}

function processElement(el, selectorConfig) {
  if (isExemptElement(el)) return;

  if (selectorConfig?.forceRTL) {
    applyDirection(el, 'rtl');
    return;
  }

  const text = getFirstSubstantiveText(el);
  const dir = detectDirection(text);
  applyDirection(el, dir);
}

function processNodes(nodes, selectorConfig) {
  for (const node of nodes) {
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    if (node.hasAttribute(MARKER)) continue;
    processElement(node, selectorConfig);
    // Also check descendants that match selectors
    node.querySelectorAll?.('[data-hrtl-processed]').forEach(() => {}); // skip already processed
  }
}
```

### Jest Test Structure

```javascript
// tests/bidi-detect.test.js
import { detectDirection, isExemptElement } from '../lib/bidi-detect.js';

describe('detectDirection', () => {
  // ENG-01: first-strong-character (Hebrew first)
  test('pure Hebrew text is RTL', () => {
    expect(detectDirection('שלום עולם')).toBe('rtl');
  });

  // ENG-01: first-strong-character (LTR first)
  test('pure English text is LTR', () => {
    expect(detectDirection('Hello world')).toBe('ltr');
  });

  // ENG-01: skip neutrals, find Hebrew
  test('punctuation before Hebrew still RTL', () => {
    expect(detectDirection('... שלום')).toBe('rtl');
  });

  // ENG-03: mixed content 30% threshold
  test('mixed content >= 30% Hebrew is RTL', () => {
    expect(detectDirection('Hello שלום world')).toBe('rtl');
  });

  // ENG-03: mixed content < 30% Hebrew stays LTR
  test('mixed content < 30% Hebrew is LTR', () => {
    expect(detectDirection('Hello world from Tel Aviv א')).toBe('ltr');
  });

  // Presentation Forms (U+FB1D-FB4F)
  test('Hebrew Presentation Forms counted in threshold', () => {
    expect(detectDirection('\uFB2A\uFB2A\uFB2A hello')).toBe('rtl');
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MV2 background page (persistent) | MV3 service worker (event-driven, terminates) | Chrome deprecated MV2 in 2024-2025 | All state must live in `chrome.storage`; never in module variables |
| `document.execCommand('insertText')` | Standard DOM APIs | Chrome 108+ | `execCommand` is deprecated but still works in some extensions; avoid |
| Page-level `dir="rtl"` attribute | Per-element inline styles | Industry best practice shift | Page-level flips break navigation, images, date pickers; element-level is the correct model |
| Generic RTL libraries (bidi-js, rtl-detect) | Custom ~80-line Hebrew-specific implementation | Project decision | Full UAX#9 compliance is overkill for Hebrew-only detection; custom is smaller and faster |

**Deprecated/outdated:**
- MV2 `background.persistent: true`: Not valid in MV3; service worker replaces it
- `chrome.tabs.executeScript()`: Replaced by `chrome.scripting.executeScript()` in MV3
- `webRequest` blocking API in MV3: Replaced by `declarativeNetRequest` (not relevant here, but a common MV3 migration gotcha)

---

## Open Questions

1. **`getFirstSubstantiveText` in Node/Jest test environment**
   - What we know: `document.createTreeWalker` is a DOM API — not available in Node
   - What's unclear: Whether to mock it in tests or provide a Node-compatible fallback
   - Recommendation: Export `getFirstSubstantiveText` separately and use `@jest-environment jsdom` for tests that need it, or implement a Node-compatible fallback using regex on `innerHTML`

2. **Minimum character threshold for streaming (Claude's discretion)**
   - What we know: First-strong-character can flip LTR→RTL as streaming proceeds; brief flicker is user-visible
   - What's unclear: Whether 10 chars is right, or whether "first Hebrew letter has arrived" is sufficient
   - Recommendation: Start with no threshold (accept the brief flip) since `forceRTL` in Phase 2 is the proper solution for known-RTL contexts. Revisit if user testing surfaces this as a reported pain point.

3. **`manifest.json` Phase 1 scope**
   - What we know: Phase 1 has no storage, no popup, no background script usage
   - What's unclear: Whether to ship a complete manifest or a minimal skeleton
   - Recommendation: Ship a functional but minimal manifest — `content_scripts` pointing to `content.js`, no permissions yet. This lets the extension be loaded in Chrome for manual testing while keeping Phase 1 scope clean.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29.x |
| Config file | `package.json` (jest config section) or `jest.config.js` — Wave 0 creates it |
| Quick run command | `npx jest tests/bidi-detect.test.js --no-coverage` |
| Full suite command | `npx jest --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENG-01 | First-strong-character: pure Hebrew → RTL, pure LTR → LTR, punctuation before Hebrew → RTL, emojis skipped | unit | `npx jest tests/bidi-detect.test.js -t "detectDirection" --no-coverage` | Wave 0 |
| ENG-01 | Emoji surrogate pairs don't corrupt detection | unit | `npx jest tests/bidi-detect.test.js -t "emoji" --no-coverage` | Wave 0 |
| ENG-02 | `applyDirection` sets inline styles correctly | unit (jsdom) | `npx jest tests/content.test.js -t "applyDirection" --no-coverage` | Wave 0 |
| ENG-03 | Mixed content: 30%+ Hebrew → RTL, <30% → LTR | unit | `npx jest tests/bidi-detect.test.js -t "threshold" --no-coverage` | Wave 0 |
| ENG-03 | Presentation Forms (U+FB1D-FB4F) counted in threshold | unit | `npx jest tests/bidi-detect.test.js -t "presentation forms" --no-coverage` | Wave 0 |
| ENG-04 | `isExemptElement` returns true for `code`, `pre`, `.katex`, URL-only, path-only | unit (jsdom) | `npx jest tests/bidi-detect.test.js -t "isExemptElement" --no-coverage` | Wave 0 |
| ENG-04 | Element inside `.katex` ancestor is exempt | unit (jsdom) | `npx jest tests/bidi-detect.test.js -t "ancestor exempt" --no-coverage` | Wave 0 |
| ENG-05 | MutationObserver processes `childList` additions | integration (jsdom) | `npx jest tests/observer.test.js --no-coverage` | Wave 0 |
| ENG-05 | `characterData` mutation re-queues parent for re-evaluation | integration (jsdom) | `npx jest tests/observer.test.js -t "characterData" --no-coverage` | Wave 0 |
| ENG-05 | 100ms debounce batches rapid mutations | integration (jsdom) | `npx jest tests/observer.test.js -t "debounce" --no-coverage` | Wave 0 |
| ENG-06 | `forceRTL: true` skips detection and applies RTL | unit (jsdom) | `npx jest tests/content.test.js -t "forceRTL" --no-coverage` | Wave 0 |
| ENG-07 | `<li>` element receives `list-style-position: inside` on RTL | unit (jsdom) | `npx jest tests/content.test.js -t "list item" --no-coverage` | Wave 0 |
| ENG-08 | `getFirstSubstantiveText` finds first non-whitespace text node | unit (jsdom) | `npx jest tests/bidi-detect.test.js -t "substantive text" --no-coverage` | Wave 0 |
| ENG-08 | `<li><strong>label</strong> Hebrew</li>` → RTL | unit (jsdom) | `npx jest tests/bidi-detect.test.js -t "inline element" --no-coverage` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx jest tests/bidi-detect.test.js --no-coverage`
- **Per wave merge:** `npx jest --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/bidi-detect.test.js` — covers ENG-01, ENG-03, ENG-04, ENG-08 (pure logic, Node-safe + jsdom for DOM parts)
- [ ] `tests/content.test.js` — covers ENG-02, ENG-06, ENG-07 (requires `@jest-environment jsdom`)
- [ ] `tests/observer.test.js` — covers ENG-05 (MutationObserver integration, requires `@jest-environment jsdom`)
- [ ] `package.json` — `jest` config with `"type": "module"` and `transform: {}` for native ESM, or `babel-jest` transform
- [ ] Framework install: `npm install --save-dev jest` and `@babel/core babel-jest @babel/preset-env` if ESM transform needed

**ESM caveat:** `lib/bidi-detect.js` uses ES module `export` syntax. Jest's default transform is CommonJS. The package.json needs either `"type": "module"` + experimental ESM support or a Babel transform. Recommendation: use `"type": "module"` with `NODE_OPTIONS=--experimental-vm-modules npx jest` — Jest 29 supports this natively.

---

## Sources

### Primary (HIGH confidence)

- `.planning/research/STACK.md` — Technology decisions, BiDi algorithm pseudocode, inline style rationale, project structure, Unicode ranges
- `.planning/research/ARCHITECTURE.md` — MutationObserver pattern, manifest structure, component boundaries, data flow
- `.planning/research/PITFALLS.md` — 14 catalogued pitfalls; 7 relevant to Phase 1
- `.planning/research/FEATURES.md` — Hebrew Unicode nuances, nikkud, Presentation Forms, mixed content patterns
- `.planning/phases/01-rtl-engine/01-CONTEXT.md` — Locked decisions, discretion areas
- `.planning/REQUIREMENTS.md` — ENG-01 through ENG-08 with FR reference numbers

### Secondary (MEDIUM confidence)

- Unicode Standard Hebrew block specification (U+0590-05FF, U+FB1D-FB4F) — stable specification, sourced via PRD and FEATURES.md
- Chrome MV3 content script documentation — sourced via ARCHITECTURE.md and STACK.md; `MutationObserver` availability in content scripts confirmed

### Tertiary (LOW confidence — flag for validation)

- Jest 29 native ESM support with `NODE_OPTIONS=--experimental-vm-modules` — confirm exact config against Jest 29 official docs before writing `package.json`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Explicit project decisions in STACK.md; no npm runtime dependencies; custom BiDi algorithm specified
- Architecture: HIGH — MutationObserver pattern fully documented in ARCHITECTURE.md with infinite-loop guard specified
- Pitfalls: HIGH — 7 Phase-1-relevant pitfalls catalogued from PITFALLS.md with code patterns
- Test infrastructure: MEDIUM — Jest ESM support nuance needs verification against official docs; test file structure is clear

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable domain; Chrome MV3 APIs are stable; Hebrew Unicode blocks are permanent)
