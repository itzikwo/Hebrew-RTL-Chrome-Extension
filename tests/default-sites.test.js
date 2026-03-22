// tests/default-sites.test.js
// Tests for config/default-sites.js — validates shape and constraints.
import { describe, it, expect } from '@jest/globals';
import { DEFAULT_DOMAINS } from '../config/default-sites.js';

const EXPECTED_HOSTS = [
  'chatgpt.com',
  'claude.ai',
  'gemini.google.com',
  'notebooklm.google.com',
  'app.slack.com'
];

describe('config/default-sites.js', () => {
  describe('DEFAULT_DOMAINS', () => {
    it('exports entries for all 5 platforms: chatgpt.com, claude.ai, gemini.google.com, notebooklm.google.com, app.slack.com', () => {
      for (const host of EXPECTED_HOSTS) {
        // Use array form to avoid dot-path traversal in toHaveProperty
        expect(DEFAULT_DOMAINS).toHaveProperty([host]);
      }
      expect(Object.keys(DEFAULT_DOMAINS)).toHaveLength(5);
    });

    it('each entry has enabled, loadDelay, and selectors fields', () => {
      for (const host of EXPECTED_HOSTS) {
        const entry = DEFAULT_DOMAINS[host];
        expect(typeof entry.enabled).toBe('boolean');
        expect(typeof entry.loadDelay).toBe('number');
        expect(Array.isArray(entry.selectors)).toBe(true);
      }
    });

    it('each selector has id, selector, enabled, and forceRTL fields', () => {
      for (const entry of Object.values(DEFAULT_DOMAINS)) {
        for (const sel of entry.selectors) {
          expect(typeof sel.id).toBe('string');
          expect(typeof sel.selector).toBe('string');
          expect(sel.selector.length).toBeGreaterThan(0);
          expect(typeof sel.enabled).toBe('boolean');
          expect(typeof sel.forceRTL).toBe('boolean');
        }
      }
    });

    it('all selector strings are non-empty', () => {
      for (const entry of Object.values(DEFAULT_DOMAINS)) {
        for (const sel of entry.selectors) {
          expect(sel.selector.trim()).not.toBe('');
        }
      }
    });

    it('Gemini and NotebookLM have loadDelay >= 500', () => {
      expect(DEFAULT_DOMAINS['gemini.google.com'].loadDelay).toBeGreaterThanOrEqual(500);
      expect(DEFAULT_DOMAINS['notebooklm.google.com'].loadDelay).toBeGreaterThanOrEqual(500);
    });

    it('Slack has loadDelay >= 200', () => {
      expect(DEFAULT_DOMAINS['app.slack.com'].loadDelay).toBeGreaterThanOrEqual(200);
    });

    it('ChatGPT and Claude have loadDelay === 0', () => {
      expect(DEFAULT_DOMAINS['chatgpt.com'].loadDelay).toBe(0);
      expect(DEFAULT_DOMAINS['claude.ai'].loadDelay).toBe(0);
    });
  });
});
