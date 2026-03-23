// lib/picker.js
// Phase 4: Visual Element Picker state machine and selector utilities.
//
// This file serves a dual role:
//   1. ES module exports — consumed by Jest tests and any ES module consumers.
//   2. window._hrtlPicker namespace — loaded as a content_script (plain script)
//      before content.js, making the picker API available to content.js.

// ---------------------------------------------------------------------------
// State enum
// ---------------------------------------------------------------------------

const PICKER_STATE = {
  INACTIVE: 'INACTIVE',
  HOVERING: 'HOVERING',
  ELEMENT_SELECTED: 'ELEMENT_SELECTED',
  SAVING: 'SAVING',
};

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let _pickerState = PICKER_STATE.INACTIVE;
let _pickerHostname = null;
let _pickerHoveredEl = null;
let _pickerSelectedEl = null;
let _pickerSavedOutline = '';
let _pickerSavedOutlineOffset = '';
let _pickerBannerHost = null;
let _pickerOverlayHost = null;
let _pickerTooltipHost = null;
let _pickerMoveTimer = null;

// ---------------------------------------------------------------------------
// Selector utilities
// ---------------------------------------------------------------------------

/**
 * generateSelector — produces a short CSS selector string for an element.
 * Priority: id > classes > bare tag.
 */
function generateSelector(el) {
  if (el.id) {
    return `#${CSS.escape(el.id)}`;
  }
  const tag = el.tagName.toLowerCase();
  if (el.classList && el.classList.length > 0) {
    const classes = Array.from(el.classList)
      .map(cls => `.${CSS.escape(cls)}`)
      .join('');
    return `${tag}${classes}`;
  }
  return tag;
}

/**
 * buildAncestorChain — returns an array [el, parent, grandparent, ...]
 * starting from el, stopping before document.body, max 10 entries.
 */
function buildAncestorChain(el) {
  const chain = [];
  let current = el;
  while (current && current !== document.body && chain.length < 10) {
    chain.push(current);
    current = current.parentElement;
  }
  return chain;
}

/**
 * ancestorLabel — short label for the ancestor dropdown.
 * Format: tag#id  OR  tag.class1.class2  OR  tag
 */
function ancestorLabel(el) {
  const tag = el.tagName.toLowerCase();
  if (el.id) {
    return `${tag}#${el.id}`;
  }
  if (el.classList && el.classList.length > 0) {
    const classes = Array.from(el.classList).join('.');
    return `${tag}.${classes}`;
  }
  return tag;
}

/**
 * buildSelector — builds a CSS selector from an ancestor element plus
 * arrays of chosen classes and attributes.
 *
 * @param {Element} ancestor
 * @param {string[]} enabledClasses
 * @param {Array<{attr: string, value: string}>} enabledAttrs
 * @returns {string}
 */
function buildSelector(ancestor, enabledClasses, enabledAttrs) {
  let selector = ancestor.tagName.toLowerCase();
  if (ancestor.id) {
    selector += `#${CSS.escape(ancestor.id)}`;
  }
  for (const cls of enabledClasses) {
    selector += `.${CSS.escape(cls)}`;
  }
  for (const { attr, value } of enabledAttrs) {
    selector += `[${attr}="${CSS.escape(value)}"]`;
  }
  return selector;
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

function injectPickerBanner() {
  if (_pickerBannerHost) return;

  const host = document.createElement('div');
  host.id = 'hrtl-picker-banner-host';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .hrtl-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: #FFFFFF;
      border-bottom: 1px solid #E5E7EB;
      border-left: 4px solid #F59E0B;
      font: 13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #111827;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      padding: 0 16px;
      box-sizing: border-box;
    }
  `;
  shadow.appendChild(style);

  const banner = document.createElement('div');
  banner.className = 'hrtl-banner';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.textContent = 'Click an element to configure Hebrew RTL — Esc to cancel';
  shadow.appendChild(banner);

  _pickerBannerHost = host;
}

function removePickerBanner() {
  if (_pickerBannerHost) {
    _pickerBannerHost.remove();
    _pickerBannerHost = null;
  }
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

function injectPickerTooltip(el, clientX, clientY) {
  if (!_pickerTooltipHost) {
    const host = document.createElement('div');
    host.id = 'hrtl-picker-tooltip-host';
    document.body.appendChild(host);
    _pickerTooltipHost = host;
    _pickerTooltipHost.attachShadow({ mode: 'open' });
  }

  const shadow = _pickerTooltipHost.shadowRoot;
  shadow.innerHTML = '';

  const style = document.createElement('style');
  style.textContent = `
    .hrtl-tooltip {
      position: fixed;
      background: #111827;
      color: #FFFFFF;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 13px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.4;
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      z-index: 2147483646;
      pointer-events: none;
    }
  `;
  shadow.appendChild(style);

  const tooltip = document.createElement('div');
  tooltip.className = 'hrtl-tooltip';

  // Position: 8px above element or 8px below if near viewport top
  const rect = el.getBoundingClientRect();
  let top;
  if (rect.top < 50) {
    top = rect.bottom + 8;
  } else {
    top = rect.top - 8 - 28; // 28px approx tooltip height
  }

  // Clamp left so tooltip doesn't overflow viewport right edge
  const left = Math.min(clientX, window.innerWidth - 320 - 8);

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${Math.max(0, left)}px`;

  tooltip.innerHTML = `${ancestorLabel(el)}<br>${generateSelector(el)}`;
  shadow.appendChild(tooltip);
}

