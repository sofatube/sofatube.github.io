# The /setup page (Sofa Tube Setup, 0.9.6): which Setup to download for this device, what the
# person sees the first time (the files are not signed yet) and what Setup asks on each TV.
# Called from build.py (page(lang, 'setup/', ...)). Arabic wording follows docs/ARABIC.md of the
# code repo and the Setup app's own texts. Layout: the detected device's card comes first and is
# marked; every other way stays visible (works without JavaScript too).


# Real screens (0.9.6): Setup on Windows (its page in Chrome) and the Android phone app (emulator), both
# driving LG's webOS TV Emulator, which is why the addresses are 127.0.0.1 / 10.0.2.2. A real TV's address
# in the TV list was blurred. Files in docs/assets/shots/{en,ar}/setup_*.jpg; how they were made:
# site/NOTES-newcomer.md.
PICS = {
    'pc': [('setup_pc_tvs', 720, 642, '1. Pick your TV, or type its address', '1. اختر تلفازك أو اكتب عنوانه'),
           ('setup_pc_yes', 720, 770, '2. Setup says what to press on the TV', '2. يقول الإعداد ما تضغطه على التلفاز'),
           ('setup_pc_done', 720, 979, '3. Done: scan the code for the phone remote', '3. انتهى: امسح الرمز لجهاز التحكم من الهاتف')],
    'phone': [('setup_phone_address', 390, 663, "Type the TV's address if it is not in the list", 'اكتب عنوان التلفاز إن لم يكن في القائمة'),
              ('setup_phone_yes', 390, 782, 'Press YES on the TV when it asks', 'اضغط YES على التلفاز حين يسأل'),
              ('setup_phone_done', 390, 664, 'Sofa Tube runs: open the phone remote', 'صوفا تيوب يعمل: افتح جهاز التحكم من الهاتف')],
}


def _fig(lang, L, f, w, h, ce, ca, cls=''):
    cap = L(lang, ce, ca)
    return (f'<figure{cls}><img src="/assets/shots/{lang}/{f}.jpg" alt="{cap}" width="{w}" height="{h}" loading="lazy" '
            f'decoding="async"><figcaption>{cap}</figcaption></figure>')


def what_you_see(lang, L):
    pc = ''.join(_fig(lang, L, *x) for x in PICS['pc'])
    ph = ''.join(_fig(lang, L, *x) for x in PICS['phone'])
    if lang == 'ar':
        return f'''<h2 id="what-you-see">ما الذي تراه</h2>
<h3>على الحاسوب</h3>
<div class="shots free">{pc}</div>
<h3>على هاتف <bdi>Android</bdi></h3>
<div class="phones">{ph}</div>
<p class="meta">شاشات حقيقية من الإعداد <bdi>0.9.6</bdi> مع محاكي تلفاز LG، ولذلك يظهر عنوان المحاكي (<bdi>127.0.0.1</bdi> و<bdi>10.0.2.2</bdi>)؛ وعلى تلفازك يظهر عنوانه هو.</p>'''
    return f'''<h2 id="what-you-see">What you see</h2>
<h3>On the computer</h3>
<div class="shots free">{pc}</div>
<h3>On an Android phone</h3>
<div class="phones">{ph}</div>
<p class="meta">Real screens of Setup 0.9.6 with LG's webOS TV Emulator, so they show the emulator's address (127.0.0.1, 10.0.2.2); with your TV you see its own address.</p>'''


def atv_pic(lang, L):
    # Google TV emulator: the TV's own remote service asks for pairing (Setup typed 127.0.0.1, run on the TV)
    return ('<div class="shots free one">' + _fig(lang, L, 'setup_atv_code', 720, 425,
            'On the TV: the pairing code; type it in Setup, not on the TV', 'على التلفاز: رمز الربط؛ اكتبه في الإعداد، لا على التلفاز') + '</div>')


def lg_pic(lang, L):
    return ('<div class="shots free one">' + _fig(lang, L, 'setup_lg_yes', 980, 316,
            'On the TV: LG asks once, press YES', 'على التلفاز: يسأل تلفاز LG مرة واحدة، فاضغط YES') + '</div>')


