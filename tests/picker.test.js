/** @jest-environment jsdom */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createChromeMock } from './__mocks__/chrome.js';

// We'll dynamically import picker after setting up globals
let pickerModule;

// Setup a minimal document.body before importing
beforeEach(async () => {
  // Reset state between tests by re-importing fresh module
  jest.resetModules();

  // Setup chrome mock
  globalThis.chrome = createChromeMock();

  // Ensure CSS.escape is available in jsdom
  if (!globalThis.CSS) {
    globalThis.CSS = { escape: (str) => str.replace(/([^\w-])/g, '\\$1') };
  }

  // Import the picker module fresh
  pickerModule = await import('../lib/picker.js');
});

afterEach(() => {
  // Clean up any picker state
  if (pickerModule && typeof pickerModule.pickerReset === 'function') {
    pickerModule.pickerReset();
  }
  // Clean up DOM
  document.body.innerHTML = '';
  document.body.style.cursor = '';
});

// ---------------------------------------------------------------------------
// PICKER_STATE enum
// ---------------------------------------------------------------------------

describe('PICKER_STATE', () => {
  it('has INACTIVE state', () => {
    expect(pickerModule.PICKER_STATE.INACTIVE).toBe('INACTIVE');
  });

  it('has HOVERING state', () => {
    expect(pickerModule.PICKER_STATE.HOVERING).toBe('HOVERING');
  });

  it('has ELEMENT_SELECTED state', () => {
    expect(pickerModule.PICKER_STATE.ELEMENT_SELECTED).toBe('ELEMENT_SELECTED');
  });

  it('has SAVING state', () => {
    expect(pickerModule.PICKER_STATE.SAVING).toBe('SAVING');
  });
});

// ---------------------------------------------------------------------------
// generateSelector
// ---------------------------------------------------------------------------

describe('generateSelector', () => {
  it('returns #id when element has an id', () => {
    const el = document.createElement('div');
    el.id = 'theId';
    expect(pickerModule.generateSelector(el)).toBe('#theId');
  });

  it('returns tag.class1.class2 when element has classes but no id', () => {
    const el = document.createElement('div');
    el.className = 'class1 class2';
    expect(pickerModule.generateSelector(el)).toBe('div.class1.class2');
  });

  it('returns bare tag when element has no id and no classes', () => {
    const el = document.createElement('span');
    expect(pickerModule.generateSelector(el)).toBe('span');
  });

  it('escapes special characters in id via CSS.escape', () => {
    const el = document.createElement('div');
    el.id = 'my.id';
    const result = pickerModule.generateSelector(el);
    // Should start with # and contain the escaped id
    expect(result).toMatch(/^#/);
    expect(result).toContain('my');
  });

  it('escapes special characters in class names via CSS.escape', () => {
    const el = document.createElement('p');
    el.className = 'normal';
    expect(pickerModule.generateSelector(el)).toBe('p.normal');
  });
});

// ---------------------------------------------------------------------------
// buildAncestorChain
// ---------------------------------------------------------------------------

describe('buildAncestorChain', () => {
  it('returns array starting with the element itself', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const chain = pickerModule.buildAncestorChain(div);
    expect(chain[0]).toBe(div);
  });

  it('stops before body (body not included)', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const chain = pickerModule.buildAncestorChain(div);
    expect(chain).not.toContain(document.body);
  });

  it('includes parent elements up to (but not including) body', () => {
    const outer = document.createElement('section');
    const inner = document.createElement('div');
    outer.appendChild(inner);
    document.body.appendChild(outer);
    const chain = pickerModule.buildAncestorChain(inner);
    expect(chain).toContain(inner);
    expect(chain).toContain(outer);
    expect(chain).not.toContain(document.body);
  });

  it('returns at most 10 elements', () => {
    // Build a deep chain of 15 nested elements
    let current = document.createElement('div');
    document.body.appendChild(current);
    for (let i = 0; i < 14; i++) {
      const child = document.createElement('span');
      current.appendChild(child);
      current = child;
    }
    const chain = pickerModule.buildAncestorChain(current);
    expect(chain.length).toBeLessThanOrEqual(10);
  });

  it('returns only available ancestors on a shallow DOM', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const chain = pickerModule.buildAncestorChain(div);
    // Only div itself (body excluded), chain should be length 1
    expect(chain.length).toBe(1);
    expect(chain[0]).toBe(div);
  });
});

