/*
 * Sofa Tube remote help (0.9.5 items 42-49), the peer-to-peer part.
 * GPL-3.0-only. docs/steps/helper-095.md has the design and its research.
 *
 * One file for both ends, so they never drift apart:
 *   - the relative's phone page (phone.html, its copy between the
 *     help-core markers; tools/site-help/sync.mjs copies it, and
 *     tools/tests/help-core-test.mjs fails when the copies differ);
 *   - the helper's page: the same phone page in "I'm helping" mode (#help),
 *     or tools/site-help/index.html as a static page (sofatube.github.io/help
 *     at a release).
 *
 * How it connects (no server of ours):
 *   1. The relative's page makes a WebRTC offer for one data channel and
 *      squeezes it into a short code (about 150 characters: ICE ufrag and
 *      pwd, the DTLS sha-256 fingerprint, the setup role, up to 4
 *      candidates, a one-time secret and the minute it was made). It goes to
 *      the helper over WhatsApp or the share sheet.
 *   2. The helper's page rebuilds the SDP from a template, answers, and
 *      sends its own code back the same way; the relative pastes it into
 *      the same open page. Codes are single use and expire after 10 minutes.
 *   3. The helper's first message proves the secret (HMAC-SHA256), and both
 *      screens show the same 4 pictures made from both fingerprints (a short
 *      authentication string): a swapped code shows other pictures.
 *   4. Only then the relative's page asks its TV (/api/helpstart): the TV
 *      asks the person in front of it, with the remote. The page relays the
 *      helper's commands with a helper token of its own; the TV and the phone
 *      service allow only the helper commands in the scopes allowed on the
 *      TV (phone-roles.js HELPER_CMDS).
 *
 * Plain browser script (ES2017, no modules) that defines window.SofaHelp;
 * in Node (tests) it exports the pure parts.
 */
