# Feature Landscape

**Domain:** Hebrew RTL Chrome extension — browser-level text direction correction
**Researched:** 2026-03-22
**Confidence:** HIGH for Hebrew-specific and competitive findings (sourced from PRD + PROJECT.md); MEDIUM for community patterns

---

## Table Stakes

Features users expect from any RTL correction extension. Missing any of these and users abandon within the first session.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Per-element RTL application (not page-flip) | Global page-flip breaks navigation, images, code blocks. Users know this from trying inferior tools. | Medium | Must use `direction:rtl` + `text-align:right` on individual DOM elements via inline style |
| Hebrew content auto-detection | Manual toggling per-message is unusable. Users expect it to just work. | Medium | BiDi first-strong-character algorithm + 30% mixed-content threshold. Unicode range 0590-05FF + FB1D-FB4F. |
| Dynamic/streamed content support | AI chat platforms stream responses — if detection only runs on page load, every response is broken on arrival | High | MutationObserver on `childList` + `characterData`, debounced at 100ms |
| Code block LTR preservation | Developers write Hebrew comments alongside code. Flipping code blocks makes them unreadable. | Low | Selector exceptions for `code`, `pre`, `.katex`, `.math` — always skip detection for these |
| Pre-configured support for ChatGPT | ChatGPT is the highest-traffic AI platform. Users try the extension there first. | Medium | Requires maintaining selectors against ChatGPT's frequently-changing React DOM structure |
| Pre-configured support for Claude.ai | Second most-used AI platform by tech-savvy Hebrew users | Medium | Claude's streaming architecture is complex; selectors target message content regions |
| Master domain toggle | Users need to turn off RTL entirely on sites where it misbehaves | Low | Single toggle per domain in `chrome.storage.sync`; keyboard shortcut Ctrl+Shift+H |
| Configuration persistence | RTL settings must survive page refresh, browser restart, Chrome updates | Low | `chrome.storage.sync` provides cross-device persistence |
| Popup UI showing current domain state | Users need to know at a glance whether the extension is active | Low | Badge indicator + popup header showing domain + toggle state |
| List bullet/number visibility fix | When `direction:rtl` is applied to `<li>` elements, list markers disappear | Low | Auto-apply `list-style-position:inside` when RTL is set on list items |
| Zero page breakage | If the extension breaks a site, users remove it immediately and leave 1-star review | High | Element-level styles only; skip form elements and navigation landmarks |
| Keyboard shortcut for quick toggle | Power users need instant on/off without opening popup | Low | Default Ctrl+Shift+H (Chrome command API in MV3) |

---

## Differentiators

Features that set this product apart from the 12+ generic RTL extensions.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Visual element picker (no DevTools required) | The main blocker for non-technical users configuring new sites is finding the right CSS selector | High | Transparent overlay; hover highlights element with outline + tooltip; click triggers Selector Builder |
| Selector Builder with ancestor chain navigation | Users want to match "all messages" not just the specific `<p>` they clicked | Medium | Dropdown of ancestor chain from clicked element to `<body>`; each ancestor previewed with live highlight |
| Hebrew-only focus (not Arabic/Persian) | Hebrew speakers are poorly served by Arabic-first tools | Low | Detection filters to U+0590-05FF + U+FB1D-FB4F only. Arabic (0600-06FF) intentionally excluded. |
| Pre-configured Gemini + NotebookLM + Slack | Coverage across the full Israeli knowledge worker's toolset | Medium | 5 platforms total. NotebookLM unique — source summaries and podcast transcripts have specific DOM structure. |
| Per-selector enable/disable toggle | Granular control without deleting configuration | Low | Checkbox state stored per selector ID in `chrome.storage.sync` |
| Export configuration as JSON | Enterprise use case: IT admin configures once, shares file with team | Low | Serializes `chrome.storage.sync` domains object to downloadable JSON |
| Forced RTL mode per selector | Some selectors should always be RTL; detection adds overhead for no benefit | Low | `forceRTL: true` flag — skips BiDi detection entirely |
| Mixed-content threshold (30% Hebrew chars) | Messages like "צריך לעשות X because Y" start in Hebrew but contain English words — naive first-strong detection fails | Low | Second pass: count Hebrew chars as fraction of total. If ≥30% → RTL. |
| Hebrew-aware inline element handling | AI responses often structure Hebrew as `<li><strong>Phase 1</strong> – Hebrew text</li>`. Naive detection fails. | High | Walk child text nodes; skip formatting wrappers (`<strong>`, `<em>`, `<span>`) to find first substantive text |
| Configurable load delay per domain | Some SPAs inject content 200-500ms after DOMContentLoaded | Low | `loadDelay` ms per domain, defaulting to 0. Exposed in popup for power users. |

---

## Anti-Features

