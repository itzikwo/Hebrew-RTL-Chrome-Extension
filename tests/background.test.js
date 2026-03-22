// tests/background.test.js
// Test stubs for background.js — filled in by plan 02-03.
import { jest, describe, it, beforeEach } from '@jest/globals';
import { createChromeMock } from './__mocks__/chrome.js';

describe('background.js', () => {
  beforeEach(() => {
    globalThis.chrome = createChromeMock();
  });

  describe('onInstalled', () => {
    it.todo('seeds default domains on reason === install');
    it.todo('does NOT overwrite existing keys on install');
    it.todo('does NOT seed on reason === update');
  });

  describe('onCommand toggle-rtl', () => {
    it.todo('sends TOGGLE_DOMAIN message to active tab');
    it.todo('catches error when content script not present');
  });

  describe('updateBadgeForActiveTab', () => {
    it.todo('sets badge text ON when domain is enabled');
    it.todo('sets badge text empty when domain is disabled');
    it.todo('sets badge background color to #2563EB');
  });
});
