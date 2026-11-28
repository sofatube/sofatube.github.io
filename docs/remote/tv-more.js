/*
 * More of what the phone gives the TV's page in the frame (tv-voice.js uses
 * it; 0.9.7 phone sweep and its security review). The TV's page is not
 * trusted: a device that only says it is the TV can put any page there.
 *
 *   - Read aloud inside the Android app (its WebView has no speech): the
 *     app's own voice, only after the person has used this page at all,
 *     one utterance per 3 s, about 1500 characters a minute, with this
 *     window's "Reading aloud · Stop" bar; after Stop, nothing for 6 s; it
 *     ends when the frame closes or another page comes (and in the app with
 *     each new page and behind another app).
 *   - A call, a text or an e-mail from the page ("My helper", the problem
 *     report): only right after a tap, at most one every 5 s, only a plain
 *     number, a text with only a body, or the report's own address with only
 *     a subject and a body; this window asks first ("Call +1 555 0100?"),
 *     so the person sees the number in the app's own words.
 *   - Shake to pause: the frame gets no motion sensors; this window watches
 *     the phone's movement while the page wants it and tells the frame only
 *     "a shake" (event `ytxshake` in the page).
 */
'use strict';
{
  /* --------- inside the frame (stringified; runs before the page) --------- */
  /* eslint-disable no-var */
  function shim(cfg, caps) {
    var N = cfg.n;
    var up = window.parent;
    function send(m) {
      m.n = N;
      up.postMessage(m, cfg.origin);
    }
    // links: this window asks the person, then opens the phone's app
    window.addEventListener(
      'click',
      function (e) {
        var a = e.target && e.target.closest && e.target.closest('a[href]');
        var href = a ? a.getAttribute('href') || '' : '';
        if (!/^(?:tel|sms|mailto):/i.test(href)) return;
        e.preventDefault();
        send({ kind: 'open', url: href });
      },
      true
    );
    // shake: the page's devicemotion listeners tell this window to watch
    var moving = 0;
    var add = window.addEventListener;
    var rem = window.removeEventListener;
    window.addEventListener = function (t) {
      if (t === 'devicemotion' && ++moving === 1)
        send({ kind: 'motion', on: true });
      return add.apply(this, arguments);
    };
    window.removeEventListener = function (t) {
      if (t === 'devicemotion' && moving > 0 && --moving === 0)
        send({ kind: 'motion', on: false });
      return rem.apply(this, arguments);
    };
    var cur = null; // the utterance being said: {u, id}
    var next = 1;
    function ended(c) {
      if (!c) return;
      if (cur === c) cur = null;
      var h = c.u.onend;
      var ev = { type: 'end', utterance: c.u };
      try {
        if (typeof h === 'function') h.call(c.u, ev);
        (c.u._on.end || []).forEach(function (f) {
          f.call(c.u, ev);
        });
      } catch (x) {
        setTimeout(function () {
          throw x;
        });
      }
    }
    add.call(window, 'message', function (e) {
      var m = e.data;
      if (e.source !== up || !m || m.n !== N) return;
      if (m.kind === 'shake') window.dispatchEvent(new Event('ytxshake'));
      else if (m.kind === 'said' && cur && cur.id === m.id) ended(cur);
    });
    if (!caps.say) return;
    var voices = ['en-US', 'ar-SA'].map(function (l) {
      return {
        name: 'Android ' + l,
        lang: l,
        voiceURI: 'android-' + l,
        localService: true,
        default: l === 'en-US'
      };
    });
    var Utt = function (text) {
      this.text = String(text || '');
      this.lang = '';
      this.voice = null;
      this.onend = null;
      this._on = {};
    };
    Utt.prototype.addEventListener = function (t, f) {
      (this._on[t] = this._on[t] || []).push(f);
    };
    Utt.prototype.removeEventListener = function (t, f) {
      this._on[t] = (this._on[t] || []).filter(function (g) {
        return g !== f;
      });
    };
    var synth = {
      pending: false,
      paused: false,
      getVoices: function () {
        return voices.slice();
      },
      // one at a time: a new one replaces the one being said
      speak: function (u) {
        if (!u) return;
        if (cur) ended(cur);
        var lang = u.lang || (u.voice && u.voice.lang) || '';
        cur = { u: u, id: next++ };
        send({
          kind: 'say',
          id: cur.id,
          text: String(u.text || ''),
          lang: lang
        });
      },
      cancel: function () {
        if (cur) send({ kind: 'say-stop' });
      },
      pause: function () {},
      resume: function () {},
      addEventListener: function () {},
      removeEventListener: function () {}
    };
    Object.defineProperty(synth, 'speaking', {
      get: function () {
        return !!cur;
      }
    });
    try {
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        configurable: true,
        value: Utt
      });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: synth
      });
    } catch {
      /* the page goes on without reading aloud */
    }
  }
  /* eslint-enable no-var */

  const TEXT = {
    en: {
      say: 'Reading aloud (for the TV’s page)',
      tel: 'Call {x}?',
      sms: 'Send a text to {x}?',
      mailto: 'Write an e-mail to {x}?',
      ok: 'OK',
      cancel: 'Cancel'
    },
    ar: {
      say: 'قراءة بصوت عالٍ (لصفحة التلفاز)',
      tel: 'الاتصال بـ {x}؟',
      sms: 'إرسال رسالة إلى {x}؟',
      mailto: 'كتابة بريد إلكتروني إلى {x}؟',
      ok: 'موافق',
      cancel: 'إلغاء'
    }
  };
  const ar = () => /^ar/i.test(document.documentElement.lang || '');
  const T = () => TEXT[ar() ? 'ar' : 'en'];

  /* ---------------- links: a number, a text, the report's e-mail -------- */
  // the report's address (36-home.js hmMail); no other mailto leaves
  const REPORT = 'sofatube.app@proton.me';
  const KEEP = '[^&#=\\s]';
  const OPEN = {
    tel: /^tel:(\+?\d{3,15})$/i,
    sms: new RegExp(`^sms:(\\+?\\d{3,15})(?:\\?&?body=${KEEP}{0,1600})?$`, 'i'),
    mailto: new RegExp(
      '^mailto:(' +
        REPORT.replace(/\./g, '\\.') +
        `)(?:\\?subject=${KEEP}{0,200}(?:&body=${KEEP}{0,12000})?` +
        `|\\?body=${KEEP}{0,12000})?$`,
      'i'
    )
  };
  /** {kind, who} for a link this window may open, else null. */
  function openKind(url) {
    if (typeof url !== 'string') return null;
    for (const k of Object.keys(OPEN)) {
      const m = OPEN[k].exec(url);
      if (m) return { kind: k, who: m[1] };
    }
    return null;
  }
  const GAP_MS = 5000; // one open (and one share) every 5 s at most
  let openAt = 0;

  // A tap in the frame makes this window "active" too (Chromium passes it
  // up), but so does a tap on this window's own controls (a TV, the PIN,
  // Stop): those reach this window's listeners, the frame's don't. So "the
  // person just tapped the TV's page" = active, and no tap here meanwhile.
  let hereAt = 0;
  for (const t of ['pointerdown', 'keydown', 'touchstart', 'mousedown'])
    window.addEventListener(t, () => (hereAt = Date.now()), true);
  function pageTap() {
    const ua = navigator.userActivation;
    return !!(ua && ua.isActive) && Date.now() - hereAt > 5000;
  }
  // a page in fullscreen covers this window's bar and questions: nothing
  // then, and going fullscreen ends the reading and the question
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) return;
    sayEnd(true);
    for (const b of document.querySelectorAll('.ytx-confirm')) b.remove();
  });

  /** This window's own question; ok() only after OK. */
  function confirmBox(k, ok) {
    const t = T();
    const box = document.createElement('div');
    box.className = 'ytx-confirm';
    box.setAttribute('role', 'alertdialog');
    box.dir = ar() ? 'rtl' : 'ltr';
    box.style.cssText =
      'position:fixed;left:12px;right:12px;top:30%;z-index:82;' +
      'padding:18px;border-radius:16px;background:#fffdf8;color:#1d140e;' +
      'font:600 18px/1.4 system-ui,sans-serif;' +
      'box-shadow:0 8px 32px rgba(0,0,0,.45)';
    const [a, b] = t[k.kind].split('{x}');
    const p = document.createElement('p');
    const who = document.createElement('bdi');
    who.dir = 'ltr';
    who.textContent = k.who;
    p.append(a, who, b);
    p.style.margin = '0 0 14px';
    const btn = (text, cls, fn) => {
      const x = document.createElement('button');
      x.type = 'button';
      x.className = cls;
      x.textContent = text;
      x.style.cssText =
        'font:inherit;min-height:48px;padding:8px 20px;margin:4px;' +
        'border-radius:12px;border:2px solid #1d140e;background:transparent;' +
        'color:inherit';
      x.addEventListener('click', () => {
        // OK only once the question has been seen (a page's "tap twice")
        if (fn === ok && Date.now() - shown < 700) return;
        box.remove();
        fn();
      });
      return x;
    };
    box.append(
      p,
      btn(t.ok, 'ytx-confirm-ok', ok),
      btn(t.cancel, 'ytx-confirm-no', () => {})
    );
    document.body.appendChild(box);
    const shown = Date.now();
    setTimeout(() => box.remove(), 30000);
  }

  function open(d) {
    const k = openKind(d.url);
    const now = Date.now();
    if (!pageTap() || !k || now - openAt < GAP_MS) return;
    if (document.fullscreenElement || document.querySelector('.ytx-confirm'))
      return;
    openAt = now;
    confirmBox(k, () => self.sofaTvVoice.go(d.url));
  }

  /* ---------------- shake (coarse) ---------------- */
  // 3 strong changes of direction within 900 ms, then 3 s of rest (as the
  // phone page's own, 36-home.js hmShaken)
  const mv = {};
  function shaken(x, y, z, now) {
    const was = mv.v;
    mv.v = [x, y, z];
    if (!was) return false;
    const d =
      Math.abs(x - was[0]) + Math.abs(y - was[1]) + Math.abs(z - was[2]);
    if (d < 24 || now < (mv.rest || 0) || now - (mv.at || 0) < 90) return false;
    mv.at = now;
    mv.hits = (mv.hits || []).filter((t) => now - t < 900).concat([now]);
    if (mv.hits.length < 3) return false;
    mv.hits = [];
    mv.rest = now + 3000;
    return true;
  }
  let shakeTo = null; // {f, n, live}
  function onMotion(e) {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x === null || a.x === undefined) return;
    if (!shaken(a.x, a.y, a.z, Date.now())) return;
    const s = shakeTo;
    if (!s || !s.live() || !s.f.isConnected) return motionOff();
    if (document.visibilityState === 'hidden') return;
    s.f.contentWindow.postMessage({ kind: 'shake', n: s.n }, '*');
  }
  function motionOff() {
    shakeTo = null;
    window.removeEventListener('devicemotion', onMotion);
  }
  function motion(me, f, d, live) {
    if (!d.on) return motionOff();
    const D = self.DeviceMotionEvent;
    if (!D) return;
    const go = () => {
      const s = { f, n: me.n, live };
      shakeTo = s;
      window.removeEventListener('devicemotion', onMotion);
      window.addEventListener('devicemotion', onMotion);
      // the frame closed: no more watching
      const w = setInterval(() => {
        if (shakeTo !== s) return clearInterval(w);
        if (!live() || !f.isConnected) {
          clearInterval(w);
          motionOff();
        }
      }, 1000);
    };
    if (typeof D.requestPermission !== 'function') return go();
    // (iPhone: asked after a tap only)
    const ua = navigator.userActivation;
    if (ua && ua.isActive)
      D.requestPermission().then(
        (r) => r === 'granted' && go(),
        () => {}
      );
  }

  /* ---------------- read aloud: the app's voice ---------------- */
  const SAY_GAP_MS = 3000;
  const SAY_PER_MIN = 1500;
  const SAY_MAX_MS = 60000;
  const QUIET_MS = 6000;
  let api = null; // tv-voice.js: {port(), says(), ev, id(), bar()}
  let saying = null; // {id, pid, n, f, live, bar, watch, timer}
  let sayLast = 0;
  let sayQuietUntil = 0;
  let sayArmed = null; // the frame (n) whose page the person tapped to read
  let sayLog = []; // [at, characters]

  function said(n, f, live, pid) {
    if (live() && f.contentWindow)
      f.contentWindow.postMessage({ kind: 'said', n, id: pid }, '*');
  }
  function sayEnd(stopApp) {
    const s = saying;
    if (!s) return;
    saying = null;
    clearInterval(s.watch);
    clearTimeout(s.timer);
    delete api.ev[s.id];
    if (s.bar) s.bar.remove();
    const port = api.port();
    if (stopApp && port) port.postMessage(JSON.stringify({ do: 'say-stop' }));
    said(s.n, s.f, s.live, s.pid);
  }
  function say(me, f, d, live) {
    const pid = Number.isInteger(d.id) ? d.id : 0;
    const port = api && api.port();
    const now = Date.now();
    // each frame's first one, and the first after Stop: a tap in its page
    if (sayArmed !== me.n && pageTap() && now >= sayQuietUntil) sayArmed = me.n;
    const text = String(d.text || '').slice(0, 600);
    sayLog = sayLog.filter((x) => now - x[0] < 60000);
    const used = sayLog.reduce((n, x) => n + x[1], 0);
    if (
      !port ||
      !api.says() ||
      !text.trim() ||
      document.visibilityState === 'hidden' ||
      document.fullscreenElement ||
      sayArmed !== me.n ||
      now < sayQuietUntil ||
      now - sayLast < SAY_GAP_MS ||
      used + text.length > SAY_PER_MIN
    )
      return said(me.n, f, live, pid);
    sayEnd(false); // (the app says the new one in its place)
    sayLast = now;
    sayLog.push([now, text.length]);
    const lang = /^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(d.lang) ? d.lang : '';
    const s = { id: api.id(), pid, n: me.n, f, live, bar: null };
    saying = s;
    api.ev[s.id] = (a) => {
      if (a.ev === 'end' && saying === s) sayEnd(false);
    };
    s.bar = api.bar(
      () => {
        sayQuietUntil = Date.now() + QUIET_MS;
        sayArmed = null; // again only after a new tap in the page
        sayEnd(true);
      },
      T().say,
      'ytx-say'
    );
    s.watch = setInterval(() => {
      if (!s.live() || !f.isConnected) sayEnd(true); // the frame closed
    }, 300);
    s.timer = setTimeout(() => sayEnd(true), SAY_MAX_MS);
    port.postMessage(JSON.stringify({ do: 'say', id: s.id, text, lang }));
  }

  /** A message from the frame: true when it was one of these. */
  function msg(me, f, d, live) {
    if (d.kind === 'say') say(me, f, d, live);
    else if (d.kind === 'say-stop') {
      if (saying && saying.n === me.n) sayEnd(true);
    } else if (d.kind === 'open') open(d);
    else if (d.kind === 'motion') motion(me, f, d, live);
    else return false;
    return true;
  }

  self.sofaTvMore = (a) => {
    api = a;
    return { shim, msg, openKind, GAP_MS };
  };
}
