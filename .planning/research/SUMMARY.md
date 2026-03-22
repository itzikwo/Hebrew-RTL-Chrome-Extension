# Project Research Summary

**Project:** Hebrew RTL Chrome Extension
**Domain:** Chrome browser extension — text direction correction for Hebrew-language users on AI platforms
**Researched:** 2026-03-22
**Confidence:** HIGH

## Executive Summary

This is a Chrome Manifest V3 content script extension that corrects right-to-left (RTL) text rendering for Hebrew speakers using AI chat platforms (ChatGPT, Claude.ai, Gemini, NotebookLM, Slack). The project's defining constraint — mandated by PROJECT.md — is vanilla JavaScript with zero runtime npm dependencies. This is the correct call: content scripts execute inside every matched page, making bundle size and framework overhead real costs. The recommended approach is zero-build (no bundler), a custom ~80-line Hebrew BiDi detection engine (first-strong-character + 30% mixed-content threshold), per-element inline style injection, and `chrome.storage.sync` as the reactive bus for cross-component configuration.

The core technical challenge is handling AI streaming responses correctly. AI platforms like ChatGPT and Claude deliver content token-by-token, so direction detection must run reactively via MutationObserver with 100ms debouncing — not just on page load. Critically, `MutationObserver` is only available in content scripts, not in MV3 service workers, which means all DOM processing lives in `content.js`. The service worker is stateless by design (it terminates after ~30 seconds of inactivity) and must read from `chrome.storage` on every invocation.

The main risks are performance-related: an infinite MutationObserver loop (if the observer fires on its own DOM writes), O(n) re-processing of all elements on every mutation, and streaming content flickering (LTR-to-RTL visual flash as Hebrew text arrives). All three are well-understood and have documented prevention patterns. Secondary risks are selector fragility — the pre-configured site selectors break whenever ChatGPT, Claude, or Gemini ship frontend updates — requiring a 48-hour SLA for selector maintenance as an ongoing operational commitment.

## Key Findings

### Recommended Stack

The stack is minimal by design and by constraint. No bundler, no framework, no runtime npm packages. The extension ships as plain JavaScript files loaded directly by Chrome. ESLint, web-ext, Jest, and Playwright are dev-only tools. This eliminates Content Security Policy complications from bundler runtime helpers, keeps source auditable for Chrome Web Store review, and removes framework overhead from a performance-critical code path.

**Core technologies:**
- Chrome Manifest V3 (current): Extension platform — required for Web Store submission; MV2 is deprecated
- Vanilla JavaScript (ES2022+): Content script and all logic — no framework tax; content scripts run inside every matched page
- Custom BiDi detection (~80 lines): Hebrew-specific Unicode detection — no npm library needed; bidi-js and unicode-bidi are 15-30KB overkill
- `chrome.storage.sync`: Configuration persistence and cross-component reactive bus — 100KB total, 8KB per-item; per-domain keys stay within limits
- Shadow DOM (`mode: 'closed'`): Picker and selector builder overlay isolation — prevents host page CSS from polluting injected UI
- web-ext 8.x: Extension development server and packaging — industry standard; `web-ext run --target chromium` enables hot-reload
- Jest 29.x: Unit testing for BiDi detection and selector builder logic (pure functions, no DOM required)
- Playwright: E2E testing with `--load-extension` flag for real browser verification

### Expected Features

Research identifies 12 table-stakes features and 10 differentiators. The competitive positioning is deliberate: Hebrew-only focus (no Arabic/Persian) in a market dominated by generic multi-RTL tools.

**Must have (table stakes):**
- Per-element RTL application (not page-flip) — global page flip breaks navigation, images, and code blocks; users know this from inferior tools
- Hebrew content auto-detection (BiDi + 30% threshold) — manual toggling per-message is unusable
- Dynamic/streamed content support via MutationObserver — AI chat platforms stream; load-only detection leaves every response broken on arrival
- Code block and KaTeX LTR preservation — developers write Hebrew alongside code; breaking code makes the extension unusable
- Pre-configured selectors for ChatGPT and Claude.ai — highest-traffic targets; users test there first
- Master domain toggle + keyboard shortcut (Ctrl+Shift+H) — users need instant on/off without DevTools
- `chrome.storage.sync` persistence across tabs, devices, and browser restarts
- Popup UI showing current domain state and selector list
- List bullet/number visibility fix (`list-style-position: inside` on RTL `<li>`)
- Zero page breakage — any site breakage triggers immediate extension removal and 1-star reviews

