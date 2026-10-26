self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('cv-tailor-v3').then((cache) => {
      return cache.addAll([
        './index.html',
        './style.css',
        './script.js',
        './manifest.json',
        './icon.svg'
      ]);
    })
  );
  self.skipWaiting(); // Langsung aktifkan service worker baru tanpa menunggu
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== 'cv-tailor-v3') {
          return caches.delete(key); // Hapus cache versi lama yang bikin putih
        }
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
