# ContextClip 1.0.1 validation

Validated in this workspace with Node.js 24.19.0 and Chromium 153.0.8010.12 using Playwright 1.63.0.

- `npm test`: passed the existing 12 extraction assertions and added background regressions covering first-use injection, saved preferences, awaited clipboard writes, copy failures, restricted-page errors and sponsor URL validation.
- `npm run test:browser`: passed real extension loading with the production manifest, first-use background extraction, clipboard contents, selection-only output, relative links, short articles, nested lists, table pipes, code whitespace and fences, hidden content removal, Unicode content, saved settings, popup copy, Markdown download and restricted-page feedback.
- Browser install produced no manifest errors or installation warnings. No UI page JavaScript errors were reported.
- `git diff --check`: passed.
- Packaging checks validate manifest/version consistency, description length, icon PNG sizes, root-level manifest, ZIP integrity and exclusion of development dependencies. Output hashes are in `dist/SHA256SUMS.txt` after building.

The toolbar action was used to grant activeTab through Chromium's debugging API. The headless browser exposes the production popup document in a tab for automation; native toolbar popup placement, operating-system shortcut dispatch and native context-menu click dispatch remain manual checks. Background extraction invoked by those handlers was exercised in the real browser. Only the local test fixtures were covered; arbitrary websites can still need extraction improvements.

No verified creator sponsorship account is configured. Validation ran before GitHub publication. No store submission was made and no community messages were posted as part of testing or release preparation.
