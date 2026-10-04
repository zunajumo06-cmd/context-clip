/**
 * ContextClip - Node.js Test Runner with Minimal DOM Mock
 */

const fs = require('fs');
const path = require('path');
const Extractor = require('../src/extractor.js');

// Minimal DOM Mock for testing extractor functions in Node
class MockNode {
  constructor(nodeType, tagName = '', text = '') {
    this.nodeType = nodeType; // 1 = Element, 3 = Text
    this.tagName = tagName.toUpperCase();
    this._text = text;
    this.childNodes = [];
    this.attributes = {};
    this.parentNode = null;
    this.className = '';
    this.style = {};
  }

  get textContent() {
    if (this.nodeType === 3) {
      return this._text;
    }
    return this.childNodes.map(c => c.textContent).join('');
  }

  set textContent(val) {
    if (this.nodeType === 3) {
      this._text = val;
    } else {
      this.childNodes = [new MockNode(3, '', val)];
    }
  }

  appendChild(child) {
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  setAttribute(name, val) {
    this.attributes[name] = val;
  }

  get innerText() {
    return this.textContent;
  }

  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all.length > 0 ? all[0] : null;
  }

  querySelectorAll(selector) {
    const results = [];
    const traverse = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType === 1) {
          if (matchesSelector(child, selector)) {
            results.push(child);
          }
          traverse(child);
        }
      }
    };
    traverse(this);
    return results;
  }

  remove() {
    if (this.parentNode) {
      const idx = this.parentNode.childNodes.indexOf(this);
      if (idx !== -1) {
        this.parentNode.childNodes.splice(idx, 1);
      }
    }
  }

  cloneNode(deep = true) {
    const copy = new MockNode(this.nodeType, this.tagName, this._text);
    copy.attributes = { ...this.attributes };
    copy.className = this.className;
    copy.style = { ...this.style };
    if (deep) {
      for (const child of this.childNodes) {
        copy.appendChild(child.cloneNode(true));
      }
    }
    return copy;
  }
}

function matchesSingleSelector(el, sel) {
  sel = sel.trim().toLowerCase();
  if (sel === '*') return true;
  const tag = el.tagName.toLowerCase();
  if (sel.startsWith('.')) {
    const cls = sel.slice(1);
    return (el.className || '').toLowerCase().includes(cls);
  }
  if (sel.startsWith('#')) {
    const id = sel.slice(1);
    return el.getAttribute('id') === id;
  }
  if (sel.includes('[')) {
    const match = sel.match(/\[(\w+)="?([^"\]]+)"?\]/);
    if (match) {
      return el.getAttribute(match[1]) === match[2];
    }
  }
  return tag === sel;
}

function matchesSelector(el, selector) {
  const parts = selector.split(',');
  return parts.some(part => matchesSingleSelector(el, part));
}

