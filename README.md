<h1 align="center">
  <img src="docs/icon.png" width="96" alt=""><br>
  Sofa Tube · صوفا تيوب
</h1>

<p align="center">
  A better YouTube app for your TV: no ads, real playback speed, PIN locks, kid mode, prayer times and settings from your phone.<br>
  <b>Website: <a href="https://sofatube.github.io/">sofatube.github.io</a></b> (install steps, videos, tester guide) · Latest: <a href="https://github.com/sofatube/sofatube.github.io/releases/latest">Releases</a>
</p>

> [!IMPORTANT]
> **0.9.5 is a test version.** Parts of it have only run on TV _emulators_ so far. See [What has been tested](#what-has-been-tested).

**[English](#english) · [العربية](#العربية)**

---

## English

### What is Sofa Tube?

Sofa Tube opens YouTube's own TV page and adds features on top: ad blocking and [SponsorBlock](https://sponsor.ajay.app/), playback speed 0.25×–3× with normal pitch, an app lock and a video lock with a PIN, kid mode (allowed hours, approved videos, break reminders), prayer times, night dim and screen off, and settings from your phone over a QR code. English and Arabic.

Remote: 🟩 **Green** opens the settings. No colour buttons? Use **★ Sofa Tube** in YouTube's sidebar or the ★ button in the player bar.

### Install: pick your TV

Short links (type them in the TV's **Downloader** app or on your phone):

| Link                              | File                                                  |
| --------------------------------- | ----------------------------------------------------- |
| `sofatube.github.io/tv`       | Android TV / Google TV / Fire TV app (`.apk`, ~95 MB) |
| `sofatube.github.io/lg`       | LG main app (`.ipk`)                                  |
| `sofatube.github.io/lg-phone` | LG _Sofa Tube Phone_ app (`.ipk`): install this one, it installs Sofa Tube |
| `sofatube.github.io/samsung`  | Samsung app (`.wgt`, install with Apps2Samsung)      |

#### Android TV · Google TV · Fire TV (no computer)

1. On the TV, install **Downloader** (by AFTVnews) from Google Play or the Amazon Appstore.
2. Allow Downloader to install unknown apps:
   - **Android TV / Google TV:** Settings → Apps → Security & restrictions → Unknown sources → Downloader **on**. (Missing? Settings → System → About → press _Android TV OS build_ 7 times, then try again.)
   - **Fire TV:** Settings → My Fire TV → Developer options → Install unknown apps → Downloader **on**. (No Developer options? Settings → My Fire TV → About → press the device name 7 times.)
3. Open Downloader, type **`sofatube.github.io/tv`**, press **Go**.
4. When the download ends: **Install**, then **Open**.

Fallback: copy the `.apk` from the [release](https://github.com/sofatube/sofatube.github.io/releases/latest) to a USB stick and open it with a file manager on the TV.

#### LG TV (webOS) — with an Android phone

1. Uninstall the official **YouTube** app from the TV first (Sofa Tube uses the same app ID, `youtube.leanback.v4`).
2. Create a free LG developer account at [webostv.developer.lge.com](https://webostv.developer.lge.com/).
3. On the TV, install **Developer Mode** from the LG Content Store, open it and sign in. Turn **Dev Mode Status** on (the TV restarts), open it again and turn **Key Server** on. Note the **IP address** and the **passphrase**.
4. On an Android phone on the same Wi-Fi, install **webOS Dev Manager** (Android `.apk` on its [GitHub releases page](https://github.com/webosbrew/dev-manager-desktop/releases/latest)), and add the TV with that IP and passphrase.
5. On the phone, download **`sofatube.github.io/lg-phone`** and install it from webOS Dev Manager. On the TV, open **Sofa Tube Phone** and press **OK** at "Install Sofa Tube": it downloads, checks, installs and opens Sofa Tube (the TV needs internet). To install Sofa Tube yourself instead: `sofatube.github.io/lg`.
6. On the TV, open **Sofa Tube**.

Developer Mode sessions **expire**: open the Developer Mode app now and then and extend the session, or the developer apps stop working.
Fallback: the same steps with [webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop/releases/latest) on a Windows, Mac or Linux computer.

#### Samsung TV (Tizen 4.0, 2018 or newer) — Android phone, no computer

Sofa Tube is its own app on the TV. You install it once with **Apps2Samsung** (free, MIT) on an Android phone on the same Wi-Fi. No Android phone (iPhone)? Use Apps2Samsung on a Windows or Mac computer: the same steps.

1. **TV:** **Apps**, type **1 2 3 4 5**, **Developer mode** On, **Host PC IP** = the phone's IP address (phone: Settings → Wi-Fi → your network), OK, restart the TV (hold Power).
2. **Phone:** install [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung/releases/latest) (the `-android.apk`; computer: `-win-x64.msi` or the Mac `.dmg`).
3. **Phone:** open **`sofatube.github.io/samsung`**: the Sofa Tube `.wgt` downloads.
4. **Apps2Samsung:** App → **📁 Custom WGT / TPK…** → the Sofa Tube file → **Select TV** → **Download & Install**. Sign in to Samsung if it asks (Tizen 7+, most TVs from 2023 on; once).
5. **TV:** **Apps → 1 2 3 4 5** again, **Host PC IP** = `127.0.0.1` (Arabic menus: `1.0.0.127`), restart the TV.
6. **TV:** open **Sofa Tube** from Apps. If it says "One last step on the TV", follow it.

Already use TizenBrew? Add the NPM module **`sofatube`** instead (Green → NPM). Voice search on Samsung: the phone page's **Search** tab (🎤). Full steps and troubleshooting: [sofatube.github.io/install](https://sofatube.github.io/install/#samsung).

### What has been tested

| TV                                | Status for 0.9.5                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| LG webOS                          | LG emulator (webOS 4), including installing Sofa Tube from the Sofa Tube Phone app; earlier versions on a real LG TV. |
| Samsung app (`.wgt`)              | Real Samsung TVs in Samsung's Remote Test Lab (2025 QN80F, 2022 QB80, 2020 QT80) and a 2025 Q7F at home, installed with Apps2Samsung from an Android phone. Whole-TV control from the phone: newer Samsung TVs need a TV box, a computer at home or the parent's open phone page as a relay; the relay is not yet confirmed on a home TV. |
| Samsung (TizenBrew, npm `sofatube`) | Samsung emulator only. **Never tried on a real Samsung TV.**                                           |
| Android TV / Google TV            | Google TV emulator, and a 0.9.5 build on one real Android TV (TCL). **Other brands untested.** |
| Fire TV                           | **Untested.**                                                                                          |
| Install with webOS Dev Manager on a phone | **Not tried by us yet.**                                                                        |

Please report what works and what does not: [open an issue](https://github.com/sofatube/sofatube.github.io/issues) or write to **sofatube.app@proton.me**.

---

<div dir="rtl" lang="ar">

## العربية

### ما صوفا تيوب؟

يفتح صوفا تيوب صفحة YouTube الخاصة بالتلفاز ويضيف إليها ميزات: حجب الإعلانات و<a href="https://sponsor.ajay.app/">SponsorBlock</a>، وسرعة تشغيل من ‎0.25×‎ إلى ‎3×‎ بطبقة صوت طبيعية، وقفل التطبيق وقفل الفيديو برمز سري، ووضع الأطفال (ساعات مسموح بها، وفيديوهات موافق عليها، وتذكير بالاستراحة)، وأوقات الصلاة، والتعتيم الليلي وإطفاء الشاشة، والإعدادات من هاتفك عبر رمز QR. بالعربية والإنجليزية.

جهاز التحكم: الزر 🟩 **الأخضر** يفتح الإعدادات. لا توجد أزرار ملونة؟ استخدم **★ صوفا تيوب** في القائمة الجانبية لـYouTube أو زر ★ في شريط المشغل.

### التثبيت: اختر تلفازك

روابط قصيرة (اكتبها في تطبيق **Downloader** على التلفاز أو في هاتفك):

| الرابط | الملف |
| --- | --- |
| <code dir="ltr">sofatube.github.io/tv</code> | تطبيق Android TV وGoogle TV وFire TV (ملف apk، نحو 95 ميغابايت) |
| <code dir="ltr">sofatube.github.io/lg</code> | تطبيق LG الرئيسي (ملف ipk) |
| <code dir="ltr">sofatube.github.io/lg-phone</code> | تطبيق <bdi>Sofa Tube Phone</bdi> لـLG (ملف ipk): ثبّته وحده، وهو يثبّت صوفا تيوب |
| <code dir="ltr">sofatube.github.io/samsung</code> | تطبيق سامسونج (ملف wgt، يُثبَّت بـ<bdi>Apps2Samsung</bdi>) |

#### أندرويد تي في · جوجل تي في · فاير تي في (دون حاسوب)

1. على التلفاز، ثبّت تطبيق **Downloader** (من AFTVnews) من Google Play أو من متجر Amazon.
2. اسمح لـDownloader بتثبيت التطبيقات غير المعروفة:
   - **Android TV وGoogle TV:** <bdi>Settings → Apps → Security & restrictions → Unknown sources</bdi> ← فعّل Downloader. (غير موجود؟ <bdi>Settings → System → About</bdi> واضغط على <bdi>Android TV OS build</bdi> سبع مرات، ثم أعد المحاولة.)
   - **Fire TV:** <bdi>Settings → My Fire TV → Developer options → Install unknown apps</bdi> ← فعّل Downloader. (لا تظهر <bdi>Developer options</bdi>؟ <bdi>Settings → My Fire TV → About</bdi> واضغط على اسم الجهاز سبع مرات.)
3. افتح Downloader واكتب <code dir="ltr">sofatube.github.io/tv</code> واضغط **Go**.
4. بعد اكتمال التنزيل: **Install** (تثبيت) ثم **Open** (فتح).

البديل: انسخ ملف apk من <a href="https://github.com/sofatube/sofatube.github.io/releases/latest">صفحة الإصدار</a> إلى ذاكرة USB وافتحه بمدير ملفات على التلفاز.

#### تلفاز LG ‏(webOS) — بهاتف أندرويد

1. احذف تطبيق **YouTube** الرسمي من التلفاز أولًا (يستخدم صوفا تيوب مُعرّف التطبيق نفسه <code dir="ltr">youtube.leanback.v4</code>).
2. أنشئ حساب مطوّر مجانيًا من LG في <a href="https://webostv.developer.lge.com/">webostv.developer.lge.com</a>.
3. على التلفاز، ثبّت تطبيق **Developer Mode** من متجر LG Content Store، وافتحه وسجّل الدخول. فعّل **Dev Mode Status** (يُعاد تشغيل التلفاز)، ثم افتحه مجددًا وفعّل **Key Server**. دوّن **عنوان IP** و**عبارة المرور** (Passphrase).
4. على هاتف أندرويد متصل بالواي فاي نفسه، ثبّت **webOS Dev Manager** (ملف apk لأندرويد في <a href="https://github.com/webosbrew/dev-manager-desktop/releases/latest">صفحة إصداراته على GitHub</a>)، وأضف التلفاز بعنوان IP وعبارة المرور.
5. على الهاتف، نزّل <code dir="ltr">sofatube.github.io/lg-phone</code> وثبّته من webOS Dev Manager. وعلى التلفاز، افتح **<bdi>Sofa Tube Phone</bdi>** واضغط **OK** عند «ثبّت صوفا تيوب»: ينزّل صوفا تيوب ويتحقق منه ويثبّته ويفتحه (يحتاج التلفاز إلى الإنترنت). وإن أردت تثبيت صوفا تيوب بنفسك: <code dir="ltr">sofatube.github.io/lg</code>.
6. على التلفاز، افتح **Sofa Tube**.

لجلسة وضع المطوّر مدة **تنتهي**: افتح تطبيق Developer Mode من حين لآخر ومدّد الجلسة، وإلا توقفت تطبيقات المطوّر عن العمل.
البديل: الخطوات نفسها مع <a href="https://github.com/webosbrew/dev-manager-desktop/releases/latest">webOS Dev Manager</a> على حاسوب (ويندوز أو ماك أو لينكس).

#### تلفاز سامسونج ‏(Tizen 4.0، من 2018 فما بعد) — بهاتف أندرويد، دون حاسوب

صوفا تيوب تطبيق مستقل على التلفاز. تثبّته مرة واحدة بتطبيق **<bdi>Apps2Samsung</bdi>** (مجاني) على هاتف أندرويد متصل بالواي فاي نفسه. ليس لديك هاتف أندرويد (آيفون)؟ استخدم <bdi>Apps2Samsung</bdi> على حاسوب ويندوز أو ماك: الخطوات نفسها.

1. **التلفاز:** «التطبيقات» (<bdi>Apps</bdi>)، واكتب <bdi>1 2 3 4 5</bdi>، واجعل **<bdi>Developer mode</bdi>** على <bdi>On</bdi>، و**<bdi>Host PC IP</bdi>** = عنوان IP للهاتف (في الهاتف: الإعدادات ← الواي فاي ← شبكتك)، ثم <bdi>OK</bdi>، وأعد تشغيل التلفاز (اضغط مطولًا على زر الطاقة).
2. **الهاتف:** ثبّت <a href="https://github.com/Apps2Samsung/Apps2Samsung/releases/latest"><bdi>Apps2Samsung</bdi></a> (ملف <code dir="ltr">-android.apk</code>؛ وللحاسوب: <code dir="ltr">-win-x64.msi</code> أو ملف <code dir="ltr">.dmg</code> لماك).
3. **الهاتف:** افتح <code dir="ltr">sofatube.github.io/samsung</code>: يُنزَّل ملف صوفا تيوب (<code dir="ltr">.wgt</code>).
4. **<bdi>Apps2Samsung</bdi>:** <bdi>App</bdi> ← <bdi>📁 Custom WGT / TPK…</bdi> ← ملف صوفا تيوب ← <bdi>Select TV</bdi> ← <bdi>Download &amp; Install</bdi>. سجّل الدخول إلى سامسونج إن طُلب منك (Tizen 7 فما فوق، وأغلبها من 2023؛ مرة واحدة).
5. **التلفاز:** <bdi>Apps → 1 2 3 4 5</bdi> مرة أخرى، و**<bdi>Host PC IP</bdi>** = <code dir="ltr">127.0.0.1</code> (القوائم العربية: <code dir="ltr">1.0.0.127</code>)، ثم أعد تشغيل التلفاز.
6. **التلفاز:** افتح **صوفا تيوب** من «التطبيقات». إن ظهرت «خطوة أخيرة على التلفاز» فاتبعها.

تستخدم TizenBrew؟ أضف وحدة <bdi>NPM</bdi> باسم <code dir="ltr">sofatube</code> بدلًا من ذلك (الأخضر ← <bdi>NPM</bdi>). البحث الصوتي في سامسونج: تبويب **البحث** في صفحة الهاتف (🎤). الخطوات كاملة وحل المشكلات: <a href="https://sofatube.github.io/ar/install/#samsung"><bdi>sofatube.github.io/ar/install</bdi></a>.

### ما الذي جُرِّب

| التلفاز | الحالة في <bdi>0.9.5</bdi> |
| --- | --- |
| LG ‏(webOS) | محاكي LG ‏(webOS 4)، ومنه تثبيت صوفا تيوب من تطبيق <bdi>Sofa Tube Phone</bdi>؛ والإصدارات السابقة على تلفاز LG حقيقي. |
| تطبيق سامسونج (ملف <code dir="ltr">.wgt</code>) | أجهزة تلفاز سامسونج حقيقية في مختبر سامسونج عن بُعد (<bdi>QN80F</bdi> من 2025 و<bdi>QB80</bdi> من 2022 و<bdi>QT80</bdi> من 2020) وجهاز <bdi>Q7F</bdi> من 2025 في المنزل، ثُبّت بـ<bdi>Apps2Samsung</bdi> من هاتف أندرويد. التحكم في التلفاز كله من الهاتف: أجهزة سامسونج الأحدث تحتاج إلى جهاز Android TV أو حاسوب في المنزل أو صفحة هاتف أحد الوالدين مفتوحة وسيطًا؛ ولم يُتأكَّد من الوسيط بعدُ على تلفاز في المنزل. |
| سامسونج (TizenBrew، وحدة <code dir="ltr">sofatube</code>) | محاكي سامسونج فقط. **لم يُجرَّب على تلفاز سامسونج حقيقي.** |
| Android TV وGoogle TV | محاكي Google TV، ونسخة من <bdi>0.9.5</bdi> على تلفاز أندرويد حقيقي واحد (TCL). **لم يُجرَّب على الشركات الأخرى.** |
| Fire TV | **لم يُجرَّب.** |
| التثبيت بـwebOS Dev Manager من الهاتف | **لم نجرّبه بعد.** |

أخبرنا بما نجح وما لم ينجح: <a href="https://github.com/sofatube/sofatube.github.io/issues">افتح بلاغًا (Issue)</a> أو راسلنا على <bdi>sofatube.app@proton.me</bdi>.

</div>

---

## Source, credits and licence

Each release carries a `SofaTube-<version>-source.zip`: the readable userscript build with source maps, and the patches that turn TizenTube Cobalt into the Android app. The full source is available on request from the Sofa Tube team ([open an issue](https://github.com/sofatube/sofatube.github.io/issues) or sofatube.app@proton.me).

Sofa Tube is built on [webosbrew/youtube-webos](https://github.com/webosbrew/youtube-webos) (ad blocking, SponsorBlock, the base injection and build setup). The Samsung version runs in [TizenBrew](https://github.com/reisxd/TizenBrew) by Reis Can (GPL-3.0); several features follow the approach of [TizenTube](https://github.com/reisxd/TizenTube) (GPL-3.0). The Android TV app is built on [TizenTube Cobalt](https://github.com/reisxd/TizenTubeCobalt) (GPL-3.0), which is based on Google's Cobalt (Apache-2.0).

Licensed under **GPL-3.0-only**; see [LICENSE](LICENSE). Any copy you share must keep this licence and make its source available.

Not affiliated with YouTube, Google, LG or Samsung. YouTube is a trademark of Google LLC; Sofa Tube (صوفا تيوب) is not a Google product.

## Publishing a release (maintainers)

Releases are published by GitHub Actions ([`.github/workflows/release.yml`](.github/workflows/release.yml)), so they show `github-actions[bot]` as the author. Create a branch `release-staging` from `main` with `release/release.env` (`TAG`, `TITLE`, `PRERELEASE`), `release/notes.md`, `release/sums.txt` (`sha256sum` output) and the files in `release/assets/`, then push it. The workflow checks the sums, tags `main` and creates the release (or updates the files of an existing one). Delete `release-staging` when it is done. Keep the file names the same so the short links keep working. A release carries exactly **one** `.wgt` (`SofaTube-<ver>-Samsung.wgt`) and no `.tpk`: TizenBrew Installer's "Install from GitHub" installs the first one it finds (the workflow refuses more than one).
