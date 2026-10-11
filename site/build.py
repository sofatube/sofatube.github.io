# Builds the Sofa Tube website (docs/) from this file. Run: python site/build.py
# English pages live at /, Arabic pages at /ar/. The short links docs/tv, docs/lg and
# docs/lg-phone are NOT made here (the release steps update them); this script never touches them.
# Arabic wording is taken from the app, the tester guide and the install page; keep it that way.
import html
import pathlib
import re

DOCS = pathlib.Path(__file__).resolve().parent.parent / 'docs'
SITE = 'https://sofatube.github.io'
REPO = 'https://github.com/sofatube/sofatube.github.io'
ISSUES = REPO + '/issues'
RELEASES = REPO + '/releases/latest'
MAIL = 'sofatube.app@proton.me'
VER = '0.9.1'

PAGES = [('', 'Home', 'الرئيسية'), ('install/', 'Install', 'التثبيت'), ('videos/', 'Videos', 'الفيديوهات'),
         ('testers/', 'Testers', 'للمجرّبين'), ('faq/', 'FAQ', 'الأسئلة الشائعة')]


def L(lang, en, ar):
    return ar if lang == 'ar' else en


def url(lang, slug):
    return ('/ar/' if lang == 'ar' else '/') + slug


def page(lang, slug, title, desc, body):
    other = 'en' if lang == 'ar' else 'ar'
    desc = re.sub(r'<[^>]+>', '', desc)
    nav = ''.join(
        f'<a href="{url(lang, s)}"{" aria-current=\"page\"" if s == slug else ""}>{L(lang, en, ar)}</a>'
        for s, en, ar in PAGES)
    switch = (f'<a class="lang" href="{url(other, slug)}" hreflang="{other}" lang="{other}">'
              f'{"English" if other == "en" else "العربية"}</a>')
    full_title = f'{title} · {L(lang, "Sofa Tube", "صوفا تيوب")}' if slug else L(
        lang, 'Sofa Tube · صوفا تيوب: a better YouTube app for your TV', 'صوفا تيوب · Sofa Tube: تطبيق YouTube أفضل لتلفازك')
    foot = footer(lang)
    doc = f'''<!doctype html>
<html lang="{lang}" dir="{'rtl' if lang == 'ar' else 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(full_title)}</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#FF8A00">
<link rel="canonical" href="{SITE}{url(lang, slug)}">
<link rel="alternate" hreflang="en" href="{SITE}{url('en', slug)}">
<link rel="alternate" hreflang="ar" href="{SITE}{url('ar', slug)}">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="icon" href="/icon.png" type="image/png">
<link rel="apple-touch-icon" href="/icon.png">
<meta property="og:title" content="{html.escape(full_title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:image" content="{SITE}/assets/shots/settings.jpg">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<a class="skip" href="#main">{L(lang, 'Skip to content', 'انتقل إلى المحتوى')}</a>
<header class="site-head"><div class="wrap">
<a class="logo" href="{url(lang, '')}"><img src="/icon.svg" alt="" width="40" height="40"><span class="brand">{L(lang, 'Sofa Tube', 'صوفا تيوب')}</span></a>
<nav class="nav" aria-label="{L(lang, 'Site', 'الموقع')}">{nav}{switch}</nav>
</div></header>
<main id="main"><div class="wrap">
{body}
</div></main>
{foot}
</body>
</html>
'''
    out = DOCS / ('ar' if lang == 'ar' else '') / slug / 'index.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc, encoding='utf-8', newline='\n')


def footer(lang):
    if lang == 'ar':
        return f'''<footer class="site-foot"><div class="wrap">
<p><b>للتواصل:</b> <a href="mailto:{MAIL}"><bdi>{MAIL}</bdi></a> · <a href="{ISSUES}">افتح بلاغًا (Issue) على GitHub</a></p>
<p>صوفا تيوب مشروع مجاني برخصة <a href="{REPO}/blob/main/LICENSE"><bdi>GPL-3.0</bdi></a>، مبني على <a href="https://github.com/webosbrew/youtube-webos">webosbrew/youtube-webos</a> و<a href="https://github.com/reisxd/TizenBrew">TizenBrew</a> (لمطوّره <bdi>Reis Can</bdi>) و<a href="https://github.com/reisxd/TizenTube">TizenTube</a> و<a href="https://github.com/reisxd/TizenTubeCobalt">TizenTube Cobalt</a> (المبني على <bdi>Cobalt</bdi> من Google برخصة <bdi>Apache-2.0</bdi>)، ويستخدم <a href="https://sponsor.ajay.app/">SponsorBlock</a>. خط العناوين <bdi>Baloo Bhaijaan 2</bdi> برخصة <a href="/assets/fonts/OFL.txt">SIL OFL</a>.</p>
<p>صوفا تيوب غير تابع لـYouTube أو Google أو LG أو سامسونج. YouTube علامة تجارية لشركة <bdi>Google LLC</bdi>.</p>
<p><a href="{REPO}">github.com/sofatube/sofatube.github.io</a> · <a href="{RELEASES}">كل الملفات</a></p>
</div></footer>'''
    return f'''<footer class="site-foot"><div class="wrap">
<p><b>Contact:</b> <a href="mailto:{MAIL}">{MAIL}</a> · <a href="{ISSUES}">GitHub Issues</a></p>
<p>Sofa Tube is a free <a href="{REPO}/blob/main/LICENSE">GPL-3.0</a> project built on <a href="https://github.com/webosbrew/youtube-webos">webosbrew/youtube-webos</a>, <a href="https://github.com/reisxd/TizenBrew">TizenBrew</a> by Reis Can, <a href="https://github.com/reisxd/TizenTube">TizenTube</a> and <a href="https://github.com/reisxd/TizenTubeCobalt">TizenTube Cobalt</a> (based on Google's Cobalt, Apache-2.0), and uses <a href="https://sponsor.ajay.app/">SponsorBlock</a>. Headings use Baloo Bhaijaan 2 (<a href="/assets/fonts/OFL.txt">SIL OFL</a>).</p>
<p>Not affiliated with YouTube, Google, LG or Samsung. YouTube is a trademark of Google LLC; Sofa Tube (صوفا تيوب) is not a Google product.</p>
<p><a href="{REPO}">github.com/sofatube/sofatube.github.io</a> · <a href="{RELEASES}">All files (releases)</a></p>
</div></footer>'''


# ------------------------------------------------------------------ shared bits

def test_note(lang):
    return L(lang,
             f'<div class="note" role="note"><p><b>{VER} is a test version.</b> Some parts have only been tried on TV emulators (software copies of a TV), never on a real TV. <a href="/testers/#status">What has been tested</a>.</p></div>',
             f'<div class="note" role="note"><p><b>هذه نسخة تجريبية (<bdi>{VER}</bdi>).</b> بعض أجزائها جُرِّبت على محاكيات فقط (نسخ برمجية من التلفاز)، ولم تُجرَّب على تلفاز حقيقي بعد. <a href="/ar/testers/#status">ما الذي جُرِّب</a>.</p></div>')


def remote_keys(lang):
    if lang == 'ar':
        return '''<ul class="keys">
<li><span class="key k-g"></span><b>الأخضر</b>: الإعدادات</li>
<li><span class="key k-r"></span><b>الأحمر</b>: السرعة (أثناء المشاهدة)</li>
<li><span class="key k-y"></span><b>الأصفر</b>: قائمة الإجراءات</li>
<li><span class="key k-b"></span><b>الأزرق</b>: وضع الصوت فقط</li>
</ul>
<p>أزرار الأرقام من 1 إلى 9: الانتقال إلى نقطة من 10% إلى 90%، و0: العودة إلى البداية · زرّا القنوات (<bdi>CH</bdi>): الفصل التالي أو السابق · اضغط مطولًا على زر ملوّن لترى وظيفة كل زر.</p>
<p>لا توجد أزرار ملونة؟ استخدم <b>★ صوفا تيوب</b> في القائمة الجانبية لـYouTube، أو زر ★ بين أزرار التحكم، أو «صوفا تيوب» في أعلى صفحة إعدادات YouTube.</p>'''
    return '''<ul class="keys">
<li><span class="key k-g"></span><b>Green</b>: settings</li>
<li><span class="key k-r"></span><b>Red</b>: speed (while watching)</li>
<li><span class="key k-y"></span><b>Yellow</b>: Action menu</li>
<li><span class="key k-b"></span><b>Blue</b>: audio only</li>
</ul>
<p>1–9 jump to 10%–90%, 0 back to start · CH+ / CH− next / previous chapter · hold a colour button: what every button does.</p>
<p>No colour buttons? Use <b>★ Sofa Tube</b> in YouTube's sidebar, the ★ button in the player bar, or Sofa Tube at the top of YouTube's Settings page.</p>'''


