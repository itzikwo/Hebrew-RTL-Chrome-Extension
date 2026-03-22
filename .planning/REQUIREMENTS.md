# Requirements: Hebrew RTL Chrome Extension

**Defined:** 2026-03-22
**Core Value:** Hebrew speakers can read and write naturally on any website without broken layout, reversed punctuation, or misaligned text — with zero page-level CSS hacks.

---

## v1 Requirements

### RTL Engine

- [ ] **ENG-01**: Extension detects Hebrew content using Unicode BiDi first-strong-character algorithm, skipping emojis, numbers, bullets, and punctuation when determining direction (FR-001)
- [ ] **ENG-02**: Extension applies CSS `direction:rtl` and `text-align:right` at the individual DOM element level, not at the page level (FR-002)
- [ ] **ENG-03**: Extension detects mixed content: sentences starting with English but containing 30%+ Hebrew characters (U+0590-05FF, U+FB1D-FB4F) are classified as RTL (FR-003)
- [ ] **ENG-04**: Extension preserves LTR alignment for code blocks (`code`, `pre`), mathematical formulas (KaTeX/LaTeX), URLs, and file paths (FR-004)
- [ ] **ENG-05**: Extension processes dynamically loaded and streamed content in real-time via MutationObserver, with 100ms debounce (FR-005)
- [ ] **ENG-06**: Extension supports forced RTL mode per selector: skips content detection and always applies RTL (FR-006)
- [ ] **ENG-07**: Extension fixes list bullet/number visibility when list items receive RTL direction by auto-applying `list-style-position:inside` (FR-007)
- [ ] **ENG-08**: Extension handles mixed inline elements where the first text node is in a child element (e.g. `<li><strong>Phase 1</strong> – Hebrew text</li>`) by walking child text nodes to find the first substantive content (FR-008)

### Configuration

- [x] **CFG-01**: Extension stores per-domain configuration with multiple CSS selectors per domain in `chrome.storage.sync`, with automatic fallback to `chrome.storage.local` when sync quota is exceeded (FR-100)
- [x] **CFG-02**: Extension ships pre-configured selectors for ChatGPT (chatgpt.com), Claude.ai, Google Gemini (gemini.google.com), NotebookLM (notebooklm.google.com), and Slack (app.slack.com) (FR-101)
- [x] **CFG-03**: Extension supports configurable load delay (milliseconds) per domain for sites with late-loading content (FR-106)
- [x] **CFG-04**: Extension auto-saves all configuration changes immediately without requiring an explicit save action (FR-107)
- [ ] **CFG-05**: Extension supports configuration export as a downloadable JSON file (FR-108)

### Element Picker

- [ ] **PICK-01**: Extension provides a visual element picker: user clicks a magnifying glass icon in popup, hovers over page elements to see an outline + tooltip showing element tag, classes, and computed selector, then clicks to select (FR-102)
- [ ] **PICK-02**: After element selection, extension shows an in-page Selector Builder overlay that lets the user choose ancestor level from a dropdown of the element's ancestor chain (each with a live preview highlight) and optionally add class/attribute filters (FR-103)
- [ ] **PICK-03**: Selector Builder saves the generated selector to `chrome.storage.sync` for the current domain on Save, discards on Cancel (FR-103)

### Popup UI

- [ ] **POP-01**: Popup shows current domain name and master enable/disable toggle prominently at the top (FR-200)
- [ ] **POP-02**: Popup lists all configured selectors for the current domain with: enable/disable checkbox, delete button, and element picker trigger per row (FR-201)
- [ ] **POP-03**: Popup includes an Add Selector button (+) that creates a new empty selector row ready for picker activation (FR-202)
- [ ] **POP-04**: Hovering over a selector row in the popup highlights matching elements on the page in real time (FR-203)
- [ ] **POP-05**: Popup includes an Actions menu with: Export Config, Delete All Selectors, User Guide link, and Keyboard Shortcut configuration (FR-204)

### Keyboard Shortcuts

- [x] **KBD-01**: Extension registers a default keyboard shortcut (Ctrl+Shift+H / MacCtrl+Shift+H) to toggle the master switch for the current domain (FR-300)
- [x] **KBD-02**: Extension allows the user to customize the keyboard shortcut via Chrome's extension keyboard shortcut settings (FR-301)

---

## v2 Requirements

### Configuration (Premium)

- **CFG-V2-01**: Configuration import with merge semantics — add to existing selectors without overwriting (FR-109)

### Popup UI

- **POP-V2-01**: Show selector count and match count per selector row (FR-205)

### Sites

- **SITE-V2-01**: Pre-configured selectors for Microsoft Teams, WhatsApp Web, Telegram Web, Notion

### Premium Tier

- **PREM-V2-01**: License validation system with 30-day local cache (graceful offline degradation)
- **PREM-V2-02**: Custom CSS injection per selector (advanced styling control beyond direction/alignment)

### Browser Support

- **BRWS-V2-01**: Firefox extension port via WebExtensions API

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Global page-level `direction:rtl` | Breaks navigation, images, code blocks, UI elements — defeats the purpose |
| Arabic and Persian language support | Diffuses Hebrew-focused positioning; Multi-RTL already serves this market |
| Auto-detection of new sites | Heuristic scanning produces false positives that erode user trust |
| User-configurable detection threshold | UI complexity; 30% is Multi-RTL's proven value; defer if users report false positives |
| Safari / WebExtensions port | Apple developer account required; doubles QA surface |
| Community selector sharing / cloud sync | Requires backend, privacy policy, GDPR compliance — not validated by user demand |
| Analytics / telemetry | Privacy-first positioning is a key differentiator for Israeli users |
| Premium tier / paywall | Friction at install time; build install base first; gate premium in v2 |
| Enterprise admin console | v3 scope |
| Chrome Enterprise policy support | v3 scope |
| Mobile companion | Chrome extensions not supported on Android |

---

## Traceability

*Updated: 2026-03-22 after roadmap creation.*

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENG-01 | Phase 1 | Pending |
| ENG-02 | Phase 1 | Pending |
| ENG-03 | Phase 1 | Pending |
| ENG-04 | Phase 1 | Pending |
| ENG-05 | Phase 1 | Pending |
| ENG-06 | Phase 1 | Pending |
| ENG-07 | Phase 1 | Pending |
| ENG-08 | Phase 1 | Pending |
| CFG-01 | Phase 2 | Complete |
| CFG-02 | Phase 2 | Complete |
| CFG-03 | Phase 2 | Complete |
| CFG-04 | Phase 2 | Complete |
| CFG-05 | Phase 3 | Pending |
| PICK-01 | Phase 4 | Pending |
| PICK-02 | Phase 4 | Pending |
| PICK-03 | Phase 4 | Pending |
| POP-01 | Phase 3 | Pending |
| POP-02 | Phase 3 | Pending |
| POP-03 | Phase 3 | Pending |
| POP-04 | Phase 3 | Pending |
| POP-05 | Phase 3 | Pending |
| KBD-01 | Phase 2 | Complete |
| KBD-02 | Phase 2 | Complete |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23 (Phase 1: 8, Phase 2: 6, Phase 3: 6, Phase 4: 3)
- Unmapped: 0

---

*Requirements defined: 2026-03-22*
*Last updated: 2026-03-22 after roadmap creation*
