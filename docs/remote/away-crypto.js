/*
 * Sofa Tube "Control from away" (0.9.5, L41): the phone's side of the
 * end-to-end encrypted mailbox. Same protocol as the TV's
 * platform/webos/phone/service/away-core.js (and YtxAwayCore.java); the
 * shared vectors in tools/phone/away-vectors.json check all three
 * (tools/phone/away-test.mjs runs this file in Node's WebCrypto).
 *
 * The phone's P-256 key and the keys made from it are WebCrypto keys that
 * can't be exported (extractable: false); they live in this app's
 * IndexedDB (away.js). Nothing here touches the network.
 */
/* global module */
(function (root) {
  'use strict';
  const subtle = root.crypto.subtle;
  const VERSION = 1;
  const SKEW_MS = 10 * 60 * 1000;
  const PAD_SIZES = [256, 1024, 2880];
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function b64u(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64u(s) {
    s = String(s || '')
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function cat(...parts) {
    let n = 0;
    for (const p of parts) n += p.length;
    const out = new Uint8Array(n);
    let at = 0;
    parts.forEach((p) => {
      out.set(p, at);
      at += p.length;
    });
    return out;
  }

  /** A new P-256 key pair; the private half can't be exported. */
  async function newKeys() {
    const kp = await subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveBits']
    );
    const pub = new Uint8Array(await subtle.exportKey('raw', kp.publicKey));
    return { priv: kp.privateKey, pub };
  }

  /** Test vectors only: a key pair from its raw parts (JWK). */
  async function importKeys(priv, pub) {
    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      d: b64u(priv),
      x: b64u(pub.slice(1, 33)),
      y: b64u(pub.slice(33, 65)),
      ext: false
    };
    const key = await subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveBits']
    );
    return { priv: key, pub };
  }

  async function ecdh(priv, peerPub) {
    if (peerPub.length !== 65 || peerPub[0] !== 4) throw new Error('bad key');
    const pk = await subtle.importKey(
      'raw',
      peerPub,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );
    return new Uint8Array(
      await subtle.deriveBits({ name: 'ECDH', public: pk }, priv, 256)
    );
  }

  /** HKDF-SHA256 straight to a non-extractable AES-GCM key. */
  async function hkdfKey(salt, ikm, info) {
    const base = await subtle.importKey('raw', ikm, 'HKDF', false, [
      'deriveKey'
    ]);
    return subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode(info) },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /** {p2t, t2p}: this phone's two keys with one TV. */
  async function linkKeys(priv, tvPub, tvId, phoneId) {
    const shared = await ecdh(priv, tvPub);
    const salt = enc.encode(tvId);
    return {
      p2t: await hkdfKey(salt, shared, 'sofatube-away v1 p2t|' + phoneId),
      t2p: await hkdfKey(salt, shared, 'sofatube-away v1 t2p|' + phoneId)
    };
  }

  function pairKey(secret, tvId) {
    return hkdfKey(enc.encode(tvId), secret, 'sofatube-away v1 pair');
  }

  function padText(text) {
    const b = enc.encode(text);
    const size = PAD_SIZES.find((s) => b.length + 4 <= s);
    if (!size) throw new Error('too big');
    const out = new Uint8Array(size);
    new DataView(out.buffer).setUint32(0, b.length);
    out.set(b, 4);
    return out;
  }
  function unpadText(b) {
    if (PAD_SIZES.indexOf(b.length) < 0) throw new Error('size');
    const n = new DataView(b.buffer, b.byteOffset).getUint32(0);
    if (n > b.length - 4) throw new Error('size');
    return dec.decode(b.slice(4, 4 + n));
  }

  function aad(tvId, from, topic) {
    return enc.encode(tvId + '|' + from + '|' + topic);
  }

  async function sealText(key, tvId, from, topic, text, iv, extra) {
    iv = iv || root.crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(
      await subtle.encrypt(
        { name: 'AES-GCM', iv, additionalData: aad(tvId, from, topic) },
        key,
        padText(text)
      )
    );
    return JSON.stringify(
      Object.assign({ v: VERSION, f: from, c: b64u(cat(iv, ct)) }, extra || {})
    );
  }

  function seal(key, tvId, from, topic, msg, t, n, iv, extra) {
    const body = Object.assign({}, msg, { t, n });
    return sealText(key, tvId, from, topic, JSON.stringify(body), iv, extra);
  }

  function peek(text) {
    let env;
    try {
      env = JSON.parse(String(text));
    } catch {
      return null;
    }
    if (!env || env.v !== VERSION || typeof env.c !== 'string') return null;
    if (typeof env.f !== 'string' || !/^[\w-]{8,43}$/.test(env.f)) return null;
    return env;
  }

  async function open(key, tvId, topic, env) {
    try {
      const raw = unb64u(env.c);
      if (raw.length < 12 + 16 + PAD_SIZES[0]) return null;
      const plain = new Uint8Array(
        await subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: raw.slice(0, 12),
            additionalData: aad(tvId, env.f, topic)
          },
          key,
          raw.slice(12)
        )
      );
      const msg = JSON.parse(unpadText(plain));
      if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return null;
      if (typeof msg.t !== 'number' || typeof msg.n !== 'number') return null;
      return msg;
    } catch {
      return null;
    }
  }

  function check(msg, last, now) {
    if (!(msg.n > (last || 0))) return 'replay';
    if (Math.abs(now - msg.t) > SKEW_MS) return 'old';
    return '';
  }

  function nextCounter(last, now) {
    return Math.max((last || 0) + 1, now);
  }

  async function wordIndexes(tvPub, phonePub, secret) {
    const h = new Uint8Array(
      await subtle.digest(
        'SHA-256',
        cat(enc.encode('sofatube-away v1 words'), tvPub, phonePub, secret)
      )
    );
    const v = (h[0] << 16) | (h[1] << 8) | h[2];
    return [(v >> 18) & 63, (v >> 12) & 63, (v >> 6) & 63, v & 63];
  }

  /** The offer from the TV's QR link (#away=...), checked; or null. */
  function readOffer(link) {
    const m = /[#&]away=([\w-]{40,2000})/.exec(String(link || ''));
    if (!m) return null;
    let o;
    try {
      o = JSON.parse(dec.decode(unb64u(m[1])));
    } catch {
      return null;
    }
    const id = /^[\w-]{8,43}$/;
    const topic = /^[\w-]{16,64}$/;
    if (!o || o.v !== VERSION || !id.test(o.t)) return null;
    if (!topic.test(o.i) || !topic.test(o.o)) return null;
    if (!/^https?:\/\/[^\s/#?]+\/?$/.test(o.r || '')) return null;
    const k = unb64u(o.k);
    const w = unb64u(o.w);
    const s = unb64u(o.s);
    if (k.length !== 65 || w.length !== 65 || s.length !== 16) return null;
    return {
      tvId: o.t,
      tvPub: k,
      vapidPub: w,
      relay: o.r.replace(/\/$/, ''),
      inbox: o.i,
      outbox: o.o,
      secret: s,
      role: o.ro === 'helper' ? 'helper' : 'parent',
      name: String(o.nm || '').slice(0, 40)
    };
  }

  const api = {
    VERSION,
    SKEW_MS,
    PAD_SIZES,
    b64u,
    unb64u,
    newKeys,
    importKeys,
    ecdh,
    linkKeys,
    pairKey,
    padText,
    unpadText,
    seal,
    sealText,
    peek,
    open,
    check,
    nextCounter,
    wordIndexes,
    readOffer
  };
  root.sofaAwayCrypto = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
