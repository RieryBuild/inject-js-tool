#!/usr/bin/env node
/*
 * inject.cjs — JS Inject Tool for stock Chrome (Puppeteer)
 * Buat garapan Reza: suntik script ke website, ambil hasilnya balik.
 *
 * Usage:
 *   node inject.cjs --url https://example.com --file templates/highlight.js
 *   node inject.cjs --url https://example.com --code "document.title"
 *   node inject.cjs --url https://example.com --file script.js --persistent
 *   node inject.cjs --url https://example.com --file script.js --screenshot out.png --out result.json
 *   node inject.cjs --url https://example.com --file script.js --wait-for "#app .loaded"
 *
 * Modes:
 *   default     : page.evaluate() setelah page load — script jalan sekali, return value diambil
 *   --persistent: page.evaluateOnNewDocument() — script disuntik SEBELUM script page sendiri jalan,
 *                 dan nempel di setiap navigasi berikutnya. Cocok buat hook/monitor.
 *
 * Script file format: plain JS. Kalau script return value / Promise, hasilnya disimpan.
 * Di dalam script tersedia helper global: window.__inject = { log, sleep, waitFor }
 */
const fs = require('fs');
const path = require('path');
// proxy-chain (dipakai buat anonymize proxy egress ber-auth) bisa crash di Node 24
// pas Chrome ngirim request HTTP background (mis. clients2.google.com) — Host header mismatch.
// Tangkap error spesifik itu aja, biar request HTTPS utama (CONNECT) tetap jalan.
process.on('uncaughtException', (e) => {
  if (e && e.code === 'ERR_INVALID_ARG_VALUE' && /Host in options\.headers/.test(e.message)) {
    console.log('[inject] proxy forward warning ignored (background http request)');
    return;
  }
  throw e;
});

let puppeteer;
try { puppeteer = require('puppeteer'); }
catch {
  puppeteer = require(path.join(__dirname, '..', 'garapan-wc-browser', 'node_modules', 'puppeteer'));
}

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def;
}
function has(name) { return process.argv.includes('--' + name); }

const URL_TARGET = arg('url');
const FILE = arg('file');
const CODE = arg('code');
const OUT = arg('out');
const SCREENSHOT = arg('screenshot');
const WAIT_FOR = arg('wait-for');
function intArg(name, def) {
  const v = parseInt(arg(name, String(def)), 10);
  return Number.isFinite(v) && v >= 0 ? v : def;
}
const WAIT_MS = intArg('wait', 3000);
const TIMEOUT = intArg('timeout', 60000);
const PERSISTENT = has('persistent');
const HEADFUL = has('headful');

if (!URL_TARGET || (!FILE && !CODE)) {
  console.log(`Usage:
  node inject.cjs --url <url> --file <script.js> [--persistent] [--screenshot out.png] [--out result.json] [--wait 3000] [--wait-for <selector>] [--headful]
  node inject.cjs --url <url> --code "<js expression>"`);
  process.exit(2);
}

const scriptSource = FILE ? fs.readFileSync(path.resolve(FILE), 'utf8') : CODE;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// URL file: relatif (mis. file:./tests/page.html) Chrome tidak resolve terhadap cwd,
// jadi jadikan absolut dulu — kalau tidak, npm test selalu ERR_FILE_NOT_FOUND.
let urlTarget = URL_TARGET;
if (/^file:/i.test(urlTarget) && !/^file:\/\/\//.test(urlTarget)) {
  urlTarget = 'file://' + path.resolve(urlTarget.replace(/^file:/i, ''));
}

// Helper yang disuntik duluan ke setiap page
const HELPER = `
window.__inject = {
  logs: [],
  log: (...a) => { try { console.log('[inject]', ...a); window.__inject.logs.push(a.join(' ')); } catch {} },
  sleep: (ms) => new Promise(r => setTimeout(r, ms)),
  waitFor: async (sel, ms = 10000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const el = document.querySelector(sel);
      if (el) return el;
      await new Promise(r => setTimeout(r, 250));
    }
    return null;
  },
  text: () => (document.body ? document.body.innerText.slice(0, 5000) : ''),
};
`;

(async () => {
  const result = { url: urlTarget, mode: PERSISTENT ? 'persistent' : 'once', ok: false, value: null, logs: [], error: null, title: null, finalUrl: null };

  let localProxy = '';
  const proxyEnv = process.env.https_proxy || process.env.HTTPS_PROXY || '';
  if (proxyEnv) {
    try {
      let chain;
      try { chain = require('proxy-chain'); }
      catch { chain = require(path.join(__dirname, '..', 'garapan-wc-browser', 'node_modules', 'proxy-chain')); }
      localProxy = await chain.anonymizeProxy(proxyEnv);
    } catch {}
  }

  const args = ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1280,950', '--disable-blink-features=AutomationControlled', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check'];
  if (has('no-proxy')) localProxy = '';
  if (localProxy) { args.push('--proxy-server=' + localProxy); args.push('--proxy-bypass-list=clients2.google.com;update.googleapis.com'); }

  const browser = await puppeteer.launch({
    headless: HEADFUL ? false : true,
    ignoreHTTPSErrors: true,
    args: [...args, '--ignore-certificate-errors'],
    defaultViewport: { width: 1280, height: 950 },
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');
    page.on('console', m => { const t = m.text(); if (t) { result.logs.push(t.slice(0, 500)); console.log('PAGE:', t.slice(0, 500)); } });
    page.on('pageerror', e => console.log('PAGE_ERROR:', String(e.message || e).slice(0, 300)));

    if (PERSISTENT) {
      await page.evaluateOnNewDocument(HELPER);
      await page.evaluateOnNewDocument(scriptSource);
      console.log('[inject] persistent mode: script registered via evaluateOnNewDocument');
    }

    await page.goto(urlTarget, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

    // --wait-for: tunggu elemen dinamis muncul sebelum inject (gagal keras kalau
    // selector tidak muncul dalam --timeout, biar hasilnya tidak diam-diam basi).
    if (WAIT_FOR) {
      try {
        await page.waitForSelector(WAIT_FOR, { timeout: TIMEOUT });
        console.log('[inject] wait-for matched:', WAIT_FOR);
      } catch {
        throw new Error('wait-for selector not found within timeout: ' + WAIT_FOR);
      }
    }
    await sleep(WAIT_MS);

    if (!PERSISTENT) {
      await page.evaluate(HELPER);
      // Bungkus script user: kalau dia expression, return nilainya; kalau statement, jalanin apa adanya
      result.value = await page.evaluate(async (src) => {
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const fn = new AsyncFunction(src);
        const v = await fn();
        return v === undefined ? null : v;
      }, scriptSource);
    } else {
      result.value = await page.evaluate(() => ({ logs: window.__inject ? window.__inject.logs : [], href: location.href })).catch(() => null);
    }

    result.title = await page.title().catch(() => null);
    result.finalUrl = page.url();
    result.ok = true;

    if (SCREENSHOT) await page.screenshot({ path: path.resolve(SCREENSHOT), fullPage: false });
  } catch (e) {
    result.error = e.message;
    console.log('ERROR:', e.message);
  } finally {
    await browser.close().catch(() => {});
  }

  const outJson = JSON.stringify(result, null, 2);
  if (OUT) fs.writeFileSync(path.resolve(OUT), outJson);
  console.log('RESULT_JSON:', outJson.slice(0, 2000));
  process.exit(result.ok ? 0 : 1);
})();
