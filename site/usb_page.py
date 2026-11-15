# The /usb page (0.9.6, new): installs Sofa Tube on an Android TV box over a USB cable, from Chrome
# or Edge on a computer (WebUSB + Tango / ya-webadb, MIT, bundled in docs/usb/). Called from
# build.py (page(lang, 'usb/', ...)). The scripts in docs/usb/ come from the code repo:
# node tools/site-usb/build.mjs --out <this clone>/docs/usb (do not edit them here).
# The page's changing messages (EN + AR) are in docs/usb/usb-install.js; the static text is here.
# Arabic wording follows docs/ARABIC.md of the code repo; Latin labels of the TV stay Latin in <bdi>.

STYLE = '''<style>
#usb-app .usb-step { margin: 0 0 18px; }
#usb-app .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 10px 0; }
#usb-app button.btn { font: inherit; cursor: pointer; border: 0; }
#usb-app button.btn:disabled { opacity: .45; cursor: not-allowed; }
#usb-app input[type=file] { max-width: 100%; }
#usb-app progress { width: 100%; height: 14px; }
.usb-msg { margin: 8px 0; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); overflow-wrap: anywhere; }
.usb-msg.good { border-color: #4CAF50; }
.usb-msg.warn { border-color: var(--warn-line); background: var(--warn-bg); }
.usb-msg.bad { border-color: var(--orange-red); background: var(--warn-bg); }
.usb-boxes { display: flex; flex-direction: column; gap: 12px; margin: 12px 0 20px; }
</style>'''


