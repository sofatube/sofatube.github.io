/*
 * What the phone gives the TV's page in the frame (tv-frame.js) besides the
 * camera: the buttons' short buzz and "Speak a command" (0.9.7; Galaxy,
 * 2026-11-27: no buzz and "microphone not allowed" inside the app).
 *
 * The frame has no microphone and can't vibrate (it is sandboxed, and a page
 * from a device that only says it is the TV must not use what the phone has
 * allowed this app). So `shim` (stringified, in the frame before the page)
 * gives the page a navigator.vibrate and a SpeechRecognition that ask this
 * window, and this window:
 *
 *   - buzzes only short (at most 200 ms, 6 parts), right after a tap, never
 *     more often than every 30 ms;
 *   - listens only right after a tap in the page (Chromium passes it up to
 *     this window), one at a time, 15 s at most, with its own "Listening…"
 *     bar and Stop, so a page can't listen unseen; the page gets the words
 *     only. Inside the Android app the app's own recognizer listens (its
 *     WebView has none that works: the app says "listen" in its hello,
 *     platform/share-android Listen.java); in a browser, the browser's.
 *
 * Also (tv-more.js): read aloud with the app's voice, a call, a text or an
 * e-mail from the page, and shake to pause.
 *
 * Also between the page and the app's start (index.html sets the hooks):
 * Disconnect in the page (`onClosed`: back to the start, staying off), and
 * Android's back (`onBack`: the app asks on its port, the page's own step
 * back first).
 */
