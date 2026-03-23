/** @jest-environment jsdom */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { applyDirection, processElement } from '../lib/rtl-engine.js';
import { createChromeMock } from './__mocks__/chrome.js';

describe('applyDirection — ENG-02: inline style application', () => {
  test('rtl sets direction:rtl and text-align:right as inline styles', () => {
    const el = document.createElement('div');
    applyDirection(el, 'rtl');
    expect(el.style.direction).toBe('rtl');
    expect(el.style.textAlign).toBe('right');
  });
  test('ltr clears direction and text-align (not sets to ltr)', () => {
    const el = document.createElement('div');
    applyDirection(el, 'rtl');
    applyDirection(el, 'ltr');
    expect(el.style.direction).toBe('');
    expect(el.style.textAlign).toBe('');
  });
  test('sets data-hrtl-processed attribute after applying direction', () => {
    const el = document.createElement('div');
    applyDirection(el, 'rtl');
    expect(el.getAttribute('data-hrtl-processed')).toBe('1');
    const el2 = document.createElement('div');
    applyDirection(el2, 'ltr');
    expect(el2.getAttribute('data-hrtl-processed')).toBe('1');
  });
});

describe('applyDirection — ENG-07: list bullet fix', () => {
  test('li element receiving rtl gets list-style-position:inside', () => {
    const el = document.createElement('li');
    applyDirection(el, 'rtl');
    expect(el.style.listStylePosition).toBe('inside');
  });
  test('non-li element receiving rtl does not get list-style-position', () => {
    const el = document.createElement('p');
    applyDirection(el, 'rtl');
    expect(el.style.listStylePosition).toBe('');
  });
  test('li element receiving ltr clears list-style-position', () => {
    const el = document.createElement('li');
    applyDirection(el, 'rtl');
    applyDirection(el, 'ltr');
    expect(el.style.listStylePosition).toBe('');
  });
});

describe('processElement — ENG-04: LTR preservation', () => {
  test('code element is skipped (not processed)', () => {
    const el = document.createElement('code');
    el.textContent = 'const x = 1;';
    processElement(el, null);
    expect(el.style.direction).toBe('');
    expect(el.getAttribute('data-hrtl-processed')).toBeNull();
  });
  test('element inside pre ancestor is skipped', () => {
    const pre = document.createElement('pre');
    const div = document.createElement('div');
    div.textContent = 'שלום';
    pre.appendChild(div);
    document.body.appendChild(pre);
    processElement(div, null);
    expect(div.style.direction).toBe('');
    expect(div.getAttribute('data-hrtl-processed')).toBeNull();
    document.body.removeChild(pre);
  });
  test('element with only URL text content is skipped', () => {
    const el = document.createElement('p');
    el.textContent = 'https://example.com';
    processElement(el, null);
    expect(el.style.direction).toBe('');
    expect(el.getAttribute('data-hrtl-processed')).toBeNull();
  });
});

describe('processElement — ENG-06: forced RTL mode', () => {
  test('forceRTL:true applies rtl without calling detectDirection', () => {
    const el = document.createElement('p');
    el.textContent = 'Hello world'; // LTR content
    processElement(el, { forceRTL: true });
    expect(el.style.direction).toBe('rtl');
  });
  test('forceRTL:true on exempt element still applies rtl (force overrides exempt)', () => {
    const el = document.createElement('code');
    el.textContent = 'const x = 1;';
    processElement(el, { forceRTL: true });
    expect(el.style.direction).toBe('rtl');
  });
});

// ---- content.js HIGHLIGHT_SELECTOR and CLEAR_HIGHLIGHT message handlers ----
//
// Strategy: set up globalThis.chrome BEFORE importing content.js (ESM modules
// execute once per file). The chrome mock captures the onMessage listener at
// module evaluation time. We then call that listener directly in each test,
// resetting DOM state in beforeEach.

