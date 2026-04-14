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
 * generateLabel — produces a human-friendly label for a picked element.
 * Format: `tag · "first 40 chars of text"` when text is present,
 * otherwise falls back to `ancestorLabel` (tag#id / tag.class).
 *
 * Stored alongside the CSS selector so the popup can show something
 * more meaningful than raw CSS to non-technical users.
 */
function generateLabel(el) {
  if (!el) return '';
  const tag = el.tagName?.toLowerCase?.() ?? '';
  const raw = (el.textContent || '').replace(/\s+/g, ' ').trim();
  if (raw) {
    const snippet = raw.length > 40 ? raw.slice(0, 40) + '…' : raw;
    return `${tag} · "${snippet}"`;
  }
  return ancestorLabel(el);
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
// Live preview highlight
// ---------------------------------------------------------------------------

/**
 * livePreviewSelector — applies a blue outline highlight to all elements
 * matching selectorString. Clears any previous data-hrtl-highlight elements first.
 */
function livePreviewSelector(selectorString) {
  document.querySelectorAll('[data-hrtl-highlight]').forEach(el => {
    el.style.outline = '';
    el.removeAttribute('data-hrtl-highlight');
  });
  if (!selectorString) return;
  try {
    document.querySelectorAll(selectorString).forEach(el => {
      el.style.outline = '2px solid #2563EB';
      el.setAttribute('data-hrtl-highlight', '1');
    });
  } catch (_) { /* invalid selector during construction */ }
}

/**
 * clearLivePreview — removes all data-hrtl-highlight markers and inline outlines.
 */
function clearLivePreview() {
  document.querySelectorAll('[data-hrtl-highlight]').forEach(el => {
    el.style.outline = '';
    el.removeAttribute('data-hrtl-highlight');
  });
}

// ---------------------------------------------------------------------------
// Attribute utilities
// ---------------------------------------------------------------------------

/**
 * getRelevantAttributes — returns data-*, role, and aria-* attributes for an element.
 */
function getRelevantAttributes(el) {
  const attrs = [];
  for (const a of el.attributes) {
    if (a.name.startsWith('data-') || a.name === 'role' || a.name.startsWith('aria-')) {
      attrs.push({ attr: a.name, value: a.value });
    }
  }
  return attrs;
}

// ---------------------------------------------------------------------------
// Overlay
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
  clearLivePreview();
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
 * pickerOpenOverlay — creates the Selector Builder overlay after an element is clicked.
 * Replaces the Plan 01 stub with the full Shadow DOM overlay.
 *
 * @param {Element} target - the element the user clicked
 */
function pickerOpenOverlay(target) {
  _pickerState = PICKER_STATE.ELEMENT_SELECTED;
  _pickerSelectedEl = target;

  const host = document.createElement('div');
  host.id = 'hrtl-picker-overlay-host';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  _pickerOverlayHost = host;

  const chain = buildAncestorChain(target);

  // Build options HTML for ancestor dropdown
  const optionsHTML = chain.map((ancestor, i) => {
    const label = ancestorLabel(ancestor);
    return `<option value="${i}">${label}</option>`;
  }).join('');

  shadow.innerHTML = `
    <style>
      .overlay {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #FFFFFF;
        border-top: 1px solid #E5E7EB;
        box-shadow: 0 -2px 12px rgba(0,0,0,0.12);
        z-index: 2147483647;
        padding: 16px 24px;
        max-height: 320px;
        overflow-y: auto;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 13px;
        color: #111827;
        line-height: 1.4;
        box-sizing: border-box;
      }
      .title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .title {
        font-size: 14px;
        font-weight: 600;
        color: #111827;
      }
      .close-btn {
        font-size: 20px;
        color: #6B7280;
        background: none;
        border: none;
        cursor: pointer;
        min-width: 32px;
        min-height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .section {
        margin-bottom: 16px;
      }
      .label {
        font-size: 13px;
        color: #6B7280;
        margin-bottom: 4px;
      }
      select {
        width: 100%;
        font-size: 13px;
        color: #111827;
        background: #F3F4F6;
        border: 1px solid #E5E7EB;
        border-radius: 4px;
        padding: 6px 8px;
        min-height: 32px;
      }
      .filter-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
      }
      .filter-row input[type="checkbox"] {
        width: 16px;
        height: 16px;
      }
      .filter-row span {
        font-family: monospace;
        font-size: 13px;
        color: #111827;
      }
      .preview {
        font-family: monospace;
        font-size: 13px;
        color: #111827;
        background: #F3F4F6;
        padding: 6px 8px;
        border-radius: 4px;
        word-break: break-all;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
      }
      .cancel-btn {
        font-size: 13px;
        color: #DC2626;
        background: none;
        border: 1px solid #DC2626;
        border-radius: 4px;
        padding: 6px 16px;
        min-height: 32px;
        cursor: pointer;
      }
      .cancel-btn:hover {
        background: #FEE2E2;
      }
      .save-btn {
        font-size: 13px;
        color: #FFFFFF;
        background: #2563EB;
        border: none;
        border-radius: 4px;
        padding: 6px 16px;
        min-height: 32px;
        cursor: pointer;
      }
      .save-btn:hover {
        background: #1D4ED8;
      }
    </style>
    <div class="overlay" role="dialog" aria-modal="true" aria-label="Configure Selector">
      <div class="title-row">
        <span class="title">Configure Selector</span>
        <button class="close-btn" aria-label="Cancel">&#x00D7;</button>
      </div>

      <div class="section">
        <div class="label">Element level</div>
        <select id="ancestor-select">
          ${optionsHTML}
        </select>
      </div>

      <div class="section" id="class-filters-section" hidden>
        <div class="label">Class filters (optional)</div>
        <div id="class-filters-list"></div>
      </div>

      <div class="section" id="attr-filters-section" hidden>
        <div class="label">Attribute filters (optional)</div>
        <div id="attr-filters-list"></div>
      </div>

      <div class="section">
        <div class="label">Selector</div>
        <div class="preview" id="selector-preview"></div>
      </div>

      <div class="actions">
        <button class="cancel-btn">Cancel</button>
        <button class="save-btn">Save Selector</button>
      </div>
    </div>
  `;

  // --- Helper: rebuild filter sections for the given ancestor element ---
  function rebuildFilters(ancestor) {
    const classSection = shadow.getElementById('class-filters-section');
    const classList_ = Array.from(ancestor.classList);
    const classListEl = shadow.getElementById('class-filters-list');
    classListEl.innerHTML = '';
    if (classList_.length > 0) {
      classSection.hidden = false;
      classList_.forEach(cls => {
        const row = document.createElement('div');
        row.className = 'filter-row';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = true;
        cb.dataset.cls = cls;
        const label_ = document.createElement('span');
        label_.textContent = cls;
        row.appendChild(cb);
        row.appendChild(label_);
        classListEl.appendChild(row);
        cb.addEventListener('change', updateSelectorPreview);
      });
    } else {
      classSection.hidden = true;
    }

    const attrSection = shadow.getElementById('attr-filters-section');
    const relevantAttrs = getRelevantAttributes(ancestor);
    const attrListEl = shadow.getElementById('attr-filters-list');
    attrListEl.innerHTML = '';
    if (relevantAttrs.length > 0) {
      attrSection.hidden = false;
      relevantAttrs.forEach(({ attr, value }) => {
        const row = document.createElement('div');
        row.className = 'filter-row';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = false;
        cb.dataset.attr = attr;
        cb.dataset.value = value;
        const label_ = document.createElement('span');
        label_.textContent = `[${attr}="${value}"]`;
        row.appendChild(cb);
        row.appendChild(label_);
        attrListEl.appendChild(row);
        cb.addEventListener('change', updateSelectorPreview);
      });
    } else {
      attrSection.hidden = true;
    }
  }

  // --- Helper: update selector preview and live highlight ---
  function updateSelectorPreview() {
    const selectEl = shadow.getElementById('ancestor-select');
    const idx = parseInt(selectEl.value, 10);
    const ancestor = chain[idx];

    const checkedClasses = Array.from(
      shadow.querySelectorAll('#class-filters-list input[type="checkbox"]:checked')
    ).map(cb => cb.dataset.cls);

    const checkedAttrs = Array.from(
      shadow.querySelectorAll('#attr-filters-list input[type="checkbox"]:checked')
    ).map(cb => ({ attr: cb.dataset.attr, value: cb.dataset.value }));

    const selectorStr = buildSelector(ancestor, checkedClasses, checkedAttrs);
    shadow.getElementById('selector-preview').textContent = selectorStr;
    livePreviewSelector(selectorStr);
  }

  // --- Wire ancestor dropdown ---
  const selectEl = shadow.getElementById('ancestor-select');
  selectEl.addEventListener('change', () => {
    const idx = parseInt(selectEl.value, 10);
    rebuildFilters(chain[idx]);
    updateSelectorPreview();
  });

  // --- Wire Cancel and close buttons ---
  shadow.querySelector('.cancel-btn').addEventListener('click', () => pickerReset());
  shadow.querySelector('.close-btn').addEventListener('click', () => pickerReset());

  // --- Wire Save button ---
  shadow.querySelector('.save-btn').addEventListener('click', () => {
    const selectorStr = shadow.getElementById('selector-preview').textContent;
    const idx = parseInt(selectEl.value, 10);
    const ancestor = chain[idx];
    pickerSave(selectorStr, generateLabel(ancestor));
  });

  // --- Initial render ---
  rebuildFilters(chain[0]);
  updateSelectorPreview();
  selectEl.focus();
}

/**
 * pickerSave — writes the selector to chrome.storage.sync (with local fallback),
 * then resets picker state.
 *
 * @param {string} selectorString
 */
async function pickerSave(selectorString, label) {
  _pickerState = PICKER_STATE.SAVING;
  const key = `domains.${_pickerHostname}`;
  let data;
  try {
    data = await chrome.storage.sync.get(key);
  } catch (_) {
    data = await chrome.storage.local.get(key);
  }
  const config = data[key] ?? { enabled: true, selectors: [], loadDelay: 0 };
  const entry = { selector: selectorString, enabled: true, forceRTL: true };
  if (label) entry.label = label;
  config.selectors.push(entry);
  try {
    await chrome.storage.sync.set({ [key]: config });
  } catch (_) {
    await chrome.storage.local.set({ [key]: config });
  }
  clearLivePreview();
  pickerReset();
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
    pickerOpenOverlay,
    pickerSave,
    livePreviewSelector,
    clearLivePreview,
    getRelevantAttributes,
  };
}