'use strict';
// a block, not a function: its consts and functions stay in here (strict)
{
  /* --------- inside the frame (stringified; runs before the page) --------- */
  /* eslint-disable no-var */
  function shimMain(cfg, caps) {
    var N = cfg.n;
    var up = window.parent;
    function send(m) {
      m.n = N;
      up.postMessage(m, cfg.origin);
    }
    try {
      Object.defineProperty(navigator, 'vibrate', {
        configurable: true,
        value: function (p) {
          send({ kind: 'buzz', p: p });
          return true;
        }
      });
    } catch {
      /* the page goes on without a buzz */
    }
    // "Disconnect" in the page: the app goes back to its start
    window.__ytxAppClosed = function () {
      send({ kind: 'closed' });
    };
    // "Share this phone's screen" in the page: the app's own share (only
    // inside the Android app, which says "share" in its hello)
    if (caps.share)
      window.__ytxAppShare = function () {
        send({ kind: 'share' });
      };
    if (!caps.listen) return;
    var hears = {};
    var nextHear = 1;
    function Rec() {
      this.lang = '';
      this.interimResults = false;
      this.maxAlternatives = 1;
      this.continuous = false;
      this.processLocally = false;
      this.onresult = this.onerror = this.onend = this.onstart = null;
      this._id = 0;
    }
    function fire(r, name, ev) {
      var h = r['on' + name];
      if (typeof h !== 'function') return;
      try {
        h.call(r, ev);
      } catch (e) {
        setTimeout(function () {
          throw e;
        });
      }
    }
    Rec.prototype.start = function () {
      if (this._id) throw new Error('InvalidStateError');
      var id = nextHear++;
      this._id = id;
      hears[id] = this;
      send({
        kind: 'listen',
        id: id,
        lang: String(this.lang || ''),
        interim: !!this.interimResults,
        max: Number(this.maxAlternatives) || 1
      });
    };
    Rec.prototype.stop = function () {
      if (this._id) send({ kind: 'listen-stop', id: this._id });
    };
    Rec.prototype.abort = function () {
      var id = this._id;
      if (!id) return;
      send({ kind: 'listen-stop', id: id, abort: true });
      delete hears[id];
      this._id = 0;
      fire(this, 'end', { type: 'end' });
    };
    Rec.prototype.addEventListener = function (t, f) {
      this['on' + t] = f; // (the page uses one handler each)
    };
    Rec.prototype.removeEventListener = function (t) {
      this['on' + t] = null;
    };
    function results(list) {
      var out = [];
      (Array.isArray(list) ? list : []).forEach(function (one) {
        var alts = [];
        (Array.isArray(one.alts) ? one.alts : []).forEach(function (t) {
          alts.push({ transcript: String(t), confidence: 0 });
        });
        alts.isFinal = !!one.final;
        alts.item = function (i) {
          return alts[i];
        };
        out.push(alts);
      });
      out.item = function (i) {
        return out[i];
      };
      return out;
    }
    window.addEventListener('message', function (e) {
      var m = e.data;
      if (e.source !== up || !m || m.n !== N || m.kind !== 'heard') return;
      var r = hears[m.id];
      if (!r) return;
      if (m.ev === 'start') fire(r, 'start', { type: 'start' });
      else if (m.ev === 'result')
        fire(r, 'result', {
          type: 'result',
          resultIndex: 0,
          results: results(m.results)
        });
      else if (m.ev === 'error')
        fire(r, 'error', { type: 'error', error: String(m.error || '') });
      else if (m.ev === 'end') {
        delete hears[m.id];
        r._id = 0;
        fire(r, 'end', { type: 'end' });
      }
    });
    try {
      Object.defineProperty(window, 'SpeechRecognition', {
        configurable: true,
        value: Rec
      });
      Object.defineProperty(window, 'webkitSpeechRecognition', {
        configurable: true,
        value: Rec
      });
    } catch {
      /* the page says there is no speech here */
    }
  }
  /* eslint-enable no-var */

  /* ---------------- the buzz ---------------- */
  let buzzAt = 0;
  function buzz(p) {
    const ok = (x) => typeof x === 'number' && x >= 0 && x <= 200;
    const fine = ok(p) || (Array.isArray(p) && p.length <= 6 && p.every(ok));
    const ua = navigator.userActivation;
    const now = Date.now();
    if (!fine || !navigator.vibrate || now - buzzAt < 30) return;
    if (ua && !ua.isActive) return;
    buzzAt = now;
    try {
      navigator.vibrate(p);
    } catch {
      /* not on every phone */
    }
  }

  /* ------------- the app's recognizer (its hello's port) ------------- */
  // (app-bridge.js keeps the same port for the rest; ids from 1e9 here so
  // its answers and these events never mix)
  let appPort = null;
  let appListens = false;
  let appShares = false;
  let appSays = false;
  let nextId = 1e9;
  const appEv = {};
  window.addEventListener('message', function (e) {
    if (e.source !== null || !e.ports || e.ports.length !== 1) return;
    let d;
    try {
      d = JSON.parse(e.data);
    } catch {
      return;
    }
    if (!d || d.kind !== 'sofatube-app' || !Array.isArray(d.can)) return;
    appPort = e.ports[0];
    appListens = d.can.indexOf('listen') >= 0;
    appShares = d.can.indexOf('share') >= 0;
    appSays = d.can.indexOf('say') >= 0;
    appPort.addEventListener('message', function (m) {
      let a;
      try {
        a = JSON.parse(m.data);
      } catch {
        return;
      }
      if (a && a.kind === 'back') {
        // Android's back (WebActivity): the page's own step back first
        const api = self.sofaTvVoice;
        const handled = !!(api.onBack && api.onBack());
        appPort.postMessage(JSON.stringify({ do: 'back', handled }));
        return;
      }
      if (a && typeof a.ev === 'string' && appEv[a.re]) appEv[a.re](a);
    });
    appPort.start();
  });
  function listenApp(lang, max, interim, onEv) {
    const to = appPort;
    const id = nextId++;
    appEv[id] = (a) => {
      if (a.ev === 'end') delete appEv[id];
      onEv(a);
    };
    to.postMessage(
      JSON.stringify({ do: 'listen', id, lang, max, interim: !!interim })
    );
    return (abort) => {
      if (!appEv[id]) return;
      to.postMessage(JSON.stringify({ do: 'listen-stop', id }));
      if (abort) delete appEv[id];
    };
  }

  /** The browser's own recognizer -> stop(abort). */
  function listenWeb(lang, max, interim, onEv) {
    const SR = self.SpeechRecognition || self.webkitSpeechRecognition;
    const r = new SR();
    r.lang = lang;
    r.interimResults = interim;
    r.maxAlternatives = max;
    r.onstart = () => onEv({ ev: 'start' });
    r.onresult = (e) => {
      const out = [];
      for (let i = 0; i < e.results.length; i++) {
        const a = e.results[i];
        const alts = [];
        for (let j = 0; j < a.length; j++) alts.push(a[j].transcript);
        out.push({ final: !!a.isFinal, alts });
      }
      onEv({ ev: 'result', results: out });
    };
    r.onerror = (e) => onEv({ ev: 'error', error: (e && e.error) || '' });
    r.onend = () => onEv({ ev: 'end' });
    r.start();
    return (abort) => (abort ? r.abort() : r.stop());
  }

  /** 'app' | 'web' | '' (no speech here). */
  function way() {
    if (appPort && appListens) return 'app';
    const ua = String((navigator && navigator.userAgent) || '');
    if (/SofaTubeApp\//.test(ua)) return ''; // (its WebView's own one fails)
    return self.SpeechRecognition || self.webkitSpeechRecognition ? 'web' : '';
  }

  /* ---------------- the listening ---------------- */
  const MAX_MS = 15000;
  const TEXT = {
    en: { on: 'Listening… (for the TV’s page)', stop: 'Stop' },
    ar: { on: 'جارٍ الاستماع… (لصفحة التلفاز)', stop: 'إيقاف' }
  };
  let listening = null; // {f, id, live(), bar, stop(abort), timer, watch}

  function tell(s, m) {
    m.kind = 'heard';
    m.n = s.n;
    m.id = s.id;
    if (s.live() && s.f.contentWindow) s.f.contentWindow.postMessage(m, '*');
  }

  /**
   * Ends the listening: an error first when there is one, then the end.
   * `done`: the recognizer ended by itself (nothing to stop).
   */
  function end(error, done) {
    const s = listening;
    if (!s) return;
    listening = null;
    clearTimeout(s.timer);
    clearInterval(s.watch);
    if (s.unload) s.unload();
    try {
      if (s.stop && !done) s.stop(true);
    } catch {
      /* ended */
    }
    if (s.bar) s.bar.remove();
    if (error) tell(s, { ev: 'error', error });
    tell(s, { ev: 'end' });
  }

  function stop(d) {
    const s = listening;
    if (!s || d.id !== s.id) return;
    if (d.abort) return end('');
    try {
      s.stop(false); // the words so far still come, then the end
    } catch {
      end('');
    }
  }

  function bar(onStop, words, cls) {
    const ar = /^ar/i.test(document.documentElement.lang || '');
    const T = TEXT[ar ? 'ar' : 'en'];
    const b = document.createElement('div');
    b.className = cls || 'ytx-listen';
    b.setAttribute('role', 'status');
    b.dir = ar ? 'rtl' : 'ltr';
    b.style.cssText =
      'position:fixed;left:12px;right:12px;' +
      'bottom:calc(12px + env(safe-area-inset-bottom));z-index:81;' +
      'display:flex;align-items:center;gap:12px;padding:10px 14px;' +
      'border-radius:14px;background:#ff8a00;color:#1d140e;' +
      'font:600 16px/1.4 system-ui,sans-serif;' +
      'box-shadow:0 4px 18px rgba(0,0,0,.35)';
    const t = document.createElement('span');
    t.textContent = words || T.on;
    t.style.flex = '1';
    const x = document.createElement('button');
    x.type = 'button';
    x.className = (cls || 'ytx-listen') + '-stop';
    x.textContent = T.stop;
    x.style.cssText =
      'font:inherit;min-height:44px;padding:8px 16px;border-radius:10px;' +
      'border:2px solid #1d140e;background:transparent;color:inherit';
    x.addEventListener('click', onStop);
    b.append(t, x);
    document.body.appendChild(b);
    return b;
  }

  // Stop on the bar is a tap in this window too: a page that starts again at
  // its end must not get it, so after Stop nothing listens for a while
  // (review of #417: Stop could be defeated)
  let quietUntil = 0;
  const QUIET_MS = 6000;
  // a page in fullscreen covers this window's bar: never listen under it,
  // and a page going fullscreen ends the listening (review of #417)
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) end('aborted');
  });

  function ask(me, f, d, live) {
    if (!Number.isInteger(d.id) || d.id < 1) return;
    const s = { n: me.n, f, id: d.id, live, bar: null, stop: null };
    const no = (error) => {
      tell(s, { ev: 'error', error });
      tell(s, { ev: 'end' });
    };
    const how = way();
    if (!how) return no('service-not-allowed');
    const ua = navigator.userActivation;
    if (!ua || !ua.isActive) return no('not-allowed'); // only after a tap
    if (document.fullscreenElement || Date.now() < quietUntil)
      return no('not-allowed');
    if (listening) end('aborted'); // a new ask wins (one at a time)
    const lang =
      typeof d.lang === 'string' &&
      /^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(d.lang)
        ? d.lang
        : /^ar/i.test(document.documentElement.lang || '')
          ? 'ar-SA'
          : 'en-US';
    const max = Math.max(1, Math.min(5, Number(d.max) || 1));
    const onEv = (ev) => {
      if (listening !== s) return;
      if (ev.ev === 'start') return tell(s, { ev: 'start' });
      if (ev.ev === 'error') return end(String(ev.error || 'aborted'), true);
      if (ev.ev === 'end') return end('', true);
      if (ev.ev !== 'result') return;
      const list = Array.isArray(ev.results) ? ev.results.slice(0, 20) : [];
      tell(s, {
        ev: 'result',
        results: list.map((r) => ({
          final: !!(r && r.final),
          alts: (r && Array.isArray(r.alts) ? r.alts : [])
            .slice(0, max)
            .map((x) => String(x).slice(0, 500))
        }))
      });
    };
    listening = s;
    s.bar = bar(() => {
      quietUntil = Date.now() + QUIET_MS;
      stop({ id: s.id });
    });
    s.timer = setTimeout(() => end('no-speech'), MAX_MS);
    // a new page in the frame, or the frame closed: the listening ends
    s.watch = setInterval(() => {
      if (!s.live() || !f.isConnected) end('aborted');
    }, 300);
    // ...or the frame's page going elsewhere (its load event)
    const gone = () => end('aborted');
    f.addEventListener('load', gone);
    s.unload = () => f.removeEventListener('load', gone);
    try {
      s.stop = (how === 'app' ? listenApp : listenWeb)(
        lang,
        max,
        !!d.interim,
        onEv
      );
    } catch {
      end('audio-capture');
    }
  }

  // tv-more.js: read aloud, links, shake (its own limits)
  const more = self.sofaTvMore
    ? self.sofaTvMore({
        port: () => appPort,
        says: () => appSays,
        ev: appEv,
        id: () => nextId++,
        bar
      })
    : null;
  let shareAt = 0;

  /** A message from the frame: true when it was one of these. */
  function msg(me, f, d, live) {
    if (d.kind === 'buzz') buzz(d.p);
    else if (d.kind === 'listen') ask(me, f, d, live);
    else if (d.kind === 'listen-stop') stop(d);
    else if (d.kind === 'share') {
      // only right after a tap in the page, one every 5 s; Android then asks
      const ua = navigator.userActivation;
      const now = Date.now();
      if (appPort && appShares && ua && ua.isActive && now - shareAt >= 5000) {
        shareAt = now;
        appPort.postMessage(JSON.stringify({ do: 'share' }));
      }
    } else if (more && more.msg(me, f, d, live)) return true;
    else if (d.kind === 'closed') {
      // Disconnect is a tap in the page: a page can't send the app back to
      // its start (and keep it off) by itself (review of #417)
      const ua = navigator.userActivation;
      if (live() && ua && ua.isActive && self.sofaTvVoice.onClosed)
        self.sofaTvVoice.onClosed();
    } else return false;
    return true;
  }

  // what the frame's page gets (put into its script as an object literal)
  const can = () =>
    JSON.stringify({
      listen: !!way(),
      share: !!(appPort && appShares),
      say: !!(appPort && appSays)
    });
  // go: the phone's app for the link (tv-voice-ui.mjs watches it)
  const go = (url) => {
    location.href = url;
  };
  // tv-frame.js puts `(${shim})(cfg, caps);` into the frame: both parts
  const both = {
    toString: () =>
      'function (cfg, caps) {(' +
      shimMain +
      ')(cfg, caps);(' +
      (more ? more.shim : 'function () {}') +
      ')(cfg, caps);}'
  };
  const openKind = more ? more.openKind : () => null; // (tests)
  self.sofaTvVoice = { shim: both, msg, can, end, go, openKind };
}
