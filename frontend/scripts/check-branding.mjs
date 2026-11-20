// Hicom Books leak scanner: visits the pages a client user can reach and fails on any upstream name or logo.
//
// Usage, from frontend/:
//   BRANDING_URL=http://books.localhost:8301 BRANDING_USER=user@example.com BRANDING_PASSWORD=... \
//   BRANDING_BROWSER_CHANNEL=chrome node scripts/check-branding.mjs
//
// Checks visible text, the tab title, text attributes (alt, title, aria-label, placeholder), meta tags,
// images and icons, the PWA manifest and the offline page. Technical names that only show in developer
// tools (asset paths, API paths, request headers) are not checked; see BRANDING.md.

import { chromium } from 'playwright';

const BASE = (
  process.env.BRANDING_URL ?? 'http://books.localhost:8301'
).replace(/\/$/, '');
const USER = process.env.BRANDING_USER;
const PASSWORD = process.env.BRANDING_PASSWORD;
const LEAK = /frappe/i;
// Framework images that carry the upstream logo or wordmark.
const LEAK_IMAGE =
  /\/assets\/frappe\/images\/|frappe-(favicon|framework-logo|wordmark)/i;

const GUEST_PAGES = [
  '/login',
  '/login#forgot',
  '/login#signup',
  '/update-password?key=invalid',
  '/this-page-does-not-exist',
  '/message',
  '/books/',
];
const USER_PAGES = [
  '/books/',
  '/books/get-started',
  '/books/list/SalesInvoice',
  '/books/list/PurchaseInvoice',
  '/books/list/Payment',
  '/books/list/JournalEntry',
  '/books/list/Item',
  '/books/list/Party',
  '/books/chart-of-accounts',
  '/books/report/GeneralLedger',
  '/books/report/ProfitAndLoss',
  '/books/report/BalanceSheet',
  '/books/settings',
  '/books/import-wizard',
  '/books/customize-form',
  '/books/pos',
];
// Pages a client user must never see: each must end on /books.
const GUARDED = ['/desk', '/app', '/app/user', '/apps', '/attribution', '/me'];

const findings = [];
const report = (page, where, text) =>
  findings.push({ page, where, text: String(text).slice(0, 160) });

async function scanPage(page, path) {
  await page
    .goto(BASE + path, { waitUntil: 'networkidle' })
    .catch((e) => report(path, 'navigation', e.message));
  await page.waitForTimeout(800);
  const found = await page.evaluate(
    ({ leak, leakImage }) => {
      const leakRe = new RegExp(leak, 'i');
      const imageRe = new RegExp(leakImage, 'i');
      const hits = [];
      if (leakRe.test(document.title)) hits.push(['title', document.title]);
      const text = document.body?.innerText ?? '';
      for (const line of text.split('\n'))
        if (leakRe.test(line)) hits.push(['text', line.trim()]);
      for (const el of document.querySelectorAll(
        '[alt], [title], [aria-label], [placeholder]'
      )) {
        for (const attr of ['alt', 'title', 'aria-label', 'placeholder']) {
          const value = el.getAttribute(attr);
          if (value && leakRe.test(value)) hits.push([`@${attr}`, value]);
        }
      }
      for (const meta of document.querySelectorAll('meta[content]')) {
        if (leakRe.test(meta.content))
          hits.push([
            `meta ${meta.name || meta.getAttribute('property')}`,
            meta.content,
          ]);
      }
      const images = [
        ...[...document.images].map((img) => img.currentSrc || img.src),
        ...[
          ...document.querySelectorAll(
            'link[rel~="icon"], link[rel="apple-touch-icon"]'
          ),
        ].map((l) => l.href),
        ...[...document.querySelectorAll('*')]
          .map((el) => getComputedStyle(el).backgroundImage)
          .filter((bg) => bg && bg !== 'none'),
      ];
      for (const src of images)
        if (imageRe.test(src)) hits.push(['image', src]);
      return hits;
    },
    { leak: LEAK.source, leakImage: LEAK_IMAGE.source }
  );
  for (const [where, text] of found) report(path, where, text);
  return page.url();
}

async function checkManifestAndOfflinePage(request) {
  const manifest = await request.get(
    `${BASE}/assets/frappe_books/pwa/manifest.json`
  );
  const json = await manifest.json();
  for (const key of ['name', 'short_name', 'description']) {
    if (LEAK.test(json[key] ?? '')) report('manifest.json', key, json[key]);
  }
  const sw = await (await request.get(`${BASE}/books/sw.js`)).text();
  const offline = sw.match(/const html = `([\s\S]*?)`;/)?.[1] ?? '';
  const visible = offline
    .replace(/<style>[\s\S]*?<\/style>/, '')
    .replace(/<svg[\s\S]*?<\/svg>/g, '');
  if (LEAK.test(visible))
    report('offline page', 'html', visible.match(/.{0,60}frappe.{0,60}/i)?.[0]);
}

async function main() {
  const browser = await chromium.launch({
    channel: process.env.BRANDING_BROWSER_CHANNEL,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();

  for (const path of GUEST_PAGES) await scanPage(page, path);
  await checkManifestAndOfflinePage(context.request);

  if (USER && PASSWORD) {
    const login = await context.request.post(`${BASE}/api/method/login`, {
      form: { usr: USER, pwd: PASSWORD },
    });
    if (!login.ok())
      throw new Error(`Login as ${USER} failed: ${login.status()}`);
    for (const path of USER_PAGES) {
      // A page that bounced to the login or setup screen was not really checked.
      const landed = new URL(await scanPage(page, path)).pathname;
      if (!landed.startsWith('/books'))
        report(path, 'navigation', `landed on ${landed}, page not checked`);
    }
    for (const path of GUARDED) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      const landed = new URL(page.url()).pathname;
      if (!landed.startsWith('/books'))
        report(path, 'guard', `landed on ${landed}, expected /books`);
    }
    // The phone layout has its own screens.
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of [
      '/books/',
      '/books/list/SalesInvoice',
      '/books/settings',
    ])
      await scanPage(page, path);
  } else {
    console.warn(
      'BRANDING_USER and BRANDING_PASSWORD not set: only guest pages were checked.'
    );
  }

  await browser.close();
  if (findings.length) {
    console.error(`${findings.length} branding leak(s):`);
    for (const f of findings)
      console.error(`- ${f.page} [${f.where}] ${f.text}`);
    process.exit(1);
  }
  console.log('No branding leaks found.');
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
