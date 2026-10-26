self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('cv-tailor-v1').then((cache) => {
      return cache.addAll([
        './index.html',
        './style.css',
        './script.js',
        './manifest.json',
        './icon.svg'
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