**Should have (differentiators):**
- Visual element picker (no DevTools required) — the #1 blocker for non-technical users configuring new sites
- Selector Builder with ancestor chain navigation — users want to match "all messages", not just the clicked `<p>`
- Pre-configured selectors for Gemini, NotebookLM, and Slack — coverage across the full Israeli knowledge worker toolset
- Mixed-content threshold (30% Hebrew chars) — handles "צריך לעשות refactoring" patterns where first-strong character is English
- Hebrew-aware inline element handling — AI responses use `<strong>`, `<em>` wrappers that confuse naive first-strong detection
- Export configuration as JSON — enterprise use case; IT admin configures once, shares with team
- Per-selector enable/disable toggle and forced RTL mode

**Defer to v2+:**
- Arabic and Persian support — diffuses positioning; multi-RTL tools already serve this market
- Configuration import (merge semantics are complex; export-only in v1)
- Firefox/Safari port — doubles QA surface
- Community selector sharing / cloud sync — requires backend, privacy policy, GDPR
- Analytics or telemetry — privacy-first is a key differentiator for Israeli users
- Premium/paywall — kills install momentum; free-only for v1

### Architecture Approach

The architecture uses `chrome.storage.sync` as the reactive bus rather than complex message channels. Popup writes config → storage change event fires → content script reads and applies. This pattern is robust to service worker termination because no state lives in memory. Components are cleanly separated: background.js (stateless lifecycle and badge management), content.js (all DOM work including MutationObserver), popup.js (configuration UI, recreated on every open), and lib/ (pure utility functions shared across contexts).

**Major components:**
1. `manifest.json` — declares all permissions, content script injection rules (`<all_urls>`, `document_idle`), commands, and popup
2. `background.js` (service worker) — stateless event handlers for install-time preset injection, keyboard shortcut routing, and badge updates; reads storage on every invocation
3. `content.js` (content script) — RTL engine entry point, MutationObserver management, message listener for picker activation; persists for tab lifetime
4. `lib/bidi-detect.js` — custom Hebrew first-strong + 30% threshold detection; pure function, no DOM, ~80 lines
5. `lib/storage.js` — storage abstraction with sync→local fallback and quota monitoring
6. `popup/popup.js` — domain state display, selector list, master toggle, picker trigger, JSON export
7. `picker.js` + `lib/selector-builder.js` — visual element picker state machine and ancestor chain CSS selector generation; Shadow DOM isolated
8. `config/default-sites.js` — pre-configured selectors seeded into storage on install

### Critical Pitfalls

Five critical pitfalls must be prevented from the start — all are Phase 1 concerns:

1. **MutationObserver infinite loop** — The observer fires when the extension sets `data-hrtl-processed` on elements. Prevention: only observe `childList` and `characterData` (never `attributes`); check `data-hrtl-processed` before processing any node; process only `addedNodes` not full DOM re-queries.

2. **O(n) re-processing on every mutation** — On long AI conversations, re-querying all selectors on every new message produces linear CPU growth. Prevention: use `data-hrtl-processed` to skip already-processed elements; use a 100ms debounce with a `pendingNodes` Set to batch rapid streaming mutations.

3. **Service worker state loss** — MV3 service workers terminate after ~30 seconds idle. Any in-memory config is gone. Prevention: never store critical state in service worker module-level variables; always read from `chrome.storage` at the start of every handler; cache in content script (tab-lifetime), not service worker.

4. **CSS specificity conflicts** — Target sites use high-specificity rules that can override RTL styles. Prevention: apply via `el.style.direction = 'rtl'` (inline style, highest non-`!important` specificity); verify with `getComputedStyle(el).direction` after applying; set up periodic QA for each pre-configured site.

