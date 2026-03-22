---
plan: 01-01
status: complete
date: 2026-03-22
---

## Result

`npm test -- --testPathPatterns=bidi-detect --no-coverage`: **22 passed, 22 total**

## lib/bidi-detect.js

52 lines. Three exported functions: `detectDirection`, `isExemptElement`, `getFirstSubstantiveText`.

## Edge cases discovered during TDD

**Space not in SKIP_RE (Pass 1 bug):**
`'... שלום'` returned 'ltr' because space (U+0020) was not in the neutral-skip list. The spec's SKIP_RE covered `\u0021-\u002F` (starting at `!`), omitting U+0020. Fixed by adding `\s` to SKIP_RE.

**Pass 1 LTR short-circuit broke mixed-content threshold (algorithm bug):**
The spec's code had `return 'ltr'` when the first strong character was LTR, but test ENG-03 requires `'Hi שלום world'` (first strong = 'H') to return 'rtl'. The correct behavior: Pass 1 only short-circuits for **Hebrew**. LTR first-strong hits `break` and falls through to the 30% threshold check. Comments in the spec said "Only reached when all characters were neutral" — that was wrong; LTR first-strong also falls through.

**Test string correction — ENG-03 threshold test:**
The original test string `'Hello שלום world'` has 4/14 = 28.6% Hebrew letters — below the 30% threshold. Comment claimed "roughly 33%" (math error). Fixed test to `'Hi שלום world'` (4/11 = 36.4% ≥ 30%).

**jsdom docblock requires block comment in Jest 30 ESM:**
`// @jest-environment jsdom` (line comment) was not picked up. Required `/** @jest-environment jsdom */` (block comment). Also `jest-environment-jsdom` must be installed as a separate devDependency (separate since Jest 27).

## getFirstSubstantiveText — jsdom handling

No special handling needed. `document.createTreeWalker` works correctly in jsdom. The function uses `NodeFilter.SHOW_TEXT` which is available in the jsdom global.

## Deviations from plan

- Algorithm: Pass 1 uses `break` (not `return 'ltr'`) for LTR first-strong characters
- Test: ENG-03 string corrected to actually represent ≥30% Hebrew content
- jsdom: used block-comment docblock; installed `jest-environment-jsdom` package
