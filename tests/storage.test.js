import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createChromeMock } from './__mocks__/chrome.js';
import { getDomainConfig, setDomainConfig, getAllConfigs } from '../lib/storage.js';

describe('lib/storage.js', () => {
  beforeEach(() => {
    globalThis.chrome = createChromeMock();
  });

  describe('getDomainConfig', () => {
    it('returns config from sync storage when available', async () => {
      const config = { enabled: true, selectors: [], loadDelay: 0 };
      chrome.storage.sync.get.mockResolvedValue({ 'domains.chatgpt.com': config });
      const result = await getDomainConfig('chatgpt.com');
      expect(result).toEqual(config);
      expect(chrome.storage.sync.get).toHaveBeenCalledWith('domains.chatgpt.com');
    });

    it('falls back to local storage when sync throws', async () => {
      const config = { enabled: true, selectors: [], loadDelay: 0 };
      chrome.storage.sync.get.mockRejectedValue(new Error('sync unavailable'));
      chrome.storage.local.get.mockResolvedValue({ 'domains.chatgpt.com': config });
      const result = await getDomainConfig('chatgpt.com');
      expect(result).toEqual(config);
      expect(chrome.storage.local.get).toHaveBeenCalledWith('domains.chatgpt.com');
    });

    it('returns null when domain has no config in sync or local', async () => {
      chrome.storage.sync.get.mockResolvedValue({});
      chrome.storage.local.get.mockResolvedValue({});
      const result = await getDomainConfig('unknown.com');
      expect(result).toBeNull();
    });
  });

  describe('setDomainConfig', () => {
    it('writes to sync storage with key domains.<hostname>', async () => {
      const config = { enabled: true, selectors: [], loadDelay: 0 };
      chrome.storage.sync.set.mockResolvedValue(undefined);
      await setDomainConfig('chatgpt.com', config);
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ 'domains.chatgpt.com': config });
    });

    it('falls back to local storage on QUOTA_BYTES error', async () => {
      const config = { enabled: true, selectors: [], loadDelay: 0 };
      chrome.storage.sync.set.mockRejectedValue(new Error('QUOTA_BYTES quota exceeded'));
      chrome.storage.local.set.mockResolvedValue(undefined);
      await setDomainConfig('chatgpt.com', config);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ 'domains.chatgpt.com': config });
    });

    it('auto-saves immediately without explicit save call (CFG-04)', async () => {
      const config = { enabled: false, selectors: [], loadDelay: 500 };
      chrome.storage.sync.set.mockResolvedValue(undefined);
      await setDomainConfig('claude.ai', config);
      // Verify sync.set was called exactly once immediately (no debounce, no queue)
      expect(chrome.storage.sync.set).toHaveBeenCalledTimes(1);
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ 'domains.claude.ai': config });
    });
  });

  describe('getAllConfigs', () => {
    it('merges local and sync with sync taking precedence', async () => {
      const localConfig = { enabled: false, selectors: [], loadDelay: 0 };
      const syncConfig = { enabled: true, selectors: [], loadDelay: 0 };
      chrome.storage.sync.get.mockResolvedValue({ 'domains.chatgpt.com': syncConfig });
      chrome.storage.local.get.mockResolvedValue({
        'domains.chatgpt.com': localConfig,
        'domains.claude.ai': localConfig
      });
      const result = await getAllConfigs();
      // sync takes precedence for chatgpt.com
      expect(result['domains.chatgpt.com']).toEqual(syncConfig);
      // local-only key is preserved
      expect(result['domains.claude.ai']).toEqual(localConfig);
    });
  });
});
