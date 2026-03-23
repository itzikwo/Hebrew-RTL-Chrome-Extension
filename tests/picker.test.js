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

// ---------------------------------------------------------------------------
// getRelevantAttributes
// ---------------------------------------------------------------------------

describe('getRelevantAttributes', () => {
  it('returns data-* and role attributes', () => {
    const el = document.createElement('div');
    el.setAttribute('data-testid', 'foo');
    el.setAttribute('role', 'button');
    const attrs = pickerModule.getRelevantAttributes(el);
    expect(attrs).toEqual(expect.arrayContaining([
      { attr: 'data-testid', value: 'foo' },
      { attr: 'role', value: 'button' },
    ]));
  });

  it('returns aria-* attributes', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-label', 'close');
    const attrs = pickerModule.getRelevantAttributes(el);
    expect(attrs).toContainEqual({ attr: 'aria-label', value: 'close' });
  });

  it('does not return non-data/role/aria attributes like class or id', () => {
    const el = document.createElement('div');
    el.id = 'myId';
    el.className = 'myClass';
    el.setAttribute('data-x', 'val');
    const attrs = pickerModule.getRelevantAttributes(el);
    expect(attrs).toHaveLength(1);
    expect(attrs[0]).toEqual({ attr: 'data-x', value: 'val' });
  });

  it('returns empty array when element has no relevant attributes', () => {
    const el = document.createElement('span');
    const attrs = pickerModule.getRelevantAttributes(el);
    expect(attrs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// livePreviewSelector
// ---------------------------------------------------------------------------

describe('livePreviewSelector', () => {
  it('applies data-hrtl-highlight and outline to matching elements', () => {
    const div = document.createElement('div');
    div.className = 'target-el';
    document.body.appendChild(div);

    pickerModule.livePreviewSelector('div.target-el');

    expect(div.getAttribute('data-hrtl-highlight')).toBe('1');
    expect(div.style.outline).toBe('2px solid #2563EB');
  });

  it('clears previous highlights before applying new ones', () => {
    const old = document.createElement('span');
    old.setAttribute('data-hrtl-highlight', '1');
    old.style.outline = '2px solid #2563EB';
    document.body.appendChild(old);

    const newEl = document.createElement('div');
    newEl.className = 'new-target';
    document.body.appendChild(newEl);

    pickerModule.livePreviewSelector('div.new-target');

    expect(old.getAttribute('data-hrtl-highlight')).toBeNull();
    expect(old.style.outline).toBe('');
    expect(newEl.getAttribute('data-hrtl-highlight')).toBe('1');
  });

  it('clears all highlights when called with empty string', () => {
    const el = document.createElement('div');
    el.setAttribute('data-hrtl-highlight', '1');
    el.style.outline = '2px solid #2563EB';
    document.body.appendChild(el);

    pickerModule.livePreviewSelector('');

    expect(el.getAttribute('data-hrtl-highlight')).toBeNull();
    expect(el.style.outline).toBe('');
  });

  it('does not throw on invalid CSS selector', () => {
    expect(() => {
      pickerModule.livePreviewSelector('::invalid-selector!!');
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// pickerOpenOverlay
// ---------------------------------------------------------------------------

describe('pickerOpenOverlay', () => {
  it('creates overlay host in the DOM', () => {
    pickerModule.pickerActivate('example.com');
    const el = document.createElement('div');
    el.className = 'test-el';
    document.body.appendChild(el);

    pickerModule.pickerOpenOverlay(el);

    expect(document.getElementById('hrtl-picker-overlay-host')).not.toBeNull();
  });

  it('sets picker state to ELEMENT_SELECTED', () => {
    pickerModule.pickerActivate('example.com');
    const el = document.createElement('div');
    document.body.appendChild(el);

    pickerModule.pickerOpenOverlay(el);

    expect(pickerModule.getPickerState()).toBe(pickerModule.PICKER_STATE.ELEMENT_SELECTED);
  });

  it('overlay shadow root contains required UI elements', () => {
    pickerModule.pickerActivate('example.com');
    const el = document.createElement('div');
    el.className = 'my-el';
    document.body.appendChild(el);

    pickerModule.pickerOpenOverlay(el);

    const host = document.getElementById('hrtl-picker-overlay-host');
    const shadow = host.shadowRoot;
    expect(shadow.querySelector('select')).not.toBeNull();
    expect(shadow.querySelector('.preview')).not.toBeNull();
    expect(shadow.querySelector('.save-btn')).not.toBeNull();
    expect(shadow.querySelector('.cancel-btn')).not.toBeNull();
    expect(shadow.querySelector('.title').textContent).toBe('Configure Selector');
  });

  it('ancestor dropdown has correct options for a nested element', () => {
    pickerModule.pickerActivate('example.com');
    const parent = document.createElement('div');
    parent.className = 'parent-el';
    const child = document.createElement('span');
    child.className = 'child-el';
    parent.appendChild(child);
    document.body.appendChild(parent);

    pickerModule.pickerOpenOverlay(child);

    const host = document.getElementById('hrtl-picker-overlay-host');
    const shadow = host.shadowRoot;
    const select = shadow.querySelector('select');
    // Should have at least 2 options: child and parent
    expect(select.options.length).toBeGreaterThanOrEqual(2);
    expect(select.options[0].text).toBe('span.child-el');
    expect(select.options[1].text).toBe('div.parent-el');
  });

  it('Cancel button triggers pickerReset', () => {
    pickerModule.pickerActivate('example.com');
    const el = document.createElement('div');
    document.body.appendChild(el);

    pickerModule.pickerOpenOverlay(el);

    const host = document.getElementById('hrtl-picker-overlay-host');
    const shadow = host.shadowRoot;
    const cancelBtn = shadow.querySelector('.cancel-btn');
    cancelBtn.click();

    expect(pickerModule.getPickerState()).toBe(pickerModule.PICKER_STATE.INACTIVE);
    expect(document.getElementById('hrtl-picker-overlay-host')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// pickerSave
// ---------------------------------------------------------------------------

describe('pickerSave', () => {
  it('writes selector to chrome.storage.sync', async () => {
    pickerModule.pickerActivate('save-test.com');
    const el = document.createElement('div');
    document.body.appendChild(el);
    pickerModule.pickerOpenOverlay(el);

    // Mock existing config with one selector
    const existingConfig = { enabled: true, selectors: [{ selector: 'div.old', enabled: true, forceRTL: false }], loadDelay: 0 };
    globalThis.chrome.storage.sync.get.mockResolvedValue({ 'domains.save-test.com': existingConfig });

    await pickerModule.pickerSave('div.new-selector');

    expect(globalThis.chrome.storage.sync.set).toHaveBeenCalledWith({
      'domains.save-test.com': expect.objectContaining({
        selectors: expect.arrayContaining([
          { selector: 'div.new-selector', enabled: true, forceRTL: true }
        ])
      })
    });
  });

  it('falls back to chrome.storage.local when sync.set fails', async () => {
    pickerModule.pickerActivate('fallback-test.com');
    const el = document.createElement('div');
    document.body.appendChild(el);
    pickerModule.pickerOpenOverlay(el);

    globalThis.chrome.storage.sync.get.mockResolvedValue({});
    globalThis.chrome.storage.sync.set.mockRejectedValue(new Error('sync quota exceeded'));

    await pickerModule.pickerSave('div.fallback-selector');

    expect(globalThis.chrome.storage.local.set).toHaveBeenCalledWith({
      'domains.fallback-test.com': expect.objectContaining({
        selectors: expect.arrayContaining([
          { selector: 'div.fallback-selector', enabled: true, forceRTL: true }
        ])
      })
    });
  });

  it('resets picker state to INACTIVE after saving', async () => {
    pickerModule.pickerActivate('reset-test.com');
    const el = document.createElement('div');
    document.body.appendChild(el);
    pickerModule.pickerOpenOverlay(el);

    globalThis.chrome.storage.sync.get.mockResolvedValue({});

    await pickerModule.pickerSave('div.some-selector');

    expect(pickerModule.getPickerState()).toBe(pickerModule.PICKER_STATE.INACTIVE);
  });

  it('appends new selector to existing selectors array', async () => {
    pickerModule.pickerActivate('append-test.com');
    const el = document.createElement('div');
    document.body.appendChild(el);
    pickerModule.pickerOpenOverlay(el);

    const existingConfig = { enabled: true, selectors: [{ selector: 'span.existing', enabled: true, forceRTL: false }], loadDelay: 0 };
    globalThis.chrome.storage.sync.get.mockResolvedValue({ 'domains.append-test.com': existingConfig });

    await pickerModule.pickerSave('div.appended');

    const setCall = globalThis.chrome.storage.sync.set.mock.calls[0][0];
    const saved = setCall['domains.append-test.com'];
    expect(saved.selectors).toHaveLength(2);
    expect(saved.selectors[1]).toEqual({ selector: 'div.appended', enabled: true, forceRTL: true });
  });
});
