/*
 * Sofa Tube "Control from away" (0.9.5, L41): the parent's phone app, part
 * of the installed Sofa Tube Home Screen app (sofatube.github.io/remote).
 *
 *   - pairing (at home, once): scan the TV's code (Kids -> Control from
 *     away -> Add a phone), the phone's key and Web Push subscription go
 *     to the TV sealed with the code's one-time secret, both show the same
 *     4 words, the parent confirms on the TV with OK and the PIN;
 *   - "Now": built by the TV when asked (never kept), with the commands:
 *     more time, lock now, turn off, a message, bedtime tonight, answers
 *     to the kids' requests;
 *   - the kids' requests arrive as Web Push from the TV itself (sw.js
 *     shows them);
 *   - an optional phone PIN in front of all this (this phone only).
 *
 * Keys are WebCrypto keys that can't be exported, kept in this app's
 * IndexedDB. The relay (ntfy.sh or the family's own) only ever carries
 * sealed envelopes (away-crypto.js). Nothing else leaves the phone.
 */
(function () {
  'use strict';
  const C = self.sofaAwayCrypto;
  const $ = (id) => document.getElementById(id);

  /* ---------------- text ---------------- */

  const T = {
    en: {
      title: 'Control from away',
      other: 'العربية',
      lockTitle: 'Phone PIN',
      lockBtn: 'Open',
      lockBad: 'Wrong PIN',
      installTitle: 'Open it from the Home Screen',
      installText:
        'Add Sofa Tube to the Home Screen first (iPhone: Share → Add to Home Screen; Android: menu → Install app), then open it from there and come back to Control from away. An iPhone keeps the Home Screen app’s data apart from Safari, so pairing must happen inside the installed app.',
      pairTitle: 'Pair with your TV (at home, once)',
      pairText:
        'On the TV: Settings → Kids → Control from away → Add a phone. Then scan the code here. Name this phone so the TV shows who it is.',
      namePh: 'This phone’s name (e.g. Mum)',
      scan: 'Scan the TV code',
      pairWith: 'Pair with {tv}',
      scanStop: 'Stop',
      scanNo:
        'This browser can’t use the camera here. Use the latest Chrome or Safari.',
      scanHow: 'Point the camera at the code on the TV.',
      scanBad: 'That is not a Sofa Tube TV code.',
      wordsText: 'Check that the TV shows the same 4 words:',
      wordsWait: 'Now press OK on the TV and enter the PIN there.',
      paired: 'Paired with {tv}',
      pairFail:
        'The TV did not answer. Is the TV on and connected to the internet?',
      nowTitle: 'Now',
      refresh: 'Refresh',
      asking: 'Asking the TV…',
      unreachable: 'The TV is not reachable now (off, or no internet).',
      since: 'Last answer: {t}',
      never: 'No answer yet',
      failSafe:
        'The rules (allowed hours, limits, allowed apps) keep working on the TV by themselves.',
      tvOn: 'TV',
      on: 'On',
      app: 'In front',
      sofa: 'Sofa Tube',
      other2: 'Another app',
      playing: 'Playing',
      used: 'Today',
      left: 'Allowed time left',
      bed: 'TV turns off',
      none: '—',
      min: '{n} min',
      of: '{a} of {b} min',
      blocked: 'Blocked app (asked)',
      reqsTitle: 'Requests',
      reqTime: 'Asks for more time',
      reqVideo: 'Asks to watch',
      reqApp: 'Asks for an app',
      yes: 'Allow',
      allowOnce: 'Once',
      allowToday: 'Allow today',
      no: 'Say no',
      cmdTitle: 'Do',
      moreLabel: 'More time (minutes)',
      lock: 'Lock now',
      off: 'Turn off the TV',
      offAsk: 'Turn the TV off now?',
      msgPh: 'A message on the TV',
      msgBtn: 'Send',
      bedLabel: 'Bedtime tonight',
      bedBtn: 'Set',
      done: 'Done',
      fail: 'Not done: {e}',
      eWholetv: 'turn on “Control the whole TV from the phone” on the TV first',
      eClosed: 'Sofa Tube is not open on the TV',
      eNoPlan: 'no kids rules on the TV yet',
      eUnsupported: 'this TV can’t show it',
      eTime: 'pick a time later today',
      eOther: 'the TV said no',
      setTitle: 'This phone',
      notifOn: 'Notifications: on (requests from the TV arrive here).',
      notifOff: 'Notifications: off. Turn them on to get the kids’ requests.',
      notifNo:
        'Notifications are not available here (iPhone: only in the Home Screen app, iOS 16.4 or newer).',
      notifBtn: 'Turn on notifications',
      pinSet: 'Set a phone PIN',
      pinChange: 'Remove the phone PIN',
      pinAsk: 'New phone PIN (4 to 8 digits)',
      pinDone: 'Phone PIN set',
      pinGone: 'Phone PIN removed',
      forget: 'Forget this TV',
      forgetAsk:
        'Forget this TV on this phone? Remove the phone on the TV too (Kids → Control from away).',
      help: 'How it works and the other ways to connect: ',
      helpLink: 'the guide',
      moved:
        'The TV changed its keys (a phone was removed). This phone follows by itself.'
    },
    ar: {
      title: 'التحكم من خارج المنزل',
      other: 'English',
      lockTitle: 'الرمز السري للهاتف',
      lockBtn: 'فتح',
      lockBad: 'الرمز غير صحيح',
      installTitle: 'افتحه من الشاشة الرئيسية',
      installText:
        'أضف صوفا تيوب إلى الشاشة الرئيسية أولًا (iPhone: مشاركة ثم إضافة إلى الشاشة الرئيسية؛ أندرويد: القائمة ثم تثبيت التطبيق)، ثم افتحه من هناك وعُد إلى «التحكم من خارج المنزل». يحفظ iPhone بيانات تطبيق الشاشة الرئيسية بمعزل عن Safari، لذا يجب الاقتران من داخل التطبيق المثبّت.',
      pairTitle: 'الاقتران بالتلفاز (في المنزل، مرة واحدة)',
      pairText:
        'على التلفاز: الإعدادات ثم الأطفال ثم «التحكم من خارج المنزل» ثم «إضافة هاتف». ثم امسح الرمز هنا. سمِّ هذا الهاتف ليعرف التلفاز صاحبه.',
      namePh: 'اسم هذا الهاتف (مثل: أمي)',
      scan: 'امسح رمز التلفاز',
      pairWith: 'الاقتران بـ {tv}',
      scanStop: 'إيقاف',
      scanNo:
        'لا يمكن لهذا المتصفح استخدام الكاميرا هنا. استخدم أحدث إصدار من Chrome أو Safari.',
      scanHow: 'وجّه الكاميرا نحو الرمز على التلفاز.',
      scanBad: 'هذا ليس رمز تلفاز صوفا تيوب.',
      wordsText: 'تأكّد من ظهور الكلمات الأربع نفسها على التلفاز:',
      wordsWait: 'اضغط الآن OK على التلفاز وأدخل الرمز السري هناك.',
      paired: 'تم الاقتران بـ {tv}',
      pairFail: 'لم يُجب التلفاز. هل التلفاز مشغّل ومتصل بالإنترنت؟',
      nowTitle: 'الآن',
      refresh: 'تحديث',
      asking: 'جارٍ سؤال التلفاز…',
      unreachable: 'لا يمكن الوصول إلى التلفاز الآن (مطفأ أو بلا إنترنت).',
      since: 'آخر رد: {t}',
      never: 'لا يوجد رد بعد',
      failSafe:
        'تبقى القواعد (الساعات المسموح بها والحدود والتطبيقات المسموح بها) سارية على التلفاز من تلقاء نفسها.',
      tvOn: 'التلفاز',
      on: 'مشغّل',
      app: 'المعروض الآن',
      sofa: 'صوفا تيوب',
      other2: 'تطبيق آخر',
      playing: 'قيد التشغيل',
      used: 'اليوم',
      left: 'الوقت المسموح المتبقي',
      bed: 'يُطفأ التلفاز',
      none: '—',
      min: '{n} دقيقة',
      of: '{a} من {b} دقيقة',
      blocked: 'تطبيق محظور (طُلب)',
      reqsTitle: 'الطلبات',
      reqTime: 'يطلب وقتًا إضافيًا',
      reqVideo: 'يطلب مشاهدة',
      reqApp: 'يطلب تطبيقًا',
      yes: 'سماح',
      allowOnce: 'مرة واحدة',
      allowToday: 'السماح اليوم',
      no: 'رفض',
      cmdTitle: 'الإجراءات',
      moreLabel: 'وقت إضافي (بالدقائق)',
      lock: 'القفل الآن',
      off: 'إطفاء التلفاز',
      offAsk: 'هل تريد إطفاء التلفاز الآن؟',
      msgPh: 'رسالة تظهر على التلفاز',
      msgBtn: 'إرسال',
      bedLabel: 'موعد النوم الليلة',
      bedBtn: 'تعيين',
      done: 'تم',
      fail: 'لم يتم: {e}',
      eWholetv: 'فعّل أولًا «التحكم في التلفاز كله من الهاتف» على التلفاز',
      eClosed: 'صوفا تيوب غير مفتوح على التلفاز',
      eNoPlan: 'لا توجد قواعد للأطفال على التلفاز بعد',
      eUnsupported: 'لا يمكن لهذا التلفاز عرضها',
      eTime: 'اختر وقتًا لاحقًا اليوم',
      eOther: 'رفض التلفاز الطلب',
      setTitle: 'هذا الهاتف',
      notifOn: 'الإشعارات: مفعّلة (تصل طلبات التلفاز إلى هنا).',
      notifOff: 'الإشعارات: غير مفعّلة. فعّلها لتصلك طلبات الأطفال.',
      notifNo:
        'الإشعارات غير متاحة هنا (iPhone: في تطبيق الشاشة الرئيسية فقط، iOS 16.4 أو أحدث).',
      notifBtn: 'تفعيل الإشعارات',
      pinSet: 'تعيين رمز سري للهاتف',
      pinChange: 'إزالة الرمز السري للهاتف',
      pinAsk: 'الرمز السري الجديد للهاتف (من 4 إلى 8 أرقام)',
      pinDone: 'تم تعيين الرمز السري للهاتف',
      pinGone: 'أُزيل الرمز السري للهاتف',
      forget: 'نسيان هذا التلفاز',
      forgetAsk:
        'هل تريد نسيان هذا التلفاز على هذا الهاتف؟ أزِل الهاتف من التلفاز أيضًا (الأطفال ثم «التحكم من خارج المنزل»).',
      help: 'طريقة العمل وطرق الاتصال الأخرى: ',
      helpLink: 'الدليل',
      moved: 'غيّر التلفاز مفاتيحه (أُزيل هاتف). ينتقل هذا الهاتف تلقائيًا.'
    }
  };
  let lang = 'en';
  function tr(k, v) {
    let s = (T[lang] && T[lang][k]) || T.en[k] || k;
    if (v)
      for (const x of Object.keys(v)) s = s.split('{' + x + '}').join(v[x]);
    return s;
  }

  /* ---------------- storage (IndexedDB: CryptoKeys stay non-extractable) ---------------- */

  function db() {
    return new Promise((ok, bad) => {
      const r = indexedDB.open('sofatube-away', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => bad(r.error);
    });
  }
  async function get(k) {
    const d = await db();
    return new Promise((ok) => {
      const q = d.transaction('kv').objectStore('kv').get(k);
      q.onsuccess = () => ok(q.result);
      q.onerror = () => ok(undefined);
    });
  }
  async function put(k, v) {
    const d = await db();
    return new Promise((ok) => {
      const tx = d.transaction('kv', 'readwrite');
      if (v === undefined) tx.objectStore('kv').delete(k);
      else tx.objectStore('kv').put(v, k);
      tx.oncomplete = () => ok();
      tx.onerror = () => ok();
    });
  }

  /* ---------------- the TV link ---------------- */

  let tv = null; // the paired TV (IndexedDB 'tv')
  let es = null; // EventSource on the outbox
  const waiting = {}; // counter -> resolve

  async function saveTv() {
    await put('tv', tv);
  }

  function status(text, cls) {
    const s = $('status');
    s.textContent = text || '';
    s.className = cls || '';
  }

  /** Opens one of our envelopes (to this phone), or null. */
  async function openEnv(text) {
    const env = C.peek(text);
    if (!env || env.to !== tv.phoneId) return null;
    const msg = await C.open(tv.t2p, tv.tvId, tv.outbox, env);
    if (!msg || C.check(msg, tv.inN, Date.now())) return null;
    tv.inN = msg.n;
    return msg;
  }

  async function onMessage(text) {
    const msg = await openEnv(text);
    if (!msg) return;
    if (msg.op === 'move') {
      // the TV's new key and topics (a phone was removed, or a new server)
      tv.relay = msg.r;
      tv.inbox = msg.i;
      tv.outbox = msg.o;
      tv.tvPub = C.unb64u(msg.k);
      const lk = await C.linkKeys(tv.priv, tv.tvPub, tv.tvId, tv.phoneId);
      tv.p2t = lk.p2t;
      tv.t2p = lk.t2p;
      await saveTv();
      status(tr('moved'));
      listen();
      return;
    }
    await saveTv();
    if (msg.op === 're' && waiting[msg.id]) {
      waiting[msg.id](msg);
      delete waiting[msg.id];
    }
    if (msg.op === 'paired' && waiting.paired) waiting.paired(msg);
  }

  /** Reads what waits on the outbox (moves), then listens. */
  async function catchUp() {
    try {
      const r = await fetch(`${tv.relay}/${tv.outbox}/json?poll=1&since=12h`, {
        cache: 'no-store'
      });
      const lines = (await r.text()).split('\n');
      for (const l of lines) {
        if (!l) continue;
        const ev = JSON.parse(l);
        // in order: a move must apply before what follows it
        // eslint-disable-next-line no-await-in-loop
        if (ev.event === 'message') await onMessage(ev.message);
      }
    } catch {
      /* offline: the stream tries */
    }
  }

  function listen() {
    if (es) es.close();
    es = new EventSource(`${tv.relay}/${tv.outbox}/sse`);
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.event === 'message') onMessage(ev.message);
      } catch {
        /* not ours */
      }
    };
  }

  async function post(body) {
    const r = await fetch(`${tv.relay}/${tv.inbox}`, {
      method: 'POST',
      body,
      headers: { Firebase: 'no' }
    });
    if (!r.ok) throw new Error('relay ' + r.status);
  }

  /** A command; its answer (or null after ms). */
  async function ask(msg, ms) {
    const now = Date.now();
    tv.outN = C.nextCounter(tv.outN, now);
    const n = tv.outN;
    await saveTv();
    const env = await C.seal(
      tv.p2t,
      tv.tvId,
      tv.phoneId,
      tv.inbox,
      msg,
      now,
      n
    );
    const got = new Promise((ok) => {
      waiting[n] = ok;
      setTimeout(() => {
        if (waiting[n]) {
          delete waiting[n];
          ok(null);
        }
      }, ms || 12000);
    });
    try {
      await post(env);
    } catch {
      delete waiting[n];
      return null;
    }
    const r = await got;
    if (r) {
      tv.lastOk = Date.now();
      await saveTv();
    }
    return r;
  }

  /* ---------------- pairing ---------------- */

  let scanStream = null;
  let scanTimer = null;
  function scanEnd() {
    clearTimeout(scanTimer);
    if (scanStream) for (const t of scanStream.getTracks()) t.stop();
    scanStream = null;
    $('scanbox').classList.add('hidden');
  }

  async function scan() {
    const md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) return status(tr('scanNo'), 'bad');
    let detector = null;
    try {
      if (window.BarcodeDetector)
        detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    } catch {
      detector = null;
    }
    if (!detector && !window.jsQR) return status(tr('scanNo'), 'bad');
    status(tr('scanHow'));
    try {
      scanStream = await md.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
    } catch {
      return status(tr('scanNo'), 'bad');
    }
    const v = $('scanvideo');
    v.srcObject = scanStream;
    $('scanbox').classList.remove('hidden');
    v.play().catch(() => {});
    const canvas = $('scancanvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const look = async () => {
      if (!scanStream) return;
      let text = '';
      try {
        if (detector) {
          const codes = await detector.detect(v);
          if (codes.length) text = codes[0].rawValue;
        } else if (v.videoWidth) {
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
          ctx.drawImage(v, 0, 0);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = window.jsQR(img.data, img.width, img.height);
          if (code) text = code.data;
        }
      } catch {
        /* next frame */
      }
      if (text) {
        const offer = C.readOffer(text);
        if (offer) {
          scanEnd();
          return pair(offer);
        }
        status(tr('scanBad'), 'bad');
      }
      scanTimer = setTimeout(look, 250);
    };
    look();
  }

  async function pushSub(vapidPub) {
    try {
      if (!('PushManager' in window) || !('serviceWorker' in navigator))
        return null;
      if (Notification.permission !== 'granted') {
        const p = await Notification.requestPermission();
        if (p !== 'granted') return null;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      // a subscription for another TV's key can't be used: a new one
      if (sub) {
        const k = sub.options && sub.options.applicationServerKey;
        if (!k || C.b64u(new Uint8Array(k)) !== C.b64u(vapidPub)) {
          await sub.unsubscribe();
          sub = null;
        }
      }
      if (!sub)
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPub
        });
      const j = sub.toJSON();
      return { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth };
    } catch {
      return null;
    }
  }

  async function pair(offer) {
    const name = ($('phone-name').value || '').trim().slice(0, 40) || 'Phone';
    const keys = await C.newKeys();
    const phoneId = 'ph_' + C.b64u(crypto.getRandomValues(new Uint8Array(16)));
    const push = await pushSub(offer.vapidPub);
    tv = {
      tvId: offer.tvId,
      name: offer.name || 'TV',
      relay: offer.relay,
      inbox: offer.inbox,
      outbox: offer.outbox,
      tvPub: offer.tvPub,
      vapidPub: offer.vapidPub,
      phoneId,
      priv: keys.priv,
      pub: keys.pub,
      outN: 0,
      inN: 0,
      lastOk: 0,
      paired: false
    };
    const lk = await C.linkKeys(keys.priv, offer.tvPub, offer.tvId, phoneId);
    tv.p2t = lk.p2t;
    tv.t2p = lk.t2p;
    listen();
    const now = Date.now();
    tv.outN = C.nextCounter(0, now);
    const env = await C.seal(
      await C.pairKey(offer.secret, offer.tvId),
      offer.tvId,
      phoneId,
      offer.inbox,
      { op: 'pair', pub: C.b64u(keys.pub), name, push },
      now,
      tv.outN,
      undefined,
      { p: 1 }
    );
    const idx = await C.wordIndexes(offer.tvPub, keys.pub, offer.secret);
    $('words').textContent = idx.map((i) => WORDS[lang][i]).join(' · ');
    $('words-box').classList.remove('hidden');
    $('scan').classList.add('hidden');
    status('');
    const paired = new Promise((ok) => {
      waiting.paired = ok;
      setTimeout(() => ok(null), 10 * 60 * 1000);
    });
    try {
      await post(env);
    } catch {
      return status(tr('pairFail'), 'bad');
    }
    const r = await paired;
    delete waiting.paired;
    if (!r) return status(tr('pairFail'), 'bad');
    tv.paired = true;
    tv.lastOk = Date.now();
    await saveTv();
    status(tr('paired', { tv: tv.name }), 'ok');
    show();
    refresh();
  }

  // the same 64 words as the TV (away-core.js), same order
  const WORDS = {
    en: 'apple bread camel door eagle fish garden house island jacket key lemon moon nest orange pencil queen river star tree umbrella violin window boat banana giraffe bird cloud desert egg flower grape horse bee juice ball lion milk night olive palm rain sea tiger train wolf book cake chair clock cup duck fire gold hat lamp mountain onion rose salt snow sun table whale'.split(
      ' '
    ),
    ar: 'تفاحة خبز جمل باب نسر سمكة حديقة بيت جزيرة سترة مفتاح ليمون قمر عش برتقال قلم ملكة نهر نجمة شجرة مظلة كمان نافذة قارب موز زرافة طائر غيمة صحراء بيضة زهرة عنب حصان نحلة عصير كرة أسد حليب ليل زيتون نخلة مطر بحر نمر قطار ذئب كتاب كعكة كرسي ساعة كوب بطة نار ذهب قبعة مصباح جبل بصل وردة ملح جليد شمس طاولة حوت'.split(
      ' '
    )
  };

  /* ---------------- Now ---------------- */

  function clock(t) {
    try {
      return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en', {
        hour: 'numeric',
        minute: '2-digit'
      }).format(new Date(t));
    } catch {
      return new Date(t).toLocaleTimeString();
    }
  }

  function row(dt, dd) {
    const a = document.createElement('dt');
    a.textContent = dt;
    const b = document.createElement('dd');
    b.textContent = dd;
    $('now').append(a, b);
  }

  function why(e) {
    return (
      {
        wholetv: tr('eWholetv'),
        closed: tr('eClosed'),
        'no plan': tr('eNoPlan'),
        unsupported: tr('eUnsupported'),
        time: tr('eTime')
      }[e] || tr('eOther')
    );
  }

  async function refresh() {
    status(tr('asking'));
    const r = await ask({ op: 'now' });
    $('now').textContent = '';
    if (!r) {
      status(tr('unreachable'), 'bad');
      $('now-note').textContent =
        (tv.lastOk ? tr('since', { t: clock(tv.lastOk) }) : tr('never')) +
        ' · ' +
        tr('failSafe');
      return;
    }
    status('');
    row(tr('tvOn'), tr('on'));
    row(tr('app'), r.sofa ? tr('sofa') : r.app ? r.app : tr('other2'));
    if (r.title) row(tr('playing'), r.title);
    if (typeof r.used === 'number')
      row(
        tr('used'),
        r.limit ? tr('of', { a: r.used, b: r.limit }) : tr('min', { n: r.used })
      );
    if (typeof r.hours === 'number') row(tr('left'), tr('min', { n: r.hours }));
    row(tr('bed'), r.off ? clock(r.off) : tr('none'));
    $('now-note').textContent = tr('since', { t: clock(Date.now()) });
    drawReqs(r);
  }

  function button(text, cls, fn) {
    const x = document.createElement('button');
    x.className = cls;
    x.textContent = text;
    x.onclick = fn;
    return x;
  }

  /*
   * What the kids asked: Sofa Tube's own requests (a video, more time on a
   * lock screen: answered on its page) and the whole TV's asks (a blocked
   * app, more TV time: "a12" ids, answered by the TV's family rules).
   */
  function drawReqs(r) {
    const box = $('reqs');
    box.textContent = '';
    const list = (r.reqs || []).map((q) => Object.assign({ page: true }, q));
    for (const q of r.asks || []) list.push(q);
    if (r.blocked && !list.some((q) => q.app === r.blocked))
      list.push({ kind: 'app', app: r.blocked });
    $('reqs-card').classList.toggle('hidden', !list.length);
    for (const q of list) {
      const d = document.createElement('div');
      d.className = 'req';
      const p = document.createElement('p');
      p.textContent =
        (q.kind === 'video'
          ? tr('reqVideo')
          : q.kind === 'app'
            ? tr('reqApp')
            : tr('reqTime')) +
        (q.title || q.app ? ': ' + (q.title || q.app) : '');
      const b = document.createElement('div');
      b.className = 'btns';
      if (q.kind === 'app') {
        b.append(
          button(tr('allowToday'), 'btn', () =>
            run({ op: 'app', app: q.app, yes: true, for: 'today', ask: q.id })
          ),
          button(tr('allowOnce'), 'btn ghost', () =>
            run({ op: 'app', app: q.app, yes: true, for: 'once', ask: q.id })
          ),
          button(tr('no'), 'btn ghost', () =>
            run({ op: 'app', app: q.app, yes: false, ask: q.id })
          )
        );
      } else if (q.kind === 'time' && !q.page) {
        // more time from the whole TV's alert: how much is the parent's call
        for (const m of [15, 30])
          b.append(button('+' + m, 'btn', () => run({ op: 'more', min: m })));
        b.append(
          button(tr('no'), 'btn ghost', () =>
            run({ op: 'answer', req: q.id, yes: false })
          )
        );
      } else {
        b.append(
          button(tr('yes'), 'btn', () =>
            run({ op: 'answer', req: q.id, yes: true })
          ),
          button(tr('no'), 'btn ghost', () =>
            run({ op: 'answer', req: q.id, yes: false })
          )
        );
      }
      for (const x of b.querySelectorAll('button'))
        if (/^\+\d/.test(x.textContent)) x.dir = 'ltr';
      d.append(p, b);
      box.append(d);
    }
  }

  async function run(msg) {
    status(tr('asking'));
    const r = await ask(msg);
    if (!r) return status(tr('unreachable'), 'bad');
    if (r.ok) status(tr('done'), 'ok');
    else status(tr('fail', { e: why(r.error) }), 'bad');
    setTimeout(refresh, 800);
  }

  /* ---------------- phone PIN (this phone only) ---------------- */

  async function pinHash(pin, salt) {
    const k = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(pin),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 200000 },
      k,
      256
    );
    return C.b64u(new Uint8Array(bits));
  }

  /* ---------------- screens ---------------- */

  function standalone() {
    return (
      (window.matchMedia &&
        window.matchMedia('(display-mode: standalone)').matches) ||
      navigator.standalone === true
    );
  }

  function show() {
    const paired = !!(tv && tv.paired);
    const iphone = /iPhone|iPad/.test(navigator.userAgent);
    $('install-card').classList.toggle(
      'hidden',
      paired || standalone() || !iphone
    );
    $('pair-card').classList.toggle('hidden', paired);
    for (const id of ['now-card', 'cmd-card'])
      $(id).classList.toggle('hidden', !paired);
    $('set-card').classList.remove('hidden');
    $('forget').classList.toggle('hidden', !paired);
    drawNotif();
  }

  async function drawNotif() {
    const can = 'Notification' in window && 'PushManager' in window;
    const on = can && Notification.permission === 'granted';
    $('notif-state').textContent = !can
      ? tr('notifNo')
      : on
        ? tr('notifOn')
        : tr('notifOff');
    $('notif').classList.toggle('hidden', !can || on || !(tv && tv.paired));
    $('pin-set').textContent = (await get('pin'))
      ? tr('pinChange')
      : tr('pinSet');
  }

  function texts() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = 'Sofa Tube · ' + tr('title');
    $('manifest').href =
      lang === 'ar' ? 'manifest-ar.webmanifest' : 'manifest.webmanifest';
    const set = (id, k) => ($(id).textContent = tr(k));
    set('title', 'title');
    set('lang', 'other');
    set('lock-title', 'lockTitle');
    set('lock-btn', 'lockBtn');
    set('install-title', 'installTitle');
    set('install-text', 'installText');
    set('pair-title', 'pairTitle');
    set('pair-text', 'pairText');
    $('phone-name').placeholder = tr('namePh');
    set('scan', 'scan');
    set('scan-stop', 'scanStop');
    set('words-text', 'wordsText');
    set('words-wait', 'wordsWait');
    set('now-title', 'nowTitle');
    set('refresh', 'refresh');
    set('reqs-title', 'reqsTitle');
    set('cmd-title', 'cmdTitle');
    set('more-label', 'moreLabel');
    set('lock', 'lock');
    set('off', 'off');
    $('msg').placeholder = tr('msgPh');
    set('msg-btn', 'msgBtn');
    set('bed-label', 'bedLabel');
    set('bed-btn', 'bedBtn');
    set('set-title', 'setTitle');
    set('notif', 'notifBtn');
    set('forget', 'forget');
    const help = $('help');
    help.textContent = tr('help');
    const a = document.createElement('a');
    a.href = 'away-help.html' + (lang === 'ar' ? '#lang=ar' : '');
    a.textContent = tr('helpLink');
    help.append(a);
  }

  async function unlocked() {
    tv = (await get('tv')) || null;
    $('lock-card').classList.add('hidden');
    show();
    if (tv && tv.paired) {
      await catchUp();
      listen();
      refresh();
    }
  }

  async function start() {
    const saved = await get('lang');
    const fromHash = /[#&]lang=(ar|en)/.exec(location.hash);
    lang =
      (fromHash && fromHash[1]) ||
      saved ||
      (/^ar/i.test(navigator.language) ? 'ar' : 'en');
    texts();
    if ('serviceWorker' in navigator)
      navigator.serviceWorker.register('sw.js').catch(() => {});
    $('lang').onclick = async () => {
      lang = lang === 'ar' ? 'en' : 'ar';
      await put('lang', lang);
      texts();
      show();
    };
    $('scan').onclick = scan;
    $('scan-stop').onclick = scanEnd;
    $('refresh').onclick = refresh;
    document.querySelectorAll('[data-more]').forEach((b) => {
      b.onclick = () => run({ op: 'more', min: Number(b.dataset.more) });
    });
    $('lock').onclick = () => run({ op: 'lock' });
    $('off').onclick = () => {
      if (confirm(tr('offAsk'))) run({ op: 'off' });
    };
    $('msg-form').onsubmit = (e) => {
      e.preventDefault();
      const text = $('msg').value.trim();
      if (text) run({ op: 'msg', text }).then(() => ($('msg').value = ''));
    };
    $('bed-form').onsubmit = (e) => {
      e.preventDefault();
      const m = /^(\d{1,2}):(\d{2})$/.exec($('bed').value);
      if (!m) return;
      const d = new Date();
      d.setHours(Number(m[1]), Number(m[2]), 0, 0);
      if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1); // after midnight
      run({ op: 'bed', at: d.getTime() });
    };
    $('notif').onclick = async () => {
      const push = tv && (await pushSub(tv.vapidPub));
      drawNotif();
      // the TV keeps this phone's new subscription (sealed, as any message)
      if (push) run({ op: 'push', push });
    };
    $('pin-set').onclick = async () => {
      if (await get('pin')) {
        await put('pin', undefined);
        status(tr('pinGone'), 'ok');
      } else {
        const pin = (prompt(tr('pinAsk')) || '').trim();
        if (!/^\d{4,8}$/.test(pin)) return;
        const salt = crypto.getRandomValues(new Uint8Array(16));
        await put('pin', { salt, hash: await pinHash(pin, salt) });
        status(tr('pinDone'), 'ok');
      }
      drawNotif();
    };
    $('forget').onclick = async () => {
      if (!confirm(tr('forgetAsk'))) return;
      if (es) es.close();
      await put('tv', undefined);
      tv = null;
      show();
    };
    // a pairing link opened straight (the phone's camera app)
    const offer = C.readOffer(location.hash);
    const pin = await get('pin');
    if (pin) {
      $('lock-card').classList.remove('hidden');
      $('lock-form').onsubmit = async (e) => {
        e.preventDefault();
        if ((await pinHash($('lock-pin').value, pin.salt)) !== pin.hash)
          return status(tr('lockBad'), 'bad');
        $('lock-pin').value = '';
        status('');
        await unlocked();
        if (offer && !(tv && tv.paired)) usePairLink(offer);
      };
      return;
    }
    await unlocked();
    if (offer && !(tv && tv.paired)) usePairLink(offer);
  }

  // a pairing link opened straight: one tap pairs (notifications need a tap)
  function usePairLink(offer) {
    history.replaceState(null, '', location.pathname);
    $('scan').textContent = tr('pairWith', { tv: offer.name || 'TV' });
    $('scan').onclick = () => {
      $('scan').onclick = scan;
      $('scan').textContent = tr('scan');
      pair(offer);
    };
  }

  start();
})();
