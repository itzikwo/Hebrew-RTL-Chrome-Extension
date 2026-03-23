/** @jest-environment jsdom */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createChromeMock } from './__mocks__/chrome.js';

// Mock storage module before dynamic import of popup.js
const mockGetDomainConfig = jest.fn();
const mockSetDomainConfig = jest.fn();

jest.unstable_mockModule('../lib/storage.js', () => ({
  getDomainConfig: mockGetDomainConfig,
  setDomainConfig: mockSetDomainConfig,
  getAllConfigs: jest.fn().mockResolvedValue({})
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
});
