/**
 * ContextClip - Popup Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const statTokens = document.getElementById('statTokens');
  const statWords = document.getElementById('statWords');
  const statChars = document.getElementById('statChars');
  const txtPreview = document.getElementById('txtPreview');
  const btnCopy = document.getElementById('btnCopy');
  const btnDownload = document.getElementById('btnDownload');
  const btnSettings = document.getElementById('btnSettings');
  const copyStatus = document.getElementById('copyStatus');

  const optMetadata = document.getElementById('optMetadata');
  const optLinks = document.getElementById('optLinks');
  const optTables = document.getElementById('optTables');
  const selPrompt = document.getElementById('selPrompt');

  const linkGithubSponsor = document.getElementById('linkGithubSponsor');
  const linkBmac = document.getElementById('linkBmac');

  let currentResult = null;
  let activeTab = null;
  let includeImages = false;
  let extractionId = 0;

  // Load user saved settings from storage
  chrome.storage.sync.get(ContextClipSettings.defaults, (items) => {
    optMetadata.checked = items.includeMetadata;
    optLinks.checked = items.includeLinks;
    optTables.checked = items.enableTables;
    selPrompt.value = items.defaultPrompt;
    includeImages = items.includeImages;

    const sponsorLinks = [
      [linkGithubSponsor, items.githubSponsorUrl],
      [linkBmac, items.bmacUrl],
      [document.getElementById('linkCustomSponsor'), items.customSponsorUrl]
    ];
    let hasSponsor = false;
    for (const [link, value] of sponsorLinks) {
      const url = ContextClipSettings.sponsorUrl(value);
      link.hidden = !url;
      if (url) { link.href = url; hasSponsor = true; }
    }
    document.getElementById('sponsorFooter').hidden = !hasSponsor;

    initExtraction();
  });

  // Open settings tab
  btnSettings.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('src/options.html'));
    }
  });

  // Re-extract when options change
  [optMetadata, optLinks, optTables, selPrompt].forEach(el => {
    el.addEventListener('change', () => {
      extractContent();
    });
  });

  async function initExtraction() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      activeTab = tab;
      if (!activeTab || !activeTab.id) {
        txtPreview.value = 'Cannot access this tab.';
        return;
      }

      // Check if page is chrome:// or edge://
      if (activeTab.url && (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('edge://') || activeTab.url.startsWith('about:'))) {
        txtPreview.value = 'ContextClip cannot run on internal browser pages.';
        return;
      }

      await extractContent();
    } catch (err) {
      console.error(err);
      txtPreview.value = 'Error initializing extraction: ' + err.message;
    }
  }

  async function extractContent() {
    if (!activeTab || !activeTab.id) return;
    const requestId = ++extractionId;
    currentResult = null;
    btnCopy.disabled = true;
    btnDownload.disabled = true;
    copyStatus.classList.add('hidden');
    [statTokens, statWords, statChars].forEach(el => { el.textContent = '--'; });

    const options = {
      includeMetadata: optMetadata.checked,
      includeLinks: optLinks.checked,
      enableTables: optTables.checked,
      includeImages,
      promptWrapper: selPrompt.value,
      url: activeTab.url
    };

    txtPreview.value = 'Extracting clean content...';

    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['src/extractor.js']
      });
      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (opts) => {
          // Injected logic: Run extraction using the extractor library
          if (typeof ContextClipExtractor !== 'undefined') {
            return ContextClipExtractor.extract(document, opts);
          }
          return null;
        },
        args: [options]
      });

      if (requestId !== extractionId) return;
      if (results && results[0] && results[0].result) {
        currentResult = results[0].result;
        renderResult(currentResult);
      } else {
        txtPreview.value = 'Failed to extract content from this page.';
      }
    } catch (e) {
      if (requestId !== extractionId) return;
      console.error(e);
      txtPreview.value = 'Unable to extract: ' + e.message;
    }
  }

  function renderResult(res) {
    txtPreview.value = res.markdown;
    statTokens.textContent = res.stats.estimatedTokens.toLocaleString();
    statWords.textContent = res.stats.words.toLocaleString();
    statChars.textContent = res.stats.characters.toLocaleString();
    btnCopy.disabled = !res.markdown.trim();
    btnDownload.disabled = !res.markdown.trim();
  }

  // Copy handler
  btnCopy.addEventListener('click', async () => {
    if (!currentResult || !currentResult.markdown) return;

    try {
      await navigator.clipboard.writeText(currentResult.markdown);
      
      // Visual feedback
      copyStatus.textContent = 'Copied!';
      copyStatus.classList.remove('hidden');
      btnCopy.innerHTML = '<span class="btn-icon">✓</span> Copied to Clipboard!';
      btnCopy.style.backgroundColor = '#10B981';

      setTimeout(() => {
        copyStatus.classList.add('hidden');
        btnCopy.innerHTML = '<span class="btn-icon">📋</span> Copy to Clipboard';
        btnCopy.style.backgroundColor = '';
      }, 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      // Fallback
      txtPreview.select();
      const copied = document.execCommand('copy');
      copyStatus.textContent = copied ? 'Copied!' : 'Copy failed. Select the preview and copy manually.';
      copyStatus.classList.remove('hidden');
    }
  });

  // Download .md handler
  btnDownload.addEventListener('click', () => {
    if (!currentResult || !currentResult.markdown) return;

    const safeTitle = (currentResult.title || 'extracted-content')
      .replace(/[/\\?%*:|"<>]/g, '-')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    const filename = `${safeTitle}.md`;
    const blob = new Blob([currentResult.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
});
