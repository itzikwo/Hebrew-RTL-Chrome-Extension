// popup/popup.js
// Popup controller for Hebrew RTL extension.
// Exports handler functions for testability.
// All DOM mutations go through renderPopup() to keep state consistent.

import { getDomainConfig, setDomainConfig, getAllConfigs } from '../lib/storage.js';

// Module-level state (set during initPopup, used by event handlers)
let _hostname = null;
let _config = null;
let _tabId = null;

/**
 * initPopup — entry point, called on DOMContentLoaded.
 * Resolves the active tab hostname, loads config, and renders the popup.
 */
export async function initPopup() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  _tabId = tab ? tab.id : null;

  let hostname;
  try {
    hostname = new URL(tab.url).hostname;
  } catch (_) {
    // tab.url undefined (chrome:// pages, PDFs, extension pages)
    showNotAvailable();
    return;
  }

  _hostname = hostname;
  _config = await getDomainConfig(hostname) ?? { enabled: false, selectors: [], loadDelay: 0 };

  renderPopup(_hostname, _config, _tabId);
}

// Clear highlights when popup closes (belt-and-suspenders — content.js also has a 5s auto-clear)
window.addEventListener('unload', () => {
  if (_tabId) {
    chrome.tabs.sendMessage(_tabId, { type: 'CLEAR_HIGHLIGHT' }).catch(() => {});
  }
});

/**
 * showNotAvailable — shows the not-available state and hides all other controls.
 */
function showNotAvailable() {
  const notAvailable = document.getElementById('not-available');
  if (notAvailable) notAvailable.hidden = false;

  // Hide the main controls
  const header = document.querySelector('header');
  const selectorList = document.getElementById('selector-list');
  const footer = document.querySelector('footer');
  const emptyState = document.getElementById('empty-state');

  if (header) header.style.display = 'none';
  if (selectorList) selectorList.hidden = true;
  if (footer) footer.style.display = 'none';
  if (emptyState) emptyState.hidden = true;
}

/**
 * renderPopup — renders the full popup state from hostname + config.
 * Called on init and after any mutation (toggle, delete, delete-all).
 *
 * @param {string} hostname
 * @param {object} config - { enabled, loadDelay, selectors }
 * @param {number|null} tabId
 */
