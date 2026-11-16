/*
 * Sofa Tube remote app (0.9.6): the TV's phone page inside the app, kept
 * apart from the app.
 *
 * The page comes over the direct channel from whatever device answered as
 * "the TV". It must never run with this app's rights: the home and away keys
 * (IndexedDB 'sofatube-home' / 'sofatube-away'), the cached app files (a
 * changed away.js or home.js would stay) and the saved TVs. So it runs in an
 * <iframe sandbox> WITHOUT allow-same-origin: an opaque origin with no
 * access to this origin's storage, caches, cookies, service worker or
 * windows.
 *
 * Service workers do not serve such a frame (Chromium sends a sandboxed
 * frame's navigation straight to the network; tested 2026-11-16), so the page
 * is not loaded from ./tv/ any more:
 *
 *   1. this file asks the channel for the page (GET /?t=00&app=1…) and puts
 *      it into the frame as srcdoc, with a small script first (`shim`
 *      below);
 *   2. the page's own requests (fetch, XMLHttpRequest, image and script
 *      addresses, background images) come to this window by postMessage,
 *      with this frame's one-time number, and go over the channel; nothing
 *      else in the frame can reach the channel;
 *   3. the page reads its address through `__ytxLoc` (the same values as its
 *      old address `<app>/tv/?t=00&app=1&from=app&lang=…#…`), so its links,
 *      hash and query work as before; `location.x` in the page's text is
 *      turned into `__ytxLoc.x`;
 *   4. its localStorage is a copy kept by this window for that TV only
 *      (`sofatube-tvpage:<TV id>`); sessionStorage lives in memory.
 *
 * A camera, microphone or notifications are not given to the frame (a page
 * from a device that only says it is the TV must not use what the phone has
 * allowed this app).
 */
