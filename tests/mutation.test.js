/** @jest-environment jsdom */
import { jest } from '@jest/globals';
import { startObserver, stopObserver } from '../lib/rtl-engine.js';

// MutationObserver callbacks are microtasks — flush them before advancing fake timers.
const flushMicrotasks = () => Promise.resolve();

beforeEach(() => {
  jest.useFakeTimers();
  document.body.innerHTML = '';
  stopObserver();
});

afterEach(() => {
  stopObserver();
  jest.useRealTimers();
});

describe('MutationObserver — ENG-05: dynamic content', () => {
  test('childList addition of new element triggers processing within 100ms', async () => {
    startObserver([], null);
    const div = document.createElement('div');
    div.textContent = 'שלום';
    document.body.appendChild(div);
    await flushMicrotasks(); // let MutationObserver callback queue setTimeout
    jest.advanceTimersByTime(100);
    expect(div.getAttribute('data-hrtl-processed')).toBe('1');
    expect(div.style.direction).toBe('rtl');
  });

  test('characterData mutation on processed element removes marker and re-queues', async () => {
    startObserver([], null);
    const div = document.createElement('div');
    div.textContent = 'Hello';
    document.body.appendChild(div);
    await flushMicrotasks();
    jest.advanceTimersByTime(100);
    expect(div.getAttribute('data-hrtl-processed')).toBe('1');
    // Mutate the text node directly (triggers characterData mutation)
    div.firstChild.textContent = 'שלום';
    await flushMicrotasks();
    jest.advanceTimersByTime(100);
    expect(div.style.direction).toBe('rtl');
    expect(div.getAttribute('data-hrtl-processed')).toBe('1');
  });

  test('rapid mutations within 100ms window are batched (debounce)', async () => {
    startObserver([], null);
    const divs = Array.from({ length: 5 }, (_, i) => {
      const d = document.createElement('div');
      d.textContent = 'שלום ' + i;
      document.body.appendChild(d);
      return d;
    });
    await flushMicrotasks(); // all 5 mutations queued, one debounce timer
    divs.forEach(d => expect(d.getAttribute('data-hrtl-processed')).toBeNull());
    jest.advanceTimersByTime(100);
    divs.forEach(d => expect(d.getAttribute('data-hrtl-processed')).toBe('1'));
  });

  test('already-processed element (has data-hrtl-processed) is not re-queued on childList', async () => {
    startObserver([], null);
    const div = document.createElement('div');
    div.textContent = 'שלום';
    document.body.appendChild(div);
    await flushMicrotasks();
    jest.advanceTimersByTime(100);
    expect(div.getAttribute('data-hrtl-processed')).toBe('1');
    // Manually override style — if re-processed it would be reset to rtl
    div.style.direction = 'ltr';
    document.body.removeChild(div);
    document.body.appendChild(div); // re-add with MARKER still set
    await flushMicrotasks();
    jest.advanceTimersByTime(100);
    // Already has MARKER — skipped, style stays as manually set
    expect(div.style.direction).toBe('ltr');
  });

  test('bidirectional re-evaluation: RTL element reverts to LTR when content changes to English', async () => {
    startObserver([], null);
    const div = document.createElement('div');
    div.textContent = 'שלום';
    document.body.appendChild(div);
    await flushMicrotasks();
    jest.advanceTimersByTime(100);
    expect(div.style.direction).toBe('rtl');
    div.firstChild.textContent = 'Hello world';
    await flushMicrotasks();
    jest.advanceTimersByTime(100);
    expect(div.style.direction).toBe('');
  });
});
