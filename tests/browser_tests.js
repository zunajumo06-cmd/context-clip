const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const artifactDir = path.join(root, 'test-artifacts');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'contextclip-test-'));
const fixture = `<!doctype html><html><head><meta charset="UTF-8"><title>Fixture: Markdown - ContextClip</title></head><body>
<nav>Navigation junk</nav><article><header><h1>Preserved article heading</h1></header>
<p>Short article: 中文内容。 Read <a href="../guide?q=(test)">the guide</a>.</p>
<p><a href="JaVaScRiPt:alert(1)">unsafe link</a> <strong>bold</strong></p>
<p hidden>Hidden junk</p><aside>Sidebar junk</aside>
<ol start="3"><li>Third<ul><li>Nested</li></ul></li><li value="8">Eighth</li></ol>
<table><tr><th>Name</th><th>Value</th></tr><tr><td>A | B</td><td>42</td></tr></table>
<pre><code class="language-python">  first = 1  \n\n\nlast = 2\nprint("\`\`\`")</code></pre>
<p><code>a\`b</code></p><img src="/diagram.svg" alt="diagram">
<p id="selection">Keep <strong>all selected text</strong>.</p></article><footer>Footer junk</footer>
</body></html>`;
const server = http.createServer((req, res) => {
  if (req.url === '/diagram.svg') {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.end('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"></svg>');
  } else {
    res.setHeader('Content-Type', 'text/html');
    res.end(fixture);
  }
});

