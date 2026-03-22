// config/default-sites.js
// Pre-configured selectors for the 5 target platforms.
// Selectors are MEDIUM confidence — must be validated in browser.
// See 02-RESEARCH.md Platform CSS Selectors section for sources and alternatives.

export const DEFAULT_DOMAINS = {
  'chatgpt.com': {
    enabled: true,
    loadDelay: 0,
    selectors: [
      {
        id: 'chatgpt_assistant',
        selector: 'div[data-message-author-role="assistant"] .markdown',
        enabled: true,
        forceRTL: false
      },
      {
        id: 'chatgpt_user',
        selector: 'div[data-message-author-role="user"] .whitespace-pre-wrap',
        enabled: true,
        forceRTL: false
      }
    ]
  },
  'claude.ai': {
    enabled: true,
    loadDelay: 0,
    selectors: [
      {
        id: 'claude_response',
        selector: '.font-claude-message',
        enabled: true,
        forceRTL: false
      },
      {
        id: 'claude_user',
        selector: 'div[data-testid="user-message"]',
        enabled: true,
        forceRTL: false
      }
    ]
  },
  'gemini.google.com': {
    enabled: true,
    loadDelay: 500,
    selectors: [
      {
        id: 'gemini_response',
        selector: 'message-content',
        enabled: true,
        forceRTL: false
      },
      {
        id: 'gemini_response_alt',
        selector: 'model-response .markdown',
        enabled: true,
        forceRTL: false
      }
    ]
  },
  'notebooklm.google.com': {
    enabled: true,
    loadDelay: 500,
    selectors: [
      {
        id: 'notebooklm_response',
        selector: '.response-container .chat-message',
        enabled: true,
        forceRTL: false
      }
    ]
  },
  'app.slack.com': {
    enabled: true,
    loadDelay: 1000,
    selectors: [
      {
        id: 'slack_message',
        selector: '.c-message_kit__background .p-rich_text_section',
        enabled: true,
        forceRTL: false
      },
      {
        id: 'slack_message_alt',
        selector: '.p-rich_text_section',
        enabled: true,
        forceRTL: false
      }
    ]
  }
};
