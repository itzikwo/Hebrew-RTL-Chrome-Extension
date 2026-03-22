# Hebrew RTL Chrome Extension

## What This Is

A Chrome extension that automatically detects Hebrew content on any website and applies per-element RTL text direction and alignment corrections. It ships pre-configured for the most popular AI chat and collaboration platforms (ChatGPT, Claude, Gemini, NotebookLM, Slack) and lets users configure any additional site through a visual element picker — no DevTools knowledge required.

## Core Value

Hebrew speakers can read and write naturally on any website without broken layout, reversed punctuation, or misaligned text — with zero page-level CSS hacks.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Detect Hebrew content using Unicode BiDi first-strong-character algorithm (skip emojis, numbers, bullets, punctuation)
- [ ] Apply CSS direction:rtl and text-align:right at the individual DOM element level (not page level)
- [ ] Support mixed content: 30%+ Hebrew characters in a sentence → classify as RTL
- [ ] Preserve LTR for code blocks, KaTeX/LaTeX math formulas, URLs, and file paths
- [ ] Process dynamically loaded and streamed content via MutationObserver
- [ ] Fix list bullet/number visibility when list items receive RTL direction
- [ ] Store per-domain configuration with multiple CSS selectors per domain (chrome.storage.sync)
- [ ] Ship pre-configured selectors for ChatGPT, Claude.ai, Google Gemini, NotebookLM, and Slack
- [ ] Visual element picker: hover highlights + tooltip, click to select
- [ ] Selector Builder overlay: choose ancestor level, optional class/attribute filters
- [ ] Per-selector enable/disable toggle and master toggle per domain
- [ ] Auto-save configuration changes immediately
- [ ] Export configuration as JSON
- [ ] Popup UI: domain name + master toggle, selector list with checkboxes and delete buttons
- [ ] Keyboard shortcut Ctrl+Shift+H to toggle master switch for current domain
- [ ] Chrome Manifest V3 compliant

### Out of Scope

- Import configuration — deferred to v2 premium tier
- Premium license validation / paywall — free-only for v1
- Firefox port — Chrome-only for v1
- Safari / WebExtensions port — deferred
- Community selector sharing / cloud sync — deferred to v2+
- Enterprise admin console / Chrome Enterprise policy — v3
- Mobile companion — not viable for Chrome extensions
- Auto-detection of new sites (scan page and suggest selectors) — deferred
- User-configurable Hebrew detection threshold — deferred (fixed at 30%)
- Microsoft Teams, WhatsApp Web, Telegram Web, Notion pre-configs — deferred to v2
- Custom CSS injection per selector — premium v2 feature

## Context

- Target platforms: ChatGPT (chatgpt.com), Claude.ai, Google Gemini (gemini.google.com), NotebookLM (notebooklm.google.com), Slack (app.slack.com)
- Chrome Manifest V3 is required for Chrome Web Store submission
- All Hebrew detection happens locally — zero data transmission, no analytics
- Key DOM challenge: AI chat platforms stream content dynamically; MutationObserver must handle rapid sequential mutations with 100ms debounce
- Reference implementation: Multi-RTL extension (v5.1.0) — proven architecture for per-domain selector storage, element picker with Selector Builder, and Unicode BiDi detection
- Primary differentiator: Hebrew-only focus (simpler detection engine, sharper Israeli user positioning) vs. Multi-RTL's multi-language complexity
- Performance targets: <50ms per DOM mutation batch, <10MB additional memory

## Constraints

- **Tech Stack**: Chrome Manifest V3, vanilla JS (no framework dependency in content script — performance critical)
- **Privacy**: No external network calls except optional premium license validation (v2+). All processing on-device.
- **Security**: No eval(), no innerHTML with user content, no unsafe CSP overrides
- **Compatibility**: Chrome 88+ (covers 99%+ of Chrome users)
- **Distribution**: Chrome Web Store submission as launch channel

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hebrew-only detection (not Arabic/Persian) | Simpler engine, sharper positioning for Israeli market | — Pending |
| 30% mixed-content threshold (fixed) | Matches Multi-RTL's proven value; user-configurable deferred | — Pending |
| Element-level styles (not page-level) | Prevents breaking navigation, images, code blocks | — Pending |
| chrome.storage.sync (with local fallback for large configs) | Syncs across user's devices automatically | — Pending |
| Free-only for v1 | Remove friction, maximize installs, validate product before monetizing | — Pending |
| Manifest V3 | Required for Chrome Web Store; MutationObserver works fine in content scripts | — Pending |

---
*Last updated: 2026-03-22 after initialization*
