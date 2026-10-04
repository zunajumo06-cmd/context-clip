# ContextClip

Copy webpage content as Markdown for ChatGPT, Claude, Cursor, Gemini or any other text workflow. ContextClip is a free, MIT-licensed Manifest V3 browser extension.

## Features

- Extract article content and remove common navigation, sidebar and advertising elements.
- Preview Markdown with headings, lists, GFM tables, links and fenced code blocks.
- Copy from the popup, use a keyboard shortcut, or right-click a page or selected text.
- Download the output as a `.md` file.
- View approximate token counts, Unicode word counts and character counts.
- Choose a built-in summary, technical Q&A or simple-explanation prompt prefix.
- Configure image inclusion and optional creator sponsorship links.

Extraction uses heuristics and may need manual review on unusual pages. Token counts are estimates, not an exact tokenizer or billing measurement. GFM tables cannot fully represent merged HTML cells. Browser-internal pages and other pages Chrome restricts cannot be clipped.

## Install locally

Repository: https://github.com/zunajumo06-cmd/context-clip

```bash
git clone https://github.com/zunajumo06-cmd/context-clip.git
```

1. Download and extract the extension ZIP, or download the source repository.
2. Open `chrome://extensions/` (Chrome/Brave) or `edge://extensions/` (Edge).
3. Enable **Developer mode** and click **Load unpacked**.
4. Select the directory that directly contains `manifest.json`.
5. Pin ContextClip to your toolbar and open a regular webpage.

For `file://` pages, enable **Allow access to file URLs** in the extension details. Installation and shortcuts in other Chromium browsers may differ; the automated integration suite uses Chromium.

## Usage

Click the toolbar icon to preview, copy or download a page. Right-click the page to copy it immediately, or select text and choose **Copy selection as Markdown**.

| System | Default instant-copy shortcut |
| --- | --- |
| macOS | Command + Shift + C |
| Windows/Linux | Alt + Shift + C |

These shortcuts can conflict with browser or system commands. Set your preferred shortcut at `chrome://extensions/shortcuts`. Shortcut and right-click extraction use saved preferences. Popup checkbox changes affect the current preview; persist your defaults in Settings.

## Privacy and permissions

Page extraction and conversion run in the browser. The extension has no analytics, tracking SDK or remote extraction API. Extracted webpage content is not sent to ContextClip servers.

Preferences and optional sponsorship URLs are saved using `chrome.storage.sync`; Chrome may synchronize these settings through the browser account when sync is enabled. Copied content is written to the system clipboard, and downloaded content is saved to the user's device. Clicking a sponsorship link opens that third-party website, which has its own privacy policy.

| Permission | Purpose |
| --- | --- |
| `activeTab` | Access the current page after an explicit user action |
| `scripting` | Inject the local extraction and clipboard code into that page |
| `storage` | Save preferences and sponsorship links |
| `contextMenus` | Provide page and selected-text commands |
| `clipboardWrite` | Copy output, including from pages where the Clipboard API is unavailable |

See [PRIVACY.md](PRIVACY.md).

## Development and tests

Node.js 20+ is required; Python 3.9+ is required for ZIP packaging.

```bash
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

`npm test` covers extraction and background regressions. `npm run test:browser` loads the actual extension into Chromium with its production manifest, grants `activeTab` through the toolbar action, and tests extraction, clipboard, selected text, saved settings, popup actions, download and restricted-page errors. This suite uses Chromium's experimental extension debugging API and the pinned Playwright version. It writes screenshots and results to the ignored `test-artifacts/` directory.

`npm run build` generates separate store and source ZIPs in `dist/`. The store ZIP contains only runtime files, LICENSE and PRIVACY.md; `manifest.json` is at its root. Playwright is a development dependency and is not included in the extension.

## Sponsorship

ContextClip stays free. Sponsorship is optional. No creator payment account is configured in this release, so the popup's donation section is hidden by default.

To configure your own distribution:

1. Put your verified HTTPS creator page URL in `src/settings.js` defaults.
2. Enable the matching entry in [.github/FUNDING.yml](.github/FUNDING.yml).
3. Add your creator page link here and rebuild.

Settings override sponsorship URLs locally; they do not configure other users' installations. Do not include bank-card details, example wallet addresses or generic platform homepages in public code. Cryptocurrency instructions belong on a verified support page, not as a non-URL `custom` entry in FUNDING.yml.

## License and contributions

[MIT License](LICENSE). See [CONTRIBUTING.md](CONTRIBUTING.md) and [CHANGELOG.md](CHANGELOG.md).

Report bugs or ask for support in [GitHub Issues](https://github.com/zunajumo06-cmd/context-clip/issues).
