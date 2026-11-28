/*
 * A video straight to the TV on the home Wi-Fi, inside the Sofa Tube app
 * (0.9.7, n-directup): the TV's own data channel moves ~0.3 MB/s on the TCL
 * (its SCTP and DTLS in the TV's Java), plain TCP on the same Wi-Fi 6.8 MB/s.
 *
 * The TV's page offers a video "sent while it plays" as before (over the
 * channel: small). Then, instead of answering the TV's asks for parts over
 * the channel, it asks here (`window.__ytxServe` in the frame); this asks the
 * app (WebActivity, Serve.java) to answer them itself, from the file the
 * person picked in Android's picker, over the TV's https port with this
 * phone's token and the TV's certificate pinned (the sealed home answer, op "token": home.js ask). The TV checks the phone as for any request; no
 * new way in. Not at home (away.js), not in the app, an LG or Samsung TV (no
 * op "token") or any failure: the page sends over the channel as before.
 *
 * Plugged into tv-voice.js like tv-more.js (the app's port, its answers).
 */
(function () {
  'use strict';

  /* --------- inside the frame (stringified; tv-voice.js puts it in) --------- */
  /* eslint-disable no-var */
  function shim(cfg) {
    var N = cfg.n;
    var up = window.parent;
    var waits = {};
    var next = 1;
    function send(m) {
      m.n = N;
      up.postMessage(m, cfg.origin);
    }
    var lost = {}; // live id -> the page's way on (the channel)
    window.addEventListener('message', function (e) {
      var m = e.data;
      if (e.source !== up || !m || m.n !== N) return;
      if (m.kind === 'served-end') {
        var l = lost[m.live];
        delete lost[m.live];
        if (l) l();
        return;
      }
      if (m.kind !== 'served') return;
      var w = waits[m.id];
      delete waits[m.id];
      if (w) w(m.ok === true);
    });
    /**
     * live: the TV's id of the file; true when the app sends it. onLost: the
     * app stopped half way (the page sends the rest itself).
     */
    window.__ytxServe = function (live, file, onLost) {
      if (typeof onLost === 'function') lost[String(live)] = onLost;
      return new Promise(function (ok) {
        var id = next++;
        waits[id] = ok;
        send({
          kind: 'serve',
          id: id,
          live: String(live),
          name: String((file && file.name) || ''),
          size: Number((file && file.size) || 0)
        });
        setTimeout(function () {
          if (!waits[id]) return;
          delete waits[id];
          ok(false);
        }, 20000);
      });
    };
    window.__ytxServeStop = function (live) {
      delete lost[String(live)];
      send({ kind: 'serve-stop', live: String(live) });
    };
  }
  /* eslint-enable no-var */
  self.sofaTvDirectShim = shim;
})();

(function () {
  'use strict';
  const shim = self.sofaTvDirectShim;

  /** The app's side of it; api from tv-voice.js. */
  function make(api) {
    const serving = {}; // live id -> the app's request id
    // the app's handles of the videos picked lately in a Video box (the app
    // sends only these): {h, name, size, at}
    let picks = [];
    const PICK_MS = 10 * 60 * 1000;
    function picked(list) {
      const now = Date.now();
      picks = picks.filter((x) => now - x.at < PICK_MS);
      (Array.isArray(list) ? list : []).forEach((x) => {
        if (x && /^[0-9a-f]{32}$/.test(x.h) && typeof x.name === 'string')
          picks.push({ h: x.h, name: x.name, size: Number(x.size), at: now });
      });
      picks = picks.slice(-50);
    }
    /** The handle of the file the frame names (its name and size), or ''. */
    function handle(name, size) {
      const now = Date.now();
      const p = picks
        .filter(
          (x) => now - x.at < PICK_MS && x.name === name && x.size === size
        )
        .pop();
      return p ? p.h : '';
    }

    function answer(f, n, id, ok) {
      if (f.contentWindow)
        f.contentWindow.postMessage({ kind: 'served', n, id, ok }, '*');
    }

    /*
     * This phone's token, the TV's https port and the SHA-256 of its
     * certificate: the sealed home answer to op "token" (Android TVs; home.js
     * ask). null: none (an LG or Samsung TV, an older TV, no channel).
     */
    async function direct() {
      const m = await self.sofaHome.ask('token').catch(() => null);
      if (!m || !m.ok || !/^[0-9a-f]{8,64}$/.test(String(m.p || '')))
        return null;
      if (typeof m.ca !== 'string' || !(m.port > 0 && m.port < 65536))
        return null;
      return { ip: String(m.a).split(':')[0], port: m.port, p: m.p, ca: m.ca };
    }

    async function serve(me, f, d, live) {
      const port = api.port();
      const ok =
        port &&
        api.ups() &&
        /^[0-9a-f]{16,64}$/.test(d.live) &&
        typeof d.name === 'string' &&
        d.size > 0 &&
        handle(d.name, d.size) &&
        self.sofaHome &&
        self.sofaHome.ask;
      const to = ok ? await direct() : null;
      if (!to || !live()) return answer(f, me.n, d.id, false);
      const id = api.id();
      api.ev[id] = (a) => {
        if (a.ev === 'started') answer(f, me.n, d.id, true);
        if (a.ev === 'end') {
          if (serving[d.live] === id) delete serving[d.live];
          delete api.ev[id];
          if (!a.started) answer(f, me.n, d.id, false);
          // stopped half way (the Wi-Fi, the file): the page goes on itself
          else if (a.why !== 'gone' && a.why !== 'stopped' && f.contentWindow)
            f.contentWindow.postMessage(
              { kind: 'served-end', n: me.n, live: d.live },
              '*'
            );
        }
      };
      serving[d.live] = id;
      port.postMessage(
        JSON.stringify({
          do: 'serve',
          id,
          live: d.live,
          h: handle(d.name, d.size),
          ip: to.ip,
          port: to.port,
          p: to.p,
          ca: to.ca
        })
      );
    }

    /** A message from the frame: true when it was one of these. */
    function msg(me, f, d, live) {
      if (d.kind === 'serve') serve(me, f, d, live);
      else if (d.kind === 'serve-stop') {
        const id = serving[d.live];
        const port = api.port();
        if (id && port)
          port.postMessage(JSON.stringify({ do: 'serve-stop', id }));
      } else return false;
      return true;
    }
    return { shim, msg, picked };
  }

  self.sofaTvDirect = make;
})();
