/*
 * Sofa Tube "Find my TV" page: works without the internet once opened (the
 * phone is on the home Wi-Fi, which may have no internet at that moment),
 * and makes the page installable. Only this page's own files: the requests
 * to the TV (http://<address>/hello) are left alone.
 */
const CACHE = 'sofatube-remote-v6';
const FILES = [
  './',
  'share-link.js',
  'share.html',
  'away.html', // Control from away (0.9.5, L41)
  'away.js',
  'away-crypto.js',
  'away-help.html',
  'jsqr.min.js',
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

/*
 * Control from away (0.9.5, L41): a kid's request, sent by the TV itself as
 * Web Push (RFC 8291: the browser opens it; the push service saw only a
 * sealed body). {k:'req', kind:'time'|'video'|'app', title, app, id}.
 */
const PUSH_TEXT = {
  en: {
    time: 'Asks for more time',
    video: 'Asks to watch a video',
    app: 'Asks for an app',
    title: 'Sofa Tube: a request'
  },
  ar: {
    time: 'يطلب وقتًا إضافيًا',
    video: 'يطلب مشاهدة فيديو',
    app: 'يطلب تطبيقًا',
    title: 'صوفا تيوب: طلب جديد'
  }
};

function pushLang() {
  return new Promise((ok) => {
    try {
      const r = indexedDB.open('sofatube-away', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => {
        const q = r.result.transaction('kv').objectStore('kv').get('lang');
        q.onsuccess = () => ok(q.result === 'ar' ? 'ar' : 'en');
        q.onerror = () => ok('en');
      };
      r.onerror = () => ok('en');
    } catch {
      ok('en');
    }
  });
}

self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = {};
  }
  e.waitUntil(
    pushLang().then((lang) => {
      const T = PUSH_TEXT[lang];
      const what = T[d.kind] || T.time;
      const detail = String(d.title || d.app || '').slice(0, 80);
      return self.registration.showNotification(T.title, {
        body: detail ? what + ': ' + detail : what,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: 'sofatube-req-' + (d.kind || 'time'),
        dir: lang === 'ar' ? 'rtl' : 'ltr',
        lang
      });
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL('away.html', self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => {
      for (const c of list)
        if (c.url.indexOf('away.html') >= 0 && 'focus' in c) return c.focus();
      return self.clients.openWindow(url);
    })
  );
});
