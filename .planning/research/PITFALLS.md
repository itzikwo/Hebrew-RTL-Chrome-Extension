# Common Pitfalls

**Project:** Hebrew RTL Chrome Extension
**Researched:** 2026-03-22

---

## Critical (Can Cause Rewrites or Severe Bugs)

---

### Pitfall 1: MutationObserver Infinite Loop

**What goes wrong:** The MutationObserver callback modifies the DOM (applies `dir=rtl`, `text-align:right`, or sets `data-hrtl-processed`). These modifications trigger new MutationObserver notifications, which trigger more processing, creating an infinite loop that freezes the page.

**Warning signs:** Page becomes unresponsive after extension activates. CPU spikes to 100%. DevTools shows thousands of mutation events queued.

**Prevention:**
1. Use `data-hrtl-processed` attribute to mark already-processed elements. Check this attribute before processing any element.
2. Disconnect the observer before making DOM changes, then reconnect after — OR use attribute filtering to ignore `data-hrtl-processed` mutations.
3. Process only elements that do NOT already have `data-hrtl-processed="1"`.

```javascript
// Correct pattern
const observer = new MutationObserver((mutations) => {
  const toProcess = [];
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === 1 && !node.hasAttribute('data-hrtl-processed')) {
        toProcess.push(node);
      }
    }
  }
  // Batch process outside observer callback
  processElements(toProcess);
});
```

**Phase:** RTL Engine (Phase 1)

---

### Pitfall 2: Re-processing Already-Corrected Elements (O(n) Performance)

**What goes wrong:** On every DOM mutation, the content script re-queries ALL configured selectors and re-processes all matched elements — including elements that were already processed in prior cycles. On a long ChatGPT conversation with 500 message blocks, every new message triggers re-processing of all 500.

**Warning signs:** Extension slows page noticeably after 50+ messages. Profiling shows content script CPU time growing linearly with conversation length.

**Prevention:**
1. Use `data-hrtl-processed` attribute and skip elements that already have it.
2. In MutationObserver callback, process only `addedNodes` and `characterData` changes — not a full re-query of all selectors.
3. Debounce with 100ms batch window to collapse rapid streaming mutations.

```javascript
let debounceTimer = null;
const pendingNodes = new Set();

const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    m.addedNodes.forEach(n => { if (n.nodeType === 1) pendingNodes.add(n); });
  }
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    processNodes([...pendingNodes]);
    pendingNodes.clear();
  }, 100);
});
```

**Phase:** RTL Engine (Phase 1)

---

### Pitfall 3: Service Worker Termination Losing In-Memory State

**What goes wrong:** MV3 service workers terminate after ~30 seconds of inactivity. Any configuration or state stored in JavaScript variables (not chrome.storage) is lost. The next event finds no config, and the extension silently stops working.

**Warning signs:** Extension stops responding to popup interactions after several minutes of inactivity. Re-opening the popup shows stale or empty state.

**Prevention:**
1. NEVER store critical config in service worker module-level variables.
2. Always read config from `chrome.storage.sync` at the start of every event handler.
3. Cache aggressively in the content script (which persists as long as the tab is open), not in the service worker.

**Phase:** Background Service Worker (Phase 1)

---

### Pitfall 4: CSS Specificity Conflicts — Extension Styles Being Overridden

**What goes wrong:** Target sites (ChatGPT, Claude, Gemini) use high-specificity CSS rules that override `direction: rtl` and `text-align: right` applied via inline styles. Or the site uses `!important` declarations that win regardless.

**Warning signs:** RTL styles appear applied in DevTools but visual rendering shows LTR. Site updates cause previously working RTL to break.

**Prevention:**
1. Apply styles via `el.style.direction = 'rtl'` (inline style) — this has the highest non-`!important` specificity.
2. If sites use `!important`, apply `el.setAttribute('style', el.getAttribute('style') + ' direction: rtl !important;')` as last resort (but test carefully).
3. Test on each target site after any site update — set up periodic QA for the 5 pre-configured sites.
4. Use `getComputedStyle(el).direction` after applying to verify the style actually took effect.

**Phase:** RTL Engine (Phase 1), Pre-configured Sites (Phase 2)

---

### Pitfall 5: Streaming Content Direction Flickering (LTR→RTL Mid-Response)

**What goes wrong:** AI platforms stream responses token by token. The first few characters of a Hebrew response are often punctuation or numbers — which the first-strong-character algorithm classifies as LTR. The element gets styled LTR. When Hebrew letters arrive, the element flips to RTL. Users see a jarring visual flash.

**Warning signs:** Hebrew responses appear briefly in LTR then snap to RTL mid-sentence. Particularly visible on ChatGPT and Claude which stream aggressively.

