(function (root) {
  'use strict';
  const defaults = Object.freeze({
    includeMetadata: true,
    includeLinks: true,
    enableTables: true,
    includeImages: false,
    defaultPrompt: 'none',
    githubSponsorUrl: '',
    bmacUrl: '',
    customSponsorUrl: ''
  });

  function sponsorUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password) return '';
      // Generic platform homepages are not a creator's sponsorship page.
      if ((url.hostname === 'github.com' && /^\/sponsors\/?$/.test(url.pathname)) ||
          (url.hostname === 'buymeacoffee.com' && /^\/?$/.test(url.pathname))) return '';
      return url.href;
    } catch {
      return '';
    }
  }

  function extractionOptions(settings) {
    return {
      includeMetadata: settings.includeMetadata,
      includeLinks: settings.includeLinks,
      enableTables: settings.enableTables,
      includeImages: settings.includeImages,
      promptWrapper: settings.defaultPrompt
    };
  }

  root.ContextClipSettings = { defaults, sponsorUrl, extractionOptions };
})(typeof self !== 'undefined' ? self : this);
