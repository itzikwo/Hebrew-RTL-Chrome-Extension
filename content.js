// content.js
// Phase 1: Per-element RTL style application and detection.
// MutationObserver integration added in Plan 03.
import { detectDirection, isExemptElement, getFirstSubstantiveText } from './lib/bidi-detect.js';

export const MARKER = 'data-hrtl-processed';
export const DEBOUNCE_MS = 100;

/**
 * Apply or clear RTL/LTR inline styles on an element.
 * Always marks element with data-hrtl-processed.
 *
 * RTL: sets direction:rtl, text-align:right.
 *      For <li>: also sets list-style-position:inside (prevents bullet rendering outside boundary).
 * LTR: clears all three properties (preserves page defaults rather than overriding with 'ltr').
 *
 * @param {Element} el
 * @param {'rtl'|'ltr'} dir
 */
export function applyDirection(el, dir) {
  if (dir === 'rtl') {
    el.style.direction = 'rtl';
    el.style.textAlign = 'right';
    if (el.tagName === 'LI') {
      el.style.listStylePosition = 'inside';
    }
  } else {
    el.style.direction = '';
    el.style.textAlign = '';
    el.style.listStylePosition = '';
  }
  el.setAttribute(MARKER, '1');
}

/**
 * Determine and apply text direction to a single element.
 *
 * Processing order:
 * 1. forceRTL: apply RTL immediately, bypassing both detection and exemption (ENG-06).
 * 2. isExemptElement: skip without touching element (ENG-04).
 * 3. Detect from first substantive text, then apply (ENG-01/03/08).
 *
 * @param {Element} el
 * @param {{ forceRTL?: boolean } | null} selectorConfig
 */
export function processElement(el, selectorConfig) {
  if (selectorConfig?.forceRTL) {
    applyDirection(el, 'rtl');
    return;
  }
  if (isExemptElement(el)) return;
  const text = getFirstSubstantiveText(el);
  const dir = detectDirection(text);
  applyDirection(el, dir);
}

// ---- MutationObserver stubs — implemented in Plan 03 ----

let _observer = null;

export function startObserver(selectors, selectorConfig) {
  // Plan 03 implementation
}

export function stopObserver() {
  if (_observer) {
    _observer.disconnect();
    _observer = null;
  }
}