**Prevention:**
1. For streaming elements, delay direction application until sufficient content has arrived (e.g., wait for 10+ non-neutral characters before classifying).
2. For elements with `forceRTL: true` (per-selector config), bypass detection entirely and apply RTL immediately.
3. Use the `characterData` mutation type to re-evaluate direction as text content grows, but only update if direction changes (avoid thrashing).
4. Consider observing the element's text length and only classifying after a minimum character threshold.

**Phase:** RTL Engine (Phase 1)

---

## Moderate (User-Facing Bugs)

---

### Pitfall 6: DOM Structure Changes Breaking Pre-Configured Selectors

**What goes wrong:** ChatGPT, Claude, Gemini, and Slack deploy frontend updates frequently. Selectors like `.markdown .prose p` become invalid overnight. The extension silently stops applying RTL.

**Warning signs:** Users report extension stopped working after a site update. No errors in DevTools — the selector simply matches zero elements.

**Prevention:**
1. Use multiple fallback selectors per domain (try selector 1, fall back to selector 2 if no matches).
2. Document the DOM structure each selector targets (what element, what role it plays) so updates are faster.
3. Add a `data-hrtl-site-version` mechanism to log which selectors matched, enabling quick diagnosis.
4. Set up periodic selector validation (manually open each site, check that elements are matched).
5. Ship updates within 48 hours of a confirmed break — set this as a SLA.

**Phase:** Pre-configured Sites (Phase 2), ongoing maintenance

---

### Pitfall 7: Element Picker Intercepting Site Event Handlers

**What goes wrong:** The picker overlay intercepts all mouse events on the page to enable hover-highlighting. This breaks hover-dependent UI on target sites (dropdown menus, tooltips, keyboard shortcut hints on ChatGPT). Users cannot dismiss the picker without a keyboard shortcut or button click.

**Warning signs:** After activating picker mode, dropdown menus on the site stop working. Site-level hover effects disappear.

**Prevention:**
1. Use `pointer-events: none` on the overlay host element. Instead, use `document.elementFromPoint(e.clientX, e.clientY)` on the document's mousemove event (not the overlay's).
2. Provide a clear visual indicator of picker mode (banner/badge) with a visible cancel button.
3. Add `Escape` key handler to exit picker mode.
4. Restore all event listeners when picker mode is exited.

**Phase:** Element Picker (Phase 3)

---

### Pitfall 8: chrome.storage.sync Quota Exhaustion

**What goes wrong:** Power users who configure many custom sites hit the 100KB total quota or 8KB per-item limit. Writes fail silently (the Promise rejects, but unhandled rejection goes unnoticed). Config changes are lost.

**Warning signs:** Custom selectors don't persist after page reload. Chrome DevTools > Application > Storage shows sync storage near limit.

