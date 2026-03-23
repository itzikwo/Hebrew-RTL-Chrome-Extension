# Hebrew RTL

A Chrome extension that automatically fixes Hebrew text direction on any website.

Most English-first websites don't handle Hebrew properly — paragraphs align left, punctuation lands on the wrong side, and mixed Hebrew-English content looks scrambled. Hebrew RTL corrects this at the element level, without touching the rest of the page.

---

## Features

- **Auto-detection** — uses Unicode BiDi analysis to detect Hebrew and apply `direction: rtl` only where needed
- **Visual element picker** — point and click to add RTL correction to any element on any site
- **Per-domain configuration** — each site has its own independent settings
- **Keyboard shortcut** — `Ctrl+Shift+H` / `⌃⇧H` to toggle on/off instantly
- **Syncs across devices** — configuration saved to Chrome sync storage
- **Streaming support** — re-evaluates direction as AI responses stream in

## Pre-configured sites

Works out of the box on:

| Site | Domain |
|------|--------|
| ChatGPT | chatgpt.com |
| Claude | claude.ai |
| Google Gemini | gemini.google.com |
| NotebookLM | notebooklm.google.com |
| Slack | app.slack.com |

## Installation

### From the Chrome Web Store
Search for **Hebrew RTL** or install directly from the Chrome Web Store.

### Manual (developer mode)
1. Clone this repo:
   ```bash
   git clone https://github.com/itzikwo/Hebrew-RTL-Chrome-Extension.git
   ```
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the project folder

## Usage

### Pre-configured sites
Navigate to ChatGPT, Claude, Gemini, NotebookLM, or Slack — RTL correction applies automatically.

### Adding a new site
1. Go to the website you want to fix
2. Click the extension icon → **+ Add Selector**
3. Hover over elements on the page (they highlight in amber)
4. Click an element to open the **Selector Builder**
5. Adjust the ancestor level and filters — see a live preview of matched elements
6. Click **Save Selector**

### Managing selectors
- **Master toggle** — enable/disable all RTL corrections for the current domain
- **Per-selector toggle** — enable/disable individual selectors
- **Hover a selector row** — highlights matching elements on the page in blue
- **Actions menu** — export config, delete all selectors, keyboard shortcuts, help

## How it works

The RTL engine uses a two-pass Unicode BiDi algorithm:

1. **First-strong character** — if the first non-neutral character is Hebrew, apply RTL
2. **Hebrew ratio** — if ≥ 30% of letters are Hebrew (`U+0590–05FF`, `U+FB1D–FB4F`), apply RTL

Applied styles use `!important` to override site CSS:
```css
direction: rtl !important;
text-align: right !important;
```

Code blocks, math formulas, URLs, and file paths are always exempted.

A `MutationObserver` watches for DOM changes so new content (including AI streaming responses) is corrected automatically.

## Project structure

```
├── manifest.json           Chrome extension manifest (MV3)
├── background.js           Service worker
├── content.js              Content script — RTL engine + message handler
├── popup/
│   ├── popup.html          Extension popup UI
│   └── popup.js            Popup controller
├── lib/
│   ├── rtl-engine.js       Core RTL processing
│   ├── bidi-detect.js      Hebrew detection algorithm
│   ├── picker.js           Visual element picker + selector builder
│   ├── picker.browser.js   Browser-safe picker bundle (no ESM exports)
│   ├── storage.js          Chrome storage abstraction
│   └── background-handlers.js  Service worker handlers
├── config/
│   └── default-sites.js    Pre-configured site selectors
├── help/
│   └── help.html           In-extension help page
└── icons/                  Extension icons and store assets
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test
```

After making changes, reload the extension at `chrome://extensions` by clicking the refresh icon.

## Privacy

This extension collects no user data. All configuration is stored locally in `chrome.storage.sync`. No analytics, no tracking, no external requests. See [privacy-policy.md](privacy-policy.md).

## License

MIT