def download_cards(lang):
    i = url(lang, 'install/')
    if lang == 'ar':
        return f'''<div class="grid dl">
<div class="card"><h3>أندرويد تي في · جوجل تي في · فاير تي في</h3>
<p>اكتب في تطبيق <b>Downloader</b> على التلفاز:</p>
<p class="link">sofatube.github.io/tv</p>
<div class="row"><a class="btn" href="/tv/">تنزيل ملف apk</a></div>
<p class="meta">نحو 95 ميغابايت · <a href="{i}#android">خطوات التثبيت</a></p></div>
<div class="card"><h3>تلفاز LG ‏(webOS)</h3>
<p>نزّل الملفين على هاتف أندرويد وثبّتهما بـ<bdi>webOS Dev Manager</bdi>:</p>
<p class="link">sofatube.github.io/lg</p>
<p class="link">sofatube.github.io/lg-phone</p>
<div class="row"><a class="btn" href="/lg/">التطبيق الرئيسي (ipk)</a> <a class="btn ghost" href="/lg-phone/">تطبيق <bdi>Sofa Tube Phone</bdi> (اختياري)</a></div>
<p class="meta"><a href="{i}#lg">خطوات التثبيت</a></p></div>
<div class="card"><h3>تلفاز سامسونج ‏(Tizen)</h3>
<p>لا ملف. ثبّت <b>TizenBrew</b> ثم أضف وحدة NPM باسم:</p>
<p class="link">sofatube</p>
<div class="row"><a class="btn" href="{i}#samsung">خطوات التثبيت</a></div>
<p class="meta">تلفاز سامسونج من سنة 2018 أو أحدث</p></div>
</div>
<p><a href="{RELEASES}">كل الملفات</a> (صفحة الإصدار، ومنها ملف المصدر <bdi>source.zip</bdi>)</p>'''
    return f'''<div class="grid dl">
<div class="card"><h3>Android TV · Google TV · Fire TV</h3>
<p>Type this in the <b>Downloader</b> app on the TV:</p>
<p class="link">sofatube.github.io/tv</p>
<div class="row"><a class="btn" href="/tv/">Download .apk</a></div>
<p class="meta">about 95 MB · <a href="{i}#android">Install steps</a></p></div>
<div class="card"><h3>LG TV (webOS)</h3>
<p>Download on an Android phone, install with <b>webOS Dev Manager</b>:</p>
<p class="link">sofatube.github.io/lg</p>
<p class="link">sofatube.github.io/lg-phone</p>
<div class="row"><a class="btn" href="/lg/">Main app (.ipk)</a> <a class="btn ghost" href="/lg-phone/">Sofa Tube Phone (optional)</a></div>
<p class="meta"><a href="{i}#lg">Install steps</a></p></div>
<div class="card"><h3>Samsung TV (Tizen)</h3>
<p>No file. Install <b>TizenBrew</b>, then add the NPM module:</p>
<p class="link">sofatube</p>
<div class="row"><a class="btn" href="{i}#samsung">Install steps</a></div>
<p class="meta">Samsung TVs from 2018 or newer</p></div>
</div>
<p><a href="{RELEASES}">All files</a> (release page, including the GPL source zip)</p>'''


# ------------------------------------------------------------------ home

FEATURES = [
    ('⛨', 'Ads and SponsorBlock', 'الإعلانات و SponsorBlock',
     'Ads are blocked. SponsorBlock skips sponsor parts, intros and more, using community data.',
     'تُحظر الإعلانات، ويتخطى SponsorBlock مقاطع الرعاية والمقدمات وغيرها اعتمادًا على ما حدّده المشاهدون.'),
    ('▶', 'Playback speed', 'سرعة التشغيل',
     '0.25× to 3×, normal pitch. Press Red while watching and pick a speed.',
     'من <bdi>0.25×</bdi> إلى <bdi>3×</bdi> بطبقة صوت طبيعية. اضغط الزر الأحمر أثناء المشاهدة، واختر السرعة.'),
    ('⚿', 'Locks and PIN', 'القفل والرمز السري',
     'Set a PIN on the Locks page. It protects the settings, the locks and the kids options. Lock the app, or lock to one video.',
     'اضبط الرمز السري في صفحة القفل. يحمي الإعدادات والقفل وخيارات الأطفال. ويمكنك قفل التطبيق أو منع الخروج من الفيديو.'),
    ('⌂', 'Kid mode', 'وضع الأطفال',
     'Turn it on, then choose: family-safe only, longest video, hide search, kids list only, allowed hours and break reminder.',
     'فعّله ثم اختر: الفيديوهات الآمنة للعائلة فقط، وأطول فيديو، وإخفاء البحث، وقائمة الأطفال فقط، والساعات المسموح بها، والتذكير بالاستراحة.'),
    ('☾', 'Prayer times', 'أوقات الصلاة',
     'Umm al-Qura, worked out on the TV. Choose a reminder only, or pause the video at the adhan.',
     'تقويم أم القرى، يُحسب على التلفاز. اختر «تنبيه دون إيقاف الفيديو»، أو إيقاف الفيديو مؤقتًا عند الأذان.'),
    ('▣', 'Settings from your phone', 'الإعدادات من الهاتف',
     'Scan the code with a phone on the same Wi-Fi. The phone can change settings, search, play links, control playback and make backups. The PIN stays on the TV.',
     'امسح رمز QR بهاتف متصل بشبكة الواي فاي نفسها. يمكن للهاتف تغيير الإعدادات والبحث وتشغيل الروابط والتحكم في التشغيل وحفظ النسخ الاحتياطية. ويبقى الرمز السري على التلفاز.'),
    ('★', 'My lists', 'قوائمي',
     'Follow channels without signing in (My channels) and see their new videos. Save videos in Watch later.',
     'تابع القنوات دون تسجيل الدخول («قنواتي»)، واعرض فيديوهاتها الجديدة. احفظ الفيديوهات في «المشاهدة لاحقًا».'),
    ('≡', 'Feed filters', 'تصفية المحتوى',
     'Hide Shorts, mixes, live, watched or old videos, blocked words and channels.',
     'إخفاء Shorts وقوائم المزيج (Mix) والبث المباشر والفيديوهات التي شاهدتها أو القديمة، والكلمات والقنوات المحظورة.'),
    ('◐', 'Night dim and screen off', 'التعتيم الليلي وإطفاء الشاشة',
     'Night dim darkens the picture, all the time or between two times. Screen off keeps the sound playing; any button turns it back on.',
     'يُعتِّم التعتيم الليلي الصورة، دائمًا أو بين وقتين. و«إطفاء الشاشة» يُطفئ الشاشة ويستمر الصوت، ويعيدها أي زر.'),
    ('☆', 'The ★ Sofa Tube menu', 'قائمة ★ صوفا تيوب',
     'For remotes without colour buttons: ★ Sofa Tube in YouTube\'s sidebar or the ★ button in the player bar.',
     'لأجهزة التحكم الخالية من الأزرار الملونة: ★ صوفا تيوب في القائمة الجانبية لـYouTube أو زر ★ بين أزرار التحكم.'),
    ('⇥', 'Jump and chapters', 'الانتقال والفصول',
     'Number keys 1–9 jump to 10%–90%, 0 back to start. CH+ / CH− next or previous chapter.',
     'أزرار الأرقام من 1 إلى 9: الانتقال إلى نقطة من 10% إلى 90%، و0: العودة إلى البداية. زرّا القنوات (<bdi>CH</bdi>): الفصل التالي أو السابق.'),
    ('⌗', 'Learned buttons', 'أزرار مخصّصة',
     'Any spare button can run an action: press a button, then choose its action.',
     'اجعل لأي زر لا تستخدمه في جهاز التحكم وظيفة تختارها: اضغط الزر ثم اختر وظيفته.'),
    ('⇄', 'Backup', 'النسخ الاحتياطي',
     'Export shows a code to photograph; Import restores it. The PIN is never included.',
     'يعرض التصدير رمز الإعدادات للتصوير، ويستعيد الاستيراد الإعدادات منه. ولا تتضمن النسخة الرمز السري أبدًا.'),
    ('ع', 'English and Arabic', 'بالعربية والإنجليزية',
     'English and Arabic, with Arabic right to left.',
     'بالعربية والإنجليزية، والعربية من اليمين إلى اليسار.'),
]

SHOTS_TV = [
    ('settings', 'Settings, Playback page', 'إعدادات صوفا تيوب، صفحة التشغيل (بالإنجليزية)'),
    ('settings-ar', 'Settings in Arabic', 'إعدادات صوفا تيوب، صفحة التشغيل'),
    ('action-menu', '★ while watching: the Action menu', 'قائمة الإجراءات (بالإنجليزية)'),
    ('action-menu-ar', 'The Action menu in Arabic', 'قائمة الإجراءات'),
    ('speed', 'Speed picker', 'قائمة السرعة'),
    ('jump', 'Jump to 0%–90%', 'الانتقال إلى موضع في الفيديو'),
    ('sidebar-star', '★ Sofa Tube in the sidebar', '★ صوفا تيوب في القائمة الجانبية'),
    ('remote', 'Remote buttons page', 'صفحة أزرار جهاز التحكم'),
    ('app-lock', 'App lock with the PIN keypad', 'قفل التطبيق'),
    ('video-lock', 'Locked to this video', 'منع الخروج من الفيديو'),
    ('kid-mode', 'Kids page', 'صفحة الأطفال'),
    ('kids-list', 'Kids video list', 'قائمة فيديوهات الأطفال'),
    ('prayer', 'Prayer time pause', 'إيقاف الفيديو عند الأذان'),
    ('my-lists', 'My channels: new videos', 'قنواتي: الفيديوهات الجديدة'),
    ('phone-tv', 'Settings on your phone: the QR code', 'الإعدادات من الهاتف'),
    ('help', 'Help page', 'المساعدة'),
    ('button-guide', 'Button guide', 'دليل الأزرار'),
    ('setup', 'First-time setup', 'الإعداد الأولي'),
]


