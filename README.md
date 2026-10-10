<h1 align="center">
  <img src="docs/icon.png" width="96" alt=""><br>
  Sofa Tube · صوفا تيوب
</h1>

<p align="center">
  A better YouTube app for your TV: no ads, real playback speed, PIN locks, kid mode, prayer times and settings from your phone.<br>
  <b>Website: <a href="https://sofatube.github.io/">sofatube.github.io</a></b> (install steps, videos, tester guide) · Latest: <a href="https://github.com/sofatube/sofatube.github.io/releases/latest">Releases</a>
</p>

> [!IMPORTANT]
> **0.9.1 is a test version.** Parts of it have only run on TV _emulators_ so far. See [What has been tested](#what-has-been-tested).

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
| `sofatube.github.io/lg-phone` | LG _Sofa Tube Phone_ app (`.ipk`, optional)           |

#### Android TV · Google TV · Fire TV (no computer)

1. On the TV, install **Downloader** (by AFTVnews) from Google Play or the Amazon Appstore.
2. Allow Downloader to install unknown apps:
   - **Android TV / Google TV:** Settings → Apps → Security & restrictions → Unknown sources → Downloader **on**. (Missing? Settings → System → About → press _Android TV OS build_ 7 times, then try again.)
   - **Fire TV:** Settings → My Fire TV → Developer options → Install unknown apps → Downloader **on**. (No Developer options? Settings → My Fire TV → About → press the device name 7 times.)
3. Open Downloader, type **`sofatube.github.io/tv`**, press **Go**.
4. When the download ends: **Install**, then **Open**.

**Had the 0.9.0 test app?** Uninstall it first (Settings → Apps → Sofa Tube → Uninstall). 0.9.1 has a new app ID (`io.github.sofatube.tv`), so it installs as a separate app and does not keep the 0.9.0 settings.

Fallback: copy the `.apk` from the [release](https://github.com/sofatube/sofatube.github.io/releases/latest) to a USB stick and open it with a file manager on the TV.

#### LG TV (webOS) — with an Android phone

1. Uninstall the official **YouTube** app from the TV first (Sofa Tube uses the same app ID, `youtube.leanback.v4`).
2. Create a free LG developer account at [webostv.developer.lge.com](https://webostv.developer.lge.com/).
3. On the TV, install **Developer Mode** from the LG Content Store, open it and sign in. Turn **Dev Mode Status** on (the TV restarts), open it again and turn **Key Server** on. Note the **IP address** and the **passphrase**.
4. On an Android phone on the same Wi-Fi, install **webOS Dev Manager** (Android `.apk` on its [GitHub releases page](https://github.com/webosbrew/dev-manager-desktop/releases/latest)), and add the TV with that IP and passphrase.
5. On the phone, download **`sofatube.github.io/lg`** (and, optional, **`sofatube.github.io/lg-phone`**), then install them from webOS Dev Manager.
6. On the TV, open **Sofa Tube**.

Developer Mode sessions **expire**: open the Developer Mode app now and then and extend the session, or the developer apps stop working.
Fallback: the same steps with [webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop/releases/latest) on a Windows, Mac or Linux computer.

#### Samsung TV (Tizen, 2017 or newer) — computer once

Samsung needs **TizenBrew** (by Reis Can). It is installed once from a computer; after that Sofa Tube installs and updates on the TV itself.

1. On the TV: **Apps**, type **1 2 3 4 5**, **Developer mode** on, **Host PC IP** = your computer's IP, OK, restart the TV.
2. On the computer: run **TizenBrew Installer** ([releases](https://github.com/reisxd/TizenBrewInstaller/releases/latest)) → **Install TizenBrew**. Tizen 7+ TVs (2023 on) ask you to sign in to a Samsung account.
3. On the TV: **Apps → 1 2 3 4 5** again, **Host PC IP** = `127.0.0.1`, restart.
4. Open **TizenBrew**, press 🟩 **Green**, add an **NPM** module: **`sofatube`**. Open Sofa Tube from TizenBrew.

Already have TizenBrew (for example from TizenTube)? Do step 4 only. The newest Samsung TVs may refuse TizenBrew. TizenBrew's old TV-browser installer no longer exists (its docs list only the installer above and Tizen Studio).

### What has been tested

| TV                                | Status for 0.9.1                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| LG webOS                          | LG emulator (webOS 4); earlier versions on a real LG TV.                                               |
| Samsung (TizenBrew, npm `sofatube`) | Samsung emulator only. **Never tried on a real Samsung TV.**                                           |
| Android TV / Google TV            | Google TV emulator (x86 build) only. **This ARM `.apk` has not run on a real device yet.**              |
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
| <code dir="ltr">sofatube.github.io/lg-phone</code> | تطبيق <bdi>Sofa Tube Phone</bdi> لـLG (ملف ipk، اختياري) |

#### أندرويد تي في · جوجل تي في · فاير تي في (دون حاسوب)

1. على التلفاز، ثبّت تطبيق **Downloader** (من AFTVnews) من Google Play أو من متجر Amazon.
2. اسمح لـDownloader بتثبيت التطبيقات غير المعروفة:
   - **Android TV وGoogle TV:** <bdi>Settings → Apps → Security & restrictions → Unknown sources</bdi> ← فعّل Downloader. (غير موجود؟ <bdi>Settings → System → About</bdi> واضغط على <bdi>Android TV OS build</bdi> سبع مرات، ثم أعد المحاولة.)
   - **Fire TV:** <bdi>Settings → My Fire TV → Developer options → Install unknown apps</bdi> ← فعّل Downloader. (لا تظهر <bdi>Developer options</bdi>؟ <bdi>Settings → My Fire TV → About</bdi> واضغط على اسم الجهاز سبع مرات.)
3. افتح Downloader واكتب <code dir="ltr">sofatube.github.io/tv</code> واضغط **Go**.
4. بعد اكتمال التنزيل: **Install** (تثبيت) ثم **Open** (فتح).

**كان لديك تطبيق النسخة التجريبية <bdi>0.9.0</bdi>؟** احذفه أولًا (<bdi>Settings → Apps → Sofa Tube → Uninstall</bdi>). للنسخة <bdi>0.9.1</bdi> مُعرّف تطبيق جديد (<code dir="ltr">io.github.sofatube.tv</code>)، فتُثبَّت تطبيقًا منفصلًا ولا تنتقل إليها إعدادات <bdi>0.9.0</bdi>.

البديل: انسخ ملف apk من <a href="https://github.com/sofatube/sofatube.github.io/releases/latest">صفحة الإصدار</a> إلى ذاكرة USB وافتحه بمدير ملفات على التلفاز.

#### تلفاز LG ‏(webOS) — بهاتف أندرويد

1. احذف تطبيق **YouTube** الرسمي من التلفاز أولًا (يستخدم صوفا تيوب مُعرّف التطبيق نفسه <code dir="ltr">youtube.leanback.v4</code>).
2. أنشئ حساب مطوّر مجانيًا من LG في <a href="https://webostv.developer.lge.com/">webostv.developer.lge.com</a>.
3. على التلفاز، ثبّت تطبيق **Developer Mode** من متجر LG Content Store، وافتحه وسجّل الدخول. فعّل **Dev Mode Status** (يُعاد تشغيل التلفاز)، ثم افتحه مجددًا وفعّل **Key Server**. دوّن **عنوان IP** و**عبارة المرور** (Passphrase).
4. على هاتف أندرويد متصل بالواي فاي نفسه، ثبّت **webOS Dev Manager** (ملف apk لأندرويد في <a href="https://github.com/webosbrew/dev-manager-desktop/releases/latest">صفحة إصداراته على GitHub</a>)، وأضف التلفاز بعنوان IP وعبارة المرور.
5. على الهاتف، نزّل <code dir="ltr">sofatube.github.io/lg</code> (واختياريًا <code dir="ltr">sofatube.github.io/lg-phone</code>)، ثم ثبّتهما من webOS Dev Manager.
6. على التلفاز، افتح **Sofa Tube**.

لجلسة وضع المطوّر مدة **تنتهي**: افتح تطبيق Developer Mode من حين لآخر ومدّد الجلسة، وإلا توقفت تطبيقات المطوّر عن العمل.
البديل: الخطوات نفسها مع <a href="https://github.com/webosbrew/dev-manager-desktop/releases/latest">webOS Dev Manager</a> على حاسوب (ويندوز أو ماك أو لينكس).

#### تلفاز سامسونج ‏(Tizen، من 2017 فما بعد) — حاسوب مرة واحدة

يحتاج سامسونج إلى **TizenBrew** (من Reis Can). يُثبَّت مرة واحدة من حاسوب، وبعدها يُثبَّت صوفا تيوب ويتحدّث على التلفاز نفسه.

1. على التلفاز: **Apps**، واكتب <bdi>1 2 3 4 5</bdi>، واجعل **Developer mode** على On، و**Host PC IP** = عنوان IP لحاسوبك، ثم OK، وأعد تشغيل التلفاز.
2. على الحاسوب: شغّل **TizenBrew Installer** (<a href="https://github.com/reisxd/TizenBrewInstaller/releases/latest">الإصدارات</a>) ← **Install TizenBrew**. أجهزة Tizen 7 فما فوق (من 2023) تطلب تسجيل الدخول بحساب سامسونج.
3. على التلفاز: <bdi>Apps → 1 2 3 4 5</bdi> مرة أخرى، و**Host PC IP** = <code dir="ltr">127.0.0.1</code>، ثم أعد التشغيل.
4. افتح **TizenBrew**، واضغط 🟩 **الأخضر**، وأضف وحدة **NPM** باسم <code dir="ltr">sofatube</code>. افتح صوفا تيوب من TizenBrew.

لديك TizenBrew مسبقًا (من TizenTube مثلًا)؟ نفّذ الخطوة 4 فقط. قد ترفض أحدث أجهزة سامسونج تثبيت TizenBrew. ولم يعد مثبّت TizenBrew القديم عبر متصفح التلفاز متاحًا.

### ما الذي جُرِّب

| التلفاز | الحالة في <bdi>0.9.1</bdi> |
| --- | --- |
| LG ‏(webOS) | محاكي LG ‏(webOS 4)؛ والإصدارات السابقة على تلفاز LG حقيقي. |
| سامسونج (TizenBrew، وحدة <code dir="ltr">sofatube</code>) | محاكي سامسونج فقط. **لم يُجرَّب على تلفاز سامسونج حقيقي.** |
| Android TV وGoogle TV | محاكي Google TV فقط. **ملف ARM هذا لم يعمل على جهاز حقيقي بعد.** |
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

Releases are published by GitHub Actions ([`.github/workflows/release.yml`](.github/workflows/release.yml)), so they show `github-actions[bot]` as the author. Create a branch `release-staging` from `main` with `release/release.env` (`TAG`, `TITLE`, `PRERELEASE`), `release/notes.md`, `release/sums.txt` (`sha256sum` output) and the files in `release/assets/`, then push it. The workflow checks the sums, tags `main` and creates the release (or updates the files of an existing one). Delete `release-staging` when it is done. Keep the file names the same so the short links keep working.
