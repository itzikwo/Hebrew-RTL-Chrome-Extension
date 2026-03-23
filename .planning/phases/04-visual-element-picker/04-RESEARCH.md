# Phase 4: Visual Element Picker - Research

**Researched:** 2026-03-23
**Domain:** Chrome Extension Content Script — Interactive Element Picker, Shadow DOM Overlay, CSS Selector Generation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- The existing '+' (Add Selector) button in the popup triggers picker mode — replaces the Phase 3 "Coming soon" placeholder
- When picker is activated, the popup closes (standard Chrome behavior — popups close on focus loss)
- While picker is active: cursor changes to crosshair + thin banner at top reads "Click an element to configure Hebrew RTL — Esc to cancel"
- Picker hover outline color: #F59E0B (orange/amber) — distinct from existing blue #2563EB
- Tooltip shows: element tag name, classes, and computed CSS selector
- Selector Builder appears as a fixed panel anchored to the bottom of the viewport
- Selector Builder isolated via Shadow DOM (open mode)
- Layout: ancestor dropdown, class/attribute filter toggles, live selector preview string, Save and Cancel buttons
- Default ancestor selection: the clicked element itself (not a heuristic smart default)
- Dropdown shows up to 10 levels: clicked element + up to 9 ancestors (stops at `<body>`)
- Each dropdown entry shows: `tag.class1.class2` or `tag#id`
- Selecting a different ancestor updates the live preview highlight on the page
- Class filters and attribute filters both included in v1
- Filters are optional — user can save with the raw ancestor selector
- Toggling a filter updates the selector preview string and live page highlight in real time
- Full reset on Cancel (button or Escape): remove overlay, remove picker outlines, remove banner, restore cursor, restore pointer-events
- Cancel from Selector Builder performs full reset — does not leave picker active for another pick
- Escape during picker hover (before clicking) also triggers full reset
- All click events intercepted at document level (capture phase, stopPropagation + preventDefault) while picker is active — except clicks on picker's own overlay
- Use `event.composedPath()` to detect and traverse into open shadow roots
- Closed shadow roots: silent fail — tooltip shows "Cannot pick inside this element"
- On Save: selector written to `chrome.storage.sync` via existing `setDomainConfig`
- Page picker state fully cleaned up on Save (same as cancel)
- When user reopens popup, new selector appears immediately (storage change triggers re-render)

### Claude's Discretion

- Exact orange/amber hex value for picker hover outline (must contrast against both light and dark page backgrounds) — #F59E0B is the named value, exact shade is discretion
- Banner exact styling (height, font size, z-index stacking)
- Shadow DOM overlay CSS (button styles, dropdown, layout — keep minimal and functional)
- How the computed CSS selector is generated (prefer `id` when available, fall back to `tag.classes`, avoid nth-child for stability)
- Whether to debounce the mousemove handler for performance

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PICK-01 | Visual element picker: hover mode with outline + tooltip (tag, classes, computed selector), activated from popup '+' button | Picker state machine pattern in content.js; mousemove + outline via inline style; tooltip injected via Shadow DOM; composedPath() for shadow DOM traversal |
| PICK-02 | Selector Builder overlay: ancestor chain dropdown with live preview highlight; optional class/attribute filters | Shadow DOM fixed-bottom panel; existing HIGHLIGHT_SELECTOR message reuse; ancestor traversal pattern documented |
| PICK-03 | Selector Builder Save writes selector to chrome.storage.sync for domain; Cancel discards; popup list updates immediately | Direct use of setDomainConfig(); storage.onChanged listener already present in content.js drives popup update |
</phase_requirements>

---

## Summary

Phase 4 adds an interactive element picker and Selector Builder overlay to the existing Chrome extension. All new code runs in content.js (a plain script, not an ES module), communicates with popup.js via the established `chrome.tabs.sendMessage` message-passing pattern, and saves selections through the existing `setDomainConfig` API. No new permissions are required — `activeTab`, `tabs`, `scripting`, and `storage` are already declared.

