/*
 * Sofa Tube "Find my TV" app: the link that YouTube (or any app) shares
 * through Android's Share menu (the manifest's share_target) -> the video
 * to send to the TV. The share brings up to three fields (title, text,
 * url); YouTube puts its link in "text", other apps in "url", some only
 * in "title" or in a sentence around the link.
 *
 * sofaShareLink({title, text, url}) -> {v, list, t} or null
 *   v     the video id (11 characters), '' for a playlist on its own
 *   list  the playlist id, or ''
 *   t     the start in seconds (0: from the start)
 * sofaSendHash(link) -> "send=<v>&list=<list>&t=<t>" (empty parts left
 *   out): what goes after # in the TV's phone page address (never in the
 *   query, so it never reaches a server).
 *
 * Plain script (no modules): the page loads it with <script src>, and
 * tools/tests/share-link-test.mjs runs it in a Node vm.
 */
(function (root) {
  'use strict';
  const ID = /^[\w-]{11}$/;
  const LIST = /^[\w-]{2,64}$/;
  const HOST =
    /^(?:[\w-]+\.)*(?:youtube\.com|youtube-nocookie\.com|youtu\.be)$/i;

  /** "90", "90s", "1m30s", "1h2m3s", "01:30" -> seconds (0 if none) */
  function seconds(s) {
    s = String(s || '').trim();
    let m = /^(\d{1,6})s?$/.exec(s);
    if (m) return Number(m[1]);
    m = /^(?:(\d{1,3})h)?(?:(\d{1,4})m)?(?:(\d{1,6})s)?$/.exec(s);
    if (m && (m[1] || m[2] || m[3]))
      return (
        Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)
      );
    m = /^(?:(\d{1,3}):)?(\d{1,2}):(\d{2})$/.exec(s);
    if (m) return Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    return 0;
  }

  function query(search) {
    const out = {};
    String(search || '')
      .replace(/^[?#]/, '')
      .split('&')
      .forEach((kv) => {
        const i = kv.indexOf('=');
        if (i <= 0) return;
        const k = kv.slice(0, i);
        if (k in out) return; // the first one counts
        try {
          out[k] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' '));
        } catch {
          out[k] = '';
        }
      });
    return out;
  }

  /** One URL (a string) -> {v, list, t} or null */
  function fromUrl(text, depth) {
    let s = String(text || '').trim();
    if (!/^[a-z][\w+.-]*:\/\//i.test(s)) s = 'https://' + s;
    const m =
      /^https?:\/\/([^/?#:]+)(?::\d+)?(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i.exec(s);
    if (!m || !HOST.test(m[1])) return null;
    const host = m[1].toLowerCase();
    const path = m[2] || '/';
    const q = query(m[3]);
    const h = query(m[4]); // e.g. #t=30
    let v = '';
    if (/(?:^|\.)youtu\.be$/.test(host)) {
      v = path.split('/')[1] || '';
    } else {
      const p = /^\/(?:shorts|live|embed|[ev])\/([^/]+)/.exec(path);
      if (p) v = p[1];
      else if (/^\/watch\/?$/.test(path) || /^\/tv\/?$/.test(path))
        v = q.v || '';
      else if (/^\/attribution_link\/?$/.test(path) && q.u && depth < 2)
        return fromUrl('https://www.youtube.com' + q.u, depth + 1);
      else if (!/^\/playlist\/?$/.test(path)) v = q.v || '';
    }
    if (v && !ID.test(v)) return null;
    const list = q.list && LIST.test(q.list) ? q.list : '';
    if (!v && !list) return null;
    const t = v ? seconds(q.t || q.start || q.time_continue || h.t || '') : 0;
    return { v, list, t };
  }

  /** The first YouTube link in a field (a whole URL or a sentence) */
  function fromField(text) {
    const s = String(text || '');
    if (!s.trim()) return null;
    const whole = fromUrl(s, 0);
    if (whole) return whole;
    const re =
      /(?<![\w.-])(?:https?:\/\/)?(?:[\w-]+\.)*(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\/[^\s<>"'«»“”]*/gi;
    let m;
    while ((m = re.exec(s))) {
      // a sentence's last mark is not part of the link
      const r = fromUrl(m[0].replace(/[.,;:!?)\]]+$/, ''), 0);
      if (r) return r;
    }
    return null;
  }

  function sofaShareLink(shared) {
    const f = shared || {};
    return fromField(f.url) || fromField(f.text) || fromField(f.title) || null;
  }

  function sofaSendHash(link) {
    if (!link) return '';
    return (
      'send=' +
      (link.v || '') +
      (link.list ? '&list=' + link.list : '') +
      (link.t > 0 ? '&t=' + Math.floor(link.t) : '')
    );
  }

  root.sofaShareLink = sofaShareLink;
  root.sofaSendHash = sofaSendHash;
})(typeof window === 'undefined' ? globalThis : window);