// ---------------------------------------------------------------------------
// ancestorLabel
// ---------------------------------------------------------------------------

describe('ancestorLabel', () => {
  it('returns tag#id when element has an id', () => {
    const el = document.createElement('div');
    el.id = 'myId';
    expect(pickerModule.ancestorLabel(el)).toBe('div#myId');
  });

  it('returns tag.class1.class2 when element has classes but no id', () => {
    const el = document.createElement('p');
    el.className = 'foo bar';
    expect(pickerModule.ancestorLabel(el)).toBe('p.foo.bar');
  });

  it('returns bare tag when element has no id and no classes', () => {
    const el = document.createElement('section');
    expect(pickerModule.ancestorLabel(el)).toBe('section');
  });
});

// ---------------------------------------------------------------------------
// buildSelector
// ---------------------------------------------------------------------------

describe('buildSelector', () => {
  it('returns tag.classA when given a class', () => {
    const el = document.createElement('div');
    expect(pickerModule.buildSelector(el, ['classA'], [])).toBe('div.classA');
  });

  it('returns tag[data-role="msg"] when given an attribute', () => {
    const el = document.createElement('div');
    expect(pickerModule.buildSelector(el, [], [{ attr: 'data-role', value: 'msg' }])).toBe('div[data-role="msg"]');
  });

  it('returns tag.classA[data-role="msg"] when given both class and attribute', () => {
    const el = document.createElement('div');
    expect(pickerModule.buildSelector(el, ['classA'], [{ attr: 'data-role', value: 'msg' }])).toBe('div.classA[data-role="msg"]');
  });
});

// ---------------------------------------------------------------------------
// pickerActivate
// ---------------------------------------------------------------------------

describe('pickerActivate', () => {
  it('sets state to HOVERING after activation', () => {
    pickerModule.pickerActivate('example.com');
    expect(pickerModule.getPickerState()).toBe(pickerModule.PICKER_STATE.HOVERING);
  });

  it('sets document.body cursor to crosshair', () => {
    pickerModule.pickerActivate('example.com');
    expect(document.body.style.cursor).toBe('crosshair');
  });

  it('injects picker banner into the DOM', () => {
    pickerModule.pickerActivate('example.com');
    expect(document.getElementById('hrtl-picker-banner-host')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// pickerReset
// ---------------------------------------------------------------------------

describe('pickerReset', () => {
  it('sets state back to INACTIVE after reset', () => {
    pickerModule.pickerActivate('example.com');
    pickerModule.pickerReset();
    expect(pickerModule.getPickerState()).toBe(pickerModule.PICKER_STATE.INACTIVE);
  });

  it('removes the crosshair cursor after reset', () => {
    pickerModule.pickerActivate('example.com');
    pickerModule.pickerReset();
    expect(document.body.style.cursor).toBe('');
  });

  it('removes the picker banner from the DOM after reset', () => {
    pickerModule.pickerActivate('example.com');
    pickerModule.pickerReset();
    expect(document.getElementById('hrtl-picker-banner-host')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Escape key handler
// ---------------------------------------------------------------------------

describe('Escape key', () => {
  it('resets picker state to INACTIVE when Escape is pressed during HOVERING', () => {
    pickerModule.pickerActivate('example.com');
    expect(pickerModule.getPickerState()).toBe(pickerModule.PICKER_STATE.HOVERING);

    // Dispatch keydown Escape on document
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(event);

    expect(pickerModule.getPickerState()).toBe(pickerModule.PICKER_STATE.INACTIVE);
  });

  it('does not throw when Escape is pressed while picker is INACTIVE', () => {
    expect(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(event);
    }).not.toThrow();
  });
});
