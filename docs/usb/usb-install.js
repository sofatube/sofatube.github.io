/*
 * sofatube.github.io/usb (0.9.6, new): installs Sofa Tube on an Android TV
 * box over a USB cable, from Chrome or Edge on a computer, with WebUSB and
 * Tango (ya-webadb, MIT; bundled by build.mjs as TANGO_FILE).
 *
 *   1. the release list (/version.json, same site) is checked against Sofa
 *      Tube's release key (Ed25519, key "st1"; the same check as
 *      tools/setup/app/brands/release.mjs and the TVs);
 *   2. the APK named there is downloaded (GitHub's release downloads send no
 *      CORS header, so the browser normally refuses; then the person
 *      downloads it with a link and picks the file), and its size and sha256
 *      must match the list;
 *   3. the person picks the box in the browser's USB list, presses Allow on
 *      the TV's "Allow USB debugging?" question, and the file is streamed to
 *      `cmd package install -S <size>` (adb install).
 *
 * Runs in the browser (the page) and in Node (tools/site-usb/*-test.mjs:
 * the same functions with a mocked USB device). The page's static text is in
 * the site's site/usb_page.py; only the changing messages are here.
 */

export const TANGO_FILE = './tango-adb-2.6.4.js';
export const PACKAGE = 'io.github.sofatube.tv';
const PREFIX = 'sofatube-version-json-v1\n';
export const KEYS = { st1: 'DYe7gk6fPxN4iX8RX9KT7FPPkikaf8qL7gi7rkcZIQc=' };
const AUTH_WAIT_MS = 90000;

const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = (buf) =>
  Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join(
    ''
  );

/** an Error with a code the page explains (explain()) */
export function fail(code, detail) {
  const e = new Error(code + (detail ? ': ' + detail : ''));
  e.code = code;
  if (detail) e.detail = detail;
  return e;
}

/**
 * The release list, checked: the text must carry a valid Ed25519 signature
 * by one of `keys` (same layout as tools/release/sign-version.mjs).
 * @returns {Promise<object>} the parsed list
 */
export async function checkList(text, keys = KEYS, subtle = crypto.subtle) {
  text = String(text).replace(/\r\n/g, '\n');
  const mark = ',\n  "sig": ';
  const at = text.lastIndexOf(mark);
  if (at < 0) throw fail('list-unsigned');
  let sig;
  try {
    sig = JSON.parse(text.slice(at + mark.length).replace(/\n\}\n?$/, ''));
  } catch {
    throw fail('list-unsigned');
  }
  const pub = keys[sig && sig.key];
  if (!pub || sig.alg !== 'ed25519') throw fail('list-unsigned');
  const body = text.slice(0, at) + '\n}\n';
  let ok;
  try {
    const key = await subtle.importKey(
      'raw',
      b64(pub),
      { name: 'Ed25519' },
      false,
      ['verify']
    );
    ok = await subtle.verify(
      { name: 'Ed25519' },
      key,
      b64(String(sig.value)),
      new TextEncoder().encode(PREFIX + body)
    );
  } catch (e) {
    // an old browser without Ed25519 in Web Crypto: refuse, never skip
    if (e && (e.name === 'NotSupportedError' || e.name === 'DataError'))
      throw fail('old-browser');
    throw fail('list-unsigned');
  }
  if (!ok) throw fail('list-unsigned');
  const list = JSON.parse(text);
  const a = list.android;
  if (
    !a ||
    !/^https:\/\/github\.com\/sofatube\/sofatube\.github\.io\/releases\/download\//.test(
      a.url || ''
    ) ||
    !/^[0-9a-f]{64}$/.test(a.sha256 || '') ||
    !(a.size > 0)
  )
    throw fail('list-no-android');
  return list;
}

/** throws unless `bytes` is exactly the file the list names */
export async function checkFile(bytes, entry, subtle = crypto.subtle) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  // the most common mistake: another version's file
  if (b.length !== entry.size) throw fail('file-size', String(b.length));
  const sum = hex(await subtle.digest('SHA-256', b));
  if (sum !== entry.sha256) throw fail('file-checksum', sum);
  return b;
}

/**
 * Tries to download the APK in the page. Returns the bytes, or null when the
 * browser may not read it (no CORS header on GitHub's download: the person
 * then downloads it and picks it).
 */