export function renderPopup(hostname, config, tabId) {
  // Keep module-level state in sync (supports tests that call renderPopup directly)
  _hostname = hostname;
  _config = config;
  _tabId = tabId;

  // Domain name header
  const domainNameEl = document.getElementById('domain-name');
  if (domainNameEl) domainNameEl.textContent = hostname;

  // Master toggle
  const masterToggle = document.getElementById('master-toggle');
  if (masterToggle) {
    masterToggle.checked = config.enabled;

    // Re-attach to avoid duplicate listeners
    const newToggle = masterToggle.cloneNode(true);
    masterToggle.parentNode.replaceChild(newToggle, masterToggle);
    newToggle.addEventListener('change', async () => {
      config.enabled = newToggle.checked;
      await setDomainConfig(hostname, config);
      // Update disabled class without full re-render (avoids focus loss)
      const list = document.getElementById('selector-list');
      if (list) {
        list.classList.toggle('selector-list--disabled', !config.enabled);
      }
    });
  }

  // Selector list disabled state
  const selectorList = document.getElementById('selector-list');
  if (selectorList) {
    selectorList.classList.toggle('selector-list--disabled', !config.enabled);

    // Clear existing rows
    selectorList.innerHTML = '';

    // Render rows or show empty state
    const emptyState = document.getElementById('empty-state');
    if (config.selectors.length === 0) {
      if (emptyState) emptyState.hidden = false;
    } else {
      if (emptyState) emptyState.hidden = true;
      config.selectors.forEach((sel, index) => {
        renderSelectorRow(sel, index, config, hostname, tabId);
      });
    }
  }

  // Add Selector button handler
  const addBtn = document.getElementById('add-selector-btn');
  if (addBtn) {
    const newAddBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newAddBtn, addBtn);
    newAddBtn.addEventListener('click', () => {
      const msg = document.getElementById('add-selector-msg');
      if (msg) {
        msg.hidden = false;
        setTimeout(() => { msg.hidden = true; }, 3000);
      }
    });
  }

  // Actions menu toggle
  const actionsBtn = document.getElementById('actions-btn');
  const actionsMenu = document.getElementById('actions-menu');
  if (actionsBtn && actionsMenu) {
    const newActionsBtn = actionsBtn.cloneNode(true);
    actionsBtn.parentNode.replaceChild(newActionsBtn, actionsBtn);
    newActionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      actionsMenu.hidden = !actionsMenu.hidden;
    });
  }

  // Actions menu items
  const exportBtn = document.querySelector('[data-action="export"]');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      if (actionsMenu) actionsMenu.hidden = true;
      const allConfigs = await getAllConfigs();
      const json = JSON.stringify(allConfigs, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `hebrew-rtl-config-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const deleteAllBtn = document.querySelector('[data-action="delete-all"]');
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', () => {
      if (actionsMenu) actionsMenu.hidden = true;
      showConfirmDialog(hostname, config, tabId);
    });
  }

  const shortcutsBtn = document.querySelector('[data-action="shortcuts"]');
  if (shortcutsBtn) {
    shortcutsBtn.addEventListener('click', () => {
      if (actionsMenu) actionsMenu.hidden = true;
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });
  }

  // Close actions menu on outside click
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('actions-menu');
    if (menu && !menu.hidden) {
      const wrapper = document.querySelector('.actions-wrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        menu.hidden = true;
      }
    }
  }, { once: false });

  // Close actions menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const menu = document.getElementById('actions-menu');
      if (menu) menu.hidden = true;
    }
  });

  // Confirm dialog buttons
  const confirmCancel = document.getElementById('confirm-cancel');
  if (confirmCancel) {
    const newCancel = confirmCancel.cloneNode(true);
    confirmCancel.parentNode.replaceChild(newCancel, confirmCancel);
    newCancel.addEventListener('click', () => {
      const dialog = document.getElementById('confirm-dialog');
      if (dialog) dialog.hidden = true;
    });
  }

  const confirmOk = document.getElementById('confirm-ok');
  if (confirmOk) {
    const newOk = confirmOk.cloneNode(true);
    confirmOk.parentNode.replaceChild(newOk, confirmOk);
    newOk.addEventListener('click', async () => {
      const dialog = document.getElementById('confirm-dialog');
      if (dialog) dialog.hidden = true;
      config.selectors = [];
      await setDomainConfig(hostname, config);
      renderPopup(hostname, config, tabId);
    });
  }
}

/**
 * renderSelectorRow — creates and appends one selector row to #selector-list.
 *
 * @param {object} sel - { selector, enabled, forceRTL }
 * @param {number} index - position in config.selectors array
 * @param {object} config - full config object (mutated in-place)
 * @param {string} hostname
 * @param {number|null} tabId
 * @returns {HTMLElement} the row div
 */
export function renderSelectorRow(sel, index, config, hostname, tabId) {
  const row = document.createElement('div');
  row.className = 'selector-row';

  // Selector text
  const span = document.createElement('span');
  span.className = 'selector-text';
  span.textContent = sel.selector;
  span.title = sel.selector;
  row.appendChild(span);

  // Enable/disable checkbox
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = sel.enabled;
  checkbox.addEventListener('change', async () => {
    config.selectors[index].enabled = checkbox.checked;
    await setDomainConfig(hostname, config);
  });
  row.appendChild(checkbox);

  // Hover: send highlight/clear messages to content script
  row.addEventListener('mouseenter', async () => {
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'HIGHLIGHT_SELECTOR', selector: sel.selector });
    } catch (_) { /* content script not present — silent no-op */ }
  });
  row.addEventListener('mouseleave', async () => {
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'CLEAR_HIGHLIGHT' });
    } catch (_) {}
  });

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = '✕';
  deleteBtn.title = 'Remove selector';
  deleteBtn.setAttribute('aria-label', 'Remove selector');
  deleteBtn.addEventListener('click', async () => {
    config.selectors.splice(index, 1);
    await setDomainConfig(hostname, config);
    renderPopup(hostname, config, tabId);
  });
  row.appendChild(deleteBtn);

  const selectorList = document.getElementById('selector-list');
  if (selectorList) selectorList.appendChild(row);

  return row;
}

/**
 * showConfirmDialog — shows the confirm dialog with domain-specific text.
 */
function showConfirmDialog(hostname, config, tabId) {
  const dialog = document.getElementById('confirm-dialog');
  const confirmText = document.getElementById('confirm-text');
  if (confirmText) {
    confirmText.textContent = `Delete all selectors for ${hostname}? This cannot be undone.`;
  }
  if (dialog) dialog.hidden = false;
}

// Entry point
document.addEventListener('DOMContentLoaded', initPopup);
