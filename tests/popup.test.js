/** @jest-environment jsdom */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createChromeMock } from './__mocks__/chrome.js';

// Mock storage module before dynamic import of popup.js
const mockGetDomainConfig = jest.fn();
const mockSetDomainConfig = jest.fn();
const mockGetAllConfigs = jest.fn().mockResolvedValue({});

jest.unstable_mockModule('../lib/storage.js', () => ({
  getDomainConfig: mockGetDomainConfig,
  setDomainConfig: mockSetDomainConfig,
  getAllConfigs: mockGetAllConfigs
}));

const MOCK_CONFIG = {
  enabled: true,
  loadDelay: 0,
  selectors: [
    { selector: '.message-content', enabled: true, forceRTL: false },
    { selector: '.reply-box', enabled: false, forceRTL: true }
  ]
};

/**
 * Setup the popup DOM matching popup.html structure.
 * Called in beforeEach so each test has a fresh DOM.
 */
function setupPopupDOM() {
  document.body.innerHTML = `
    <header>
      <span id="domain-name">loading...</span>
      <label class="toggle">
        <input type="checkbox" id="master-toggle">
        <span class="toggle-slider"></span>
      </label>
    </header>
    <section id="selector-list"></section>
    <p id="empty-state" hidden>No selectors configured — add one with +</p>
    <p id="not-available" hidden>Not available on this page</p>
    <footer>
      <button id="add-selector-btn">+ Add Selector</button>
      <div class="actions-wrapper">
        <button id="actions-btn">Actions &#9662;</button>
        <ul id="actions-menu" hidden>
          <li><button data-action="export">Export Config</button></li>
          <li><button data-action="delete-all">Delete All Selectors</button></li>
          <li><button data-action="shortcuts">Keyboard Shortcuts</button></li>
        </ul>
      </div>
    </footer>
    <div id="confirm-dialog" hidden>
      <p id="confirm-text"></p>
      <div class="confirm-buttons">
        <button id="confirm-cancel">Cancel</button>
        <button id="confirm-ok">Confirm</button>
      </div>
    </div>
    <p id="add-selector-msg" hidden>Coming soon — element picker in next update</p>
  `;
}

