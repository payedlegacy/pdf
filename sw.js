/* PDFEasy service worker — app shell + pustaka CDN untuk kegunaan OFFLINE
   (boleh guna tanpa internet selepas kali pertama dibuka) */
const VERSION = 'pdfeasy-v4';   // 21-10-2026: jangan simpan halaman yang TERPOTONG (punca skrin putih)
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon.svg',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'
];

/* ---- pengawal dokumen lengkap -------------------------------------------------
   Punca "skrin putih" (21-10-2026): jika rangkaian terputus di tengah muat turun
   (proksi pejabat kadang-kadang pulangkan respons kosong), salinan HTML yang
   SEPARUH SIMPANAN masuk cache. Selepas itu setiap kali rangkaian gagal, SW
   menyajikan HTML separuh itu → tajuk tab betul tetapi halaman putih kosong.
   Penyelesaian: hanya simpan HTML yang benar-benar lengkap (ada </html>).      */
async function htmlLengkap(res) {
  try {
    if (!res || !res.ok) return false;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.indexOf('text/html') < 0) return false;
    const txt = await res.clone().text();
    const t = txt.trimEnd();
    return t.length > 5000 && /<\/html>$/i.test(t);
  } catch (e) {
    return false;
  }
}

function simpanDiCache(key, res) {
  caches.open(VERSION).then((c) => c.put(key, res)).catch(() => {});
}

function halamanOffline() {
  const html = '<!doctype html><html lang="ms"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>PDFEasy — luar talian</title><style>' +
    'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
    'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;color:#0f172a;padding:24px}' +
    '.k{max-width:420px;text-align:center}h1{font-size:20px;margin:0 0 8px}p{color:#475569;font-size:14px;line-height:1.6;margin:0 0 18px}' +
    'b{display:inline-block;background:#059669;color:#fff;border:0;border-radius:12px;padding:12px 20px;font-weight:800;text-decoration:none}' +
    '</style></head><body><div class="k"><h1>PDFEasy di luar talian</h1>' +
    '<p>Sambungan internet terputus. Alat ini tetap boleh digunakan selepas halaman dimuatkan sepenuhnya — tekan butang di bawah untuk cuba semula.</p>' +
    '<a class="b" href="/">Cuba semula</a></div></body></html>';
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => Promise.all(
      SHELL.map((u) => c.add(new Request(u, { mode: u.startsWith('http') ? 'cors' : 'same-origin' })).catch(() => null))
    )).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isLib = /cdn\.tailwindcss\.com|cdnjs\.cloudflare\.com|unpkg\.com/.test(url.host);

  if (req.mode === 'navigate') {
    // halaman: cuba rangkaian dahulu, jika tiada internet guna salinan cache (offline)
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const tersimpan = await cache.match('/index.html');
      try {
        const res = await fetch(req);
        if (await htmlLengkap(res)) {
          simpanDiCache('/index.html', res.clone());
          return res;
        }
        // rangkaian memulangkan dokumen TIDAK LENGKAP → jangan simpan, guna salinan lengkap lama
        if (tersimpan) return tersimpan;
        return res;
      } catch (err) {
        return tersimpan || halamanOffline();
      }
    })());
    return;
  }

  if (sameOrigin) {
    // fail aplikasi sendiri: network-first supaya kemas kini terbaru diambil,
    // tetapi kekal berfungsi offline guna cache
    const html = url.pathname === '/' || /\.html?$/i.test(url.pathname);
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res && res.status === 200) {
          if (!html || await htmlLengkap(res)) simpanDiCache(req, res.clone());
        }
        return res;
      } catch (err) {
        return (await caches.match(req)) || (await caches.match('/index.html')) || halamanOffline();
      }
    })());
    return;
  }

  if (isLib) {
    // pustaka CDN: cache dahulu (laju + boleh offline), dikemas kini di belakang
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => {
          if (res && res.status === 200) simpanDiCache(req, res.clone());
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
