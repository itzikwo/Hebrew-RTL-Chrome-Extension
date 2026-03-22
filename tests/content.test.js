// @jest-environment jsdom
import { applyDirection, processElement } from '../content.js';

describe('applyDirection — ENG-02: inline style application', () => {
  test.todo('rtl sets direction:rtl and text-align:right as inline styles');
  test.todo('ltr clears direction and text-align (not sets to ltr)');
  test.todo('sets data-hrtl-processed attribute after applying direction');
});

describe('applyDirection — ENG-07: list bullet fix', () => {
  test.todo('li element receiving rtl gets list-style-position:inside');
  test.todo('non-li element receiving rtl does not get list-style-position');
  test.todo('li element receiving ltr clears list-style-position');
});

describe('processElement — ENG-04: LTR preservation', () => {
  test.todo('code element is skipped (not processed)');
  test.todo('element inside pre ancestor is skipped');
  test.todo('element with only URL text content is skipped');
});

describe('processElement — ENG-06: forced RTL mode', () => {
  test.todo('forceRTL:true applies rtl without calling detectDirection');
  test.todo('forceRTL:true on exempt element still applies rtl (force overrides exempt)');
});
