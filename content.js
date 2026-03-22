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

// ---- MutationObserver — Plan 03 ----

let _observer = null;
let _debounceTimer = null;
const _pendingNodes = new Set();

export function startObserver(_selectors, selectorConfig) {
  if (_observer) {
    _observer.disconnect();
    _observer = null;
  }

  _observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE && !node.hasAttribute(MARKER)) {
            _pendingNodes.add(node);
          }
        });
      }
      // characterData: text of existing node changed (e.g. streaming tokens)
      // Remove MARKER to allow bidirectional re-evaluation (LTR→RTL or RTL→LTR)
      if (mutation.type === 'characterData' && mutation.target.parentElement) {
        const el = mutation.target.parentElement;
        el.removeAttribute(MARKER);
        _pendingNodes.add(el);
      }
    }

    // Debounce: batch all mutations within 100ms into one processing call
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
      const nodes = [..._pendingNodes];
      _pendingNodes.clear();
      for (const node of nodes) {
        if (node.hasAttribute(MARKER)) continue;
        processElement(node, selectorConfig);
        node.querySelectorAll?.(`*:not([${MARKER}])`).forEach(child => {
          processElement(child, selectorConfig);
        });
      }
    }, DEBOUNCE_MS);
  });

  // CRITICAL: attributes:true must NOT be set — setAttribute(MARKER) would
  // trigger attribute mutations → infinite loop.
  _observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

export function stopObserver() {
  clearTimeout(_debounceTimer);
  _pendingNodes.clear();
  if (_observer) {
    _observer.disconnect();
    _observer = null;
  }
}