The primary implementation challenge is the picker state machine: a finite set of states (Inactive → Hovering → ElementSelected → Saving → Cleanup) with clean transitions and a guaranteed full-reset path on any exit. The second challenge is CSS selector generation that produces stable, human-readable selectors (id-first, then tag.classes, never nth-child). Both are well-understood problems with established patterns.

The UI surfaces (picker banner and Selector Builder overlay) are fully specified in 04-UI-SPEC.md and isolated via Shadow DOM (open mode). All visual details are locked — the implementer does not need to make design decisions.

**Primary recommendation:** Implement a self-contained picker module that attaches to content.js as a namespace object (e.g. `window._hrtlPicker`), keeps a clear state enum, and exposes activate/deactivate entry points triggered by the existing message handler pattern.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS (no framework) | ES2020+ | All picker logic | Project constraint — zero-build, no bundler, no npm runtime deps |
| Shadow DOM (open mode) | Native browser API | Overlay isolation | Prevents page CSS pollution of picker UI and vice versa |
| `chrome.tabs.sendMessage` | MV3 | popup → content script messaging | Already used for HIGHLIGHT_SELECTOR / CLEAR_HIGHLIGHT |
| `chrome.storage.sync` | MV3 | Persist new selector on Save | Already used by setDomainConfig in lib/storage.js |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `element.composedPath()` | Native DOM API | Shadow DOM traversal during hover | Always — covers open shadow roots (Slack) |
| Jest + jest-environment-jsdom | ^30.3.0 | Unit tests for picker logic | Existing test infrastructure — same setup as popup.test.js |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vanilla CSS in Shadow DOM | CSS Modules / Tailwind | Tailwind requires a build step — incompatible with zero-build constraint |
| Inline style for hover outline | CSS class injection | Inline style is simpler to save/restore; class injection risks class name collisions with host page |
| Shadow DOM (open) | Iframe overlay | Shadow DOM is lighter and integrates with content script DOM access; iframes are heavier and complicate message routing |

**Installation:** No new packages required. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure

The picker implementation follows the established content.js pattern — all code lives in or alongside content.js. No new files are strictly required, but splitting picker logic to a separate file and inlining it (as was done with bidi-detect.js) is the recommended approach for testability:

```
content.js                   # Add PICKER_ACTIVATE / PICKER_DEACTIVATE message handlers
lib/picker.js                # Picker state machine + CSS selector generator (ES module, testable)
                             # Inlined into content.js at build time OR loaded as second content_script
tests/picker.test.js         # Unit tests for generateSelector, buildAncestorChain, picker state
```

Note: Because content.js cannot use ES module imports, the pattern used for bidi-detect (inline the functions) applies here too. `lib/picker.js` is the canonical source; its functions are copy-inlined into content.js at the top, or `lib/picker.js` is added as a second content_scripts entry.

The simpler approach: add `lib/picker.js` as a second entry in `manifest.json` content_scripts array — it loads before content.js and sets `window._hrtlPickerLib = { ... }`, which content.js then calls. This avoids the inline copy problem and is testable independently.

### Pattern 1: Picker State Machine

**What:** A plain object with a state enum governs all picker behavior. Every user action (mousemove, click, keydown, message) calls a state transition function.

**When to use:** Any interactive mode that must guarantee cleanup — state machine prevents orphaned event listeners or outlines.

**Example:**