function removePickerTooltip() {
  if (_pickerTooltipHost) {
    _pickerTooltipHost.remove();
    _pickerTooltipHost = null;
  }
}

// ---------------------------------------------------------------------------
// Overlay (stub — Plan 02 will fill this in)
// ---------------------------------------------------------------------------

function removePickerOverlay() {
  if (_pickerOverlayHost) {
    _pickerOverlayHost.remove();
    _pickerOverlayHost = null;
  }
}

// ---------------------------------------------------------------------------
// Outline
// ---------------------------------------------------------------------------

function applyPickerOutline(el) {
  _pickerSavedOutline = el.style.outline;
  _pickerSavedOutlineOffset = el.style.outlineOffset;
  el.style.outline = '2px solid #F59E0B';
  el.style.outlineOffset = '2px';
  _pickerHoveredEl = el;
}

function removePickerOutline() {
  if (_pickerHoveredEl) {
    _pickerHoveredEl.style.outline = _pickerSavedOutline;
    _pickerHoveredEl.style.outlineOffset = _pickerSavedOutlineOffset;
    _pickerHoveredEl = null;
    _pickerSavedOutline = '';
    _pickerSavedOutlineOffset = '';
  }
}

// ---------------------------------------------------------------------------
// Event handlers (named functions for addEventListener/removeEventListener)
// ---------------------------------------------------------------------------

function onPickerMouseMove(e) {
  clearTimeout(_pickerMoveTimer);
  _pickerMoveTimer = setTimeout(() => {
    const composedPath = e.composedPath ? e.composedPath() : [e.target];
    const target = composedPath[0];

    // Skip if target is inside our own picker UI hosts
    if (_pickerBannerHost && composedPath.includes(_pickerBannerHost)) return;
    if (_pickerTooltipHost && composedPath.includes(_pickerTooltipHost)) return;
    if (_pickerOverlayHost && composedPath.includes(_pickerOverlayHost)) return;

    if (target !== _pickerHoveredEl) {
      removePickerOutline();
      applyPickerOutline(target);
      injectPickerTooltip(target, e.clientX, e.clientY);
    }
  }, 16);
}

function onPickerClick(e) {
  const composedPath = e.composedPath ? e.composedPath() : [e.target];

  // Allow clicks within our own picker UI
  if (_pickerBannerHost && composedPath.includes(_pickerBannerHost)) return;
  if (_pickerOverlayHost && composedPath.includes(_pickerOverlayHost)) return;

  e.stopPropagation();
  e.preventDefault();

  if (_pickerState !== PICKER_STATE.HOVERING) return;

  const target = composedPath[0];
  removePickerTooltip();
  _pickerSelectedEl = target;
  _pickerState = PICKER_STATE.ELEMENT_SELECTED;
  pickerOpenOverlay(target);
}

function onPickerKeyDown(e) {
  if (e.key === 'Escape') {
    pickerReset();
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * pickerActivate — transitions to HOVERING state and sets up all picker UI.
 *
 * @param {string} hostname - the domain being configured
 */
function pickerActivate(hostname) {
  _pickerState = PICKER_STATE.HOVERING;
  _pickerHostname = hostname;
  injectPickerBanner();
  document.body.style.cursor = 'crosshair';
  document.addEventListener('mousemove', onPickerMouseMove, { passive: true });
  document.addEventListener('click', onPickerClick, true);
  document.addEventListener('keydown', onPickerKeyDown, true);
}

/**
 * pickerReset — fully resets all picker state and removes all picker UI.
 * Called on Escape, picker deactivation, or tab visibility change.
 */
function pickerReset() {
  _pickerState = PICKER_STATE.INACTIVE;
  removePickerBanner();
  removePickerTooltip();
  removePickerOverlay();
  removePickerOutline();
  document.body.style.cursor = '';
  document.removeEventListener('mousemove', onPickerMouseMove);
  document.removeEventListener('click', onPickerClick, true);
  document.removeEventListener('keydown', onPickerKeyDown, true);
  clearTimeout(_pickerMoveTimer);
  _pickerMoveTimer = null;
  _pickerSelectedEl = null;
  _pickerHostname = null;
}

/**
 * pickerOpenOverlay — placeholder stub for Plan 02.
 * Plan 02 will replace this with the full Selector Builder overlay.
 *
 * @param {Element} target - the element the user clicked
 */
function pickerOpenOverlay(target) {
  console.log('[Hebrew RTL] Selector Builder will open here for:', generateSelector(target));
}

/**
 * getPickerState — returns current picker state (for testing).
 */
function getPickerState() {
  return _pickerState;
}

// ---------------------------------------------------------------------------
// Exports (ES module) + window namespace bridge (content script)
// ---------------------------------------------------------------------------

export {
  PICKER_STATE,
  generateSelector,
  buildAncestorChain,
  ancestorLabel,
  buildSelector,
  pickerActivate,
  pickerReset,
  getPickerState,
  pickerOpenOverlay,
};

if (typeof window !== 'undefined') {
  window._hrtlPicker = {
    PICKER_STATE,
    generateSelector,
    buildAncestorChain,
    ancestorLabel,
    buildSelector,
    pickerActivate,
    pickerReset,
    getPickerState,
  };
}
