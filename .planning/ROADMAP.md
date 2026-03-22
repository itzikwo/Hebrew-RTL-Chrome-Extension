# Roadmap: Hebrew RTL Chrome Extension

## Overview

The extension is built in four phases. Phase 1 establishes the RTL detection and application engine — the core value and the hardest technical problem. Phase 2 wires the engine into a working Chrome extension with storage, pre-configured sites, and keyboard shortcuts — making it installable and functional for Hebrew users on the five target platforms. Phase 3 adds the popup UI and configuration actions that let users control the extension without touching code. Phase 4 delivers the visual element picker, the primary differentiator that lets non-technical users configure any site without DevTools.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: RTL Engine** - Hebrew detection and per-element RTL application with all edge-case handling
- [ ] **Phase 2: Extension Wiring and Pre-configured Sites** - Storage schema, five pre-configured platforms, keyboard shortcut, and background service worker
- [ ] **Phase 3: Popup UI and Config Actions** - Full popup control surface, per-selector controls, and JSON export
- [ ] **Phase 4: Visual Element Picker** - Interactive element picker and Selector Builder overlay for no-DevTools site configuration

## Phase Details

### Phase 1: RTL Engine
**Goal**: Hebrew content is detected and corrected at element level across static and streamed pages
**Depends on**: Nothing (first phase)
**Requirements**: ENG-01, ENG-02, ENG-03, ENG-04, ENG-05, ENG-06, ENG-07, ENG-08
**Success Criteria** (what must be TRUE):
  1. A paragraph containing Hebrew text on any web page receives `direction:rtl` and `text-align:right` as inline styles without affecting the page's navigation or images
  2. A sentence starting with English but containing 30%+ Hebrew characters is classified RTL; a sentence with 10% Hebrew is left as LTR
  3. Code blocks, `<pre>` elements, KaTeX formulas, URLs, and file paths inside Hebrew-heavy pages remain LTR
  4. As ChatGPT or Claude streams a Hebrew response token-by-token, direction is applied within 100ms of each mutation without causing infinite observer loops
  5. RTL list items display their bullets/numbers without them disappearing behind the text
**Plans**: 4 plans

Plans:
- [ ] 01-00-PLAN.md — Jest test scaffold and project setup (package.json, three test stub files)
- [ ] 01-01-PLAN.md — BiDi detection engine: lib/bidi-detect.js (detectDirection, isExemptElement, getFirstSubstantiveText)
- [ ] 01-02-PLAN.md — Per-element RTL application: content.js style application layer (applyDirection, processElement, forced RTL, list bullet fix)
- [ ] 01-03-PLAN.md — MutationObserver integration: startObserver with 100ms debounce and characterData re-evaluation; manifest.json skeleton

### Phase 2: Extension Wiring and Pre-configured Sites
**Goal**: The extension installs from source and automatically corrects Hebrew on ChatGPT, Claude.ai, Gemini, NotebookLM, and Slack
**Depends on**: Phase 1
**Requirements**: CFG-01, CFG-02, CFG-03, CFG-04, KBD-01, KBD-02
**Success Criteria** (what must be TRUE):
  1. After loading the extension unpacked, Hebrew messages on ChatGPT and Claude.ai are corrected automatically without any user configuration
  2. Hebrew content on Gemini, NotebookLM, and Slack is also corrected by the pre-loaded selectors
  3. Configuration changes (selector enable/disable, domain toggle) persist across browser restarts and across the user's Chrome profiles on other devices
  4. Pressing Ctrl+Shift+H (or MacCtrl+Shift+H) on any page toggles Hebrew correction for that domain on/off instantly
  5. On a domain with many selectors, storage falls back to `chrome.storage.local` automatically before hitting the sync quota
**Plans**: 5 plans

Plans:
- [ ] 02-00-PLAN.md — Wave 0 test scaffold: Chrome API mocks, test stubs for storage, background, and default-sites
- [ ] 02-01-PLAN.md — Manifest V3 expansion: permissions, background service worker declaration, commands block, action block
- [ ] 02-02-PLAN.md — Storage abstraction layer: lib/storage.js with sync-to-local fallback, per-domain key schema
- [ ] 02-03-PLAN.md — Background service worker: install seeding, badge updates, keyboard shortcut routing
- [ ] 02-04-PLAN.md — Pre-configured selectors and content.js wiring: default-sites config, storage integration, message handling

### Phase 3: Popup UI and Config Actions
**Goal**: Users can view and control their Hebrew correction settings for any domain through a popup without opening DevTools
**Depends on**: Phase 2
**Requirements**: POP-01, POP-02, POP-03, POP-04, POP-05, CFG-05
**Success Criteria** (what must be TRUE):
  1. Opening the popup on any domain shows the domain name and a master toggle that immediately enables or disables Hebrew correction for that domain
  2. The popup lists all configured selectors with individual enable/disable checkboxes and delete buttons that take effect without a page reload
  3. Hovering over a selector row in the popup causes matching elements on the live page to highlight in real time
  4. The Actions menu lets the user download their entire configuration as a JSON file
  5. Clicking the Add Selector (+) button creates a new empty selector row ready for the user to activate the element picker
**Plans**: TBD

Plans:
- [ ] 03-01: Popup shell (domain header, master toggle, selector list with checkboxes and delete buttons)
- [ ] 03-02: Real-time hover highlights (popup<>content script messaging for selector preview)
- [ ] 03-03: Actions menu (Export Config as JSON, Delete All Selectors, User Guide link, keyboard shortcut settings link)

### Phase 4: Visual Element Picker
**Goal**: A non-technical user can configure Hebrew correction for any website by clicking elements on the page — no DevTools required
**Depends on**: Phase 3
**Requirements**: PICK-01, PICK-02, PICK-03
**Success Criteria** (what must be TRUE):
  1. Clicking the picker icon in the popup activates hover mode: elements under the cursor show an outline and a tooltip with tag name, classes, and the computed CSS selector
  2. Clicking an element opens the Selector Builder overlay showing the ancestor chain; selecting a different ancestor level updates the live highlight on the page to preview which elements will be targeted
  3. Clicking Save in the Selector Builder closes the overlay, adds the new selector to storage for the current domain, and the popup list updates immediately
  4. Clicking Cancel or pressing Escape exits picker mode without saving anything, and the page returns to its normal state
**Plans**: TBD

Plans:
- [ ] 04-01: Element picker state machine (activation, hover outline + tooltip, Shadow DOM isolation for overlay)
- [ ] 04-02: Selector Builder overlay (ancestor chain dropdown, class/attribute filters, live preview highlight, Save/Cancel)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. RTL Engine | 4/4 | Complete | 2026-03-22 |
| 2. Extension Wiring and Pre-configured Sites | 0/5 | Planning complete | - |
| 3. Popup UI and Config Actions | 0/3 | Not started | - |
| 4. Visual Element Picker | 0/2 | Not started | - |
