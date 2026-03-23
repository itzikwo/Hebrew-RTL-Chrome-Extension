// content.js
// Phase 1: Per-element RTL style application and detection.
// Phase 2: Storage integration, loadDelay, reactive config updates, message handling.
//
// NOTE: This file is loaded as a plain content script (no ES module imports).
// The bidi-detect functions are inlined here from lib/bidi-detect.js so that
// Chrome can load this file without "type":"module" in content_scripts.
// lib/bidi-detect.js is kept as a separate module for use by background.js
// and for direct Jest imports.

// ---- Inlined from lib/bidi-detect.js ----

// U+0590-05FF: Hebrew block (letters, nikkud, cantillation, punctuation)
// U+FB1D-FB4F: Hebrew Presentation Forms (legacy word processor output)
const _HEBREW_RE = /[\u0590-\u05FF\uFB1D-\uFB4F]/;

// Hebrew letters and presentation forms used in 30% threshold calculation
const _HEBREW_LETTER_RE = /[\u05D0-\u05EA\u05F0-\u05F4\uFB1D-\uFB4F]/;

// Characters to skip in first-strong-character pass (neutrals)
const _SKIP_RE = /[\s\d\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u00BF]|[\uD800-\uDFFF]/;

function _detectDirection(text) {
  const chars = [...text];
  for (const ch of chars) {
    if (_SKIP_RE.test(ch)) continue;
    if (_HEBREW_RE.test(ch)) return 'rtl';
    break;
  }
  const letterCount = chars.filter(ch => /\p{L}/u.test(ch)).length;
  if (letterCount === 0) return 'ltr';
  const hebrewCount = chars.filter(ch => _HEBREW_LETTER_RE.test(ch)).length;
  return hebrewCount / letterCount >= 0.30 ? 'rtl' : 'ltr';
}

function _isExemptElement(el) {
  const tag = el.tagName?.toLowerCase();
  if (['code', 'pre', 'kbd', 'samp'].includes(tag)) return true;
  if (el.matches?.('.katex, .math, [class*="math"], [class*="latex"]')) return true;
  if (el.closest?.('.katex, .math, pre, code')) return true;
  const text = el.textContent?.trim() ?? '';
  if (/^(https?|ftp|file):\/\//i.test(text)) return true;
  if (/^\/[a-z0-9._\-/]+$/i.test(text)) return true;
  return false;
}

function _getFirstSubstantiveText(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent.trim();
    if (text.length > 0) return text;
  }
  return el.textContent?.trim() ?? '';
}

// ---- Phase 1: Core RTL engine ----