**Prevention:**
1. Always handle `chrome.storage.sync.set()` rejection — catch the error and fall back to `chrome.storage.local`.
2. Monitor storage usage: `chrome.storage.sync.getBytesInUse(null)` and warn user when approaching 80KB.
3. Store per-domain configs as separate keys (`domains.chatgpt.com`) not one large object — this spreads data across multiple 8KB slots.
4. Compress selectors: use short IDs, omit default values (contentBased: true is the default, don't store it).

**Phase:** Configuration System (Phase 2)

---

### Pitfall 9: List Item RTL Breaking Bullet/Number Visibility

**What goes wrong:** Applying `direction: rtl` to `<li>` elements causes list bullets/numbers to disappear or render outside the visible area, because the default `list-style-position: outside` places markers on the left while RTL pushes content right.

**Warning signs:** Hebrew bulleted lists show no bullet points. Numbered lists lose their numbers.

**Prevention:**
- Auto-apply `list-style-position: inside` when RTL is applied to any `<li>` element.
- Or set `list-style-position: inside` on the parent `<ul>` or `<ol>` when any child `<li>` becomes RTL.

```javascript
function applyRTL(el) {
  el.style.direction = 'rtl';
  el.style.textAlign = 'right';
  if (el.tagName === 'LI') {
    el.style.listStylePosition = 'inside';
  }
  el.setAttribute('data-hrtl-processed', '1');
}
```

**Phase:** RTL Engine (Phase 1)

---

### Pitfall 10: Shadow DOM Contexts Preventing Selector Matches

**What goes wrong:** Slack uses Shadow DOM for some message components. `document.querySelectorAll('.p-boxy-content')` doesn't pierce Shadow DOM boundaries. The content script's selectors match zero elements because the target elements are inside shadow roots.

**Warning signs:** Extension works on ChatGPT/Claude but not on Slack. DevTools shows elements inside `#shadow-root` nodes.

**Prevention:**
1. Research each pre-configured site's DOM structure before writing selectors — identify Shadow DOM usage.
2. For Shadow DOM elements, use `el.shadowRoot.querySelectorAll()` if the shadow root is `mode: 'open'`.
3. Closed shadow roots cannot be pierced from content scripts — document this as a known limitation for affected sites.
4. Slack's main message area typically uses open components — test thoroughly.

**Phase:** Pre-configured Sites (Phase 2)

---

## Minor (Friction, Easy Fixes)

---

### Pitfall 11: Content Script Isolated World Misunderstanding

**What goes wrong:** The content script and the host page run in separate JavaScript contexts (isolated worlds). Extension code cannot access page-level JavaScript variables, React component state, or Angular services. Developers sometimes try to hook into page JS to detect DOM readiness signals — this silently fails.

**Prevention:** Use only DOM APIs (MutationObserver, querySelectorAll, getComputedStyle) in content scripts. Never attempt `window.React`, `window.__NEXT_DATA__`, or similar page-level variables from a content script.

**Phase:** RTL Engine (Phase 1)

---

### Pitfall 12: Popup Closing Before Picker Mode Activates (Race Condition)

**What goes wrong:** User clicks the magnifying glass in the popup. Popup sends a message to the content script, then closes. If the content script hasn't initialized yet (tab just loaded), the message is sent to a non-existent listener. Picker mode never activates. No error is shown.

**Warning signs:** Clicking picker sometimes does nothing, especially on freshly opened tabs.

**Prevention:**
1. Content script sends a "ready" message to the service worker on initialization. Service worker caches "ready" state per tab.
2. Before popup closes, verify content script is ready (`chrome.tabs.sendMessage` with a ping and await response).
3. If ping fails, show an error in the popup: "Page still loading — try again."

**Phase:** Element Picker (Phase 3), Popup UI (Phase 3)

---

### Pitfall 13: KaTeX/LaTeX Formula Direction Corruption via CSS Inheritance

**What goes wrong:** A `<p>` element containing a KaTeX formula receives `direction: rtl`. The RTL direction inherits into `.katex` child elements (KaTeX uses many nested `<span>`s). Math symbols and formula layout break — operators appear in wrong positions, fractions flip.

**Warning signs:** Mathematical formulas in Hebrew responses render incorrectly after RTL is applied.

**Prevention:**
1. The `isExemptElement()` function must check not just the target element but also its ancestors: if the element is inside a `.katex`, `.math`, `<pre>`, or `<code>` ancestor, skip it.
2. After applying RTL to a container, explicitly set `direction: ltr` on any `.katex`, `.math`, `code`, `pre` descendant.

**Phase:** RTL Engine (Phase 1)

---

### Pitfall 14: Keyboard Shortcut Collision

**What goes wrong:** Ctrl+Shift+H is already used by Slack ("Highlight unread messages"), some browsers for developer tools, or other extensions. The extension's keyboard shortcut silently fails or triggers unintended actions.

**Warning signs:** Pressing Ctrl+Shift+H on Slack opens Slack's highlight panel instead of toggling RTL.

**Prevention:**
1. Chrome extensions keyboard shortcuts are handled at the browser level and should take priority over page-level shortcuts — but test on each pre-configured site.
2. Allow user to customize the shortcut (FR-301) — this is already in the PRD as P1.
3. Document the shortcut behavior and any known collisions in the user guide.

**Phase:** Keyboard Shortcuts (Phase 1), Popup UI (Phase 3)

---

## Summary Table

| Pitfall | Severity | Phase |
|---------|----------|-------|
| MutationObserver infinite loop | Critical | Phase 1 |
| Re-processing elements (O(n) perf) | Critical | Phase 1 |
| Service worker state loss | Critical | Phase 1 |
| CSS specificity conflicts | Critical | Phase 1-2 |
| Streaming content flickering | Critical | Phase 1 |
| DOM structure changes breaking selectors | Moderate | Phase 2+ |
| Element picker breaking site event handlers | Moderate | Phase 3 |
| chrome.storage.sync quota exhaustion | Moderate | Phase 2 |
| List bullet/number visibility | Moderate | Phase 1 |
| Shadow DOM selector mismatch (Slack) | Moderate | Phase 2 |
| Isolated world misunderstanding | Minor | Phase 1 |
| Popup/picker race condition | Minor | Phase 3 |
| KaTeX/LaTeX inheritance corruption | Minor | Phase 1 |
| Keyboard shortcut collision | Minor | Phase 1 |
