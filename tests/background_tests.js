const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

async function run({ copyFails = false, injectionFails = false } = {}) {
  const calls = [];
  let badge;
  const data = { markdown: '# First visit', stats: { estimatedTokens: 3 } };
  const listeners = {};
  const context = {
    console: { error() {} }, URL, setTimeout() {},
    chrome: {
      runtime: { onInstalled: { addListener(fn) { listeners.install = fn; } } },
      contextMenus: { create() {}, onClicked: { addListener(fn) { listeners.menu = fn; } } },
      commands: { onCommand: { addListener(fn) { listeners.command = fn; } } },
      storage: { sync: { async get(defaults) { return { ...defaults, includeImages: true, defaultPrompt: 'qa' }; } } },
      action: { setBadgeText({ text }) { badge = text; }, setBadgeBackgroundColor() {} },
      scripting: { async executeScript(request) {
        calls.push(request);
        if (request.files) {
          if (injectionFails) throw new Error('Cannot access a restricted page');
          return [];
        }
        if (calls.length === 2) return [{ result: data }];
        if (copyFails) throw new Error('Clipboard rejected');
        return [{ result: true }];
      } },
      tabs: { query(_, fn) { fn([{ id: 7 }]); } }
    }
  };
  context.self = context;
  vm.createContext(context);
  context.importScripts = file => vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/background.js'), 'utf8'), context);
  const result = await context.executeExtraction(7);
  return { calls, badge, result, context };
}

(async () => {
  const first = await run();
  assert.equal(first.calls[0].files[0], 'src/extractor.js');
  assert.equal(first.calls[1].args[1].includeImages, true);
  assert.equal(first.calls[1].args[1].promptWrapper, 'qa');
  assert.equal(first.result.markdown, '# First visit');
  assert.match(first.badge, /^✓/);
  const failedCopy = await run({ copyFails: true });
  assert.equal(failedCopy.result, null);
  assert.equal(failedCopy.badge, 'ERR');
  const restricted = await run({ injectionFails: true });
  assert.equal(restricted.calls.length, 1);
  assert.equal(restricted.badge, 'ERR');

  // Execute the actual injected clipboard function and prove it waits for rejection.
  let resolveCopy;
  const clipboard = { writeText: () => new Promise(resolve => { resolveCopy = resolve; }) };
  first.context.navigator = { clipboard };
  const copyFunction = vm.runInContext('(' + first.calls[2].func.toString() + ')', first.context);
  let finished = false;
  const copy = copyFunction('markdown').then(() => { finished = true; });
  await Promise.resolve();
  assert.equal(finished, false);
  resolveCopy();
  await copy;
  assert.equal(finished, true);

  const settings = first.context.ContextClipSettings;
  assert.equal(settings.sponsorUrl('javascript:alert(1)'), '');
  assert.equal(settings.sponsorUrl('https://github.com/sponsors'), '');
  assert.equal(settings.sponsorUrl('https://buymeacoffee.com'), '');
  assert.equal(settings.sponsorUrl('https://ko-fi.com/example'), 'https://ko-fi.com/example');
  console.log('Background regressions passed: first-use injection, settings, clipboard completion/failure, restricted pages and sponsor URL validation.');
})().catch(error => { console.error(error); process.exit(1); });
