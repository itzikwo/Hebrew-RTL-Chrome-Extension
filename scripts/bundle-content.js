#!/usr/bin/env node
/**
 * Strips the ES module `export { ... }` block from lib/picker.js and writes
 * lib/picker.browser.js — a Chrome content-script-safe version (classic script,
 * no ES module syntax).  lib/picker.js (ESM) is kept for Jest imports.
 *
 * Run: node scripts/bundle-content.js
 * Or via npm: npm run build
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const src = readFileSync(resolve(root, 'lib/picker.js'), 'utf8');

// Remove the `export { ... };` block (only the named export at EOF, not inline exports)
const out = src.replace(/^export \{[^}]*\};\n?/ms, '');

writeFileSync(resolve(root, 'lib/picker.browser.js'), out);
console.log('Built lib/picker.browser.js');
