/*
 * Sofa Tube remote app, at home (0.9.6): the TV's whole phone page inside
 * this app, so the phone never opens the TV's own address (no browser bar,
 * no certificate to install, and a new address of the TV changes nothing).
 *
 *   - Joining (Find my TV, then OK on the TV) gives this phone a home key:
 *     the code both screens show is made from both sides' P-256 keys (the
 *     phone commits to its key first, so someone on the Wi-Fi in the middle
 *     would have to guess the code), and their ECDH is this phone's home
 *     key with that TV (two AES-GCM keys that can't be exported, kept in
 *     this app's IndexedDB 'sofatube-home'). The TV's link comes sealed.
 *   - Opening the TV: this phone's WebRTC offer goes to the TV over the home
 *     Wi-Fi (plain http POST /home), sealed with the home key, and the
 *     TV's answer comes back sealed: nobody on the Wi-Fi can read them or
 *     change the certificate fingerprints in them, so the data channel
 *     (DTLS) is end to end between this phone and the TV. The TV's page
 *     then runs inside the app in a sandboxed frame (tv-frame.js: an
 *     opaque origin, so nothing in it can reach this app's keys, files or
 *     storage); its requests come here by postMessage and go over the
 *     channel, as this phone (a remembered parent phone on the TV; no away
 *     PIN at home).
 *   - A home key is kept only after the phone's owner confirmed that the
 *     TV's screen shows the same code (index.html): a device on the Wi-Fi
 *     that only answers like Sofa Tube can't show a code on the real TV.
 *   - No channel (an old TV, a browser without local network access, a
 *     network that blocks it): the caller opens the TV's address as before.
 *
 * Same envelopes as Control from away (away-crypto.js; the TV side is
 * service.js homeApi / YtxPhoneServer.java). Server side: nothing.
 */