def home(lang):
    feats = ''.join(
        f'<div class="card feature"><span class="ico" aria-hidden="true">{ico}</span><h3>{L(lang, te, ta)}</h3><p>{L(lang, de, da)}</p></div>'
        for ico, te, ta, de, da in FEATURES)
    order = SHOTS_TV if lang == 'en' else [SHOTS_TV[1], SHOTS_TV[0], SHOTS_TV[3], SHOTS_TV[2]] + SHOTS_TV[4:]
    shots = ''.join(
        f'<figure><img src="/assets/shots/{f}.jpg" alt="{html.escape(L(lang, ce, ca))}" width="1280" height="720" loading="lazy" decoding="async"><figcaption>{L(lang, ce, ca)}</figcaption></figure>'
        for f, ce, ca in order)
    phones = ''.join(
        f'<figure><img src="/assets/shots/{f}.jpg" alt="{html.escape(L(lang, ce, ca))}" width="390" height="844" loading="lazy" decoding="async"><figcaption>{L(lang, ce, ca)}</figcaption></figure>'
        for f, ce, ca in [('phone', 'Phone page: Now playing', 'صفحة الهاتف: قيد التشغيل'),
                          ('phone-remote', 'Phone page: Remote', 'صفحة الهاتف: جهاز التحكم')])
    if lang == 'ar':
        hero = f'''<section class="hero">
<img class="icon" src="/icon.svg" alt="شعار صوفا تيوب" width="112" height="112">
<h1>صوفا تيوب<span class="alt" lang="en" dir="ltr">Sofa Tube</span></h1>
<p class="pitch">تطبيق YouTube أفضل لتلفازك: دون إعلانات، وبسرعة تشغيل حقيقية، وقفل بالرمز السري، ووضع للأطفال، وأوقات الصلاة، وإعدادات من هاتفك.</p>
<p class="sub">يفتح صفحة YouTube الخاصة بالتلفاز ويضيف إليها هذه الميزات. لأجهزة <bdi>Android TV</bdi> و<bdi>Google TV</bdi> و<bdi>Fire TV</bdi> وسامسونج وLG. بالعربية والإنجليزية. مجاني.</p>
<p><span class="badge">نسخة تجريبية <bdi>{VER}</bdi></span></p>
<div class="cta"><a class="btn" href="#download">تنزيل</a><a class="btn ghost" href="/ar/install/">خطوات التثبيت</a><a class="btn ghost" href="/ar/videos/">الفيديوهات</a></div>
</section>'''
        return hero + test_note(lang) + f'''
<h2 id="download">التنزيل: اختر تلفازك</h2>
<p>روابط قصيرة (اكتبها في تطبيق <b>Downloader</b> على التلفاز أو في هاتفك):</p>
{download_cards(lang)}
<h2 id="features">ماذا يقدّم صوفا تيوب؟</h2>
<div class="grid">{feats}</div>
<h2 id="remote">أزرار جهاز التحكم</h2>
{remote_keys(lang)}
<h2 id="screens">لقطات الشاشة</h2>
<p>من محاكي تلفاز LG ‏(webOS)؛ وصفحة الهاتف واحدة على كل أجهزة التلفاز.</p>
<div class="shots">{shots}</div>
<div class="phones">{phones}</div>
'''
    hero = f'''<section class="hero">
<img class="icon" src="/icon.svg" alt="Sofa Tube logo" width="112" height="112">
<h1>Sofa Tube<span class="alt" lang="ar" dir="rtl">صوفا تيوب</span></h1>
<p class="pitch">A better YouTube app for your TV: no ads, real playback speed, PIN locks, kid mode, prayer times and settings from your phone.</p>
<p class="sub">It opens YouTube's own TV page and adds these features on top. For Android TV / Google TV / Fire TV, Samsung and LG. English and Arabic. Free.</p>
<p><span class="badge">Test version {VER}</span></p>
<div class="cta"><a class="btn" href="#download">Download</a><a class="btn ghost" href="/install/">Install steps</a><a class="btn ghost" href="/videos/">Videos</a></div>
</section>'''
    return hero + test_note(lang) + f'''
<h2 id="download">Download: pick your TV</h2>
<p>Short links (type them in the TV's <b>Downloader</b> app or on your phone):</p>
{download_cards(lang)}
<h2 id="features">What it does</h2>
<div class="grid">{feats}</div>
<h2 id="remote">Remote buttons</h2>
{remote_keys(lang)}
<h2 id="screens">Screenshots</h2>
<p>From LG's webOS TV Emulator; the phone page is the same on every TV.</p>
<div class="shots">{shots}</div>
<div class="phones">{phones}</div>
'''


# ------------------------------------------------------------------ install

