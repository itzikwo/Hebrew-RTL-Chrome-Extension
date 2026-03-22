// tests/background.test.js
// Tests for background service worker handlers.
// Strategy: handler logic lives in lib/background-handlers.js (exported functions),
// background.js imports them and registers with Chrome's event listeners.
// This avoids the Jest ESM caching problem with top-level listener registration.

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createChromeMock } from './__mocks__/chrome.js';
import {
  handleInstalled,
  handleCommand,
  updateBadgeForActiveTab
} from '../lib/background-handlers.js';

const DEFAULT_DOMAINS_MOCK = {
  'chatgpt.com': { enabled: true, loadDelay: 0, selectors: [{ id: 's1', selector: '.test', enabled: true, forceRTL: false }] },
  'claude.ai': { enabled: true, loadDelay: 0, selectors: [] },
  'gemini.google.com': { enabled: true, loadDelay: 500, selectors: [] },
  'notebooklm.google.com': { enabled: true, loadDelay: 500, selectors: [] },
  'app.slack.com': { enabled: true, loadDelay: 1000, selectors: [] }
};

describe('background.js', () => {
  beforeEach(() => {
    globalThis.chrome = createChromeMock();
  });

  describe('onInstalled', () => {
    it('seeds default domains on reason === install', async () => {
      // Storage is empty initially
      chrome.storage.sync.get.mockResolvedValue({});

      await handleInstalled({ reason: 'install' }, DEFAULT_DOMAINS_MOCK);

      expect(chrome.storage.sync.set).toHaveBeenCalledTimes(1);
      const setArg = chrome.storage.sync.set.mock.calls[0][0];
      expect(Object.keys(setArg)).toHaveLength(5);
      expect(setArg['domains.chatgpt.com']).toEqual(DEFAULT_DOMAINS_MOCK['chatgpt.com']);
      expect(setArg['domains.claude.ai']).toEqual(DEFAULT_DOMAINS_MOCK['claude.ai']);
      expect(setArg['domains.gemini.google.com']).toEqual(DEFAULT_DOMAINS_MOCK['gemini.google.com']);
      expect(setArg['domains.notebooklm.google.com']).toEqual(DEFAULT_DOMAINS_MOCK['notebooklm.google.com']);
      expect(setArg['domains.app.slack.com']).toEqual(DEFAULT_DOMAINS_MOCK['app.slack.com']);
    });

    it('does NOT overwrite existing keys on install', async () => {
      // One domain already configured by user
      chrome.storage.sync.get.mockResolvedValue({
        'domains.chatgpt.com': { enabled: false, loadDelay: 0, selectors: [] }
      });

      await handleInstalled({ reason: 'install' }, DEFAULT_DOMAINS_MOCK);

      expect(chrome.storage.sync.set).toHaveBeenCalledTimes(1);
      const setArg = chrome.storage.sync.set.mock.calls[0][0];
      // Should only set the 4 domains that don't exist yet
      expect(Object.keys(setArg)).toHaveLength(4);
      expect('domains.chatgpt.com' in setArg).toBe(false);
    });

    it('does NOT seed on reason === update', async () => {
      await handleInstalled({ reason: 'update' }, DEFAULT_DOMAINS_MOCK);

      expect(chrome.storage.sync.get).not.toHaveBeenCalled();
      expect(chrome.storage.sync.set).not.toHaveBeenCalled();
    });
  });

  describe('onCommand toggle-rtl', () => {
    it('sends TOGGLE_DOMAIN message to active tab', async () => {
      chrome.tabs.query.mockResolvedValue([{ id: 42, url: 'https://chatgpt.com/' }]);

      await handleCommand('toggle-rtl');

      expect(chrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(42, { type: 'TOGGLE_DOMAIN' });
    });

    it('catches error when content script not present', async () => {
      chrome.tabs.query.mockResolvedValue([{ id: 99, url: 'chrome://extensions/' }]);
      chrome.tabs.sendMessage.mockRejectedValue(new Error('Could not establish connection'));

      // Should not throw
      await expect(handleCommand('toggle-rtl')).resolves.toBeUndefined();
    });
  });

  describe('updateBadgeForActiveTab', () => {
    it('sets badge text ON when domain is enabled', async () => {
      chrome.tabs.query.mockResolvedValue([{ id: 1, url: 'https://chatgpt.com/' }]);
      chrome.storage.sync.get.mockResolvedValue({
        'domains.chatgpt.com': { enabled: true, loadDelay: 0, selectors: [] }
      });

      await updateBadgeForActiveTab();

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'ON', tabId: 1 });
    });

    it('sets badge text empty when domain is disabled', async () => {
      chrome.tabs.query.mockResolvedValue([{ id: 1, url: 'https://chatgpt.com/' }]);
      chrome.storage.sync.get.mockResolvedValue({
        'domains.chatgpt.com': { enabled: false, loadDelay: 0, selectors: [] }
      });

      await updateBadgeForActiveTab();

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 1 });
    });

    it('sets badge background color to #2563EB', async () => {
      chrome.tabs.query.mockResolvedValue([{ id: 1, url: 'https://chatgpt.com/' }]);
      chrome.storage.sync.get.mockResolvedValue({
        'domains.chatgpt.com': { enabled: true, loadDelay: 0, selectors: [] }
      });

      await updateBadgeForActiveTab();

      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#2563EB', tabId: 1 });
    });
  });
});
