// lib/rtl-engine.js
// ES module wrapper around the RTL engine functions for Jest test imports.
// content.js inlines these functions as plain JS (no export) for Chrome compatibility.
import { detectDirection, isExemptElement, getFirstSubstantiveText } from './bidi-detect.js';

export const MARKER = 'data-hrtl-processed';
export const DEBOUNCE_MS = 100;

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
      if (mutation.type === 'characterData' && mutation.target.parentElement) {
        const el = mutation.target.parentElement;
        el.removeAttribute(MARKER);
        _pendingNodes.add(el);
      }
    }
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