def install(lang):
    if lang == 'ar':
        return f'''<h1>التثبيت</h1>
<p>اختر تلفازك. الخطوات نفسها التي في دليل التجربة.</p>
<ul class="toc"><li><a href="#android">أندرويد تي في · جوجل تي في · فاير تي في</a></li><li><a href="#lg">تلفاز LG</a></li><li><a href="#samsung">تلفاز سامسونج</a></li></ul>

<section class="tv-section" id="android">
<h2>أندرويد تي في · جوجل تي في · فاير تي في</h2>
<div class="note"><p><b>الحالة:</b> جُرِّب على محاكي Google TV فقط. لم يُشغَّل هذا الملف على أي جهاز حقيقي بعد، ولم يُجرَّب على Fire TV. إذا لم يُثبَّت أو لم يُفتح أصلًا فهذه نتيجة مهمة: <a href="/ar/testers/#report">أخبرنا بها</a>.</p></div>
<h3>ما تحتاج إليه</h3>
<ul>
<li>جهاز Android TV أو Google TV أو Fire TV (تلفاز أو عصا أو صندوق) متصل بالإنترنت. دون حاسوب.</li>
<li>مساحة فارغة نحو 200 ميغابايت (حجم التطبيق نحو 95 ميغابايت). يعمل بجانب تطبيق YouTube العادي.</li>
<li>إذا كان <bdi>TizenTube Cobalt</bdi> مثبّتًا فاحذفه أولًا (يستخدم التطبيقان منفذ الاتصال بالهاتف نفسه).</li>
</ul>
<h3>الأسهل: تطبيق Downloader (دون حاسوب)</h3>
<ol class="steps">
<li>على التلفاز، افتح متجر التطبيقات (Google Play، أو Appstore في Fire TV)، وابحث عن <b>Downloader</b> (من AFTVnews، أيقونة برتقالية) وثبّته.</li>
<li>اسمح لـDownloader بتثبيت التطبيقات غير المعروفة:
<ul>
<li><b><bdi>Android TV</bdi> و<bdi>Google TV</bdi>:</b> <bdi>Settings</bdi> ← <bdi>Apps</bdi> ← <bdi>Security &amp; restrictions</bdi> ← <bdi>Unknown sources</bdi> ← فعّل <bdi>Downloader</bdi>. غير موجود؟ <bdi>Settings</bdi> ← <bdi>System</bdi> ← <bdi>About</bdi> واضغط على <bdi>Android TV OS build</bdi> سبع مرات، ثم أعد المحاولة. (تختلف الأسماء قليلًا حسب الشركة.)</li>
<li><b>Fire TV:</b> <bdi>Settings</bdi> ← <bdi>My Fire TV</bdi> ← <bdi>Developer options</bdi> ← <bdi>Install unknown apps</bdi> ← فعّل <bdi>Downloader</bdi>. لا تظهر <bdi>Developer options</bdi>؟ <bdi>Settings</bdi> ← <bdi>My Fire TV</bdi> ← <bdi>About</bdi> واضغط على اسم الجهاز سبع مرات.</li>
</ul></li>
<li>افتح Downloader (واسمح له بالوصول إلى التخزين)، واختر خانة العنوان واكتب: <code dir="ltr">sofatube.github.io/tv</code> ثم اضغط <b>Go</b>.</li>
<li>بعد اكتمال التنزيل اختر <b>Install</b> (تثبيت)، ثم <b>Open</b> (فتح). ثم يعرض Downloader حذف الملف المنزَّل: <b>Delete</b> يوفّر المساحة.</li>
</ol>
<h3>البديل: ذاكرة USB (تحتاج إلى حاسوب)</h3>
<p>نزّل ملف apk من <a href="/tv/">sofatube.github.io/tv</a> وانسخه إلى ذاكرة USB، وافتحه على التلفاز بتطبيق لإدارة الملفات، واسمح له بتثبيت التطبيقات غير المعروفة، ثم تثبيت ففتح.</p>
<h3>معلومات مفيدة</h3>
<ul>
<li>قد يُعاد تحميل YouTube مرة عند أول تشغيل، وهذا طبيعي. أغلب أجهزة التحكم في أندرويد ليس فيها أزرار ملونة: استخدم <b>★ صوفا تيوب</b> في القائمة الجانبية لـYouTube أو زر ★ بين أزرار التحكم.</li>
<li>لا يحتاج الإعداد من الهاتف إلى تطبيق إضافي هنا: الإعدادات ← حول التطبيق والنسخ الاحتياطي ← الإعدادات من الهاتف.</li>
<li>للتحديث: ثبّت ملف apk الجديد فوق هذا بالطريقة نفسها، وتبقى الإعدادات.</li>
</ul>
</section>

<section class="tv-section" id="lg">
<h2>تلفاز LG ‏(webOS)</h2>
<div class="note"><p><b>أولًا:</b> احذف تطبيق YouTube الرسمي من التلفاز؛ فصوفا تيوب يستخدم مُعرّف التطبيق نفسه (<code dir="ltr">youtube.leanback.v4</code>)، ولا يمكن تثبيتهما معًا. <b>جديد:</b> لم نجرّب التثبيت من الهاتف بعد؛ أخبرنا كيف جرى.</p></div>
<h3>ما تحتاج إليه</h3>
<p>تلفاز LG بنظام webOS، وهاتف أندرويد على شبكة الواي فاي نفسها (أو حاسوب). حساب مطوّر مجاني من LG وتطبيق Developer Mode من LG. لا حاجة إلى كسر الحماية (root) ولا إلى Homebrew Channel.</p>
<h3>الأسهل: بهاتف أندرويد</h3>
<ol class="steps">
<li>على الهاتف، أنشئ حساب مطوّر من LG في <a href="https://webostv.developer.lge.com/">webostv.developer.lge.com</a>.</li>
<li>على التلفاز، ثبّت تطبيق <b>Developer Mode</b> من متجر LG Content Store، وافتحه وسجّل الدخول بذلك الحساب.</li>
<li>فعّل <b>Dev Mode Status</b> (يُعاد تشغيل التلفاز)، ثم افتح التطبيق مجددًا وفعّل <b>Key Server</b>. دوّن <b>عنوان IP</b> و<b>عبارة المرور</b> (Passphrase).</li>
<li>على الهاتف، ثبّت <b>webOS Dev Manager</b>: <a href="https://github.com/webosbrew/dev-manager-desktop/releases/latest">github.com/webosbrew/dev-manager-desktop</a> ← Releases ← الملف المنتهي بـ<code dir="ltr">universal.apk</code>. واسمح لمتصفحك بتثبيت التطبيقات غير المعروفة عند السؤال.</li>
<li>في webOS Dev Manager، أضف التلفاز بعنوان IP وعبارة المرور.</li>
<li>في متصفح الهاتف، افتح <a href="/lg/"><bdi>sofatube.github.io/lg</bdi></a> و<a href="/lg-phone/"><bdi>sofatube.github.io/lg-phone</bdi></a>: يُنزَّل الملفان.</li>
<li>في webOS Dev Manager، ثبّت ملف ipk للتطبيق الرئيسي، ثم ملف تطبيق الهاتف، من مجلد التنزيلات في الهاتف.</li>
<li>على التلفاز، افتح <b>Sofa Tube</b>. يسألك الإعداد الأول عن اللغة والرمز السري ووضع الأطفال. الزر الأخضر يفتح الإعدادات.</li>
</ol>
<h3>البديل: بحاسوب</h3>
<p>الخطوات نفسها، مع <a href="https://github.com/webosbrew/dev-manager-desktop/releases/latest">webOS Dev Manager</a> لويندوز أو ماك أو لينكس (من الصفحة نفسها) وملفَّي ipk من الرابطين أعلاه.</p>
<h3>معلومات مفيدة</h3>
<ul>
<li>لجلسة وضع المطوّر مدة <b>تنتهي</b>، وبعدها لا تُفتح التطبيقات التي ثبّتّها. افتح تطبيق Developer Mode من حين لآخر ومدّد الجلسة.</li>
<li><bdi>Sofa Tube Phone</bdi> تطبيق ثانٍ: افتحه لتغيير الإعدادات من هاتفك (رمز QR). وتحتاج ميزة إطفاء الشاشة أيضًا إلى فتحه مرة واحدة بعد تشغيل التلفاز.</li>
<li>للتحديث لاحقًا: ثبّت ملف ipk الجديد بالطريقة نفسها، وتبقى إعداداتك كما هي.</li>
</ul>
</section>

<section class="tv-section" id="samsung">
<h2>تلفاز سامسونج ‏(Tizen)</h2>
<div class="note"><p><b>الحالة:</b> نُشرت وحدة npm باسم <code dir="ltr">sofatube</code>، لكنها لم تُجرَّب على تلفاز سامسونج حقيقي بعد، فأنت من أوائل المجرّبين.</p></div>
<h3>ما تحتاج إليه</h3>
<ul>
<li>تلفاز سامسونج من سنة 2018 أو أحدث (Tizen 4.0 أو أحدث).</li>
<li>حاسوب (ويندوز أو ماك أو لينكس) على شبكة الواي فاي نفسها التي يتصل بها التلفاز، <b>مرة واحدة</b> لتثبيت TizenBrew. وبعدها يجري كل شيء على التلفاز.</li>
<li>أجهزة 2023 أو أحدث (Tizen 7 فما فوق): حساب سامسونج مجاني (يطلب المثبّت تسجيل الدخول).</li>
</ul>
<p>لديك TizenBrew مسبقًا (من TizenTube مثلًا)؟ لا حاجة إلى حاسوب: انتقل إلى الخطوة 5.</p>
<h3>الخطوات</h3>
<ol class="steps">
<li>على التلفاز: افتح <b>Apps</b> (التطبيقات)، واكتب <bdi>1 2 3 4 5</bdi> بجهاز التحكم، ثم اجعل <b>Developer mode</b> على <b>On</b>، وأدخل عنوان IP لحاسوبك في <b>Host PC IP</b>، واضغط OK، ثم أعد تشغيل التلفاز (اضغط مطولًا على زر التشغيل).</li>
<li>على الحاسوب: نزّل <b>TizenBrew Installer</b> من <a href="https://github.com/reisxd/TizenBrewInstaller/releases/latest">github.com/reisxd/TizenBrewInstaller/releases</a> (الملف المناسب لنظامك) وشغّله.</li>
<li>اضغط <b>Install TizenBrew</b>. في أجهزة 2023 فما بعد، سجّل الدخول بحساب سامسونج عند الطلب.</li>
<li>على التلفاز: <bdi>Apps</bdi> ← <bdi>1 2 3 4 5</bdi> مرة أخرى، واجعل <b>Host PC IP</b> هو <code dir="ltr">127.0.0.1</code>، ثم أعد تشغيل التلفاز.</li>
<li>افتح <b>TizenBrew</b>، واضغط <b>الزر الأخضر</b> (مدير الوحدات)، وأضف وحدة من نوع <b>NPM</b>، واكتب <code dir="ltr">sofatube</code>.</li>
<li>يظهر الآن صوفا تيوب في TizenBrew. افتحه: تظهر شاشة البداية ثم YouTube.</li>
</ol>
<h3>معلومات مفيدة</h3>
<ul>
<li><b>لماذا الحاسوب؟</b> سُحب مثبّت TizenBrew القديم الذي كان يعمل من متصفح التلفاز (أجهزة حتى 2021)، ولا يذكر دليل TizenBrew الآن إلا المثبّت على الحاسوب.</li>
<li>التحديثات تلقائية: يحمّل TizenBrew أحدث نسخة من صوفا تيوب في كل مرة.</li>
<li>افتح صوفا تيوب دائمًا من TizenBrew (لا من تطبيق YouTube العادي).</li>
<li>قد ترفض أحدث أجهزة سامسونج تثبيت TizenBrew. إذا فشل المثبّت فأبلغ عن طراز تلفازك.</li>
</ul>
</section>'''
    return f'''<h1>Install</h1>
<p>Pick your TV. Same steps as in the tester guide.</p>
<ul class="toc"><li><a href="#android">Android TV · Google TV · Fire TV</a></li><li><a href="#lg">LG TV</a></li><li><a href="#samsung">Samsung TV</a></li></ul>

<section class="tv-section" id="android">
<h2>Android TV · Google TV · Fire TV</h2>
<div class="note"><p><b>Status:</b> tried on a Google TV emulator only. This file has not run on any real device yet, and Fire TV is untested. If it does not install or open at all, that is an important result: <a href="/testers/#report">tell us</a>.</p></div>
<h3>You need</h3>
<ul>
<li>An Android TV, Google TV or Fire TV device (TV, stick or box) with internet. No computer.</li>
<li>About 200 MB free space (the app is 95 MB). It runs next to the normal YouTube app.</li>
<li>If TizenTube Cobalt is installed, uninstall it first (both use the same phone-link port).</li>
</ul>
<h3>Easiest: the Downloader app (no computer)</h3>
<ol class="steps">
<li>On the TV, open the app store (Google Play, or the Appstore on Fire TV), search <b>Downloader</b> (by AFTVnews, orange icon) and install it.</li>
<li>Allow Downloader to <b>install unknown apps</b>:
<ul>
<li><b>Android TV / Google TV:</b> Settings → Apps → Security &amp; restrictions → Unknown sources → Downloader on. Not there? Settings → System → About → press <i>Android TV OS build</i> 7 times, then try again. (Names differ a little by brand.)</li>
<li><b>Fire TV:</b> Settings → My Fire TV → Developer options → Install unknown apps → Downloader on. No Developer options? Settings → My Fire TV → About → press the device name 7 times.</li>
</ul></li>
<li>Open Downloader (allow its storage request), select the address box and type: <code>sofatube.github.io/tv</code> then press <b>Go</b>.</li>
<li>When the download ends, choose <b>Install</b>, then <b>Open</b>. Downloader then offers to delete the downloaded file: <b>Delete</b> saves space.</li>
</ol>
<h3>Fallback: USB stick (needs a computer)</h3>
<p>Download the .apk from <a href="/tv/">sofatube.github.io/tv</a>, copy it to a USB stick, open it on the TV with a file manager app, allow that app to install unknown apps, then Install, Open.</p>
<h3>Good to know</h3>
<ul>
<li>The first start may reload YouTube once; that is normal. Most Android remotes have <b>no colour buttons</b>: use <b>★ Sofa Tube</b> in YouTube's sidebar or the ★ button in the player bar.</li>
<li>Phone settings need no extra app here: Settings → Backup and about → Settings on your phone.</li>
<li>Updates: install the new .apk over this one the same way; settings stay.</li>
</ul>
</section>

<section class="tv-section" id="lg">
<h2>LG TV (webOS)</h2>
<div class="note"><p><b>First:</b> uninstall the official YouTube app from the TV. Sofa Tube uses the same app ID (<code>youtube.leanback.v4</code>), so both cannot be installed together. <b>New:</b> installing from a phone has not been tried by us yet; tell us how it went.</p></div>
<h3>You need</h3>
<p>An LG webOS TV and an Android phone on the same Wi-Fi (or a computer). A free LG Developer account and LG's Developer Mode app. No rooting, no Homebrew Channel.</p>
<h3>Easiest: with an Android phone</h3>
<ol class="steps">
<li>On the phone, create an LG Developer account at <a href="https://webostv.developer.lge.com/">webostv.developer.lge.com</a>.</li>
<li>On the TV, install <b>Developer Mode</b> from the LG Content Store, open it and sign in with that account.</li>
<li>Turn on <b>Dev Mode Status</b> (the TV restarts), open the app again and turn on <b>Key Server</b>. Write down the <b>IP address</b> and the <b>passphrase</b>.</li>
<li>On the phone, install <b>webOS Dev Manager</b>: <a href="https://github.com/webosbrew/dev-manager-desktop/releases/latest">github.com/webosbrew/dev-manager-desktop</a> → Releases → the file ending <code>universal.apk</code>. Allow your browser to install unknown apps when asked.</li>
<li>In webOS Dev Manager, add the TV with that IP and passphrase.</li>
<li>In the phone's browser, open <a href="/lg/">sofatube.github.io/lg</a> and <a href="/lg-phone/">sofatube.github.io/lg-phone</a>: both files download.</li>
<li>In webOS Dev Manager, install the main app .ipk, then the Phone app .ipk, from the phone's Downloads.</li>
<li>On the TV, open <b>Sofa Tube</b>. The first-time setup asks for language, PIN and kid mode. Green opens the settings.</li>
</ol>
<h3>Fallback: with a computer</h3>
<p>Same steps, with <a href="https://github.com/webosbrew/dev-manager-desktop/releases/latest">webOS Dev Manager</a> for Windows, Mac or Linux (same page) and the two .ipk files from the links above.</p>
<h3>Good to know</h3>
<ul>
<li>Developer Mode sessions <b>expire</b>, and then the apps you installed stop opening. Open the Developer Mode app now and then and extend the session.</li>
<li>Sofa Tube Phone is a second app: open it to change settings from your phone (QR code). Screen off also needs it opened once after the TV starts.</li>
<li>Updating later: install the new .ipk the same way; your settings stay.</li>
</ul>
</section>

<section class="tv-section" id="samsung">
<h2>Samsung TV (Tizen)</h2>
<div class="note"><p><b>Status:</b> the npm module <code>sofatube</code> is published, but it has not been tried on a real Samsung TV yet, so you are one of the first.</p></div>
<h3>You need</h3>
<ul>
<li>A Samsung TV from 2018 or newer (Tizen 4.0 or newer).</li>
<li>A Windows, Mac or Linux computer on the same Wi-Fi as the TV, <b>once</b>, to install TizenBrew. After that everything happens on the TV.</li>
<li>TVs from 2023 or newer (Tizen 7+): a free Samsung account (the installer asks you to sign in).</li>
</ul>
<p>Already have TizenBrew (for example from TizenTube)? No computer needed: go to step 5.</p>
<h3>Steps</h3>
<ol class="steps">
<li>On the TV: open <b>Apps</b>, type <b>1 2 3 4 5</b> on the remote, set <b>Developer mode</b> to <b>On</b>, enter your computer's IP as <b>Host PC IP</b>, OK, then restart the TV (hold the Power button).</li>
<li>On the computer: download <b>TizenBrew Installer</b> from <a href="https://github.com/reisxd/TizenBrewInstaller/releases/latest">github.com/reisxd/TizenBrewInstaller/releases</a> (the file for your system) and run it.</li>
<li>Click <b>Install TizenBrew</b>. On 2023+ TVs, sign in to your Samsung account when asked.</li>
<li>On the TV: Apps → 1 2 3 4 5 again, set <b>Host PC IP</b> to <code>127.0.0.1</code>, restart the TV.</li>
<li>Open <b>TizenBrew</b>, press the <b>Green</b> button (module manager), add an <b>NPM</b> module and type <code>sofatube</code>.</li>
<li>Sofa Tube now appears in TizenBrew. Open it: start screen, then YouTube.</li>
</ol>
<h3>Good to know</h3>
<ul>
<li><b>Why a computer?</b> TizenBrew's old installer in the TV's web browser (TVs up to 2021) has been withdrawn; TizenBrew's guide now lists only the computer installer.</li>
<li>Updates are automatic: TizenBrew loads the newest Sofa Tube each time.</li>
<li>Always open Sofa Tube from TizenBrew (not the normal YouTube app).</li>
<li>The very newest Samsung TVs may refuse TizenBrew. If the installer fails, report your TV model.</li>
</ul>
</section>'''