5. **Streaming content direction flickering (LTR→RTL mid-response)** — Hebrew responses that start with punctuation or numbers get classified LTR, then flip when Hebrew letters arrive. Prevention: delay classification until 10+ non-neutral characters have arrived; `forceRTL: true` per-selector flag bypasses detection entirely; use `characterData` mutations to re-evaluate as text grows.

## Implications for Roadmap

The research clearly identifies a 3-phase build order based on component dependencies. Every feature in phases 2 and 3 depends on the RTL engine, storage layer, and content script being solid.

### Phase 1: RTL Engine and Core Extension

**Rationale:** Everything else depends on this. The BiDi detection engine, MutationObserver, and storage schema must be correct before adding UI or configuration features. All 5 critical pitfalls surface in this phase.

**Delivers:** A working extension that auto-detects and corrects Hebrew RTL on ChatGPT and Claude.ai, persists configuration, and responds to a keyboard shortcut.

**Addresses (from FEATURES.md Alpha list):**
- Hebrew detection engine (BiDi + 30% threshold, full Unicode coverage including presentation forms U+FB1D-FB4F)
- Per-element RTL application (`direction: rtl` + `text-align: right`, both required for punctuation mirroring)
- LTR preservation for code blocks, `<pre>`, KaTeX, math elements
- List bullet fix (`list-style-position: inside` on RTL `<li>`)
- MutationObserver with 100ms debounce for streaming content
- `chrome.storage.sync` with per-domain key structure and sync→local fallback
- Pre-configured selectors for ChatGPT and Claude.ai (seeded on install)
- Popup UI: master toggle, domain state, selector list
- Background service worker: install handler, badge updates, keyboard shortcut routing
- Keyboard shortcut Ctrl+Shift+H

**Avoids:** MutationObserver infinite loop, O(n) re-processing, service worker state loss, CSS specificity conflicts, streaming content flickering, KaTeX inheritance corruption, isolated world misunderstanding.

### Phase 2: Configuration System and Remaining Pre-configured Sites

**Rationale:** With the RTL engine stable, the configuration management layer can be built with confidence. Adding Gemini, NotebookLM, and Slack pre-configs requires investigating Shadow DOM usage (Slack) and multi-selector fallback patterns before writing selector values.

**Delivers:** Complete configuration system with per-selector controls, JSON export, and coverage of all 5 pre-configured platforms.

**Addresses (from FEATURES.md Beta list):**
- Pre-configured selectors for Gemini, NotebookLM, and Slack (with Shadow DOM investigation for Slack)
- Per-selector enable/disable toggle
- Configurable load delay per domain
- Export configuration as JSON
- Mixed inline element handling (`<strong>`, `<em>` wrapper traversal)
- `chrome.storage.sync` quota monitoring and fallback

**Avoids:** DOM structure changes breaking selectors (multi-selector fallback pattern), storage quota exhaustion (monitoring + fallback), Shadow DOM selector mismatch (Slack research upfront).

**Research flag:** Slack's Shadow DOM architecture should be investigated before writing selectors. Open vs. closed shadow root status determines whether `document.querySelectorAll` can reach message elements.

### Phase 3: Visual Element Picker and Selector Builder

**Rationale:** The picker depends on the full storage layer (to save new selectors) and the RTL engine (to immediately preview the effect of a saved selector). It is the most complex piece of UI and involves its own state machine, Shadow DOM isolation, and a popup/content script race condition to handle.

**Delivers:** The primary differentiating feature — a non-technical user can configure any website without DevTools.

**Addresses:**
- Visual element picker (transparent overlay, magnifying glass activation from popup)
- Selector Builder with ancestor chain navigation and live preview
- Popup/content script ping-and-verify race condition handling
- Escape key and cancel button for picker mode exit

**Avoids:** Element picker intercepting site event handlers (`pointer-events: none` on overlay, `elementFromPoint` hit testing), popup/picker race condition (ping verification before popup closes).

