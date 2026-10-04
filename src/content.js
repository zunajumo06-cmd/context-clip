/**
 * ContextClip - Content Script
 * Listens for in-page shortcut triggers and message requests
 */

(function () {
  // Listen for messages from extension background/popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extract') {
      try {
        if (typeof ContextClipExtractor !== 'undefined') {
          const res = ContextClipExtractor.extract(document, request.options || {});
          sendResponse({ success: true, data: res });
        } else {
          sendResponse({ success: false, error: 'Extractor not loaded' });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    }
    return true;
  });
})();
