/*
 * 0.9.7: the light or dark look of the remote pages (index.html, away.html),
 * as on the TV's phone page (its sun button, platform/webos/phone/src/app/
 * 11-basics.js): the phone's own setting (prefers-color-scheme) until the
 * person taps; the choice is kept on this phone (localStorage 'ytx-theme').
 * The page's <head> puts a kept choice on <html> before the first paint;
 * this file draws the button (#theme) and switches. The TV's page in the
 * sandboxed frame (tv-frame.js) keeps its own look.
 */
(function () {
  const KEY = 'ytx-theme';
  const LABEL = {
    en: 'Light or dark look',
    ar: 'المظهر الفاتح أو الداكن'
  };
  const ICON = {
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5',
    moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z'
  };
  const root = document.documentElement;

  function current() {
    const t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  // the colour of the phone's bar follows the page's look
  function barColour() {
    const c = current() === 'dark' ? '#170e08' : '#fbf4e8';
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    for (let i = 0; i < metas.length; i++) metas[i].setAttribute('content', c);
  }

  function draw() {
    const b = document.getElementById('theme');
    if (!b) return;
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(ns, 'path');
    // the sun in dark (tap: light), the moon in light (tap: dark)
    p.setAttribute('d', current() === 'dark' ? ICON.sun : ICON.moon);
    s.appendChild(p);
    while (b.firstChild) b.removeChild(b.firstChild);
    b.appendChild(s);
    const label = root.lang === 'ar' ? LABEL.ar : LABEL.en;
    b.setAttribute('aria-label', label);
    b.title = label;
  }

  function set(t) {
    root.setAttribute('data-theme', t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      // a private window: the look for this visit only
    }
    draw();
    barColour();
  }

  const btn = document.getElementById('theme');
  if (btn)
    btn.addEventListener('click', function () {
      set(current() === 'dark' ? 'light' : 'dark');
    });
  // no choice yet: the phone's setting, also when it changes
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const follow = function () {
      draw();
      barColour();
    };
    if (mq.addEventListener) mq.addEventListener('change', follow);
    else if (mq.addListener) mq.addListener(follow);
  }
  // the label in the page's language (the pages set <html lang>)
  if (window.MutationObserver)
    new MutationObserver(draw).observe(root, {
      attributes: true,
      attributeFilter: ['lang']
    });
  draw();
  barColour();
})();