```javascript
// Source: content.js picker section (to be authored)
const PICKER_STATE = {
  INACTIVE: 'INACTIVE',
  HOVERING: 'HOVERING',
  ELEMENT_SELECTED: 'ELEMENT_SELECTED',
  SAVING: 'SAVING',
};

let _pickerState = PICKER_STATE.INACTIVE;
let _pickerHoveredEl = null;
let _pickerSelectedEl = null;
let _pickerSavedOutline = '';
let _pickerBannerHost = null;
let _pickerOverlayHost = null;

function pickerActivate(hostname) {
  _pickerState = PICKER_STATE.HOVERING;
  _pickerHostname = hostname;
  injectPickerBanner();
  document.body.style.cursor = 'crosshair';
  document.addEventListener('mousemove', onPickerMouseMove, { passive: true });
  document.addEventListener('click', onPickerClick, true); // capture phase
  document.addEventListener('keydown', onPickerKeyDown, true);
}

function pickerReset() {
  _pickerState = PICKER_STATE.INACTIVE;
  removePickerBanner();
  removePickerOverlay();
  removePickerOutline();
  document.body.style.cursor = '';
  document.removeEventListener('mousemove', onPickerMouseMove);
  document.removeEventListener('click', onPickerClick, true);
  document.removeEventListener('keydown', onPickerKeyDown, true);
}
```

### Pattern 2: Shadow DOM Injection

**What:** Inject picker banner and Selector Builder overlay into isolated Shadow DOM containers appended to document.body.

**When to use:** Any injected UI that must not be affected by or affect the host page's CSS.

**Example:**

```javascript
// Source: MDN Shadow DOM + established project pattern (04-CONTEXT.md)
function injectPickerBanner() {
  const host = document.createElement('div');
  host.id = 'hrtl-picker-banner-host';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      .banner {
        position: fixed; top: 0; left: 0; right: 0; height: 40px;
        background: #FFFFFF; border-bottom: 1px solid #E5E7EB;
        border-left: 4px solid #F59E0B;
        display: flex; align-items: center; padding: 0 16px;
        font: 13px/1.4 system-ui, -apple-system, sans-serif;
        color: #111827; z-index: 2147483647;
      }
    </style>
    <div class="banner" role="status" aria-live="polite">
      Click an element to configure Hebrew RTL — Esc to cancel
    </div>
  `;
  _pickerBannerHost = host;
}
```

### Pattern 3: CSS Selector Generation

**What:** Generate a stable, human-readable CSS selector for any clicked element, preferring id, then tag+classes, never nth-child.

**When to use:** On element click to populate the ancestor chain dropdown and preview string.

**Example:**

```javascript
// Source: project decision (04-CONTEXT.md) + standard selector-gen pattern
function generateSelector(el) {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const tag = el.tagName.toLowerCase();
  if (!el.classList.length) return tag;
  const classes = Array.from(el.classList)
    .map(c => `.${CSS.escape(c)}`)
    .join('');
  return `${tag}${classes}`;
}

function buildAncestorChain(el) {
  const chain = [];
  let current = el;
  let depth = 0;
  while (current && current !== document.body && depth < 10) {
    chain.push(current);
    current = current.parentElement;
    depth++;
  }
  return chain; // [clicked el, parent, grandparent, ...]
}

// Combined selector for a given ancestor with optional filters
function buildSelector(ancestor, enabledClasses, enabledAttrs) {
  let sel = generateSelector(ancestor);
  // Re-apply only selected classes (subset of ancestor's classes)
  if (enabledClasses.length) {
    const tag = ancestor.tagName.toLowerCase();
    const id = ancestor.id ? `#${CSS.escape(ancestor.id)}` : '';
    sel = `${tag}${id}${enabledClasses.map(c => `.${CSS.escape(c)}`).join('')}`;
  }
  enabledAttrs.forEach(({ attr, value }) => {
    sel += `[${attr}="${CSS.escape(value)}"]`;
  });
  return sel;
}
```

### Pattern 4: Hover Outline Save/Restore

**What:** Before applying picker outline to hovered element, save existing outline value. Restore on mouseleave or cleanup.

**When to use:** Always — host pages often have their own outline/focus styles.

**Example:**

```javascript
// Source: standard pattern for non-destructive style injection
function applyPickerOutline(el) {
  _pickerHoveredEl = el;
  _pickerSavedOutline = el.style.outline;
  _pickerSavedOutlineOffset = el.style.outlineOffset;
  el.style.outline = '2px solid #F59E0B';
  el.style.outlineOffset = '2px';
}

