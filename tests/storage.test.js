import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createChromeMock } from './__mocks__/chrome.js';

beforeEach(() => {
  globalThis.chrome = createChromeMock();
});

describe('lib/storage.js', () => {
  describe('getDomainConfig', () => {
    it.todo('returns config from sync storage when available');
    it.todo('falls back to local storage when sync throws');
    it.todo('returns null when domain has no config in sync or local');
  });
  describe('setDomainConfig', () => {
    it.todo('writes to sync storage with key domains.<hostname>');
    it.todo('falls back to local storage on QUOTA_BYTES error');
    it.todo('auto-saves immediately without explicit save call (CFG-04)');
  });
  describe('getAllConfigs', () => {
    it.todo('merges local and sync with sync taking precedence');
  });
});
