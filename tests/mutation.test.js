// @jest-environment jsdom
import { startObserver, stopObserver } from '../content.js';

describe('MutationObserver — ENG-05: dynamic content', () => {
  test.todo('childList addition of new element triggers processing within 100ms');
  test.todo('characterData mutation on processed element removes marker and re-queues');
  test.todo('rapid mutations within 100ms window are batched (debounce)');
  test.todo('already-processed element (has data-hrtl-processed) is not re-queued on childList');
  test.todo('bidirectional re-evaluation: RTL element reverts to LTR when content changes to English');
});
