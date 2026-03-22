import { jest } from '@jest/globals';

/**
 * Factory function returning a fresh Chrome API mock for each test.
 * Every method is a jest.fn() stub so tests can assert call arguments.
 */
export function createChromeMock() {
  return {
    storage: {
      sync: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(undefined),
        QUOTA_BYTES: 102400,
        QUOTA_BYTES_PER_ITEM: 8192,
        MAX_ITEMS: 512
      },
      local: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(undefined),
        QUOTA_BYTES: 10485760
      },
      onChanged: { addListener: jest.fn() }
    },
    tabs: {
      query: jest.fn().mockResolvedValue([{ id: 1, url: 'https://chatgpt.com/' }]),
      sendMessage: jest.fn().mockResolvedValue(undefined),
      onActivated: { addListener: jest.fn() }
    },
    runtime: {
      onInstalled: { addListener: jest.fn() },
      onMessage: { addListener: jest.fn() }
    },
    action: {
      setBadgeText: jest.fn().mockResolvedValue(undefined),
      setBadgeBackgroundColor: jest.fn().mockResolvedValue(undefined)
    },
    commands: {
      onCommand: { addListener: jest.fn() }
    }
  };
}