# ------------------------------------------------------------------ videos

VIDEOS = [
    ('00', 'Tour', 'Full tour', 'جولة كاملة',
     'A better way to watch YouTube on your TV.', 'طريقة أفضل لمشاهدة YouTube على تلفازك.'),
    ('01', 'Getting-started', 'Getting started', 'البداية والإعدادات',
     'Install, first setup, the settings screen.', 'التثبيت والإعداد الأولي وشاشة الإعدادات.'),
    ('02', 'Playback-speed', 'Playback speed', 'سرعة التشغيل',
     '0.25× to 3×, normal pitch.', 'من <bdi>0.25×</bdi> إلى <bdi>3×</bdi> بطبقة صوت طبيعية.'),
    ('03', 'Ads-feed-buttons', 'Ads, feed and buttons', 'الإعلانات والمحتوى والأزرار',
     'Ads are blocked automatically. SponsorBlock skips sponsor segments, intros, subscribe reminders and more.',
     'يحظر صوفا تيوب الإعلانات تلقائيًا، ويتخطى SponsorBlock مقاطع الرعاية والمقدمات والتذكير بالاشتراك في القناة وغيرها.'),
    ('04', 'Locks-PIN', 'Locks and PIN', 'القفل والرمز السري',
     'Set a four-digit PIN. It protects the settings, the locks and the kids options.',
     'اضبط رمزًا سريًا من أربعة أرقام. وبهذا الرمز تحمي الإعدادات والقفل وخيارات الأطفال.'),
    ('05', 'Kid-mode', 'Kid mode', 'وضع الأطفال',
     'Allowed hours, approved videos, break reminders.', 'ساعات مسموح بها، وفيديوهات موافق عليها، وتذكير بالاستراحة.'),
    ('06', 'Phone-settings', 'Settings from your phone', 'الإعدادات من الهاتف',
     'Change the settings, and control the TV, from your phone.', 'غيّر الإعدادات، وتحكّم في التلفاز، من هاتفك.'),
    ('07', 'Watching-action-menu', 'Watching and the Action menu', 'المشاهدة وقائمة الإجراءات',
     'Videos longer than five minutes continue where you stopped. Press 0 to start over.',
     'تبدأ الفيديوهات التي تزيد مدتها على خمس دقائق من حيث توقفت. وللبدء من جديد، اضغط زر الصفر.'),
    ('08', 'My-lists', 'My lists', 'قوائمي',
     'My channels, Watch later, Start with.', '«قنواتي»، و«المشاهدة لاحقًا»، و«صفحة البدء».'),
    ('09', 'Prayer-times', 'Prayer times', 'أوقات الصلاة',
     'Umm al-Qura, worked out on the TV.', 'تقويم أم القرى، يُحسب على التلفاز.'),
    ('10', 'Night-dim-screen-off', 'Night dim and screen off', 'التعتيم الليلي وإطفاء الشاشة',
     'Night dim darkens the whole picture, from 20 to 65 percent.', 'يخفف التعتيم الليلي إضاءة الصورة كلها، من 20% إلى 65%.'),
    ('11', 'Star-menu', 'The ★ Sofa Tube menu', 'قائمة ★ صوفا تيوب',
     'For remotes without colour buttons.', 'لأجهزة التحكم الخالية من الأزرار الملونة.'),
    ('12', 'Jump-chapters', 'Jump and chapters', 'الانتقال والفصول',
     '0% to 90% in one press.', 'من 0% إلى 90% بضغطة واحدة.'),
    ('13', 'Learned-buttons', 'Learned remote buttons', 'الأزرار المخصّصة',
     'Any spare button can run an action.', 'اجعل لأي زر لا تستخدمه في جهاز التحكم وظيفة تختارها.'),
    ('14', 'More-from-phone', 'More from your phone', 'المزيد من الهاتف',
     'Learned buttons, screen off, order, channels, hours.', 'الأزرار المخصّصة، إطفاء الشاشة، الترتيب، القنوات، الساعات.'),
]


def videos(lang):
    code = 'AR' if lang == 'ar' else 'EN'
    folder = lang
    ocode, ofolder = ('EN', 'en') if lang == 'ar' else ('AR', 'ar')
    cards = []
    for n, name, te, ta, de, da in VIDEOS:
        f = f'/videos/{folder}/SofaTube-{code}-{n}-{name}'
        o = f'/videos/{ofolder}/SofaTube-{ocode}-{n}-{name}.mp4'
        title = L(lang, te, ta)
        num = str(int(n))
        cards.append(f'''<article class="video" id="v{n}">
<video controls preload="metadata" playsinline poster="{f}.jpg" width="640" height="360" aria-label="{html.escape(title)}"><source src="{f}.mp4" type="video/mp4"><a href="{f}.mp4">{L(lang, 'Download the video (MP4)', 'تنزيل الفيديو (MP4)')}</a></video>
<div class="txt"><h3>{num} · {title}</h3><p>{L(lang, de, da)}</p>
<p class="more"><a href="{f}.mp4" download>MP4</a> · <a href="{o}" hreflang="{ofolder}">{L(lang, 'Arabic version', 'النسخة الإنجليزية')}</a></p></div>
</article>''')
    intro = L(lang,
              '<h1>Videos</h1><p>Narrated tutorials for Sofa Tube 0.9: 15 videos in English, recorded on LG\'s webOS TV Emulator, with the remote buttons to press and the phone screen. The same 15 videos in Arabic: <a href="/ar/videos/" hreflang="ar" lang="ar">الفيديوهات بالعربية</a>.</p>',
              '<h1>الفيديوهات</h1><p>شروح بالفيديو مع تعليق صوتي لصوفا تيوب <bdi>0.9</bdi>: خمسة عشر فيديو بالعربية، سُجّلت على محاكي تلفاز LG ‏(webOS)، وتُظهر أزرار جهاز التحكم التي تضغطها وشاشة الهاتف. والفيديوهات نفسها بالإنجليزية: <a href="/videos/" hreflang="en" lang="en">Videos in English</a>.</p>')
    return intro + '<div class="videos">' + ''.join(cards) + '</div>'