(function () {
  'use strict';
  const C = self.sofaAwayCrypto;
  const enc = new TextEncoder();
  const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const TOPIC = 'home';

  /** Can this browser join with a home key (WebCrypto, IndexedDB)? */
  function supported() {
    return !!(C && self.crypto && crypto.subtle && self.indexedDB);
  }
  /** ...and show the TV's page inside (WebRTC, the service worker)? */
  function canShow() {
    return (
      supported() &&
      'RTCPeerConnection' in self &&
      !!self.sofaTvFrame &&
      'srcdoc' in document.createElement('iframe')
    );
  }

  /* ---------------- storage ---------------- */

  function db() {
    return new Promise((ok, bad) => {
      const r = indexedDB.open('sofatube-home', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => bad(r.error);
    });
  }
  /** [{tvId, phoneId, p2t, t2p, outN, inN, a, at}] (CryptoKeys inside) */
  async function list() {
    try {
      const d = await db();
      return await new Promise((ok) => {
        const q = d.transaction('kv').objectStore('kv').get('tvs');
        q.onsuccess = () => ok(Array.isArray(q.result) ? q.result : []);
        q.onerror = () => ok([]);
      });
    } catch {
      return [];
    }
  }
  async function keep(tvs) {
    try {
      const d = await db();
      await new Promise((ok) => {
        const tx = d.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(tvs.slice(0, 6), 'tvs');
        tx.oncomplete = () => ok();
        tx.onerror = () => ok();
      });
    } catch {
      /* private mode: no home key, the TV's address opens */
    }
  }
  async function update(rec) {
    const tvs = (await list()).filter((x) => x.tvId !== rec.tvId);
    tvs.unshift(rec);
    await keep(tvs);
  }
  async function drop(tvId) {
    await keep((await list()).filter((x) => x.tvId !== tvId));
  }

  /* ---------------- the TV over the Wi-Fi ---------------- */

  async function lan(a, path, body, ms) {
    // inside the Sofa Tube app: the app reaches the TV (app-bridge.js)
    if (self.sofaApp && (await self.sofaApp.ready()))
      return self.sofaApp.lan(
        a,
        body === undefined ? 'GET' : 'POST',
        path,
        body,
        ms
      );
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms || 8000);
    try {
      const r = await fetch('http://' + a + path, {
        method: body === undefined ? 'GET' : 'POST',
        // text/plain: a simple request (the TV reads it as it is)
        headers:
          body === undefined ? undefined : { 'Content-Type': 'text/plain' },
        body:
          body === undefined
            ? undefined
            : typeof body === 'string'
              ? body
              : JSON.stringify(body),
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        targetAddressSpace: 'local',
        signal: ctl.signal
      });
      const text = await r.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
      return { code: r.status, data, text };
    } catch {
      return { code: 0, data: null, text: '' };
    } finally {
      clearTimeout(timer);
    }
  }

  async function sha(...parts) {
    let n = 0;
    for (const p of parts) n += p.length;
    const all = new Uint8Array(n);
    let at = 0;
    for (const p of parts) {
      all.set(p, at);
      at += p.length;
    }
    return new Uint8Array(await crypto.subtle.digest('SHA-256', all));
  }

  /* ---------------- joining (OK on the TV) ---------------- */

  /**
   * Asks the TV at "ip:port" to join. {code: 200, w, show, ctx} where show
   * is the code both screens show; else {code, error} as the TV answered.
   */
  async function joinStart(a, name) {
    const keys = await C.newKeys();
    const pn = crypto.getRandomValues(new Uint8Array(16));
    const c = await sha(enc.encode('sofatube-join v2 commit|'), keys.pub, pn);
    const r = await lan(a, '/join', { name, v: 2, c: C.b64u(c) });
    const d = r.data || {};
    if (r.code !== 200 || !d.w)
      return { code: r.code || 0, error: d.error || '' };
    const tk = C.unb64u(d.k || '');
    const tn = C.unb64u(d.n || '');
    if (tk.length !== 65 || tn.length !== 16 || !/^[\w-]{8,43}$/.test(d.tv))
      return { code: 0, error: 'old' };
    const opened = await lan(a, '/join?w=' + encodeURIComponent(d.w), {
      k: C.b64u(keys.pub),
      n: C.b64u(pn)
    });
    if (opened.code !== 200) return { code: opened.code || 0, error: 'bad' };
    const h = await sha(
      enc.encode('sofatube-join v2 code|'),
      keys.pub,
      tk,
      pn,
      tn
    );
    let show = '';
    for (let i = 0; i < 4; i++) show += ABC[h[i] & 31];
    return { code: 200, w: d.w, show, ctx: { keys, tk, tvId: d.tv } };
  }

  /**
   * The TV said OK ({state: 'ok', ph, box}): this phone's home key is kept;
   * returns {url, home} (the TV's phone link, from the sealed box) or null.
   */
  async function joinDone(ctx, a, d) {
    if (!d || !/^[\w-]{8,43}$/.test(d.ph || '')) return null;
    let lk;
    try {
      lk = await C.linkKeys(ctx.keys.priv, ctx.tk, ctx.tvId, d.ph);
    } catch {
      return null;
    }
    const env = C.peek(d.box);
    if (!env || env.f !== ctx.tvId) return null;
    const msg = await C.open(lk.t2p, ctx.tvId, 'join', env);
    if (!msg || typeof msg.url !== 'string') return null;
    if (msg.home)
      await update({
        tvId: ctx.tvId,
        phoneId: d.ph,
        p2t: lk.p2t,
        t2p: lk.t2p,
        outN: 0,
        inN: msg.n,
        a,
        at: Date.now()
      });
    return { url: msg.url, home: !!msg.home, full: msg.full === true };
  }

  /* ---------------- the channel ---------------- */

  let rtc = null; // {pc, dc, waiting, n, a, tvId}
  let onLost = null;

  // (a big request goes in pieces: dc-pieces.js)
  function chan(msg, ms) {
    return self.sofaDcPieces.ask(rtc, msg, ms);
  }

  /** Sends the offer sealed to one TV; its answer (SDP), or an error. */
  async function signal(rec, a, sdp) {
    const now = Date.now();
    rec.outN = C.nextCounter(rec.outN, now);
    await update(rec);
    const env = await C.seal(
      rec.p2t,
      rec.tvId,
      rec.phoneId,
      TOPIC,
      { op: 'rtc', offer: sdp },
      now,
      rec.outN
    );
    const r = await lan(a, '/home', env, 20000);
    if (r.code !== 200) return { error: (r.data && r.data.error) || 'net' };
    const back = C.peek(r.text);
    if (!back || back.f !== rec.tvId) return { error: 'bad' };
    const msg = await C.open(rec.t2p, rec.tvId, TOPIC, back);
    if (!msg || msg.op !== 're' || msg.id !== rec.outN) return { error: 'bad' };
    if (C.check(msg, rec.inN, Date.now())) return { error: 'bad' };
    rec.inN = msg.n;
    await update(rec);
    if (!msg.ok || typeof msg.answer !== 'string')
      return { error: msg.error || 'no' };
    return { answer: msg.answer };
  }

  /** Does this phone have a home key with some TV? */
  async function has() {
    return canShow() && (await list()).length > 0;
  }

  /**
   * Opens the channel to the TV at "ip:port" with this phone's home key
   * (the TV it was last at first). true when open.
   */
  async function connect(a) {
    if (rtc && rtc.dc.readyState === 'open' && rtc.a === a) return true;
    close();
    if (!canShow()) return false;
    const tvs = (await list()).sort((x, y) => (y.a === a) - (x.a === a));
    for (const rec of tvs) {
      // eslint-disable-next-line no-await-in-loop
      let r = await tryOne(rec, a);
      if (r === 'starting') {
        // the TV restarted and its page has not given its list yet
        // eslint-disable-next-line no-await-in-loop
        await new Promise((ok) => setTimeout(ok, 3000));
        // eslint-disable-next-line no-await-in-loop
        r = await tryOne(rec, a);
      }
      if (r === true) return true;
      // eslint-disable-next-line no-await-in-loop
      if (r === 'unknown') await drop(rec.tvId); // forgotten on the TV
      // the TV doesn't answer, or Sofa Tube is not running on it: no use
      // trying another key
      if (r === 'net' || r === 'tv') return false;
    }
    return false;
  }

  async function tryOne(rec, a) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    const dc = pc.createDataChannel('ytx');
    let why = 'no';
    try {
      await pc.setLocalDescription(await pc.createOffer());
      await new Promise((ok) => {
        if (pc.iceGatheringState === 'complete') return ok();
        pc.onicegatheringstatechange = () =>
          pc.iceGatheringState === 'complete' && ok();
        setTimeout(ok, 2500);
      });
      // only what the TV needs: the offer without the phone's mDNS names
      // (the TV answers the checks this phone sends to its own addresses)
      const sdp = pc.localDescription.sdp
        .split('\r\n')
        .filter((l) => !/^a=candidate:.* [0-9a-f-]+\.local /.test(l))
        .join('\r\n');
      const r = await signal(rec, a, sdp);
      if (!r.answer) {
        why =
          ['unknown', 'net', 'starting', 'tv'].indexOf(r.error) >= 0
            ? r.error
            : 'no';
        throw new Error(why);
      }
      await pc.setRemoteDescription({ type: 'answer', sdp: r.answer });
      const open = await new Promise((ok) => {
        if (dc.readyState === 'open') return ok(true);
        dc.onopen = () => ok(true);
        setTimeout(() => ok(false), 15000);
      });
      if (!open) throw new Error('no route');
    } catch {
      pc.close();
      return why;
    }
    if (rec.a !== a) {
      rec.a = a; // the TV's address now (it changed)
      await update(rec);
    }
    const me = { pc, dc, waiting: {}, n: 1, a, tvId: rec.tvId };
    dc.onmessage = (e) => {
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      const w = me.waiting[m.id];
      delete me.waiting[m.id];
      if (w) w(m);
    };
    const gone = () => {
      if (rtc !== me) return;
      rtc = null;
      clearTimeout(me.dropT);
      pc.close();
      if (onLost) onLost();
    };
    dc.onclose = gone;
    // a dead path (consent, RFC 7675: no answers to the browser's checks):
    // "disconnected" for 6 s or "failed" is lost too; the app looks again
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (s === 'failed') return gone();
      if (s === 'disconnected') {
        if (!me.dropT) me.dropT = setTimeout(gone, 6000);
      } else {
        clearTimeout(me.dropT);
        me.dropT = 0;
      }
    };
    rtc = me;
    return true;
  }

  function close() {
    const me = rtc;
    rtc = null;
    if (me) me.pc.close();
  }

  /** The TV the channel is open to (its id), or ''. */
  function current() {
    return rtc && rtc.dc.readyState === 'open' ? rtc.tvId : '';
  }

  self.sofaHome = {
    supported,
    canShow,
    has,
    joinStart,
    joinDone,
    connect,
    close,
    current,
    // one request of the TV's page over the channel (tv-frame.js)
    request: chan,
    set onLost(f) {
      onLost = f;
    }
  };
})();