export async function tryDownload(entry, fetchFn = fetch, onProgress) {
  let res;
  try {
    res = await fetchFn(entry.url, { mode: 'cors', credentials: 'omit' });
  } catch {
    return null; // TypeError: blocked by CORS (or offline)
  }
  if (!res || !res.ok) return null;
  if (!res.body || !onProgress) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader();
  const parts = [];
  let got = 0;
  for (;;) {
    // eslint-disable-next-line no-await-in-loop -- a stream is read in order
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    got += value.length;
    if (got > entry.size) throw fail('file-size', String(got));
    onProgress(got / entry.size);
  }
  const out = new Uint8Array(got);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** a ReadableStream of `bytes` in 64 KiB pieces, reporting how far it is */
export function byteStream(bytes, onProgress) {
  const CH = 65536;
  let at = 0;
  return new ReadableStream({
    pull(c) {
      if (at >= bytes.length) {
        c.close();
        return;
      }
      const end = Math.min(at + CH, bytes.length);
      c.enqueue(bytes.subarray(at, end));
      at = end;
      if (onProgress) onProgress(at / bytes.length);
    }
  });
}

/** the reason in an `adb install` failure text, as an error code */
export function installFailure(text) {
  const m = /\[?(INSTALL_[A-Z_]+|DELETE_FAILED_[A-Z_]+)/.exec(text || '');
  const why = m ? m[1] : '';
  if (/UPDATE_INCOMPATIBLE|SHARED_USER_INCOMPATIBLE/.test(why))
    return fail('install-other-key', why);
  if (/VERSION_DOWNGRADE/.test(why)) return fail('install-newer', why);
  if (/INSUFFICIENT_STORAGE/.test(why)) return fail('install-storage', why);
  if (/NO_MATCHING_ABIS|OLDER_SDK|MISSING_FEATURE/.test(why))
    return fail('install-box', why);
  if (/USER_RESTRICTED|ABORTED|VERIFICATION/.test(why))
    return fail('install-blocked', why);
  return fail('install-failed', text ? String(text).slice(0, 200) : '');
}

/**
 * `cmd package install -S <size>` with the file on its stdin (what
 * `adb install` does on Android 7+; Sofa Tube needs Android 7, minSdk 24).
 * Like Tango's PackageManager.installStream, but the box's answer decides:
 * the box may close the stream as soon as it has every byte (or at once on
 * a refusal), which ends the writing side with "Socket closed".
 */
export async function streamInstall(adb, bytes, stream, onSent) {
  const proc = await adb.subprocess.noneProtocol.spawn([
    'cmd',
    'package',
    'install',
    '-S',
    String(bytes.length)
  ]);
  const output = (async () => {
    const dec = new TextDecoder();
    let text = '';
    const r = proc.output.getReader();
    for (;;) {
      // eslint-disable-next-line no-await-in-loop -- a stream is read in order
      const { done, value } = await r.read();
      if (done) break;
      text += dec.decode(value, { stream: true });
    }
    return (text + dec.decode()).trim();
  })();
  let writeError = null;
  try {
    await stream.pipeTo(proc.stdin);
  } catch (e) {
    writeError = e;
  }
  if (onSent) onSent();
  const text = await output;
  if (text !== 'Success')
    throw installFailure(text || (writeError && writeError.message) || '');
}

/*
 * The computer's adb key. Tango's own store (AdbWebCredentialStore) keeps an
 * exportable RSA private key in IndexedDB "Tango", and this page shares its
 * origin with the whole site: a box set to "Always allow from this computer"
 * would then trust any script on sofatube.github.io. adb signs the TV's
 * 20-byte token as a ready SHA-1 digest (RSA PKCS#1 v1.5 without hashing
 * it), which WebCrypto can't do with a key it keeps (sign() hashes first),
 * so the key can't be a non-extractable CryptoKey either. It lives in this
 * page's memory only: made on the first connection, gone when the page
 * closes. At worst the TV asks "Allow USB debugging?" again next time.
 */
let sessionKey = null; // {buffer: PKCS #8, name}

/**
 * An AdbCredentialStore that keeps its key in memory only.
 * @param {SubtleCrypto} [subtle]
 * @param {string} [host] the key's name after "Sofa Tube@"
 */
export function memoryCredentialStore(subtle = crypto.subtle, host) {
  const name =
    'Sofa Tube@' +
    (host || (globalThis.location && globalThis.location.hostname) || 'web');
  return {
    async generateKey() {
      const { privateKey } = await subtle.generateKey(
        {
          name: 'RSASSA-PKCS1-v1_5',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-1'
        },
        true, // Tango signs with the key's bytes (rsaSign): in memory only
        ['sign', 'verify']
      );
      const buffer = new Uint8Array(
        await subtle.exportKey('pkcs8', privateKey)
      );
      sessionKey = { buffer, name };
      return sessionKey;
    },
    async *iterateKeys() {
      if (sessionKey) yield sessionKey;
    }
  };
}

/**
 * Forgets this computer's key: the one in memory and the one Tango's own
 * store kept in IndexedDB "Tango" (an earlier test build of this page).
 * @returns {Promise<boolean>} true when nothing is kept any more
 */
export function forgetKeys(idb = globalThis.indexedDB) {
  sessionKey = null;
  if (!idb) return Promise.resolve(true);
  return new Promise((ok) => {
    let r;
    try {
      r = idb.deleteDatabase('Tango');
    } catch {
      return ok(false);
    }
    r.onsuccess = () => ok(true);
    r.onerror = () => ok(false);
    // another tab still has it open: deleted once that tab closes
    r.onblocked = () => ok(false);
  });
}

/**
 * Picks the box (the browser's USB list), connects and installs.
 * @param {object} o
 * @param {object} o.tango the bundle's exports (TANGO_FILE)
 * @param {Uint8Array} o.bytes the checked APK
 * @param {object} [o.manager] AdbDaemonWebUsbDeviceManager (default BROWSER)
 * @param {object} [o.credentialStore] default: memoryCredentialStore()
 * @param {(step: string, x?: any) => void} [o.onStep]
 *   'choose' → 'connect' → 'allow' (the TV asks) → 'sending' (x = 0..1)
 *   → 'installing' → 'done' (x = the box's name)
 * @param {boolean} [o.open] start Sofa Tube on the box afterwards
 */
export async function installOverUsb(o) {
  const t = o.tango;
  const step = o.onStep || (() => {});
  const manager =
    o.manager ||
    (t.AdbDaemonWebUsbDeviceManager && t.AdbDaemonWebUsbDeviceManager.BROWSER);
  if (!manager) throw fail('no-webusb');
  step('choose');
  let device;
  try {
    device = await manager.requestDevice();
  } catch (e) {
    if (e && e.name === 'NotFoundError') throw fail('no-device');
    if (e && e.name === 'SecurityError') throw fail('usb-denied');
    throw e;
  }
  if (!device) throw fail('no-device');
  step('connect', device.name);
  let connection;
  try {
    connection = await device.connect();
  } catch (e) {
    if (
      (t.AdbDaemonWebUsbDevice &&
        e instanceof t.AdbDaemonWebUsbDevice.DeviceBusyError) ||
      (e && e.name === 'DeviceBusyError') ||
      (e && /busy|claim/i.test(String(e.message)))
    )
      throw fail('busy');
    if (e && e.name === 'SecurityError') throw fail('usb-denied');
    throw fail('connect', e && e.message);
  }
  // until the TV answers "Allow USB debugging?", authenticate() waits
  const asked = setTimeout(() => step('allow'), o.allowAfterMs ?? 1200);
  let timer;
  let transport;
  try {
    transport = await Promise.race([
      t.AdbDaemonTransport.authenticate({
        serial: device.serial,
        connection,
        credentialStore: o.credentialStore || memoryCredentialStore()
      }),
      new Promise((_, no) => {
        timer = setTimeout(
          () => no(fail('no-allow')),
          o.authWaitMs ?? AUTH_WAIT_MS
        );
      })
    ]);
  } catch (e) {
    if (e && e.code) {
      try {
        await connection.writable.close();
      } catch {
        /* the box may be gone already */
      }
      throw e;
    }
    throw fail('connect', e && e.message);
  } finally {
    clearTimeout(asked);
    clearTimeout(timer);
  }
  const adb = new t.Adb(transport);
  const name =
    (adb.banner && (adb.banner.model || adb.banner.product)) ||
    device.name ||
    '';
  try {
    step('sending', 0);
    await streamInstall(
      adb,
      o.bytes,
      byteStream(o.bytes, (x) => step('sending', x)),
      () => step('installing')
    );
    if (o.open) {
      try {
        await adb.subprocess.noneProtocol.spawnWaitText(
          `monkey -p ${PACKAGE} -c android.intent.category.LEANBACK_LAUNCHER 1`
        );
      } catch {
        /* opening is a courtesy; the install worked */
      }
    }
    step('done', name);
    return { name };
  } finally {
    try {
      await adb.close();
    } catch {
      /* already closed */
    }
  }
}

/* ------------------------------------------------------------------ page */

/** what this browser can do: 'ok', 'firefox', 'safari', 'ios', 'android', 'other', 'insecure' */
export function browserKind(nav, secure) {
  const ua = (nav && nav.userAgent) || '';
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (nav && 'usb' in nav) {
    if (!secure) return 'insecure';
    return /Android/.test(ua) ? 'android' : 'ok';
  }
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Safari\//.test(ua) && !/Chrome\/|Chromium\/|Edg\//.test(ua))
    return 'safari';
  return 'other';
}

/** a Latin run kept in its order inside Arabic text (first-strong isolate) */
const I = (x) => '⁨' + x + '⁩';

export const T = {
  en: {
    firefox:
      'Firefox cannot reach USB devices from a web page (no WebUSB). Open this page in Google Chrome or Microsoft Edge on a computer.',
    safari:
      'Safari cannot reach USB devices from a web page (no WebUSB). Open this page in Google Chrome or Microsoft Edge on a computer (on a Mac, Chrome or Edge for Mac).',
    ios: 'An iPhone or iPad cannot install over USB (no WebUSB in any browser there). Use Chrome or Edge on a computer, or the other ways on the Setup page.',
    other:
      'This browser cannot reach USB devices (no WebUSB). Open this page in Google Chrome or Microsoft Edge on a computer.',
    insecure: 'Open this page from https://sofatube.github.io/usb/.',
    android:
      'Chrome on an Android phone has WebUSB, but installing from a phone over a cable is not tested yet. A computer is the tested way.',
    list: 'Checking the Sofa Tube release list…',
    listOk: (v, mb) =>
      `Sofa Tube ${v} for Android TV (${mb} MB): the release list is signed by Sofa Tube.`,
    getting: (p) => `Downloading Sofa Tube… ${p}%`,
    pick: 'The browser may not download the file itself (GitHub allows that only as a normal download). Download it with the button, then choose the downloaded file here.',
    checking: 'Checking the file…',
    fileOk: (v) =>
      `File checked: Sofa Tube ${v}, the same file as in the signed release list.`,
    choose: 'Choose the box in the browser’s list, then Connect.',
    connect: (n) => `Connecting to ${n || 'the box'}…`,
    allow:
      'Look at the TV: it asks “Allow USB debugging?”. Move to Allow with the remote and press OK. This page keeps no key on this computer, so the TV asks each time: leave “Always allow from this computer” off.',
    forget: 'Forget this computer’s key',
    forgot:
      'Done: this page keeps no key on this computer. If the TV still lets this computer in without asking, remove it on the TV: Settings → Developer options → “Revoke USB debugging authorizations”.',
    forgotBusy:
      'The old key is removed once the other tabs of this site are closed.',
    sending: (p) => `Sending Sofa Tube to the box… ${p}%`,
    installing: 'Installing on the box… (up to a minute)',
    done: (n) =>
      `Done: Sofa Tube is installed${n ? ' on ' + n : ''}. It is in the TV’s apps; the TV may show it at the end of the row. You can unplug the cable.`,
    errors: {
      'no-webusb': 'This browser cannot reach USB devices.',
      'old-browser':
        'This browser is too old to check Sofa Tube’s signature. Update Chrome or Edge, then try again.',
      'list-unsigned':
        'The release list is not signed by Sofa Tube, so nothing is installed. Try again later; if it stays, write to us.',
      'list-no-android':
        'The release list names no Android TV file. Try again later.',
      'list-fetch':
        'The release list could not be loaded. Check the internet connection and reload the page.',
      'file-size':
        'This is not the right file (another size). Choose SofaTube-…-AndroidTV-arm.apk from the button above, not an older one.',
      'file-checksum':
        'This file is not the Sofa Tube release (its checksum differs), so it is not installed. Download it again with the button above.',
      'no-device':
        'No box was chosen. Empty list? Check: USB debugging is on, the cable carries data (not a charge-only cable), the right port (see Boxes and cable), and no other window or program uses the box.',
      'usb-denied':
        'The computer did not let the browser open the box. On Windows, close other programs that use Android devices; on Linux, a udev rule for the box is needed.',
      busy: 'Another program is using the box (adb, Android Studio, scrcpy or another browser tab). Close it, or run “adb kill-server” in a terminal, then try again.',
      connect:
        'The connection to the box stopped. Unplug the cable, plug it in again and try again.',
      'no-allow':
        'The TV did not answer. Did it show “Allow USB debugging?”? Unplug the cable, plug it in again, try again and choose Allow on the TV.',
      'install-other-key':
        'Another Sofa Tube (signed with another key) is already on the box. Uninstall it on the TV (Settings → Apps → Sofa Tube → Uninstall), then try again.',
      'install-newer':
        'A newer Sofa Tube is already on the box. Nothing to do.',
      'install-storage':
        'The box has too little free space. Remove an app you do not use, then try again.',
      'install-box':
        'This box cannot run this Sofa Tube build (processor or Android version).',
      'install-blocked':
        'The box refused the install. Some boxes have an extra switch in Developer options (“Install via USB”): turn it on and try again.',
      'install-failed': 'The install did not work.'
    }
  },
  ar: {
    firefox:
      'لا يستطيع Firefox الوصول إلى أجهزة USB من صفحة ويب (لا يدعم WebUSB). افتح هذه الصفحة في Google Chrome أو Microsoft Edge على حاسوب.',
    safari:
      'لا يستطيع Safari الوصول إلى أجهزة USB من صفحة ويب (لا يدعم WebUSB). افتح هذه الصفحة في Google Chrome أو Microsoft Edge على حاسوب (على Mac: نسخة Chrome أو Edge لأجهزة Mac).',
    ios: 'لا يمكن التثبيت عبر USB من iPhone أو iPad (لا يدعم أي متصفح هناك WebUSB). استخدم Chrome أو Edge على حاسوب، أو الطرق الأخرى في صفحة الإعداد.',
    other:
      'لا يستطيع هذا المتصفح الوصول إلى أجهزة USB (لا يدعم WebUSB). افتح هذه الصفحة في Google Chrome أو Microsoft Edge على حاسوب.',
    insecure: `افتح هذه الصفحة من ${I('https://sofatube.github.io/ar/usb/')}.`,
    android:
      'يدعم Chrome على هاتف Android WebUSB، لكن التثبيت من الهاتف عبر الكابل لم يُجرَّب بعد. الطريقة المجرَّبة هي الحاسوب.',
    list: 'جارٍ فحص قائمة إصدار صوفا تيوب…',
    listOk: (v, mb) =>
      `صوفا تيوب ${I(v)} لـ${I('Android TV')} (${I(mb + ' MB')}): قائمة الإصدار موقّعة من صوفا تيوب.`,
    getting: (p) => `جارٍ تنزيل صوفا تيوب… ${p}%`,
    pick: 'قد لا يسمح المتصفح للصفحة بتنزيل الملف بنفسها (يسمح GitHub بذلك تنزيلًا عاديًا فقط). نزّل الملف بالزر، ثم اختر الملف الذي نزّلته هنا.',
    checking: 'جارٍ فحص الملف…',
    fileOk: (v) =>
      `فُحص الملف: صوفا تيوب ${I(v)}، وهو الملف نفسه الموجود في قائمة الإصدار الموقّعة.`,
    choose: `اختر الجهاز من قائمة المتصفح، ثم «اتصال» (${I('Connect')}).`,
    connect: (n) => `جارٍ الاتصال بـ${n ? I(n) : 'الجهاز'}…`,
    allow: `انظر إلى التلفاز: يسأل «${I('Allow USB debugging?')}» (السماح بتصحيح أخطاء USB). انتقل إلى ${I('Allow')} (سماح) بجهاز التحكم واضغط OK. لا تحفظ هذه الصفحة مفتاحًا على هذا الحاسوب، لذلك يسأل التلفاز في كل مرة: اترك «${I('Always allow from this computer')}» غير مفعّل.`,
    forget: 'نسيان مفتاح هذا الحاسوب',
    forgot: `تم: لا تحفظ هذه الصفحة أي مفتاح على هذا الحاسوب. وإن ظل التلفاز يسمح لهذا الحاسوب دون أن يسأل، فأزل الإذن من التلفاز: الإعدادات ← خيارات المطوّر ← «${I('Revoke USB debugging authorizations')}» (إلغاء تفويضات تصحيح أخطاء USB).`,
    forgotBusy: 'يُحذف المفتاح القديم بعد إغلاق تبويبات هذا الموقع الأخرى.',
    sending: (p) => `جارٍ إرسال صوفا تيوب إلى الجهاز… ${p}%`,
    installing: 'جارٍ التثبيت على الجهاز… (حتى دقيقة)',
    done: (n) =>
      `تم: ثُبّت صوفا تيوب${n ? ' على ' + I(n) : ''}. تجده في تطبيقات التلفاز، وقد يظهر في آخر الصف. يمكنك نزع الكابل.`,
    errors: {
      'no-webusb': 'لا يستطيع هذا المتصفح الوصول إلى أجهزة USB.',
      'old-browser':
        'هذا المتصفح قديم ولا يستطيع فحص توقيع صوفا تيوب. حدّث Chrome أو Edge ثم حاول مرة أخرى.',
      'list-unsigned':
        'قائمة الإصدار غير موقّعة من صوفا تيوب، لذلك لن يُثبَّت شيء. حاول لاحقًا، وإن استمر ذلك فراسلنا.',
      'list-no-android': `لا تذكر قائمة الإصدار ملفًا لـ${I('Android TV')}. حاول لاحقًا.`,
      'list-fetch':
        'تعذّر تحميل قائمة الإصدار. تحقق من الاتصال بالإنترنت وأعد تحميل الصفحة.',
      'file-size': `هذا ليس الملف الصحيح (حجمه مختلف). اختر ملف ${I('SofaTube-…-AndroidTV-arm.apk')} الذي نزّلته من الزر أعلاه، لا ملفًا أقدم.`,
      'file-checksum':
        'هذا الملف ليس ملف إصدار صوفا تيوب (بصمته مختلفة)، لذلك لن يُثبَّت. نزّله مرة أخرى من الزر أعلاه.',
      'no-device':
        'لم تختر جهازًا. هل كانت القائمة فارغة؟ تحقق من أن تصحيح أخطاء USB مفعّل، وأن الكابل ينقل البيانات (لا كابل شحن فقط)، ومن المنفذ الصحيح (انظر «الأجهزة والكابل»)، وأن لا نافذة أو برنامج آخر يستخدم الجهاز.',
      'usb-denied':
        'لم يسمح الحاسوب للمتصفح بفتح الجهاز. على Windows: أغلق البرامج الأخرى التي تستخدم أجهزة Android. على Linux: تلزم قاعدة udev للجهاز.',
      busy: `برنامج آخر يستخدم الجهاز (adb أو Android Studio أو scrcpy أو تبويب آخر في المتصفح). أغلقه، أو نفّذ «${I('adb kill-server')}» في الطرفية، ثم حاول مرة أخرى.`,
      connect:
        'انقطع الاتصال بالجهاز. انزع الكابل وأعد توصيله ثم حاول مرة أخرى.',
      'no-allow': `لم يُجب التلفاز. هل ظهر سؤال «${I('Allow USB debugging?')}»؟ انزع الكابل وأعد توصيله، وحاول مرة أخرى واختر ${I('Allow')} (سماح) على التلفاز.`,
      'install-other-key':
        'على الجهاز نسخة أخرى من صوفا تيوب موقّعة بمفتاح آخر. أزلها من التلفاز (الإعدادات ← التطبيقات ← صوفا تيوب ← إلغاء التثبيت)، ثم حاول مرة أخرى.',
      'install-newer': 'على الجهاز نسخة أحدث من صوفا تيوب. لا حاجة إلى شيء.',
      'install-storage':
        'المساحة الفارغة على الجهاز قليلة. احذف تطبيقًا لا تستخدمه، ثم حاول مرة أخرى.',
      'install-box':
        'لا يستطيع هذا الجهاز تشغيل هذه النسخة من صوفا تيوب (المعالج أو إصدار Android).',
      'install-blocked': `رفض الجهاز التثبيت. في بعض الأجهزة مفتاح إضافي في خيارات المطوّر («${I('Install via USB')}»): فعّله وحاول مرة أخرى.`,
      'install-failed': 'لم ينجح التثبيت.'
    }
  }
};

/** the message for an error, in the page's language */
export function explain(e, lang) {
  const t = T[lang] || T.en;
  const code = e && e.code;
  if (code && t.errors[code])
    return (
      t.errors[code] +
      (e.detail && /^install-/.test(code) ? ' (' + e.detail + ')' : '')
    );
  return (
    t.errors['install-failed'] + (e && e.message ? ' (' + e.message + ')' : '')
  );
}

function init(doc, win) {
  const lang = doc.documentElement.lang === 'ar' ? 'ar' : 'en';
  const t = T[lang];
  const $ = (id) => doc.getElementById(id);
  const say = (id, text, kind) => {
    const el = $(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'usb-msg' + (kind ? ' ' + kind : '');
    el.hidden = !text;
  };
  const kind = browserKind(win.navigator, win.isSecureContext);
  if (kind !== 'ok' && kind !== 'android') {
    say('usb-browser', t[kind], 'bad');
    $('usb-app').hidden = true;
    return;
  }
  if (kind === 'android') say('usb-browser', t.android, 'warn');

  let list = null;
  let bytes = null;
  const go = $('usb-go');
  // an adb key an earlier build kept in IndexedDB "Tango": gone (this page
  // keeps its key in memory only, memoryCredentialStore)
  forgetKeys(win.indexedDB);
  if (go && doc.createElement) {
    const forget = doc.createElement('button');
    forget.type = 'button';
    forget.id = 'usb-forget';
    forget.className = go.className;
    forget.textContent = t.forget;
    forget.addEventListener('click', async () => {
      const ok = await forgetKeys(win.indexedDB);
      say('usb-msg', ok ? t.forgot : t.forgotBusy, ok ? 'good' : 'warn');
    });
    go.insertAdjacentElement('afterend', forget);
  }
  const ready = () => {
    go.disabled = !bytes;
  };
  ready();

  async function useFile(b) {
    say('usb-file-msg', t.checking);
    try {
      bytes = await checkFile(b, list.android);
      say('usb-file-msg', t.fileOk(list.android.version), 'good');
      $('usb-pick-box').hidden = true;
    } catch (e) {
      bytes = null;
      say('usb-file-msg', explain(e, lang), 'bad');
      $('usb-pick-box').hidden = false;
    }
    ready();
  }

  (async () => {
    say('usb-list-msg', t.list);
    let text;
    try {
      const r = await win.fetch('/version.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      text = await r.text();
    } catch {
      say('usb-list-msg', t.errors['list-fetch'], 'bad');
      return;
    }
    try {
      list = await checkList(text);
    } catch (e) {
      say('usb-list-msg', explain(e, lang), 'bad');
      return;
    }
    const a = list.android;
    say('usb-list-msg', t.listOk(a.version, Math.round(a.size / 1e6)), 'good');
    const dl = $('usb-download');
    dl.href = a.url;
    $('usb-get').disabled = false;
  })();

  $('usb-get').addEventListener('click', async () => {
    if (!list) return;
    $('usb-get').disabled = true;
    say('usb-file-msg', t.getting(0));
    let b = null;
    try {
      b = await tryDownload(list.android, win.fetch.bind(win), (x) =>
        say('usb-file-msg', t.getting(Math.floor(x * 100)))
      );
    } catch (e) {
      say('usb-file-msg', explain(e, lang), 'bad');
    }
    $('usb-get').disabled = false;
    if (b) return useFile(b);
    say('usb-file-msg', t.pick, 'warn');
    $('usb-pick-box').hidden = false;
  });

  $('usb-file').addEventListener('change', async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (f && list) await useFile(new Uint8Array(await f.arrayBuffer()));
  });

  go.addEventListener('click', async () => {
    go.disabled = true;
    const bar = $('usb-bar');
    try {
      const tango = await import(TANGO_FILE);
      await installOverUsb({
        tango,
        bytes,
        open: true,
        onStep: (s, x) => {
          if (s === 'sending') {
            bar.hidden = false;
            bar.value = x || 0;
            say('usb-msg', t.sending(Math.floor((x || 0) * 100)));
          } else if (s === 'done') {
            bar.hidden = true;
            say('usb-msg', t.done(x), 'good');
          } else if (s === 'allow') say('usb-msg', t.allow, 'warn');
          else if (s === 'connect') say('usb-msg', t.connect(x));
          else if (t[s]) say('usb-msg', t[s]);
        }
      });
    } catch (e) {
      bar.hidden = true;
      say('usb-msg', explain(e, lang), 'bad');
    }
    ready();
  });
}

if (typeof document !== 'undefined' && document.getElementById('usb-app'))
  init(document, window);
