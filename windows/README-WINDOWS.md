# Pakai di Windows

Cara paling gampang tanpa build .exe:

1. Install Node.js 18+ dari nodejs.org
2. Download repo ini (Code > Download ZIP) atau `git clone`
3. Di folder repo, jalanin sekali: `npm install`
   (ini download Chromium buat Puppeteer, ~150 MB, sekali aja)
4. Double-click `windows\run-inject.bat`, isi URL + pilih script template

Atau langsung dari terminal:

```bat
node inject.cjs --url https://example.com --file templates\highlight.js --screenshot out.png
```

## Soal .exe

Tool ini bisa juga dibungkus jadi aplikasi Windows beneran (Electron)
kalo nanti dibutuhin ada GUI-nya: form URL, editor script, tombol Run + preview screenshot.
Struktur repo sekarang udah siap buat itu — core-nya (`inject.cjs`) tinggal dipanggil dari GUI.
GitHub Actions di `.github/workflows/build-windows.yml` udah nyiapin paket Windows
(zip) tiap ada tag `v*` atau jalan manual dari tab Actions.
