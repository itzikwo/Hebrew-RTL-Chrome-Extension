// tests/default-sites.test.js
// Test stubs for config/default-sites.js — filled in by plan 02-01.
import { jest, describe, it, beforeEach } from '@jest/globals';
import { createChromeMock } from './__mocks__/chrome.js';

describe('config/default-sites.js', () => {
  beforeEach(() => {
    globalThis.chrome = createChromeMock();
  });

  describe('DEFAULT_DOMAINS', () => {
    it.todo('exports entries for all 5 platforms: chatgpt.com, claude.ai, gemini.google.com, notebooklm.google.com, app.slack.com');
    it.todo('each entry has enabled, loadDelay, and selectors fields');
    it.todo('each selector has id, selector, enabled, and forceRTL fields');
    it.todo('all selector strings are non-empty');
    it.todo('Gemini and NotebookLM have loadDelay >= 500');
    it.todo('Slack has loadDelay >= 200');
    it.todo('ChatGPT and Claude have loadDelay === 0');
  });
});
