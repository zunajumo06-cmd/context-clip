/**
 * ContextClip - Core Extraction & HTML to Markdown Engine
 * Optimized for LLM Prompt Efficiency (ChatGPT, Claude, Cursor, Gemini)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ContextClipExtractor = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Main extractor object
   */
  const Extractor = {};

  /**
   * Tags and selectors typically considered boilerplate/clutter
   */
  const NOISE_SELECTORS = [
    'script', 'style', 'noscript', 'iframe', 'canvas', 'svg',
    'nav', 'footer', 'aside',
    '.nav', '.navbar', '.footer', '.sidebar', '.menu',
    '.ad', '.ads', '.advertisement', '.banner',
    '.cookie-consent', '.cookie-banner', '.gdpr',
    '.social-share', '.share-buttons', '.comments', '.comment-section',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
    '[aria-hidden="true"]'
  ];

  /**
   * Candidate selectors for main article content
   */
  const CANDIDATE_SELECTORS = [
    'article',
    '[role="main"]',
    'main',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content-area',
    '.markdown-body',
    '#content',
    '.content'
  ];

  /**
   * Estimates tokens with a language heuristic; not a model tokenizer.
   */
  Extractor.estimateTokens = function (text) {
    if (!text) return 0;
    // Count CJK characters
    const cjkMatches = text.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g) || [];
    const cjkCount = cjkMatches.length;
    // Count non-CJK words
    const nonCjkText = text.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, ' ');
    const words = (nonCjkText.match(/\b\w+\b/g) || []).length;
    
    // Heuristic: 1 CJK char ~ 1 token, 1 English word ~ 1.3 tokens
    return Math.ceil(cjkCount * 1.0 + words * 1.3);
  };

  /**
   * Locates the primary content container in a DOM document
   */
  Extractor.findMainElement = function (doc) {
    // 1. Try explicit candidates
    for (const selector of CANDIDATE_SELECTORS) {
      const el = doc.querySelector(selector);
      if (el && (el.innerText || el.textContent || '').trim()) {
        return el;
      }
    }

    // 2. Fallback: Score containers by paragraph density & text length
    const body = doc.body;
    if (!body) return doc.documentElement;

    const divs = Array.from(body.querySelectorAll('div, section, article'));
    let bestEl = body;
    let maxScore = 0;

    for (const div of divs) {
      const text = div.innerText || '';
      const textLen = text.trim().length;
      if (textLen < 200) continue;

      const pCount = div.querySelectorAll('p').length;
      const linkTextLen = Array.from(div.querySelectorAll('a'))
        .reduce((acc, a) => acc + (a.innerText || '').length, 0);

      // Penalize link-heavy sections (navbars/link farms)
      const linkDensity = linkTextLen / (textLen || 1);
      if (linkDensity > 0.45) continue;

      // Score based on text volume and paragraph count
      const score = (textLen * 0.7) + (pCount * 100) * (1 - linkDensity);
      if (score > maxScore) {
        maxScore = score;
        bestEl = div;
      }
    }

    return bestEl;
  };

  /**
   * Cleans unwanted elements from a cloned DOM element
   */
  Extractor.cleanDom = function (element) {
    for (const sel of NOISE_SELECTORS) {
      try {
        const matches = element.querySelectorAll(sel);
        matches.forEach(el => el.remove());
      } catch (e) {
        // ignore invalid selector errors if any
      }
    }

    // Preserve article headings in semantic headers; remove hidden content.
    const all = element.querySelectorAll('*');
    all.forEach(el => {
      if ((el.hasAttribute && el.hasAttribute('hidden')) ||
          (el.style && (el.style.display === 'none' || el.style.visibility === 'hidden'))) {
        el.remove();
      }
    });

    return element;
  };

  /**
   * Converts a DOM node into Markdown string
   */
  Extractor.nodeToMarkdown = function (node, options) {
    options = Object.assign({
      includeLinks: true,
      includeImages: false,
      enableTables: true
    }, options);

    if (!node) return '';

    // Node.TEXT_NODE
    if (node.nodeType === 3) {
      return node.textContent.replace(/\s+/g, ' ')
        .replace(/([\\`*\[\]_])/g, '\\$1');
    }

    // Node.ELEMENT_NODE
    if (node.nodeType !== 1) {
      return '';
    }

    const tagName = node.tagName.toLowerCase();

    // Check if element is a pre/code block
    if (tagName === 'pre') {
      const codeChild = node.querySelector('code');
      let lang = '';
      if (codeChild) {
        const cls = codeChild.className || '';
        const match = cls.match(/(?:lang|language)-([\w.+-]+)/i);
        if (match) lang = match[1];
      }
      const codeText = (codeChild ? codeChild.textContent : node.textContent).replace(/\n$/, '');
      const runs = codeText.match(/`+/g) || [];
      const fence = '`'.repeat(Math.max(3, ...runs.map(run => run.length + 1)));
      return `\n\n${fence}${lang}\n${codeText}\n${fence}\n\n`;
    }

    if (tagName === 'code') {
      // Inline code
      const text = node.textContent.replace(/\n/g, ' ');
      const runs = text.match(/`+/g) || [];
      const fence = '`'.repeat(Math.max(1, ...runs.map(run => run.length + 1)));
      const padding = text.startsWith('`') || text.endsWith('`') || /^ .* $/.test(text) ? ' ' : '';
      return `${fence}${padding}${text}${padding}${fence}`;
    }

    // Process children
    let childrenMd = '';
    for (const child of node.childNodes) {
      childrenMd += Extractor.nodeToMarkdown(child, options);
    }

    switch (tagName) {
      case 'h1':
        return `\n\n# ${childrenMd.trim()}\n\n`;
      case 'h2':
        return `\n\n## ${childrenMd.trim()}\n\n`;
      case 'h3':
        return `\n\n### ${childrenMd.trim()}\n\n`;
      case 'h4':
        return `\n\n#### ${childrenMd.trim()}\n\n`;
      case 'h5':
        return `\n\n##### ${childrenMd.trim()}\n\n`;
      case 'h6':
        return `\n\n###### ${childrenMd.trim()}\n\n`;
      case 'p':
        return `\n\n${childrenMd.trim()}\n\n`;
      case 'br':
        return '\n';
      case 'hr':
        return '\n\n---\n\n';
      case 'strong':
      case 'b':
        return childrenMd.trim() ? `**${childrenMd.trim()}**` : '';
      case 'em':
      case 'i':
        return childrenMd.trim() ? `*${childrenMd.trim()}*` : '';
      case 'del':
      case 's':
      case 'strike':
        return childrenMd.trim() ? `~~${childrenMd.trim()}~~` : '';
      case 'blockquote':
        return `\n\n> ${childrenMd.trim().split('\n').join('\n> ')}\n\n`;
      case 'ul':
        return `\n\n${childrenMd.trim()}\n\n`;
      case 'ol':
        return `\n\n${childrenMd.trim()}\n\n`;
      case 'li': {
        const parentTag = node.parentNode ? node.parentNode.tagName.toLowerCase() : 'ul';
        if (parentTag === 'ol') {
          const siblings = Array.from(node.parentNode.children || node.parentNode.childNodes)
            .filter(child => child.tagName && child.tagName.toLowerCase() === 'li');
          let index = Number(node.parentNode.getAttribute('start') || 1);
          for (const sibling of siblings) {
            const value = sibling.getAttribute('value');
            if (value !== null) index = Number(value);
            if (sibling === node) break;
            index++;
          }
          const prefix = `${index}. `;
          return `\n${prefix}${childrenMd.trim().replace(/\n/g, '\n' + ' '.repeat(prefix.length))}`;
        }
        return `\n- ${childrenMd.trim().replace(/\n/g, '\n  ')}`;
      }
      case 'a': {
        const text = childrenMd.trim();
        const href = node.getAttribute('href');
        if (!options.includeLinks || !href) {
          return text;
        }
        const resolved = Extractor.resolveUrl(href, options.baseUrl || options.url);
        return text && resolved ? `[${text}](${resolved})` : text;
      }
      case 'img': {
        if (!options.includeImages) return '';
        const alt = node.getAttribute('alt') || 'image';
        const src = node.getAttribute('src');
        const resolved = Extractor.resolveUrl(src, options.baseUrl || options.url);
        return resolved ? `![${alt.replace(/[\[\]]/g, '\\$&')}](${resolved})` : '';
      }
      case 'table': {
        if (!options.enableTables) return '\n\n' + Array.from(node.querySelectorAll('tr'))
          .map(row => Array.from(row.querySelectorAll('th, td')).map(cell => cell.textContent.trim()).join(' | '))
          .join('\n') + '\n\n';
        return Extractor.tableToMarkdown(node);
      }
      default:
        return childrenMd;
    }
  };

  Extractor.resolveUrl = function (value, base) {
    try {
      const url = base ? new URL(value, base) : new URL(value);
      return ['http:', 'https:', 'mailto:'].includes(url.protocol)
        ? url.href.replace(/[()<>]/g, char => '%' + char.charCodeAt(0).toString(16).toUpperCase()) : '';
    } catch {
      return '';
    }
  };

  /**
   * Converts HTML <table> to GitHub Flavored Markdown table
   */
  Extractor.tableToMarkdown = function (tableNode) {
    const rows = Array.from(tableNode.querySelectorAll('tr'));
    if (!rows.length) return '';

    const matrix = [];
    rows.forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('th, td')).map(td => {
        return td.textContent.replace(/[\n\r]+/g, ' ').replace(/\|/g, '\\|').trim();
      });
      if (cells.length > 0) matrix.push(cells);
    });

    if (!matrix.length) return '';

    const maxCols = Math.max(...matrix.map(r => r.length));
    if (maxCols === 0) return '';

    let md = '\n\n';
    
    // Header
    const header = matrix[0];
    while (header.length < maxCols) header.push('');
    md += '| ' + header.join(' | ') + ' |\n';
    md += '| ' + new Array(maxCols).fill('---').join(' | ') + ' |\n';

    // Rows
    for (let i = 1; i < matrix.length; i++) {
      const row = matrix[i];
      while (row.length < maxCols) row.push('');
      md += '| ' + row.join(' | ') + ' |\n';
    }

    return md + '\n';
  };

  /**
   * Cleans excessive blank lines and trailing whitespace
   */
  Extractor.normalizeMarkdown = function (md) {
    if (!md) return '';
    // Protect fenced code before collapsing whitespace in prose.
    const blocks = [];
    const protectedMd = md.replace(/^(`{3,})([^\n]*)\n[\s\S]*?^\1[ \t]*$/gm, block => {
      const key = `\u0000CONTEXTCLIP_CODE_${blocks.length}\u0000`;
      blocks.push(block);
      return key;
    });
    return protectedMd
      .replace(/[ \t]+$/gm, '')           // Trailing spaces
      .replace(/\n{3,}/g, '\n\n')          // Max 2 consecutive linebreaks
      .trim()
      .replace(/\u0000CONTEXTCLIP_CODE_(\d+)\u0000/g, (_, index) => blocks[Number(index)]);
  };

  /**
   * Extracts page metadata (Title, Author, Published Date, URL)
   */
  Extractor.getMetadata = function (doc, url) {
    const meta = {
      title: doc.title || '',
      url: url || (typeof window !== 'undefined' ? window.location.href : ''),
      author: '',
      date: ''
    };

    // Try meta tags
    const authorEl = doc.querySelector('meta[name="author"], meta[property="article:author"], meta[name="twitter:creator"]');
    if (authorEl) meta.author = authorEl.getAttribute('content') || '';

    const dateEl = doc.querySelector('meta[property="article:published_time"], meta[name="date"], time[datetime]');
    if (dateEl) {
      meta.date = dateEl.getAttribute('content') || dateEl.getAttribute('datetime') || dateEl.innerText || '';
    }

    // Clean title
    if (meta.title) {
      meta.title = meta.title.replace(/\s*[-–|]\s*[^|–-]+$/, '').trim();
    }

    return meta;
  };

  /**
   * Main function: extract clean LLM-ready markdown from a Document object
   */
  Extractor.extract = function (doc, options) {
    options = Object.assign({
      includeMetadata: true,
      includeLinks: true,
      includeImages: false,
      enableTables: true,
      promptWrapper: 'none' // 'none' | 'summary' | 'qa' | 'explain'
    }, options);

    const meta = Extractor.getMetadata(doc, options.url);
    options.baseUrl = options.baseUrl || doc.baseURI || options.url;
    const mainEl = options.selection ? doc.body : Extractor.findMainElement(doc);
    if (!mainEl) throw new Error('This page has no readable content.');
    const cloned = mainEl.cloneNode(true);
    const cleaned = Extractor.cleanDom(cloned);

    let bodyMd = Extractor.nodeToMarkdown(cleaned, options);
    bodyMd = Extractor.normalizeMarkdown(bodyMd);

    // Format output
    let output = '';

    if (options.includeMetadata) {
      output += `---\n`;
      output += `Title: ${JSON.stringify(meta.title)}\n`;
      if (meta.author) output += `Author: ${JSON.stringify(meta.author)}\n`;
      if (meta.date) output += `Date: ${JSON.stringify(meta.date)}\n`;
      if (meta.url) output += `Source: ${JSON.stringify(meta.url)}\n`;
      output += `---\n\n`;
    }

    // Apply prompt wrappers if selected
    if (options.promptWrapper === 'summary') {
      output += `Please provide a concise, structured executive summary and key takeaways of the following text:\n\n`;
    } else if (options.promptWrapper === 'qa') {
      output += `Analyze the following content and be prepared to answer in-depth technical questions about it:\n\n`;
    } else if (options.promptWrapper === 'explain') {
      output += `Explain the main concepts and technical architecture described in this content in simple terms:\n\n`;
    }

    output += bodyMd;

    const tokenCount = Extractor.estimateTokens(output);
    const charCount = output.length;
    const wordCount = typeof Intl.Segmenter === 'function'
      ? Array.from(new Intl.Segmenter(undefined, { granularity: 'word' }).segment(output))
        .filter(segment => segment.isWordLike).length
      : (output.match(/[\p{L}\p{N}]+/gu) || []).length;

    return {
      title: meta.title,
      url: meta.url,
      markdown: output,
      stats: {
        characters: charCount,
        words: wordCount,
        estimatedTokens: tokenCount
      }
    };
  };

  return Extractor;
});
