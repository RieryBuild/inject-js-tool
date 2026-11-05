// highlight.js — contoh paling basic: tandain page sudah di-inject
// Banner merah di atas + ganti title. Return text banner sebagai bukti.
const banner = document.createElement('div');
banner.id = 'inject-banner';
banner.textContent = 'INJECTED by riery inject tool — ' + new Date().toISOString();
banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#e11d48;color:#fff;padding:12px;font:16px sans-serif;text-align:center';
document.body.appendChild(banner);
document.title = '[INJECTED] ' + document.title;
__inject.log('banner installed');
return banner.textContent;
