---
plan: 01-00
status: complete
date: 2026-03-22
---

## What was created

**package.json** — initialized with `npm init -y`, then edited to add:
- `"type": "module"` — enables native ESM import/export
- `"test": "NODE_OPTIONS=--experimental-vm-modules npx jest"` — Jest ESM runner
- `"jest"` config block: `transform: {}`, `testEnvironment: "node"`, `testMatch: ["**/tests/**/*.test.js"]`
- `"devDependencies": { "jest": "^30.3.0" }` — installed via npm install

**tests/bidi-detect.test.js** — `@jest-environment node`, imports from `../lib/bidi-detect.js`, stubs for ENG-01, ENG-03, ENG-04, ENG-08

**tests/content.test.js** — `@jest-environment jsdom`, imports from `../content.js`, stubs for ENG-02, ENG-04, ENG-06, ENG-07

**tests/mutation.test.js** — `@jest-environment jsdom`, imports from `../content.js`, stubs for ENG-05

## Jest ESM config decision

- `"transform": {}` — disables Babel; Jest uses native ESM loader
- `NODE_OPTIONS=--experimental-vm-modules` — enables Jest's native ESM support
- No `@babel/core`, `babel-jest`, or `@babel/preset-env` installed

## Deviations

- **Jest version**: npm resolved `jest@30.3.0` (not 29 as specified). Jest 30 supports the same `NODE_OPTIONS=--experimental-vm-modules` ESM approach. No behavioral difference for this scaffold.

## npm test output after scaffold

```
Test Suites: 3 failed, 3 total
Tests:       0 total
```

All 3 suites fail with `Cannot find module` — correct Wave 0 state. No config parse errors.
