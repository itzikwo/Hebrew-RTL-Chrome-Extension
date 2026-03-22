---
phase: 3
slug: popup-ui-and-config-actions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — Chrome extension (zero-build, no test runner installed) |
| **Config file** | none |
| **Quick run command** | Manual: load extension in Chrome, open popup |
| **Full suite command** | Manual: walk all 5 success criteria in Chrome |
| **Estimated runtime** | ~3 minutes manual |

---

## Sampling Rate

- **After every task commit:** Reload extension in Chrome, verify task-specific behavior
- **After every plan wave:** Walk all success criteria for completed waves
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 minutes manual

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | POP-01 | manual | Load popup → domain name visible in header | ✅ | ⬜ pending |
| 03-01-02 | 01 | 1 | POP-01 | manual | Load popup → master toggle present and functional | ✅ | ⬜ pending |
| 03-01-03 | 01 | 1 | POP-02 | manual | Load popup → selector list renders with checkboxes and delete buttons | ✅ | ⬜ pending |
| 03-01-04 | 01 | 1 | POP-02 | manual | Toggle selector checkbox → change persists without page reload | ✅ | ⬜ pending |
| 03-01-05 | 01 | 1 | POP-02 | manual | Click delete button → selector removed from list and storage | ✅ | ⬜ pending |
| 03-02-01 | 02 | 2 | POP-04 | manual | Hover selector row → matching page elements highlight | ✅ | ⬜ pending |
| 03-02-02 | 02 | 2 | POP-04 | manual | Un-hover selector row → highlights cleared from page | ✅ | ⬜ pending |
| 03-03-01 | 03 | 3 | CFG-05 | manual | Actions menu → Export JSON downloads valid config file | ✅ | ⬜ pending |
| 03-03-02 | 03 | 3 | POP-05 | manual | Click Add Selector (+) → new empty row appears ready for picker | ✅ | ⬜ pending |
| 03-03-03 | 03 | 3 | POP-03 | manual | Actions menu renders with all required items | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*No automated test framework — Chrome extension UI requires manual verification. All tasks verified by loading extension in Chrome.*

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Popup renders correct domain name | POP-01 | Requires active Chrome tab + extension popup | Open popup on any domain, verify hostname shown in header |
| Master toggle disables correction | POP-01 | Requires live page interaction | Toggle off → type Hebrew in monitored field → verify no correction |
| Selector highlight in real-time | POP-04 | Requires popup ↔ content.js messaging in Chrome | Hover selector row → verify outline on page elements, un-hover → outline gone |
| Export JSON download | CFG-05 | Requires browser download API | Actions → Export → verify JSON file with all domain configs |
| confirm() NOT used | All | Blocked in extension context | Inspect DOM for custom modal, no native confirm() calls |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3 minutes
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
