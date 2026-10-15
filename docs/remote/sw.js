/*
 * Sofa Tube "Find my TV" page: works without the internet once opened (the
 * phone is on the home Wi-Fi, which may have no internet at that moment),
 * and makes the page installable. Only this page's own files: the requests
 * to the TV (http://<address>/hello) are left alone.
 */
const CACHE = 'sofatube-remote-v3';
const FILES = [
  './',
  'share-link.js',
  'share.html',
  'manifest.webmanifest',
  'manifest-ar.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin || e.request.method !== 'GET') return;
  const scope = new URL(self.registration.scope);
  const rel = url.pathname.slice(scope.pathname.length);
  // a video shared from another app (the manifest's share_target, GET
  // ./share?title=&text=&url=): the shared link goes after # on the page,
  // straight from here, so it never reaches the site's server
  if (e.request.mode === 'navigate' && /^share(?:\.html)?$/.test(rel)) {
    e.respondWith(
      Response.redirect(
        new URL('./#share=1&' + url.search.slice(1), scope).href,
        303
      )
    );
    return;
  }
  // the page: the newest when online, the saved copy when not
  if (e.request.mode === 'navigate') {
    if (rel !== '' && rel !== 'index.html') return;
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return r;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
