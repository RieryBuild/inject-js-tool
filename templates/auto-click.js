// auto-click.js — klik elemen pertama yang text-nya cocok (termasuk shadow DOM)
// Ganti daftar TARGET sesuai kebutuhan.
const TARGETS = ['Connect Wallet', 'Connect', 'Sign in'];

function deepFind(texts) {
  const els = [];
  const walk = (root) => { for (const el of root.querySelectorAll('*')) { els.push(el); if (el.shadowRoot) walk(el.shadowRoot); } };
  walk(document);
  for (const el of els) {
    const t = (el.innerText || el.textContent || '').trim();
    if (t && t.length <= 80 && texts.some(w => t.toLowerCase() === w.toLowerCase())) return el;
  }
  return null;
}
const hit = deepFind(TARGETS);
if (!hit) return { clicked: false, reason: 'not found', targets: TARGETS };
hit.scrollIntoView({ block: 'center' });
hit.click();
__inject.log('clicked:', hit.innerText || hit.textContent);
return { clicked: true, text: (hit.innerText || '').trim().slice(0, 80) };
