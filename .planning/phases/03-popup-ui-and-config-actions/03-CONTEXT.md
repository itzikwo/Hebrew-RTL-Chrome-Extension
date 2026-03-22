# Phase 3: Popup UI and Config Actions - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the extension popup UI (`popup.html` + `popup.js`) that lets users view and control Hebrew RTL correction settings for the current domain — without opening DevTools. Delivers: domain header with master toggle, selector list with per-row controls, real-time hover highlights, an Actions menu (export/delete-all/links), and an Add Selector placeholder. Visual element picker (PICK-01 through PICK-03) is Phase 4 — this phase wires the picker trigger button as a placeholder only.

</domain>

<decisions>
## Implementation Decisions

### Popup visual design
- Width: ~280px, auto height (no fixed max-height — scrollable list if needed)
- Color scheme: light only, system default — no dark mode for v1
- Selector rows: full row always visible — selector text (truncated with ellipsis if needed) + enable/disable checkbox + delete button; no hover-reveal controls
- Selector text is read-only in the popup — no inline editing. The picker (Phase 4) is the intended UX for adding selectors
- Actions menu: single dropdown button labeled **"Actions ▾"** containing: Export Config, Delete All Selectors, User Guide, Keyboard Shortcuts
- "User Guide" opens `chrome://extensions/shortcuts` in a new tab (routes user directly to Chrome's built-in shortcut editor)
- "Keyboard Shortcuts" also opens `chrome://extensions/shortcuts` (same destination — or omit as duplicate; Claude's discretion)
- Badge already wired in Phase 2 via `updateBadgeForActiveTab` — popup just triggers a storage write and the existing `chrome.storage.onChanged` listener will refresh the badge automatically

### Master toggle behavior
- When master toggle is OFF: toggle is visually in the off state, selector list remains visible but visually grayed out (opacity reduced, interaction disabled)
- Toggle changes take effect immediately (write to storage → content script reacts via storage listener already wired in Phase 2)

### Add Selector button
- The `+` / "Add Selector" button is present and visible
- Clicking it shows a brief inline message: **"Coming soon — element picker in next update"**
- No modal, no navigation — just a placeholder message in the popup (Phase 4 will replace this behavior)

### Destructive action safeguards
- **Delete All Selectors**: requires a confirmation dialog with text: _"Delete all selectors for [domain]? This cannot be undone."_ Two buttons: Confirm and Cancel
- After Delete All is confirmed: popup stays open and renders the empty state (selector list area shows the + button and a prompt)
- **Delete single selector row**: immediate on click — no confirmation required

### Hover highlight style (POP-04)
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — POP-01 through POP-05 (popup UI requirements), CFG-05 (export config as JSON)

### Existing storage API
- `lib/storage.js` — `getDomainConfig`, `setDomainConfig`, `getAllConfigs`; popup imports these directly (popup.js runs as an extension page with full chrome API access — ES module imports are fine)

### Existing background handlers
- `lib/background-handlers.js` — `updateBadgeForActiveTab`; badge refresh is automatic via `chrome.storage.onChanged` already registered in background.js — popup does not need to call this directly

### Manifest
- `manifest.json` — needs `"default_popup": "popup/popup.html"` (or `popup.html` at root) added to the `"action"` block; check current state before editing

### Prior phase decisions
- `.planning/phases/01-rtl-engine/01-CONTEXT.md` — zero-build vanilla JS, no framework, no bundler; applies to popup too

### PRD Reference
- `Hebrew-RTL-Chrome-Extension-PRD.md` §6 — Popup UI functional requirements (FR-200 through FR-204), §5.4 — Export config spec (FR-108)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/storage.js` — `getDomainConfig(hostname)`, `setDomainConfig(hostname, config)`, `getAllConfigs()`: popup.js can import these directly using ES module syntax (popup is an extension page, not a content script)
- `lib/background-handlers.js` — `updateBadgeForActiveTab()`: badge auto-refreshes via storage.onChanged; popup need not call this
- `background.js` message routing pattern — reference for how `chrome.tabs.sendMessage` is used to reach the content script (toggle-rtl command flow)

### Established Patterns
- Zero-build vanilla JS: no bundler, no framework, no npm runtime dependencies
- ES2022+ features available (Chrome 88+)
- Content script (`content.js`) is a **plain script** (not a module) — popup can send messages to it via `chrome.tabs.sendMessage`, but cannot import from it
- `popup.js` is an extension page → can use `import`/`export` ES modules normally
- Config shape per domain: `{ enabled: boolean, loadDelay: number, selectors: [{ selector: string, enabled: boolean, forceRTL: boolean }] }` — read `lib/storage.js` to confirm exact schema

### Integration Points
- `popup.js` → `chrome.tabs.query({ active: true, currentWindow: true })` to get current tab hostname
- `popup.js` → `lib/storage.js` for all storage reads/writes
- `popup.js` → `chrome.tabs.sendMessage(tabId, { type: 'highlight', selector })` and `{ type: 'clearHighlight' }` for real-time hover effects
- `manifest.json` → add `"default_popup": "popup/popup.html"` to the `"action"` object

</code_context>

<specifics>
## Specific Ideas

- The popup Add Selector button placeholder message should be brief and friendly: "Coming soon — element picker in next update"
- The hover highlight color `#2563EB` (Tailwind blue-600) is a concrete reference — Claude may use any close blue as long as it reads clearly against both white and dark page backgrounds
- "Delete all selectors for [domain]? This cannot be undone." is the exact confirmation dialog text

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-popup-ui-and-config-actions*
*Context gathered: 2026-03-22*
