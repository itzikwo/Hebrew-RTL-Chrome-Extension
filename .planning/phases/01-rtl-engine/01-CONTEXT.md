# Phase 1: RTL Engine - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Hebrew detection and per-element RTL application library. This phase delivers a working JavaScript engine that:
- Detects Hebrew content using Unicode BiDi first-strong-character algorithm
- Applies `direction:rtl` and `text-align:right` as inline styles at the individual DOM element level
- Preserves LTR for code blocks, math formulas, URLs, and file paths
- Handles dynamically streamed content via MutationObserver
- Handles mixed inline elements (child text nodes in nested markup)
- Supports forced RTL mode per selector (skip detection, always apply)
- Fixes list bullet/number visibility

No storage, no popup, no picker, no Chrome APIs in this phase — those are Phase 2+. The engine should be independently testable in Node/Jest without a browser.

</domain>

<decisions>
## Implementation Decisions

### Re-evaluation on Content Change

- **Re-evaluate on `characterData` mutations**: When the MutationObserver detects a `characterData` change on an already-classified element, remove `data-hrtl-processed` and re-run detection. This catches elements that started with LTR-neutral tokens (English punctuation, loading placeholders) but became Hebrew as AI platforms stream more content.
- **Bidirectional re-evaluation**: Allow both LTR→RTL and RTL→LTR direction changes. If content is later edited or replaced with all-English content, the element should revert to LTR. This handles paste events, live edits, and edge cases correctly.
- **Rate**: Re-evaluation runs only within the existing 100ms debounce batch — no separate throttling mechanism. Elements that changed during the debounce window are re-queued and processed together when the debounce fires.

### Claude's Discretion

- **Streaming flicker**: Whether to use a minimum character threshold before classifying streaming elements — Claude should decide the right balance. Hint: `forceRTL: true` mode (Phase 2 config) is the user's tool for eliminating flicker on known-RTL selectors; the engine itself can accept the brief flip.
- **Detection granularity**: Whether to apply RTL to the matched element only, or walk child text nodes to find first substantive content — Claude decides based on the inline element handling requirement (ENG-08). The algorithm should be whatever correctly handles `<li><strong>label</strong> Hebrew text</li>`.
- **LTR exemption scope**: Beyond `code`, `pre`, `.katex`, `.math`, URLs, and file paths — any additional exemptions are Claude's call during implementation. No user-specific exemptions required.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — ENG-01 through ENG-08: full requirements for this phase's detection engine, style application, LTR preservation, MutationObserver, forced RTL, list fix, and inline element handling

### Research
- `.planning/research/STACK.md` — Technology decisions: custom BiDi detection (~80 lines), inline `el.style.direction` approach, zero npm dependencies, `data-hrtl-processed` marker pattern, Shadow DOM for injected UI (not needed in Phase 1)
- `.planning/research/ARCHITECTURE.md` — MutationObserver pattern with debouncing, `attributes: true` infinite loop pitfall, message passing architecture, build order
- `.planning/research/PITFALLS.md` — 14 pitfalls; critical for Phase 1: MutationObserver infinite loop (Pitfall 1), re-processing already-corrected elements (Pitfall 2), KaTeX inheritance corruption (Pitfall 13), list item RTL breaking bullets (Pitfall 9)
- `.planning/research/FEATURES.md` — Hebrew-specific nuances: nikkud (U+05B0-U+05C7), cantillation marks, Hebrew Presentation Forms (U+FB1D-U+FB4F) must be counted in 30% threshold, punctuation mirroring requires both `direction:rtl` AND `text-align:right`

### PRD Reference
- `Hebrew-RTL-Chrome-Extension-PRD.md` §5.1 — Core RTL engine functional requirements (FR-001 through FR-008), §7.2 — RTL detection algorithm specification (two-pass approach), §7.3 — DOM processing flow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project. No existing code to reuse.

### Established Patterns
- Zero-build vanilla JS: no bundler, no framework, no runtime npm dependencies (see STACK.md)
- ES2022+ features available (Chrome 88+): private class fields, `structuredClone`, spread handles emoji surrogate pairs
- Module format: ES modules (`export`/`import`) are supported in MV3 content scripts declared as `type: "module"` in manifest — but Phase 1 engine should be designed to work as importable ES modules for testability

### Integration Points
- Phase 1 output (`lib/bidi-detect.js`, `content.js` core) is imported by the full extension in Phase 2
- Unit tests (Jest) run in Node — engine functions must be pure JS with no `chrome.*` API dependencies
- MutationObserver lives in `content.js`, not in `lib/bidi-detect.js` — the detection lib is pure function logic, the observer integration is the content script entry point

</code_context>

<specifics>
## Specific Ideas

- The PRD cites Multi-RTL (v5.1.0) as a reference implementation — specifically the first-strong-character BiDi algorithm and the `data-multirtl` processed-element marker pattern. Phase 1 uses `data-hrtl-processed` (Hebrew RTL) as our equivalent.
- Unicode ranges: U+0590-U+05FF (Hebrew block including nikkud and cantillation) + U+FB1D-U+FB4F (Hebrew Presentation Forms). Both must be counted in the 30% threshold calculation, not just U+0590-U+05FF.
- Punctuation mirroring: both `direction:rtl` AND `text-align:right` are required. `text-align` alone leaves punctuation in wrong position.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-rtl-engine*
*Context gathered: 2026-03-22*
