// lib/background-handlers.js
// Exported handler functions for background.js service worker.
// Extracted for testability — background.js imports and registers these with Chrome events.
// CRITICAL: No module-scope state. Every handler reads fresh from chrome.storage.

/**
 * Handles chrome.runtime.onInstalled events.
 * On first install, seeds all default domain configs that don't already exist.
 * On update, does nothing (preserves user customizations).
 *
 * @param {{ reason: string }} details - Chrome's onInstalled detail object
 * @param {Record<string, object>} defaultDomains - DEFAULT_DOMAINS config map
 */
export async function handleInstalled({ reason }, defaultDomains) {
  if (reason !== 'install') return;

  const existing = await chrome.storage.sync.get(null).catch(() => ({}));
  const toSet = {};
  for (const [hostname, config] of Object.entries(defaultDomains)) {
    const key = `domains.${hostname}`;
    if (!(key in existing)) {
      toSet[key] = config;
    }
  }
  if (Object.keys(toSet).length > 0) {
    await chrome.storage.sync.set(toSet).catch(() =>
      chrome.storage.local.set(toSet)
    );
  }
}

/**
 * Handles chrome.commands.onCommand events.
 * Routes 'toggle-rtl' command to the active tab's content script.
 * Silently catches errors when content script is not present (chrome:// pages, PDFs).
 *
 * @param {string} command - The command name from Chrome
 */
export async function handleCommand(command) {
  if (command !== 'toggle-rtl') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_DOMAIN' });
  } catch (_) {
    // Content script not injected on this page (chrome:// pages, PDFs, etc.)
  }
}

/**
 * Reads the active tab's domain config from storage and updates the extension badge.
 * Badge shows 'ON' when domain is enabled, '' when disabled.
 * Badge color is always #2563EB (blue).
 * Called on storage changes and tab activation.
 */
export async function updateBadgeForActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !tab.id) return;
  let hostname;
  try {
    hostname = new URL(tab.url).hostname;
  } catch (_) {
    return;
  }
  const key = `domains.${hostname}`;
  const data = await chrome.storage.sync.get(key).catch(() =>
    chrome.storage.local.get(key)
  );
  const enabled = data[key]?.enabled ?? false;
  await chrome.action.setBadgeText({ text: enabled ? 'ON' : '', tabId: tab.id });
  await chrome.action.setBadgeBackgroundColor({ color: '#2563EB', tabId: tab.id });
}