(async () => {
  let context;
  try {
    server.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium', headless: true,
      args: ['--no-sandbox', '--enable-unsafe-extension-debugging',
        `--disable-extensions-except=${root}`, `--load-extension=${root}`]
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host;
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    const page = await context.newPage();
    await page.goto(base + '/articles/test');
    const extensionCdp = await context.browser().newBrowserCDPSession();
    const { targetInfos } = await extensionCdp.send('Target.getTargets', { filter: [{}] });
    const targetInfo = targetInfos.find(target => target.type === 'tab' && target.url === page.url());
    assert.ok(targetInfo, 'Find the browser tab target for the toolbar action');

    // Grant activeTab through the real toolbar action without opening the popup.
    // This tests first-use background extraction with the production manifest.
    await worker.evaluate(() => chrome.action.setPopup({ popup: '' }));
    await extensionCdp.send('Extensions.triggerAction', { id, targetId: targetInfo.targetId });
    const tabId = await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab.id;
    });
    const result = await worker.evaluate(tabId => executeExtraction(tabId), tabId);
    assert.ok(result, 'First-use background extraction succeeds');
    const md = result.markdown;
    assert.ok(md.includes('# Preserved article heading'));
    assert.ok(!/Navigation junk|Hidden junk|Sidebar junk|Footer junk/.test(md));
    assert.ok(md.includes(`[the guide](${base}/guide?q=%28test%29)`));
    assert.ok(!md.includes('JaVaScRiPt'));
    assert.ok(md.includes('3. Third'));
    assert.ok(md.includes('  - Nested'));
    assert.ok(md.includes('8. Eighth'));
    assert.ok(md.includes('| A \\| B | 42 |'));
    assert.ok(md.includes('````python\n  first = 1  \n\n\nlast = 2'));
    assert.ok(md.includes('``a`b``'));
    assert.ok(!md.includes('![diagram]'));
    assert.ok(md.includes('中文内容'));
    assert.ok(result.stats.words > 0);

    await context.grantPermissions(['clipboard-read'], { origin: base });
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), md);
    console.log('PASS real first-use background extraction, clipboard and Markdown regressions');

    await page.evaluate(() => {
      const range = document.createRange();
      range.selectNodeContents(document.getElementById('selection'));
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    });
    const selection = await worker.evaluate(tabId => executeExtraction(tabId, true), tabId);
    assert.equal(selection.markdown, 'Keep **all selected text**.');
    const restoredSelection = await page.evaluate(() => window.getSelection().toString());
    assert.ok(restoredSelection.includes('all selected text'));
    console.log('PASS selection-only Markdown');

    // Open the options page and save through the actual UI.
    const optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${id}/src/options.html`);
    await optionsPage.locator('#chkImages').check();
    await optionsPage.locator('#selDefaultPrompt').selectOption('summary');
    await optionsPage.locator('#txtCustomSponsor').fill('https://ko-fi.com/example');
    await optionsPage.locator('#btnSave').click();
    await optionsPage.waitForFunction(() => document.getElementById('saveStatus').textContent.includes('saved successfully'));
    await optionsPage.reload();
    await optionsPage.waitForFunction(() => document.getElementById('chkImages').checked);
    assert.equal(await optionsPage.locator('#txtCustomSponsor').inputValue(), 'https://ko-fi.com/example');
    await optionsPage.locator('#txtCustomSponsor').fill('http://insecure.example');
    await optionsPage.locator('#btnSave').click();
    assert.ok((await optionsPage.locator('#saveStatus').innerText()).includes('valid HTTPS'));
    await optionsPage.close();

    await worker.evaluate(tabId => chrome.tabs.update(tabId, { active: true }), tabId);
    await worker.evaluate(() => chrome.action.setPopup({ popup: 'src/popup.html' }));
    // Headless Playwright does not expose the browser's toolbar popup target.
    // Open the same production popup document in an inactive tab instead.
    const popupEvent = context.waitForEvent('page');
    await worker.evaluate(id => chrome.tabs.create({ url: `chrome-extension://${id}/src/popup.html`, active: false }), id);
    const popup = await popupEvent;
    await popup.waitForFunction(() => !document.getElementById('btnCopy').disabled);
    const preview = await popup.locator('#txtPreview').inputValue();
    assert.ok(preview.includes('Please provide a concise'));
    assert.ok(preview.includes(`![diagram](${base}/diagram.svg)`));
    assert.equal(await popup.locator('#linkCustomSponsor').getAttribute('href'), 'https://ko-fi.com/example');
    assert.equal(await popup.locator('#linkGithubSponsor').isVisible(), false);
    await popup.bringToFront();
    await popup.locator('#btnCopy').click();
    await popup.waitForFunction(() => !document.getElementById('copyStatus').classList.contains('hidden'));
    assert.equal(await popup.locator('#copyStatus').innerText(), 'Copied!');
    await page.bringToFront();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), preview);
    await popup.bringToFront();
    const downloadEvent = popup.waitForEvent('download');
    await popup.locator('#btnDownload').click();
    const download = await downloadEvent;
    assert.equal(fs.readFileSync(await download.path(), 'utf8'), preview);
    fs.mkdirSync(artifactDir, { recursive: true });
    await popup.screenshot({ path: path.join(artifactDir, 'popup.png') });
    console.log('PASS production popup UI, saved images/prompt/custom sponsor, copy and Markdown download');
    await popup.close();

    const restricted = await context.newPage();
    await restricted.goto('chrome://version');
    const restrictedId = await worker.evaluate(async () => (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id);
    assert.equal(await worker.evaluate(tabId => executeExtraction(tabId), restrictedId), null);
    assert.equal(await worker.evaluate(tabId => chrome.action.getBadgeText({ tabId }), restrictedId), 'ERR');
    console.log('PASS restricted-page error feedback');

    // Verify the loaded release manifest produced no installation errors.
    const extensions = await context.newPage();
    await extensions.goto('chrome://extensions');
    const info = await extensions.evaluate(id => new Promise(resolve => {
      chrome.developerPrivate.getExtensionsInfo({ includeDisabled: true, includeTerminated: true }, list => resolve(list.find(item => item.id === id)));
    }), id);
    assert.deepEqual(info.manifestErrors, []);
    assert.deepEqual(info.installWarnings, []);
    assert.equal(info.state, 'ENABLED');
    assert.deepEqual(errors, []);
    console.log('PASS release manifest installation and UI JavaScript errors');
    fs.writeFileSync(path.join(artifactDir, 'browser-results.json'), JSON.stringify({
      passed: true, browser: context.browser().version(), version: info.version,
      manifestErrors: info.manifestErrors, installWarnings: info.installWarnings,
      pageErrors: errors,
      checks: ['first-use background extraction', 'clipboard', 'selection', 'relative links',
        'short articles', 'nested lists', 'code whitespace/fences', 'hidden noise',
        'saved settings', 'popup UI in a tab', 'custom sponsor', 'Markdown download', 'restricted page'],
      manualChecksRemaining: ['OS shortcut dispatch', 'native context-menu dispatch', 'toolbar popup placement']
    }, null, 2));
  } finally {
    if (context) await context.close();
    server.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exit(1); });