def setup_page(lang, ver, L, url):
    rel = f'https://github.com/sofatube/sofatube.github.io/releases/download/v{ver}/'
    win = rel + f'SofaTubeSetup-{ver}-Windows.exe'
    mac = rel + f'SofaTubeSetup-{ver}-Mac.zip'
    apk = rel + f'SofaTubeSetup-{ver}-Android.apk'
    inst = url(lang, 'install/')
    usb = url(lang, 'usb/')
    script = '''<script>
(function () {
  var ua = navigator.userAgent || '';
  var plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  var kind = /android/i.test(ua) ? 'android-phone'
    : /iphone|ipad|ipod/i.test(ua) || (/mac/i.test(plat) && navigator.maxTouchPoints > 1) ? 'iphone'
    : /win/i.test(plat) ? 'windows'
    : /mac/i.test(plat) ? 'mac' : '';
  if (!kind) return;
  var card = document.getElementById(kind === 'windows' || kind === 'mac' ? 'computer' : kind);
  var box = document.getElementById('setup-ways');
  if (card && box) { box.insertBefore(card, box.firstChild); card.classList.add('mine'); }
  var tag = document.getElementById('tag-' + kind);
  if (tag) tag.style.display = "";
  if (kind === 'mac') {
    var w = document.getElementById('btn-win'), m = document.getElementById('btn-mac');
    if (w && m) { w.className = 'btn ghost'; m.className = 'btn'; m.parentNode.insertBefore(m, w); }
  }
})();
</script>
<style>
#setup-ways .card.mine { border: 2px solid var(--orange); }
#setup-ways { display: flex; flex-direction: column; gap: 14px; margin: 14px 0 22px; }
</style>'''
    if lang == 'ar':
        return f'''<h1>إعداد صوفا تيوب</h1>
<p class="lead">يثبّت صوفا تيوب على تلفازك من حاسوب أو هاتف <bdi>Android</bdi>. لن تكتب شيئًا على التلفاز: الرموز والروابط وتسجيلات الدخول تُكتب على الحاسوب أو الهاتف، ويرسلها الإعداد إلى التلفاز بطريقة التحكم الخاصة بالشركة المصنّعة للتلفاز.</p>
<p class="meta">الإصدار <bdi>{ver}</bdi> · يعمل مع <bdi>Android TV</bdi> و<bdi>Google TV</bdi> وLG و<bdi>Samsung</bdi>. التلفاز والحاسوب (أو الهاتف) على شبكة الواي فاي نفسها.</p>

<div id="setup-ways">
<div class="card" id="android-phone"><h3>هاتف <bdi>Android</bdi> <span class="tag" id="tag-android-phone" style="display:none">جهازك</span></h3>
<p>تطبيق إعداد صوفا تيوب للهاتف: لا حاجة إلى حاسوب.</p>
<div class="row"><a class="btn" href="{apk}">تنزيل التطبيق للهاتف (apk)</a></div>
<p class="meta">في المرة الأولى يطلب <bdi>Android</bdi> السماح للمتصفح بتثبيت التطبيقات: اضغط <b>«الإعدادات»</b>، وفعّل <b>«السماح من هذا المصدر»</b>، ثم ارجع واضغط <b>«تثبيت»</b>.</p></div>

<div class="card" id="computer"><h3>حاسوب ويندوز أو ماك <span class="tag" id="tag-windows" style="display:none">جهازك</span><span class="tag" id="tag-mac" style="display:none">جهازك</span></h3>
<p>ملف واحد، دون تثبيت: افتحه فتُفتح صفحة الإعداد في المتصفح وحدها.</p>
<div class="row"><a class="btn" id="btn-win" href="{win}">ويندوز 10 و11 (<bdi>exe</bdi>، نحو <bdi>92 MB</bdi>)</a> <a class="btn ghost" id="btn-mac" href="{mac}">ماك (zip)</a></div>
<p class="meta">أبقِ نافذة الإعداد مفتوحة حتى يعمل صوفا تيوب على التلفاز. نسخة ماك لم تُجرَّب بعد على جهاز ماك حقيقي.</p></div>

<div class="card" id="iphone"><h3>آيفون أو آيباد فقط؟ <span class="tag" id="tag-iphone" style="display:none">جهازك</span></h3>
<p>لا يسمح متجر آبل بتطبيق يثبّت تطبيقات على التلفاز. استخدم حاسوبًا (ويندوز أو ماك) على شبكة الواي فاي نفسها مرة واحدة، أو هاتف <bdi>Android</bdi>. بعد التثبيت يعمل جهاز التحكم من الآيفون عاديًا.</p>
<p class="meta">أرسل رابط هذه الصفحة إلى الحاسوب: <bdi>sofatube.github.io/ar/setup/</bdi></p></div>
<div class="card" id="usb"><h3>جهاز <bdi>Android TV</bdi> فيه منفذ USB: التثبيت من هذا الحاسوب</h3>
<p><bdi>Chromecast with Google TV</bdi> أو <bdi>Nvidia Shield TV</bdi>، وكابل USB، وChrome أو Edge: يثبّت المتصفح صوفا تيوب عبر الكابل. مفيد حين لا يعمل Downloader. طريقة جديدة لم تُجرَّب بعد على جهاز حقيقي.</p>
<div class="row"><a class="btn ghost" href="{usb}">التثبيت عبر USB</a></div></div>
</div>

<h2 id="first-open">أول مرة تفتح فيها الملف</h2>
<p>ملفات الإعداد غير موقّعة بعد (التوقيع يُظهر اسم شخص، وصوفا تيوب ينشر باسمه فقط). لذلك يحذّر النظام مرة واحدة:</p>
<ul>
<li><b>ويندوز:</b> قد يقول المتصفح إن الملف «لا يُنزَّل عادةً»: اختر <b>«الاحتفاظ»</b> (Keep). ثم تقول نافذة <bdi>Microsoft Defender SmartScreen</bdi> «حمى Windows جهاز الكمبيوتر»: انقر <b>«مزيد من المعلومات»</b> (More info) ثم <b>«التشغيل على أي حال»</b> (Run anyway). إذا سأل جدار الحماية، فاسمح بالشبكات <b>الخاصة</b>.</li>
<li><b>ماك:</b> فك ضغط الملف وانقر نقرًا مزدوجًا على <bdi>Sofa Tube Setup.command</bdi>. إذا قال ماك إنه لا يستطيع التحقق منه: أغلق الرسالة، وافتح <b>إعدادات النظام ← الخصوصية والأمن</b>، وانزل إلى «الأمن»، وانقر <b>«الفتح على أي حال»</b> (Open Anyway)، ثم أكّد بكلمة مرور الماك. تُفتح نافذة الطرفية (Terminal)، وفي المرة الأولى ينزّل الإعداد <bdi>Node.js</bdi> من موقعه الرسمي (نحو <bdi>50 MB</bdi>) إن لم يكن على الماك.</li>
<li><b><bdi>Android</bdi>:</b> السماح بتثبيت التطبيقات للمتصفح مرة واحدة (أعلاه).</li>
</ul>

{what_you_see(lang, L)}

<h2>ما يطلبه الإعداد على كل تلفاز</h2>
<section class="tv-section" id="setup-android">
<h3><bdi>Android TV</bdi> · <bdi>Google TV</bdi></h3>
<ol class="steps">
<li>اختر التلفاز في الإعداد. يعرض التلفاز رمزًا من 6 خانات: اكتبه في الإعداد (لا على التلفاز).</li>
<li>يفتح الإعداد تطبيق <b>Downloader</b> ويكتب الرابط وينزّل صوفا تيوب. إن لم يكن Downloader مثبّتًا، ثبّته من متجر التلفاز (زر البحث الصوتي يجده دون كتابة).</li>
<li>على شاشة التثبيت في <bdi>Android</bdi>: انتقل إلى <b>«تثبيت»</b> (INSTALL) بزر سهم واضغط OK. هذه الضغطة لجهاز تحكم التلفاز وحده. في المرة الأولى قد يطلب التلفاز السماح لـDownloader بتثبيت التطبيقات.</li>
<li>يفتح الإعداد صوفا تيوب ويعرض رمز QR لجهاز التحكم من الهاتف.</li>
</ol>
{atv_pic(lang, L)}</section>
<section class="tv-section" id="setup-lg">
<h3>تلفاز LG ‏(webOS)</h3>
<ol class="steps">
<li>اضغط <b>YES</b> على التلفاز حين يسأل عن السماح لإعداد صوفا تيوب (مرة واحدة).</li>
<li>يفتح الإعداد تطبيق <b>Developer Mode</b> (أو صفحته في متجر LG ليُثبَّت). سجّل الدخول بحساب مطوّر LG المجاني (يُنشأ في المتصفح على <a href="https://webostv.developer.lge.com/">webostv.developer.lge.com</a>): اختر المربع على التلفاز بزر OK، واكتب في الإعداد.</li>
<li>فعّل <b>Dev Mode Status</b> (يُعاد تشغيل التلفاز)، ثم <b>Key Server</b>.</li>
<li>اكتب في الإعداد عبارة المرور (Passphrase) الظاهرة على التلفاز: يثبّت الإعداد صوفا تيوب و«صوفا تيوب للهاتف» بنفسه ثم يفتحه.</li>
</ol>
{lg_pic(lang, L)}
<p class="meta">لجلسة وضع المطوّر مدة تنتهي: <a href="{inst}#lg-update">كيف تبقى صالحة</a>.</p></section>
<section class="tv-section" id="setup-samsung">
<h3>تلفاز <bdi>Samsung</bdi> ‏(Tizen)</h3>
<ol class="steps">
<li>اختر <b>«سماح»</b> (Allow) على التلفاز حين يسأل عن إعداد صوفا تيوب (مرة واحدة).</li>
<li>يفتح الإعداد قائمة التطبيقات ويضغط 1 2 3 4 5: في نافذة <b>وضع المطوّر</b> فعّله، واختر مربع <bdi>Host PC IP</bdi> بزر OK فيكتب الإعداد عنوان الحاسوب، ثم OK، ثم أعد تشغيل التلفاز (اضغط مطولًا على زر التشغيل).</li>
<li>يثبّت الإعداد صوفا تيوب، ثم يكرر الخطوة السابقة بالعنوان <bdi>127.0.0.1</bdi> (يحتاج إليه صوفا تيوب ليعمل)، ثم يفتحه.</li>
<li>تلفزيونات <bdi>Samsung</bdi> من سنة 2023 أو أحدث (<bdi>Tizen 7</bdi> أو أحدث) لا تقبل إلا تطبيقًا موقّعًا لها بشهادة <bdi>Samsung</bdi> الخاصة بمالكها. يجهّز الإعداد وضع المطوّر ثم يرشدك إلى طريقة <a href="{inst}#samsung">Apps2Samsung</a>.</li>
</ol>
<p class="meta">طريقة <bdi>Samsung</bdi> في الإعداد جديدة ولم تُجرَّب بعد على تلفاز <bdi>Samsung</bdi> حقيقي.</p></section>

<h2>الخصوصية</h2>
<ul>
<li>يعمل الإعداد على جهازك وحده، وصفحته على هذا الجهاز فقط (<bdi>127.0.0.1</bdi>). يحفظ الربط بالتلفاز على هذا الجهاز.</li>
<li>ما تكتبه للتلفاز (مثل حساب مطوّر LG) يُرسل إلى التلفاز مباشرة ولا يُحفظ.</li>
<li>ملفات صوفا تيوب تُنزَّل من صفحة الإصدار ويُتحقّق من توقيع قائمة الإصدار ومن بصمة كل ملف قبل أن يصل إلى التلفاز.</li>
</ul>
<p>تفضّل التثبيت بنفسك؟ <a href="{inst}">خطوات التثبيت مع الفيديوهات</a>.</p>
{script}'''
    return f'''<h1>Sofa Tube Setup</h1>
<p class="lead">Installs Sofa Tube on your TV from a computer or an Android phone. You never type on the TV: codes, links and logins are typed on the computer or phone, and Setup sends them to the TV with the TV maker's own remote protocol.</p>
<p class="meta">Version {ver} · for Android TV, Google TV, LG and Samsung. The TV and the computer (or phone) on the same Wi-Fi.</p>

<div id="setup-ways">
<div class="card" id="android-phone"><h3>Android phone <span class="tag" id="tag-android-phone" style="display:none">Your device</span></h3>
<p>Sofa Tube Setup for the phone: no computer needed.</p>
<div class="row"><a class="btn" href="{apk}">Download the phone app (.apk)</a></div>
<p class="meta">The first time, Android asks to allow your browser to install apps: tap <b>Settings</b>, turn on <b>Allow from this source</b>, go back and tap <b>Install</b>.</p></div>

<div class="card" id="computer"><h3>Windows or Mac computer <span class="tag" id="tag-windows" style="display:none">Your device</span><span class="tag" id="tag-mac" style="display:none">Your device</span></h3>
<p>One file, nothing to install: open it and the Setup page opens in your browser by itself.</p>
<div class="row"><a class="btn" id="btn-win" href="{win}">Windows 10 and 11 (.exe, about 92 MB)</a> <a class="btn ghost" id="btn-mac" href="{mac}">Mac (.zip)</a></div>
<p class="meta">Keep the Setup window open until Sofa Tube runs on the TV. The Mac version is not yet tested on a real Mac.</p></div>

<div class="card" id="iphone"><h3>Only an iPhone or iPad? <span class="tag" id="tag-iphone" style="display:none">Your device</span></h3>
<p>Apple's App Store allows no app that installs apps on a TV. Use a Windows or Mac computer on the same Wi-Fi once, or an Android phone. After the install, the phone remote works on the iPhone as usual.</p>
<p class="meta">Send this page's link to the computer: sofatube.github.io/setup/</p></div>
<div class="card" id="usb"><h3>Android TV box with a USB port: install from this computer</h3>
<p>Chromecast with Google TV or Nvidia Shield TV, a USB cable and Chrome or Edge: the browser installs Sofa Tube over the cable. Useful when Downloader does not work. New, not yet tried on a real box.</p>
<div class="row"><a class="btn ghost" href="{usb}">Install over USB</a></div></div>
</div>

<h2 id="first-open">The first time you open it</h2>
<p>The Setup files are not signed yet (a signature would show a person's name; Sofa Tube publishes only as Sofa Tube). So the system warns once:</p>
<ul>
<li><b>Windows:</b> the browser may say the file "isn't commonly downloaded": choose <b>Keep</b>. Then Microsoft Defender SmartScreen says "Windows protected your PC": click <b>More info</b>, then <b>Run anyway</b>. If Windows Firewall asks, allow <b>private networks</b>.</li>
<li><b>Mac:</b> unzip the file and double-click <b>Sofa Tube Setup.command</b>. If the Mac says it cannot check it: close the message, open <b>System Settings → Privacy &amp; Security</b>, scroll to Security, click <b>Open Anyway</b> and confirm with your Mac password. A Terminal window opens; the first time, Setup downloads Node.js from nodejs.org (about 50 MB) if the Mac has none.</li>
<li><b>Android:</b> allow the browser to install apps once (above).</li>
</ul>

{what_you_see(lang, L)}

<h2>What Setup asks on each TV</h2>
<section class="tv-section" id="setup-android">
<h3>Android TV · Google TV</h3>
<ol class="steps">
<li>Pick the TV in Setup. The TV shows a 6-character code: type it in Setup (not on the TV).</li>
<li>Setup opens the <b>Downloader</b> app, types the link and downloads Sofa Tube. If Downloader is not installed, install it from the TV's app store (the voice search button finds it without typing).</li>
<li>On Android's install screen: move to <b>INSTALL</b> with an arrow button and press OK. Only the TV's own remote can do this press. The first time, the TV may ask to allow Downloader to install apps.</li>
<li>Setup opens Sofa Tube and shows the QR code for the phone remote.</li>
</ol>
{atv_pic(lang, L)}</section>
<section class="tv-section" id="setup-lg">
<h3>LG TV (webOS)</h3>
<ol class="steps">
<li>Press <b>YES</b> on the TV when it asks to allow Sofa Tube Setup (once).</li>
<li>Setup opens the <b>Developer Mode</b> app (or its LG Content Store page, to install it). Sign in with your free LG developer account (made in a browser at <a href="https://webostv.developer.lge.com/">webostv.developer.lge.com</a>): select the field on the TV with OK and type in Setup.</li>
<li>Turn on <b>Dev Mode Status</b> (the TV restarts), then <b>Key Server</b>.</li>
<li>Type the Passphrase the TV shows in Setup: Setup installs Sofa Tube and Sofa Tube Phone itself and opens Sofa Tube.</li>
</ol>
{lg_pic(lang, L)}
<p class="meta">The Developer Mode session runs out: <a href="{inst}#lg-update">how to keep it</a>.</p></section>
<section class="tv-section" id="setup-samsung">
<h3>Samsung TV (Tizen)</h3>
<ol class="steps">
<li>Choose <b>Allow</b> on the TV when it asks about Sofa Tube Setup (once).</li>
<li>Setup opens Apps and presses 1 2 3 4 5. In the <b>Developer mode</b> window switch it on, select the <b>Host PC IP</b> field with OK (Setup types the computer's address), press OK and restart the TV (hold the Power button).</li>
<li>Setup installs Sofa Tube, repeats the step above with <b>127.0.0.1</b> (Sofa Tube needs it to start) and opens it.</li>
<li>Samsung TVs from 2023 on (Tizen 7 and newer) take only an app signed for them with the owner's Samsung certificate. Setup prepares Developer mode, then points to the <a href="{inst}#samsung">Apps2Samsung route</a>.</li>
</ol>
<p class="meta">Setup's Samsung route is new and not yet tested on a real Samsung TV.</p></section>

<h2>Privacy</h2>
<ul>
<li>Setup runs on your own device; its page is only on that device (127.0.0.1). The pairing with the TV stays on that device.</li>
<li>What you type for the TV (such as the LG developer account) goes straight to the TV and is not saved.</li>
<li>The Sofa Tube files come from the release page; Setup checks the release list's signature and each file's checksum before anything reaches the TV.</li>
</ul>
<p>Rather install by hand? <a href="{inst}">Install steps with videos</a>.</p>
{script}'''
