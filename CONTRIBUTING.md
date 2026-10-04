# Contributing to ContextClip

Thank you for your interest in contributing to ContextClip! We welcome all contributions from bug reports, feature suggestions, documentation enhancements, to code pull requests.

## Development Setup

1. Clone or download this repository.
2. Open Google Chrome (or any Chromium browser like Edge, Brave, or Arc).
3. Navigate to `chrome://extensions/`.
4. Enable **Developer mode** toggle in the top-right corner.
5. Click **Load unpacked** and select the `context-clip` folder.
6. Make changes to the code and click the reload icon on the extension card in `chrome://extensions/` to test.

## Running Tests

Verify the HTML-to-Markdown extraction engine:

```bash
npm test
```

For real Chromium integration, run `npm ci`, `npx playwright install chromium`, then `npm run test:browser`. See the README for the integration coverage and environment requirements.

## Guidelines

- **Zero-bloat philosophy**: Keep the extension lightweight and 100% client-side. No external analytics, tracking, or network calls without user opt-in.
- **Privacy First**: Respect user data and ensure all processing happens directly in the browser tab.
- **Conventional Commits**: Please use clear commit messages (e.g., `feat: add custom prompt template`, `fix: table header extraction`).
