---
phase: 4
slug: visual-element-picker
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | jest.config.js |
| **Quick run command** | `npm test -- --testPathPattern=picker` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern=picker`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | PICK-01 | unit | `npm test -- --testPathPattern=picker` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | PICK-01 | unit | `npm test -- --testPathPattern=picker` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | PICK-02 | unit | `npm test -- --testPathPattern=picker` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | PICK-02 | unit | `npm test -- --testPathPattern=picker` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | PICK-02 | unit | `npm test -- --testPathPattern=picker` | ❌ W0 | ⬜ pending |
| 04-02-03 | 02 | 2 | PICK-03 | unit | `npm test -- --testPathPattern=picker` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/picker.test.js` — stubs for PICK-01, PICK-02, PICK-03
- [ ] Existing `jest.config.js` covers new files

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hover outline + tooltip render on real page | PICK-01 | Requires live Chrome extension + DOM interaction | Load extension in Chrome, navigate to any page, click picker icon, hover over elements — verify outline and tooltip appear |
| Shadow DOM isolation of overlay | PICK-02 | Requires visual inspection in DevTools | Open DevTools, inspect the overlay — it should be inside a shadow root, not polluting page styles |
| Save persists selector and popup updates | PICK-03 | Requires storage + popup integration check | Click an element, save — reopen popup and verify selector appears in list |
| Cancel/Escape exits cleanly | PICK-03 | Requires visual + storage check | Activate picker, press Escape — verify no outline, tooltip, or overlay remain; verify no selector saved |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