(function (root) {
  'use strict';

  /* ================================================================
   * Pure parts: codes, SDP, pictures, proof (tested in Node)
   * ================================================================ */

  var VERSION = 1;
  var CODE_TAG = 'ST1.';
  var CODE_MS = 10 * 60 * 1000; // a code is good this long
  var SETUPS = ['actpass', 'active', 'passive'];
  var TYPES = ['host', 'srflx', 'relay', 'prflx'];
  var MAX_CANDS = 4;
  // control characters and markup, never in a name or a text sent on
  // eslint-disable-next-line no-control-regex -- that is the point
  var JUNK = /[\u0000-\u001f\u007f<>]/g;

  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function b64enc(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 3) {
      var n =
        (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
      s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
      if (i + 1 < bytes.length) s += B64[(n >> 6) & 63];
      if (i + 2 < bytes.length) s += B64[n & 63];
    }
    return s;
  }
  function b64dec(s) {
    var out = [];
    var bits = 0;
    var acc = 0;
    for (var i = 0; i < s.length; i++) {
      var v = B64.indexOf(s[i]);
      if (v < 0) throw new Error('bad code');
      acc = (acc << 6) | v;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        out.push((acc >> bits) & 255);
      }
    }
    return new Uint8Array(out);
  }

  function hexToBytes(hex) {
    var h = String(hex).replace(/[^0-9a-f]/gi, '');
    var out = new Uint8Array(h.length / 2);
    for (var i = 0; i < out.length; i++)
      out[i] = parseInt(h.substr(i * 2, 2), 16);
    return out;
  }
  function bytesToFp(b) {
    var p = [];
    for (var i = 0; i < b.length; i++)
      p.push((b[i] < 16 ? '0' : '') + b[i].toString(16).toUpperCase());
    return p.join(':');
  }

  /** The parts of an SDP (and its candidates) a code carries. */
  function parseSdp(sdp, extra) {
    var o = { ufrag: '', pwd: '', fp: '', setup: '', cands: [] };
    var lines = String(sdp)
      .split(/\r?\n/)
      .concat(extra || []);
    lines.forEach(function (l) {
      var m;
      if ((m = /^a=ice-ufrag:(\S+)/.exec(l))) o.ufrag = o.ufrag || m[1];
      else if ((m = /^a=ice-pwd:(\S+)/.exec(l))) o.pwd = o.pwd || m[1];
      else if ((m = /^a=fingerprint:sha-256 (\S+)/i.exec(l)))
        o.fp = o.fp || m[1];
      else if ((m = /^a=setup:(\S+)/.exec(l))) o.setup = o.setup || m[1];
      else if ((m = /^(?:a=)?candidate:(.+)$/.exec(l))) {
        var c = parseCand(m[1]);
        if (c) o.cands.push(c);
      }
    });
    return o;
  }

  /** "842163049 1 udp 1677729535 1.2.3.4 5000 typ srflx …" -> {type, addr, port}. */
  function parseCand(s) {
    var f = String(s).trim().split(/\s+/);
    if (f.length < 8 || f[1] !== '1' || f[2].toLowerCase() !== 'udp')
      return null;
    if (f[6] !== 'typ' || TYPES.indexOf(f[7]) < 0) return null;
    var port = Number(f[5]);
    if (!(port > 0 && port < 65536)) return null;
    var addr = f[4];
    var kind = addrKind(addr);
    if (kind < 0) return null;
    return { type: f[7], addr: addr, port: port, kind: kind };
  }

  var MDNS =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.local$/i;
  /** 0 IPv4, 1 IPv6, 2 an mDNS name (a UUID .local), -1 none of these. */
  function addrKind(a) {
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(a)) return 0;
    if (MDNS.test(a)) return 2;
    if (/^[0-9a-f:]+$/i.test(a) && a.indexOf(':') >= 0) return 1;
    return -1;
  }

  function ipv6Bytes(a) {
    var parts = a.split('::');
    var head = parts[0] ? parts[0].split(':') : [];
    var tail = parts.length > 1 && parts[1] ? parts[1].split(':') : [];
    var fill = 8 - head.length - tail.length;
    var all = head.concat(new Array(Math.max(0, fill)).fill('0'), tail);
    var out = [];
    all.slice(0, 8).forEach(function (g) {
      var n = parseInt(g || '0', 16);
      out.push((n >> 8) & 255, n & 255);
    });
    return out;
  }
  function ipv6Text(b) {
    var g = [];
    for (var i = 0; i < 16; i += 2)
      g.push(((b[i] << 8) | b[i + 1]).toString(16));
    return g.join(':');
  }

  /**
   * The candidates worth sending, best first: server-reflexive (another
   * network), relay (a TURN server), then this network's own (IPv4, mDNS,
   * IPv6). At most MAX_CANDS, no two alike.
   */
  function pickCands(list) {
    var rank = function (c) {
      if (c.type === 'srflx') return 0;
      if (c.type === 'relay') return 1;
      if (c.type === 'prflx') return 2;
      return 3 + [0, 2, 1][c.kind];
    };
    var seen = {};
    return list
      .slice()
      .sort(function (a, b) {
        return rank(a) - rank(b);
      })
      .filter(function (c) {
        var k = c.type + c.addr + ':' + c.port;
        if (seen[k]) return false;
        seen[k] = true;
        return true;
      })
      .slice(0, MAX_CANDS);
  }

  /**
   * A code from an SDP: {kind: 'offer'|'answer', sdp, extra (candidate
   * lines), secret (16 bytes, offer only), at (ms)}.
   */
  function encodeCode(o) {
    var p = parseSdp(o.sdp, o.extra);
    var fp = hexToBytes(p.fp);
    var setup = SETUPS.indexOf(p.setup);
    if (fp.length !== 32 || setup < 0 || !p.ufrag || !p.pwd)
      throw new Error('no DTLS fingerprint or ICE credentials');
    if (p.ufrag.length > 255 || p.pwd.length > 255) throw new Error('too long');
    var offer = o.kind === 'offer';
    var b = [(VERSION << 4) | ((offer ? 0 : 1) << 3) | setup];
    var min = Math.floor((o.at || Date.now()) / 60000);
    b.push(
      (min >>> 24) & 255,
      (min >>> 16) & 255,
      (min >>> 8) & 255,
      min & 255
    );
    if (offer) {
      if (!o.secret || o.secret.length !== 16) throw new Error('no secret');
      for (var s = 0; s < 16; s++) b.push(o.secret[s]);
    }
    [p.ufrag, p.pwd].forEach(function (t) {
      b.push(t.length);
      for (var i = 0; i < t.length; i++) b.push(t.charCodeAt(i) & 127);
    });
    for (var f = 0; f < 32; f++) b.push(fp[f]);
    var cands = pickCands(p.cands);
    b.push(cands.length);
    cands.forEach(function (c) {
      b.push(TYPES.indexOf(c.type) | (c.kind << 2));
      if (c.kind === 0)
        c.addr.split('.').forEach(function (x) {
          b.push(Number(x) & 255);
        });
      else if (c.kind === 1) b.push.apply(b, ipv6Bytes(c.addr));
      else
        b.push.apply(
          b,
          Array.prototype.slice.call(hexToBytes(c.addr.split('.')[0]))
        );
      b.push((c.port >> 8) & 255, c.port & 255);
    });
    return CODE_TAG + b64enc(new Uint8Array(b));
  }

  /** The code in a pasted text or a link (#o= / #a=), or ''. */
  function findCode(text) {
    var m = /ST1\.([\w-]{60,600})/.exec(String(text || ''));
    return m ? CODE_TAG + m[1] : '';
  }

  /** A code -> {kind, setup, at, secret, ufrag, pwd, fp, cands}; throws. */
  function decodeCode(code) {
    var c = findCode(code);
    if (!c) throw new Error('no code');
    var b = b64dec(c.slice(CODE_TAG.length));
    var i = 0;
    var need = function (n) {
      if (i + n > b.length) throw new Error('short code');
    };
    need(5);
    var h = b[i++];
    if (h >> 4 !== VERSION) throw new Error('other version');
    var o = {
      kind: (h >> 3) & 1 ? 'answer' : 'offer',
      setup: SETUPS[h & 7]
    };
    if (!o.setup) throw new Error('bad setup');
    o.at =
      (b[i] * 16777216 + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3]) * 60000;
    i += 4;
    if (o.kind === 'offer') {
      need(16);
      o.secret = b.slice(i, i + 16);
      i += 16;
    }
    var str = function () {
      need(1);
      var n = b[i++];
      need(n);
      var s = '';
      for (var k = 0; k < n; k++) s += String.fromCharCode(b[i + k]);
      i += n;
      return s;
    };
    o.ufrag = str();
    o.pwd = str();
    need(32);
    o.fp = bytesToFp(b.slice(i, i + 32));
    o.fpBytes = b.slice(i, i + 32);
    i += 32;
    need(1);
    var n = b[i++];
    if (n > MAX_CANDS) throw new Error('bad code');
    o.cands = [];
    for (var k = 0; k < n; k++) {
      need(1);
      var t = b[i++];
      var type = TYPES[t & 3];
      var kind = (t >> 2) & 3;
      var addr;
      if (kind === 0) {
        need(4);
        addr = [b[i], b[i + 1], b[i + 2], b[i + 3]].join('.');
        i += 4;
      } else if (kind === 1 || kind === 2) {
        need(16);
        var a = b.slice(i, i + 16);
        i += 16;
        if (kind === 1) addr = ipv6Text(a);
        else {
          var x = bytesToFp(a).replace(/:/g, '').toLowerCase();
          addr =
            x.substr(0, 8) +
            '-' +
            x.substr(8, 4) +
            '-' +
            x.substr(12, 4) +
            '-' +
            x.substr(16, 4) +
            '-' +
            x.substr(20, 12) +
            '.local';
        }
      } else throw new Error('bad candidate');
      need(2);
      var port = (b[i] << 8) | b[i + 1];
      i += 2;
      o.cands.push({ type: type, addr: addr, port: port, kind: kind });
    }
    if (i !== b.length) throw new Error('bad code');
    return o;
  }

  /** Is a decoded code still good (10 minutes, a little clock skew)? */
  function codeFresh(o, now) {
    var t = now || Date.now();
    return o.at <= t + 5 * 60000 && t - o.at <= CODE_MS + 60000;
  }

  function candLine(c, i) {
    var pref = { host: 126, prflx: 110, srflx: 100, relay: 0 }[c.type];
    var prio = pref * 16777216 + (65535 - i) * 256 + 255;
    var line =
      'a=candidate:' +
      (i + 1) +
      ' 1 udp ' +
      prio +
      ' ' +
      c.addr +
      ' ' +
      c.port +
      ' typ ' +
      c.type;
    if (c.type !== 'host') line += ' raddr 0.0.0.0 rport 0';
    return line;
  }

  /** The SDP a decoded code stands for (one data channel, as browsers make it). */
  function buildSdp(o) {
    var sess = String(Math.floor(o.at / 60000)) + '1';
    var L = [
      'v=0',
      'o=- ' + sess + ' 2 IN IP4 127.0.0.1',
      's=-',
      't=0 0',
      'a=group:BUNDLE 0',
      'a=msid-semantic: WMS',
      'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
      'c=IN IP4 0.0.0.0'
    ];
    o.cands.forEach(function (c, i) {
      L.push(candLine(c, i));
    });
    L.push(
      'a=end-of-candidates',
      'a=ice-ufrag:' + o.ufrag,
      'a=ice-pwd:' + o.pwd,
      'a=ice-options:trickle',
      'a=fingerprint:sha-256 ' + o.fp,
      'a=setup:' + o.setup,
      'a=mid:0',
      'a=sctp-port:5000',
      'a=max-message-size:262144'
    );
    return L.join('\r\n') + '\r\n';
  }

  /*
   * The 4 pictures (a short authentication string, as Matrix's emoji
   * verification): 24 bits of sha-256(offer fingerprint, answer
   * fingerprint), 6 bits each, from the 64 pictures below (common emoji
   * that every phone draws, unlike each other).
   */
  var PICS = [
    '🐶',
    '🐱',
    '🦁',
    '🐎',
    '🦄',
    '🐷',
    '🐘',
    '🐰',
    '🐼',
    '🐓',
    '🐧',
    '🐢',
    '🐟',
    '🐙',
    '🦋',
    '🌷',
    '🌳',
    '🌵',
    '🍄',
    '🌏',
    '🌙',
    '☁️',
    '🔥',
    '🍌',
    '🍎',
    '🍓',
    '🌽',
    '🍕',
    '🎂',
    '❤️',
    '😀',
    '🤖',
    '🎩',
    '👓',
    '🔧',
    '🎅',
    '👍',
    '☂️',
    '⌛',
    '⏰',
    '🎁',
    '💡',
    '📕',
    '✏️',
    '📎',
    '✂️',
    '🔒',
    '🔑',
    '🔨',
    '☎️',
    '🏁',
    '🚂',
    '🚲',
    '✈️',
    '🚀',
    '🏆',
    '⚽',
    '🎸',
    '🎺',
    '🔔',
    '⚓',
    '🎧',
    '📁',
    '📌'
  ];
  /** sha-256 bytes -> the 4 pictures. */
  function picsOf(hash) {
    var n = (hash[0] << 16) | (hash[1] << 8) | hash[2];
    return [
      PICS[(n >> 18) & 63],
      PICS[(n >> 12) & 63],
      PICS[(n >> 6) & 63],
      PICS[n & 63]
    ];
  }

  function utf8(s) {
    return new TextEncoder().encode(s);
  }
  function cat(a, b) {
    var o = new Uint8Array(a.length + b.length);
    o.set(a, 0);
    o.set(b, a.length);
    return o;
  }

  /** subtle: crypto.subtle (the page's, or Node's webcrypto in tests). */
  function sasPics(subtle, fpOffer, fpAnswer) {
    return subtle
      .digest('SHA-256', cat(hexToBytes(fpOffer), hexToBytes(fpAnswer)))
      .then(function (h) {
        return picsOf(new Uint8Array(h));
      });
  }

  function proofText(fpOffer, fpAnswer, name) {
    return (
      'sofatube-help1|' +
      fpOffer.toUpperCase() +
      '|' +
      fpAnswer.toUpperCase() +
      '|' +
      name
    );
  }
  /** HMAC-SHA256(secret, …) of the helper's hello, base64url. */
  function proof(subtle, secret, fpOffer, fpAnswer, name) {
    return subtle
      .importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign'
      ])
      .then(function (k) {
        return subtle.sign('HMAC', k, utf8(proofText(fpOffer, fpAnswer, name)));
      })
      .then(function (sig) {
        return b64enc(new Uint8Array(sig));
      });
  }
  function proofOk(subtle, secret, fpOffer, fpAnswer, name, mac) {
    return proof(subtle, secret, fpOffer, fpAnswer, name).then(function (m) {
      // same length; compared in full
      if (typeof mac !== 'string' || mac.length !== m.length) return false;
      var d = 0;
      for (var i = 0; i < m.length; i++)
        d |= m.charCodeAt(i) ^ mac.charCodeAt(i);
      return d === 0;
    });
  }

  /** What the helper may send (phone-roles.js HELPER_CMDS; checked there too). */
  var HELPER_CMDS = [
    'hKey',
    'hQueue',
    'hSync',
    'hSet',
    'hRemind',
    'hFix',
    'hEnd'
  ];

  /* ---------- the STUN / TURN setting ---------- */
  var DEFAULT_STUN = 'stun:stun.l.google.com:19302';
  var ICE_KEY = 'ytx-help-ice';
  function iceSettings(store) {
    var s;
    try {
      s = JSON.parse((store && store.getItem(ICE_KEY)) || '{}') || {};
    } catch (e) {
      s = {};
    }
    return {
      stun: s.stun === 'none' || s.stun === 'own' ? s.stun : 'default',
      stunUrl: String(s.stunUrl || ''),
      turnUrl: String(s.turnUrl || ''),
      turnUser: String(s.turnUser || ''),
      turnPass: String(s.turnPass || ''),
      // remembered helpers' mailbox (item 49): '' = the public ntfy.sh
      relay: relayOk(s.relay) ? String(s.relay) : ''
    };
  }
  /** An ntfy server address: https, or this computer's own (tests). */
  function relayOk(u) {
    return (
      /^https:\/\/[\w.-]+(?::\d+)?$/.test(String(u || '')) ||
      /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(String(u || ''))
    );
  }

  /** RTCConfiguration.iceServers from the setting. */
  function iceServers(s) {
    var list = [];
    if (s.stun === 'default') list.push({ urls: DEFAULT_STUN });
    else if (s.stun === 'own' && /^stuns?:\S+$/.test(s.stunUrl))
      list.push({ urls: s.stunUrl });
    if (/^turns?:\S+$/.test(s.turnUrl))
      list.push({
        urls: s.turnUrl,
        username: s.turnUser,
        credential: s.turnPass
      });
    return list;
  }

  var pure = {
    VERSION: VERSION,
    CODE_MS: CODE_MS,
    PICS: PICS,
    HELPER_CMDS: HELPER_CMDS,
    DEFAULT_STUN: DEFAULT_STUN,
    b64enc: b64enc,
    b64dec: b64dec,
    parseSdp: parseSdp,
    parseCand: parseCand,
    pickCands: pickCands,
    encodeCode: encodeCode,
    decodeCode: decodeCode,
    findCode: findCode,
    codeFresh: codeFresh,
    buildSdp: buildSdp,
    picsOf: picsOf,
    sasPics: sasPics,
    proof: proof,
    proofOk: proofOk,
    iceSettings: iceSettings,
    iceServers: iceServers,
    relayOk: relayOk
  };

  if (
    typeof module === 'object' &&
    module.exports &&
    typeof window === 'undefined'
  ) {
    module.exports = pure;
    return;
  }

  /* ================================================================
   * The browser parts
   * ================================================================ */

  var S = {
    en: {
      title: 'Help from far away',
      intro:
        'Someone you trust (a son, a niece) can see what is on this TV and help with it from their own phone, wherever they are. Nothing goes through a server of ours: the two phones connect directly.',
      start: 'Get help',
      helping: 'I’m helping someone',
      helpingHint: 'For the helper: paste the code you were sent.',
      limits:
        'It does not always connect: about 1 in 5 tries fail, more on mobile data. It works best when both phones are on their home Wi-Fi. If it does not connect, a WhatsApp video call pointed at the TV works too.',
      ios: 'On an iPhone, keep this page open and in front while helping.',
      stunNote:
        'To find a way between two homes, both phones ask a public STUN server ({s}) for their own public address. It learns that address and nothing else. You can turn this off or use your own below.',
      making: 'Making the code…',
      sendOffer: 'Send this to your helper (WhatsApp or another app):',
      share: 'Share',
      copy: 'Copy',
      copied: 'Copied',
      pasteAnswer: 'Then paste the helper’s answer here:',
      connect: 'Connect',
      again: 'Start again',
      cancel: 'Cancel',
      connecting: 'Connecting…',
      noConnect:
        'Could not connect. Try again on home Wi-Fi on both phones, or use a WhatsApp video call pointed at the TV.',
      badCode: 'That is not a Sofa Tube help code.',
      oldCode:
        'This code is too old (codes last 10 minutes). Ask for a new one.',
      wrongKind: 'This is not the right code: paste the other phone’s code.',
      check: 'Check that the other phone shows the same 4 pictures:',
      match: 'They are the same',
      noMatch: 'They are different',
      mismatch:
        'The pictures were different: help was stopped. Start again and send the codes directly.',
      proofBad: 'This answer was not made for this code. Start again.',
      asking: 'Now answer on the TV with the remote: it asks what {n} may do.',
      helpOn: '{n} is helping · {m} left',
      more: '+30 minutes',
      end: 'End help',
      ended: 'Help ended.',
      changed: 'What {n} changed:',
      nothingChanged: 'Nothing was changed.',
      refused: 'The TV did not allow it.',
      sendDiag: 'Send the TV’s diagnostics to {n}',
      sendFix: 'Run Fix it and send the result to {n}',
      fixPreview: 'Fix it did this. Send it to {n}?',
      diagPreview: 'This is what {n} will get (no PIN, no history):',
      send: 'Send',
      dontSend: 'Don’t send',
      sent: 'Sent',
      needSecure:
        'Remote help needs the secure page (https) and a newer browser.',
      busy: 'Someone is helping already.',
      lost: 'The connection to the helper was lost.',
      network: 'Connection',
      stunDefault: 'Public STUN server (default)',
      stunNone: 'None: only on the same Wi-Fi',
      stunOwn: 'My own STUN server',
      turn: 'My TURN server (optional)',
      relayOwn: 'My own ntfy server for remembered helpers (optional)',
      turnUser: 'User name',
      turnPass: 'Password',
      // the helper's side
      hTitle: 'Helping with a TV',
      hPaste: 'Paste the code you were sent:',
      hName: 'Your name (the TV shows it)',
      hMake: 'Make my answer',
      hSendBack: 'Send this answer back the same way:',
      hWaiting: 'Waiting for the other phone to paste it…',
      hWaitTv: 'The person at the TV is asked what you may do…',
      hOn: 'You can help until {t}',
      hScopes: 'Allowed: {s}',
      sStatus: 'see the TV',
      sKeys: 'remote keys and Up next',
      sSet: 'settings',
      sFix: 'Fix it',
      hNow: 'On the TV now',
      hNothing: 'Nothing is playing.',
      hLock: 'A lock screen or a PIN prompt is on the TV.',
      hRemote: 'Remote',
      hQueue: 'Up next',
      hQueuePh: 'YouTube link or playlist',
      hAdd: 'Add',
      hSettings: 'Settings',
      hPin: 'PIN on the TV',
      hRemind: 'Reminder on the TV',
      hRemindPh: 'Text (e.g. Take your pills)',
      hRemindAt: 'At',
      hRemindSet: 'Set the reminder',
      hFix: 'Run Fix it on the TV',
      hDiag: 'Diagnostics from the TV',
      hChanges: 'Changed so far',
      hEnded: 'Help ended.',
      hAnswerFirst: 'Paste a code first.',
      keyUp: 'Up',
      keyDown: 'Down',
      keyLeft: 'Left',
      keyRight: 'Right',
      keyOk: 'OK',
      keyBack: 'Back',
      keyPlay: 'Play or pause',
      // watching together (item 47)
      hWatch: 'Watch together',
      hWatchNote:
        'The TV and this phone each play the video from YouTube itself; only play, pause and seeking are shared. If one side gets an ad, the other waits. YouTube may show its own ads here.',
      hWatchTv: 'Watch what is on the TV',
      hWatchLink: 'Or a YouTube link',
      hWatchStart: 'Watch it together',
      hWatchStop: 'Stop watching together',
      hSound: 'Sound on',
      hPlay: 'Play',
      hPause: 'Pause',
      hBack10: 'Back 10 seconds',
      hFwd10: 'Forward 10 seconds',
      hAdTv: 'Waiting for the TV: an ad there',
      hWaitMe: 'An ad here: the TV waits for you',
      hNoEmbed: 'This video can’t play outside YouTube.',
      // the relative's camera (item 48)
      hCam: 'The other phone’s camera',
      camOn: 'Show the TV with my camera',
      camOff: 'Stop the camera',
      camLive: 'Your camera is on: {n} sees it. Point it at the TV.',
      camDenied: 'The camera was not allowed (or this browser has none).',
      // remembered helpers (item 49)
      remember: 'Remember {n} for next time',
      remembered:
        'Remembered. Next time, ask {n} here without codes; the TV still asks first.',
      remList: 'Remembered helpers',
      remAsk: 'Ask {n} for help',
      remForget: 'Forget {n}',
      remSent:
        'Sent to {n}. Waiting for the answer (their help page must be open)…',
      remNote:
        'The codes then go through the public ntfy.sh relay, scrambled: it sees only the phones’ addresses, and nothing stays there beyond 12 hours.',
      hRemAsk: 'The family asks to remember you for next time.',
      hRemName: 'A name for them on this phone',
      hRemYes: 'Remember',
      hRemNo: 'Not now',
      hRemDone: 'Remembered',
      hRemList: 'Remembered families',
      hRemWait:
        'Requests from remembered families show here while this page is open.',
      hIncoming: '{n} asks for help',
      hHelpNow: 'Help now'
    },
    ar: {
      title: 'المساعدة عن بُعد',
      intro:
        'يستطيع شخص تثق به (ابن أو ابنة أخ) أن يرى ما يُعرض على هذا التلفاز ويساعدك فيه من هاتفه، أينما كان. لا يمر شيء عبر خادم لنا: يتصل الهاتفان مباشرة.',
      start: 'طلب المساعدة',
      helping: 'أنا أساعد شخصًا',
      helpingHint: 'للمساعد: الصق الرمز الذي وصلك.',
      limits:
        'لا ينجح الاتصال دائمًا: تفشل محاولة من كل 5 تقريبًا، وأكثر مع بيانات الجوال. ويعمل أفضل حين يكون الهاتفان على شبكة الواي فاي في المنزل. وإن لم يتصل، فمكالمة فيديو عبر واتساب موجهة إلى التلفاز تفي بالغرض.',
      ios: 'على الآيفون، أبقِ هذه الصفحة مفتوحة وفي المقدمة أثناء المساعدة.',
      stunNote:
        'ليجد الهاتفان طريقًا بين منزلين، يسأل كل منهما خادم STUN عامًا ({s}) عن عنوانه العام. يعرف الخادم ذلك العنوان فقط. يمكنك إيقاف ذلك أو استخدام خادمك أدناه.',
      making: 'جارٍ إنشاء الرمز…',
      sendOffer: 'أرسل هذا إلى من يساعدك (عبر واتساب أو تطبيق آخر):',
      share: 'مشاركة',
      copy: 'نسخ',
      copied: 'تم النسخ',
      pasteAnswer: 'ثم الصق رد المساعد هنا:',
      connect: 'اتصال',
      again: 'البدء من جديد',
      cancel: 'إلغاء',
      connecting: 'جارٍ الاتصال…',
      noConnect:
        'تعذّر الاتصال. أعد المحاولة والهاتفان على شبكة الواي فاي في المنزل، أو استخدم مكالمة فيديو عبر واتساب موجهة إلى التلفاز.',
      badCode: 'هذا ليس رمز مساعدة من صوفا تيوب.',
      oldCode: 'هذا الرمز قديم (يصلح الرمز 10 دقائق). اطلب رمزًا جديدًا.',
      wrongKind: 'هذا ليس الرمز المطلوب: الصق رمز الهاتف الآخر.',
      check: 'تأكد أن الهاتف الآخر يعرض الصور الأربع نفسها:',
      match: 'الصور نفسها',
      noMatch: 'الصور مختلفة',
      mismatch:
        'كانت الصور مختلفة فأُوقفت المساعدة. ابدأ من جديد وأرسل الرموز مباشرة.',
      proofBad: 'هذا الرد لم يُنشأ لهذا الرمز. ابدأ من جديد.',
      asking: 'أجب الآن على التلفاز بجهاز التحكم: يسأل عمّا يُسمح لـ{n} به.',
      helpOn: '{n} يساعد الآن · المتبقي {m}',
      more: '30 دقيقة إضافية',
      end: 'إنهاء المساعدة',
      ended: 'انتهت المساعدة.',
      changed: 'ما غيّره {n}:',
      nothingChanged: 'لم يُغيَّر شيء.',
      refused: 'لم يسمح التلفاز بذلك.',
      sendDiag: 'إرسال بيانات التشخيص من التلفاز إلى {n}',
      sendFix: 'تشغيل «إصلاح المشكلة» وإرسال النتيجة إلى {n}',
      fixPreview: 'هذا ما فعله «إصلاح المشكلة». هل تريد إرساله إلى {n}؟',
      diagPreview: 'هذا ما سيصل إلى {n} (دون الرمز السري ودون سجل المشاهدة):',
      send: 'إرسال',
      dontSend: 'عدم الإرسال',
      sent: 'أُرسلت',
      needSecure:
        'تحتاج المساعدة عن بُعد إلى الصفحة الآمنة (https) ومتصفح أحدث.',
      busy: 'هناك من يساعد الآن.',
      lost: 'انقطع الاتصال بالمساعد.',
      network: 'الاتصال',
      stunDefault: 'خادم STUN عام (الافتراضي)',
      stunNone: 'دون خادم: على شبكة الواي فاي نفسها فقط',
      stunOwn: 'خادم STUN الخاص بي',
      turn: 'خادم TURN الخاص بي (اختياري)',
      relayOwn: 'خادم ntfy الخاص بي للمساعدين المحفوظين (اختياري)',
      turnUser: 'اسم المستخدم',
      turnPass: 'كلمة المرور',
      hTitle: 'المساعدة في تلفاز',
      hPaste: 'الصق الرمز الذي وصلك:',
      hName: 'اسمك (يظهر على التلفاز)',
      hMake: 'إنشاء ردي',
      hSendBack: 'أرسل هذا الرد بالطريقة نفسها:',
      hWaiting: 'بانتظار أن يلصقه الهاتف الآخر…',
      hWaitTv: 'يُسأل من أمام التلفاز عمّا يُسمح لك به…',
      hOn: 'يمكنك المساعدة حتى {t}',
      hScopes: 'المسموح به: {s}',
      sStatus: 'رؤية التلفاز',
      sKeys: 'أزرار جهاز التحكم وقائمة «التالي»',
      sSet: 'الإعدادات',
      sFix: '«إصلاح المشكلة»',
      hNow: 'على التلفاز الآن',
      hNothing: 'لا يُعرض شيء.',
      hLock: 'على التلفاز شاشة قفل أو طلب للرمز السري.',
      hRemote: 'جهاز التحكم',
      hQueue: 'التالي',
      hQueuePh: 'رابط YouTube أو قائمة تشغيل',
      hAdd: 'إضافة',
      hSettings: 'الإعدادات',
      hPin: 'بالرمز السري على التلفاز',
      hRemind: 'تذكير على التلفاز',
      hRemindPh: 'النص (مثلًا: موعد الدواء)',
      hRemindAt: 'الوقت',
      hRemindSet: 'ضبط التذكير',
      hFix: 'تشغيل «إصلاح المشكلة» على التلفاز',
      hDiag: 'بيانات التشخيص من التلفاز',
      hChanges: 'ما غُيّر حتى الآن',
      hEnded: 'انتهت المساعدة.',
      hAnswerFirst: 'الصق رمزًا أولًا.',
      keyUp: 'أعلى',
      keyDown: 'أسفل',
      keyLeft: 'يسار',
      keyRight: 'يمين',
      keyOk: 'OK',
      keyBack: 'رجوع',
      keyPlay: 'تشغيل أو إيقاف مؤقت',
      hWatch: 'المشاهدة معًا',
      hWatchNote:
        'يشغّل التلفاز وهذا الهاتف الفيديو كلٌّ من YouTube مباشرة، ويُشارَك التشغيل والإيقاف المؤقت والتقديم والترجيع فقط. وإن ظهر إعلان لدى أحدهما ينتظره الآخر. قد يعرض YouTube إعلاناته هنا.',
      hWatchTv: 'مشاهدة ما يُعرض على التلفاز',
      hWatchLink: 'أو رابط YouTube',
      hWatchStart: 'المشاهدة معًا',
      hWatchStop: 'إيقاف المشاهدة معًا',
      hSound: 'تشغيل الصوت',
      hPlay: 'تشغيل',
      hPause: 'إيقاف مؤقت',
      hBack10: 'رجوع 10 ثوانٍ',
      hFwd10: 'تقديم 10 ثوانٍ',
      hAdTv: 'بانتظار التلفاز: يُعرض إعلان هناك',
      hWaitMe: 'إعلان هنا: ينتظرك التلفاز',
      hNoEmbed: 'لا يمكن تشغيل هذا الفيديو خارج YouTube.',
      hCam: 'كاميرا الهاتف الآخر',
      camOn: 'عرض التلفاز بكاميرا هاتفي',
      camOff: 'إيقاف الكاميرا',
      camLive: 'الكاميرا تعمل ويراها {n}. وجّهها إلى التلفاز.',
      camDenied: 'لم يُسمح بالكاميرا (أو لا كاميرا في هذا المتصفح).',
      remember: 'حفظ {n} للمرة القادمة',
      remembered:
        'تم الحفظ. في المرة القادمة اطلب المساعدة من {n} هنا دون رموز، وسيظل التلفاز يسأل أولًا.',
      remList: 'المساعدون المحفوظون',
      remAsk: 'طلب المساعدة من {n}',
      remForget: 'حذف {n}',
      remSent:
        'أُرسل الطلب إلى {n}. بانتظار الرد (يجب أن تكون صفحة المساعدة لديه مفتوحة)…',
      remNote:
        'تمر الرموز حينها عبر خادم ntfy.sh العام مشفّرة: لا يرى إلا عناوين الهاتفين، ولا يبقى فيه شيء أكثر من 12 ساعة.',
      hRemAsk: 'تطلب العائلة حفظك للمرة القادمة.',
      hRemName: 'اسم لهم على هذا الهاتف',
      hRemYes: 'حفظ',
      hRemNo: 'ليس الآن',
      hRemDone: 'تم الحفظ',
      hRemList: 'العائلات المحفوظة',
      hRemWait: 'تظهر هنا طلبات العائلات المحفوظة ما دامت هذه الصفحة مفتوحة.',
      hIncoming: '{n} يطلب المساعدة',
      hHelpNow: 'المساعدة الآن'
    }
  };

  var langNow = function () {
    return document.documentElement.lang === 'ar' ? 'ar' : 'en';
  };
  function tr(k, map) {
    var l = langNow();
    var s = (S[l] && S[l][k]) || S.en[k] || k;
    if (map)
      Object.keys(map).forEach(function (x) {
        s = s.split('{' + x + '}').join(map[x]);
      });
    return s;
  }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k === 'on')
        Object.keys(v).forEach(function (e) {
          n.addEventListener(e, v[e]);
        });
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) {
      if (c)
        n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }
  function clear(n) {
    while (n.firstChild) n.removeChild(n.firstChild);
  }

  var CSS =
    '.sh{display:block}.sh-card{background:var(--card,#fff);border:1px solid var(--line,#ddd);border-radius:14px;padding:14px 16px;margin:12px 0}' +
    '.sh h2{font-size:1.15rem;margin:0 0 8px;color:var(--title,inherit)}.sh p,.sh .sh-small{margin:6px 0;line-height:1.55}.sh .sh-small{font-size:.9rem;color:var(--muted,#666)}' +
    '.sh-code{display:block;width:100%;box-sizing:border-box;font-family:monospace;font-size:.95rem;word-break:break-all;padding:10px;border-radius:10px;border:1px solid var(--field-line,#ccc);background:var(--field,#f5f5f5);color:var(--text,#111);min-height:4.2em;direction:ltr;text-align:left}' +
    '.sh-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.sh-btn{font:inherit;padding:10px 16px;border-radius:999px;border:1px solid var(--field-line,#ccc);background:var(--field,#f5f5f5);color:var(--text,#111);min-height:44px}' +
    '.sh-btn.main{background:var(--accent,#a84500);border-color:var(--accent,#a84500);color:var(--accent-ink,#fff)}.sh-btn.bad{color:var(--bad,#c62828)}' +
    '.sh-pics{display:flex;justify-content:center;gap:14px;font-size:2.6rem;margin:10px 0}.sh-msg{font-weight:600}.sh-bad{color:var(--bad,#c62828)}.sh-ok{color:var(--ok,#1b7f37)}' +
    '.sh-pad{display:flex;flex-direction:column;align-items:center;gap:8px;margin:8px 0}.sh-pad .sh-row{display:flex;gap:8px}.sh-pad .sh-btn{min-width:72px}' +
    '.sh input,.sh select{font:inherit;padding:9px 10px;border-radius:10px;border:1px solid var(--field-line,#ccc);background:var(--field,#f5f5f5);color:var(--text,#111);max-width:100%;box-sizing:border-box}' +
    '.sh label{display:block;margin:8px 0 4px}.sh-set{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px;padding:6px 0;border-top:1px solid var(--line,#eee)}' +
    '.sh pre{white-space:pre-wrap;font-size:.8rem;max-height:16em;overflow:auto;direction:ltr;text-align:left;background:var(--field,#f5f5f5);padding:8px;border-radius:8px}';
  function ensureCss() {
    if (document.getElementById('sh-css')) return;
    document.head.appendChild(el('style', { id: 'sh-css', text: CSS }));
  }

  function canHelp() {
    return !!(
      root.RTCPeerConnection &&
      root.crypto &&
      root.crypto.subtle &&
      root.TextEncoder &&
      root.isSecureContext !== false
    );
  }

  function randomBytes(n) {
    var b = new Uint8Array(n);
    root.crypto.getRandomValues(b);
    return b;
  }

  /* ---------- one peer connection with one data channel ---------- */

  function newPeer() {
    var ice = iceSettings(root.localStorage);
    var pc = new RTCPeerConnection({ iceServers: iceServers(ice) });
    // negotiated: both sides make the same channel, no extra round trip
    var dc = pc.createDataChannel('sofatube-help', { negotiated: true, id: 0 });
    var extra = [];
    pc.addEventListener('icecandidate', function (e) {
      if (e.candidate && e.candidate.candidate)
        extra.push(e.candidate.candidate);
    });
    return { pc: pc, dc: dc, extra: extra };
  }

  /** Waits for ICE gathering (or 5 s: srflx answers can be slow). */
  function gathered(pc) {
    return new Promise(function (resolve) {
      if (pc.iceGatheringState === 'complete') return resolve();
      var done = function () {
        if (pc.iceGatheringState === 'complete') resolve();
      };
      pc.addEventListener('icegatheringstatechange', done);
      setTimeout(resolve, 5000);
    });
  }

  function shareText(text) {
    if (navigator.share)
      return navigator.share({ text: text }).catch(function () {});
    return copyText(text);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText)
      return navigator.clipboard.writeText(text).catch(function () {});
    return Promise.resolve();
  }

  function codeBox(code) {
    return el('div', { class: 'sh-code', dir: 'ltr', text: code });
  }
  function codeButtons(text) {
    var copyBtn = el('button', {
      class: 'sh-btn',
      type: 'button',
      text: tr('copy')
    });
    copyBtn.addEventListener('click', function () {
      copyText(text).then(function () {
        copyBtn.textContent = tr('copied');
      });
    });
    return el('div', { class: 'sh-btns' }, [
      el('button', {
        class: 'sh-btn main',
        type: 'button',
        text: tr('share'),
        on: {
          click: function () {
            shareText(text);
          }
        }
      }),
      copyBtn
    ]);
  }

  function mins(ms) {
    var m = Math.max(1, Math.ceil(ms / 60000));
    if (langNow() !== 'ar') return m + ' min';
    if (m === 1) return 'دقيقة واحدة';
    if (m === 2) return 'دقيقتان';
    return m + (m % 100 >= 3 && m % 100 <= 10 ? ' دقائق' : ' دقيقة');
  }
  function clock(ms) {
    var d = new Date(ms);
    return (
      (d.getHours() < 10 ? '0' : '') +
      d.getHours() +
      ':' +
      (d.getMinutes() < 10 ? '0' : '') +
      d.getMinutes()
    );
  }

  /* ---------- the network setting (both sides) ---------- */
  function networkCard() {
    var s = iceSettings(root.localStorage);
    var save = function () {
      try {
        root.localStorage.setItem(ICE_KEY, JSON.stringify(s));
      } catch (e) {}
    };
    var own = el('input', {
      type: 'url',
      dir: 'ltr',
      placeholder: 'stun:example.org:3478',
      value: s.stunUrl
    });
    own.addEventListener('change', function () {
      s.stunUrl = own.value.trim();
      save();
    });
    var sel = el('select', {}, [
      el('option', { value: 'default', text: tr('stunDefault') }),
      el('option', { value: 'none', text: tr('stunNone') }),
      el('option', { value: 'own', text: tr('stunOwn') })
    ]);
    sel.value = s.stun;
    own.style.display = s.stun === 'own' ? '' : 'none';
    sel.addEventListener('change', function () {
      s.stun = sel.value;
      own.style.display = s.stun === 'own' ? '' : 'none';
      save();
    });
    var f = function (k, ph, type) {
      var i = el('input', {
        type: type || 'text',
        dir: 'ltr',
        placeholder: ph,
        value: s[k]
      });
      i.addEventListener('change', function () {
        s[k] = i.value.trim();
        save();
      });
      return i;
    };
    return el('details', { class: 'sh-card' }, [
      el('summary', { text: tr('network') }),
      el('p', {
        class: 'sh-small',
        text: tr('stunNote', { s: DEFAULT_STUN.replace(/^stun:/, '') })
      }),
      sel,
      own,
      el('label', { text: tr('turn') }),
      f('turnUrl', 'turn:example.org:3478', 'url'),
      el('label', { text: tr('turnUser') }),
      f('turnUser', ''),
      el('label', { text: tr('turnPass') }),
      f('turnPass', '', 'password'),
      el('label', { text: tr('relayOwn') }),
      f('relay', 'https://ntfy.example.org', 'url')
    ]);
  }

  function limitsNote() {
    var kids = [el('p', { class: 'sh-small', text: tr('limits') })];
    if (/iPhone|iPad|iPod/.test(navigator.userAgent))
      kids.push(el('p', { class: 'sh-small sh-msg', text: tr('ios') }));
    return el('div', {}, kids);
  }

  /* ================================================================
   * Remembered helpers (item 49): no codes to swap the next time
   *
   * During a help session (verified: proof, pictures, the TV allowed it)
   * the relative may tap "Remember Sami". Each phone makes a P-256 key that
   * can't be exported, they swap the public halves over the live (DTLS)
   * connection, and from then on the next offer and answer codes go through
   * an end-to-end encrypted mailbox on a public ntfy relay, with
   * away-095's crypto as it is (tools/site-finder/away-crypto.js:
   * ECDH -> HKDF -> AES-GCM, padded, counters against replay; no second
   * crypto core). The TV still asks on its screen every time. Either phone
   * forgets the other at any time (and tells it).
   * ================================================================ */

  var REM_RELAY = 'https://ntfy.sh';
  var REM_DB = 'sofatube-help';
  function crypt() {
    return root.sofaAwayCrypto || null;
  }
  function remDb() {
    return new Promise(function (ok, bad) {
      var r = root.indexedDB.open(REM_DB, 1);
      r.onupgradeneeded = function () {
        r.result.createObjectStore('pairs', { keyPath: 'id' });
      };
      r.onsuccess = function () {
        ok(r.result);
      };
      r.onerror = function () {
        bad(r.error);
      };
    });
  }
  function remTx(mode, fn) {
    return remDb().then(function (db) {
      return new Promise(function (ok, bad) {
        var tx = db.transaction('pairs', mode);
        var out = fn(tx.objectStore('pairs'));
        tx.oncomplete = function () {
          ok(out && out.result !== undefined ? out.result : undefined);
        };
        tx.onerror = function () {
          bad(tx.error);
        };
      });
    });
  }
  /** This phone's remembered pairs, for side 'r' (relative) or 'h'. */
  function remAll(side) {
    if (!root.indexedDB || !crypt()) return Promise.resolve([]);
    return remTx('readonly', function (s) {
      return s.getAll();
    })
      .then(function (l) {
        return (l || []).filter(function (p) {
          return p.side === side;
        });
      })
      .catch(function () {
        return [];
      });
  }
  function remPut(p) {
    var copy = Object.assign({}, p);
    delete copy.k; // derived keys: made again when needed
    return remTx('readwrite', function (s) {
      return s.put(copy);
    });
  }
  function remDel(id) {
    return remTx('readwrite', function (s) {
      return s.delete(id);
    });
  }
  function remTopic(tag) {
    return 'st' + tag + '-' + b64enc(randomBytes(18));
  }
  function remKeys(p) {
    if (p.k) return Promise.resolve(p.k);
    return crypt()
      .linkKeys(p.priv, p.peerPub, p.id, 'help')
      .then(function (k) {
        p.k = k;
        return k;
      });
  }
  /** Seals msg for the other phone and posts it to its inbox. */
  function remSend(p, msg) {
    var C = crypt();
    return remKeys(p).then(function (k) {
      p.outN = C.nextCounter(p.outN, Date.now());
      return C.seal(
        p.side === 'r' ? k.p2t : k.t2p,
        p.id,
        p.side + p.id,
        p.peerIn,
        msg,
        Date.now(),
        p.outN
      ).then(function (body) {
        return remPut(p).then(function () {
          return fetch(p.relay + '/' + p.peerIn, {
            method: 'POST',
            body: body,
            headers: { Firebase: 'no' }
          });
        });
      });
    });
  }
  /** New messages from the other phone (fresh, in order, each once). */
  function remRead(p, sinceSec) {
    var C = crypt();
    var other = (p.side === 'r' ? 'h' : 'r') + p.id;
    return remKeys(p)
      .then(function (k) {
        return fetch(
          p.relay + '/' + p.myIn + '/json?poll=1&since=' + (sinceSec || '10m'),
          { cache: 'no-store' }
        )
          .then(function (r) {
            return r.text();
          })
          .then(function (text) {
            var out = [];
            var chain = Promise.resolve();
            text.split('\n').forEach(function (l) {
              chain = chain.then(function () {
                var ev;
                try {
                  ev = JSON.parse(l);
                } catch (e) {
                  return;
                }
                if (!ev || ev.event !== 'message') return;
                var env = C.peek(ev.message);
                if (!env || env.f !== other) return;
                return C.open(
                  p.side === 'r' ? k.t2p : k.p2t,
                  p.id,
                  p.myIn,
                  env
                ).then(function (m) {
                  if (!m || C.check(m, p.inN, Date.now())) return;
                  p.inN = m.n;
                  out.push(m);
                });
              });
            });
            return chain.then(function () {
              return remPut(p).then(function () {
                return out;
              });
            });
          });
      })
      .catch(function () {
        return [];
      });
  }
  /** A new pair for this side, from the other phone's public key. */
  function remMake(side, keys, info) {
    var C = crypt();
    return Promise.resolve().then(function () {
      var p = {
        id: info.id,
        side: side,
        name: String(info.name || '').slice(0, 40),
        priv: keys.priv,
        peerPub: C.unb64u(info.peerPub),
        relay: info.relay,
        myIn: side === 'r' ? info.relIn : info.hlpIn,
        peerIn: side === 'r' ? info.hlpIn : info.relIn,
        outN: 0,
        inN: 0,
        at: Date.now()
      };
      return remPut(p).then(function () {
        return p;
      });
    });
  }

  /* ================================================================
   * The relative's side (phone.html, a parent's phone at the TV)
   * ================================================================ */

  /**
   * host: {token(), base: '' (same origin), cmd(name, arg, cb(ok, msg,
   * data)), diag(cb(text)), lang()}. Returns the card's node.
   */
  function mountRelative(host) {
    ensureCss();
    var card = el('section', { class: 'sh sh-card', id: 'ytx-help-card' });
    var st = {
      phase: 'idle', // idle | offer | connecting | check | asking | on | ended
      peer: null,
      secret: null,
      fpOffer: '',
      fpAnswer: '',
      offerAt: 0,
      name: '',
      verified: false,
      helpId: '',
      htok: '',
      liveRev: -1,
      relaying: false,
      sent: {}, // helper message id -> true (one answer each)
      parent: null, // the TV's live.help for this session
      msg: '',
      pics: null,
      error: ''
    };

    function send(m) {
      try {
        if (st.peer && st.peer.dc.readyState === 'open')
          st.peer.dc.send(JSON.stringify(m));
      } catch (e) {}
    }

    function stop(msg, keepTv) {
      if (st.cam)
        st.cam.getTracks().forEach(function (x) {
          x.stop();
        });
      st.cam = null;
      if (st.helpId && !keepTv) host.cmd('helpEnd', '', function () {}, true);
      send({ t: 'bye' });
      try {
        if (st.peer) st.peer.pc.close();
      } catch (e) {}
      st.peer = null;
      st.relaying = false;
      st.htok = '';
      st.phase = st.phase === 'idle' ? 'idle' : 'ended';
      st.msg = msg || '';
      draw();
    }

    function startOffer() {
      if (!canHelp()) {
        st.error = tr('needSecure');
        return draw();
      }
      st.error = '';
      st.phase = 'making';
      draw();
      st.peer = newPeer();
      st.secret = randomBytes(16);
      wirePeer();
      var pc = st.peer.pc;
      pc.createOffer()
        .then(function (o) {
          return pc.setLocalDescription(o);
        })
        .then(function () {
          return gathered(pc);
        })
        .then(function () {
          st.offerAt = Date.now();
          st.offer = encodeCode({
            kind: 'offer',
            sdp: pc.localDescription.sdp,
            extra: st.peer.extra,
            secret: st.secret,
            at: st.offerAt
          });
          st.fpOffer = parseSdp(pc.localDescription.sdp).fp;
          st.phase = 'offer';
          if (st.viaPair) remOffer(st.viaPair);
          draw();
        })
        .catch(function (e) {
          st.phase = 'idle';
          st.error = tr('noConnect') + ' (' + (e && e.message) + ')';
          draw();
        });
    }

    function useAnswer(text) {
      var a;
      try {
        a = decodeCode(text);
      } catch (e) {
        st.error = tr('badCode');
        return draw();
      }
      if (a.kind !== 'answer') {
        st.error = tr('wrongKind');
        return draw();
      }
      if (!codeFresh(a) || Date.now() - st.offerAt > CODE_MS) {
        st.error = tr('oldCode');
        return draw();
      }
      st.error = '';
      st.fpAnswer = a.fp;
      st.phase = 'connecting';
      draw();
      st.peer.pc
        .setRemoteDescription({ type: 'answer', sdp: buildSdp(a) })
        .catch(function () {
          stop(tr('noConnect'), true);
        });
      st.offer = ''; // single use
      setTimeout(function () {
        if (st.phase === 'connecting') stop(tr('noConnect'), true);
      }, 25000);
    }

    function wirePeer() {
      var dc = st.peer.dc;
      dc.addEventListener('message', function (e) {
        var m;
        try {
          m = JSON.parse(e.data);
        } catch (x) {
          return;
        }
        onMessage(m);
      });
      dc.addEventListener('close', function () {
        if (st.phase !== 'ended' && st.phase !== 'idle') stop(tr('lost'));
      });
    }

    var rate = [];
    function onMessage(m) {
      if (!m || typeof m.t !== 'string') return;
      if (m.t === 'hello' && st.phase === 'connecting') {
        var name = String(m.name || '')
          .replace(JUNK, '')
          .trim()
          .slice(0, 40);
        proofOk(
          root.crypto.subtle,
          st.secret,
          st.fpOffer,
          st.fpAnswer,
          name,
          m.mac
        ).then(function (ok) {
          if (!ok) return stop(tr('proofBad'), true);
          st.name = name || '?';
          st.verified = true;
          // a remembered helper: its keys were checked the first time (the
          // pictures); the TV still asks
          if (st.viaPair) return helpStart();
          return sasPics(root.crypto.subtle, st.fpOffer, st.fpAnswer).then(
            function (p) {
              st.pics = p;
              st.phase = 'check';
              send({ t: 'checking' });
              draw();
            }
          );
        });
        return;
      }
      if (m.t === 'bye') return stop(tr('ended'));
      if (m.t === 'sasno') return stop(tr('mismatch'));
      if (m.t === 'cmd' && st.phase === 'on' && st.verified) return relay(m);
      if (m.t === 'ping') send({ t: 'pong' });
      // remembering: the helper's public key back
      if (m.t === 'rem2' && st.remWant && m.id === st.remWant.id) {
        var w = st.remWant;
        st.remWant = null;
        remMake('r', w.keys, {
          id: w.id,
          name: st.name,
          peerPub: String(m.pub || ''),
          relay: w.relay,
          relIn: w.relIn,
          hlpIn: w.hlpIn
        }).then(function () {
          st.remDone = true;
          loadPairs();
        });
      }
      // the camera's renegotiation: the helper's answer
      if (m.t === 'sdp' && m.type === 'answer' && st.peer)
        st.peer.pc
          .setRemoteDescription({ type: 'answer', sdp: String(m.sdp || '') })
          .catch(function () {});
    }

    function helpStart() {
      st.phase = 'asking';
      st.askedAt = Date.now();
      draw();
      api(
        'POST',
        '/api/helpstart',
        host.token(),
        { name: st.name },
        function (code, d) {
          if (code === 409) return stop(tr('busy'), true);
          if (code !== 200 || !d || !d.p) return stop(tr('noConnect'), true);
          st.htok = d.p;
          st.helpId = d.id;
          send({ t: 'state', s: 'asking' });
          draw();
        }
      );
    }

    // the helper's command, with the helper token (never the parent's)
    function relay(m) {
      var now = Date.now();
      rate = rate.filter(function (x) {
        return now - x < 1000;
      });
      if (rate.length >= 10 || HELPER_CMDS.indexOf(m.cmd) < 0 || st.sent[m.id])
        return;
      rate.push(now);
      st.sent[m.id] = true;
      var body = { cmd: m.cmd };
      if (m.arg !== undefined) body.arg = String(m.arg).slice(0, 700);
      api('POST', '/api/set', st.htok, body, function (code, d) {
        send({ t: 'sent', id: m.id, ok: code === 200, sid: d && d.id });
      });
    }

    function relayLoop() {
      if (st.relaying || !st.htok) return;
      st.relaying = true;
      var tok = st.htok;
      var once = function () {
        if (!st.relaying || st.htok !== tok) return;
        api(
          'GET',
          '/api/state?live=' + st.liveRev + '&wait=1',
          tok,
          null,
          function (code, d) {
            if (!st.relaying || st.htok !== tok) return;
            if (code === 403) {
              st.relaying = false;
              return;
            }
            if (code === 200 && d && d.live && d.liveRev !== st.liveRev) {
              st.liveRev = d.liveRev;
              send({ t: 'live', live: d.live });
            }
            setTimeout(once, code === 200 ? 50 : 2000);
          },
          20000
        );
      };
      once();
    }

    // what the TV publishes for its parents about this help session
    function parentLive(h) {
      if (!st.helpId) return;
      if (!h || h.id !== st.helpId) {
        // gone after the TV had it (a new session or the TV restarted);
        // before that, the TV simply has not published it yet
        var seen = st.parent && st.parent.id === st.helpId;
        if (seen && (st.phase === 'on' || st.phase === 'asking'))
          stop(tr('ended'), true);
        else if (st.phase === 'asking' && Date.now() - st.askedAt > 150000)
          stop(tr('refused'));
        return;
      }
      // the TV publishes often (now playing): only a change is news here
      var sig = JSON.stringify([h.state, h.until, h.scopes, h.changes]);
      if (sig === st.sig) return;
      st.sig = sig;
      st.parent = h;
      if (h.state === 'on' && st.phase === 'asking') {
        st.phase = 'on';
        send({ t: 'state', s: 'on', until: h.until, scopes: h.scopes });
        relayLoop();
      } else if (h.state === 'on' && st.phase === 'on') {
        send({ t: 'state', s: 'on', until: h.until, scopes: h.scopes });
      } else if (
        h.state === 'ended' &&
        (st.phase === 'on' || st.phase === 'asking')
      ) {
        var refused = st.phase === 'asking';
        send({ t: 'state', s: refused ? 'refused' : 'ended' });
        stop(refused ? tr('refused') : tr('ended'), true);
        return;
      }
      draw();
    }

    /*
     * The relative's camera (item 48): only on a tap, the back camera,
     * video only, to the helper over the same connection (a renegotiation
     * on the data channel: this page offers, the helper answers). Needs a
     * secure context: the TV's https page with its accepted certificate is
     * one (checked in tools/phone/help-p2p-test.mjs).
     */
    function camStart() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        st.error = tr('camDenied');
        return draw();
      }
      navigator.mediaDevices
        .getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 }
          }
        })
        .then(function (stream) {
          if (!st.peer || st.phase !== 'on') {
            stream.getTracks().forEach(function (x) {
              x.stop();
            });
            return;
          }
          st.cam = stream;
          st.error = '';
          var pc = st.peer.pc;
          st.camSenders = stream.getTracks().map(function (tr2) {
            return pc.addTrack(tr2, stream);
          });
          return pc
            .createOffer()
            .then(function (o) {
              return pc.setLocalDescription(o);
            })
            .then(function () {
              send({ t: 'sdp', type: 'offer', sdp: pc.localDescription.sdp });
              send({ t: 'cam', on: true });
              draw();
            });
        })
        .catch(function () {
          st.error = tr('camDenied');
          draw();
        });
    }
    function camStop() {
      if (!st.cam) return;
      st.cam.getTracks().forEach(function (x) {
        x.stop();
      });
      st.cam = null;
      send({ t: 'cam', on: false });
      try {
        (st.camSenders || []).forEach(function (s) {
          st.peer.pc.removeTrack(s);
        });
      } catch (e) {}
      st.camSenders = null;
      draw();
    }

    /* remembered helpers (item 49) */
    st.pairs = [];
    function loadPairs() {
      remAll('r').then(function (l) {
        st.pairs = l;
        draw();
        // a helper that forgot this phone said so in the mailbox
        l.forEach(function (p) {
          remRead(p, '12h').then(function (list) {
            if (list.some((x) => x.op === 'forget'))
              remDel(p.id).then(loadPairs, function () {});
          });
        });
      });
    }
    function rememberThis() {
      var C = crypt();
      if (!C || !st.peer) return;
      C.newKeys().then(function (keys) {
        st.remWant = {
          keys: keys,
          id: bytesToFp(randomBytes(8)).replace(/:/g, '').toLowerCase(),
          relay: iceSettings(root.localStorage).relay || REM_RELAY,
          relIn: remTopic('r'),
          hlpIn: remTopic('h')
        };
        send({
          t: 'rem1',
          id: st.remWant.id,
          pub: C.b64u(keys.pub),
          relay: st.remWant.relay,
          relIn: st.remWant.relIn,
          hlpIn: st.remWant.hlpIn
        });
      });
    }
    function askPair(p) {
      st.helpId = '';
      st.parent = null;
      st.liveRev = -1;
      st.sent = {};
      st.sig = '';
      st.viaPair = p;
      startOffer();
    }
    // the offer through the mailbox; the answer comes back the same way
    function remOffer(p) {
      remSend(p, { op: 'offer', code: st.offer }).catch(function () {});
      var until = Date.now() + CODE_MS;
      var since = Math.floor(Date.now() / 1000) - 5;
      var poll = function () {
        if (st.phase !== 'offer' || st.viaPair !== p || Date.now() > until)
          return;
        remRead(p, since).then(function (list) {
          var a = list.filter(function (x) {
            return x.op === 'answer' && typeof x.code === 'string';
          })[0];
          if (a && st.phase === 'offer') return useAnswer(a.code);
          setTimeout(poll, 3000);
        });
      };
      setTimeout(poll, 2000);
    }
    function forgetPair(p) {
      remSend(p, { op: 'forget' })
        .catch(function () {})
        .then(function () {
          return remDel(p.id);
        })
        .then(loadPairs, loadPairs);
    }
    function pairsCard() {
      if (!st.pairs.length) return null;
      return el(
        'div',
        { class: 'sh-card' },
        [el('h2', { text: tr('remList') })].concat(
          st.pairs.map(function (p) {
            return el('div', { class: 'sh-btns' }, [
              btn(
                tr('remAsk', { n: p.name }),
                function () {
                  askPair(p);
                },
                'main'
              ),
              btn(tr('remForget', { n: p.name }), function () {
                forgetPair(p);
              })
            ]);
          }),
          [el('p', { class: 'sh-small', text: tr('remNote') })]
        )
      );
    }

    // Fix it on the TV, then (the relative's choice) its result to the helper
    function fixFlow(box) {
      clear(box);
      box.appendChild(el('p', { class: 'sh-small', text: tr('connecting') }));
      host.fix(function (text, ok) {
        clear(box);
        if (!ok) {
          box.appendChild(el('p', { class: 'sh-bad', text: text || '' }));
          return;
        }
        box.appendChild(
          el('p', { class: 'sh-small', text: tr('fixPreview', { n: st.name }) })
        );
        box.appendChild(el('pre', { dir: 'auto', text: text }));
        box.appendChild(
          el('div', { class: 'sh-btns' }, [
            btn(
              tr('send'),
              function () {
                send({ t: 'diag', text: String(text).slice(0, 4000) });
                clear(box);
                box.appendChild(el('p', { class: 'sh-ok', text: tr('sent') }));
              },
              'main'
            ),
            btn(tr('dontSend'), function () {
              clear(box);
            })
          ])
        );
      });
    }

    function diagFlow(box) {
      host.diag(function (text) {
        clear(box);
        if (!text) return;
        box.appendChild(
          el('p', {
            class: 'sh-small',
            text: tr('diagPreview', { n: st.name })
          })
        );
        box.appendChild(el('pre', { text: text }));
        box.appendChild(
          el('div', { class: 'sh-btns' }, [
            el('button', {
              class: 'sh-btn main',
              type: 'button',
              text: tr('send'),
              on: {
                click: function () {
                  send({ t: 'diag', text: String(text).slice(0, 60000) });
                  clear(box);
                  box.appendChild(
                    el('p', { class: 'sh-ok', text: tr('sent') })
                  );
                }
              }
            }),
            el('button', {
              class: 'sh-btn',
              type: 'button',
              text: tr('dontSend'),
              on: {
                click: function () {
                  clear(box);
                }
              }
            })
          ])
        );
      });
    }

    function btn(label, fn, cls) {
      return el('button', {
        class: 'sh-btn' + (cls ? ' ' + cls : ''),
        type: 'button',
        text: label,
        on: { click: fn }
      });
    }

    function changesList(h) {
      var ch = (h && h.changes) || [];
      if (!ch.length)
        return el('p', { class: 'sh-small', text: tr('nothingChanged') });
      return el('div', {}, [
        el('p', {
          class: 'sh-small',
          text: tr('changed', { n: (h && h.name) || st.name })
        }),
        el(
          'ul',
          {},
          ch.map(function (c) {
            return el('li', {
              dir: 'auto',
              text: c.v ? c.s + ': ' + c.v : c.s
            });
          })
        )
      ]);
    }

    function draw() {
      clear(card);
      card.appendChild(el('h2', { text: tr('title') }));
      if (st.error)
        card.appendChild(el('p', { class: 'sh-bad', text: st.error }));
      var p = st.phase;
      if (p === 'idle' || p === 'ended') {
        if (p === 'ended') {
          card.appendChild(
            el('p', { class: 'sh-msg', text: st.msg || tr('ended') })
          );
          if (st.parent) card.appendChild(changesList(st.parent));
        } else card.appendChild(el('p', { text: tr('intro') }));
        var pc0 = pairsCard();
        if (pc0) card.appendChild(pc0);
        card.appendChild(limitsNote());
        card.appendChild(
          el('div', { class: 'sh-btns' }, [
            btn(
              p === 'ended' ? tr('again') : tr('start'),
              function () {
                st.helpId = '';
                st.parent = null;
                st.liveRev = -1;
                st.sent = {};
                st.sig = '';
                st.viaPair = null;
                startOffer();
              },
              'main'
            ),
            btn(tr('helping'), function () {
              location.hash = '#help';
              location.reload();
            })
          ])
        );
        card.appendChild(networkCard());
        return;
      }
      if (p === 'making') {
        card.appendChild(el('p', { text: tr('making') }));
        return;
      }
      if (p === 'offer') {
        var text =
          tr('title') +
          ' — Sofa Tube\nhttps://sofatube.github.io/help/#o=' +
          st.offer.slice(4) +
          '\n\n' +
          st.offer;
        card.appendChild(el('p', { text: tr('sendOffer') }));
        card.appendChild(codeBox(st.offer));
        card.appendChild(codeButtons(text));
        card.appendChild(el('label', { text: tr('pasteAnswer') }));
        var ta = el('textarea', {
          class: 'sh-code',
          dir: 'ltr',
          rows: '4',
          autocomplete: 'off',
          spellcheck: 'false'
        });
        card.appendChild(ta);
        card.appendChild(
          el('div', { class: 'sh-btns' }, [
            btn(
              tr('connect'),
              function () {
                useAnswer(ta.value);
              },
              'main'
            ),
            btn(tr('cancel'), function () {
              stop('', true);
              st.phase = 'idle';
              draw();
            })
          ])
        );
        card.appendChild(limitsNote());
        return;
      }
      if (p === 'connecting') {
        card.appendChild(el('p', { text: tr('connecting') }));
        return;
      }
      if (p === 'check') {
        card.appendChild(el('p', { text: tr('check') }));
        card.appendChild(
          el('div', {
            class: 'sh-pics',
            'aria-live': 'polite',
            text: st.pics.join(' ')
          })
        );
        card.appendChild(
          el('div', { class: 'sh-btns' }, [
            btn(tr('match'), helpStart, 'main'),
            btn(
              tr('noMatch'),
              function () {
                send({ t: 'sasno' });
                stop(tr('mismatch'), true);
              },
              'bad'
            )
          ])
        );
        return;
      }
      if (p === 'asking') {
        card.appendChild(
          el('p', { class: 'sh-msg', text: tr('asking', { n: st.name }) })
        );
        card.appendChild(
          el('div', { class: 'sh-btns' }, [
            btn(tr('cancel'), function () {
              stop('');
            })
          ])
        );
        return;
      }
      if (p === 'on') {
        var h = st.parent || {};
        card.appendChild(
          el('p', {
            class: 'sh-msg',
            text: tr('helpOn', {
              n: st.name,
              m: mins((h.until || 0) - Date.now())
            })
          })
        );
        if (/iPhone|iPad|iPod/.test(navigator.userAgent))
          card.appendChild(
            el('p', { class: 'sh-small sh-msg', text: tr('ios') })
          );
        var diagBox = el('div');
        card.appendChild(
          el('div', { class: 'sh-btns' }, [
            btn(tr('more'), function () {
              host.cmd('helpMore', '', function () {});
            }),
            crypt() && !st.viaPair && !st.remDone
              ? btn(tr('remember', { n: st.name }), rememberThis)
              : null,
            host.fix
              ? btn(tr('sendFix', { n: st.name }), function () {
                  fixFlow(diagBox);
                })
              : null,
            btn(tr('sendDiag', { n: st.name }), function () {
              diagFlow(diagBox);
            }),
            st.cam
              ? btn(tr('camOff'), camStop, 'bad')
              : btn(tr('camOn'), camStart),
            btn(
              tr('end'),
              function () {
                send({ t: 'state', s: 'ended' });
                stop(tr('ended'));
              },
              'bad'
            )
          ])
        );
        if (st.remDone)
          card.appendChild(
            el('p', {
              class: 'sh-small sh-ok',
              text: tr('remembered', { n: st.name })
            })
          );
        if (st.cam)
          card.appendChild(
            el('p', {
              class: 'sh-small sh-msg',
              text: tr('camLive', { n: st.name })
            })
          );
        card.appendChild(diagBox);
        card.appendChild(changesList(h));
      }
    }

    // the page closing ends help at once (the TV also ends it 1 minute
    // after the relay stopped asking)
    root.addEventListener('pagehide', function () {
      if (!st.helpId || (st.phase !== 'on' && st.phase !== 'asking')) return;
      send({ t: 'bye' });
      try {
        navigator.sendBeacon(
          (host.base || '') + '/api/set?t=' + host.token(),
          JSON.stringify({ cmd: 'helpEnd' })
        );
      } catch (e) {}
    });
    // the minutes left
    setInterval(function () {
      if (st.phase === 'on') draw();
    }, 30000);

    draw();
    loadPairs();
    // redraw: the phone page's language changed (its strings follow
    // document.documentElement.lang)
    return { node: card, parentLive: parentLive, redraw: draw };
  }

  function api(method, path, tok, body, cb, timeout) {
    var x = new XMLHttpRequest();
    x.open(method, path + (path.indexOf('?') < 0 ? '?' : '&') + 't=' + tok);
    x.timeout = timeout || 8000;
    x.onload = function () {
      var d = null;
      try {
        d = JSON.parse(x.responseText);
      } catch (e) {}
      cb(x.status, d);
    };
    x.onerror = x.ontimeout = function () {
      cb(0, null);
    };
    x.send(body ? JSON.stringify(body) : null);
  }

  /* ================================================================
   * The helper's side ("I'm helping": phone.html#help, or the static page)
   * ================================================================ */

  function mountHelper(container) {
    ensureCss();
    // the stage keeps the embedded player and the camera across redraws
    // (moving an iframe in the page reloads it)
    var stage = el('div', { class: 'sh' });
    var box = el('div', { class: 'sh' });
    container.appendChild(stage);
    container.appendChild(box);
    var NAME_KEY = 'ytx-help-name';
    var st = {
      phase: 'paste', // paste | answer | check | waittv | on | ended
      offer: null,
      peer: null,
      fpAnswer: '',
      pics: null,
      live: null,
      scopes: [],
      until: 0,
      next: 1,
      waiting: {}, // message id -> {cb}
      sidOf: {}, // service id -> message id
      diag: '',
      msg: '',
      error: '',
      answer: ''
    };
    var name = '';
    try {
      name = root.localStorage.getItem(NAME_KEY) || '';
    } catch (e) {}

    function send(m) {
      try {
        if (st.peer && st.peer.dc.readyState === 'open')
          st.peer.dc.send(JSON.stringify(m));
      } catch (e) {}
    }
    function cmd(c, arg, cb) {
      var id = st.next++;
      st.waiting[id] = { cb: cb || null, at: Date.now() };
      send({
        t: 'cmd',
        id: id,
        cmd: c,
        arg: arg === undefined ? '' : String(arg)
      });
    }
    function end(msg) {
      send({ t: 'bye' });
      try {
        if (st.peer) st.peer.pc.close();
      } catch (e) {}
      st.peer = null;
      st.phase = 'ended';
      st.msg = msg || tr('hEnded');
      watchClose();
      if (camBox) camShow(false);
      draw();
    }

    function makeAnswer(text) {
      var o;
      try {
        o = decodeCode(text);
      } catch (e) {
        st.error = tr('badCode');
        return draw();
      }
      if (o.kind !== 'offer') {
        st.error = tr('wrongKind');
        return draw();
      }
      if (!codeFresh(o)) {
        st.error = tr('oldCode');
        return draw();
      }
      if (!canHelp()) {
        st.error = tr('needSecure');
        return draw();
      }
      st.error = '';
      st.offer = o;
      st.phase = 'making';
      draw();
      st.peer = newPeer();
      wire();
      var pc = st.peer.pc;
      pc.setRemoteDescription({ type: 'offer', sdp: buildSdp(o) })
        .then(function () {
          return pc.createAnswer();
        })
        .then(function (a) {
          return pc.setLocalDescription(a);
        })
        .then(function () {
          return gathered(pc);
        })
        .then(function () {
          st.answer = encodeCode({
            kind: 'answer',
            sdp: pc.localDescription.sdp,
            extra: st.peer.extra
          });
          st.fpAnswer = parseSdp(pc.localDescription.sdp).fp;
          st.phase = 'answer';
          // a remembered family: the answer goes back by itself
          if (st.viaPair)
            remSend(st.viaPair, { op: 'answer', code: st.answer }).catch(
              function () {}
            );
          draw();
        })
        .catch(function (e) {
          st.phase = 'paste';
          st.error = tr('noConnect') + ' (' + (e && e.message) + ')';
          draw();
        });
    }

    function wire() {
      var dc = st.peer.dc;
      // the relative's camera arrives as a track (after its renegotiation)
      st.peer.pc.addEventListener('track', function (e) {
        st.camStream =
          (e.streams && e.streams[0]) || new MediaStream([e.track]);
        camShow(true);
      });
      dc.addEventListener('open', function () {
        if (st.viaPair) {
          // checked with the pictures the first time: straight to the TV
          st.phase = 'waittv';
          draw();
        }
        proof(
          root.crypto.subtle,
          st.offer.secret,
          st.offer.fp,
          st.fpAnswer,
          name
        ).then(function (mac) {
          send({ t: 'hello', name: name, mac: mac, v: VERSION });
        });
        if (!st.viaPair)
          sasPics(root.crypto.subtle, st.offer.fp, st.fpAnswer).then(
            function (p) {
              st.pics = p;
              st.phase = 'check';
              draw();
            }
          );
      });
      dc.addEventListener('message', function (e) {
        var m;
        try {
          m = JSON.parse(e.data);
        } catch (x) {
          return;
        }
        onMessage(m);
      });
      dc.addEventListener('close', function () {
        if (st.phase !== 'ended') end(tr('lost'));
      });
    }

    function onMessage(m) {
      if (!m || typeof m.t !== 'string') return;
      if (m.t === 'bye') return end(tr('hEnded'));
      if (m.t === 'state') {
        if (m.s === 'asking') st.phase = 'waittv';
        else if (m.s === 'on') {
          st.phase = 'on';
          st.until = Number(m.until) || 0;
          st.scopes = Array.isArray(m.scopes) ? m.scopes : [];
        } else if (m.s === 'refused') return end(tr('refused'));
        else if (m.s === 'ended') return end(tr('hEnded'));
        return draw();
      }
      if (m.t === 'live' && m.live) {
        st.live = m.live;
        st.liveAt = Date.now();
        watchFollow();
        if (Array.isArray(m.live.scopes)) st.scopes = m.live.scopes;
        if (m.live.until) st.until = m.live.until;
        (m.live.results || []).forEach(function (r) {
          var id = st.sidOf[r.id];
          var w = id && st.waiting[id];
          if (!w) return;
          delete st.waiting[id];
          if (w.cb) w.cb(r.ok, r.msg, r.data);
          if (r.msg) st.msg = r.msg;
        });
        return draw();
      }
      if (m.t === 'sent') {
        if (m.ok && m.sid) st.sidOf[m.sid] = m.id;
        else if (st.waiting[m.id]) {
          var w = st.waiting[m.id];
          delete st.waiting[m.id];
          st.msg = tr('refused');
          if (w.cb) w.cb(false, '');
          draw();
        }
        return;
      }
      if (m.t === 'diag') {
        st.diag = String(m.text || '');
        return draw();
      }
      // the relative's camera: its offer (this page answers), on/off
      if (m.t === 'sdp' && m.type === 'offer' && st.peer) {
        var pc = st.peer.pc;
        pc.setRemoteDescription({ type: 'offer', sdp: String(m.sdp || '') })
          .then(function () {
            return pc.createAnswer();
          })
          .then(function (a) {
            return pc.setLocalDescription(a);
          })
          .then(function () {
            send({ t: 'sdp', type: 'answer', sdp: pc.localDescription.sdp });
          })
          .catch(function () {});
        return;
      }
      if (m.t === 'cam') camShow(!!m.on);
      // the family asks to remember this helper
      if (m.t === 'rem1' && crypt() && typeof m.id === 'string') {
        st.remAsk = m;
        draw();
      }
    }

    /* ---------- the relative's camera (item 48) ---------- */
    var camBox = null;
    var camVideo = null;
    function camShow(on) {
      if (!camBox) {
        camVideo = el('video', {
          autoplay: true,
          playsinline: true,
          muted: true
        });
        camVideo.muted = true;
        camVideo.style.width = '100%';
        camVideo.style.borderRadius = '10px';
        camBox = el('div', { class: 'sh-card' }, [
          el('h2', { text: tr('hCam') }),
          camVideo
        ]);
        stage.appendChild(camBox);
      }
      camBox.style.display = on ? '' : 'none';
      if (!on) camVideo.srcObject = null;
      else if (st.camStream) camVideo.srcObject = st.camStream;
    }

    /* ---------- watching together, "Watch with …" (item 47) ---------- */
    var W = {
      box: null,
      slot: null,
      yt: null,
      id: '',
      ready: false,
      stall: 0,
      lastT: -1,
      waiting: false,
      bad: false
    };
    function loadYt(cb) {
      if (root.YT && root.YT.Player) return cb();
      var prev = root.onYouTubeIframeAPIReady;
      root.onYouTubeIframeAPIReady = function () {
        if (prev) prev();
        cb();
      };
      if (!document.getElementById('sh-yt-api'))
        document.head.appendChild(
          el('script', {
            id: 'sh-yt-api',
            src: 'https://www.youtube.com/iframe_api'
          })
        );
    }
    function tvNow(w) {
      // the TV's second now: its last one plus the time since it came
      var run = !w.paused && !w.ad && w.wait !== 'helper';
      return w.t + (run ? (Date.now() - (st.liveAt || Date.now())) / 1000 : 0);
    }
    function watchStage(id) {
      if (!W.box) {
        W.slot = el('div');
        var bar = el('div', { class: 'sh-btns' });
        W.msg = el('p', { class: 'sh-small' });
        W.box = el('div', { class: 'sh-card' }, [el('h2'), W.slot, bar, W.msg]);
        W.bar = bar;
        stage.insertBefore(W.box, stage.firstChild);
      }
      W.box.style.display = '';
      watchBar();
      if (W.id === id && W.yt) return;
      W.id = id;
      W.ready = false;
      W.bad = false;
      loadYt(function () {
        if (W.yt)
          try {
            W.yt.destroy();
          } catch (e) {}
        var holder = el('div');
        W.slot.textContent = '';
        W.slot.appendChild(holder);
        W.yt = new root.YT.Player(holder, {
          width: '100%',
          height: '220',
          videoId: id,
          playerVars: { controls: 0, playsinline: 1, rel: 0, disablekb: 1 },
          events: {
            onReady: function () {
              W.ready = true;
              W.yt.mute(); // sound after a tap (browsers block it before)
              watchFollow();
            },
            onError: function () {
              W.bad = true;
              watchBar();
            }
          }
        });
      });
    }
    function watchBar() {
      if (!W.box) return;
      W.box.firstChild.textContent = tr('hWatch');
      var w = st.live && st.live.watch;
      var tvT = w ? tvNow(w) : 0;
      var b = function (label, aria, fn) {
        return el('button', {
          class: 'sh-btn',
          type: 'button',
          text: label,
          'aria-label': aria,
          on: { click: fn }
        });
      };
      clear(W.bar);
      W.bar.setAttribute('dir', 'ltr');
      [
        b('−10', tr('hBack10'), function () {
          cmd('hSync', 'seek:' + Math.max(0, tvT - 10).toFixed(1));
        }),
        w && !w.paused
          ? b('⏸', tr('hPause'), function () {
              cmd('hSync', 'pause:' + tvNow(w).toFixed(1));
            })
          : b('▶', tr('hPlay'), function () {
              cmd('hSync', 'play:' + (w ? tvNow(w) : 0).toFixed(1));
            }),
        b('+10', tr('hFwd10'), function () {
          cmd('hSync', 'seek:' + (tvT + 10).toFixed(1));
        }),
        b(tr('hSound'), tr('hSound'), function () {
          if (W.yt && W.ready) W.yt.unMute();
        }),
        b(tr('hWatchStop'), tr('hWatchStop'), function () {
          cmd('hSync', 'stop');
          watchClose();
        })
      ].forEach(function (x) {
        W.bar.appendChild(x);
      });
      W.msg.textContent = W.bad
        ? tr('hNoEmbed')
        : w && w.ad
          ? tr('hAdTv')
          : W.waiting
            ? tr('hWaitMe')
            : tr('hWatchNote');
    }
    function watchClose() {
      if (W.yt)
        try {
          W.yt.destroy();
        } catch (e) {}
      W.yt = null;
      W.id = '';
      W.waiting = false;
      if (W.box) W.box.style.display = 'none';
    }
    // the embedded player follows the TV; an ad (or a stall) here: the TV waits
    function watchFollow() {
      var w = st.live && st.live.watch;
      if (!w || st.phase !== 'on') return watchClose();
      watchStage(w.id);
      if (!W.ready || !W.yt) return watchBar();
      var p = W.yt;
      var tvT = tvNow(w);
      var mine = p.getCurrentTime ? p.getCurrentTime() : 0;
      var state = p.getPlayerState ? p.getPlayerState() : -1;
      if (w.ad || (w.paused && w.wait !== 'helper')) {
        if (state === 1) p.pauseVideo();
        if (!w.ad && Math.abs(mine - tvT) > 1) p.seekTo(tvT, true);
      } else if (w.on) {
        // expected to play: not moving for 2 s while playing or buffering
        // = an ad or a stall here
        var moving = W.lastT >= 0 && Math.abs(mine - W.lastT) > 0.2;
        W.lastT = mine;
        if (state === 1 || state === 3) W.stall = moving ? 0 : W.stall + 1;
        if (!W.waiting && W.stall >= 2 && state !== 2) {
          W.waiting = true;
          cmd('hSync', 'wait:' + tvT.toFixed(1));
        } else if (W.waiting && moving) {
          W.waiting = false;
          W.stall = 0;
          cmd('hSync', 'go:' + mine.toFixed(1));
        }
        if (!W.waiting) {
          if (state !== 1 && state !== 3) p.playVideo();
          if (Math.abs(mine - tvT) > 2.5) p.seekTo(tvT, true);
        }
      }
      watchBar();
    }
    setInterval(function () {
      if (W.yt && st.live && st.live.watch) watchFollow();
    }, 1000);

    /* remembered families (item 49) */
    st.pairs = [];
    st.incoming = null;
    function loadPairs() {
      return remAll('h').then(function (l) {
        st.pairs = l;
        draw();
      });
    }
    function remAccept(label) {
      var m = st.remAsk;
      st.remAsk = null;
      var C = crypt();
      C.newKeys().then(function (keys) {
        return remMake('h', keys, {
          id: m.id,
          name: label || '?',
          peerPub: m.pub,
          relay: relayOk(m.relay) ? m.relay : REM_RELAY,
          relIn: m.relIn,
          hlpIn: m.hlpIn
        }).then(function () {
          send({ t: 'rem2', id: m.id, pub: C.b64u(keys.pub) });
          st.msg = tr('hRemDone');
          loadPairs();
        });
      });
    }
    function remAskCard() {
      var nm = el('input', {
        type: 'text',
        dir: 'auto',
        maxlength: '40',
        'data-k': 'remName'
      });
      return el('div', { class: 'sh-card' }, [
        el('p', { class: 'sh-msg', text: tr('hRemAsk') }),
        el('label', { text: tr('hRemName') }),
        nm,
        el('div', { class: 'sh-btns' }, [
          btn(
            tr('hRemYes'),
            function () {
              remAccept(nm.value.replace(JUNK, '').trim().slice(0, 40));
            },
            'main'
          ),
          btn(tr('hRemNo'), function () {
            st.remAsk = null;
            draw();
          })
        ])
      ]);
    }
    // requests from remembered families, while this page waits
    function remPoll() {
      if (st.phase !== 'paste' || st.incoming || !st.pairs.length) return;
      st.pairs.forEach(function (p) {
        remRead(p, '10m').then(function (list) {
          list.forEach(function (x) {
            if (x.op === 'forget') remDel(p.id).then(loadPairs, function () {});
            else if (
              x.op === 'offer' &&
              typeof x.code === 'string' &&
              !st.incoming
            ) {
              st.incoming = { pair: p, code: x.code };
              draw();
            }
          });
        });
      });
    }
    setInterval(remPoll, 5000);
    function incomingCard() {
      var x = st.incoming;
      return el('div', { class: 'sh-card' }, [
        el('h2', { text: tr('hIncoming', { n: x.pair.name }) }),
        el('div', { class: 'sh-btns' }, [
          btn(
            tr('hHelpNow'),
            function () {
              st.incoming = null;
              st.viaPair = x.pair;
              makeAnswer(x.code);
            },
            'main'
          ),
          btn(tr('hRemNo'), function () {
            st.incoming = null;
            draw();
          })
        ])
      ]);
    }
    function pairsCard() {
      if (!st.pairs.length) return null;
      return el(
        'div',
        { class: 'sh-card' },
        [el('h2', { text: tr('hRemList') })].concat(
          st.pairs.map(function (p) {
            return el('div', { class: 'sh-set' }, [
              el('span', { dir: 'auto', text: p.name }),
              btn(tr('remForget', { n: '' }).trim(), function () {
                remSend(p, { op: 'forget' })
                  .catch(function () {})
                  .then(function () {
                    return remDel(p.id);
                  })
                  .then(loadPairs, loadPairs);
              })
            ]);
          }),
          [el('p', { class: 'sh-small', text: tr('hRemWait') })]
        )
      );
    }

    function watchCard() {
      var lv = st.live || {};
      var inp = el('input', {
        type: 'url',
        dir: 'ltr',
        'data-k': 'watch',
        placeholder: tr('hWatchLink')
      });
      return el('div', { class: 'sh-card' }, [
        el('h2', { text: tr('hWatch') }),
        el('p', { class: 'sh-small', text: tr('hWatchNote') }),
        lv.now
          ? el('div', { class: 'sh-btns' }, [
              btn(
                tr('hWatchTv'),
                function () {
                  cmd('hSync', 'open:' + lv.now.id);
                },
                'main'
              )
            ])
          : null,
        inp,
        el('div', { class: 'sh-btns' }, [
          btn(tr('hWatchStart'), function () {
            var id = idOf(inp.value);
            if (/^[\w-]{11}$/.test(id)) cmd('hSync', 'open:' + id);
          })
        ])
      ]);
    }

    function btn(label, fn, cls) {
      return el('button', {
        class: 'sh-btn' + (cls ? ' ' + cls : ''),
        type: 'button',
        text: label,
        on: { click: fn }
      });
    }
    function has(s) {
      return st.scopes.indexOf(s) >= 0;
    }

    function remoteCard() {
      var k = function (key, label, text) {
        return el('button', {
          class: 'sh-btn',
          type: 'button',
          'aria-label': label,
          text: text || label,
          on: {
            click: function () {
              cmd('hKey', key);
            }
          }
        });
      };
      return el('div', { class: 'sh-card' }, [
        el('h2', { text: tr('hRemote') }),
        el('div', { class: 'sh-pad', dir: 'ltr' }, [
          el('div', { class: 'sh-row' }, [k('up', tr('keyUp'), '▲')]),
          el('div', { class: 'sh-row' }, [
            k('left', tr('keyLeft'), '◀'),
            k('ok', tr('keyOk')),
            k('right', tr('keyRight'), '▶')
          ]),
          el('div', { class: 'sh-row' }, [k('down', tr('keyDown'), '▼')]),
          el('div', { class: 'sh-row' }, [
            k('back', tr('keyBack')),
            k('playpause', tr('keyPlay'), '⏯')
          ])
        ])
      ]);
    }

    function idOf(text) {
      var s = String(text || '').trim();
      var m = /[?&]list=([\w-]{10,64})/.exec(s);
      if (m) return m[1];
      m =
        /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/live\/|\/embed\/)([\w-]{11})/.exec(
          s
        );
      if (m) return m[1];
      if (/^[\w-]{11}$/.test(s) || /^(?:PL|OL|UU|FL|RD|LL)[\w-]{8,60}$/.test(s))
        return s;
      return '';
    }

    function queueCard() {
      var inp = el('input', {
        type: 'url',
        dir: 'ltr',
        'data-k': 'queue',
        placeholder: tr('hQueuePh')
      });
      var q = (st.live && st.live.queue) || [];
      return el('div', { class: 'sh-card' }, [
        el('h2', { text: tr('hQueue') }),
        inp,
        el('div', { class: 'sh-btns' }, [
          btn(
            tr('hAdd'),
            function () {
              var id = idOf(inp.value);
              if (!id) {
                st.msg = tr('badCode');
                return draw();
              }
              cmd('hQueue', id);
              inp.value = '';
            },
            'main'
          )
        ]),
        q.length
          ? el(
              'ol',
              {},
              q.map(function (x) {
                return el('li', { dir: 'auto', text: x.title || x.id });
              })
            )
          : null
      ]);
    }

    function settingsCard() {
      var list = (st.live && st.live.settings) || [];
      return el(
        'div',
        { class: 'sh-card' },
        [el('h2', { text: tr('hSettings') })].concat(
          list.map(function (o) {
            var ctl;
            if (o.type === 'bool') {
              ctl = el('input', { type: 'checkbox', 'aria-label': o.label });
              ctl.checked = !!o.v;
              ctl.addEventListener('change', function () {
                cmd('hSet', o.k + '=' + JSON.stringify(ctl.checked));
              });
            } else {
              ctl = el(
                'select',
                { 'aria-label': o.label },
                (o.opts || []).map(function (p, i) {
                  return el('option', { value: String(i), text: p[1] });
                })
              );
              (o.opts || []).forEach(function (p, i) {
                if (JSON.stringify(p[0]) === JSON.stringify(o.v))
                  ctl.value = String(i);
              });
              ctl.addEventListener('change', function () {
                var p = o.opts[Number(ctl.value)];
                if (p) cmd('hSet', o.k + '=' + JSON.stringify(p[0]));
              });
            }
            return el('div', { class: 'sh-set' }, [
              el('span', { dir: 'auto' }, [
                o.label,
                o.pin
                  ? el('span', { class: 'sh-small', text: ' · ' + tr('hPin') })
                  : null
              ]),
              ctl
            ]);
          })
        )
      );
    }

    function remindCard() {
      var text = el('input', {
        type: 'text',
        dir: 'auto',
        'data-k': 'remind',
        maxlength: '80',
        placeholder: tr('hRemindPh')
      });
      var at = el('input', {
        type: 'datetime-local',
        'data-k': 'remindAt',
        'aria-label': tr('hRemindAt')
      });
      return el('div', { class: 'sh-card' }, [
        el('h2', { text: tr('hRemind') }),
        text,
        el('label', { text: tr('hRemindAt') }),
        at,
        el('div', { class: 'sh-btns' }, [
          btn(
            tr('hRemindSet'),
            function () {
              // the helper's clock and zone: the TV gets an exact moment
              var when = at.value ? new Date(at.value).getTime() : 0;
              var t = text.value.replace(JUNK, ' ').replace(/\|/g, '/').trim();
              if (!(when > Date.now()) || !t) return;
              cmd('hRemind', when + '|' + t);
              text.value = '';
            },
            'main'
          )
        ])
      ]);
    }

    function draw() {
      var keep = {};
      var focus = document.activeElement;
      var fk = focus && box.contains(focus) ? focus.getAttribute('data-k') : '';
      Array.prototype.forEach.call(
        box.querySelectorAll('[data-k]'),
        function (x) {
          keep[x.getAttribute('data-k')] = x.value;
        }
      );
      drawNow();
      Array.prototype.forEach.call(
        box.querySelectorAll('[data-k]'),
        function (x) {
          var k = x.getAttribute('data-k');
          if (keep[k]) x.value = keep[k];
          if (k === fk) x.focus();
        }
      );
    }
    function drawNow() {
      clear(box);
      var card = el('section', { class: 'sh-card' }, [
        el('h2', { text: tr('hTitle') })
      ]);
      box.appendChild(card);
      if (st.error)
        card.appendChild(el('p', { class: 'sh-bad', text: st.error }));
      var p = st.phase;
      if (p === 'paste') {
        if (st.incoming) box.insertBefore(incomingCard(), card);
        var pc1 = pairsCard();
        if (pc1) box.appendChild(pc1);
        card.appendChild(el('label', { text: tr('hPaste') }));
        var ta = el('textarea', {
          class: 'sh-code',
          dir: 'ltr',
          rows: '4',
          'data-k': 'paste',
          autocomplete: 'off',
          spellcheck: 'false'
        });
        var fromLink = /[#&]o=([\w-]{60,600})/.exec(location.hash);
        if (fromLink) ta.value = 'ST1.' + fromLink[1];
        card.appendChild(ta);
        card.appendChild(el('label', { text: tr('hName') }));
        var nm = el('input', {
          type: 'text',
          dir: 'auto',
          maxlength: '40',
          value: name,
          'data-k': 'name',
          autocomplete: 'given-name'
        });
        card.appendChild(nm);
        card.appendChild(
          el('div', { class: 'sh-btns' }, [
            btn(
              tr('hMake'),
              function () {
                name = nm.value.replace(JUNK, '').trim().slice(0, 40);
                try {
                  root.localStorage.setItem(NAME_KEY, name);
                } catch (e) {}
                if (!findCode(ta.value)) {
                  st.error = tr('hAnswerFirst');
                  return draw();
                }
                makeAnswer(ta.value);
              },
              'main'
            )
          ])
        );
        card.appendChild(limitsNote());
        box.appendChild(networkCard());
        return;
      }
      if (p === 'making') {
        card.appendChild(el('p', { text: tr('making') }));
        return;
      }
      if (p === 'answer') {
        card.appendChild(el('p', { text: tr('hSendBack') }));
        card.appendChild(codeBox(st.answer));
        card.appendChild(codeButtons(st.answer));
        card.appendChild(el('p', { class: 'sh-small', text: tr('hWaiting') }));
        return;
      }
      if (p === 'check') {
        card.appendChild(el('p', { text: tr('check') }));
        card.appendChild(
          el('div', { class: 'sh-pics', text: st.pics.join(' ') })
        );
        card.appendChild(
          el('div', { class: 'sh-btns' }, [
            btn(
              tr('match'),
              function () {
                send({ t: 'sasok' });
                st.phase = 'waittv';
                draw();
              },
              'main'
            ),
            btn(
              tr('noMatch'),
              function () {
                send({ t: 'sasno' });
                end(tr('mismatch'));
              },
              'bad'
            )
          ])
        );
        return;
      }
      if (p === 'waittv') {
        card.appendChild(el('p', { class: 'sh-msg', text: tr('hWaitTv') }));
        return;
      }
      if (p === 'ended') {
        card.appendChild(el('p', { class: 'sh-msg', text: st.msg }));
        card.appendChild(
          el('div', { class: 'sh-btns' }, [
            btn(
              tr('again'),
              function () {
                st.phase = 'paste';
                st.msg = '';
                st.live = null;
                st.diag = '';
                location.hash = '#help';
                draw();
              },
              'main'
            )
          ])
        );
        return;
      }
      // on
      var names = ['sStatus'].concat(
        st.scopes.map(function (s) {
          return { keys: 'sKeys', set: 'sSet', fix: 'sFix' }[s];
        })
      );
      card.appendChild(
        el('p', { class: 'sh-msg', text: tr('hOn', { t: clock(st.until) }) })
      );
      card.appendChild(
        el('p', {
          class: 'sh-small',
          text: tr('hScopes', {
            s: names
              .filter(Boolean)
              .map(function (n) {
                return tr(n);
              })
              .join(langNow() === 'ar' ? '، ' : ', ')
          })
        })
      );
      if (st.msg)
        card.appendChild(
          el('p', { class: 'sh-small', dir: 'auto', text: st.msg })
        );
      var lv = st.live || {};
      var now = el('div', { class: 'sh-card' }, [
        el('h2', { text: tr('hNow') })
      ]);
      if (lv.lock)
        now.appendChild(el('p', { class: 'sh-bad', text: tr('hLock') }));
      if (lv.now)
        now.appendChild(
          el('p', { dir: 'auto' }, [
            el('strong', { text: lv.now.title || lv.now.id }),
            lv.now.author ? ' · ' + lv.now.author : '',
            lv.now.dur
              ? ' · ' +
                Math.floor(lv.now.t / 60) +
                ':' +
                ('0' + (lv.now.t % 60)).slice(-2)
              : ''
          ])
        );
      else
        now.appendChild(el('p', { class: 'sh-small', text: tr('hNothing') }));
      if (st.remAsk) box.appendChild(remAskCard());
      box.appendChild(now);
      if (has('keys')) {
        box.appendChild(remoteCard());
        if (!(lv.watch && lv.watch.id)) box.appendChild(watchCard());
        box.appendChild(queueCard());
      }
      if (has('set')) {
        box.appendChild(settingsCard());
        if (lv.remind) box.appendChild(remindCard());
      }
      if (has('fix') && lv.fix)
        box.appendChild(
          el('div', { class: 'sh-card' }, [
            btn(
              tr('hFix'),
              function () {
                cmd('hFix', '');
              },
              'main'
            )
          ])
        );
      if (st.diag)
        box.appendChild(
          el('div', { class: 'sh-card' }, [
            el('h2', { text: tr('hDiag') }),
            el('pre', { text: st.diag })
          ])
        );
      var ch = lv.changes || [];
      if (ch.length)
        box.appendChild(
          el('div', { class: 'sh-card' }, [
            el('h2', { text: tr('hChanges') }),
            el(
              'ul',
              {},
              ch.map(function (c) {
                return el('li', {
                  dir: 'auto',
                  text: c.v ? c.s + ': ' + c.v : c.s
                });
              })
            )
          ])
        );
      box.appendChild(
        el('div', { class: 'sh-btns' }, [
          btn(
            tr('end'),
            function () {
              cmd('hEnd', '');
              setTimeout(function () {
                end(tr('hEnded'));
              }, 400);
            },
            'bad'
          )
        ])
      );
    }

    // keeps the relay's idea of "the helper is here" fresh
    setInterval(function () {
      if (st.phase === 'on') send({ t: 'ping' });
    }, 20000);
    draw();
    loadPairs();
    return { redraw: draw };
  }

  /** Is this page opened as the helper's (#help or #o=)? */
  function isHelperUrl() {
    return /^#(?:help|o=)/.test(location.hash || '');
  }

  root.SofaHelp = Object.assign({}, pure, {
    canHelp: canHelp,
    mountRelative: mountRelative,
    mountHelper: mountHelper,
    isHelperUrl: isHelperUrl,
    strings: S
  });
})(typeof window !== 'undefined' ? window : globalThis);