# ------------------------------------------------------------------ testers

CHECK = [
    ('Basics', 'الأساسيات'),
    (1, True, 'Installs and opens.', 'Sofa Tube appears in the apps list with the orange sofa icon and opens YouTube. Close it and open it again: still fine?',
     'يُثبَّت ويُفتح.', 'يظهر صوفا تيوب في قائمة التطبيقات بأيقونة الأريكة البرتقالية ويفتح YouTube. أغلقه وافتحه مرة أخرى: هل ما زال يعمل؟', 'Android: ARM file · Samsung', 'أندرويد: ملف ARM · سامسونج'),
    (2, False, 'Start screen.', 'Samsung · Android: logo pops in, play button pulses, “Sofa Tube / صوفا تيوب” rises in. Smooth, or jerky / skipped? (LG shows a still picture.)',
     'شاشة البداية.', 'سامسونج · أندرويد: يظهر الشعار، ثم ينبض زر التشغيل، ثم يرتفع «Sofa Tube / صوفا تيوب». هل الحركة سلسة، أم متقطعة أو لا تظهر؟ (في LG صورة ثابتة.)', '', ''),
    (3, False, 'First-time setup.', 'On a new install it asks for language, PIN and kid mode. Easy to follow?',
     'الإعداد الأول.', 'في التثبيت الجديد يسأل عن اللغة والرمز السري ووضع الأطفال. هل كان سهلًا؟', '', ''),
    (4, False, 'Videos play', 'with picture and sound, good quality, no stutter. Try a long video and a live one.',
     'تعمل الفيديوهات', 'بالصورة والصوت، بجودة جيدة ودون تقطّع. جرّب فيديو طويلًا وبثًّا مباشرًا.', '', ''),
    (5, False, 'No ads', 'before or during videos, and no “Sponsored” tile on Home.',
     'لا إعلانات', 'قبل الفيديو أو أثناءه، ولا مربّع «Sponsored» في الصفحة الرئيسية.', '', ''),
    (6, False, 'SponsorBlock.', 'In a video with a sponsor part (many tech / vlog channels), the part is skipped with a short message.',
     'SponsorBlock.', 'في فيديو فيه مقطع رعاية (كثير من قنوات التقنية والمدوّنات المصوّرة)، يُتخطّى المقطع مع رسالة قصيرة.', '', ''),
    (7, False, 'Settings open', 'with Green, or with ★ Sofa Tube (sidebar, player bar, top of YouTube\'s Settings page). Back closes them.',
     'تُفتح الإعدادات', 'بالزر الأخضر، أو بـ★ صوفا تيوب (القائمة الجانبية، وأزرار التحكم، وأعلى صفحة إعدادات YouTube). ويغلقها زر الرجوع.', '', ''),
    ('Speed and moving around', 'السرعة والتنقل'),
    (8, True, 'Fast speeds: sound at 1.5× and 2×.', 'Red (or ★ → Change speed) → 1.5×, then 2×. Does the sound keep playing, at normal pitch? Watch 1 minute each.',
     'السرعات العالية: الصوت عند <bdi>1.5×</bdi> و<bdi>2×</bdi>.', 'الزر الأحمر (أو ★ ← تغيير السرعة) ← <bdi>1.5×</bdi> ثم <bdi>2×</bdi>. هل يستمر الصوت بطبقة الصوت الطبيعية؟ شاهد دقيقة لكل سرعة.', 'Samsung · Android', 'سامسونج · أندرويد'),
    (9, True, 'Slow speeds: 0.75× and 0.5×.', 'Sound clear, no crackle, normal pitch? On LG also try Playback → Sound at other speeds: Smooth / Classic.',
     'السرعات البطيئة: <bdi>0.75×</bdi> و<bdi>0.5×</bdi>.', 'هل الصوت واضح دون طقطقة وبطبقته الطبيعية؟ في LG جرّب أيضًا التشغيل ← الصوت عند السرعات الأخرى: سلس أو كلاسيكي.', 'Samsung · Android', 'سامسونج · أندرويد'),
    (10, False, 'If the sound cuts out in 8 or 9:', 'Playback → Speed method → Re-timing, try again, and note which method works.',
     'إذا انقطع الصوت في 8 أو 9:', 'التشغيل ← طريقة تغيير السرعة ← «عبر التطبيق»، ثم جرّب مرة أخرى، ودوّن الطريقة التي نجحت.', '', ''),
    (11, False, 'Jump and chapters.', 'While watching: ★ → Jump to 0%–90% (◀▶ and OK, or a number key). Number keys 1–9 jump directly. In a video with chapters: ★ → Chapters list; CH+ / CH− skip chapters.',
     'الانتقال والفصول.', 'أثناء المشاهدة: ★ ← الانتقال إلى موضع في الفيديو (‎◀▶‎ وOK، أو زر رقم). وأزرار الأرقام من 1 إلى 9 تنتقل مباشرة. في فيديو فيه فصول: ★ ← قائمة الفصول؛ وزرّا القنوات (<bdi>CH</bdi>) ينتقلان بين الفصول.', '', ''),
    (12, False, 'Action menu and button guide.', 'Yellow while watching opens the Action menu. Hold a colour button: a guide shows what every button does.',
     'قائمة الإجراءات ودليل الأزرار.', 'الزر الأصفر أثناء المشاهدة يفتح قائمة الإجراءات. اضغط مطولًا على زر ملوّن: يظهر دليل يشرح وظيفة كل زر.', '', ''),
    ('Locks and kids', 'القفل والأطفال'),
    (13, False, 'PIN and app lock.', 'Locks page: set a PIN (entered twice), try Practise entering the PIN with the arrows and OK, turn on Lock the app. Close and reopen the app: the PIN is asked.',
     'الرمز السري وقفل التطبيق.', 'صفحة القفل: اضبط رمزًا سريًا (يُدخل مرتين)، واستخدم «تجربة إدخال الرمز السري» بالأسهم وOK، ثم فعّل قفل التطبيق. أغلق التطبيق وافتحه: يُطلب الرمز.', '', ''),
    (14, True, 'Locks again after you leave.', 'With Lock the app on: press Home, wait more than 30 seconds, go back to Sofa Tube: the PIN is asked again. Also try turning the TV off and on.',
     'يُقفل من جديد بعد الخروج.', 'مع تفعيل قفل التطبيق: اضغط زر الشاشة الرئيسية، وانتظر أكثر من 30 ثانية، ثم عُد إلى صوفا تيوب: يُطلب الرمز مرة أخرى. وجرّب أيضًا إطفاء التلفاز وتشغيله.', '', ''),
    (15, False, 'Kid mode and allowed hours.', 'Kids page: turn on Kid mode, set Allowed hours so that now is outside them: a lock screen appears. Extra time with the PIN works?',
     'وضع الأطفال والساعات المسموح بها.', 'صفحة الأطفال: فعّل وضع الأطفال، واضبط الساعات المسموح بها بحيث يكون الوقت الحالي خارجها: تظهر شاشة قفل. هل يعمل الوقت الإضافي بالرمز السري؟', '', ''),
    ('Phone, buttons, language', 'الهاتف والأزرار واللغة'),
    (16, True, 'Settings from your phone.', 'LG: open the Sofa Tube Phone app. Samsung / Android: Settings → Backup and about → Settings on your phone. Scan the QR code with a real phone on the same Wi-Fi, change a setting: does the TV follow at once?',
     'الإعدادات من الهاتف.', 'في LG: افتح تطبيق <bdi>Sofa Tube Phone</bdi>. في سامسونج وأندرويد: الإعدادات ← حول التطبيق والنسخ الاحتياطي ← الإعدادات من الهاتف. امسح رمز QR بهاتف حقيقي على شبكة الواي فاي نفسها، وغيّر إعدادًا: هل يتغيّر على التلفاز فورًا؟', 'Samsung: most important', 'سامسونج: الأهم'),
    (17, False, 'Learned buttons.', 'Remote buttons → Learned buttons → Learn a button, press a button you never use (e.g. a media key), pick an action, then try it while watching. Which buttons were refused?',
     'الأزرار المخصّصة.', 'أزرار جهاز التحكم ← أزرار مخصّصة ← تخصيص زر، واضغط زرًّا لا تستخدمه (مثل أحد أزرار الوسائط)، واختر إجراءً، ثم جرّبه أثناء المشاهدة. ما الأزرار التي رُفضت؟', '', ''),
    (18, False, 'Arabic.', 'Backup and about → Language → العربية. Text right-to-left, letters joined, nothing cut off, font easy to read from the sofa?',
     'العربية.', 'حول التطبيق والنسخ الاحتياطي ← اللغة ← العربية. هل النص من اليمين إلى اليسار، والحروف متصلة، ولا شيء مقطوع، والخط سهل القراءة من الأريكة؟', '', ''),
    (19, False, 'Prayer times (if you use them).', 'Prayer times page: pick your city; today\'s times are right? A reminder (or pause) comes at the adhan. The TV clock and time zone must be right.',
     'أوقات الصلاة (إن كنت تستخدمها).', 'صفحة أوقات الصلاة: اختر مدينتك؛ هل أوقات اليوم صحيحة؟ يظهر تذكير (أو يتوقف الفيديو) عند الأذان. يجب أن تكون ساعة التلفاز ومنطقته الزمنية صحيحتين.', '', ''),
    (20, False, 'Night dim and screen off.', 'Player look: night dim darkens the picture. Screen off (Action menu) keeps the sound; any button brings the picture back.',
     'التعتيم الليلي وإطفاء الشاشة.', 'مظهر الفيديو: يُعتِّم التعتيم الليلي الصورة. وإطفاء الشاشة (من قائمة الإجراءات) يُبقي الصوت، ويعيد أي زر الصورة.', '', ''),
    (21, False, 'An evening of normal use.', 'Any freeze, black screen, crash, or the app closing by itself? After the TV wakes from standby, does the video come back?',
     'سهرة استخدام عادي.', 'هل حدث تجمّد أو شاشة سوداء أو انهيار أو إغلاق ذاتي للتطبيق؟ بعد خروج التلفاز من وضع الاستعداد، هل يعود الفيديو؟', '', ''),
]