function removePickerOutline() {
  if (_pickerHoveredEl) {
    _pickerHoveredEl.style.outline = _pickerSavedOutline;
    _pickerHoveredEl.style.outlineOffset = _pickerSavedOutlineOffset;
    _pickerHoveredEl = null;
  }
}
```

### Pattern 5: Click Interception (Capture Phase)

**What:** Register a click listener in capture phase on document during picker-hover state. stopPropagation + preventDefault prevent navigation. The listener checks if the click target is inside the picker's Shadow DOM — if so, let it through.

**When to use:** Picker hover phase only. Remove immediately when element is selected (overlay takes over).

**Example:**

```javascript
function onPickerClick(e) {
  // Allow clicks within our own overlay shadow roots
  const path = e.composedPath();
  if (_pickerBannerHost && path.includes(_pickerBannerHost)) return;
  if (_pickerOverlayHost && path.includes(_pickerOverlayHost)) return;

  e.stopPropagation();
  e.preventDefault();

  if (_pickerState !== PICKER_STATE.HOVERING) return;

  // Remove click suppression — overlay is taking over
  document.removeEventListener('click', onPickerClick, true);

  const target = path[0]; // actual DOM element (resolves through shadow roots)
  pickerOpenOverlay(target);
}
```

### Pattern 6: Shadow DOM Traversal for Hover

**What:** On mousemove, use `event.composedPath()[0]` to get the actual element under the cursor (even inside open shadow roots). Check if target is our own injected UI and skip it.

**Example:**

```javascript
// debounced at ~16ms as per 04-UI-SPEC.md
let _pickerMoveTimer = null;
function onPickerMouseMove(e) {
  clearTimeout(_pickerMoveTimer);
  _pickerMoveTimer = setTimeout(() => {
    const path = e.composedPath();
    let target = path[0];

    // Skip our own injected UI
    if (_pickerBannerHost && path.includes(_pickerBannerHost)) return;
    if (_pickerOverlayHost && path.includes(_pickerOverlayHost)) return;

    // Check for closed shadow root (composedPath()[0] would be the shadow host itself)
    const isClosed = target.shadowRoot === null && target.tagName !== 'HTML'
      && path.some(n => n !== target && n.shadowRoot === null);
    // Simpler heuristic: if target is an element with shadow host but no composedPath entry inside
    // Note: closed shadow root check — if event.composedPath() stops at shadow host, it is closed

    if (_pickerHoveredEl !== target) {
      removePickerOutline();
      applyPickerOutline(target);
      updatePickerTooltip(target, e.clientX, e.clientY);
    }
  }, 16);
}
```

### Pattern 7: Live Highlight via Existing Message System

**What:** Selector Builder dropdown changes trigger `chrome.runtime.sendMessage` from content script back to self (or directly call the existing highlight handler). The content script already has `HIGHLIGHT_SELECTOR` handling.

**When to use:** Ancestor dropdown onChange and filter checkbox onChange.

**Key insight:** The Selector Builder overlay runs inside the content script's Shadow DOM. It can call the existing `document.querySelectorAll` highlight logic directly — no need for a message round-trip. Just call the same function used by the HIGHLIGHT_SELECTOR message handler.

```javascript
// Direct call from within content script (no message passing needed)
function livePreviewSelector(selectorString) {
  // Clear existing highlights
  document.querySelectorAll('[data-hrtl-highlight]').forEach(el => {
    el.style.outline = '';
    el.removeAttribute('data-hrtl-highlight');
  });
  // Apply new preview highlight (blue, same as POP-04)
  try {
    document.querySelectorAll(selectorString).forEach(el => {
      el.style.outline = '2px solid #2563EB';
      el.setAttribute('data-hrtl-highlight', '1');
    });
  } catch (_) { /* invalid selector during construction — ignore */ }
}
```

### Anti-Patterns to Avoid

- **`nth-child` in generated selectors:** Fragile — breaks when page adds sibling elements dynamically. Use class-based or id-based selectors.
- **Attaching picker event listeners without tracking for removal:** Leads to orphaned listeners on cleanup. Always store listener references; always call removeEventListener in pickerReset().
- **Using `event.target` instead of `event.composedPath()[0]`:** `event.target` resolves to the shadow host element, not the actual element inside the shadow root. Always use composedPath().
- **Setting `pointer-events: none` on all page elements:** Makes cleanup complex and can break things. Use capture-phase click interception instead.
- **Rebuilding the entire popup after Save:** Storage onChanged listener in content.js is already wired. Popup will re-render from storage automatically — no special message needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS escaping for selector strings | Custom escaping logic | `CSS.escape()` native API | Handles special characters, spaces, unicode correctly |
| Popup re-render after Save | Custom notification message | Existing `chrome.storage.onChanged` in popup.js | Already implemented — storage write automatically triggers re-render |
| Live highlight during overlay | New highlight system | Existing inline-style highlight pattern from HIGHLIGHT_SELECTOR handler | Reuse avoids code duplication; same visual appearance as POP-04 |
| Cross-shadow-DOM element detection | Custom shadow walker | `event.composedPath()[0]` | Native API, works for all open shadow roots |

**Key insight:** The existing storage → onChanged → popup re-render pipeline means Phase 4 needs zero popup-side changes after Save except replacing the "Coming soon" click handler with the real picker activation message.

---

## Common Pitfalls

### Pitfall 1: Popup Closes Before Message Is Sent

**What goes wrong:** Clicking the '+' button in popup.js fires `chrome.tabs.sendMessage` then `window.close()`. If the message is async and the popup closes before resolution, the message may not be delivered.

**Why it happens:** Chrome popups close immediately when they lose focus. The async sendMessage is not awaited before close.

**How to avoid:** `await chrome.tabs.sendMessage(...)` before `window.close()`, OR use `sendMessage` with a callback and close in the callback. The decision in CONTEXT.md says the popup closes (standard Chrome behavior) — so the pattern is: fire message, then the browser closes the popup on focus loss anyway. The implementation must `await` the send to ensure delivery before close.

**Warning signs:** Picker never activates after clicking '+'. Test by adding a `console.log` in content.js PICKER_ACTIVATE handler.

### Pitfall 2: Multiple Mousemove Listeners Accumulating

**What goes wrong:** If pickerActivate() is called more than once (e.g. user triggers picker, cancels, triggers again), mousemove listeners stack up, causing multiple tooltip updates per movement.

**Why it happens:** `addEventListener` with the same function reference is safe (same reference = deduplicated), but only if the listener function reference is consistent. Arrow functions defined inline in addEventListener create new references each time.

**How to avoid:** Define all listener functions as named module-level functions (not inline arrows). `removeEventListener` requires the same reference used in `addEventListener`.

**Warning signs:** Tooltip flickers or updates multiple times per frame; outline applied to multiple elements simultaneously.

### Pitfall 3: Picker Outline Left on Page After Navigation

**What goes wrong:** User activates picker, hovers over element, then navigates away from popup without completing. Outline remains on element.

**Why it happens:** No cleanup is triggered if the tab navigates while picker is active. Content script is re-loaded on navigation, which clears all state — but if the user just switches tabs and back, state persists.

**How to avoid:** Add a `window` `blur` event listener (or `visibilitychange`) that triggers pickerReset() if picker state is not INACTIVE.

**Warning signs:** Orange outline visible on page after closing popup.

### Pitfall 4: Click on Overlay Shadow DOM Triggers Click Suppression

**What goes wrong:** User clicks Save or Cancel in the Selector Builder overlay. The document-level capture click handler intercepts it (because it runs before the Shadow DOM click handler) and calls preventDefault, breaking the overlay buttons.

**Why it happens:** Capture phase listeners run before target-phase listeners, even for shadow DOM events.

**How to avoid:** In the document capture click handler, check `event.composedPath()` for the overlay host element before suppressing. See Pattern 5 above.

**Warning signs:** Save and Cancel buttons in overlay appear to do nothing.

### Pitfall 5: CSS.escape Not Available in Old Content Script Context

**What goes wrong:** `CSS.escape()` call throws in older Chrome versions or restricted CSP environments.

**Why it happens:** `CSS.escape` was added in Chrome 46 and is universally available in MV3, but worth confirming.

**How to avoid:** Confirm Chrome minimum version target. MV3 requires Chrome 88+ — CSS.escape has been available since Chrome 46. No fallback needed.

**Confidence:** HIGH — confirmed by MDN compatibility table.

### Pitfall 6: z-index Stacking Not Sufficient

**What goes wrong:** Banner or overlay appears behind page modals, sticky headers, or fixed navigation elements that have higher z-index.

**Why it happens:** Even `z-index: 2147483647` (max 32-bit signed int) can be beaten by stacking contexts created by `transform`, `opacity < 1`, or `filter` on parent elements.

**How to avoid:** The Shadow DOM host element itself must not be inside any transformed/filtered ancestor. Appending to `document.body` directly (not to any other element) is the safest approach. CONTEXT.md / UI-SPEC already specifies this.

**Warning signs:** Banner partially obscured by page elements on specific sites.

### Pitfall 7: Selector Builder Blocks Page Scroll

**What goes wrong:** The fixed-bottom overlay panel prevents the user from scrolling to see the element they just clicked, especially on mobile-width viewports.

**Why it happens:** Fixed panels anchored to viewport bottom don't participate in page scroll.

**How to avoid:** Overlay max-height 320px (specified in UI-SPEC) limits coverage. No additional mitigation needed for v1.

---

## Code Examples

Verified patterns from existing codebase and established APIs:

### Integration: popup.js — Replace "Coming Soon" Handler

```javascript
// In popup.js renderPopup(), replace the add-selector-btn handler:
newAddBtn.addEventListener('click', async () => {
  try {
    await chrome.tabs.sendMessage(_tabId, { type: 'PICKER_ACTIVATE', hostname: _hostname });
  } catch (_) { /* content script not present — tab not eligible */ }
  window.close();
});
```

### Integration: content.js — PICKER_ACTIVATE Message Handler

```javascript
// Add to existing chrome.runtime.onMessage.addListener callback:
if (msg.type === 'PICKER_ACTIVATE') {
  pickerActivate(msg.hostname);
  sendResponse({ ok: true });
}
if (msg.type === 'PICKER_DEACTIVATE') {
  pickerReset();
  sendResponse({ ok: true });
}
```

### Integration: content.js — Save Selector

```javascript
// Called from Selector Builder Save button handler (inside Shadow DOM event)
async function pickerSave(selectorString) {
  _pickerState = PICKER_STATE.SAVING;
  const key = `domains.${_pickerHostname}`;
  const data = await chrome.storage.sync.get(key)
    .catch(() => chrome.storage.local.get(key));
  const config = data[key] ?? { enabled: true, selectors: [], loadDelay: 0 };
  config.selectors.push({ selector: selectorString, enabled: true, forceRTL: false });
  await chrome.storage.sync.set({ [key]: config })
    .catch(() => chrome.storage.local.set({ [key]: config }));
  // Popup re-renders automatically via storage.onChanged — no explicit notification needed
  pickerReset();
}
```

Alternative: call `setDomainConfig` directly. Since content.js is a plain script (not a module), it cannot import from lib/storage.js. The inline storage write pattern shown above mirrors lib/storage.js exactly — or lib/storage.js could be added as a second content_scripts entry.

### Ancestor Dropdown Option Label Format

```javascript
// From 04-CONTEXT.md: "tag.class1.class2" or "tag#id"
function ancestorLabel(el) {
  if (el.id) return `${el.tagName.toLowerCase()}#${el.id}`;
  const classes = Array.from(el.classList).join('.');
  return classes ? `${el.tagName.toLowerCase()}.${classes}` : el.tagName.toLowerCase();
}
```

### Debounced Mousemove (16ms)

```javascript
// From 04-UI-SPEC.md: debounce at 16ms (one animation frame)
let _pickerMoveTimer = null;
function onPickerMouseMove(e) {
  clearTimeout(_pickerMoveTimer);
  _pickerMoveTimer = setTimeout(() => { /* handle */ }, 16);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `document.elementFromPoint(x, y)` for hover targeting | `event.composedPath()[0]` | ~Chrome 53 (composedPath), 2016 | composedPath works through shadow DOM; elementFromPoint does not |
| Manual CSS escaping | `CSS.escape()` | Chrome 46, 2015 | Built-in, correct handling of all edge cases |
| `event.target` for shadow DOM events | `event.composedPath()` | Shadow DOM v1, Chrome 53 | composedPath exposes the full event path through shadow roots |
| `z-index: 9999` for overlays | `z-index: 2147483647` | Established practice | Max 32-bit signed int — highest possible without stacking context tricks |

**Deprecated/outdated:**
- `event.path` (Chrome-only non-standard): replaced by `event.composedPath()` which is the standard.
- `document.registerElement`: replaced by `customElements.define`. Not relevant here — picker uses plain DOM.

---

## Open Questions

1. **lib/picker.js loading strategy — inline vs. second content_script entry**
   - What we know: content.js cannot use ES module imports. bidi-detect.js was inlined manually.
   - What's unclear: whether adding lib/picker.js as a second `content_scripts` entry (loaded before content.js, setting a global) is cleaner than copy-inlining ~150 lines.
   - Recommendation: Use second content_scripts entry for testability. lib/picker.js exports a `window._hrtlPicker` namespace. Jest can import lib/picker.js directly as an ES module. This avoids the "two copies" maintenance burden.

2. **Closed shadow root detection heuristic reliability**
   - What we know: `event.composedPath()` for a closed shadow root stops at the host element (does not include internals). The event's `target` is also the host.
   - What's unclear: whether `composedPath()[0] === host` is sufficient to distinguish a closed shadow root from a leaf element with no shadow root at all.
   - Recommendation: check `composedPath()[0].shadowRoot === null && composedPath().length === 1` is NOT reliable. Better: if `target.shadowRoot === null` and the element has known shadow-producing tags (like Slack's message-list components), treat as potentially closed. For v1, the tooltip "Cannot pick inside this element" is shown when the clicked element IS the shadow host — simpler to detect at click time than at hover time.

3. **Storage write from content.js without lib/storage.js import**
   - What we know: content.js is a plain script. lib/storage.js is an ES module only importable by popup.js.
   - What's unclear: whether adding lib/storage.js as a third content_scripts entry is safe (it uses `export` syntax which content scripts do not support).
   - Recommendation: inline the 10-line write pattern (sync-with-local-fallback) directly in the picker's pickerSave() function. Do not add lib/storage.js to content_scripts — it will throw a SyntaxError due to `export` statements.

---

## Validation Architecture

> `nyquist_validation: true` in .planning/config.json — section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 + jest-environment-jsdom 30.3.0 |
| Config file | package.json `jest` key — `testMatch: ["**/tests/**/*.test.js"]` |
| Quick run command | `NODE_OPTIONS=--experimental-vm-modules npx jest tests/picker.test.js` |
| Full suite command | `NODE_OPTIONS=--experimental-vm-modules npx jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PICK-01 | `generateSelector()` returns id-based selector when id present | unit | `npx jest tests/picker.test.js -t "generateSelector"` | Wave 0 |
| PICK-01 | `generateSelector()` returns `tag.class` when no id | unit | `npx jest tests/picker.test.js -t "generateSelector"` | Wave 0 |
| PICK-01 | `buildAncestorChain()` returns up to 10 levels, stops at body | unit | `npx jest tests/picker.test.js -t "buildAncestorChain"` | Wave 0 |
| PICK-01 | `pickerActivate()` sets state to HOVERING, adds mousemove/click/keydown listeners | unit (jsdom) | `npx jest tests/picker.test.js -t "pickerActivate"` | Wave 0 |
| PICK-01 | `pickerReset()` restores cursor, removes all listeners, removes banner and outline | unit (jsdom) | `npx jest tests/picker.test.js -t "pickerReset"` | Wave 0 |
| PICK-01 | Escape keydown triggers pickerReset from HOVERING state | unit (jsdom) | `npx jest tests/picker.test.js -t "Escape"` | Wave 0 |
| PICK-02 | `buildSelector()` with selected ancestor + enabled classes produces correct selector string | unit | `npx jest tests/picker.test.js -t "buildSelector"` | Wave 0 |
| PICK-02 | Ancestor chain dropdown has correct entries (tag.class format) | unit (jsdom) | `npx jest tests/picker.test.js -t "ancestorLabel"` | Wave 0 |
| PICK-02 | Changing ancestor dropdown calls livePreviewSelector with new selector | unit (jsdom) | `npx jest tests/picker.test.js -t "livePreview"` | Wave 0 |
| PICK-02 | Cancel button triggers pickerReset | unit (jsdom) | `npx jest tests/picker.test.js -t "Cancel"` | Wave 0 |
| PICK-03 | pickerSave() appends selector to existing config.selectors array | unit (chrome mock) | `npx jest tests/picker.test.js -t "pickerSave"` | Wave 0 |
| PICK-03 | pickerSave() calls chrome.storage.sync.set with correct key | unit (chrome mock) | `npx jest tests/picker.test.js -t "pickerSave"` | Wave 0 |
| PICK-03 | pickerSave() falls back to local storage on sync failure | unit (chrome mock) | `npx jest tests/picker.test.js -t "pickerSave.*fallback"` | Wave 0 |
| PICK-03 | After Save, pickerReset() is called (state returns to INACTIVE) | unit (jsdom) | `npx jest tests/picker.test.js -t "after save"` | Wave 0 |

### Sampling Rate

- **Per task commit:** `NODE_OPTIONS=--experimental-vm-modules npx jest tests/picker.test.js`
- **Per wave merge:** `NODE_OPTIONS=--experimental-vm-modules npx jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/picker.test.js` — covers all PICK-01, PICK-02, PICK-03 behaviors listed above
- [ ] `lib/picker.js` — picker logic module (generateSelector, buildAncestorChain, buildSelector, ancestorLabel, state machine) — must be authorable as ES module for Jest import

*(If lib/picker.js is delivered as a second content_scripts entry setting `window._hrtlPicker`, the Jest test imports `lib/picker.js` directly as an ES module — consistent with how popup.test.js imports popup.js.)*

---

## Sources

### Primary (HIGH confidence)

- MDN Web Docs — Shadow DOM, `attachShadow({ mode: 'open' })`, `event.composedPath()` — verified behavior
- MDN Web Docs — `CSS.escape()` — browser support Chrome 46+
- Existing codebase — content.js, popup.js, lib/storage.js, manifest.json — direct inspection
- 04-CONTEXT.md + 04-UI-SPEC.md — all visual/interaction decisions locked and verified

### Secondary (MEDIUM confidence)

- Chrome Extensions MV3 documentation — content_scripts multiple entries, message passing — confirmed by existing Phase 2/3 implementation patterns in codebase
- Chrome Extensions — `chrome.tabs.sendMessage` async behavior with popup close — based on established pattern in popup.js `window.unload` handler

### Tertiary (LOW confidence)

- Closed shadow root detection heuristic via composedPath length — behavior documented in spec but edge cases not exhaustively tested in this project context

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new libraries; all APIs native or already in use
- Architecture: HIGH — state machine pattern is directly derived from requirements and existing codebase patterns
- Pitfalls: HIGH for items 1-5 (well-understood MV3 + Shadow DOM pitfalls); MEDIUM for item 6 (z-index stacking context edge cases site-specific)
- Selector generation: HIGH — CSS.escape is native; id/class-first strategy is well-established

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable APIs — no fast-moving dependencies)
