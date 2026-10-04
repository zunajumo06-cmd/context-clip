# ContextClip privacy policy

This policy covers ContextClip version 1.0.1 distributed with this source.

## Webpage content

When you invoke ContextClip, it reads the current page or selected text to create Markdown. It may include the page title, source URL, author and publication date if metadata is enabled. Processing happens in the browser; the extension does not transmit extracted content to a remote service or retain a history of clipped pages.

The preview remains in the popup until it closes. Content copied to the system clipboard or downloaded as a file may remain there according to your device settings. If you paste output into another application, that application handles it under its own policies.

## Preferences

The extension saves extraction preferences and optional sponsorship page URLs using Chrome's `storage.sync` API. Your browser may synchronize these settings through your browser account when sync is enabled. Extracted page content is not stored in this preferences area.

## Network requests and third parties

ContextClip does not include analytics, tracking, advertisements, a remote extraction API or a backend server. Conversion does not fetch linked webpages or images; image inclusion writes a URL into Markdown. The original webpage may make its own network requests independently of the extension.

Sponsorship links, when configured, open a third-party site only when you click them. That site's privacy and payment policies apply. No card information or payment processing is handled by the extension.

## Permissions

The extension requests `activeTab`, `scripting`, `storage`, `contextMenus` and `clipboardWrite` for the functionality described in the README. It does not request persistent access to every website.

## Removing data and questions

Remove the extension to remove its browser-managed extension data. Clipboard text and downloaded files must be removed using your device controls. For questions about this distribution, use [the project's GitHub issue tracker](https://github.com/zunajumo06-cmd/context-clip/issues). Forks should supply their own support contact and policy.
