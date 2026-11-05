// hook-fetch.js — PAKAI DENGAN --persistent
// Hook fetch + XHR: semua request API page dicatat ke window.__injectApiLog
// Setelah page jalan, baca hasilnya dari mode persistent (logs / evaluate lanjutan).
window.__injectApiLog = [];
const origFetch = window.fetch;
window.fetch = async function (...args) {
  const url = String(args[0] && args[0].url ? args[0].url : args[0]);
  const res = await origFetch.apply(this, args);
  try { window.__injectApiLog.push({ type: 'fetch', url: url.slice(0, 200), status: res.status, at: Date.now() }); } catch {}
  return res;
};
const origOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url) {
  try { window.__injectApiLog.push({ type: 'xhr', method, url: String(url).slice(0, 200), at: Date.now() }); } catch {}
  return origOpen.apply(this, arguments);
};
console.log('[inject] fetch/xhr hook installed');