def checklist(lang):
    out = []
    open_ul = False
    for row in CHECK:
        if len(row) == 2:
            if open_ul:
                out.append('</ol>')
            out.append(f'<h3>{L(lang, row[0], row[1])}</h3><ol class="check">')
            open_ul = True
            continue
        n, real, te, he, ta, ha, xe, xa = row
        tags = ''
        if real:
            tags += f' <span class="tag">{L(lang, "real TV", "تلفاز حقيقي")}</span>'
        if L(lang, xe, xa):
            tags += f' <span class="tag soft">{L(lang, xe, xa)}</span>'
        out.append(f'<li><span class="n" aria-hidden="true">{n}</span><div><b>{L(lang, te, ta)}</b>{tags}<span class="how">{L(lang, he, ha)}</span></div></li>')
    out.append('</ol>')
    return '\n'.join(out)


STATUS = [
    ('LG webOS', 'LG emulator (webOS 4); earlier versions on a real LG TV.',
     'LG ‏(webOS)', 'محاكي LG ‏(webOS 4)؛ والإصدارات السابقة على تلفاز LG حقيقي.'),
    ('Samsung (TizenBrew, npm <code>sofatube</code>)', 'Samsung emulator only. <b>Never tried on a real Samsung TV.</b>',
     'سامسونج (TizenBrew، وحدة <code dir="ltr">sofatube</code>)', 'محاكي سامسونج فقط. <b>لم يُجرَّب على تلفاز سامسونج حقيقي.</b>'),
    ('Android TV / Google TV', 'Google TV emulator (x86 build) only. <b>This ARM .apk has not run on a real device yet.</b>',
     '<bdi>Android TV</bdi> و<bdi>Google TV</bdi>', 'محاكي Google TV فقط. <b>ملف ARM هذا لم يعمل على جهاز حقيقي بعد.</b>'),
    ('Fire TV', '<b>Untested.</b>', 'Fire TV', '<b>لم يُجرَّب.</b>'),
    ('Install with webOS Dev Manager on a phone', '<b>Not tried by us yet.</b>',
     'التثبيت بـwebOS Dev Manager من الهاتف', '<b>لم نجرّبه بعد.</b>'),
]


def status_table(lang):
    rows = ''.join(f'<tr><td>{L(lang, a, c)}</td><td>{L(lang, b, d)}</td></tr>' for a, b, c, d in STATUS)
    head = L(lang, f'<tr><th scope="col">TV</th><th scope="col">Status for {VER}</th></tr>',
             f'<tr><th scope="col">التلفاز</th><th scope="col">الحالة في <bdi>{VER}</bdi></th></tr>')
    return f'<div class="table-wrap"><table><thead>{head}</thead><tbody>{rows}</tbody></table></div>'


def testers(lang):
    if lang == 'ar':
        return f'''<h1>للمجرّبين</h1>
<p><b>شكرًا لمساعدتك في التجربة!</b> هذه نسخة تجريبية. بعض أجزائها جُرِّبت على محاكيات فقط (نسخ برمجية من التلفاز)، ولم تُجرَّب على تلفاز حقيقي بعد، ولهذا نحتاج إليك. لا شيء هنا يضر بالتلفاز؛ أسوأ ما قد يحدث أن ميزة ما لا تعمل.</p>
<div class="cta" style="justify-content:flex-start"><a class="btn" href="/testers/guide.html">دليل التجربة (HTML)</a><a class="btn ghost" href="/testers/SofaTube-Tester-Guide.pdf" download>دليل التجربة (PDF، للطباعة)</a></div>
<p>الدليل بالعربية والإنجليزية: التثبيت لكل تلفاز، وقائمة الفحص، وصفحة التقرير.</p>

<h2 id="status">ما الذي جُرِّب</h2>
{status_table(lang)}

<p><a href="/ar/install/">خطوات التثبيت</a></p>

<h2 id="checklist">قائمة الفحص</h2>
<p>ضع علامة في OK أو ✗ لكل سطر، وتجاوز ما لا تستطيع تجربته. الأسطر المعلَّمة بـ<span class="tag">تلفاز حقيقي</span> هي الأهم: لم يجرّبها أحد على تلفاز حقيقي بعد. اكتب رقم كل ✗ في التقرير.</p>
{checklist(lang)}

<h2 id="report">التقرير: ماذا ترسل إلينا</h2>
<p>أرسل صفحة التقرير في الدليل (تكفي صورة لها)، ولكل ما لم ينجح <b>صورة أو فيديو قصيرًا لشاشة التلفاز</b>. الفيديو أنفع لمشكلات الصوت والسرعة.</p>
<ul>
<li>شركة التلفاز وطرازه، وسنة صنع التلفاز</li>
<li>إصدار النظام (<bdi>webOS / Tizen / Android / Fire OS</bdi>)</li>
<li>جهاز التحكم (أزرار ملونة؟ Magic Remote؟)</li>
<li>هل نجح التثبيت؟</li>
<li>أرقام الأسطر التي عليها ✗</li>
<li>لكل مشكلة: رقم السطر، وما فعلته، وما توقعته، وما حدث.</li>
<li>ما الذي أعجبك؟ وما الذي يجب تغييره؟</li>
</ul>
<p>تجد الطراز والإصدار عادةً في الإعدادات ← … ← حول في التلفاز (يختلف الاسم حسب الشركة).</p>
<div class="card"><p><b>أرسل النتائج إلى:</b> <a href="mailto:{MAIL}"><bdi>{MAIL}</bdi></a></p><p>أو افتح بلاغًا: <a href="{ISSUES}">github.com/sofatube/sofatube.github.io/issues</a></p></div>'''
    return f'''<h1>Testers</h1>
<p><b>Thank you for testing!</b> This is a test version. Some parts have only been tried on TV emulators (software copies of a TV), never on a real TV. That is exactly why we need you. Nothing here can harm your TV; at worst a feature does not work.</p>
<div class="cta" style="justify-content:flex-start"><a class="btn" href="/testers/guide.html">Tester guide (HTML)</a><a class="btn ghost" href="/testers/SofaTube-Tester-Guide.pdf" download>Tester guide (PDF, to print)</a></div>
<p>The guide is in English and Arabic: install steps for each TV, the checklist and a report page.</p>

<h2 id="status">What has been tested</h2>
{status_table(lang)}

<p><a href="/install/">Install steps</a></p>

<h2 id="checklist">Test checklist</h2>
<p>Tick OK or ✗ for each line; skip what you cannot try. Rows marked <span class="tag">real TV</span> are the most important: nobody has tested them on a real TV yet. Write the number of every ✗ in your report.</p>
{checklist(lang)}

<h2 id="report">Report: what to send back</h2>
<p>Send the report page from the guide (a photo is fine) and, for anything that failed, a <b>photo or short video of the TV screen</b>. Videos help most for sound and speed problems.</p>
<ul>
<li>TV brand and model, and the year of the TV</li>
<li>System version (webOS / Tizen / Android / Fire OS)</li>
<li>Remote (colour buttons? Magic Remote?)</li>
<li>Install went OK?</li>
<li>Numbers with ✗</li>
<li>For each problem: the line number, what you did, what you expected, what happened.</li>
<li>What did you like? What should change?</li>
</ul>
<p>Where to find the model and version: usually in the TV's Settings → … → About (the name differs by brand).</p>
<div class="card"><p><b>Send results to:</b> <a href="mailto:{MAIL}">{MAIL}</a></p><p>or open an issue: <a href="{ISSUES}">github.com/sofatube/sofatube.github.io/issues</a></p></div>'''


# ------------------------------------------------------------------ faq

