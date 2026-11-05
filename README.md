# Inject JS Tool — riery

Tools inject JavaScript ke browser / website pake stock Chrome (Puppeteer),
nyambung ke pipeline garapan yang udah ada. Script jalan di dalam page,
return value-nya balik ke terminal sebagai JSON.

## Cara paling gampang (GUI, buat orang awam)

Nggak perlu terminal sama sekali:

- **Windows:** double-click `windows\InjectJS-GUI.bat`
- **Terminal (sekali aja):** `npm run gui`

Browser kebuka ke halaman lokal: isi alamat website, pilih aksinya
(Tandai Halaman / Ambil Isi Halaman / Klik Tombol Otomatis / Pantau Aktivitas / Script Sendiri),
klik **JALANKAN**, hasil + screenshot langsung muncul di halaman yang sama.
GUI-nya cuma jalan di komputer sendiri (127.0.0.1:4173).

## Cara pakai (CLI)

```bash
cd ~/workspace/inject-js-tool

# 1. Inject dari file template (banner bukti inject)
node inject.cjs --url https://example.com --file templates/highlight.js --screenshot test.png --out result.json

# 2. Inject inline (ambil title)
node inject.cjs --url https://example.com --code "return document.title"

# 3. Extract data page (link, button, text)
node inject.cjs --url https://example.com --file templates/extract.js --out result.json

# 4. Persistent inject — script jalan SEBELUM script page sendiri (buat hook/monitor)
node inject.cjs --url https://example.com --file templates/hook-fetch.js --persistent --wait 6000
```

## Opsi

| Flag | Fungsi |
|---|---|
| `--url <url>` | Target website (wajib) |
| `--file <js>` | File script yang di-inject (atau pakai `--code`) |
| `--code "<js>"` | Script inline |
| `--persistent` | Inject via `evaluateOnNewDocument` — sebelum page load, nempel tiap navigasi |
| `--wait <ms>` | Tunggu setelah load sebelum ambil hasil (default 3000) |
| `--screenshot <png>` | Simpan screenshot setelah inject |
| `--out <json>` | Simpan hasil (value, title, logs, error) ke JSON |
| `--headful` | Browser kelihatan (default headless) |
| `--timeout <ms>` | Timeout buka page (default 60000) |

## Di dalam script

Script ditulis sebagai body async function — pakai `return` buat balikin data.
Tersedia helper:

```js
__inject.log('halo')          // log ke terminal
await __inject.sleep(1000)    // tunggu
await __inject.waitFor('#btn') // tunggu selector muncul
__inject.text()               // innerText page (5000 char)
```

## Template bawaan

- `templates/highlight.js` — banner bukti inject + ganti title
- `templates/extract.js` — ambil title, link, button, text page
- `templates/auto-click.js` — klik elemen by text, tembus shadow DOM
- `templates/hook-fetch.js` — hook fetch/XHR (pakai `--persistent`), log API calls ke `window.__injectApiLog`

## Catatan

- Ini tool buat automation/testing di page yang kita buka sendiri via pipeline kita.
- Private key garapan TIDAK pernah masuk browser — sama kayak aturan pipeline WC.
- Kalo targetnya spesifik (site X, mau ngapain), tinggal bikin file .js baru di templates/
  atau kasih tau di chat, nanti dibuatin script khususnya.
