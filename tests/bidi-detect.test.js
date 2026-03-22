// @jest-environment node
import { detectDirection, isExemptElement, getFirstSubstantiveText } from '../lib/bidi-detect.js';

describe('detectDirection — ENG-01: first-strong-character', () => {
  test.todo('pure Hebrew text returns rtl');
  test.todo('pure English text returns ltr');
  test.todo('punctuation-prefixed Hebrew returns rtl (skip neutrals)');
  test.todo('emoji before Hebrew does not corrupt detection');
  test.todo('empty string returns ltr');
});

describe('detectDirection — ENG-03: mixed-content 30% threshold', () => {
  test.todo('text with >= 30% Hebrew chars returns rtl');
  test.todo('text with < 30% Hebrew chars returns ltr');
  test.todo('Hebrew Presentation Forms (U+FB1D-FB4F) counted in threshold');
  test.todo('nikkud (U+05B0-U+05C7) counted in Hebrew range U+0590-05FF');
});

describe('isExemptElement — ENG-04: LTR preservation', () => {
  test.todo('code element returns true');
  test.todo('pre element returns true');
  test.todo('element with class katex returns true');
  test.todo('element inside .katex ancestor returns true');
  test.todo('URL-only text content returns true');
  test.todo('file path text content returns true');
  test.todo('normal paragraph returns false');
});

describe('getFirstSubstantiveText — ENG-08: inline element walking', () => {
  test.todo('returns first non-whitespace text from direct text node');
  test.todo('skips whitespace-only leading text nodes');
  test.todo('finds Hebrew text after strong element label');
  test.todo('handles li > strong > text + Hebrew sibling text node');
});
