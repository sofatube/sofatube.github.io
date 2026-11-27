/*
 * Inside the Sofa Tube app on an Android phone (platform/share-android,
 * WebActivity; docs/research/one-app-097.md): the app gives this page one
 * message port (Android's postWebMessage, to the main frame of
 * sofatube.github.io only) and says what it can do that a web page can't:
 * "share" (this phone's screen) and "setup" (install Sofa Tube on a TV). The
 * "On this phone" card shows only those. In a browser nothing comes, and the
 * card stays hidden.
 *
 * Only a message from the app itself counts: it has no source window and
 * carries the port. The TV's page, which this app shows in a sandboxed
 * frame, has a source (its frame), so a TV can't pretend to be the app.
 *
 * In an Android phone's browser (not the app: its WebView says SofaTubeApp/)
 * the "More with the Sofa Tube app" card says what only the app can, once
 * per phone until "Not now". On an iPhone it names the ways there are: a
 * computer, or an Android phone with the app (no iPhone app yet). Not on
 * computers (they share from the browser).
 */
(function () {
  'use strict';
  let app = null;

  function show() {
    const card = document.getElementById('app-card');
    if (!card || !app) return;
    const share = document.getElementById('app-share');
    const setup = document.getElementById('app-setup');
    share.classList.toggle('hidden', app.can.indexOf('share') < 0);
    setup.classList.toggle('hidden', app.can.indexOf('setup') < 0);
    card.classList.toggle('hidden', app.can.length === 0);
  }

  function ask(what) {
    if (app) app.port.postMessage(JSON.stringify({ do: what }));
  }

  /*
   * The TV on the Wi-Fi through the app ("lan"): the app's WebView can't
   * reach the home network from this https page (a browser asks its own
   * permission), so home.js and the search ask the app, which allows only
   * Sofa Tube's ports on a private address and the pairing paths.
   * window.sofaApp.ready(): true once the app said it can; false at once in a
   * browser, or after 10 s in the app if no hello came (the app gives its
   * port when the page has finished loading, later on a slow network).
   */
  const ua0 = String((window.navigator && window.navigator.userAgent) || '');
  let lanOk = false;
  let nextId = 1;
  let waiting = {};
  let readyDone = null;
  const ready = new Promise(function (r) {
    readyDone = r;
  });
  if (!/SofaTubeApp\//.test(ua0)) readyDone(false);
  else
    setTimeout(function () {
      readyDone(false);
    }, 10000);

  function dropWaiting() {
    const w = waiting;
    waiting = {};
    Object.keys(w).forEach(function (k) {
      w[k](0, '');
    });
  }

  function answered(ev) {
    let d;
    try {
      d = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (!d || typeof d.re !== 'number' || !waiting[d.re]) return;
    waiting[d.re](Number(d.code) || 0, String(d.text || ''));
  }

  /** As home.js lan(): { code, data, text }; code 0 when not reached. */
  function lan(a, method, path, body, ms) {
    if (!app || !lanOk)
      return Promise.resolve({ code: 0, data: null, text: '' });
    const id = nextId++;
    const to = app.port;
    return new Promise(function (res) {
      const timer = setTimeout(function () {
        if (waiting[id]) waiting[id](0, '');
      }, ms || 8000);
      waiting[id] = function (code, text) {
        clearTimeout(timer);
        delete waiting[id];
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = null; // not JSON (as home.js reads it)
        }
        res({ code: code, data: data, text: text });
      };
      to.postMessage(
        JSON.stringify({
          do: 'lan',
          id: id,
          a: a,
          ms: ms || 8000, // the app drops it once this page stopped waiting
          m: method,
          p: path,
          b:
            body === undefined || body === null
              ? null
              : typeof body === 'string'
                ? body
                : JSON.stringify(body)
        })
      );
    });
  }
  window.sofaApp = {
    // (a hello after the 3 s still counts from then on)
    ready: function () {
      return lanOk ? Promise.resolve(true) : ready;
    },
    lan: lan
  };

  /** The app's hello: { kind: 'sofatube-app', version, can: [...] } and one port. */
  function hello(e) {
    if (e.source !== null || !e.ports || e.ports.length !== 1) return;
    let d;
    try {
      d = JSON.parse(e.data);
    } catch {
      return;
    }
    if (!d || d.kind !== 'sofatube-app' || !Array.isArray(d.can)) return;
    const can = d.can.filter(function (c) {
      return c === 'share' || c === 'setup';
    });
    if (app) app.port.close();
    dropWaiting(); // (asked on the old port: not answered there any more)
    app = { port: e.ports[0], can: can, version: String(d.version || '') };
    app.port.addEventListener('message', answered);
    app.port.start();
    lanOk = d.can.indexOf('lan') >= 0;
    readyDone(lanOk);
    window.__sofaApp = { can: can.slice(), version: app.version };
    const get = document.getElementById('get-card');
    if (get) get.classList.toggle('hidden', true); // (the app is here)
    show();
  }

  const NO_KEY = 'sofa-get-app';
  function getCard() {
    const card = document.getElementById('get-card');
    if (!card) return;
    const ua = String((window.navigator && window.navigator.userAgent) || '');
    let no = false;
    try {
      no = window.localStorage.getItem(NO_KEY) === 'no';
    } catch {
      /* storage blocked: still shown, "Not now" hides it here */
    }
    const phone = /Android|iPhone|iPad|iPod/i.test(ua);
    const worth = phone && !/SofaTubeApp\//.test(ua) && !no;
    card.classList.toggle('hidden', !worth || !!app);
    const not = document.getElementById('get-not');
    if (not)
      not.addEventListener('click', function () {
        try {
          window.localStorage.setItem(NO_KEY, 'no');
        } catch {
          /* blocked */
        }
        card.classList.toggle('hidden', true);
      });
  }

  window.addEventListener('message', hello);
  document.addEventListener('DOMContentLoaded', function () {
    getCard();
    const share = document.getElementById('app-share');
    const setup = document.getElementById('app-setup');
    if (share)
      share.addEventListener('click', function () {
        ask('share');
      });
    if (setup)
      setup.addEventListener('click', function () {
        ask('setup');
      });
    show();
  });
  // (tests)
  window.__sofaAppHello = hello;
})();
