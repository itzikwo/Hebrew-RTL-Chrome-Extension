# Phase 4: Visual Element Picker - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the interactive element picker and Selector Builder overlay that let a non-technical user configure Hebrew correction for any website by clicking page elements — no DevTools required. Activates via the popup's '+' button, runs entirely in the content script, and saves selectors to chrome.storage.sync.

Out of scope: picker per existing selector row (modify/re-pick), import configuration, any v2+ features.

</domain>

<decisions>
## Implementation Decisions

### Picker Activation

- The existing **'+' (Add Selector) button** in the popup triggers picker mode — replaces the Phase 3 "Coming soon" placeholder with real behavior
- When picker is activated, the **popup closes** (standard Chrome extension behavior — popups close on focus loss anyway)
- While picker is active: **cursor changes to crosshair** + a **thin banner at the top of the page** reads: _"Click an element to configure Hebrew RTL — Esc to cancel"_

### Hover Outline During Picker

- Picker hover outline uses a **different color from the existing blue selector highlights** (POP-04 uses `#2563EB`)
- Use orange/amber (e.g. `#F59E0B`) so users can distinguish "I am picking" from "this selector is highlighted"
- Tooltip shows: element tag name, classes, and the computed CSS selector

### Selector Builder Overlay

- Appears as a **fixed panel anchored to the bottom of the viewport** — does not obscure the element being configured
- Isolated via **Shadow DOM** (open mode) — prevents page CSS from affecting the overlay and overlay styles from leaking to the page
- Layout: ancestor dropdown, class/attribute filter toggles, live selector preview string, Save and Cancel buttons

### Ancestor Chain

- Default selection: **the clicked element itself** (not a heuristic "smart" default)
- Dropdown shows up to **10 levels**: clicked element + up to 9 ancestors (stops at `<body>`)
- Each dropdown entry shows: `tag.class1.class2` or `tag#id` — enough to identify it visually
- Selecting a different ancestor updates the **live preview highlight** on the page to show which elements will be targeted

### Class & Attribute Filters (v1)

- Both **class filters** (checkbox list of ancestor's classes) and **attribute filters** (e.g. `[data-role="message"]`) are included in v1
- Filters are optional — user can save with the raw ancestor selector if they don't need filters
- Toggling a filter updates the selector preview string and live page highlight in real time

### Exit & Cleanup

- **Full reset** on Cancel (button or Escape key): remove overlay, remove picker hover outlines, remove top banner, restore cursor to default, restore pointer-events on all page elements. Page returns to exactly its pre-picker state.
- **Cancel from Selector Builder** (before saving): full reset — does not leave picker active for another pick
- **During picker hover** (before clicking an element): Escape also triggers full reset

### Click Event Suppression

- While picker is active, **all click events on the page are intercepted** at the document level (capture phase, `stopPropagation` + `preventDefault`) — except clicks on the picker's own overlay
- Prevents accidentally navigating away via links or triggering page buttons while hovering to pick

### Shadow DOM Handling

- Use `event.composedPath()` to detect and traverse into **open shadow roots** (covers Slack)
- **Closed shadow roots**: silent fail — tooltip shows "Cannot pick inside this element"
- Picker still works normally on elements outside shadow roots on the same page

### After Save

- Selector Builder saves the generated selector to `chrome.storage.sync` for the current domain via the existing storage API (`setDomainConfig`)
- Page picker state is fully cleaned up (same as cancel)
- When the user reopens the popup, the new selector appears in the list immediately (storage change triggers re-render)

### Claude's Discretion

- Exact orange/amber hex value for picker hover outline (must contrast against both light and dark page backgrounds)
- Banner exact styling (height, font size, z-index stacking)
- Shadow DOM overlay CSS (button styles, dropdown, layout — keep minimal and functional)
- How the computed CSS selector is generated (prefer `id` when available, fall back to `tag.classes`, avoid nth-child for stability)
- Whether to debounce the mousemove handler for performance

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — PICK-01, PICK-02, PICK-03: full requirements for picker hover mode, Selector Builder overlay, and Save/Cancel behavior; also POP-02/POP-03 ('+' button now triggers real picker, not placeholder)

### Prior phase decisions
- `.planning/phases/03-popup-ui-and-config-actions/03-CONTEXT.md` — hover highlight pattern (POP-04), blue `#2563EB`, `chrome.tabs.sendMessage` for page↔popup messaging, existing message types (`CLEAR_HIGHLIGHT`, `highlight`)
- `.planning/phases/01-rtl-engine/01-CONTEXT.md` — zero-build vanilla JS, no framework, no bundler; applies to picker overlay too

### Existing code (read before implementing)
- `popup/popup.js` — '+' button placeholder is wired here; picker activation replaces this. Message-passing patterns to content.js.
- `content.js` — existing message handler, highlight implementation, MARKER pattern (`data-hrtl-processed`), MutationObserver; picker code will be added here or injected alongside
- `lib/storage.js` — `getDomainConfig`, `setDomainConfig`: picker uses `setDomainConfig` to save new selectors
- `manifest.json` — permissions (`activeTab`, `tabs`, `scripting`) already present; confirm no additional permissions needed

### PRD Reference
- `Hebrew-RTL-Chrome-Extension-PRD.md` §6 — FR-102 (element picker hover mode), FR-103 (Selector Builder overlay, ancestor chain, Save/Cancel)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/storage.js` — `setDomainConfig(hostname, config)`: picker calls this to append the new selector to the existing config on Save
- `content.js` message handler — already handles `CLEAR_HIGHLIGHT` and `highlight` messages from popup; picker messages should follow the same pattern (e.g. `PICKER_ACTIVATE`, `PICKER_DEACTIVATE`)
- `popup/popup.js` — `_tabId` module-level state: used to send messages to the active tab; picker activation sends a message via `chrome.tabs.sendMessage(_tabId, { type: 'PICKER_ACTIVATE', hostname })`

### Established Patterns
- Zero-build vanilla JS: no bundler, no framework, no npm runtime dependencies
- content.js is a **plain script** (not a module) — picker code must live in content.js or be injected via `chrome.scripting.executeScript`
- popup.js is an ES module — can import from `lib/storage.js`, `lib/bidi-detect.js`, etc.
- Message passing: popup → content script via `chrome.tabs.sendMessage`; content script → background via `chrome.runtime.sendMessage`
- Shadow DOM for injected UI (open mode) — established in research, now confirmed for picker overlay

### Integration Points
- `popup/popup.js`: replace "Coming soon" click handler with `chrome.tabs.sendMessage(_tabId, { type: 'PICKER_ACTIVATE', hostname })` then `window.close()`
- `content.js`: add `PICKER_ACTIVATE` and `PICKER_DEACTIVATE` message handlers; picker state machine lives here
- `manifest.json`: likely no new permissions needed (`activeTab` + `scripting` already present)
- After Save: content script calls `chrome.runtime.sendMessage` or directly calls storage API to persist the new selector — check if content script has direct storage access (it should, given `storage` permission in manifest)

</code_context>

<specifics>
## Specific Ideas

- Banner text: _"Click an element to configure Hebrew RTL — Esc to cancel"_ — exact wording
- Picker hover color: orange/amber (distinct from the existing blue `#2563EB` selector highlights)
- Selector Builder is a fixed bottom panel — same visual weight as a browser devtools bottom panel
- Ancestor dropdown entries: show `tag.class1.class2` or `tag#id` — enough to visually identify each level
- Closed shadow root tooltip: _"Cannot pick inside this element"_

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-visual-element-picker*
*Context gathered: 2026-03-23*
