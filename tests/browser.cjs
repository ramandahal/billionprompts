// Run against a local static server. All entered data is synthetic.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');

const base = process.env.HIDDEN_FORTUNE_TEST_URL || 'http://127.0.0.1:8000';
const origin = new URL(base).origin;
assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname), 'Use a local server only');
const key = 'billionprompts.hidden-fortune.draft.v1';
const consents = ['ownershipConsent', 'privacyConsent', 'analysisConsent'];
let passed = 0;

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.HIDDEN_FORTUNE_CHROMIUM_PATH ? {
      executablePath: process.env.HIDDEN_FORTUNE_CHROMIUM_PATH,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    } : {})
  });
  const requests = [];
  const errors = [];
  const responses = [];

  async function context(options = {}, init) {
    const ctx = await browser.newContext(options);
    if (init) await ctx.addInitScript(init);
    ctx.on('request', req => requests.push({ url: req.url(), method: req.method() }));
    ctx.on('response', response => responses.push({url: response.url(), status: response.status()}));
    ctx.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    const page = await ctx.newPage();
    await page.goto(base);
    return { ctx, page };
  }

  async function complete(page) {
    await page.locator('[name="fullName"]').fill('Synthetic Tester');
    await page.locator('[name="email"]').fill('tester@example.invalid');
    await page.locator('[name="primaryGoal"]').selectOption({ label: 'Start a business' });
    await page.locator('[name="threeYearVision"]').fill('Build a community learning project.');
    await page.locator('[name="conversationText"]').fill('नेपाली notes <script>window.injected=true</script>');
    await page.locator('[name="delicateContext"]').fill('Synthetic limited budget.');
    await page.locator('[name="linkedinUrl"]').fill('https://example.invalid/profile');
    await page.locator('[name="portfolioUrl"]').fill('https://example.invalid/portfolio');
    for (const name of consents) await page.locator(`[name="${name}"]`).check();
  }

  async function download(page) {
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Create my submission', exact: true }).click();
    const file = await downloaded;
    assert.match(file.suggestedFilename(), /^hidden-fortune-submission-.*\.json$/);
    return JSON.parse(await fs.readFile(await file.path(), 'utf8'));
  }

  async function check(name, run) {
    await run();
    console.log(`PASS ${name}`);
    passed++;
  }

  try {
    const { ctx, page } = await context();
    await check('assets, navigation, keyboard focus and reduced motion', async () => {
      assert.equal(await page.locator('.hidden').isVisible(), false);
      assert.equal(await page.locator('[type="submit"]').isEnabled(), true);
      assert.match(await page.locator('body').evaluate(el => getComputedStyle(el).fontFamily), /system-ui/);
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('.skip-link').evaluate(el => el === document.activeElement), true);
      await page.keyboard.press('Enter');
      assert.match(page.url(), /#intake$/);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.locator('html').evaluate(el => getComputedStyle(el).scrollBehavior), 'auto');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    });

    await check('required fields, email/URL validation and each consent', async () => {
      let downloads = 0;
      page.on('download', () => downloads++);
      await page.locator('[type="submit"]').click();
      assert.equal(downloads, 0);
      assert.equal(await page.locator('form').evaluate(el => el.checkValidity()), false);
      await complete(page);
      for (const name of consents) {
        await page.locator(`[name="${name}"]`).uncheck();
        assert.equal(await page.locator('form').evaluate(el => el.checkValidity()), false);
        await page.locator(`[name="${name}"]`).check();
      }
      await page.locator('[name="email"]').fill('bad-email');
      assert.equal(await page.locator('form').evaluate(el => el.checkValidity()), false);
      await page.locator('[name="email"]').fill('tester@example.invalid');
      await page.locator('[name="portfolioUrl"]').fill('not-a-url');
      assert.equal(await page.locator('form').evaluate(el => el.checkValidity()), false);
      await page.locator('[name="portfolioUrl"]').fill('https://example.invalid/portfolio');
      assert.equal(await page.locator('form').evaluate(el => el.checkValidity()), true);
    });

    const names = ['notes.txt', 'नेपाल <img src=x onerror=window.injected=true>.md'];
    await check('JSON snapshot, Unicode, file names only and visible fallback link', async () => {
      await page.locator('[name="documents"]').setInputFiles(names.map(name => ({
        name, mimeType: 'text/plain', buffer: Buffer.from('PRIVATE-FILE-BYTES-MUST-NOT-APPEAR')
      })));
      const data = await download(page);
      assert.equal(data.schemaVersion, 1);
      assert.equal(data.delivery, 'local-download-only');
      assert.equal(data.fileContentsIncluded, false);
      assert.deepEqual(data.documentNames, names);
      assert.equal(data.fields.conversationText, 'नेपाली notes <script>window.injected=true</script>');
      assert.equal(Object.keys(data.fields).length, 8);
      assert.deepEqual(data.consent, Object.fromEntries(consents.map(name => [name, true])));
      assert(!Number.isNaN(Date.parse(data.createdAt)));
      assert(!JSON.stringify(data).includes('PRIVATE-FILE-BYTES-MUST-NOT-APPEAR'));
      assert(!JSON.stringify(data).includes('bot-field'));
      assert.equal(await page.evaluate(() => window.injected), undefined);
      assert.equal(await page.locator('#submissionDownload').isVisible(), true);
      await page.locator('[name="threeYearVision"]').fill('Edited vision');
      assert.equal(await page.locator('#submissionDownload').isVisible(), false);
      assert.equal((await download(page)).fields.threeYearVision, 'Edited vision');
      assert.equal(await page.evaluate(k => localStorage.getItem(k), key), null);
    });

    await check('explicit save, reload, document restoration and fresh consent', async () => {
      await page.locator('#saveDraft').click();
      const saved = JSON.parse(await page.evaluate(k => localStorage.getItem(k), key));
      assert.deepEqual(saved.documentNames, names);
      assert.equal(saved.consent, undefined);
      await page.locator('[name="fullName"]').fill('Unsaved change');
      await page.reload();
      assert.equal(await page.locator('[name="fullName"]').inputValue(), 'Synthetic Tester');
      for (const name of consents) assert.equal(await page.locator(`[name="${name}"]`).isChecked(), false);
      assert.equal(await page.locator('[name="documents"]').evaluate(el => el.files.length), 0);
      assert((await page.locator('#documentStatus').textContent()).includes(names[1]));
      assert.equal(await page.locator('#documentStatus img').count(), 0);
      assert.equal(await page.evaluate(() => window.injected), undefined);
      for (const name of consents) await page.locator(`[name="${name}"]`).check();
      assert.deepEqual((await download(page)).documentNames, names);
    });

    await check('clear names and delete only this draft', async () => {
      await page.locator('#clearDocuments').click();
      assert.equal(await page.locator('#clearDocuments').isVisible(), false);
      assert.deepEqual((await download(page)).documentNames, []);
      await page.evaluate(() => localStorage.setItem('unrelated-project', 'preserve'));
      await page.locator('#deleteDraft').click();
      assert.equal(await page.evaluate(k => localStorage.getItem(k), key), null);
      assert.equal(await page.evaluate(() => localStorage.getItem('unrelated-project')), 'preserve');
      assert.equal(await page.locator('[name="fullName"]').inputValue(), 'Synthetic Tester');
      await page.reload();
      assert.equal(await page.locator('[name="fullName"]').inputValue(), '');
      await page.locator('[name="fullName"]').fill('Partial draft');
      await page.locator('#saveDraft').click();
      await page.reload();
      assert.equal(await page.locator('[name="fullName"]').inputValue(), 'Partial draft');
    });

    await check('honeypot blocks export', async () => {
      await complete(page);
      await page.locator('[name="bot-field"]').evaluate(el => { el.value = 'spam'; });
      await page.locator('[type="submit"]').click();
      assert.match(await page.locator('#formStatus').textContent(), /anti-spam/);
      assert.equal(await page.locator('#submissionDownload').isVisible(), false);
      await page.locator('[name="bot-field"]').evaluate(el => { el.value = ''; });
    });
    await ctx.close();

    await check('corrupt and unsupported drafts are recoverable', async () => {
      for (const raw of ['{bad-json', JSON.stringify({ schemaVersion: 2 }), JSON.stringify({ schemaVersion: 1, fields: {}, documentNames: [42] })]) {
        const {ctx, page} = await context();
        await page.evaluate(({key, raw}) => localStorage.setItem(key, raw), {key, raw});
        await page.reload();
        assert.match(await page.locator('#formStatus').textContent(), /could not be loaded/);
        await complete(page);
        assert.equal((await download(page)).delivery, 'local-download-only');
        await page.locator('#deleteDraft').click();
        assert.equal(await page.evaluate(k => localStorage.getItem(k), key), null);
        await ctx.close();
      }
    });

    await check('blocked or full storage does not block downloads', async () => {
      for (const mode of ['blocked', 'full']) {
        const {ctx, page} = await context({}, mode === 'blocked' ? () => {
          Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
        } : () => {
          Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
        });
        await complete(page);
        await page.locator('#saveDraft').click();
        assert.match(await page.locator('#formStatus').textContent(), /could not be saved/);
        assert.equal((await download(page)).fileContentsIncluded, false);
        if (mode === 'blocked') {
          await page.locator('#deleteDraft').click();
          assert.match(await page.locator('#formStatus').textContent(), /could not be deleted/);
        }
        await ctx.close();
      }
    });

    await check('download preparation failure keeps form usable', async () => {
      const {ctx, page} = await context({}, () => {
        URL.createObjectURL = () => { throw new Error('Synthetic failure'); };
      });
      await complete(page);
      await page.locator('[type="submit"]').click();
      assert.match(await page.locator('#formStatus').textContent(), /could not be prepared/);
      assert.equal(await page.locator('[name="fullName"]').inputValue(), 'Synthetic Tester');
      assert.equal(await page.locator('#submissionDownload').isVisible(), false);
      await page.locator('#saveDraft').click();
      assert.match(await page.locator('#formStatus').textContent(), /Draft saved/);
      await ctx.close();
    });

    await check('script-disabled page explains unavailable actions', async () => {
      const {ctx, page} = await context({ javaScriptEnabled: false });
      assert.equal(await page.locator('[type="submit"]').isEnabled(), false);
      assert.equal(await page.locator('#saveDraft').isEnabled(), false);
      assert.match(await page.locator('noscript').textContent(), /Submission is disabled/);
      await ctx.close();
    });

    await check('desktop/mobile layout has no horizontal overflow', async () => {
      for (const width of [320, 375, 768, 1440]) {
        const {ctx, page} = await context({ viewport: { width, height: 900 } });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}px`);
        assert.equal(await page.locator('nav').isVisible(), true);
        await page.locator('nav a[href="#intake"]').click();
        assert.match(page.url(), /#intake$/);
        await ctx.close();
      }
    });

    await check('no form POST, remote requests, asset errors or page exceptions', async () => {
      assert.equal(requests.filter(req => req.method === 'POST').length, 0);
      assert.equal(requests.filter(req => !req.url.startsWith(origin + '/') && !req.url.startsWith('blob:')).length, 0);
      assert(responses.some(res => res.url.endsWith('/styles.css') && res.status === 200));
      assert(responses.some(res => res.url.endsWith('/app.js') && res.status === 200));
      assert.deepEqual(responses.filter(res => res.status >= 400), []);
      assert.deepEqual(errors, []);
    });
    console.log(`${passed} browser checks passed.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