// Build a mock document from components
function buildTestDocument() {
  const doc = {
    title: 'Deep Dive into Transformer Architecture - TechReview',
    querySelector: (sel) => {
      if (sel.includes('author')) return { getAttribute: () => 'Dr. Jane Doe' };
      if (sel.includes('published_time')) return { getAttribute: () => '2026-09-15' };
      return null;
    }
  };

  const body = new MockNode(1, 'body');
  
  // Header / nav (clutter)
  const nav = new MockNode(1, 'nav');
  nav.className = 'navbar';
  body.appendChild(nav);

  // Main Article
  const article = new MockNode(1, 'article');
  
  // H1
  const h1 = new MockNode(1, 'h1');
  h1.appendChild(new MockNode(3, '', 'Deep Dive into Transformer Architecture'));
  article.appendChild(h1);

  // Paragraph with bold and italic
  const p1 = new MockNode(1, 'p');
  p1.appendChild(new MockNode(3, '', 'The '));
  const strong = new MockNode(1, 'strong');
  strong.appendChild(new MockNode(3, '', 'Transformer'));
  p1.appendChild(strong);
  p1.appendChild(new MockNode(3, '', ' model revolutionized AI using '));
  const em = new MockNode(1, 'em');
  em.appendChild(new MockNode(3, '', 'self-attention mechanisms'));
  p1.appendChild(em);
  p1.appendChild(new MockNode(3, '', '.'));
  article.appendChild(p1);

  // Table
  const table = new MockNode(1, 'table');
  const trHead = new MockNode(1, 'tr');
  const th1 = new MockNode(1, 'th'); th1.appendChild(new MockNode(3, '', 'Mechanism'));
  const th2 = new MockNode(1, 'th'); th2.appendChild(new MockNode(3, '', 'Complexity'));
  trHead.appendChild(th1); trHead.appendChild(th2);
  table.appendChild(trHead);

  const trRow = new MockNode(1, 'tr');
  const td1 = new MockNode(1, 'td'); td1.appendChild(new MockNode(3, '', 'Standard Attention'));
  const td2 = new MockNode(1, 'td'); td2.appendChild(new MockNode(3, '', 'O(N^2)'));
  trRow.appendChild(td1); trRow.appendChild(td2);
  table.appendChild(trRow);
  article.appendChild(table);

  // Code block
  const pre = new MockNode(1, 'pre');
  const code = new MockNode(1, 'code');
  code.className = 'language-python';
  code.textContent = 'import torch\nprint("Attention is all you need")';
  pre.appendChild(code);
  article.appendChild(pre);

  // Link
  const pLink = new MockNode(1, 'p');
  pLink.appendChild(new MockNode(3, '', 'Read more at '));
  const a = new MockNode(1, 'a');
  a.setAttribute('href', 'https://arxiv.org/abs/1706.03762');
  a.appendChild(new MockNode(3, '', 'ArXiv Paper'));
  pLink.appendChild(a);
  article.appendChild(pLink);

  body.appendChild(article);

  // Footer (clutter)
  const footer = new MockNode(1, 'footer');
  footer.className = 'footer';
  body.appendChild(footer);

  doc.body = body;
  doc.querySelector = (sel) => {
    if (sel === 'article') return article;
    if (sel.includes('author')) return { getAttribute: () => 'Dr. Jane Doe' };
    if (sel.includes('published_time')) return { getAttribute: () => '2026-09-15' };
    return null;
  };

  return doc;
}

// Run assertions
console.log('=== Running ContextClip Extraction Tests ===');

const mockDoc = buildTestDocument();
const result = Extractor.extract(mockDoc, {
  includeMetadata: true,
  includeLinks: true,
  enableTables: true,
  url: 'https://techreview.example.com/transformer-deep-dive'
});

console.log('\n--- Extraction Result ---');
console.log(result.markdown);
console.log('\n--- Stats ---');
console.log(result.stats);

// Assertions
let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`✓ PASS: ${message}`);
  }
}

assert(result.title.includes('Deep Dive into Transformer Architecture'), 'Title cleaned and preserved');
assert(result.markdown.includes('Author: "Dr. Jane Doe"'), 'Author extracted as quoted YAML');
assert(result.markdown.includes('# Deep Dive into Transformer Architecture'), 'H1 heading formatted');
assert(result.markdown.includes('**Transformer**'), 'Bold text formatted');
assert(result.markdown.includes('*self-attention mechanisms*'), 'Italic text formatted');
assert(result.markdown.includes('| Mechanism | Complexity |'), 'Table header formatted');
assert(result.markdown.includes('| Standard Attention | O(N^2) |'), 'Table row formatted');
assert(result.markdown.includes('```python'), 'Code block preserved with python tag');
assert(result.markdown.includes('[ArXiv Paper](https://arxiv.org/abs/1706.03762)'), 'Link formatted');
assert(result.stats.estimatedTokens > 0, 'Tokens calculated');
assert(!result.markdown.includes('navbar'), 'Navbar stripped');
assert(!result.markdown.includes('footer'), 'Footer stripped');

if (failures === 0) {
  console.log('\n🎉 All tests passed successfully!');
  process.exit(0);
} else {
  console.error(`\n❌ ${failures} test(s) failed.`);
  process.exit(1);
}
