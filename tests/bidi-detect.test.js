/** @jest-environment jsdom */
import { detectDirection, isExemptElement, getFirstSubstantiveText } from '../lib/bidi-detect.js';

describe('detectDirection — ENG-01: first-strong-character', () => {
  test('pure Hebrew text returns rtl', () => {
    expect(detectDirection('שלום עולם')).toBe('rtl');
  });
  test('pure English text returns ltr', () => {
    expect(detectDirection('Hello world')).toBe('ltr');
  });
  test('punctuation-prefixed Hebrew returns rtl (skip neutrals)', () => {
    expect(detectDirection('... שלום')).toBe('rtl');
  });
  test('emoji before Hebrew does not corrupt detection', () => {
    expect(detectDirection('😀 שלום')).toBe('rtl');
  });
  test('empty string returns ltr', () => {
    expect(detectDirection('')).toBe('ltr');
  });
  test('digits before Hebrew returns rtl (both skipped, Hebrew is first strong)', () => {
    expect(detectDirection('123 שלום')).toBe('rtl');
  });
});

describe('detectDirection — ENG-03: mixed-content 30% threshold', () => {
  test('text with >= 30% Hebrew chars returns rtl', () => {
    // 'Hi שלום world': 2+4+5=11 letters, 4 Hebrew = 36.4% >= 30%
    expect(detectDirection('Hi שלום world')).toBe('rtl');
  });
  test('text with < 30% Hebrew chars returns ltr', () => {
    expect(detectDirection('Hello world from Tel Aviv א')).toBe('ltr');
  });
  test('Hebrew Presentation Forms (U+FB1D-FB4F) counted in threshold', () => {
    expect(detectDirection('\uFB2A\uFB2A\uFB2A hello')).toBe('rtl');
  });
  test('nikkud (U+05B0-U+05C7) counted in Hebrew range U+0590-05FF', () => {
    expect(detectDirection('שרה\u05B0 hello')).toBe('rtl');
  });
});

describe('isExemptElement — ENG-04: LTR preservation', () => {
  test('code element returns true', () => {
    expect(isExemptElement(document.createElement('code'))).toBe(true);
  });
  test('pre element returns true', () => {
    expect(isExemptElement(document.createElement('pre'))).toBe(true);
  });
  test('element with class katex returns true', () => {
    const el = document.createElement('span');
    el.className = 'katex';
    expect(isExemptElement(el)).toBe(true);
  });
  test('element inside .katex ancestor returns true', () => {
    const parent = document.createElement('div');
    parent.className = 'katex';
    const child = document.createElement('span');
    parent.appendChild(child);
    document.body.appendChild(parent);
    expect(isExemptElement(child)).toBe(true);
    document.body.removeChild(parent);
  });
  test('URL-only text content returns true', () => {
    const el = document.createElement('p');
    el.textContent = 'https://example.com';
    expect(isExemptElement(el)).toBe(true);
  });
  test('file path text content returns true', () => {
    const el = document.createElement('p');
    el.textContent = '/usr/local/bin/node';
    expect(isExemptElement(el)).toBe(true);
  });
  test('normal paragraph returns false', () => {
    const el = document.createElement('p');
    el.textContent = 'שלום עולם';
    expect(isExemptElement(el)).toBe(false);
  });
});

describe('getFirstSubstantiveText — ENG-08: inline element walking', () => {
  test('returns first non-whitespace text from direct text node', () => {
    const el = document.createElement('p');
    el.textContent = 'שלום';
    expect(getFirstSubstantiveText(el)).toBe('שלום');
  });
  test('skips whitespace-only leading text nodes', () => {
    const el = document.createElement('p');
    el.appendChild(document.createTextNode('   '));
    el.appendChild(document.createTextNode('שלום'));
    expect(getFirstSubstantiveText(el)).toBe('שלום');
  });
  test('finds Hebrew text after strong element label', () => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = 'Phase 1';
    li.appendChild(strong);
    li.appendChild(document.createTextNode(' – שלום'));
    expect(getFirstSubstantiveText(li)).toBe('Phase 1');
  });
  test('handles li > strong > text + Hebrew sibling text node', () => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = 'Label';
    li.appendChild(strong);
    li.appendChild(document.createTextNode('שלום עולם'));
    expect(getFirstSubstantiveText(li)).toBe('Label');
  });
  test('empty element returns empty string', () => {
    const el = document.createElement('p');
    expect(getFirstSubstantiveText(el)).toBe('');
  });
});