### Phase Ordering Rationale

- The storage schema must exist before any feature reads or writes configuration — it is the foundation of the reactive-bus pattern.
- The BiDi engine is a pure function with no dependencies — it can be developed and unit-tested before any DOM integration.
- The MutationObserver pattern (Phase 1) must be proven correct before adding more selectors (Phase 2) that will exercise it at higher throughput.
- The picker (Phase 3) can only save selectors into a storage schema that already exists and be validated against an RTL engine that already works.
- Shadow DOM research for Slack (Phase 2) should happen before committing to selector values — a closed shadow root makes pre-configuration impossible and that decision should be made explicitly.

### Research Flags

Phases likely needing deeper pre-phase research during planning:
- **Phase 2 (Slack):** Investigate Slack's Shadow DOM mode (`open` vs `closed`) before writing pre-configured selectors. If closed, Slack pre-config is not feasible in v1.
- **Phase 2 (Selector fragility):** Document the exact DOM elements each pre-configured selector targets (not just the CSS selector, but the structural role) to accelerate maintenance when sites update.

Phases with standard, well-documented patterns (can skip research-phase):
- **Phase 1:** Chrome MV3 content script architecture is stable and well-documented. BiDi detection algorithm is a known pattern. MutationObserver debounce is a solved problem.
- **Phase 3:** Element picker hit-testing via `elementFromPoint` and Shadow DOM isolation for injected overlays are well-documented patterns with no platform surprises.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Chrome MV3 APIs are stable; vanilla JS constraint is explicit in PROJECT.md; zero-build rationale is well-established for small extensions |
| Features | HIGH | Sourced directly from PRD and PROJECT.md; Hebrew Unicode specification is stable; competitive analysis corroborated by published extension reviews |
| Architecture | HIGH | Chrome MV3 architecture is well-documented and stable; reactive storage bus pattern is established extension best practice |
| Pitfalls | HIGH | All 5 critical pitfalls have documented causes and concrete prevention patterns; sourced from known MV3 constraints |

**Overall confidence:** HIGH

### Gaps to Address

- **Slack Shadow DOM mode:** Cannot confirm open vs. closed without testing. Resolve in Phase 2 before writing selectors. If closed, document as known limitation and skip Slack pre-config for v1.
- **ChatGPT and Claude selector stability:** Both platforms ship frequent React DOM updates. The pre-configured selectors written in Phase 1 will require validation at Phase 2 start and ongoing maintenance thereafter. Establish a QA ritual before each release.
- **Streaming content flicker threshold:** The "wait for 10+ non-neutral characters" heuristic for streaming detection is a suggested starting point, not a validated value. The actual threshold should be tuned through testing on real ChatGPT and Claude responses during Phase 1 QA.
- **Keyboard shortcut collision on Slack:** Ctrl+Shift+H conflicts with Slack's "highlight unread" shortcut. Chrome extension shortcuts should take browser-level priority, but this should be verified against each pre-configured site before shipping.

## Sources

### Primary (HIGH confidence)
- `PROJECT.md` — explicit constraints (vanilla JS, no framework, Chrome-only, MV3), out-of-scope decisions
- `Hebrew-RTL-Chrome-Extension-PRD.md` — functional requirements, competitive analysis, Unicode appendix, feature priorities
- Unicode Standard Hebrew blocks (U+0590-U+05FF, U+FB1D-U+FB4F) — stable specification
- Chrome MV3 documentation — service worker lifecycle, storage quotas, MutationObserver availability, CSP restrictions

### Secondary (MEDIUM confidence)
- Chrome extension developer community patterns — MutationObserver debounce, `data-*` processed-element marking, storage-as-bus pattern; confirmed by multiple independent sources
- Extension review and testing methodology — 48-hour SLA for selector maintenance; based on observed breakage frequency for React-based sites

### Tertiary (LOW confidence)
- Slack Shadow DOM architecture — inferred from general knowledge of Slack's frontend; not directly verified; must be confirmed during Phase 2 implementation

---
*Research completed: 2026-03-22*
*Ready for roadmap: yes*
