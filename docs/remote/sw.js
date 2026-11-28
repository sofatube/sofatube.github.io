/*
 * Sofa Tube "Find my TV" page: works without the internet once opened (the
 * phone is on the home Wi-Fi, which may have no internet at that moment),
 * and makes the page installable. Only this page's own files: the requests
 * to the TV (http://<address>/hello) are left alone.
 */
const CACHE = 'sofatube-remote-v33';
const FILES = [
  './',
  'share-link.js',
  'share.html',
  'away.html', // Control from away (0.9.5, L41)
  'away.js',
  'away-crypto.js',
  'home.js', // the TV's page inside the app at home (0.9.6)
  'tv-frame.js', // ...in a sandboxed frame (0.9.6)
  'tv-voice.js', // ...its buzz and voice through the app (0.9.7)
  'tv-more.js', // ...read aloud, calls and texts, shake (0.9.7)
  'app-bridge.js', // inside the Sofa Tube app on Android (0.9.7)
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

/*
 * The TV's phone page inside the app (away.html from away, the front page
 * with home.js at home) no longer goes through this worker: it runs in a
 * sandboxed frame with an opaque origin (tv-frame.js), which a service
 * worker can't serve anyway, and its requests go to the page holding the
 * channel by postMessage. So nothing from the channel (another device's
 * words) is ever answered here or kept in this app's cache, and the old
 * ./tv/ address answers 410 (never HTML) for an old page still asking.
 */
const GONE = () =>
  new Response('gone', {
    status: 410,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Security-Policy': "sandbox; default-src 'none'",
      'X-Content-Type-Options': 'nosniff'
    }
  });

/** Only this site's own answers go into the cache. */
function cacheable(r) {
  return !!r && r.ok && r.type === 'basic';
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope);
  const rel = url.pathname.slice(scope.pathname.length);
  if (rel === 'tv' || rel.startsWith('tv/')) {
    e.respondWith(GONE());
    return;
  }
  if (e.request.method !== 'GET') return;
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
  // the pages: the newest when online, the saved copy when not
  if (e.request.mode === 'navigate') {
    const key = rel === '' || rel === 'index.html' ? './' : rel;
    if (FILES.indexOf(key) < 0) return;
    e.respondWith(fresh(e.request, key));
    return;
  }
  // the app's own files: the newest too, so a page and its scripts always
  // come from the same update (cache-first gave the new away.html with the
  // old away.js on the first visit after an update: an empty page, 0.9.7);
  // the saved copy only when the network fails
  if (FILES.indexOf(rel) >= 0) {
    e.respondWith(fresh(e.request, rel));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});

/** The site's answer (kept for later), or the saved copy when offline. */
function fresh(req, key) {
  // past the browser's own short-term copy too (GitHub Pages: 10 minutes);
  // a page's own request can't be copied with options: as it is
  const ask =
    req.mode === 'navigate'
      ? fetch(req)
      : fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
  return ask
    .then((r) => {
      if (cacheable(r)) {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(key, copy));
      }
      return r;
    })
    .catch(() => caches.match(key).then((hit) => hit || Response.error()));
}

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

function awayGet(key) {
  return new Promise((ok) => {
    try {
      const r = indexedDB.open('sofatube-away', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => {
        const q = r.result.transaction('kv').objectStore('kv').get(key);
        q.onsuccess = () => ok(q.result);
        q.onerror = () => ok(undefined);
      };
      r.onerror = () => ok(undefined);
    } catch {
      ok(undefined);
    }
  });
}

/*
 * 0.9.7: more than one TV. Each TV's subscription lives in its own
 * registration (away.js pushSub: the app's own scope, or ./push/<TV id>/),
 * so the TV of a push is the one whose pushScope is this registration's
 * (a TV paired before 0.9.7 has none: the app's own scope).
 */
async function pushTv() {
  const list = await awayGet('tvs');
  const tvs = Array.isArray(list) ? list : [];
  const here = self.registration.scope;
  const main = new URL('./', self.location).href;
  return (
    tvs.find((t) => t && t.pushScope === here) ||
    (here === main ? tvs.find((t) => t && !t.pushScope) : null) ||
    null
  );
}

self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = {};
  }
  e.waitUntil(
    Promise.all([awayGet('lang'), pushTv()]).then(([saved, tv]) => {
      const lang = saved === 'ar' ? 'ar' : 'en';
      const T = PUSH_TEXT[lang];
      const what = T[d.kind] || T.time;
      const detail = String(d.title || d.app || '').slice(0, 80);
      // which TV asks, when this phone has more than one
      const name = tv ? String(tv.label || tv.name || '').slice(0, 40) : '';
      return self.registration.showNotification(
        name ? T.title + ' · ' + name : T.title,
        {
          body: detail ? what + ': ' + detail : what,
          icon: new URL('icon-192.png', self.location).href,
          badge: new URL('icon-192.png', self.location).href,
          tag: 'sofatube-req-' + (tv ? tv.tvId : '') + (d.kind || 'time'),
          dir: lang === 'ar' ? 'rtl' : 'ltr',
          lang,
          data: { tv: tv ? tv.tvId : '' }
        }
      );
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  // the app opens on the TV that asked (away.html #tv=, or a message to it)
  const id = String((e.notification.data && e.notification.data.tv) || '');
  const url =
    new URL('away.html', self.location).href + (id ? '#tv=' + id : '');
  e.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const c of list)
          if (c.url.indexOf('away.html') >= 0 && 'focus' in c) {
            if (id) c.postMessage({ ytxTv: id });
            return c.focus();
          }
        return self.clients.openWindow(url);
      })
  );
});
