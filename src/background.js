/**
 * ContextClip - Background Service Worker (Manifest V3)
 */

importScripts('settings.js');

// Setup context menus upon installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'contextclip_copy_all',
    title: 'ContextClip: Copy page as clean Markdown',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'contextclip_copy_selection',
    title: 'ContextClip: Copy selection as Markdown',
    contexts: ['selection']
  });
});

// Helper: Show brief feedback badge on extension icon
function showBadgeFeedback(tabId, text, color) {
  chrome.action.setBadgeText({ tabId: tabId, text: text });
  chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: color || '#10B981' });
  setTimeout(() => {
    chrome.action.setBadgeText({ tabId: tabId, text: '' });
  }, 2500);
}

// Handler for executing extraction in a tab
async function executeExtraction(tabId, isSelection = false) {
  try {
    const settings = await chrome.storage.sync.get(ContextClipSettings.defaults);
    const options = ContextClipSettings.extractionOptions(settings);
    // Shortcuts and context menus must work before the popup has ever opened.
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['src/extractor.js']
    });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (isSel, opts) => {
        // If selection requested and user selected text
        if (isSel) {
          const selection = window.getSelection();
          if (!selection || !selection.rangeCount || !selection.toString().trim()) {
            throw new Error('Select some text before copying a selection.');
          }
          const range = selection.getRangeAt(0);
          const clonedDiv = document.createElement('div');
          clonedDiv.appendChild(range.cloneContents());

          const dummyDoc = document.implementation.createHTMLDocument('Selection');
          dummyDoc.body.appendChild(clonedDiv);

          // Return selection markdown
          if (typeof ContextClipExtractor !== 'undefined') {
            return ContextClipExtractor.extract(dummyDoc, Object.assign({}, opts, {
              includeMetadata: false,
              url: window.location.href,
              baseUrl: document.baseURI,
              selection: true
            }));
          }
        }

        // Full page extraction
        if (typeof ContextClipExtractor !== 'undefined') {
          return ContextClipExtractor.extract(document, Object.assign({}, opts, {
            url: window.location.href
          }));
        }

        return null;
      },
      args: [isSelection, options]
    });

    if (results && results[0] && results[0].result) {
      const data = results[0].result;
      
      // Copy to clipboard via scripting
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: async (text) => {
          try {
            await navigator.clipboard.writeText(text);
          } catch {
            // Also works on HTTP pages where navigator.clipboard is unavailable.
            const field = document.createElement('textarea');
            field.value = text;
            field.style.position = 'fixed';
            field.style.opacity = '0';
            const previousFocus = document.activeElement;
            document.body.appendChild(field);
            field.select();
            try {
              if (!document.execCommand('copy')) throw new Error('Clipboard copy failed.');
            } finally {
              field.remove();
              if (previousFocus && previousFocus.focus) previousFocus.focus();
            }
          }
          return true;
        },
        args: [data.markdown]
      });

      const tokenStr = data.stats.estimatedTokens > 1000 
        ? `${Math.round(data.stats.estimatedTokens / 1000)}k` 
        : `${data.stats.estimatedTokens}`;
      showBadgeFeedback(tabId, `✓ ${tokenStr}`, '#4F46E5');
      return data;
    }
    throw new Error('No content could be extracted.');
  } catch (err) {
    console.error('ContextClip extraction failed:', err);
    showBadgeFeedback(tabId, 'ERR', '#EF4444');
    return null;
  }
}

// Context menu click listener
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === 'contextclip_copy_all') {
    executeExtraction(tab.id, false);
  } else if (info.menuItemId === 'contextclip_copy_selection') {
    executeExtraction(tab.id, true);
  }
});

// Keyboard shortcut command listener
chrome.commands.onCommand.addListener((command) => {
  if (command === 'copy-clean-markdown') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        executeExtraction(tabs[0].id, false);
      }
    });
  }
});