describe('popup.js', () => {
  let initPopup, renderPopup, renderSelectorRow;

  beforeEach(async () => {
    // Reset mocks
    jest.resetModules();
    mockGetDomainConfig.mockReset();
    mockSetDomainConfig.mockReset();
    mockSetDomainConfig.mockResolvedValue(undefined);

    // Setup Chrome mock
    globalThis.chrome = createChromeMock();

    // Setup DOM
    setupPopupDOM();

    // Dynamically import popup handlers after mocks are in place
    const popup = await import('../popup/popup.js');
    initPopup = popup.initPopup;
    renderPopup = popup.renderPopup;
    renderSelectorRow = popup.renderSelectorRow;
  });

  describe('initPopup — DOMContentLoaded handler', () => {
    it('calls chrome.tabs.query and renders hostname in domain-name element', async () => {
      chrome.tabs.query.mockResolvedValue([{ id: 1, url: 'https://chatgpt.com/c/123' }]);
      mockGetDomainConfig.mockResolvedValue(MOCK_CONFIG);

      await initPopup();

      expect(chrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
      expect(document.getElementById('domain-name').textContent).toBe('chatgpt.com');
    });

    it('shows not-available state when tab.url is undefined (chrome:// page)', async () => {
      chrome.tabs.query.mockResolvedValue([{ id: 1, url: undefined }]);

      await initPopup();

      expect(document.getElementById('not-available').hidden).toBe(false);
      expect(document.getElementById('domain-name').textContent).not.toBe('chatgpt.com');
    });
  });

  describe('renderPopup — master toggle', () => {
    it('reflects config.enabled=true as checked master toggle', async () => {
      renderPopup('chatgpt.com', { ...MOCK_CONFIG, enabled: true }, 1);

      expect(document.getElementById('master-toggle').checked).toBe(true);
    });

    it('reflects config.enabled=false as unchecked master toggle', async () => {
      renderPopup('chatgpt.com', { ...MOCK_CONFIG, enabled: false }, 1);

      expect(document.getElementById('master-toggle').checked).toBe(false);
    });

    it('applies selector-list--disabled class when master toggle is OFF', async () => {
      renderPopup('chatgpt.com', { ...MOCK_CONFIG, enabled: false }, 1);

      expect(document.getElementById('selector-list').classList.contains('selector-list--disabled')).toBe(true);
    });

    it('removes selector-list--disabled class when master toggle is ON', async () => {
      // First set disabled
      renderPopup('chatgpt.com', { ...MOCK_CONFIG, enabled: false }, 1);
      // Then enable
      renderPopup('chatgpt.com', { ...MOCK_CONFIG, enabled: true }, 1);

      expect(document.getElementById('selector-list').classList.contains('selector-list--disabled')).toBe(false);
    });
  });

  describe('renderPopup — master toggle change handler', () => {
    it('calls setDomainConfig with toggled enabled value when master toggle changes', async () => {
      const config = { ...MOCK_CONFIG, enabled: true };
      renderPopup('chatgpt.com', config, 1);

      const toggle = document.getElementById('master-toggle');
      toggle.checked = false;
      toggle.dispatchEvent(new Event('change'));

      // Allow async handler to settle
      await Promise.resolve();

      expect(mockSetDomainConfig).toHaveBeenCalledWith('chatgpt.com', expect.objectContaining({ enabled: false }));
    });
  });

  describe('renderPopup — selector rows', () => {
    it('renders a row for each selector in config', async () => {
      renderPopup('chatgpt.com', MOCK_CONFIG, 1);

      const rows = document.querySelectorAll('.selector-row');
      expect(rows).toHaveLength(2);
    });

    it('selector checkbox change calls setDomainConfig with updated selector.enabled', async () => {
      const config = JSON.parse(JSON.stringify(MOCK_CONFIG));
      renderPopup('chatgpt.com', config, 1);

      const checkboxes = document.querySelectorAll('.selector-row input[type="checkbox"]');
      // First selector is enabled: true — uncheck it
      checkboxes[0].checked = false;
      checkboxes[0].dispatchEvent(new Event('change'));

      await Promise.resolve();

      expect(mockSetDomainConfig).toHaveBeenCalledWith('chatgpt.com', expect.objectContaining({
        selectors: expect.arrayContaining([
          expect.objectContaining({ selector: '.message-content', enabled: false })
        ])
      }));
    });

    it('delete button removes selector from config array and calls setDomainConfig', async () => {
      const config = JSON.parse(JSON.stringify(MOCK_CONFIG));
      renderPopup('chatgpt.com', config, 1);

      const deleteButtons = document.querySelectorAll('.delete-btn');
      deleteButtons[0].click();

      await Promise.resolve();

      expect(mockSetDomainConfig).toHaveBeenCalledWith('chatgpt.com', expect.objectContaining({
        selectors: expect.arrayContaining([
          expect.objectContaining({ selector: '.reply-box' })
        ])
      }));
      // Only 1 selector remains (the second one)
      const calledConfig = mockSetDomainConfig.mock.calls[0][1];
      expect(calledConfig.selectors).toHaveLength(1);
    });
  });

  describe('renderPopup — add selector button', () => {
    it('clicking add selector button shows coming soon placeholder message', async () => {
      renderPopup('chatgpt.com', MOCK_CONFIG, 1);

      document.getElementById('add-selector-btn').click();

      expect(document.getElementById('add-selector-msg').hidden).toBe(false);
    });
  });

  describe('renderPopup — empty state', () => {
    it('shows empty-state element when config has no selectors', async () => {
      const emptyConfig = { enabled: true, loadDelay: 0, selectors: [] };
      renderPopup('chatgpt.com', emptyConfig, 1);

      expect(document.getElementById('empty-state').hidden).toBe(false);
    });
  });

  describe('hover highlights', () => {
    it('mouseenter on selector row sends HIGHLIGHT_SELECTOR with row selector', async () => {
      renderPopup('chatgpt.com', MOCK_CONFIG, 1);

      const rows = document.querySelectorAll('.selector-row');
      rows[0].dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      // Allow async handler to settle
      await Promise.resolve();

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        { type: 'HIGHLIGHT_SELECTOR', selector: '.message-content' }
      );
    });

    it('mouseleave on selector row sends CLEAR_HIGHLIGHT', async () => {
      renderPopup('chatgpt.com', MOCK_CONFIG, 1);

      const rows = document.querySelectorAll('.selector-row');
      rows[0].dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

      await Promise.resolve();

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        { type: 'CLEAR_HIGHLIGHT' }
      );
    });

    it('sendMessage error on mouseenter is silently caught and does not throw', async () => {
      chrome.tabs.sendMessage.mockRejectedValue(new Error('no receiver'));
      renderPopup('chatgpt.com', MOCK_CONFIG, 1);

      const rows = document.querySelectorAll('.selector-row');
      // Should not throw
      rows[0].dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await Promise.resolve();
      // No assertion needed beyond "did not throw" — test passes if we get here
    });

    it('window unload event sends CLEAR_HIGHLIGHT message', async () => {
      // tabId needs to be set — call initPopup or set it via renderPopup
      renderPopup('chatgpt.com', MOCK_CONFIG, 1);

      window.dispatchEvent(new Event('unload'));

      await Promise.resolve();

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        { type: 'CLEAR_HIGHLIGHT' }
      );
    });
  });

  describe('actions menu', () => {
    it('clicking Actions button shows the actions menu', () => {
      renderPopup('chatgpt.com', MOCK_CONFIG, 1);

      const actionsBtn = document.getElementById('actions-btn');
      const actionsMenu = document.getElementById('actions-menu');

      expect(actionsMenu.hidden).toBe(true);
      actionsBtn.click();
      expect(actionsMenu.hidden).toBe(false);
    });

    it('clicking Actions button again hides the actions menu (toggle)', () => {
      renderPopup('chatgpt.com', MOCK_CONFIG, 1);

      const actionsBtn = document.getElementById('actions-btn');
      const actionsMenu = document.getElementById('actions-menu');

      actionsBtn.click(); // open
      actionsBtn.click(); // close
      expect(actionsMenu.hidden).toBe(true);
    });

    it('clicking outside the actions-wrapper closes the actions menu', () => {
      renderPopup('chatgpt.com', MOCK_CONFIG, 1);

      const actionsBtn = document.getElementById('actions-btn');
      const actionsMenu = document.getElementById('actions-menu');

      actionsBtn.click(); // open
      // Click outside the wrapper
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(actionsMenu.hidden).toBe(true);
    });

    it('pressing Escape closes the actions menu', () => {
      renderPopup('chatgpt.com', MOCK_CONFIG, 1);

      const actionsBtn = document.getElementById('actions-btn');
      const actionsMenu = document.getElementById('actions-menu');

      actionsBtn.click(); // open
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(actionsMenu.hidden).toBe(true);
    });

    it('Export Config calls getAllConfigs and creates a Blob download', async () => {
      const mockConfigs = { 'domains.chatgpt.com': MOCK_CONFIG };
      mockGetAllConfigs.mockResolvedValue(mockConfigs);

      // Mock URL.createObjectURL and URL.revokeObjectURL
      const mockObjectURL = 'blob:mock-url';
      globalThis.URL.createObjectURL = jest.fn().mockReturnValue(mockObjectURL);
      globalThis.URL.revokeObjectURL = jest.fn();

      // Spy on document.createElement to capture anchor
      const realCreateElement = document.createElement.bind(document);
      let capturedAnchor = null;
      jest.spyOn(document, 'createElement').mockImplementation((tag) => {
        const el = realCreateElement(tag);
        if (tag === 'a') capturedAnchor = el;
        return el;
      });

      renderPopup('chatgpt.com', MOCK_CONFIG, 1);

      const actionsBtn = document.getElementById('actions-btn');
      actionsBtn.click(); // open menu
      document.querySelector('[data-action="export"]').click();

      // Allow async handler to settle
      await new Promise(r => setTimeout(r, 0));

      expect(mockGetAllConfigs).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(capturedAnchor).not.toBeNull();
      expect(capturedAnchor.download).toMatch(/^hebrew-rtl-config-\d{4}-\d{2}-\d{2}\.json$/);

      // Cleanup spy
      document.createElement.mockRestore();
    });

    it('Delete All Selectors shows confirm-dialog with domain-specific text', () => {
      renderPopup('chatgpt.com', MOCK_CONFIG, 1);

      const actionsBtn = document.getElementById('actions-btn');
      actionsBtn.click(); // open menu
      document.querySelector('[data-action="delete-all"]').click();

      const confirmDialog = document.getElementById('confirm-dialog');
      const confirmText = document.getElementById('confirm-text');

      expect(confirmDialog.hidden).toBe(false);
      expect(confirmText.textContent).toBe('Delete all selectors for chatgpt.com? This cannot be undone.');
    });

    it('confirm-dialog Confirm button empties selectors, saves config, and re-renders empty state', async () => {
      const config = JSON.parse(JSON.stringify(MOCK_CONFIG));
      renderPopup('chatgpt.com', config, 1);

      // Show the confirm dialog
      const actionsBtn = document.getElementById('actions-btn');
      actionsBtn.click();
      document.querySelector('[data-action="delete-all"]').click();

      // Click Confirm
      document.getElementById('confirm-ok').click();

      await Promise.resolve();
      await Promise.resolve(); // extra tick for setDomainConfig

      expect(mockSetDomainConfig).toHaveBeenCalledWith('chatgpt.com', expect.objectContaining({ selectors: [] }));
      expect(document.getElementById('confirm-dialog').hidden).toBe(true);
      expect(document.getElementById('empty-state').hidden).toBe(false);
    });

    it('confirm-dialog Cancel button hides dialog without changing storage', () => {
      renderPopup('chatgpt.com', MOCK_CONFIG, 1);

      const actionsBtn = document.getElementById('actions-btn');
      actionsBtn.click();
      document.querySelector('[data-action="delete-all"]').click();

      document.getElementById('confirm-cancel').click();

      expect(document.getElementById('confirm-dialog').hidden).toBe(true);
      expect(mockSetDomainConfig).not.toHaveBeenCalled();
    });

    it('Keyboard Shortcuts calls chrome.tabs.create with chrome://extensions/shortcuts', () => {
      renderPopup('chatgpt.com', MOCK_CONFIG, 1);

      const actionsBtn = document.getElementById('actions-btn');
      actionsBtn.click();
      document.querySelector('[data-action="shortcuts"]').click();

      expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'chrome://extensions/shortcuts' });
    });
  });
});