Features to explicitly NOT build for v1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Global page-flip / page-level `direction:rtl` | Breaks navigation, images, embedded media, date pickers | Per-element application only |
| Arabic and Persian language support | Diffuses positioning; Multi-RTL already serves this market | Hebrew Unicode blocks only; document in store listing |
| Custom CSS injection per selector | High support burden; CSP compliance risk | Export-only in v1; reserve for premium v2 |
| Configuration import | Merge semantics complex; rushed implementation creates data loss bugs | Export only in v1; import is the premium v2 differentiator |
| Auto-detection of new sites | Heuristic scanning produces false positives; noisy suggestions hurt trust | Manual picker is lower noise and higher precision |
| User-configurable detection threshold | UI complexity and support questions; 30% is proven | Hard-code at 30% |
| Firefox / Safari port | Each port doubles QA surface; MV3/WebExtensions gaps | Chrome-only for v1 |
| Community selector sharing / cloud sync | Requires backend infrastructure, privacy policy, GDPR | Export JSON enables manual sharing; defer to v2+ |
| Analytics / telemetry | Privacy-first is a key differentiator for Israeli users | Zero data transmission in v1 |
| Premium/paywall in v1 | Friction at install kills reaching 5,000 users | Free-only for v1; gate premium in v2 |
| Teams/WhatsApp/Telegram/Notion pre-configs in v1 | Each platform has unique DOM complexity; shipping broken configs is worse than no configs | 5 platforms is the right v1 surface; additional in v2 |

---

## Feature Dependencies

```
Hebrew detection engine (BiDi + threshold)
  → Per-element RTL application
  → Mixed inline element handling (extends detection)
  → Forced RTL mode (overrides detection — parallel path)

MutationObserver integration
  → Dynamic content support (streaming AI responses)
  → Selector hover preview (mutation awareness for live highlight)

chrome.storage.sync configuration layer
  → Per-domain selector storage
    → Pre-configured site selectors (seeds storage at install)
    → Per-selector enable/disable toggle
    → Master domain toggle
    → Forced RTL flag per selector
    → Configurable load delay per domain
  → Export configuration (reads storage)

Element picker (activated from popup)
  → Selector Builder overlay
    → Ancestor chain navigation
    → Selector save to storage

Popup UI
  → Domain state display (reads storage)
  → Selector list with toggles (reads/writes storage)
  → Picker trigger (sends message to content script)
  → Export action (reads storage, triggers download)

Keyboard shortcut (Chrome commands API)
  → Master toggle (same action as popup toggle)
```

---

## Hebrew-Specific Nuances

### Unicode Coverage

| Block | Range | What It Contains |
|-------|-------|-----------------|
| Hebrew | U+0590-U+05FF | Consonants (alef-tav), vowel marks (nikkud), cantillation marks, punctuation |
| Hebrew Presentation Forms | U+FB1D-U+FB4F | Alternative letter forms, ligatures, pointed forms used in legacy encodings |

### Nikkud (Vowel Marks) — U+05B0-U+05C7

Vowel marks appear above/below consonants. LTR rendering causes vowel marks to appear on the wrong side of consonants in some fonts. Correct `direction:rtl` at the element level is the only fix — font substitution alone cannot fix this.

### Hebrew Presentation Forms Edge Case

U+FB1D-U+FB4F appears in text copy-pasted from legacy Hebrew word processors and some religious content sites. The 30% threshold calculation MUST count these code points as Hebrew characters — if only U+0590-U+05FF is counted, documents using presentation forms will fail the threshold and stay LTR.

### Punctuation Mirroring

Sentences like "שלום, מה שלומך?" should display with the question mark at the right end (left visually). This requires `direction:rtl` not just `text-align:right`. Extensions that only add `text-align:right` partially fix visual alignment but leave punctuation mirroring broken. **Both properties are required.**

### Mixed Hebrew-English Content Patterns

Israeli professional writing mixes Hebrew and English constantly:
- English technical terms in Hebrew sentences: "צריך לעשות refactoring של הקוד"
- Hebrew explanations of English code: inline code stays LTR but surrounding prose is Hebrew
- URLs and file paths within Hebrew text: always LTR regardless of surrounding direction

The BiDi algorithm handles in-line mixing correctly once `direction:rtl` is set at the block level. The 30% threshold exists specifically for sentences where the first strong character is English but the semantic meaning is Hebrew.

---

## MVP Feature Phasing

**Alpha (weeks 1-3):**
1. Hebrew detection engine (BiDi + 30% threshold, U+0590-05FF + U+FB1D-FB4F)
2. Per-element RTL application (`direction:rtl` + `text-align:right`)
3. LTR preservation for code blocks, KaTeX, math
4. MutationObserver for streaming content (100ms debounce)
5. List bullet fix (`list-style-position:inside`)
6. Pre-configured selectors for ChatGPT and Claude.ai
7. Popup UI with master toggle and selector list
8. Keyboard shortcut Ctrl+Shift+H
9. `chrome.storage.sync` configuration persistence

**Beta (weeks 4-6):**
10. Visual element picker
11. Selector Builder with ancestor chain navigation
12. Pre-configured selectors for Gemini, NotebookLM, Slack
13. Per-selector enable/disable toggle
14. Export configuration as JSON
15. Mixed inline element handling
16. Configurable load delay per domain

---

## Sources

- PROJECT.md — validated requirements and out-of-scope decisions — HIGH confidence
- Hebrew-RTL-Chrome-Extension-PRD.md — competitive analysis, functional requirements, Unicode appendix — HIGH confidence
- Unicode Standard Hebrew blocks (U+0590-U+05FF, U+FB1D-U+FB4F) — stable specification — HIGH confidence
- Chrome MV3 content script capabilities — training data, confirmed stable as of August 2025 — MEDIUM confidence
