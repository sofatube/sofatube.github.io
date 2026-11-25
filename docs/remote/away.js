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
        'On the TV: Settings → Control from away → Add a phone. Then scan the code here. Name this phone so the TV shows who it is.',
      namePh: 'This phone’s name (e.g. Mum)',
      scan: 'Scan the TV code',
      pairWith: 'Pair with {tv}',
      scanStop: 'Stop',
      scanNo:
        'This browser can’t use the camera here. Use the latest Chrome or Safari.',
      scanHow: 'Point the camera at the code on the TV.',
      scanBad: 'That is not a Sofa Tube TV code.',
      wordsText: 'Check that the TV shows the same 4 words:',
      wordsWait:
        'Now press OK on the TV and enter the PIN there. If the TV shows other words, cancel: press Back on the TV.',
      paired: 'Paired with {tv}',
      pairSlow:
        "The TV hasn't answered yet. If it doesn't show these 4 words: make sure the code on the TV is a fresh one, and that the TV's date and time are right.",
      pairFail:
        'The TV did not answer. Is the TV on and connected to the internet?',
      nowTitle: 'Now',
      refresh: 'Refresh',
      // the whole phone page from away, over the direct channel (P2P)
      fullOpen: 'Open the full remote',
      fullTrying: 'Connecting straight to the TV…',
      fullOn: 'Full remote · straight to the TV, encrypted',
      fullRelay: 'Full remote · through your relay, encrypted end to end',
      fullNo:
        'This network blocks a direct connection to the TV, so the full remote can’t open here. The simple view below still works.',
      fullNoTv:
        'The TV did not answer the request for the full remote. The simple view below still works.',
      fullNoRelay:
        'The full remote could not connect here, not even through your relay. Check the relay details under “This phone”. The simple view below still works.',
      fullMapOff:
        'Tip: on the TV, turn on “Open a port on the home router for away access” (Settings → Phone remote): then more networks connect directly.',
      fullMapCgnat:
        'Your home internet shares one public address with other homes, so the TV can’t open a port on it.',
      fullTips:
        'For the full remote on this network: Tailscale, if your family uses it (see the guide below), or your own relay (This phone → Relay, advanced).',
      relayTitle: 'Relay for hard networks (advanced)',
      relayText:
        'Only needed if the full remote does not connect on some networks. Enter your own TURN relay server (for example your own coturn, or a free Metered or Cloudflare account). Kept only on this phone; the TV needs nothing. The relay sees addresses and how much data passes, never what you watch or press: the connection is end-to-end encrypted.',
      relayUrl: 'Relay address (turn: or turns:)',
      relayUser: 'Username',
      relayPass: 'Password (credential)',
      relayKeep: 'Saved (leave empty to keep it)',
      relaySave: 'Save the relay',
      relayRemove: 'Remove the relay',
      relaySaved: 'Relay saved on this phone.',
      relayGone: 'Relay removed.',
      relayBad:
        'The address must start with turn: or turns: and needs a username and a password.',
      relayIs: 'Relay on this phone: {h}',
      fullNoBrowser:
        'This browser can’t open the full remote from away: the simple view below still works.',
      fullSimple: 'Simple view',
      fullLost: 'The direct connection ended: the simple view works.',
      fullAgain: 'The direct connection dropped: connecting again…',
      asking: 'Asking the TV…',
      unreachable: 'The TV is not reachable now (off, or no internet).',
      relayBusy:
        'The free message server (ntfy.sh) is busy for this internet connection now (its daily limit). Try again later, or from another network.',
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
      help: 'How it works and the other ways to connect: ',
      helpLink: 'the guide',
      moved:
        'The TV changed its keys (a phone was removed). This phone follows by itself.',
      // 0.9.7: more than one TV, and pairing without the camera
      tvsTitle: 'Your TVs',
      tvsPick: 'Which TV? Tap Open next to it.',
      tvOpen: 'Open',
      tvIsOpen: 'Open now',
      tvRename: 'Rename',
      tvRenameAsk: 'A name for this TV on this phone (e.g. Grandma’s TV)',
      tvRemove: 'Remove',
      tvRemoveAsk:
        'Remove “{tv}” from this phone? Your other TVs stay. Remove this phone on that TV too (Settings → Control from away).',
      tvAdd: '+ Add a TV',
      tvsFull: 'This phone already has 6 TVs. Remove one first.',
      tvRemoved:
        'This phone was removed on “{tv}”, so it can’t control that TV from away any more. To use it again: on the TV open Settings → Control from away → Add a phone.',
      tvRemovedShort: 'Removed on the TV',
      tvLast: 'Last answer {t}',
      tvNever: 'No answer yet',
      pairAddTitle: 'Add a TV',
      pairAnyText:
        'On the TV: Settings → Control from away → Add a phone. Then scan the code here, or type the number the TV shows: someone at the TV can read it to you on a call. Name this phone so the TV shows who it is.',
      pairCancel: 'Cancel',
      codeOpen: 'Type the TV number',
      codeLabel:
        'The 12-digit number under the code on the TV (or a pairing link someone sent you):',
      codeBtn: 'Pair',
      codeBad: 'Check the number: it has 12 digits, as on the TV.',
      codeLooking: 'Looking for the TV with this number…',
      codeNone:
        'No TV is waiting with this number. Check it, or press OK on the TV for a new one: a number works for 10 minutes.',
      wordsFar:
        'TV in another home? Read these words to the person at the TV: they press OK there and enter the PIN only if the TV shows the same words.',
      shareLink: 'Send this to another phone',
      shareText:
        'Sofa Tube: pair your phone with the TV (this link works for 10 minutes)',
      shareCopied:
        'Link copied. Send it in a message: it works for 10 minutes, and the TV still asks for OK and the PIN.',
      fullTvs: 'TVs'
    },
    ar: {
      title: 'التحكم من خارج المنزل',
      other: 'English',
      lockTitle: 'الرمز السري للهاتف',
      lockBtn: 'فتح',
      lockBad: 'الرمز غير صحيح',
      installTitle: 'افتحه من الشاشة الرئيسية',
      installText:
        'أضف صوفا تيوب إلى الشاشة الرئيسية أولًا (iPhone: مشاركة ثم إضافة إلى الشاشة الرئيسية؛ Android: القائمة ثم تثبيت التطبيق)، ثم افتحه من هناك وعُد إلى «التحكم من خارج المنزل». يحفظ iPhone بيانات تطبيق الشاشة الرئيسية بمعزل عن Safari، لذا يجب الاقتران من داخل التطبيق المثبّت.',
      pairTitle: 'الاقتران بالتلفاز (في المنزل، مرة واحدة)',
      pairText:
        'على التلفاز: الإعدادات ثم «التحكم من خارج المنزل» ثم «إضافة هاتف». ثم امسح الرمز هنا. سمِّ هذا الهاتف ليعرف التلفاز صاحبه.',
      namePh: 'اسم هذا الهاتف (مثل: أمي)',
      scan: 'امسح رمز التلفاز',
      pairWith: 'الاقتران بـ {tv}',
      scanStop: 'إيقاف',
      scanNo:
        'لا يمكن لهذا المتصفح استخدام الكاميرا هنا. استخدم أحدث إصدار من Chrome أو Safari.',
      scanHow: 'وجّه الكاميرا نحو الرمز على التلفاز.',
      scanBad: 'هذا ليس رمز تلفاز صوفا تيوب.',
      wordsText: 'تأكّد من ظهور الكلمات الأربع نفسها على التلفاز:',
      wordsWait:
        'اضغط الآن OK على التلفاز وأدخل الرمز السري هناك. وإذا ظهرت على التلفاز كلمات أخرى، فألغِ الاقتران بزر الرجوع.',
      paired: 'تم الاقتران بـ {tv}',
      pairSlow:
        'لم يُجب التلفاز بعد. إن لم تظهر عليه هذه الكلمات الأربع، فتأكّد من أن الرمز على التلفاز جديد، ومن صحة تاريخ التلفاز ووقته.',
      pairFail: 'لم يُجب التلفاز. هل التلفاز مشغّل ومتصل بالإنترنت؟',
      nowTitle: 'الآن',
      refresh: 'تحديث',
      fullOpen: 'افتح جهاز التحكم الكامل',
      fullTrying: 'جارٍ الاتصال بالتلفاز مباشرة…',
      fullOn: 'جهاز التحكم الكامل · اتصال مباشر ومشفّر بالتلفاز',
      fullRelay:
        'جهاز التحكم الكامل · عبر خادم الترحيل الخاص بك، مشفّر من طرف إلى طرف',
      fullNo:
        'تمنع هذه الشبكة الاتصال المباشر بالتلفاز، لذا لا يمكن فتح جهاز التحكم الكامل هنا. العرض البسيط أدناه ما زال يعمل.',
      fullNoTv:
        'لم يُجب التلفاز عن طلب جهاز التحكم الكامل. العرض البسيط أدناه ما زال يعمل.',
      fullNoRelay:
        'تعذّر اتصال جهاز التحكم الكامل هنا، حتى عبر خادم الترحيل الخاص بك. راجع بيانات خادم الترحيل في «هذا الهاتف». العرض البسيط أدناه ما زال يعمل.',
      fullMapOff:
        'تلميح: فعّل على التلفاز «فتح منفذ على راوتر المنزل للوصول من خارج المنزل» (الإعدادات ثم «جهاز التحكم من الهاتف»): عندها تتصل شبكات أكثر مباشرة.',
      fullMapCgnat:
        'يتشارك إنترنت منزلك عنوانًا عامًا واحدًا مع منازل أخرى، لذا لا يستطيع التلفاز فتح منفذ عليه.',
      fullTips:
        'لجهاز التحكم الكامل على هذه الشبكة: Tailscale إن كانت عائلتك تستخدمه (انظر الدليل أدناه)، أو خادم ترحيل خاص بك («هذا الهاتف» ثم «خادم ترحيل»، متقدّم).',
      relayTitle: 'خادم ترحيل للشبكات الصعبة (متقدّم)',
      relayText:
        'لا تحتاج إليه إلا إذا لم يتصل جهاز التحكم الكامل على بعض الشبكات. أدخل خادم ترحيل \u2066TURN\u2069 خاصًا بك (مثل \u2066coturn\u2069 الخاص بك، أو حساب مجاني في \u2066Metered\u2069 أو \u2066Cloudflare\u2069). يُحفظ على هذا الهاتف فقط، ولا يحتاج التلفاز إلى شيء. يرى خادم الترحيل العناوين ومقدار البيانات، ولا يرى أبدًا ما تشاهده أو تضغطه: الاتصال مشفّر من طرف إلى طرف.',
      relayUrl: 'عنوان خادم الترحيل (\u2066turn:\u2069 أو \u2066turns:\u2069)',
      relayUser: 'اسم المستخدم',
      relayPass: 'كلمة المرور',
      relayKeep: 'محفوظة (اتركها فارغة لإبقائها)',
      relaySave: 'حفظ خادم الترحيل',
      relayRemove: 'إزالة خادم الترحيل',
      relaySaved: 'حُفظ خادم الترحيل على هذا الهاتف.',
      relayGone: 'أُزيل خادم الترحيل.',
      relayBad:
        'يجب أن يبدأ العنوان بـ \u2066turn:\u2069 أو \u2066turns:\u2069، ويلزمه اسم مستخدم وكلمة مرور.',
      relayIs: 'خادم الترحيل على هذا الهاتف: {h}',
      fullNoBrowser:
        'لا يستطيع هذا المتصفح فتح جهاز التحكم الكامل من خارج المنزل: العرض البسيط أدناه ما زال يعمل.',
      fullSimple: 'العرض البسيط',
      fullLost: 'انتهى الاتصال المباشر: العرض البسيط يعمل.',
      fullAgain: 'انقطع الاتصال المباشر، جارٍ الاتصال من جديد…',
      asking: 'جارٍ سؤال التلفاز…',
      unreachable: 'لا يمكن الوصول إلى التلفاز الآن (مطفأ أو بلا إنترنت).',
      relayBusy:
        'خادم الرسائل المجاني (ntfy.sh) مشغول الآن لاتصال الإنترنت هذا (بلغ حدّه اليومي). حاول مرة أخرى لاحقًا، أو من شبكة أخرى.',
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
      // Arabic number agreement (docs/ARABIC.md, arCount in src/config.js)
      min: (v) => arMinutes(v.n),
      of: (v) => v.a + ' من ' + arMinutes(v.b, true),
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
      help: 'طريقة العمل وطرق الاتصال الأخرى: ',
      helpLink: 'الدليل',
      moved: 'غيّر التلفاز مفاتيحه (أُزيل هاتف). ينتقل هذا الهاتف تلقائيًا.',
      tvsTitle: 'أجهزة التلفاز',
      tvsPick: 'أي تلفاز؟ اضغط «فتح» بجانبه.',
      tvOpen: 'فتح',
      tvIsOpen: 'مفتوح الآن',
      tvRename: 'إعادة التسمية',
      tvRenameAsk: 'اسم لهذا التلفاز على هذا الهاتف (مثل: تلفاز الجدة)',
      tvRemove: 'إزالة',
      tvRemoveAsk:
        'هل تريد إزالة «{tv}» من هذا الهاتف؟ تبقى أجهزة التلفاز الأخرى. أزِل هذا الهاتف من ذلك التلفاز أيضًا (الإعدادات ثم «التحكم من خارج المنزل»).',
      tvAdd: '+ إضافة تلفاز',
      tvsFull: 'على هذا الهاتف 6 أجهزة تلفاز. أزِل واحدًا منها أولًا.',
      tvRemoved:
        'أُزيل هذا الهاتف من «{tv}»، فلم يعد يتحكم في ذلك التلفاز من خارج المنزل. لاستخدامه من جديد افتح على التلفاز: الإعدادات ثم «التحكم من خارج المنزل» ثم «إضافة هاتف».',
      tvRemovedShort: 'أُزيل هذا الهاتف من التلفاز',
      tvLast: 'آخر رد {t}',
      tvNever: 'لا يوجد رد بعد',
      pairAddTitle: 'إضافة تلفاز',
      pairAnyText:
        'على التلفاز: الإعدادات ثم «التحكم من خارج المنزل» ثم «إضافة هاتف». ثم امسح الرمز هنا، أو اكتب الرقم الظاهر على التلفاز: يمكن لمن عند التلفاز أن يقرأه لك في مكالمة. سمِّ هذا الهاتف ليعرف التلفاز صاحبه.',
      pairCancel: 'إلغاء',
      codeOpen: 'اكتب رقم التلفاز',
      codeLabel:
        'الرقم المكوّن من 12 خانة تحت الرمز على التلفاز (أو رابط اقتران أرسله لك أحد):',
      codeBtn: 'اقتران',
      codeBad: 'تحقّق من الرقم: فيه 12 خانة كما على التلفاز.',
      codeLooking: 'جارٍ البحث عن التلفاز بهذا الرقم…',
      codeNone:
        'لا يوجد تلفاز ينتظر بهذا الرقم. تحقّق منه، أو اضغط OK على التلفاز للحصول على رقم جديد: يعمل الرقم 10 دقائق.',
      wordsFar:
        'التلفاز في منزل آخر؟ اقرأ هذه الكلمات لمن عند التلفاز: يضغط OK هناك ويُدخل الرمز السري فقط إذا ظهرت على التلفاز الكلمات نفسها.',
      shareLink: 'أرسل هذا إلى هاتف آخر',
      shareText:
        'صوفا تيوب: اقترن بهاتفك مع التلفاز (يعمل هذا الرابط 10 دقائق)',
      shareCopied:
        'نُسخ الرابط. أرسله في رسالة: يعمل 10 دقائق، ويطلب التلفاز مع ذلك الضغط على OK والرمز السري.',
      fullTvs: 'أجهزة التلفاز'
    }
  };
  let lang = 'en';
  /**
   * Minutes in Arabic with the number's agreement: دقيقة واحدة, دقيقتان,
   * 3–10 دقائق, 11+ دقيقة (101, 102: 101 دقيقة). `after` (after «من»): the
   * dual in the genitive, دقيقتين.
   */
  function arMinutes(n, after) {
    if (typeof n !== 'number' || !isFinite(n) || n !== Math.floor(n) || n < 0)
      return n + ' دقيقة';
    if (n === 1) return 'دقيقة واحدة';
    if (n === 2) return after ? 'دقيقتين' : 'دقيقتان';
    const r = n % 100;
    return n + ' ' + (r >= 3 && r <= 10 ? 'دقائق' : 'دقيقة');
  }
  function tr(k, v) {
    let s = (T[lang] && T[lang][k]) || T.en[k] || k;
    if (typeof s === 'function') return s(v || {});
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

  /*
   * 0.9.7: more than one TV (a parent's own and the grandparents', say).
   * IndexedDB 'tvs' keeps every paired TV (at most 6), each with its own
   * keys, topics, counters and a name on this phone. Only the TV in use is
   * heard (one EventSource); the others' moves are read when the app opens
   * (catchUp). Before 0.9.7 there was one TV, in 'tv'.
   */
  const MAX_TVS = 6;
  let tvs = []; // the paired TVs
  let tv = null; // the TV in use (one of tvs), or a pairing under way
  let es = null; // EventSource on the outbox
  const waiting = {}; // counter -> resolve
  let relayLimited = false; // the last post was refused with 429

  async function saveTvs() {
    await put(
      'tvs',
      tvs.filter((x) => x.paired)
    );
  }
  /** The record of `t` (default: the TV in use) is kept. */
  async function saveTv(t) {
    t = t || tv;
    if (!t || !t.paired) return;
    const i = tvs.findIndex((x) => x.tvId === t.tvId);
    if (i < 0) tvs.push(t);
    else tvs[i] = t;
    await saveTvs();
  }
  /** What this phone calls a TV: its own name for it, else the TV's. */
  function tvLabel(t) {
    return (t && (t.label || t.name)) || 'TV';
  }
  /** Loads the TVs (and moves a 0.9.6 phone's single TV into the list). */
  async function loadTvs() {
    const list = await get('tvs');
    tvs = Array.isArray(list) ? list.filter((x) => x && x.paired) : [];
    const old = await get('tv');
    if (old && old.paired && !tvs.some((x) => x.tvId === old.tvId)) {
      tvs.unshift(old);
      await saveTvs();
    }
    if (old) await put('tv', undefined);
  }

  function status(text, cls) {
    const s = $('status');
    s.textContent = text || '';
    s.className = cls || '';
  }

  /** Opens one of our envelopes (to this phone, from TV `t`), or null. */
  async function openEnv(text, t) {
    const env = C.peek(text);
    if (!env || env.to !== t.phoneId) return null;
    const msg = await C.open(t.t2p, t.tvId, t.outbox, env);
    if (!msg || C.check(msg, t.inN, Date.now())) return null;
    t.inN = msg.n;
    return msg;
  }

  async function onMessage(text, t) {
    t = t || tv;
    if (!t) return;
    const msg = await openEnv(text, t);
    if (!msg) return;
    if (msg.op === 'removed') {
      // 0.9.7: someone removed this phone on the TV (only the TV has the
      // keys to say so); the entry stays until the owner removes it here
      t.removed = Date.now();
      await saveTv(t);
      if (t === tv) showRemoved();
      else drawTvs();
      return;
    }
    if (msg.op === 'move') {
      // the TV's new key and topics (a phone was removed, or a new server)
      t.relay = msg.r;
      t.inbox = msg.i;
      t.outbox = msg.o;
      t.tvPub = C.unb64u(msg.k);
      const lk = await C.linkKeys(t.priv, t.tvPub, t.tvId, t.phoneId);
      t.p2t = lk.p2t;
      t.t2p = lk.t2p;
      await saveTv(t);
      if (t !== tv) return; // another TV's move, read on opening
      status(tr('moved'));
      listen();
      return;
    }
    if (t !== tv) {
      await saveTv(t); // (its counter)
      return;
    }
    // 0.9.6: the QR code carries a one-time pairing topic only; "paired"
    // brings the TV's lasting inbox and outbox
    const topic = /^[\w-]{16,64}$/;
    if (msg.op === 'paired' && topic.test(msg.i) && topic.test(msg.o)) {
      tv.inbox = msg.i;
      tv.outbox = msg.o;
      listen();
    }
    await saveTv();
    if (msg.op === 're' && waiting[msg.id]) {
      waiting[msg.id](msg);
      delete waiting[msg.id];
    }
    if (msg.op === 'paired' && waiting.paired) waiting.paired(msg);
    // one more of the TV's addresses, after its answer (a router port)
    if (msg.op === 'cand' && waiting.cand) waiting.cand(msg);
  }

  /** The TV in use removed this phone: said, and nothing keeps trying. */
  function showRemoved() {
    Object.keys(waiting).forEach((k) => {
      if (!/^\d+$/.test(k)) return; // (questions; not pairing, addresses)
      waiting[k](null);
      delete waiting[k];
    });
    closeFull();
    if (rtc) {
      try {
        rtc.pc.close();
      } catch {
        /* closed */
      }
      rtc = null;
    }
    $('now').textContent = '';
    $('now-note').textContent = '';
    $('full-note').textContent = '';
    drawTvs();
    status(tr('tvRemoved', { tv: tvLabel(tv) }), 'bad');
  }

  /** Reads what waits on a TV's outbox (moves). */
  async function catchUp(t) {
    t = t || tv;
    try {
      const r = await fetch(`${t.relay}/${t.outbox}/json?poll=1&since=12h`, {
        cache: 'no-store'
      });
      const lines = (await r.text()).split('\n');
      for (const l of lines) {
        if (!l) continue;
        const ev = JSON.parse(l);
        // in order: a move must apply before what follows it
        // eslint-disable-next-line no-await-in-loop
        if (ev.event === 'message') await onMessage(ev.message, t);
      }
    } catch {
      /* offline: the stream tries */
    }
  }

  function listen() {
    if (es) es.close();
    es = null;
    if (!tv) return;
    const me = tv;
    es = new EventSource(`${me.relay}/${me.outbox}/sse`);
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.event === 'message') onMessage(ev.message, me);
      } catch {
        /* not ours */
      }
    };
  }

  async function post(body) {
    relayLimited = false;
    const r = await fetch(`${tv.relay}/${tv.inbox}`, {
      method: 'POST',
      body,
      headers: { Firebase: 'no' }
    });
    // 429: the relay's limit for this phone's network (ntfy.sh: per public
    // address, shared by everything behind it)
    relayLimited = r.status === 429;
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

  /*
   * Web Push, one subscription per TV (0.9.7). A browser gives one
   * subscription per service worker registration, bound to one VAPID key,
   * and every TV has its own key: so the first TV uses the app's own
   * registration (./), each further TV a registration of the same sw.js
   * with its own scope (./push/<TV id>/: no page lives there). sw.js shows
   * a TV's requests with that TV's name and opens the app on it.
   */
  function subKey(sub) {
    const k = sub && sub.options && sub.options.applicationServerKey;
    return k ? C.b64u(new Uint8Array(k)) : '';
  }
  function activeReg(reg) {
    if (reg.active) return Promise.resolve(reg);
    return new Promise((ok) => {
      const w = reg.installing || reg.waiting;
      if (!w) return ok(reg);
      w.addEventListener('statechange', () => {
        if (w.state === 'activated') ok(reg);
      });
      setTimeout(() => ok(reg), 10000);
    });
  }
  /** The registration that holds (or will hold) TV `t`'s subscription. */
  async function pushReg(t) {
    const want = C.b64u(t.vapidPub);
    const main = await navigator.serviceWorker.ready;
    const regs = await navigator.serviceWorker.getRegistrations();
    const subs = await Promise.all(
      regs.map((r) => r.pushManager.getSubscription())
    );
    const at = subs.findIndex((x) => subKey(x) === want);
    if (at >= 0) return regs[at];
    // the app's own one: free, or held by a TV this phone no longer has
    const held = subKey(await main.pushManager.getSubscription());
    const ours = tvs
      .filter((x) => x.tvId !== t.tvId)
      .map((x) => C.b64u(x.vapidPub));
    if (!held || ours.indexOf(held) < 0) {
      const old = await main.pushManager.getSubscription();
      if (old) await old.unsubscribe();
      return main;
    }
    const scope = new URL('push/' + t.tvId + '/', main.scope).href;
    return activeReg(
      await navigator.serviceWorker.register('sw.js', { scope })
    );
  }
  async function pushSub(t) {
    try {
      if (!('PushManager' in window) || !('serviceWorker' in navigator))
        return null;
      if (Notification.permission !== 'granted') {
        const p = await Notification.requestPermission();
        if (p !== 'granted') return null;
      }
      const reg = await pushReg(t);
      let sub = await reg.pushManager.getSubscription();
      if (!sub)
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: t.vapidPub
        });
      t.pushScope = reg.scope; // sw.js finds the TV of a push by it
      const j = sub.toJSON();
      return { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth };
    } catch {
      return null;
    }
  }
  /** A removed TV's subscription (and its own registration) goes. */
  async function pushDrop(t) {
    try {
      const want = C.b64u(t.vapidPub);
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs.map(async (r) => {
          const sub = await r.pushManager.getSubscription();
          if (subKey(sub) !== want) return;
          await sub.unsubscribe();
          if (/\/push\/[\w-]+\/$/.test(r.scope)) await r.unregister();
        })
      );
    } catch {
      /* no push here */
    }
  }

  let before = null; // the TV in use before a pairing started
  async function pair(offer) {
    const known = tvs.some((x) => x.tvId === offer.tvId);
    if (!known && tvs.length >= MAX_TVS) return status(tr('tvsFull'), 'bad');
    const name = ($('phone-name').value || '').trim().slice(0, 40) || 'Phone';
    const keys = await C.newKeys();
    const phoneId = 'ph_' + C.b64u(crypto.getRandomValues(new Uint8Array(16)));
    closeFull();
    before = tv && tv.paired ? tv : before;
    const old = tvs.find((x) => x.tvId === offer.tvId);
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
      paired: false,
      // the name this phone gave the TV stays when it pairs again
      label: (old && old.label) || ''
    };
    const push = await pushSub(tv);
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
    $('pair-ways').classList.add('hidden');
    $('code-box').classList.add('hidden');
    status('');
    // no answer soon: what to check on the TV (the words stay: it may come)
    const slow = setTimeout(() => status(tr('pairSlow'), 'bad'), 45000);
    const paired = new Promise((ok) => {
      waiting.paired = ok;
      setTimeout(() => ok(null), 10 * 60 * 1000);
    });
    try {
      await post(env);
    } catch {
      clearTimeout(slow);
      return pairFailed();
    }
    const r = await paired;
    clearTimeout(slow);
    delete waiting.paired;
    if (!r) return pairFailed();
    tv.paired = true;
    tv.lastOk = Date.now();
    // paired again (the phone was removed on the TV): one entry, the new keys
    tvs = tvs.filter((x) => x.tvId !== tv.tvId);
    await saveTv();
    await put('cur', tv.tvId);
    adding = false;
    before = null;
    $('words-box').classList.add('hidden');
    status(tr('paired', { tv: tvLabel(tv) }), 'ok');
    show();
    refresh();
  }
  /** The pairing did not finish (or Cancel): back to the TV in use before it. */
  let pairCancelled = false;
  function pairFailed() {
    if (pairCancelled) status('');
    else status(tr('pairFail'), 'bad');
    pairCancelled = false;
    tv = before;
    before = null;
    listen();
    $('pair-ways').classList.remove('hidden');
  }

  /*
   * The TV's 12-digit number (0.9.7): its sealed note on ntfy.sh (the
   * number's own topic, away-core.js) holds the same pairing link as the QR
   * code. Also takes a pairing link pasted from a message. A family's own
   * mailbox server is tried too when a TV this phone has uses one.
   */
  async function codePair(e) {
    if (e) e.preventDefault();
    const text = $('code').value;
    const offer = C.readOffer(text);
    if (offer) {
      $('code').value = '';
      return pair(offer);
    }
    const code = C.codeClean(text);
    if (!code) return status(tr('codeBad'), 'bad');
    status(tr('codeLooking'));
    $('code-btn').disabled = true;
    let link = '';
    try {
      const keys = await C.codeKeys(code);
      const relays = ['https://ntfy.sh'];
      for (const x of tvs)
        if (relays.indexOf(x.relay) < 0) relays.push(x.relay);
      for (const relay of relays) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const r = await fetch(
            `${relay}/${keys.topic}/json?poll=1&since=15m`,
            {
              cache: 'no-store'
            }
          );
          // eslint-disable-next-line no-await-in-loop
          for (const l of (await r.text()).split('\n')) {
            if (!l) continue;
            const ev = JSON.parse(l);
            if (ev.event !== 'message') continue;
            // eslint-disable-next-line no-await-in-loop
            link = (await C.openCodeNote(keys, ev.message, Date.now())) || link;
          }
        } catch {
          /* that relay: not reachable */
        }
        if (link) break;
      }
    } finally {
      $('code-btn').disabled = false;
    }
    const offer2 = C.readOffer(link);
    if (!offer2) return status(tr('codeNone'), 'bad');
    $('code').value = '';
    pair(offer2);
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
    if (tv.removed) return showRemoved();
    status(tr('asking'));
    const r = await ask({ op: 'now' });
    if (tv && tv.removed) return showRemoved();
    $('now').textContent = '';
    if (!r) {
      status(tr(relayLimited ? 'relayBusy' : 'unreachable'), 'bad');
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
    if (!r)
      return status(tr(relayLimited ? 'relayBusy' : 'unreachable'), 'bad');
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

  let adding = false; // "+ Add a TV" was tapped
  function show() {
    const paired = !!(tv && tv.paired);
    const iphone = /iPhone|iPad/.test(navigator.userAgent);
    $('install-card').classList.toggle(
      'hidden',
      !!tvs.length || standalone() || !iphone
    );
    const pairing = !tvs.length || adding;
    $('pair-card').classList.toggle('hidden', !pairing);
    $('pair-title').textContent = tr(tvs.length ? 'pairAddTitle' : 'pairTitle');
    $('pair-text').textContent = tr(tvs.length ? 'pairAnyText' : 'pairText');
    $('pair-cancel').classList.toggle('hidden', !tvs.length);
    for (const id of ['now-card', 'cmd-card'])
      $(id).classList.toggle('hidden', !paired);
    if (!paired) $('reqs-card').classList.add('hidden');
    $('set-card').classList.remove('hidden');
    $('full-open').classList.toggle('hidden', !paired);
    drawTvs();
    drawNotif();
  }

  /** "Your TVs": each paired TV, the one in use marked; open, rename, remove. */
  function drawTvs() {
    const box = $('tvs');
    box.textContent = '';
    $('tvs-card').classList.toggle('hidden', !tvs.length);
    $('tvs-pick').classList.toggle(
      'hidden',
      !!(tv && tv.paired) || tvs.length < 2
    );
    $('tv-add').classList.toggle('hidden', adding);
    for (const t of tvs) {
      const li = document.createElement('li');
      const mine = !!(tv && tv.paired && tv.tvId === t.tvId);
      li.className = mine ? 'tv cur' : 'tv';
      const txt = document.createElement('div');
      txt.className = 'tvtext';
      const nm = document.createElement('strong');
      nm.textContent = tvLabel(t);
      const st = document.createElement('span');
      st.className = 'small';
      st.textContent = t.removed
        ? tr('tvRemovedShort')
        : t.lastOk
          ? tr('tvLast', { t: when(t.lastOk) })
          : tr('tvNever');
      txt.append(nm, st);
      const b = document.createElement('div');
      b.className = 'btns';
      const open = button(tr(mine ? 'tvIsOpen' : 'tvOpen'), 'btn small', () =>
        pick(t.tvId)
      );
      open.disabled = mine;
      b.append(
        open,
        button(tr('tvRename'), 'btn ghost small', () => rename(t)),
        button(tr('tvRemove'), 'btn ghost small', () => remove(t))
      );
      li.append(txt, b);
      box.append(li);
    }
  }
  /** A time today as a clock, else the date. */
  function when(at) {
    const d = new Date(at);
    if (d.toDateString() === new Date().toDateString()) return clock(at);
    try {
      return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en', {
        day: 'numeric',
        month: 'short'
      }).format(d);
    } catch {
      return d.toLocaleDateString();
    }
  }

  /** Uses TV `id` now: its mailbox, Now, and the full remote. */
  async function pick(id) {
    const t = tvs.find((x) => x.tvId === id);
    if (!t) return;
    if (tv === t && tv.paired) return;
    closeFull();
    if (rtc) lost(rtc);
    tv = t;
    adding = false;
    await put('cur', id);
    status('');
    $('now').textContent = '';
    $('now-note').textContent = '';
    $('full-note').textContent = '';
    show();
    window.scrollTo(0, 0);
    listen();
    refresh();
    openFull();
  }
  async function rename(t) {
    const v = prompt(tr('tvRenameAsk'), tvLabel(t));
    if (v === null) return;
    // no control characters or markup in a name
    t.label = Array.from(v)
      .filter((c) => c.charCodeAt(0) >= 32 && c !== '<' && c !== '>')
      .join('')
      .trim()
      .slice(0, 40);
    await saveTv(t);
    show();
  }
  async function remove(t) {
    if (!confirm(tr('tvRemoveAsk', { tv: tvLabel(t) }))) return;
    tvs = tvs.filter((x) => x.tvId !== t.tvId);
    await saveTvs();
    await pushDrop(t);
    if (tv === t) {
      closeFull();
      if (es) es.close();
      es = null;
      tv = null;
      await put('cur', undefined);
    }
    // one TV left and none in use: that one, as when the app opens
    if (!(tv && tv.paired) && tvs.length === 1) return pick(tvs[0].tvId);
    show();
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
    set('full-open', 'fullOpen');
    set('full-simple', 'fullSimple');
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
    // 0.9.7: the TVs, the number, sending the link on
    set('tvs-title', 'tvsTitle');
    set('tvs-pick', 'tvsPick');
    set('tv-add', 'tvAdd');
    set('pair-cancel', 'pairCancel');
    set('code-open', 'codeOpen');
    set('code-label', 'codeLabel');
    set('code-btn', 'codeBtn');
    set('share-link', 'shareLink');
    set('words-far', 'wordsFar');
    set('full-tvs', 'fullTvs');
    $('code').placeholder = '1234 5678 9012';
    set('relay-title', 'relayTitle');
    set('relay-text', 'relayText');
    set('relay-url-label', 'relayUrl');
    set('relay-user-label', 'relayUser');
    set('relay-pass-label', 'relayPass');
    set('relay-save', 'relaySave');
    set('relay-remove', 'relayRemove');
    $('relay-url').placeholder = 'turns:relay.example.com:443?transport=tcp';
    drawRelay();
    const help = $('help');
    help.textContent = tr('help');
    const a = document.createElement('a');
    a.href = 'away-help.html' + (lang === 'ar' ? '#lang=ar' : '');
    a.textContent = tr('helpLink');
    help.append(a);
  }

  async function unlocked(want, offer) {
    await loadTvs();
    turn = (await get('turn')) || null;
    drawRelay();
    $('lock-card').classList.add('hidden');
    // which TV: the one asked for (a notification, the front page), the
    // only one; with more than one, the owner picks (nothing opens by
    // itself, as a cast button or a home picker would)
    // (a TV's code opened: that TV pairs first, no other one opens over it)
    tv =
      tvs.find((x) => x.tvId === want) ||
      (tvs.length === 1 && !offer ? tvs[0] : null);
    if (offer) usePairLink(offer);
    show();
    // every TV's moves (a phone removed there) while this app was closed
    for (const t of tvs) {
      // eslint-disable-next-line no-await-in-loop
      await catchUp(t);
    }
    if (tv && tv.paired) {
      await put('cur', tv.tvId);
      listen();
      refresh();
      // the whole phone page, straight to the TV when the network allows
      openFull();
    }
    show();
  }

  /* ---------------- the whole phone page from away (P2P) ---------------- */

  /*
   * The phone's WebRTC offer goes to the TV once, sealed in the away link
   * ({op: 'rtc'}); the TV answers and a direct, end-to-end encrypted data
   * channel opens (DTLS; the TV checks this phone's certificate against the
   * offer, the browser checks the TV's against the answer). The TV's own
   * phone page then runs inside this app in a sandboxed frame (tv-frame.js:
   * an opaque origin, no access to this app's keys, files or storage); its
   * requests come here by postMessage and go over the channel, as this
   * phone's parent connection (the away PIN on the TV page first). Nothing
   * of it reaches any server.
   */
  let rtc = null; // {pc, dc, waiting, n}
  /** One request of the TV's page (tv-frame.js); waits for a reconnect. */
  async function pageRequest(msg, ms) {
    // the path dropped and the channel is opening again: wait for it
    if (!rtc && again) await again;
    return chan(msg, ms);
  }

  function chan(msg, ms) {
    return new Promise((ok) => {
      const me = rtc;
      if (!me || me.dc.readyState !== 'open') return ok(null);
      const id = me.n++;
      me.waiting[id] = ok;
      setTimeout(() => {
        if (me.waiting[id]) {
          delete me.waiting[id];
          ok(null);
        }
      }, ms || 20000);
      me.dc.send(JSON.stringify(Object.assign({ id }, msg)));
    });
  }

  /*
   * A dead path (RFC 7675 consent: the browser's checks get no answer; the
   * TV ends its side the same way): "disconnected" for 6 s, "failed", or the
   * channel closed. The full page stays and the channel opens again with a
   * new offer through the away link (2 mailbox messages a try, at most 3
   * tries); its requests wait meanwhile. A phone in the background tries
   * once it is back in front.
   */
  let again = null; // the reconnect under way (a promise)
  const AGAIN_WAIT = [0, 3000, 10000];
  function lost(me) {
    if (rtc !== me) return;
    rtc = null;
    clearInterval(me.watch);
    clearTimeout(me.dropT);
    try {
      me.pc.close();
    } catch {
      /* closed */
    }
    // what was on its way: no answer (the TV page asks again by itself)
    Object.keys(me.waiting).forEach((k) => {
      me.waiting[k](null);
    });
    me.waiting = {};
    if ($('full').classList.contains('hidden')) return;
    $('full-state').textContent = tr('fullAgain');
    again = (async () => {
      for (let i = 0; i < AGAIN_WAIT.length; i++) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((ok) => setTimeout(ok, AGAIN_WAIT[i]));
        // eslint-disable-next-line no-await-in-loop
        await frontAgain();
        if ($('full').classList.contains('hidden')) return false;
        // eslint-disable-next-line no-await-in-loop
        if ((await direct()).ok) return true;
        if (relayLimited) break; // the mailbox's limit: no more tries now
      }
      return false;
    })();
    again.then((ok) => {
      again = null;
      if (ok) {
        drawFullState();
        // the new path may differ: the TV page's live view follows it
        try {
          self.sofaTvFrame.post('full-frame', {
            ytxRelay: !!(rtc && rtc.relay)
          });
        } catch {
          /* not loaded */
        }
        return;
      }
      if ($('full').classList.contains('hidden')) return;
      closeFull();
      $('full-note').textContent = tr('fullLost');
    });
  }
  /** Resolves when this app is in front (at once if it is). */
  function frontAgain() {
    if (!document.hidden) return Promise.resolve();
    return new Promise((ok) => {
      const f = () => {
        if (document.hidden) return;
        document.removeEventListener('visibilitychange', f);
        ok();
      };
      document.addEventListener('visibilitychange', f);
    });
  }
  function watchPath(me) {
    me.pc.oniceconnectionstatechange = () => {
      const s = me.pc.iceConnectionState;
      if (s === 'failed' || s === 'closed') return lost(me);
      if (s === 'disconnected') {
        // a short gap (a Wi-Fi blip) comes back by itself
        if (!me.dropT) me.dropT = setTimeout(() => lost(me), 6000);
      } else {
        clearTimeout(me.dropT);
        me.dropT = 0;
      }
    };
  }

  /*
   * The family's own relay (TURN), optional and advanced: kept only on this
   * phone (IndexedDB 'turn'), used only by this phone's browser. The TV
   * needs nothing: the relay's address is one more of the phone's
   * candidates. No relay of Sofa Tube's own exists.
   */
  let turn = null; // {urls: [..], username, credential}
  function turnUrls(text) {
    return String(text || '')
      .split(/[\s,]+/)
      .filter(Boolean);
  }
  function drawRelay() {
    if (!$('relay-state')) return;
    $('relay-remove').classList.toggle('hidden', !turn);
    $('relay-pass').placeholder = turn ? tr('relayKeep') : '';
    $('relay-state').textContent = turn
      ? tr('relayIs', {
          // an address keeps its order inside Arabic text (bidi isolate)
          h:
            '\u2066' +
            turn.urls
              .map((u) => u.replace(/^turns?:/i, '').replace(/\?.*$/, ''))
              .join(', ') +
            '\u2069'
        })
      : '';
  }
  async function relaySave(e) {
    e.preventDefault();
    const urls = turnUrls($('relay-url').value);
    const username = $('relay-user').value.trim();
    const credential = $('relay-pass').value || (turn && turn.credential) || '';
    if (
      !urls.length ||
      !urls.every((u) => /^turns?:\S+$/i.test(u)) ||
      !username ||
      !credential
    ) {
      $('relay-state').textContent = tr('relayBad');
      return;
    }
    turn = { urls, username, credential };
    await put('turn', turn);
    $('relay-pass').value = '';
    drawRelay();
    $('relay-state').textContent += ' ' + tr('relaySaved');
  }
  async function relayRemove() {
    turn = null;
    await put('turn', undefined);
    $('relay-url').value = '';
    $('relay-user').value = '';
    $('relay-pass').value = '';
    drawRelay();
    $('relay-state').textContent = tr('relayGone');
  }

  /** Is the connection's selected pair a relayed one (getStats)? */
  async function viaRelay(pc) {
    try {
      const st = await pc.getStats();
      let pair = null;
      st.forEach((s) => {
        if (s.type === 'transport' && s.selectedCandidatePairId)
          pair = st.get(s.selectedCandidatePairId);
      });
      if (!pair)
        st.forEach((s) => {
          if (
            s.type === 'candidate-pair' &&
            (s.selected || (s.nominated && s.state === 'succeeded'))
          )
            pair = pair || s;
        });
      if (!pair) return false;
      const l = st.get(pair.localCandidateId);
      const r = st.get(pair.remoteCandidateId);
      return (
        (l && l.candidateType === 'relay') ||
        (r && r.candidateType === 'relay') ||
        false
      );
    } catch {
      return false;
    }
  }

  /** {ok} or {ok: false, why: 'tv' | 'route', net (what the TV said)} */
  async function direct() {
    if (rtc && rtc.dc.readyState === 'open') return { ok: true };
    if (!('RTCPeerConnection' in window)) return { ok: false, why: 'route' };
    const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    if (turn)
      iceServers.push({
        urls: turn.urls,
        username: turn.username,
        credential: turn.credential
      });
    let pc;
    try {
      pc = new RTCPeerConnection({ iceServers });
    } catch {
      // a relay address this browser does not take: without it
      pc = new RTCPeerConnection({ iceServers: iceServers.slice(0, 1) });
    }
    const dc = pc.createDataChannel('ytx');
    let why = 'route';
    let net = null;
    try {
      await pc.setLocalDescription(await pc.createOffer());
      await new Promise((ok) => {
        if (pc.iceGatheringState === 'complete') return ok();
        pc.onicegatheringstatechange = () =>
          pc.iceGatheringState === 'complete' && ok();
        // a relay (TURN over TLS) takes longer to answer
        setTimeout(ok, turn ? 6000 : 3000);
      });
      // only what the TV needs: the offer without the phone's mDNS names
      const sdp = pc.localDescription.sdp
        .split('\r\n')
        .filter((l) => !/^a=candidate:.* [0-9a-f-]+\.local /.test(l))
        .join('\r\n');
      // the TV's later addresses (trickle): kept until its answer is set
      const late = [];
      let mid = null; // the answer's media line (null until it is set)
      const addOne = (cand) => {
        pc.addIceCandidate({
          candidate: cand,
          sdpMid: mid,
          sdpMLineIndex: 0
        }).catch(() => {});
      };
      const addLate = (m) => {
        if (typeof m.cand !== 'string' || !/^candidate:/.test(m.cand)) return;
        if (mid !== null) addOne(m.cand);
        else late.push(m.cand);
      };
      waiting.cand = addLate;
      const r = await ask({ op: 'rtc', offer: sdp }, 20000);
      if (!r || !r.ok || !r.answer) {
        why = 'tv';
        throw new Error('no answer');
      }
      net = r.net || null;
      await pc.setRemoteDescription({ type: 'answer', sdp: r.answer });
      mid = (/a=mid:(\S+)/.exec(r.answer) || [])[1] || '0';
      late.forEach(addOne);
      const open = await new Promise((ok) => {
        if (dc.readyState === 'open') return ok(true);
        dc.onopen = () => ok(true);
        setTimeout(() => ok(false), 15000);
      });
      if (!open) throw new Error('no route');
    } catch {
      if (waiting.cand) delete waiting.cand;
      pc.close();
      return { ok: false, why, net };
    }
    delete waiting.cand;
    const me = { pc, dc, waiting: {}, n: 1, relay: await viaRelay(pc) };
    // the path may change (a better pair, a network change): look again
    me.watch = setInterval(async () => {
      if (rtc !== me) return clearInterval(me.watch);
      const v = await viaRelay(pc);
      if (v === me.relay) return;
      me.relay = v;
      drawFullState();
      // the TV page inside: the live view waits for a tap over a relay
      try {
        self.sofaTvFrame.post('full-frame', { ytxRelay: v });
      } catch {
        /* not loaded yet */
      }
    }, 10000);
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
    dc.onclose = () => lost(me);
    watchPath(me);
    rtc = me;
    return { ok: true };
  }

  /** Why the full remote did not open, in plain words. */
  function failText(res) {
    if (res.why === 'tv') return tr('fullNoTv');
    const out = [tr(turn ? 'fullNoRelay' : 'fullNo')];
    const map = res.net && res.net.map;
    if (map === 'off') out.push(tr('fullMapOff'));
    else if (map === 'cgnat') out.push(tr('fullMapCgnat'));
    if (!turn) out.push(tr('fullTips'));
    return out.join(' ');
  }

  function drawFullState() {
    $('full-state').textContent = tr(rtc && rtc.relay ? 'fullRelay' : 'fullOn');
  }

  let fullBusy = false;
  async function openFull() {
    if (fullBusy || !tv || tv.removed) return;
    fullBusy = true;
    // the full page needs WebRTC and a sandboxed frame (srcdoc): without
    // them the simple view stays, and says why
    if (
      !('RTCPeerConnection' in window) ||
      !self.sofaTvFrame ||
      !('srcdoc' in document.createElement('iframe'))
    ) {
      fullBusy = false;
      $('full-note').textContent = tr('fullNoBrowser');
      return;
    }
    $('full-note').textContent = tr('fullTrying');
    const res = await direct();
    fullBusy = false;
    if (!res.ok) {
      $('full-note').textContent = failText(res);
      return;
    }
    $('full-note').textContent = '';
    drawFullState();
    $('full').classList.remove('hidden');
    document.documentElement.style.overflow = 'hidden'; // nothing scrolls behind it
    // over a relay, the TV page keeps its live view off until a tap
    const shown = await self.sofaTvFrame.open('full-frame', {
      chan: pageRequest,
      url: 'tv/?t=00&app=1&lang=' + lang + (rtc && rtc.relay ? '&relay=1' : ''),
      id: (tv && tv.tvId) || 'away'
    });
    if (!shown) {
      closeFull();
      $('full-note').textContent = tr('fullNo');
    }
  }

  function closeFull() {
    document.documentElement.style.overflow = '';
    $('full').classList.add('hidden');
    self.sofaTvFrame.close('full-frame');
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
    $('code-open').onclick = () => {
      $('code-box').classList.remove('hidden');
      $('code').focus();
    };
    $('code-box').onsubmit = codePair;
    $('tv-add').onclick = () => {
      if (tvs.length >= MAX_TVS) return status(tr('tvsFull'), 'bad');
      adding = true;
      // a fresh pairing card (after an earlier pairing it showed the words)
      $('pair-ways').classList.remove('hidden');
      $('words-box').classList.add('hidden');
      $('code-box').classList.add('hidden');
      $('share-link').classList.add('hidden');
      status('');
      show();
      $('pair-card').scrollIntoView({ block: 'start' });
    };
    $('pair-cancel').onclick = () => {
      adding = false;
      scanEnd();
      // a pairing under way ends: back to the TV in use before it
      if (waiting.paired) {
        pairCancelled = true;
        waiting.paired(null);
      }
      $('words-box').classList.add('hidden');
      $('pair-ways').classList.remove('hidden');
      show();
    };
    $('full-tvs').onclick = () => {
      closeFull();
      $('tvs-card').scrollIntoView({ block: 'start' });
    };
    // a tap on a request's notification while the app is open (sw.js)
    if ('serviceWorker' in navigator)
      navigator.serviceWorker.addEventListener('message', (e) => {
        const id = e.data && e.data.ytxTv;
        if (typeof id === 'string' && tvs.some((x) => x.tvId === id)) pick(id);
      });
    $('refresh').onclick = refresh;
    $('full-open').onclick = openFull;
    $('full-simple').onclick = closeFull;
    $('relay-form').onsubmit = relaySave;
    $('relay-remove').onclick = relayRemove;
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
      const push = tv && (await pushSub(tv));
      if (push) await saveTv();
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
    // a pairing link opened straight (the phone's camera app, a message)
    const offer = C.readOffer(location.hash);
    // the TV to open (a notification, the front page's list): #tv=<id>
    const wantM = /[#&]tv=([\w-]{8,43})/.exec(location.hash);
    const want = wantM ? wantM[1] : '';
    if (want) history.replaceState(null, '', location.pathname);
    const pin = await get('pin');
    if (pin) {
      $('lock-card').classList.remove('hidden');
      $('lock-form').onsubmit = async (e) => {
        e.preventDefault();
        if ((await pinHash($('lock-pin').value, pin.salt)) !== pin.hash)
          return status(tr('lockBad'), 'bad');
        $('lock-pin').value = '';
        status('');
        await unlocked(want, offer);
      };
      return;
    }
    await unlocked(want, offer);
    // a pairing link opened while the app is open (only # changes)
    window.addEventListener('hashchange', () => {
      const o = C.readOffer(location.hash);
      if (o && $('lock-card').classList.contains('hidden')) usePairLink(o);
    });
  }

  /*
   * A pairing link opened straight: one tap pairs (notifications need a
   * tap). Or, 0.9.7, it goes on to another phone: a relative at the TV
   * scans the code with the camera and sends the link in a message (it is
   * the same as a photo of the code: 10 minutes, the words, OK + PIN).
   */
  function usePairLink(offer) {
    history.replaceState(null, '', location.pathname);
    closeFull();
    if (waiting.paired) {
      // a newer code while an older one still waits: the newer one counts
      pairCancelled = true;
      waiting.paired(null);
    }
    adding = !!tvs.length;
    show();
    $('scan').textContent = tr('pairWith', { tv: offer.name || 'TV' });
    $('scan').onclick = () => {
      $('scan').onclick = scan;
      $('scan').textContent = tr('scan');
      $('share-link').classList.add('hidden');
      pair(offer);
    };
    $('share-link').classList.remove('hidden');
    $('share-link').onclick = () => shareOffer(offer.raw);
  }
  async function shareOffer(raw) {
    const url = 'https://sofatube.github.io/remote/#away=' + raw;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Sofa Tube',
          text: tr('shareText'),
          url
        });
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      status(tr('shareCopied'), 'ok');
    } catch {
      prompt(tr('shareText'), url);
    }
  }

  start();
})();
