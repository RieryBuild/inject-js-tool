// extract.js — ambil data dari page: title, semua link, semua button text
return {
  title: document.title,
  url: location.href,
  links: [...document.querySelectorAll('a')].slice(0, 50).map(a => ({ text: (a.innerText || '').trim().slice(0, 80), href: a.href })),
  buttons: [...document.querySelectorAll('button, [role="button"]')].slice(0, 50).map(b => (b.innerText || '').trim().slice(0, 80)).filter(Boolean),
  textHead: (document.body ? document.body.innerText : '').slice(0, 1000),
};