describe('content.js — HIGHLIGHT_SELECTOR / CLEAR_HIGHLIGHT message handlers', () => {
  // Set up chrome mock BEFORE importing content.js so the listener registration
  // fires against our mock. We do this at describe-level (not beforeEach) because
  // ESM modules are cached after the first import.
  const chromeMock = createChromeMock();
  chromeMock.storage.sync.get.mockResolvedValue({});
  globalThis.chrome = chromeMock;

  // Import content.js once — the onMessage listener is registered on chromeMock.
  // We use a top-level await via beforeAll to ensure the import resolves before tests run.
  let listener;

  beforeEach(async () => {
    // (Re-)import content.js on first run — module is cached after that.
    // After import, capture the registered onMessage listener.
    await import('../content.js');
    const calls = chromeMock.runtime.onMessage.addListener.mock.calls;
    listener = calls[calls.length - 1]?.[0];

    // Reset DOM for each test
    document.body.innerHTML = `
      <div class="message-content">Hello</div>
      <div class="message-content">World</div>
      <div class="other">Skip</div>
    `;
  });

  test('HIGHLIGHT_SELECTOR applies outline:2px solid #2563EB to matching elements', () => {
    const sendResponse = jest.fn();
    listener({ type: 'HIGHLIGHT_SELECTOR', selector: '.message-content' }, {}, sendResponse);

    const els = document.querySelectorAll('.message-content');
    expect(els[0].style.outline).toBe('2px solid #2563EB');
    expect(els[1].style.outline).toBe('2px solid #2563EB');
  });

  test('HIGHLIGHT_SELECTOR sets data-hrtl-highlight="1" on highlighted elements', () => {
    listener({ type: 'HIGHLIGHT_SELECTOR', selector: '.message-content' }, {}, jest.fn());

    const els = document.querySelectorAll('.message-content');
    expect(els[0].getAttribute('data-hrtl-highlight')).toBe('1');
    expect(els[1].getAttribute('data-hrtl-highlight')).toBe('1');
  });

  test('HIGHLIGHT_SELECTOR does not highlight non-matching elements', () => {
    listener({ type: 'HIGHLIGHT_SELECTOR', selector: '.message-content' }, {}, jest.fn());

    const other = document.querySelector('.other');
    expect(other.style.outline).toBe('');
    expect(other.getAttribute('data-hrtl-highlight')).toBeNull();
  });

  test('HIGHLIGHT_SELECTOR clears previous highlights before applying new ones', () => {
    // Highlight .message-content first
    listener({ type: 'HIGHLIGHT_SELECTOR', selector: '.message-content' }, {}, jest.fn());
    // Manually add data-hrtl-highlight to .message-content elements (they are now in DOM)
    // Now send second HIGHLIGHT_SELECTOR for .other — previous highlights must be cleared
    listener({ type: 'HIGHLIGHT_SELECTOR', selector: '.other' }, {}, jest.fn());

    const els = document.querySelectorAll('.message-content');
    expect(els[0].style.outline).toBe('');
    expect(els[0].getAttribute('data-hrtl-highlight')).toBeNull();

    const other = document.querySelector('.other');
    expect(other.style.outline).toBe('2px solid #2563EB');
  });

  test('HIGHLIGHT_SELECTOR with invalid selector does not throw', () => {
    expect(() => {
      listener({ type: 'HIGHLIGHT_SELECTOR', selector: '!!invalid$$' }, {}, jest.fn());
    }).not.toThrow();
  });

  test('CLEAR_HIGHLIGHT removes outline and data-hrtl-highlight from all highlighted elements', () => {
    // First highlight
    listener({ type: 'HIGHLIGHT_SELECTOR', selector: '.message-content' }, {}, jest.fn());
    // Then clear
    const sendResponse = jest.fn();
    listener({ type: 'CLEAR_HIGHLIGHT' }, {}, sendResponse);

    const els = document.querySelectorAll('.message-content');
    expect(els[0].style.outline).toBe('');
    expect(els[0].getAttribute('data-hrtl-highlight')).toBeNull();
    expect(els[1].style.outline).toBe('');
  });

  test('HIGHLIGHT_SELECTOR calls sendResponse with { ok: true }', () => {
    const sendResponse = jest.fn();
    listener({ type: 'HIGHLIGHT_SELECTOR', selector: '.message-content' }, {}, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  test('CLEAR_HIGHLIGHT calls sendResponse with { ok: true }', () => {
    listener({ type: 'HIGHLIGHT_SELECTOR', selector: '.message-content' }, {}, jest.fn());
    const sendResponse = jest.fn();
    listener({ type: 'CLEAR_HIGHLIGHT' }, {}, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });
});