def usb_page(lang, ver, L, url):
    setup = url(lang, 'setup/')
    inst = url(lang, 'install/')
    script = '<script type="module" src="/usb/usb-install.js"></script>'
    if lang == 'ar':
        return f'''{STYLE}
<h1>التثبيت من هذا الحاسوب عبر USB</h1>
<p class="lead">لأجهزة <bdi>Android TV</bdi> التي يتصل منفذ USB فيها بالحاسوب، مثل <bdi>Chromecast with Google TV</bdi> و<bdi>Nvidia Shield TV</bdi>: يثبّت Chrome أو Edge صوفا تيوب عبر كابل، دون Downloader ودون مفتاح «تثبيت التطبيقات غير المعروفة».</p>
<div class="note" role="note"><p><b>طريقة جديدة في الإصدار <bdi>{ver}</bdi>.</b> جُرِّبت على جهاز USB محاكى وعلى محاكي <bdi>Android TV</bdi>، ولم تُجرَّب بعد على جهاز <bdi>Chromecast</bdi> أو <bdi>Shield</bdi> حقيقي. إن لم تنجح، فاستخدم <a href="{setup}">إعداد صوفا تيوب</a> أو <a href="{inst}">طريقة Downloader</a>، وأخبرنا بما حدث.</p></div>
<p id="usb-browser" class="usb-msg" hidden></p>
<noscript><p class="usb-msg bad">تحتاج هذه الصفحة إلى JavaScript.</p></noscript>

<h2>الأجهزة والكابل</h2>
<div class="usb-boxes">
<div class="card"><h3><bdi>Chromecast with Google TV</bdi> ‏(<bdi>4K</bdi> و<bdi>HD</bdi>)</h3>
<p>منفذ <bdi>USB-C</bdi> الوحيد فيه (منفذ الكهرباء) إلى الحاسوب، بكابل ينقل البيانات (<bdi>USB-A</bdi> إلى <bdi>USB-C</bdi>، أو <bdi>USB-C</bdi> إلى <bdi>USB-C</bdi>). يأخذ الجهاز الكهرباء من الحاسوب في أثناء ذلك: إن أعاد التشغيل أو لم يعمل، فاستخدم منفذًا آخر في الحاسوب أو موزّع USB بكهرباء.</p></div>
<div class="card"><h3><bdi>Nvidia Shield TV Pro</bdi> ‏(2019) و<bdi>Shield TV</bdi> ‏(2017)</h3>
<p>كابل <bdi>USB-A</bdi> إلى <bdi>USB-A</bdi> بين الحاسوب وأحد منفذي USB في الجهاز (إن لم يظهر، فجرّب المنفذ الآخر). يبقى الجهاز موصولًا بكهربائه. جهاز <bdi>Shield TV</bdi> الأسطواني (2019) لا منفذ USB فيه.</p></div>
<div class="card"><h3>التلفزيونات وأغلب الأجهزة الأخرى</h3>
<p>منافذ USB في التلفزيونات (TCL وسوني وهايسنس وغيرها) وفي أغلب أجهزة <bdi>Fire TV</bdi> لا تتصل بالحاسوب بهذه الطريقة. استخدم <a href="{setup}">إعداد صوفا تيوب</a> أو <a href="{inst}">خطوات التثبيت</a>.</p></div>
</div>

<h2>الخطوات</h2>
<div id="usb-app">
<ol class="steps">
<li class="usb-step"><b>فعّل تصحيح أخطاء USB على الجهاز</b> (مرة واحدة).
<ul>
<li><bdi>Google TV</bdi> و<bdi>Chromecast</bdi>: الإعدادات ← النظام ← حول (<bdi>Settings → System → About</bdi>). انتقل إلى <b><bdi>Android TV OS build</bdi></b> واضغط OK سبع مرات حتى تظهر «<bdi>You are now a developer</bdi>». ثم الإعدادات ← النظام ← <b>خيارات المطوّرين</b> (<bdi>Developer options</bdi>) ← <b>تصحيح أخطاء USB</b> (<bdi>USB debugging</bdi>): مفعّل.</li>
<li><bdi>Shield</bdi>: الإعدادات ← <bdi>Device Preferences</bdi> ← <bdi>About</bdi> ← <b><bdi>Build</bdi></b> سبع مرات، ثم <bdi>Device Preferences</bdi> ← <bdi>Developer options</bdi> ← <bdi>USB debugging</bdi>: مفعّل.</li>
</ul></li>
<li class="usb-step"><b>صِل الكابل</b> كما في الأعلى. أغلق البرامج الأخرى التي تستخدم أجهزة أندرويد على هذا الحاسوب (<bdi>adb</bdi> و<bdi>Android Studio</bdi> و<bdi>scrcpy</bdi>).</li>
<li class="usb-step"><b>احصل على ملف صوفا تيوب.</b>
<p id="usb-list-msg" class="usb-msg" hidden></p>
<div class="row"><button class="btn" id="usb-get" type="button" disabled>تجهيز الملف</button></div>
<div id="usb-pick-box" hidden>
<div class="row"><a class="btn ghost" id="usb-download" href="#" download>تنزيل صوفا تيوب (<bdi>apk</bdi>)</a></div>
<div class="row"><label for="usb-file">ثم اختر الملف الذي نزّلته:</label> <input type="file" id="usb-file" accept=".apk,application/vnd.android.package-archive"></div>
</div>
<p id="usb-file-msg" class="usb-msg" hidden></p></li>
<li class="usb-step"><b>صِل الجهاز وثبّت.</b> تفتح قائمة في المتصفح: اختر الجهاز ثم «اتصال» (<bdi>Connect</bdi>).
<div class="row"><button class="btn" id="usb-go" type="button" disabled>الاتصال بالجهاز والتثبيت</button></div>
<progress id="usb-bar" max="1" value="0" hidden></progress>
<p id="usb-msg" class="usb-msg" role="status" aria-live="polite" hidden></p></li>
<li class="usb-step"><b>على التلفاز:</b> يسأل «<bdi>Allow USB debugging?</bdi>» (السماح بتصحيح أخطاء USB). انتقل إلى <b><bdi>Allow</bdi></b> (سماح) بجهاز التحكم واضغط OK. وإن فعّلت «<bdi>Always allow from this computer</bdi>» فلن يُطرح السؤال في المرة القادمة.</li>
<li class="usb-step">بعد «تم» يفتح صوفا تيوب على التلفاز. يمكنك بعدها إيقاف تصحيح أخطاء USB من خيارات المطوّرين.</li>
</ol>
</div>

<h2>الأمان والخصوصية</h2>
<ul>
<li>كل شيء يحدث في هذا المتصفح: لا خادم بين الحاسوب والجهاز.</li>
<li>قبل التثبيت يُتحقَّق من توقيع قائمة الإصدار (<bdi>version.json</bdi>) بمفتاح صوفا تيوب، ومن حجم الملف وبصمته (<bdi>sha256</bdi>).</li>
<li>يحفظ المتصفح مفتاحًا لهذا الحاسوب ليعرفه الجهاز (كما يفعل <bdi>adb</bdi>). لإلغائه: خيارات المطوّرين ← <bdi>Revoke USB debugging authorizations</bdi>.</li>
<li>تستخدم الصفحة مكتبة <a href="https://github.com/yume-chan/ya-webadb"><bdi>Tango (ya-webadb)</bdi></a> برخصة <a href="/usb/tango-adb-LICENSE.txt"><bdi>MIT</bdi></a>، منسوخة على هذا الموقع.</li>
</ul>
<p class="meta">تعمل في Google Chrome وMicrosoft Edge على ويندوز وماك ولينكس وكروم بوك. لا تعمل في فايرفوكس وسفاري ولا على آيفون (لا يدعم أيٌّ منها WebUSB).</p>
{script}'''
    return f'''{STYLE}
<h1>Install from this computer over USB</h1>
<p class="lead">For Android TV boxes whose USB port can talk to a computer, such as Chromecast with Google TV and Nvidia Shield TV: Chrome or Edge installs Sofa Tube over a cable. No Downloader, no "Install unknown apps" switch.</p>
<div class="note" role="note"><p><b>New in {ver}.</b> Tested with a simulated USB box and the Android TV emulator, not yet on a real Chromecast or Shield. If it does not work, use <a href="{setup}">Sofa Tube Setup</a> or <a href="{inst}">the Downloader way</a>, and tell us what happened.</p></div>
<p id="usb-browser" class="usb-msg" hidden></p>
<noscript><p class="usb-msg bad">This page needs JavaScript.</p></noscript>

<h2>Boxes and cable</h2>
<div class="usb-boxes">
<div class="card"><h3>Chromecast with Google TV (4K and HD)</h3>
<p>Its only USB-C port (the power port) to the computer, with a cable that carries data (USB-A to USB-C, or USB-C to USB-C). The box runs on the computer's power meanwhile: if it restarts or does not start, use another USB port of the computer or a powered USB hub.</p></div>
<div class="card"><h3>Nvidia Shield TV Pro (2019) and Shield TV (2017)</h3>
<p>A USB-A to USB-A cable from the computer to one of the box's USB ports (if the box is not seen, try the other port). The box stays on its own power. The tube-shaped Shield TV (2019) has no USB port.</p></div>
<div class="card"><h3>TV sets and most other boxes</h3>
<p>The USB ports of TV sets (TCL, Sony, Hisense and others) and of most Fire TV devices cannot talk to a computer this way. Use <a href="{setup}">Sofa Tube Setup</a> or <a href="{inst}">the install steps</a>.</p></div>
</div>

<h2>Steps</h2>
<div id="usb-app">
<ol class="steps">
<li class="usb-step"><b>Turn on USB debugging on the box</b> (once).
<ul>
<li>Google TV and Chromecast: <b>Settings → System → About</b>. Move to <b>Android TV OS build</b> and press OK seven times, until "You are now a developer". Then <b>Settings → System → Developer options → USB debugging</b>: on.</li>
<li>Shield: <b>Settings → Device Preferences → About → Build</b> seven times, then <b>Device Preferences → Developer options → USB debugging</b>: on.</li>
</ul></li>
<li class="usb-step"><b>Connect the cable</b> as above. Close other programs on this computer that use Android devices (adb, Android Studio, scrcpy).</li>
<li class="usb-step"><b>Get the Sofa Tube file.</b>
<p id="usb-list-msg" class="usb-msg" hidden></p>
<div class="row"><button class="btn" id="usb-get" type="button" disabled>Get the file</button></div>
<div id="usb-pick-box" hidden>
<div class="row"><a class="btn ghost" id="usb-download" href="#" download>Download Sofa Tube (.apk)</a></div>
<div class="row"><label for="usb-file">Then choose the downloaded file:</label> <input type="file" id="usb-file" accept=".apk,application/vnd.android.package-archive"></div>
</div>
<p id="usb-file-msg" class="usb-msg" hidden></p></li>
<li class="usb-step"><b>Connect the box and install.</b> The browser opens a list: choose the box, then <b>Connect</b>.
<div class="row"><button class="btn" id="usb-go" type="button" disabled>Connect the box and install</button></div>
<progress id="usb-bar" max="1" value="0" hidden></progress>
<p id="usb-msg" class="usb-msg" role="status" aria-live="polite" hidden></p></li>
<li class="usb-step"><b>On the TV:</b> it asks "Allow USB debugging?". Move to <b>Allow</b> with the remote and press OK. Tick "Always allow from this computer" to skip the question next time.</li>
<li class="usb-step">After "Done", Sofa Tube opens on the TV. You can then turn USB debugging off again in Developer options.</li>
</ol>
</div>

<h2>Safety and privacy</h2>
<ul>
<li>Everything happens in this browser: no server between the computer and the box.</li>
<li>Before installing, the page checks the release list's (version.json) signature with Sofa Tube's key, and the file's size and checksum (sha256).</li>
<li>The browser keeps a key for this computer so the box knows it (as adb does). To remove it: Developer options → Revoke USB debugging authorizations.</li>
<li>The page uses <a href="https://github.com/yume-chan/ya-webadb">Tango (ya-webadb)</a>, <a href="/usb/tango-adb-LICENSE.txt">MIT licence</a>, copied onto this site.</li>
</ul>
<p class="meta">Works in Google Chrome and Microsoft Edge on Windows, Mac, Linux and Chromebook. Not in Firefox or Safari, and not on an iPhone (none of them has WebUSB).</p>
{script}'''
