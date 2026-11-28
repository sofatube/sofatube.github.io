/*
 * One request of the TV's page over the data channel (home.js, away.js),
 * however big (0.9.7).
 *
 * A browser sends at most 256 KB in one data channel message (Chromium
 * refuses more whatever the TV's SDP says: "Trying to send message larger
 * than max-message-size"; tested 2026-11-28). A photo, a video or a live
 * part of a video (1 MB) from the page is bigger once in base64, so before
 * this a video from the remote app never reached the TV: the send threw, the
 * page waited for an answer that never came.
 *
 *   - a request of at most PIECE bytes (UTF-8) goes as it is, as before
 *     (older TVs understand nothing else);
 *   - a bigger one goes in pieces, in order on the one channel:
 *     {"pc": i, "of": n, "id": <request id>, "d": "<part i of the text>"};
 *     the TV joins them back into the request text
 *     (platform/webos/phone/service/rtc-pieces.js, YtxRtcPieces.java). A TV
 *     from before answers the first piece 404 (no path): the page says it
 *     failed instead of waiting;
 *   - pieces wait while the channel holds more than HIGH bytes (a browser
 *     closes a channel whose queue passes 16 MB, and a key pressed meanwhile
 *     waits behind what is queued); no more are sent once the answer came;
 *   - the time to wait for the answer starts when the last piece is on its
 *     way, not before (an 8 MB photo or video takes a while to send).
 */
(function () {
  'use strict';
  const PIECE = 240 * 1024; // under the 256 KB of every browser and TV
  const HIGH = 256 * 1024; // queued at most: a key goes out soon behind pieces
  const enc = new TextEncoder();

  /** The request text in parts that each fit one message. */
  function cut(id, text) {
    if (enc.encode(text).length <= PIECE) return [text];
    const parts = [];
    let at = 0;
    while (at < text.length) {
      let n = Math.min(text.length - at, PIECE - 256);
      let one;
      for (;;) {
        // never between the two halves of a character outside the BMP
        const c = text.charCodeAt(at + n - 1);
        if (at + n < text.length && c >= 0xd800 && c <= 0xdbff) n--;
        one = text.slice(at, at + n);
        // (escapes and non-ASCII text make a piece longer than its part)
        const size = enc.encode(JSON.stringify(one)).length;
        if (size <= PIECE - 128 || n < 2) break;
        n = Math.floor(n / 2);
      }
      parts.push(one);
      at += n;
    }
    return parts.map((d, i) =>
      JSON.stringify({ pc: i, of: parts.length, id, d })
    );
  }

  /** Waits until the channel holds at most HIGH bytes; false: it closed, or `left()` is over. */
  function drained(dc, left) {
    return new Promise((ok) => {
      if (dc.readyState !== 'open') return ok(false);
      if (dc.bufferedAmount <= HIGH) return ok(true);
      if (dc.bufferedAmountLowThreshold < HIGH)
        dc.bufferedAmountLowThreshold = HIGH;
      const done = (v) => {
        clearTimeout(t);
        dc.removeEventListener('bufferedamountlow', low);
        dc.removeEventListener('close', shut);
        ok(v);
      };
      const low = () => done(dc.readyState === 'open');
      const shut = () => done(false);
      const t = setTimeout(() => done(false), Math.max(0, left()));
      dc.addEventListener('bufferedamountlow', low);
      dc.addEventListener('close', shut);
    });
  }

  /**
   * Sends the messages of one request; true: all sent. It stops when
   * `left()` (ms) runs out, or `wanted()` is false (the answer came).
   */
  async function send(dc, msgs, left, wanted) {
    for (const m of msgs) {
      if (!wanted() || left() <= 0) return false;
      // eslint-disable-next-line no-await-in-loop
      if (msgs.length > 1 && !(await drained(dc, left))) return false;
      if (!wanted()) return false;
      try {
        dc.send(m);
      } catch {
        return false;
      }
    }
    return true;
  }

  /**
   * One request on the channel `me` ({dc, waiting, n}); resolves with the
   * TV's answer, or null (no channel, could not send, no answer in `ms`
   * after the last piece; the sending itself gets `ms` and 10 s a piece).
   * A TV from before pieces answers the first one 404: {error: 'update'}.
   */
  // (the TV's "no such address": rtcUrl, not a live part that is gone)
  const notFound = (m) => !!m.data && m.data.error === 'not found';

  function ask(me, msg, ms) {
    return new Promise((ok) => {
      if (!me || me.dc.readyState !== 'open') return ok(null);
      const id = me.n++;
      const msgs = cut(id, JSON.stringify(Object.assign({ id }, msg)));
      me.waiting[id] = (m) =>
        ok(
          msgs.length > 1 && m && m.code === 404 && notFound(m)
            ? Object.assign({}, m, { data: { error: 'update' } })
            : m
        );
      const give = () => {
        if (!me.waiting[id]) return;
        delete me.waiting[id];
        ok(null);
      };
      const per = me.perPiece || 10000; // (tests: shorter)
      const end = Date.now() + (ms || 20000) + msgs.length * per;
      const left = () => end - Date.now();
      const wanted = () => !!me.waiting[id];
      const t = setTimeout(give, left()); // the whole send, at most
      send(me.dc, msgs, left, wanted).then((s) => {
        clearTimeout(t);
        if (s) setTimeout(give, ms || 20000);
        else give();
      });
    });
  }

  self.sofaDcPieces = { ask, cut, PIECE };
})();