(function () {
  'use strict';
  const SANDBOX =
    'allow-scripts allow-forms allow-modals allow-popups ' +
    'allow-popups-to-escape-sandbox allow-downloads';
  const ALLOW =
    'clipboard-write; fullscreen; autoplay; picture-in-picture; web-share; ' +
    'screen-wake-lock';
  const PROPS =
    'href|protocol|host|hostname|port|pathname|search|hash|origin|reload|replace|assign';
  const LOC_RE = new RegExp(
    '(^|[^\\w$.])(?:(?:window|self|document)\\.)?location\\.(' + PROPS + ')\\b',
    'g'
  );
  const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH'];
  const STORE_MAX = 256 * 1024;

  /** The page's text with its address reads going to `__ytxLoc`. */
  function rewrite(html) {
    return html.replace(LOC_RE, '$1__ytxLoc.$2');
  }

  /* --------- inside the frame (stringified; runs before the page) --------- */
  /* eslint-disable no-var */
  function shim(cfg) {
    var N = cfg.n;
    var APP = cfg.origin;
    var TVP = cfg.scope + 'tv';
    var up = window.parent;
    var cur = new URL(cfg.url);
    function send(m) {
      m.n = N;
      up.postMessage(m, APP);
    }
    function tell() {
      send({ kind: 'url', url: cur.href });
    }

    /* the page's address */
    var L = {};
    [
      'href',
      'protocol',
      'host',
      'hostname',
      'port',
      'pathname',
      'search',
      'hash',
      'origin'
    ].forEach(function (k) {
      Object.defineProperty(L, k, {
        enumerable: true,
        get: function () {
          return cur[k];
        },
        set: function (v) {
          if (k === 'origin') return;
          if (k === 'href') {
            go(String(v));
            return;
          }
          var u = new URL(cur.href);
          u[k] = v;
          go(u.href);
        }
      });
    });
    L.reload = function () {
      send({ kind: 'reload', url: cur.href });
    };
    L.assign = L.replace = function (u) {
      go(String(u));
    };
    L.toString = function () {
      return cur.href;
    };
    function go(href) {
      var u;
      try {
        u = new URL(href, cur);
      } catch {
        return;
      }
      if (u.origin === cur.origin && u.pathname === cur.pathname) {
        if (u.search !== cur.search) {
          cur = u;
          tell();
          return L.reload();
        }
        if (u.hash === cur.hash) return;
        var old = cur.href;
        cur = u;
        tell();
        window.dispatchEvent(
          new HashChangeEvent('hashchange', { oldURL: old, newURL: cur.href })
        );
        return;
      }
      // anywhere else: a new tab (never this frame, never the app)
      if (/^https?:$/.test(u.protocol))
        window.open(u.href, '_blank', 'noopener');
    }
    window.__ytxLoc = L;
    var H = History.prototype;
    function hist(orig) {
      return function (state, title, url) {
        if (url !== undefined && url !== null && url !== '') {
          try {
            var u = new URL(url, cur);
            if (u.origin === cur.origin) {
              cur = u;
              tell();
            }
          } catch {
            /* not here */
          }
        }
        return orig.call(this, state, title);
      };
    }
    H.replaceState = hist(H.replaceState);
    H.pushState = hist(H.pushState);
    // links inside the page (its own handlers first)
    window.addEventListener('click', function (e) {
      if (e.defaultPrevented || !e.target || !e.target.closest) return;
      var a = e.target.closest('a[href]');
      if (!a || a.hasAttribute('download')) return;
      var href = a.getAttribute('href') || '';
      if (/^(?:blob|data|javascript):/i.test(href)) return;
      e.preventDefault();
      go(href);
    });
    window.addEventListener('submit', function (e) {
      if (!e.defaultPrevented) e.preventDefault();
    });

    /* storage: this TV's copy, kept by the app */
    function mem(init, save) {
      var d = Object.create(null);
      Object.keys(init || {}).forEach(function (k) {
        d[k] = String(init[k]);
      });
      var s = {
        getItem: function (k) {
          k = String(k);
          return k in d ? d[k] : null;
        },
        setItem: function (k, v) {
          d[String(k)] = String(v);
          if (save) save(d);
        },
        removeItem: function (k) {
          delete d[String(k)];
          if (save) save(d);
        },
        clear: function () {
          Object.keys(d).forEach(function (k) {
            delete d[k];
          });
          if (save) save(d);
        },
        key: function (i) {
          var k = Object.keys(d)[i];
          return k === undefined ? null : k;
        }
      };
      Object.defineProperty(s, 'length', {
        get: function () {
          return Object.keys(d).length;
        }
      });
      return s;
    }
    var saveT = 0;
    var ls = mem(cfg.store, function (d) {
      clearTimeout(saveT);
      saveT = setTimeout(function () {
        send({ kind: 'store', data: Object.assign({}, d) });
      }, 300);
    });
    var ss = mem({}, null);
    try {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: function () {
          return ls;
        }
      });
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        get: function () {
          return ss;
        }
      });
    } catch {
      /* not here */
    }

    /* requests: to the app, over the channel */
    var waits = {};
    var seq = 1;
    window.addEventListener('message', function (e) {
      var m = e.data;
      if (e.source !== up || !m || m.n !== N || m.kind !== 'res') return;
      var w = waits[m.id];
      delete waits[m.id];
      if (w) w(m);
    });
    function tvPath(url) {
      var u;
      try {
        u = new URL(url, cur);
      } catch {
        return null;
      }
      if (u.origin !== APP) return null;
      var p = u.pathname;
      if (p === TVP || p.indexOf(TVP + '/') === 0)
        p = p.slice(TVP.length) || '/';
      return p + u.search;
    }
    function b64(u8) {
      var s = '';
      for (var i = 0; i < u8.length; i += 0x8000)
        s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return btoa(s);
    }
    function bytes(s) {
      var bin = atob(s);
      var out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    function body(b, type) {
      if (b === undefined || b === null) return Promise.resolve({});
      if (typeof b === 'string') {
        if (!b.length) return Promise.resolve({});
        if (!type || /json/i.test(type))
          try {
            return Promise.resolve({ b: JSON.parse(b) });
          } catch {
            /* not here */
          }
      }
      var r = new Response(b);
      var t = type || r.headers.get('Content-Type') || '';
      return r.arrayBuffer().then(function (buf) {
        var u8 = new Uint8Array(buf);
        return u8.length ? { b64: b64(u8), type: t } : {};
      });
    }
    function ask(method, path, b, type) {
      return body(b, type).then(function (x) {
        return new Promise(function (ok) {
          var id = seq++;
          waits[id] = ok;
          send({
            kind: 'req',
            id: id,
            m: method,
            p: path,
            b: x.b,
            b64: x.b64,
            type: x.type
          });
        });
      });
    }
    function text(m) {
      if (m.b64 !== undefined) return new TextDecoder().decode(bytes(m.b64));
      return typeof m.data === 'string' ? m.data : JSON.stringify(m.data);
    }
    function asResponse(m) {
      var code = m.code >= 200 && m.code <= 599 ? m.code : 502;
      var none = code === 204 || code === 205 || code === 304;
      return new Response(
        none ? null : m.b64 !== undefined ? bytes(m.b64) : text(m),
        {
          status: code,
          headers: { 'Content-Type': m.type || 'application/json' }
        }
      );
    }
    function dataUrl(path) {
      return ask('GET', path).then(function (m) {
        if (!m || m.code !== 200) return '';
        var t = (m.type || 'application/octet-stream').split(';')[0];
        var raw =
          m.b64 !== undefined ? m.b64 : b64(new TextEncoder().encode(text(m)));
        return 'data:' + t + ';base64,' + raw;
      });
    }

    var realFetch = window.fetch;
    window.fetch = function (input, init) {
      var isReq = typeof Request !== 'undefined' && input instanceof Request;
      var url = isReq ? input.url : String(input);
      var p = tvPath(url);
      if (p === null) return realFetch.apply(window, arguments);
      init = init || {};
      var method = String(
        init.method || (isReq ? input.method : 'GET')
      ).toUpperCase();
      var type = '';
      var hs = init.headers || (isReq ? input.headers : null);
      if (hs)
        type =
          typeof hs.get === 'function'
            ? hs.get('Content-Type') || ''
            : hs['Content-Type'] || hs['content-type'] || '';
      var b = init.body;
      var got =
        b === undefined && isReq && method !== 'GET' && method !== 'HEAD'
          ? input.arrayBuffer()
          : Promise.resolve(b);
      return got
        .then(function (bb) {
          return ask(method, p, bb, type);
        })
        .then(asResponse);
    };

    function X() {
      this.readyState = 0;
      this.status = 0;
      this.statusText = '';
      this.response = null;
      this.responseText = '';
      this.responseType = '';
      this.timeout = 0;
      this.withCredentials = false;
      this._h = {};
      this._l = {};
      this._type = '';
      var up2 = { _l: {} };
      up2.addEventListener = function (t, f) {
        (up2._l[t] = up2._l[t] || []).push(f);
      };
      up2.removeEventListener = function () {};
      this.upload = up2;
    }
    X.UNSENT = 0;
    X.OPENED = 1;
    X.HEADERS_RECEIVED = 2;
    X.LOADING = 3;
    X.DONE = 4;
    X.prototype.open = function (method, url) {
      this._m = String(method || 'GET').toUpperCase();
      this._p = tvPath(String(url));
      this._done = false;
      this.readyState = 1;
      this._fire('readystatechange');
    };
    X.prototype.setRequestHeader = function (k, v) {
      if (/^content-type$/i.test(k)) this._type = String(v);
    };
    X.prototype.getResponseHeader = function (k) {
      return /^content-type$/i.test(k) ? this._rtype || null : null;
    };
    X.prototype.getAllResponseHeaders = function () {
      return this._rtype ? 'content-type: ' + this._rtype + '\r\n' : '';
    };
    X.prototype.overrideMimeType = function () {};
    X.prototype.addEventListener = function (t, f) {
      (this._l[t] = this._l[t] || []).push(f);
    };
    X.prototype.removeEventListener = function (t, f) {
      var a = this._l[t] || [];
      var i = a.indexOf(f);
      if (i >= 0) a.splice(i, 1);
    };
    X.prototype._fire = function (t, ev, on) {
      on = on || this;
      var e = ev || {
        type: t,
        target: on,
        lengthComputable: false,
        loaded: 0,
        total: 0
      };
      if (typeof on['on' + t] === 'function') on['on' + t].call(on, e);
      ((on._l && on._l[t]) || []).slice().forEach(function (f) {
        f.call(on, e);
      });
    };
    X.prototype.abort = function () {
      if (this._done) return;
      this._done = true;
      this.readyState = 0;
      this._fire('abort');
      this._fire('loadend');
    };
    X.prototype.send = function (b) {
      var me = this;
      if (me._p === null || me._p === undefined) {
        // only the TV's own addresses
        setTimeout(function () {
          me._done = true;
          me.readyState = 4;
          me._fire('readystatechange');
          me._fire('error');
          me._fire('loadend');
        }, 0);
        return;
      }
      var timer = 0;
      if (me.timeout > 0)
        timer = setTimeout(function () {
          if (me._done) return;
          me._done = true;
          me.readyState = 4;
          me._fire('readystatechange');
          me._fire('timeout');
          me._fire('loadend');
        }, me.timeout);
      me._fire('loadstart');
      ask(me._m, me._p, b, me._type).then(function (m) {
        clearTimeout(timer);
        if (me._done) return;
        me._done = true;
        if (b !== undefined && b !== null) {
          var n = (b && (b.size || b.byteLength || b.length)) || 0;
          me._fire(
            'progress',
            {
              type: 'progress',
              target: me.upload,
              lengthComputable: true,
              loaded: n,
              total: n
            },
            me.upload
          );
          me._fire('load', null, me.upload);
        }
        if (!m || !m.code) {
          me.readyState = 4;
          me._fire('readystatechange');
          me._fire('error');
          me._fire('loadend');
          return;
        }
        me.status = m.code;
        me._rtype = m.type || 'application/json';
        var rt = me.responseType;
        if (rt === 'arraybuffer' || rt === 'blob') {
          var u8 =
            m.b64 !== undefined
              ? bytes(m.b64)
              : new TextEncoder().encode(text(m));
          me.response =
            rt === 'blob' ? new Blob([u8], { type: me._rtype }) : u8.buffer;
        } else {
          me.responseText = text(m);
          if (rt === 'json')
            try {
              me.response = JSON.parse(me.responseText);
            } catch {
              me.response = null;
            }
          else me.response = me.responseText;
        }
        me.readyState = 4;
        me._fire('readystatechange');
        me._fire('load');
        me._fire('loadend');
      });
    };
    window.XMLHttpRequest = X;

    /* images and scripts from the TV: as data: addresses */
    function hook(proto) {
      var d = Object.getOwnPropertyDescriptor(proto, 'src');
      if (!d || !d.set || !d.configurable) return;
      Object.defineProperty(proto, 'src', {
        configurable: true,
        enumerable: d.enumerable,
        get: d.get,
        set: function (v) {
          var el = this;
          var s = String(v);
          if (
            el instanceof HTMLScriptElement &&
            /^https:\/\/www\.youtube\.com\/iframe_api\b/i.test(s)
          ) {
            // the app's player stands in for YouTube's API here (below)
            setTimeout(function () {
              el.dispatchEvent(new Event('load'));
              if (typeof window.onYouTubeIframeAPIReady === 'function')
                window.onYouTubeIframeAPIReady();
            }, 0);
            return;
          }
          var p = /^(?:data|blob):/i.test(s) ? null : tvPath(s);
          if (p === null) {
            d.set.call(el, v);
            return;
          }
          var my = (el.__ytxSrc = (el.__ytxSrc || 0) + 1);
          dataUrl(p).then(function (u) {
            if (el.__ytxSrc !== my) return;
            d.set.call(el, u || 'data:,');
          });
        }
      });
    }
    hook(HTMLImageElement.prototype);
    hook(HTMLScriptElement.prototype);

    /* ---- what an opaque origin can't have, done by the app (0.9.6) ---- */
    // YouTube refuses an embed in an opaque origin (error 153), and the frame
    // gets no camera: the app plays the video itself over this page's player
    // spot, and reads a QR code with its own camera, giving back the text only.
    var scans = {};
    var scanSeq = 1;
    var bridge = Object.freeze({
      // the TV's own page (home Wi-Fi), for what only works there
      tvUrl: typeof cfg.tv === 'string' ? cfg.tv : '',
      /** -> Promise<{text} | {text: null, why: 'cancel'|'denied'|'nocam'|'nodec'|'busy'}> */
      scan: function () {
        return new Promise(function (ok) {
          var id = scanSeq++;
          scans[id] = ok;
          send({ kind: 'scan', id: id });
        });
      }
    });
    Object.defineProperty(window, '__ytxBridge', { value: bridge });

    var players = {};
    var pidSeq = 1;
    var PS = {
      UNSTARTED: -1,
      ENDED: 0,
      PLAYING: 1,
      PAUSED: 2,
      BUFFERING: 3,
      CUED: 5
    };
    function ytFire(p, name, data) {
      var f = p.o.events && p.o.events[name];
      if (typeof f !== 'function') return;
      try {
        f({ target: p, data: data });
      } catch (e) {
        setTimeout(function () {
          throw e;
        }, 0);
      }
    }
    function Player(host, o) {
      var p = this;
      o = o || {};
      var v = o.playerVars || {};
      if (typeof host === 'string') host = document.getElementById(host);
      // a stand-in where YouTube's frame would be (the page's own CSS sizes
      // it); the app's player lies over it
      var ph = document.createElement('iframe');
      ph.setAttribute('title', 'YouTube');
      ph.setAttribute('tabindex', '-1');
      ph.setAttribute('src', 'about:blank');
      ph.style.border = '0';
      ph.style.background = 'transparent';
      if (o.width !== undefined) ph.setAttribute('width', String(o.width));
      if (o.height !== undefined) ph.setAttribute('height', String(o.height));
      if (host && host.id) ph.id = host.id;
      if (host && host.parentNode) host.parentNode.replaceChild(ph, host);
      p.o = o;
      p.ph = ph;
      p.pid = pidSeq++;
      p.s = {
        state: -1,
        t: Number(v.start) || 0,
        at: Date.now(),
        rate: 1,
        rates: [1],
        muted: !!v.mute,
        vol: 100,
        dur: 0,
        id: String(o.videoId || '')
      };
      players[p.pid] = p;
      send({
        kind: 'yt',
        op: 'make',
        pid: p.pid,
        v: String(o.videoId || ''),
        start: Number(v.start) || 0,
        vars: {
          autoplay: v.autoplay ? 1 : 0,
          mute: v.mute ? 1 : 0,
          controls: v.controls === 0 ? 0 : 1,
          hl: String(v.hl || '')
        }
      });
      p.timer = setInterval(function () {
        p._rect();
      }, 250);
      setTimeout(function () {
        p._rect();
      }, 0);
    }
    function seen(ph, r) {
      // the spot shows only where nothing of the page lies over it
      var W = window.innerWidth;
      var H = window.innerHeight;
      var pts = [
        [0.5, 0.5],
        [0.15, 0.15],
        [0.85, 0.15],
        [0.15, 0.85],
        [0.85, 0.85]
      ];
      for (var i = 0; i < pts.length; i++) {
        var x = r.left + r.width * pts[i][0];
        var y = r.top + r.height * pts[i][1];
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        var e = document.elementFromPoint(x, y);
        // the stand-in, or (pointer-events: none) one of its parents
        if (e && e !== ph && !e.contains(ph)) return false;
      }
      return true;
    }
    Player.prototype._rect = function () {
      var ph = this.ph;
      if (!ph) return;
      var on = ph.isConnected;
      var r = on
        ? ph.getBoundingClientRect()
        : { left: 0, top: 0, width: 0, height: 0 };
      var show = on && r.width > 1 && r.height > 1 && !document.hidden;
      if (show) show = seen(ph, r);
      var taps = on && getComputedStyle(ph).pointerEvents !== 'none';
      var k = [
        Math.round(r.left),
        Math.round(r.top),
        Math.round(r.width),
        Math.round(r.height),
        show,
        taps
      ].join(',');
      if (k === this.rk) return;
      this.rk = k;
      send({
        kind: 'yt',
        op: 'rect',
        pid: this.pid,
        x: r.left,
        y: r.top,
        w: r.width,
        h: r.height,
        show: show,
        taps: taps
      });
    };
    Player.prototype._cmd = function (f, a) {
      if (!this.ph) return;
      send({ kind: 'yt', op: 'cmd', pid: this.pid, f: f, a: a || [] });
    };
    Player.prototype._got = function (m) {
      var s = this.s;
      var i = m.info || {};
      if (m.ev === 'info') {
        if (typeof i.currentTime === 'number') {
          s.t = i.currentTime;
          s.at = typeof m.at === 'number' ? m.at : Date.now();
        }
        if (typeof i.playerState === 'number') s.state = i.playerState;
        if (typeof i.muted === 'boolean') s.muted = i.muted;
        if (typeof i.volume === 'number') s.vol = i.volume;
        if (typeof i.playbackRate === 'number') s.rate = i.playbackRate;
        if (Array.isArray(i.rates) && i.rates.length) s.rates = i.rates;
        if (typeof i.duration === 'number') s.dur = i.duration;
        if (typeof i.id === 'string') s.id = i.id;
        return;
      }
      if (m.ev === 'ready') return ytFire(this, 'onReady');
      if (m.ev === 'state') {
        if (s.state === 1) {
          // where it was when it stopped moving
          s.t = this.getCurrentTime();
          s.at = Date.now();
        }
        s.state = m.data;
        return ytFire(this, 'onStateChange', m.data);
      }
      if (m.ev === 'error') return ytFire(this, 'onError', m.data);
      if (m.ev === 'rate') {
        s.rate = m.data;
        return ytFire(this, 'onPlaybackRateChange', m.data);
      }
    };
    Player.prototype.getPlayerState = function () {
      return this.s.state;
    };
    Player.prototype.getCurrentTime = function () {
      var s = this.s;
      if (s.state !== 1) return s.t;
      var t = s.t + (Math.max(0, Date.now() - s.at) / 1000) * s.rate;
      return s.dur ? Math.min(t, s.dur) : t;
    };
    Player.prototype.getDuration = function () {
      return this.s.dur;
    };
    Player.prototype.isMuted = function () {
      return this.s.muted;
    };
    Player.prototype.getVolume = function () {
      return this.s.vol;
    };
    Player.prototype.getPlaybackRate = function () {
      return this.s.rate;
    };
    Player.prototype.getAvailablePlaybackRates = function () {
      return this.s.rates.slice();
    };
    Player.prototype.getVideoData = function () {
      return { video_id: this.s.id };
    };
    Player.prototype.getIframe = function () {
      return this.ph;
    };
    Player.prototype.playVideo = function () {
      this._cmd('playVideo');
    };
    Player.prototype.pauseVideo = function () {
      this._cmd('pauseVideo');
    };
    Player.prototype.stopVideo = function () {
      this._cmd('stopVideo');
    };
    Player.prototype.mute = function () {
      this.s.muted = true;
      this._cmd('mute');
    };
    Player.prototype.unMute = function () {
      this.s.muted = false;
      this._cmd('unMute');
    };
    Player.prototype.setVolume = function (n) {
      this.s.vol = Number(n) || 0;
      this._cmd('setVolume', [this.s.vol]);
    };
    Player.prototype.setPlaybackRate = function (r) {
      this._cmd('setPlaybackRate', [Number(r) || 1]);
    };
    Player.prototype.seekTo = function (t, ahead) {
      this.s.t = Number(t) || 0;
      this.s.at = Date.now();
      this._cmd('seekTo', [this.s.t, ahead !== false]);
    };
    function byId(f) {
      return function (a, start) {
        var o =
          a && typeof a === 'object'
            ? { videoId: String(a.videoId || ''), startSeconds: a.startSeconds }
            : { videoId: String(a || ''), startSeconds: start };
        o.startSeconds = Number(o.startSeconds) || 0;
        this.s.id = o.videoId;
        this.s.t = o.startSeconds;
        this.s.at = Date.now();
        this.s.state = -1;
        this._cmd(f, [o]);
      };
    }
    Player.prototype.loadVideoById = byId('loadVideoById');
    Player.prototype.cueVideoById = byId('cueVideoById');
    Player.prototype.addEventListener = function (name, f) {
      this.o.events = this.o.events || {};
      this.o.events[name] = f;
    };
    Player.prototype.removeEventListener = function (name) {
      if (this.o.events) delete this.o.events[name];
    };
    Player.prototype.destroy = function () {
      if (!this.ph) return;
      clearInterval(this.timer);
      send({ kind: 'yt', op: 'end', pid: this.pid });
      if (this.ph.parentNode) this.ph.parentNode.removeChild(this.ph);
      this.ph = null;
      delete players[this.pid];
    };
    var YT = Object.freeze({
      Player: Player,
      PlayerState: Object.freeze(PS),
      loaded: 1,
      ready: function (f) {
        setTimeout(f, 0);
      },
      __ytxApp: true
    });
    // YouTube's own script (iframe_api) must not replace this one
    Object.defineProperty(window, 'YT', { value: YT, enumerable: true });
    var moved = 0;
    function remeasure() {
      if (moved) return;
      moved = requestAnimationFrame(function () {
        moved = 0;
        Object.keys(players).forEach(function (k) {
          players[k]._rect();
        });
      });
    }
    window.addEventListener('scroll', remeasure, true);
    window.addEventListener('resize', remeasure);
    document.addEventListener('visibilitychange', remeasure);
    window.addEventListener('message', function (e) {
      var m = e.data;
      if (e.source !== up || !m || m.n !== N) return;
      if (m.kind === 'yt') {
        var p = players[m.pid];
        if (p) p._got(m);
      } else if (m.kind === 'scan') {
        var w = scans[m.id];
        delete scans[m.id];
        if (w)
          w(
            typeof m.text === 'string'
              ? { text: m.text }
              : { text: null, why: String(m.why || 'cancel') }
          );
      }
    });
    // background-image: url('/api/...') set on an element's style
    var BG = /url\((['"]?)([^'")]+)\1\)/;
    function bg(el) {
      var v = el.style && el.style.backgroundImage;
      var m = v && BG.exec(v);
      if (!m || /^(?:data|blob):/i.test(m[2])) return;
      var p = tvPath(m[2]);
      if (p === null) return;
      el.style.backgroundImage = 'none';
      dataUrl(p).then(function (u) {
        if (u) el.style.backgroundImage = 'url("' + u + '")';
      });
    }
    new MutationObserver(function (list) {
      list.forEach(function (r) {
        if (r.type === 'attributes') bg(r.target);
        else
          Array.prototype.forEach.call(r.addedNodes, function (n) {
            if (n.nodeType !== 1) return;
            bg(n);
            if (n.querySelectorAll)
              Array.prototype.forEach.call(n.querySelectorAll('[style]'), bg);
          });
      });
    }).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['style']
    });
  }
  /* eslint-enable no-var */

  /* ---------------- in the app ---------------- */

  function storeKey(id) {
    return 'sofatube-tvpage:' + String(id || 'tv').slice(0, 64);
  }
  function storeGet(id) {
    try {
      const v = JSON.parse(localStorage.getItem(storeKey(id)) || '{}');
      return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    } catch {
      return {};
    }
  }
  function storePut(id, data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;
    const out = {};
    for (const k of Object.keys(data))
      if (typeof data[k] === 'string') out[String(k)] = data[k];
    const text = JSON.stringify(out);
    if (text.length > STORE_MAX) return;
    try {
      localStorage.setItem(storeKey(id), text);
    } catch {
      /* private mode, full */
    }
  }
  function nonce() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
      b.toString(16).padStart(2, '0')
    ).join('');
  }
  function scopePath() {
    // the app's folder (/remote/), where its old ./tv/ address was
    return new URL('./', location.href).pathname;
  }

  /** The page put together: the script first, then the TV's text. */
  function build(html, cfg) {
    const js =
      '<script>(' +
      shim.toString() +
      ')(' +
      JSON.stringify(cfg).replace(/</g, '\\u003c') +
      ');</script>';
    const page = rewrite(html);
    const head = /<head\b[^>]*>/i.exec(page);
    if (head)
      return (
        page.slice(0, head.index + head[0].length) +
        js +
        page.slice(head.index + head[0].length)
      );
    const doc = /^\s*<!doctype[^>]*>/i.exec(page);
    if (doc) return doc[0] + js + page.slice(doc[0].length);
    return js + page;
  }

  /** A new, sandboxed frame in place of `old` (same id and class). */
  function freshFrame(old) {
    const f = document.createElement('iframe');
    f.id = old.id;
    f.className = old.className;
    f.title = old.title;
    f.setAttribute('sandbox', SANDBOX);
    f.setAttribute('allow', ALLOW);
    f.setAttribute('referrerpolicy', 'no-referrer');
    old.replaceWith(f);
    return f;
  }

  let live = null; // {frame, n, ...}

  /**
   * Shows the TV's page in the frame (id `frameId`):
   *   chan(msg, ms) -> Promise<{code, type, data | b64} | null>: the channel
   *   url: the page's address inside the app, e.g. 'tv/?t=00&app=1#send=…'
   *   id: the TV (its own copy of the page's localStorage)
   * Resolves true when the page came (HTML from the TV), else false.
   */
  async function open(frameId, o) {
    close(frameId);
    const me = {
      n: nonce(),
      chan: o.chan,
      id: o.id,
      url: new URL(o.url, location.href).href,
      tv: tvLink(o.tv),
      frameId,
      yt: {}
    };
    live = me;
    me.onMsg = (e) => onMsg(me, e);
    window.addEventListener('message', me.onMsg);
    return load(me);
  }

  async function load(me) {
    const u = new URL(me.url);
    const tvp = scopePath() + 'tv';
    let p = u.pathname;
    if (p === tvp || p.startsWith(tvp + '/')) p = p.slice(tvp.length) || '/';
    if (p === '/index.html') p = '/';
    const r = await me.chan({ m: 'GET', p: p + u.search }, 45000);
    if (live !== me) return false;
    if (
      !r ||
      r.code !== 200 ||
      !/html/i.test(r.type || '') ||
      typeof r.data !== 'string'
    )
      return false;
    const html = build(r.data, {
      n: me.n,
      origin: location.origin,
      scope: scopePath(),
      url: me.url,
      store: storeGet(me.id),
      tv: me.tv
    });
    const old = document.getElementById(me.frameId);
    if (!old) return false;
    ytAll(me); // a new page: its players go
    scanEnd(null, 'cancel');
    const f = freshFrame(old);
    f.dataset.url = me.url; // the page's address inside the app (tests read it)
    f.srcdoc = html;
    return true;
  }

  async function onMsg(me, e) {
    const f = document.getElementById(me.frameId);
    if (live !== me || !f || e.source !== f.contentWindow) return;
    const d = e.data;
    if (!d || typeof d !== 'object' || d.n !== me.n) return;
    if (d.kind === 'url') {
      if (typeof d.url === 'string' && sameApp(d.url)) me.url = d.url;
      return;
    }
    if (d.kind === 'reload') {
      if (typeof d.url === 'string' && sameApp(d.url)) me.url = d.url;
      load(me);
      return;
    }
    if (d.kind === 'store') {
      storePut(me.id, d.data);
      return;
    }
    if (d.kind === 'yt') return ytMsg(me, f, d);
    if (d.kind === 'scan') return scanAsk(me, f, d);
    if (d.kind !== 'req') return;
    const m = String(d.m || '').toUpperCase();
    if (
      METHODS.indexOf(m) < 0 ||
      typeof d.p !== 'string' ||
      d.p.charAt(0) !== '/' ||
      d.p.length > 4096
    )
      return reply(me, f, { id: d.id, code: 400, data: { error: 'bad' } });
    const msg = { m, p: d.p };
    if (d.b !== undefined) msg.b = d.b;
    if (typeof d.b64 === 'string') {
      msg.b64 = d.b64;
      msg.type = typeof d.type === 'string' ? d.type.slice(0, 200) : '';
    }
    const r = await me.chan(msg, 45000);
    if (live !== me) return;
    const out = { id: d.id };
    if (!r) {
      out.code = 504;
      out.data = { error: 'timeout' };
    } else {
      out.code = r.code;
      out.type = r.type;
      if (r.b64 !== undefined) out.b64 = r.b64;
      else out.data = r.data;
    }
    reply(me, f, out);
  }
  function sameApp(u) {
    try {
      return new URL(u).origin === location.origin;
    } catch {
      return false;
    }
  }
  function reply(me, f, out) {
    out.kind = 'res';
    out.n = me.n;
    // the frame's origin is opaque ("null"): '*' is the only target; only
    // this frame gets it, and only answers to what it asked
    if (f.contentWindow) f.contentWindow.postMessage(out, '*');
  }

  /* ------- YouTube's player for the page, in the app (0.9.6) ------- */
  // YouTube refuses an embed in an opaque origin (error 153), so the page's
  // YT.Player (the shim's stand-in) asks for one here: this window puts
  // YouTube's embed over the stand-in's spot and passes the player's state
  // back. YouTube's own script never runs in this origin: the embed is
  // driven with its postMessage protocol (what iframe_api does).
  const YT_ORIGIN = 'https://www.youtube-nocookie.com';
  const YT_ID = /^[\w-]{11}$/; // = [A-Za-z0-9_-], a YouTube video id
  const YT_MAX = 2;
  const YT_EVENTS = [
    'onReady',
    'onStateChange',
    'onError',
    'onPlaybackRateChange'
  ];
  function num(v, lo, hi) {
    const n = Number(v);
    return typeof v === 'number' && Number.isFinite(n) && n >= lo && n <= hi
      ? n
      : null;
  }
  /** A video to load: {videoId, startSeconds}, or null. */
  function ytVideo(a) {
    if (!a || typeof a !== 'object') return null;
    const id = String(a.videoId || '');
    if (!YT_ID.test(id)) return null;
    return { videoId: id, startSeconds: num(a.startSeconds, 0, 172800) || 0 };
  }
  /** The commands the page's players use, with their arguments checked. */
  function ytArgs(f, a) {
    a = Array.isArray(a) ? a : [];
    switch (f) {
      case 'playVideo':
      case 'pauseVideo':
      case 'stopVideo':
      case 'mute':
      case 'unMute':
        return [];
      case 'seekTo': {
        const t = num(a[0], 0, 172800);
        return t === null ? null : [t, a[1] !== false];
      }
      case 'setVolume': {
        const v = num(a[0], 0, 100);
        return v === null ? null : [Math.round(v)];
      }
      case 'setPlaybackRate': {
        const r = num(a[0], 0.25, 2);
        return r === null ? null : [r];
      }
      case 'loadVideoById':
      case 'cueVideoById': {
        const v = ytVideo(a[0]);
        return v ? [v] : null;
      }
      default:
        return null;
    }
  }
  function ytLayer(me) {
    if (!me.layer) {
      const d = document.createElement('div');
      d.className = 'ytx-yt-layer';
      d.style.cssText =
        'position:fixed;overflow:hidden;pointer-events:none;z-index:60;' +
        'left:0;top:0;width:0;height:0';
      document.body.appendChild(d);
      me.layer = d;
      me.onPlace = () => ytPlace(me);
      window.addEventListener('resize', me.onPlace);
      window.addEventListener('scroll', me.onPlace, true);
    }
    return me.layer;
  }
  /** The layer over the frame, each player over its spot in the page. */
  function ytPlace(me) {
    const f = document.getElementById(me.frameId);
    if (!me.layer || !f) return;
    const r = f.getBoundingClientRect();
    const L = me.layer.style;
    L.left = r.left + 'px';
    L.top = r.top + 'px';
    L.width = r.width + 'px';
    L.height = r.height + 'px';
    for (const k of Object.keys(me.yt)) {
      const p = me.yt[k];
      const s = p.el.style;
      const q = p.rect || { x: 0, y: 0, w: 0, h: 0 };
      s.left = q.x + 'px';
      s.top = q.y + 'px';
      s.width = Math.max(1, q.w) + 'px';
      s.height = Math.max(1, q.h) + 'px';
      // hidden, it keeps playing (sound only, or under the page's picture)
      s.opacity = p.show && p.ready ? '1' : '0';
      s.pointerEvents = p.show && p.taps ? 'auto' : 'none';
    }
  }
  function ytTell(me, f, pid, m) {
    m.kind = 'yt';
    m.n = me.n;
    m.pid = pid;
    if (f.contentWindow) f.contentWindow.postMessage(m, '*');
  }
  function ytPost(p, msg) {
    const w = p.el.contentWindow;
    if (w) w.postMessage(JSON.stringify(msg), YT_ORIGIN);
  }
  function ytSend(p, func, args) {
    if (!p.ready) {
      if (p.queue.length < 50) p.queue.push([func, args]);
      return;
    }
    ytPost(p, { event: 'command', func, args, id: p.pid, channel: 'widget' });
  }
  function ytEnd(me, pid) {
    const p = me.yt[pid];
    if (!p) return;
    delete me.yt[pid];
    clearInterval(p.listen);
    window.removeEventListener('message', p.onMsg);
    p.el.remove();
  }
  function ytAll(me) {
    for (const k of Object.keys(me.yt)) ytEnd(me, k);
    if (me.layer) {
      window.removeEventListener('resize', me.onPlace);
      window.removeEventListener('scroll', me.onPlace, true);
      me.layer.remove();
      me.layer = null;
    }
  }
  function ytInfo(i) {
    const out = {};
    if (!i || typeof i !== 'object') return out;
    if (typeof i.currentTime === 'number') out.currentTime = i.currentTime;
    if (typeof i.playerState === 'number') out.playerState = i.playerState;
    if (typeof i.muted === 'boolean') out.muted = i.muted;
    if (typeof i.volume === 'number') out.volume = i.volume;
    if (typeof i.playbackRate === 'number') out.playbackRate = i.playbackRate;
    if (typeof i.duration === 'number') out.duration = i.duration;
    if (Array.isArray(i.availablePlaybackRates))
      out.rates = i.availablePlaybackRates
        .filter((r) => typeof r === 'number')
        .slice(0, 12);
    const vd = i.videoData;
    if (vd && typeof vd.video_id === 'string' && YT_ID.test(vd.video_id))
      out.id = vd.video_id;
    return out;
  }
  /** What the embed says, for the page (only its player's numbers). */
  function ytHeard(me, f, p, e) {
    if (e.source !== p.el.contentWindow || e.origin !== YT_ORIGIN) return;
    let d = e.data;
    if (typeof d === 'string')
      try {
        d = JSON.parse(d);
      } catch {
        return;
      }
    if (!d || typeof d !== 'object') return;
    if (!p.heard) {
      p.heard = true;
      clearInterval(p.listen);
      for (const ev of YT_EVENTS)
        ytPost(p, {
          event: 'command',
          func: 'addEventListener',
          args: [ev],
          id: p.pid,
          channel: 'widget'
        });
    }
    if (live !== me) return;
    if (d.event === 'onReady' && !p.ready) {
      p.ready = true;
      const q = p.queue;
      p.queue = [];
      for (const c of q) ytSend(p, c[0], c[1]);
      ytPlace(me);
      ytTell(me, f, p.pid, { ev: 'ready' });
    } else if (d.event === 'initialDelivery' || d.event === 'infoDelivery') {
      ytTell(me, f, p.pid, {
        ev: 'info',
        info: ytInfo(d.info),
        at: Date.now()
      });
    } else if (d.event === 'onStateChange' && typeof d.info === 'number') {
      ytTell(me, f, p.pid, { ev: 'state', data: d.info });
    } else if (d.event === 'onError') {
      ytTell(me, f, p.pid, { ev: 'error', data: Number(d.info) || 0 });
    } else if (
      d.event === 'onPlaybackRateChange' &&
      typeof d.info === 'number'
    ) {
      ytTell(me, f, p.pid, { ev: 'rate', data: d.info });
    }
  }
  function ytMake(me, f, d) {
    const pid = d.pid;
    const id = typeof d.v === 'string' ? d.v : '';
    if (!YT_ID.test(id)) {
      // not a YouTube video: no player, the page hears "invalid" (2)
      me.ytRefused = (me.ytRefused || 0) + 1;
      return ytTell(me, f, pid, { ev: 'error', data: 2 });
    }
    const ids = Object.keys(me.yt);
    if (ids.length >= YT_MAX) ytEnd(me, ids[0]);
    const v = d.vars && typeof d.vars === 'object' ? d.vars : {};
    const q = new URLSearchParams({
      enablejsapi: '1',
      origin: location.origin,
      widgetid: String(pid),
      autoplay: v.autoplay === 1 ? '1' : '0',
      mute: v.mute === 1 ? '1' : '0',
      controls: v.controls === 0 ? '0' : '1',
      playsinline: '1',
      rel: '0',
      iv_load_policy: '3',
      disablekb: '1',
      fs: '0',
      start: String(Math.floor(num(d.start, 0, 172800) || 0))
    });
    if (typeof v.hl === 'string' && /^[a-z]{2}(?:-[A-Za-z]{2})?$/.test(v.hl))
      q.set('hl', v.hl);
    const el = document.createElement('iframe');
    el.className = 'ytx-yt';
    el.dataset.video = id;
    el.title = 'YouTube';
    el.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    // YouTube needs to know which site embeds it (error 153 without)
    el.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    el.style.cssText =
      'position:absolute;border:0;left:0;top:0;width:1px;height:1px;' +
      'opacity:0;pointer-events:none';
    const p = {
      pid,
      el,
      ready: false,
      heard: false,
      queue: [],
      rect: null,
      show: false,
      taps: false,
      listen: 0
    };
    p.onMsg = (e) => ytHeard(me, f, p, e);
    window.addEventListener('message', p.onMsg);
    el.addEventListener('load', () => {
      let n = 0;
      clearInterval(p.listen);
      const hello = () => {
        if (p.heard || ++n > 80) return clearInterval(p.listen);
        ytPost(p, { event: 'listening', id: pid, channel: 'widget' });
      };
      p.listen = setInterval(hello, 250);
      hello();
    });
    el.src = YT_ORIGIN + '/embed/' + id + '?' + q.toString();
    me.yt[pid] = p;
    ytLayer(me).appendChild(el);
    ytPlace(me);
  }
  function ytMsg(me, f, d) {
    const pid = d.pid;
    if (!Number.isInteger(pid) || pid < 1 || pid > 1e6) return;
    if (d.op === 'make') {
      if (!me.yt[pid]) ytMake(me, f, d);
      return;
    }
    const p = me.yt[pid];
    if (!p) return;
    if (d.op === 'end') return ytEnd(me, pid);
    if (d.op === 'rect') {
      const x = num(d.x, -1e5, 1e5);
      const y = num(d.y, -1e5, 1e5);
      const w = num(d.w, 0, 1e5);
      const h = num(d.h, 0, 1e5);
      if (x === null || y === null || w === null || h === null) return;
      p.rect = { x, y, w, h };
      p.show = d.show === true;
      p.taps = d.taps === true;
      return ytPlace(me);
    }
    if (d.op === 'cmd') {
      const a = ytArgs(String(d.f || ''), d.a);
      if (a) ytSend(p, d.f, a);
    }
  }

  /* ------------- a QR code for the page, read by the app ------------- */
  // The frame gets no camera. The page asks; this app shows its own camera
  // screen (the phone's owner sees it and can cancel; without a tap just
  // before, the camera starts only on a tap here) and gives the page the
  // code's text only, never pictures.
  const SCAN_MAX = 2048;
  const SCAN_TEXT = {
    en: {
      title: 'Scan a QR code',
      hint: 'Point the camera at the QR code. The TV’s page gets only the text in it.',
      start: 'Start the camera',
      cancel: 'Cancel',
      starting: 'Starting the camera…',
      looking: 'Looking for the QR code…',
      long: 'This QR code holds too much text.'
    },
    ar: {
      title: 'مسح رمز QR',
      hint: 'وجّه الكاميرا نحو رمز QR. لا يصل إلى صفحة التلفاز إلا النص الذي في الرمز.',
      start: 'تشغيل الكاميرا',
      cancel: 'إلغاء',
      starting: 'جارٍ تشغيل الكاميرا…',
      looking: 'جارٍ البحث عن رمز QR…',
      long: 'رمز QR هذا يحمل نصًا طويلًا جدًا.'
    }
  };
  // jsqr.min.js sits next to this file
  const HERE =
    (self.document && document.currentScript && document.currentScript.src) ||
    location.href;
  let scanning = null; // {me, f, id, box, video, stream, timer, gen}
  function scanTr(k) {
    const ar = /^ar/i.test(document.documentElement.lang || '');
    return SCAN_TEXT[ar ? 'ar' : 'en'][k];
  }
  function scanAnswer(s, text, why) {
    const m = { kind: 'scan', n: s.me.n, id: s.id };
    if (typeof text === 'string') m.text = text;
    else m.why = why;
    if (live === s.me && s.f.contentWindow)
      s.f.contentWindow.postMessage(m, '*');
  }
  function scanStop(s) {
    s.gen++;
    clearTimeout(s.timer);
    if (s.stream) for (const t of s.stream.getTracks()) t.stop();
    s.stream = null;
    s.video.srcObject = null;
  }
  /** Ends the scan: text to the page, or why not. */
  function scanEnd(text, why) {
    const s = scanning;
    if (!s) return;
    scanning = null;
    scanStop(s);
    s.box.remove();
    document.removeEventListener('visibilitychange', s.onHide);
    scanAnswer(s, text, why);
  }
  function jsqr() {
    if (self.jsQR) return Promise.resolve(self.jsQR);
    return new Promise((ok) => {
      const sc = document.createElement('script');
      sc.src = new URL('jsqr.min.js', HERE).href;
      sc.onload = () => ok(self.jsQR || null);
      sc.onerror = () => ok(null);
      document.head.appendChild(sc);
    });
  }
  /** -> a reader(video) -> Promise<text | null>, or null. */
  async function scanReader() {
    const BD = self.BarcodeDetector;
    if (BD && !self.ytxQrForceJs)
      try {
        const f = BD.getSupportedFormats
          ? await BD.getSupportedFormats()
          : ['qr_code'];
        if (f.indexOf('qr_code') >= 0) {
          const d = new BD({ formats: ['qr_code'] });
          return (v) =>
            d.detect(v).then(
              (r) => (r && r[0] && r[0].rawValue) || null,
              () => null
            );
        }
      } catch {
        /* jsQR then */
      }
    const J = await jsqr();
    if (!J) return null;
    const cv = document.createElement('canvas');
    const cx = cv.getContext('2d', { willReadFrequently: true });
    let odd = false;
    return (v) => {
      const vw = v.videoWidth;
      const vh = v.videoHeight;
      if (!vw || !vh || !cx) return Promise.resolve(null);
      const k = Math.min(1, 800 / Math.max(vw, vh));
      cv.width = Math.round(vw * k);
      cv.height = Math.round(vh * k);
      try {
        cx.drawImage(v, 0, 0, cv.width, cv.height);
        const img = cx.getImageData(0, 0, cv.width, cv.height);
        odd = !odd;
        const r = J(img.data, cv.width, cv.height, {
          inversionAttempts: odd ? 'dontInvert' : 'onlyInvert'
        });
        return Promise.resolve(r && r.data ? r.data : null);
      } catch {
        return Promise.resolve(null);
      }
    };
  }
  async function scanCamera(s) {
    const gen = ++s.gen;
    s.go.style.display = 'none';
    s.say(scanTr('starting'));
    const md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) return scanEnd(null, 'nocam');
    const read = await scanReader();
    if (gen !== s.gen) return;
    if (!read) return scanEnd(null, 'nodec');
    let stream;
    try {
      stream = await md.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }
      });
    } catch (e) {
      if (gen !== s.gen) return;
      const n = (e && e.name) || '';
      return scanEnd(
        null,
        n === 'NotAllowedError' || n === 'SecurityError' ? 'denied' : 'nocam'
      );
    }
    if (gen !== s.gen || scanning !== s) {
      for (const t of stream.getTracks()) t.stop();
      return;
    }
    s.stream = stream;
    s.video.srcObject = stream;
    const pl = s.video.play();
    if (pl && pl.catch) pl.catch(() => {});
    s.say(scanTr('looking'));
    const tick = async () => {
      if (gen !== s.gen) return;
      if (s.video.readyState < 2) {
        s.timer = setTimeout(tick, 150);
        return;
      }
      const text = await read(s.video);
      if (gen !== s.gen) return;
      if (typeof text === 'string' && text) {
        if (text.length <= SCAN_MAX) return scanEnd(text);
        s.say(scanTr('long'));
      }
      s.timer = setTimeout(tick, 150);
    };
    tick();
  }
  function scanAsk(me, f, d) {
    if (!Number.isInteger(d.id) || d.id < 1) return;
    if (scanning) {
      scanAnswer({ me, f, id: d.id }, null, 'busy');
      return;
    }
    const ar = /^ar/i.test(document.documentElement.lang || '');
    const box = document.createElement('div');
    box.className = 'ytx-scan';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.dir = ar ? 'rtl' : 'ltr';
    box.style.cssText =
      'position:fixed;inset:0;z-index:80;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;gap:12px;padding:16px;' +
      'box-sizing:border-box;background:rgba(10,8,6,.94);color:#fbf4e8;' +
      'font:16px/1.5 system-ui,sans-serif;text-align:center';
    const h = document.createElement('h2');
    h.textContent = scanTr('title');
    h.style.margin = '0';
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    video.style.cssText =
      'width:100%;max-width:480px;aspect-ratio:4/3;object-fit:cover;' +
      'background:#000;border-radius:12px';
    const hint = document.createElement('p');
    hint.textContent = scanTr('hint');
    hint.style.cssText =
      'margin:0;max-width:480px;font-size:14px;opacity:.85;' +
      (ar ? 'line-height:1.7' : '');
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.style.margin = '0';
    const btn = (text, cls) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      b.textContent = text;
      b.style.cssText =
        'font:inherit;padding:10px 18px;border-radius:10px;min-height:44px;' +
        'border:1px solid rgba(251,244,232,.4);background:transparent;' +
        'color:inherit';
      return b;
    };
    const go = btn(scanTr('start'), 'ytx-scan-go');
    const no = btn(scanTr('cancel'), 'ytx-scan-cancel');
    const row = document.createElement('div');
    row.style.cssText =
      'display:flex;gap:10px;flex-wrap:wrap;justify-content:center';
    row.append(go, no);
    box.append(h, video, hint, status, row);
    document.body.appendChild(box);
    const s = {
      me,
      f,
      id: d.id,
      box,
      video,
      go,
      stream: null,
      timer: 0,
      gen: 0,
      say: (t) => {
        status.textContent = t || '';
      }
    };
    scanning = s;
    s.onHide = () => {
      if (document.hidden) scanEnd(null, 'cancel');
    };
    document.addEventListener('visibilitychange', s.onHide);
    no.addEventListener('click', () => scanEnd(null, 'cancel'));
    go.addEventListener('click', () => scanCamera(s));
    // a tap just before (in the page: Chromium passes it up to this window)
    // starts the camera at once; otherwise only a tap on this screen does
    const ua = navigator.userActivation;
    if (ua && ua.isActive) scanCamera(s);
    else go.focus();
  }

  /** The TV's own page (http(s) on a private IPv4 address), or ''. */
  function tvLink(u) {
    if (typeof u !== 'string' || u.length > 300) return '';
    let x;
    try {
      x = new URL(u);
    } catch {
      return '';
    }
    if (!/^https?:$/.test(x.protocol) || x.username || x.password) return '';
    const m = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(x.hostname);
    if (!m) return '';
    const a = Number(m[1]);
    const b = Number(m[2]);
    const lan =
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254);
    return lan ? x.href : '';
  }

  /** A message for the page itself (e.g. {ytxRelay}). */
  function post(frameId, data) {
    const f = document.getElementById(frameId);
    if (live && f && f.contentWindow) f.contentWindow.postMessage(data, '*');
  }

  /** Empties the frame and ends its requests. */
  function close(frameId) {
    const me = live;
    live = null;
    if (me) {
      window.removeEventListener('message', me.onMsg);
      ytAll(me);
    }
    scanEnd(null, 'cancel');
    const f = document.getElementById(frameId);
    if (f) freshFrame(f).src = 'about:blank';
  }

  self.sofaTvFrame = { open, close, post, rewrite, SANDBOX, YT_ORIGIN };
})();