const MARKER = 'data-hrtl-processed';
const DEBOUNCE_MS = 100;

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
function applyDirection(el, dir) {
  if (dir === 'rtl') {
    el.style.setProperty('direction', 'rtl', 'important');
    el.style.setProperty('text-align', 'right', 'important');
    if (el.tagName === 'LI') {
      el.style.setProperty('list-style-position', 'inside', 'important');
    }
  } else {
    el.style.removeProperty('direction');
    el.style.removeProperty('text-align');
    el.style.removeProperty('list-style-position');
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
function processElement(el, selectorConfig) {
  if (selectorConfig?.forceRTL) {
    applyDirection(el, 'rtl');
    return;
  }
  if (_isExemptElement(el)) return;
  const text = _getFirstSubstantiveText(el);
  const dir = _detectDirection(text);
  applyDirection(el, dir);
}

// ---- MutationObserver — Plan 03 ----

let _observer = null;
let _debounceTimer = null;
const _pendingNodes = new Set();

function startObserver(_selectors, selectorConfig) {
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

function stopObserver() {
  clearTimeout(_debounceTimer);
  _pendingNodes.clear();
  if (_observer) {
    _observer.disconnect();
    _observer = null;
  }
}

// ---- Phase 2: Storage Integration ----

let _config = null;
let _enabled = false;

function processAllSelectors(selectors) {
  if (!selectors || !Array.isArray(selectors)) return;
  for (const sel of selectors) {
    if (!sel.enabled) continue;
    const selectorConfig = { forceRTL: sel.forceRTL };
    try {
      const elements = document.querySelectorAll(sel.selector);
      elements.forEach(el => {
        if (!el.hasAttribute(MARKER)) {
          processElement(el, selectorConfig);
        }
      });
    } catch (e) {
      // Invalid selector -- skip silently
      console.warn(`[Hebrew RTL] Invalid selector: ${sel.selector}`, e.message);
    }
  }
}

function buildSelectorConfig(selectors) {
  // Build a single selectorConfig object for the observer.
  // If ANY enabled selector has forceRTL, pass forceRTL to the observer.
  const hasForceRTL = selectors?.some(s => s.enabled && s.forceRTL) ?? false;
  return { forceRTL: hasForceRTL };
}

async function init() {
  const hostname = location.hostname;
  const key = `domains.${hostname}`;
  const data = await chrome.storage.sync.get(key)
    .catch(() => chrome.storage.local.get(key));
  _config = data[key] ?? null;

  if (!_config?.enabled) return;

  if (_config.loadDelay > 0) {
    await new Promise(r => setTimeout(r, _config.loadDelay));
  }

  _enabled = true;
  processAllSelectors(_config.selectors);

  const selectorString = _config.selectors
    .filter(s => s.enabled)
    .map(s => s.selector)
    .join(', ');
  startObserver(selectorString, buildSelectorConfig(_config.selectors));
}

// Guard chrome API calls so Jest imports of content.js do not throw when
// chrome is undefined (content.test.js and mutation.test.js set up no chrome mock).
if (typeof chrome !== 'undefined') {
  // Reactive update when config changes (CFG-04 auto-save)
  chrome.storage.onChanged.addListener((changes, _areaName) => {
    const key = `domains.${location.hostname}`;
    if (changes[key]) {
      _config = changes[key].newValue;
      _enabled = _config?.enabled ?? false;
      if (_enabled) {
        processAllSelectors(_config.selectors);
        const selectorString = _config.selectors
          .filter(s => s.enabled)
          .map(s => s.selector)
          .join(', ');
        startObserver(selectorString, buildSelectorConfig(_config.selectors));
      } else {
        stopObserver();
      }
    }
  });

  // Auto-reset picker when tab becomes hidden (e.g. popup opens over the tab)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && typeof window._hrtlPicker !== 'undefined') {
      const state = window._hrtlPicker.getPickerState();
      if (state !== window._hrtlPicker.PICKER_STATE.INACTIVE) {
        window._hrtlPicker.pickerReset();
      }
    }
  });

  // Handle keyboard shortcut toggle from background.js
  let _highlightTimer = null;
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'TOGGLE_DOMAIN') {
      const key = `domains.${location.hostname}`;
      chrome.storage.sync.get(key).then(data => {
        const config = data[key] ?? { enabled: false, selectors: [], loadDelay: 0 };
        config.enabled = !config.enabled;
        chrome.storage.sync.set({ [key]: config })
          .catch(() => chrome.storage.local.set({ [key]: config }));
      });
      sendResponse({ toggled: true });
    }
    if (msg.type === 'PING') {
      sendResponse({ ready: true });
    }
    if (msg.type === 'HIGHLIGHT_SELECTOR') {
      // Clear any existing highlights first
      document.querySelectorAll('[data-hrtl-highlight]').forEach(el => {
        el.style.outline = '';
        el.removeAttribute('data-hrtl-highlight');
      });
      try {
        document.querySelectorAll(msg.selector).forEach(el => {
          el.style.outline = '2px solid #2563EB';
          el.setAttribute('data-hrtl-highlight', '1');
        });
      } catch (_) { /* invalid selector — silently ignore */ }
      // Belt-and-suspenders: auto-clear after 5 seconds if no new message arrives
      clearTimeout(_highlightTimer);
      _highlightTimer = setTimeout(() => {
        document.querySelectorAll('[data-hrtl-highlight]').forEach(el => {
          el.style.outline = '';
          el.removeAttribute('data-hrtl-highlight');
        });
      }, 5000);
      sendResponse({ ok: true });
    }
    if (msg.type === 'CLEAR_HIGHLIGHT') {
      clearTimeout(_highlightTimer);
      document.querySelectorAll('[data-hrtl-highlight]').forEach(el => {
        el.style.outline = '';
        el.removeAttribute('data-hrtl-highlight');
      });
      sendResponse({ ok: true });
    }
    if (msg.type === 'PICKER_ACTIVATE') {
      if (typeof window._hrtlPicker !== 'undefined') {
        window._hrtlPicker.pickerActivate(msg.hostname);
      }
      sendResponse({ ok: true });
    }
    if (msg.type === 'PICKER_DEACTIVATE') {
      if (typeof window._hrtlPicker !== 'undefined') {
        window._hrtlPicker.pickerReset();
      }
      sendResponse({ ok: true });
    }
    return true; // Keep message channel open for async response
  });

  // Bootstrap
  init();
}
