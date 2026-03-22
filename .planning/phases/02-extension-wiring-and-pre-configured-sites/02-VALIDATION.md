---
phase: 2
slug: extension-wiring-and-pre-configured-sites
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.3.0 (ESM, already configured) |
| **Config file** | `package.json` (`"jest"` key, `transform: {}`) |
| **Quick run command** | `npm test -- --testPathPatterns=storage --no-coverage` |
| **Full suite command** | `npm test --no-coverage` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test --no-coverage`
- **After every plan wave:** Run `npm test --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 02-01 | 1 | CFG-01 | manual | load unpacked in Chrome | ❌ W0 | ⬜ pending |
| 2-01-02 | 02-01 | 1 | KBD-01 | manual | chrome://extensions/shortcuts | ❌ W0 | ⬜ pending |
| 2-02-01 | 02-02 | 1 | CFG-01 | unit | `npm test -- --testPathPatterns=storage` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02-02 | 1 | CFG-04 | unit | `npm test -- --testPathPatterns=storage` | ❌ W0 | ⬜ pending |
| 2-03-01 | 02-03 | 2 | KBD-01 | unit | `npm test -- --testPathPatterns=background` | ❌ W0 | ⬜ pending |
| 2-03-02 | 02-03 | 2 | CFG-03 | unit | `npm test -- --testPathPatterns=background` | ❌ W0 | ⬜ pending |
| 2-04-01 | 02-04 | 2 | CFG-02 | unit | `npm test -- --testPathPatterns=default-sites` | ❌ W0 | ⬜ pending |
| 2-04-02 | 02-04 | 2 | CFG-03 | unit | `npm test -- --testPathPatterns=default-sites` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/storage.test.js` — stubs for CFG-01 (sync/local/fallback), CFG-04 (auto-save)
- [ ] `tests/background.test.js` — stubs for KBD-01 (command routing), CFG-03 (load delay)
- [ ] `tests/default-sites.test.js` — stubs for CFG-02 (selector shape validation), CFG-03 (loadDelay field)
- [ ] Chrome API mocks (`tests/__mocks__/chrome.js`) — mock `chrome.storage.sync`, `chrome.storage.local`, `chrome.tabs`, `chrome.action`, `chrome.runtime`, `chrome.commands`

*Note: Manifest and content-script integration are Chrome runtime behaviors — no unit test can validate them. Manual verification via Load Unpacked is the only path.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Content script injects on page load | CFG-02 | Requires real Chrome runtime | Load unpacked → open ChatGPT → check DevTools for `data-hrtl-processed` on message elements |
| Keyboard shortcut Ctrl+Shift+H toggles domain | KBD-01/KBD-02 | Requires real Chrome runtime | Load unpacked → visit ChatGPT → press Ctrl+Shift+H → verify badge changes ON/OFF |
| Settings persist across browser restart | CFG-01 | Requires real Chrome runtime | Configure a domain → restart Chrome → re-open extension → verify config still present |
| Hebrew auto-corrects on ChatGPT after load delay | CFG-02/CFG-03 | Requires real ChatGPT page load | Load unpacked → open ChatGPT → send Hebrew message → verify RTL applied within 500ms |
| Cross-profile sync | CFG-01 | Requires two Chrome profiles | Add selector on Profile A → open same page on Profile B → verify selector present |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