def faq(lang):
    if lang == 'ar':
        qs = [
            ('ما أجهزة التلفاز المدعومة؟',
             '<p>أجهزة <bdi>Android TV</bdi> و<bdi>Google TV</bdi> و<bdi>Fire TV</bdi> (ملف apk)، وتلفاز سامسونج من سنة 2018 أو أحدث عبر TizenBrew، وتلفاز LG ‏(webOS) عبر وضع المطوّر. <a href="/ar/install/">خطوات التثبيت</a>.</p>'),
            ('هل هو مجاني؟',
             f'<p>نعم. صوفا تيوب مشروع مجاني برخصة <bdi>GPL-3.0</bdi>، دون إعلانات ودون حساب. يُرفق بكل إصدار ملف المصدر <bdi>SofaTube-&lt;version&gt;-source.zip</bdi> في <a href="{RELEASES}">صفحة الإصدار</a>، والمصدر الكامل متاح عند الطلب.</p>'),
            ('لماذا لا أجده في متجر تطبيقات التلفاز؟',
             '<p>صوفا تيوب يفتح صفحة YouTube الخاصة بالتلفاز ويضيف إليها ميزات (منها حجب الإعلانات)، فيُثبَّت من خارج المتجر: بتطبيق Downloader في أندرويد، وبـTizenBrew في سامسونج، وبوضع المطوّر في LG.</p>'),
            ('كيف أحدّث التطبيق؟',
             '<ul><li><b>أندرويد:</b> ثبّت ملف apk الجديد فوق هذا بالطريقة نفسها، وتبقى الإعدادات.</li><li><b>سامسونج:</b> التحديثات تلقائية: يحمّل TizenBrew أحدث نسخة من صوفا تيوب في كل مرة.</li><li><b>LG:</b> ثبّت ملف ipk الجديد بالطريقة نفسها، وتبقى إعداداتك كما هي.</li></ul><p>لا يبحث التطبيق عن التحديثات بنفسه؛ والروابط القصيرة (<code dir="ltr">sofatube.github.io/tv</code> و<code dir="ltr">/lg</code> و<code dir="ltr">/lg-phone</code>) تشير دائمًا إلى أحدث إصدار.</p>'),
            ('هل أحتاج إلى حساب؟ وأين تُحفظ إعداداتي؟',
             '<p>لا حاجة إلى حساب: تابع القنوات دون تسجيل الدخول («قنواتي»). تبقى الإعدادات وسجل مشاهدة الأطفال على التلفاز. صفحة الهاتف يقدّمها التلفاز نفسه عبر شبكة الواي فاي في بيتك، ويبقى الرمز السري على التلفاز، ولا تتضمن النسخة الاحتياطية الرمز السري أبدًا.</p><p>يتصل التطبيق بـYouTube، وبخدمات SponsorBlock وReturn YouTube Dislike وDeArrow للفيديو الذي تشاهده.</p>'),
            ('هل يضر بالتلفاز؟',
             '<p>لا شيء هنا يضر بالتلفاز؛ أسوأ ما قد يحدث أن ميزة ما لا تعمل. في LG احذف تطبيق YouTube الرسمي أولًا (يستخدم صوفا تيوب مُعرّف التطبيق نفسه).</p>'),
            ('حل المشكلات',
             '<ul><li><b>لا توجد أزرار ملونة؟</b> استخدم ★ صوفا تيوب في القائمة الجانبية لـYouTube أو زر ★ بين أزرار التحكم.</li><li><b>LG: لا تُفتح التطبيقات التي ثبّتّها؟</b> لجلسة وضع المطوّر مدة تنتهي: افتح تطبيق Developer Mode ومدّد الجلسة.</li><li><b>ينقطع الصوت عند بعض السرعات؟</b> التشغيل ← طريقة تغيير السرعة ← «عبر التطبيق».</li><li><b>أوقات الصلاة غير صحيحة؟</b> اضبط التلفاز على المنطقة الزمنية الصحيحة.</li><li><b>الهاتف لا يتصل؟</b> يجب أن يكون الهاتف على شبكة الواي فاي نفسها التي يتصل بها التلفاز.</li><li><b>أندرويد: لا يُثبَّت؟</b> اسمح لـDownloader بتثبيت التطبيقات غير المعروفة.</li></ul>'),
            ('كيف أتواصل معكم؟',
             f'<p>راسلنا على <a href="mailto:{MAIL}"><bdi>{MAIL}</bdi></a> أو <a href="{ISSUES}">افتح بلاغًا (Issue)</a>.</p>'),
        ]
        title = '<h1>الأسئلة الشائعة</h1>'
    else:
        qs = [
            ('Which TVs does it work on?',
             '<p>Android TV, Google TV and Fire TV (the .apk; 32-bit ARM, runs on 32- and 64-bit devices), Samsung TVs from 2018 or newer through TizenBrew, and LG webOS TVs through Developer Mode. <a href="/install/">Install steps</a>.</p>'),
            ('Is it free?',
             f'<p>Yes. Sofa Tube is a free GPL-3.0 project, with no ads and no account. Each release carries a <code>SofaTube-&lt;version&gt;-source.zip</code> on the <a href="{RELEASES}">release page</a>; the full source is available on request.</p>'),
            ('Why is it not in the TV\'s app store?',
             '<p>Sofa Tube opens YouTube\'s own TV page and adds features on top (ad blocking among them), so it is installed from outside the store: with the Downloader app on Android, TizenBrew on Samsung and Developer Mode on LG.</p>'),
            ('How do updates work?',
             '<ul><li><b>Android:</b> install the new .apk over this one the same way; settings stay.</li><li><b>Samsung:</b> updates are automatic: TizenBrew loads the newest Sofa Tube each time.</li><li><b>LG:</b> install the new .ipk the same way; your settings stay.</li></ul><p>The app does not check for updates itself; the short links (<code>sofatube.github.io/tv</code>, <code>/lg</code>, <code>/lg-phone</code>) always point to the latest release.</p>'),
            ('Do I need an account? Where are my settings kept?',
             '<p>No account is needed: follow channels without signing in (My channels). Settings and the kids\' watch history stay on the TV. The phone page is served by the TV itself on your Wi-Fi; the PIN stays on the TV and is never in a backup.</p><p>The app talks to YouTube, and to the SponsorBlock, Return YouTube Dislike and DeArrow community services for the video you watch.</p>'),
            ('Can it harm my TV?',
             '<p>Nothing here can harm your TV; at worst a feature does not work. On LG, uninstall the official YouTube app first (Sofa Tube uses the same app ID).</p>'),
            ('Troubleshooting',
             '<ul><li><b>No colour buttons?</b> Use ★ Sofa Tube in YouTube\'s sidebar or the ★ button in the player bar.</li><li><b>LG: the apps stopped opening?</b> The Developer Mode session expired: open the Developer Mode app and extend it.</li><li><b>Sound cuts out at some speeds?</b> Playback → Speed method → Re-timing.</li><li><b>Prayer times wrong?</b> Set the TV to the right time zone.</li><li><b>The phone can\'t connect?</b> The phone must be on the same Wi-Fi as the TV.</li><li><b>Android: won\'t install?</b> Allow Downloader to install unknown apps.</li></ul>'),
            ('How do I contact you?',
             f'<p>Write to <a href="mailto:{MAIL}">{MAIL}</a> or <a href="{ISSUES}">open an issue</a>.</p>'),
        ]
        title = '<h1>FAQ</h1>'
    return title + '<div class="faq">' + ''.join(
        f'<details{" open" if i == 0 else ""}><summary>{q}</summary>{a}</details>' for i, (q, a) in enumerate(qs)) + '</div>'


# ------------------------------------------------------------------ extras

def not_found():
    doc = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found · Sofa Tube</title><meta name="robots" content="noindex">
<meta name="color-scheme" content="light dark"><link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css"></head>
<body><main id="main"><div class="wrap"><section class="hero">
<img class="icon" src="/icon.svg" alt="" width="112" height="112">
<h1>Page not found</h1><p>This page does not exist. <a href="/">Sofa Tube home</a> · <a href="/install/">Install</a></p>
<div lang="ar" dir="rtl"><h2>الصفحة غير موجودة</h2><p><a href="/ar/">الصفحة الرئيسية</a> · <a href="/ar/install/">التثبيت</a></p></div>
<p>Short links: <a href="/tv/">/tv</a> · <a href="/lg/">/lg</a> · <a href="/lg-phone/">/lg-phone</a></p>
</section></div></main></body></html>
'''
    (DOCS / '404.html').write_text(doc, encoding='utf-8', newline='\n')
    urls = [f'{SITE}{url(lang, s)}' for s, _, _ in PAGES for lang in ('en', 'ar')] + [f'{SITE}/testers/guide.html']
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(
        f'  <url><loc>{u}</loc></url>\n' for u in urls) + '</urlset>\n'
    (DOCS / 'sitemap.xml').write_text(sm, encoding='utf-8', newline='\n')
    (DOCS / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n', encoding='utf-8', newline='\n')


def main():
    for lang in ('en', 'ar'):
        page(lang, '', L(lang, 'Sofa Tube', 'صوفا تيوب'),
             L(lang, 'Sofa Tube: a better YouTube app for your TV. No ads, real playback speed, PIN locks, kid mode, prayer times and settings from your phone. Android TV, Google TV, Fire TV, Samsung and LG.',
               'صوفا تيوب، تطبيق YouTube أفضل لتلفازك: دون إعلانات، وبسرعة تشغيل حقيقية، وقفل بالرمز السري، ووضع للأطفال، وأوقات الصلاة، وإعدادات من هاتفك.'),
             home(lang))
        page(lang, 'install/', L(lang, 'Install', 'التثبيت'),
             L(lang, 'Install Sofa Tube on Android TV, Google TV, Fire TV, LG (webOS) and Samsung (Tizen), step by step.',
               'خطوات تثبيت صوفا تيوب على <bdi>Android TV</bdi> و<bdi>Google TV</bdi> و<bdi>Fire TV</bdi> وLG وسامسونج.'), install(lang))
        page(lang, 'videos/', L(lang, 'Videos', 'الفيديوهات'),
             L(lang, '15 narrated Sofa Tube tutorials in English and Arabic.', 'شروح صوفا تيوب المصوّرة بالعربية والإنجليزية.'), videos(lang))
        page(lang, 'testers/', L(lang, 'Testers', 'للمجرّبين'),
             L(lang, 'Sofa Tube tester guide, checklist, how to report and what has been tested.', 'دليل التجربة وقائمة الفحص وطريقة إرسال التقرير وما الذي جُرِّب.'), testers(lang))
        page(lang, 'faq/', L(lang, 'FAQ', 'الأسئلة الشائعة'),
             L(lang, 'Sofa Tube questions: which TVs, cost, updates, privacy, troubleshooting.', 'أسئلة شائعة عن صوفا تيوب: الأجهزة المدعومة، والتكلفة، والتحديث، والخصوصية، وحل المشكلات.'), faq(lang))
    not_found()


if __name__ == '__main__':
    main()
