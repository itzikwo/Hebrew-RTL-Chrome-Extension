---
phase: 1
slug: rtl-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x |
| **Config file** | `package.json` (`"jest"` key) — Wave 0 installs |
| **Quick run command** | `npm test -- --testPathPattern=bidi-detect` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern=bidi-detect`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01-01 | 1 | ENG-01 | unit | `npm test -- --testPathPattern=bidi-detect` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01-01 | 1 | ENG-03 | unit | `npm test -- --testPathPattern=bidi-detect` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01-01 | 1 | ENG-08 | unit | `npm test -- --testPathPattern=bidi-detect` | ❌ W0 | ⬜ pending |
| 1-02-01 | 01-02 | 1 | ENG-02 | unit | `npm test -- --testPathPattern=content` | ❌ W0 | ⬜ pending |
| 1-02-02 | 01-02 | 1 | ENG-04 | unit | `npm test -- --testPathPattern=content` | ❌ W0 | ⬜ pending |
| 1-02-03 | 01-02 | 1 | ENG-06 | unit | `npm test -- --testPathPattern=content` | ❌ W0 | ⬜ pending |
| 1-02-04 | 01-02 | 1 | ENG-07 | unit | `npm test -- --testPathPattern=content` | ❌ W0 | ⬜ pending |
| 1-03-01 | 01-03 | 2 | ENG-05 | unit | `npm test -- --testPathPattern=mutation` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `package.json` — `npm init -y`, install `jest@29`, configure `"jest"` key with `testEnvironment: "jsdom"` for DOM-touching tests
- [ ] `tests/bidi-detect.test.js` — stubs for ENG-01 (first-strong-character), ENG-03 (30% threshold), ENG-08 (inline element traversal)
- [ ] `tests/content.test.js` — stubs for ENG-02 (inline style application), ENG-04 (LTR preservation), ENG-06 (forced RTL), ENG-07 (list bullets)
- [ ] `tests/mutation.test.js` — stubs for ENG-05 (MutationObserver debounce, re-evaluation on characterData)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual LTR→RTL flip on streaming content | ENG-05 | Requires real ChatGPT/Claude stream; no DOM mock simulates streaming faithfully enough | Load extension unpacked in Chrome, open ChatGPT, send a Hebrew prompt, observe RTL applied within 100ms |
| List bullet visibility on Hebrew `<li>` | ENG-07 | Visual inspection required | Apply RTL to a `<ul>` with Hebrew items; verify bullets appear inside the text, not hidden |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
