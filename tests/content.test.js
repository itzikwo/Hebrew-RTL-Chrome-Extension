/** @jest-environment jsdom */
import { applyDirection, processElement } from '../lib/rtl-engine.js';

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
