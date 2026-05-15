// Piano Deri — Service Worker V6.1
const CACHE = 'pianoderi-v61';

const SHELL = [
  './assets/piano-theme.css',
  './assets/common.js',
  './config/config.js',
  './hotel/manifest.json',
  './manager/manifest.json',
  './icons/otel-192.png',
  './icons/yonetici-192.png',
];

// Kurulum: shell dosyalarını önbelleğe al
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Aktivasyon: eski önbellekleri temizle
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: önbellekte varsa oradan sun, yoksa ağdan al
// API isteklerini (script.google.com) HİÇBİR ZAMAN önbelleğe alma
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Google Apps Script API — her zaman ağdan, cache yok
  if (url.includes('script.google.com') || url.includes('workers.dev')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status:503})));
    return;
  }

  // CDN (SheetJS vb.) — ağdan, başarısız olursa önbellekten
  if (url.includes('cdnjs.cloudflare.com')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Uygulama dosyaları — önce önbellekten, arka planda güncelle
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});
