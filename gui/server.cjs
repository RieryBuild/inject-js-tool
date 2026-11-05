#!/usr/bin/env node
/*
 * server.cjs — GUI lokal Inject JS Tool (buat orang awam)
 * Jalanin: node gui/server.cjs [--open] [--port 4173]
 * Buka http://127.0.0.1:4173 — form simpel: isi alamat website, pilih aksi, klik JALANKAN.
 * Server cuma dengerin di 127.0.0.1 (komputer sendiri), nggak bisa diakses dari luar.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(__dirname, 'public');
const OUTPUTS = path.join(ROOT, 'outputs');
fs.mkdirSync(OUTPUTS, { recursive: true });

const PORT = (() => { const i = process.argv.indexOf('--port'); return i >= 0 ? parseInt(process.argv[i + 1], 10) : 4173; })();
const OPEN = process.argv.includes('--open');

const TEMPLATES = [
  { id: 'highlight', file: 'templates/highlight.js', name: 'Tandai Halaman', desc: 'Kasih banner merah di atas halaman — buat buktiin script berhasil masuk.', icon: '🏷️' },
  { id: 'extract', file: 'templates/extract.js', name: 'Ambil Isi Halaman', desc: 'Ambil judul, semua link, tombol, dan teks halaman. Hasilnya muncul di bawah.', icon: '📄' },
  { id: 'auto-click', file: 'templates/auto-click.js', name: 'Klik Tombol Otomatis', desc: 'Cari dan klik tombol seperti "Connect Wallet" / "Connect" / "Sign in".', icon: '🖱️' },
  { id: 'hook-fetch', file: 'templates/hook-fetch.js', name: 'Pantau Aktivitas Halaman', desc: 'Catat request yang dibuat halaman (mode lanjutan, script jalan sebelum halaman).', icon: '👀', persistent: true },
  { id: 'custom', file: null, name: 'Script Sendiri', desc: 'Buat yang paham JavaScript — tulis/paste script sendiri.', icon: '✍️' },
];

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json; charset=utf-8' };

function sendJson(res, code, obj) { const b = JSON.stringify(obj); res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(b); }

function runInject(body) {
  return new Promise((resolve) => {
    const url = String(body.url || '').trim();
    if (!/^(https?|file):\/\//i.test(url)) return resolve({ ok: false, error: 'Alamat website tidak valid. Harus diawali http:// atau https://' });
    const tpl = TEMPLATES.find(t => t.id === body.template) || TEMPLATES[0];
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = path.join(OUTPUTS, stamp);
    fs.mkdirSync(dir, { recursive: true });
    const outJson = path.join(dir, 'result.json');
    const shot = path.join(dir, 'screenshot.png');
    const args = [path.join(ROOT, 'inject.cjs'), '--url', url, '--out', outJson, '--wait', '2500'];
    if (body.screenshot !== false) args.push('--screenshot', shot);
    if (body.showBrowser) args.push('--headful');
    if (tpl.persistent || body.persistent) args.push('--persistent');
    let scriptFile = null;
    if (tpl.id === 'custom') {
      if (!String(body.code || '').trim()) return resolve({ ok: false, error: 'Script sendiri masih kosong.' });
      scriptFile = path.join(dir, 'custom.js');
      fs.writeFileSync(scriptFile, String(body.code));
      args.push('--file', scriptFile);
    } else {
      args.push('--file', path.join(ROOT, tpl.file));
    }
    const child = spawn(process.execPath, args, { cwd: ROOT, env: process.env });
    let log = '';
    child.stdout.on('data', d => { log += d; });
    child.stderr.on('data', d => { log += d; });
    const killer = setTimeout(() => child.kill('SIGKILL'), 120000);
    child.on('close', () => {
      clearTimeout(killer);
      let result = null;
      try { result = JSON.parse(fs.readFileSync(outJson, 'utf8')); } catch {}
      if (!result) return resolve({ ok: false, error: 'Proses gagal jalan.', log: log.slice(-2000) });
      resolve({
        ok: result.ok,
        title: result.title,
        finalUrl: result.finalUrl,
        value: result.value,
        error: result.error,
        screenshot: (body.screenshot !== false && fs.existsSync(shot)) ? `/outputs/${stamp}/screenshot.png` : null,
        log: log.slice(-2000),
      });
    });
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  if (u.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
  if (u.pathname === '/api/templates') return sendJson(res, 200, TEMPLATES);
  if (u.pathname === '/api/run' && req.method === 'POST') {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 200000) req.destroy(); });
    req.on('end', async () => {
      let body = {};
      try { body = JSON.parse(raw || '{}'); } catch { return sendJson(res, 400, { ok: false, error: 'Data tidak valid.' }); }
      sendJson(res, 200, await runInject(body));
    });
    return;
  }
  if (u.pathname.startsWith('/outputs/')) {
    const f = path.join(ROOT, u.pathname);
    if (!f.startsWith(OUTPUTS) || !fs.existsSync(f)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    return fs.createReadStream(f).pipe(res);
  }
  const file = u.pathname === '/' ? path.join(PUBLIC, 'index.html') : path.join(PUBLIC, u.pathname);
  if (file.startsWith(PUBLIC) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'text/plain' });
    return fs.createReadStream(file).pipe(res);
  }
  res.writeHead(404); res.end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}`;
  console.log(`Inject JS Tool GUI jalan di ${url}`);
  if (OPEN) {
    const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
    exec(cmd, () => {});
  }
});
