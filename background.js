// background.js — MV3 service worker (event-driven, stateless)
// CRITICAL: No module-scope state. Every handler reads fresh from chrome.storage.
// Handler logic is in lib/background-handlers.js for testability.
import { DEFAULT_DOMAINS } from './config/default-sites.js';
import { handleInstalled, handleCommand, updateBadgeForActiveTab } from './lib/background-handlers.js';

// Seed pre-configured sites on first install only
chrome.runtime.onInstalled.addListener((details) => {
  handleInstalled(details, DEFAULT_DOMAINS);
});

// Route keyboard shortcut to active tab's content script
chrome.commands.onCommand.addListener((command) => {
  handleCommand(command);
});

// Update badge when storage changes
chrome.storage.onChanged.addListener(() => {
  updateBadgeForActiveTab();
});

// Update badge when user switches tabs
chrome.tabs.onActivated.addListener(() => {
  updateBadgeForActiveTab();
});
