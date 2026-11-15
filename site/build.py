# Builds the Sofa Tube website (docs/) from this file. Run: python site/build.py
# English pages live at /, Arabic pages at /ar/. The short links docs/tv, docs/lg and
# docs/lg-phone are NOT made here (the release steps update them); this script never touches them.
# Arabic wording is taken from the app, the tester guide and the install page; keep it that way.
import html
import pathlib
import re
import struct

from setup_page import setup_page
from usb_page import usb_page

DOCS = pathlib.Path(__file__).resolve().parent.parent / 'docs'
SITE = 'https://sofatube.github.io'
REPO = 'https://github.com/sofatube/sofatube.github.io'
ISSUES = REPO + '/issues'
RELEASES = REPO + '/releases/latest'
MAIL = 'sofatube.app@proton.me'
VER = '0.9.6'

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
    # the phone remote (a static web app at /remote/), always one tap away
    nav += f'<a class="nav-remote" href="/remote/">{L(lang, "Phone remote", "جهاز التحكم من الهاتف")}</a>'
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
<p><a href="{REPO}">github.com/sofatube/sofatube.github.io</a> · <a href="/ar/news/">ما الجديد (الإصدارات)</a> · <a href="{RELEASES}">كل الملفات</a></p>
</div></footer>'''
    return f'''<footer class="site-foot"><div class="wrap">
<p><b>Contact:</b> <a href="mailto:{MAIL}">{MAIL}</a> · <a href="{ISSUES}">GitHub Issues</a></p>
<p>Sofa Tube is a free <a href="{REPO}/blob/main/LICENSE">GPL-3.0</a> project built on <a href="https://github.com/webosbrew/youtube-webos">webosbrew/youtube-webos</a>, <a href="https://github.com/reisxd/TizenBrew">TizenBrew</a> by Reis Can, <a href="https://github.com/reisxd/TizenTube">TizenTube</a> and <a href="https://github.com/reisxd/TizenTubeCobalt">TizenTube Cobalt</a> (based on Google's Cobalt, Apache-2.0), and uses <a href="https://sponsor.ajay.app/">SponsorBlock</a>. Headings use Baloo Bhaijaan 2 (<a href="/assets/fonts/OFL.txt">SIL OFL</a>).</p>
<p>Not affiliated with YouTube, Google, LG or Samsung. YouTube is a trademark of Google LLC; Sofa Tube (صوفا تيوب) is not a Google product.</p>
<p><a href="{REPO}">github.com/sofatube/sofatube.github.io</a> · <a href="/news/">What's new (versions)</a> · <a href="{RELEASES}">All files (releases)</a></p>
</div></footer>'''


# ------------------------------------------------------------------ shared bits

def test_note(lang):
    return L(lang,
             f'<div class="note" role="note"><p><b>{VER} is a test version.</b> It was tried on TV emulators (software copies of a TV) and on a few real TVs (one Android TV, four Samsung TVs), not yet on every brand and model. <a href="/testers/#status">What has been tested</a>.</p></div>',
             f'<div class="note" role="note"><p><b>هذه نسخة تجريبية (<bdi>{VER}</bdi>).</b> جُرِّبت على محاكيات التلفاز (نسخ برمجية من التلفاز) وعلى بضعة أجهزة حقيقية (تلفاز أندرويد واحد وأربعة أجهزة سامسونج)، ولم تُجرَّب بعد على كل الأنواع والطرازات. <a href="/ar/testers/#status">ما الذي جُرِّب</a>.</p></div>')


def mp4_seconds(path):
    # Reads the length from the mp4's mvhd box; no ffprobe needed.
    b = path.read_bytes()
    i = b.find(b'mvhd')
    if b[i + 4] == 1:
        scale, dur = struct.unpack('>IQ', b[i + 24:i + 36])
    else:
        scale, dur = struct.unpack('>II', b[i + 16:i + 24])
    return round(dur / scale)


def video_file(lang, n):
    code = 'AR' if lang == 'ar' else 'EN'
    return f'/videos/{lang}/SofaTube-{code}-{n}-{VNAME[n][0]}'


def video_len(lang, n):
    s = mp4_seconds(DOCS / (video_file(lang, n).lstrip('/') + '.mp4'))
    return f'{s // 60}:{s % 60:02d}'


def howto(lang, n, text, note=''):
    # An install video next to the written steps: watch it once, then follow the steps.
    f = video_file(lang, n)
    title = L(lang, VNAME[n][1], VNAME[n][2])
    note = f'<p class="warn">{note}</p>' if note else ''
    return f'''<div class="howto">
<video controls preload="none" playsinline poster="{f}.jpg" width="1280" height="720" aria-label="{html.escape(title)}"><source src="{f}.mp4" type="video/mp4"><a href="{f}.mp4">{L(lang, 'Download the video (MP4)', 'تنزيل الفيديو (MP4)')}</a></video>
<div><p class="kicker">▶ {L(lang, 'Video', 'فيديو')} · <bdi>{video_len(lang, n)}</bdi></p><h3>{title}</h3><p>{text}</p>{note}</div>
</div>'''


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
<p class="meta">نحو 95 ميغابايت · <a href="{i}#android">خطوات التثبيت مع فيديو</a></p></div>
<div class="card"><h3>تلفاز LG ‏(webOS)</h3>
<p>ثبّت تطبيقًا واحدًا، <bdi>Sofa Tube Phone</bdi>، بـ<bdi>webOS Dev Manager</bdi> من هاتف أندرويد، ثم افتحه على التلفاز: يثبّت صوفا تيوب بنفسه.</p>
<p class="link">sofatube.github.io/lg-phone</p>
<div class="row"><a class="btn" href="/lg-phone/">تطبيق <bdi>Sofa Tube Phone</bdi> (ipk)</a> <a class="btn ghost" href="/lg/">صوفا تيوب وحده (ipk)</a></div>
<p class="meta"><a href="{i}#lg">خطوات التثبيت مع فيديو</a></p></div>
<div class="card"><h3>تلفاز سامسونج ‏(Tizen)</h3>
<p>نزّل الملف على هاتف أندرويد (أو حاسوب) وثبّته بـ<bdi>Apps2Samsung</bdi>:</p>
<p class="link">sofatube.github.io/samsung</p>
<div class="row"><a class="btn" href="/samsung/">تنزيل ملف wgt</a></div>
<p class="meta">تلفاز سامسونج من سنة 2018 أو أحدث · <a href="{i}#samsung">خطوات التثبيت مع فيديو</a></p></div>
</div>
<p><a href="{RELEASES}">كل الملفات</a> (صفحة الإصدار، ومنها ملف المصدر <bdi>source.zip</bdi>)</p>'''
    return f'''<div class="grid dl">
<div class="card"><h3>Android TV · Google TV · Fire TV</h3>
<p>Type this in the <b>Downloader</b> app on the TV:</p>
<p class="link">sofatube.github.io/tv</p>
<div class="row"><a class="btn" href="/tv/">Download .apk</a></div>
<p class="meta">about 95 MB · <a href="{i}#android">Install steps and video</a></p></div>
<div class="card"><h3>LG TV (webOS)</h3>
<p>Install one app, <b>Sofa Tube Phone</b>, with <b>webOS Dev Manager</b> from an Android phone, then open it on the TV: it installs Sofa Tube itself.</p>
<p class="link">sofatube.github.io/lg-phone</p>
<div class="row"><a class="btn" href="/lg-phone/">Sofa Tube Phone (.ipk)</a> <a class="btn ghost" href="/lg/">Sofa Tube only (.ipk)</a></div>
<p class="meta"><a href="{i}#lg">Install steps and video</a></p></div>
<div class="card"><h3>Samsung TV (Tizen)</h3>
<p>Download on an Android phone (or a computer), install with <b>Apps2Samsung</b>:</p>
<p class="link">sofatube.github.io/samsung</p>
<div class="row"><a class="btn" href="/samsung/">Download .wgt</a></div>
<p class="meta">Samsung TVs from 2018 or newer · <a href="{i}#samsung">Install steps and video</a></p></div>
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

# Screenshots: frames from the 0.9.4 how-to videos (media/tutorials/cap_en, cap_ar), one set per language
# in docs/assets/shots/en and /ar. The first six show on the home page, the rest under "More screenshots".
SHOTS_TV = [
    ('p_playback', 'Settings: the Playback page', 'الإعدادات: صفحة التشغيل'),
    ('star_menu', 'The Action menu while watching', 'قائمة الإجراءات أثناء المشاهدة'),
    ('prayer_lock', 'Prayer time: the video pauses at the adhan', 'وقت الصلاة: يتوقف الفيديو عند الأذان'),
    ('p_kids_on', 'Kid mode and its options', 'وضع الأطفال وخياراته'),
    ('lock_app1', 'App lock with the PIN', 'قفل التطبيق بالرمز السري'),
    ('setup_phone', 'Connect your phone: scan the code', 'توصيل الهاتف: امسح الرمز'),
    ('speed1', 'Playback speed', 'سرعة التشغيل'),
    ('jump1', 'Jump to 0%–90%', 'الانتقال إلى موضع في الفيديو'),
    ('chapters_list', 'Chapters', 'الفصول'),
    ('kids_blocked', 'Kid mode: a video that is not allowed', 'وضع الأطفال: فيديو غير مسموح به'),
    ('vlock_block', 'Locked to this video', 'منع الخروج من الفيديو'),
    ('myfeed', 'My channels: new videos', 'قنواتي: الفيديوهات الجديدة'),
    ('guide', 'Button guide', 'دليل الأزرار'),
    ('help_open', 'Help page', 'المساعدة'),
    ('p_look_night', 'Player look and night dim', 'مظهر الفيديو والتعتيم الليلي'),
    ('setup0', 'First-time setup', 'الإعداد الأولي'),
    ('sidebar_star', '★ Sofa Tube in the sidebar', '★ صوفا تيوب في القائمة الجانبية'),
]
SHOTS_PHONE = [
    ('ph_now', 'Phone: Now playing', 'الهاتف: قيد التشغيل'),
    ('ph_remote', 'Phone: the remote', 'الهاتف: جهاز التحكم'),
    ('ph_search', 'Phone: search on the TV', 'الهاتف: البحث على التلفاز'),
    ('ph_parental', 'Phone: parent controls', 'الهاتف: الرقابة الأبوية'),
]
SHOTS_WHOLE = [
    ('ph_tv_remote', 'Keys that work anywhere on the TV', 'أزرار تعمل في أي مكان على التلفاز'),
    ('ph_tv_apps', "The TV's apps and inputs", 'تطبيقات التلفاز ومصادر الإدخال'),
    ('ph_tv_kbd', 'Type on the TV from the phone', 'الكتابة على التلفاز من الهاتف'),
    ('n96_pointer', 'The Pointer screen', 'شاشة المؤشر'),
]
SHOTS_WHOLE_TV = [
    ('p_phone_wholetv', "Turned on in Sofa Tube's settings, for parents", 'يُفعَّل من إعدادات صوفا تيوب، للوالدين'),
    ('lg_pair_prompt', 'The TV asks once (LG)', 'يسأل التلفاز مرة واحدة (LG)'),
]


# What 0.9.5 adds, grouped for the home page (from the code repo's CHANGELOG, "Unreleased (0.9.5)").
# Arabic terms are the app's own (src/config.js, src/strings-away.js, the phone page).
NEW_095 = [
    ('⏻', 'Family plan for the whole TV', 'خطة العائلة للتلفاز كله',
     'Kids\' daily TV time across every app (a warning 5 minutes and 1 minute before, then the TV turns off), a bedtime that can turn the TV off, a sleep timer, allowed apps only, a maximum volume for kids, and a pause in other apps at prayer time. More time only from a parent. Needs “Control the whole TV from the phone”; off by default.',
     '«وقت التلفاز اليومي» للأطفال في كل التطبيقات (تنبيه قبل 5 دقائق وقبل دقيقة واحدة، ثم يُطفأ التلفاز)، ووقت النوم الذي يمكن أن يُطفئ التلفاز، و«مؤقت النوم»، و«التطبيقات المسموح بها فقط»، و«أقصى مستوى للصوت» للأطفال، وإيقاف مؤقت في التطبيقات الأخرى عند الأذان. والوقت الإضافي من أحد الوالدين فقط. يتطلب تفعيل «التحكم في التلفاز كله من الهاتف»، وهو غير مفعّل في البداية.'),
    ('✉', 'Control from away', 'التحكم من خارج المنزل',
     'A parent\'s phone outside the home sees what\'s on now and sends more time, a lock, turn off, a message, bedtime tonight or an allowed app. Kids\' requests arrive as notifications. Sealed end to end; the TV shows a sign when a parent looks. Off by default. <a href="/faq/#away">Who sees what</a>.',
     'يرى هاتف أحد الوالدين خارج المنزل ما يُعرض الآن، ويرسل وقتًا إضافيًا أو القفل أو إطفاء التلفاز أو رسالة أو موعد النوم الليلة أو السماح بتطبيق. وتصل طلبات الأطفال إلى الهاتف إشعاراتٍ. الرسائل مشفّرة بين التلفاز والهاتف، ويُظهر التلفاز علامة حين يطّلع أحد الوالدين على ما يُعرض. غير مفعّل في البداية. <a href="/ar/faq/#away">من يرى ماذا</a>.'),
    ('▭', 'The phone as a second screen', 'الهاتف شاشة ثانية',
     'Search results on the phone while the TV keeps playing (Play now or Up next), share this moment, the description, comments (not for kids) and large captions in step with the TV. A guest phone link for visitors: arrows, search and Up next, no settings.',
     'نتائج البحث على الهاتف والتلفاز مستمر في التشغيل (تشغيل الآن أو «التالي»)، و«مشاركة هذه اللحظة»، والوصف، والتعليقات (لا تظهر للأطفال)، وترجمة كبيرة تسير مع التلفاز. و«اتصال هاتف الضيف» للزوار: الأسهم والبحث و«التالي»، دون الإعدادات.'),
    ('⚇', 'Remote help from someone you trust', 'المساعدة عن بُعد من شخص تثق به',
     'A son or a niece helps from far away, phone to phone. The TV first asks, with the remote, what they may do for 30 minutes, shows a banner the whole time and lists what was changed; Back twice ends it. Kid rules only with the PIN. Also “Watch together” and Fix it.',
     'يساعدك ابن أو ابنة أخ من بعيد، من هاتف إلى هاتف. يسأل التلفاز أولًا، بجهاز التحكم، عمّا يُسمح للمساعد به مدة 30 دقيقة، ويُظهر شريطًا طوال المساعدة، ويعرض قائمة بما تغيّر؛ والضغط على زر الرجوع مرتين يُنهيها. ولا تتغيّر قواعد الأطفال إلا بالرمز السري. وأيضًا «المشاهدة معًا» و«إصلاح المشكلة».'),
    ('Aa', 'Easier to see and use', 'أسهل في الرؤية والاستخدام',
     'Ready-made settings (Kids, Elderly viewers, Music, Night, Listen) that can be undone, Simple mode for elderly viewers (a thick yellow focus frame, only the main buttons act), text size Large or Larger, and High contrast for Sofa Tube\'s own screens.',
     '«إعدادات جاهزة» (الأطفال، كبار السن، الموسيقى، الليل، الاستماع) يمكن التراجع عنها، و«الوضع المبسّط» لكبار السن (إطار تحديد أصفر سميك، ولا تعمل إلا الأزرار الأساسية)، و«حجم النص» كبير أو أكبر، و«تباين عالٍ» لشاشات صوفا تيوب نفسها.'),
    ('☾', 'Next prayer and Hijri date', 'الصلاة القادمة والتاريخ الهجري',
     'The next prayer by the clock (iftar and imsak in Ramadan) and the Hijri date, with a correction of up to 2 days. At prayer time, Sofa Tube can play the adhan or a playlist you chose, then bring the video back paused (while Sofa Tube is open).',
     '«الصلاة القادمة بجانب الساعة» (والإفطار والإمساك في رمضان)، و«التاريخ الهجري بجانب الساعة» مع تصحيح حتى يومين. وعند الأذان يمكن أن يشغّل صوفا تيوب الأذان أو قائمة تشغيل تختارها، ثم يعيد الفيديو متوقفًا مؤقتًا (ما دام صوفا تيوب مفتوحًا).'),
    ('⟲', 'More control while watching', 'تحكم أكثر أثناء المشاهدة',
     'Not interested and Don\'t recommend this channel, My playlists (no account needed), Repeat a part (A–B), Saved moments, and SponsorBlock choices: ask before skipping, mute marked parts instead, leave short parts alone. Lyrics only when asked.',
     '«غير مهتم» و«عدم اقتراح هذه القناة»، و«قوائم التشغيل الخاصة بي» (دون حساب)، و«تكرار جزء من الفيديو»، و«اللحظات المحفوظة»، وخيارات SponsorBlock: «السؤال قبل التخطي»، أو كتم صوت المقاطع بدل تخطيها، أو ترك المقاطع القصيرة. وكلمات الأغنية عند الطلب فقط.'),
    ('⇆', 'Share with another TV', 'المشاركة مع تلفاز آخر',
     'Send settings, My channels, Watch later, My playlists or kids rules to another TV with a share code. The other TV shows what will change first; kids rules need its PIN. No server.',
     'أرسل الإعدادات أو «قنواتي» أو «المشاهدة لاحقًا» أو «قوائم التشغيل الخاصة بي» أو قواعد الأطفال إلى تلفاز آخر برمز مشاركة. يعرض التلفاز الآخر أولًا ما سيتغيّر، وتحتاج قواعد الأطفال إلى رمزه السري. دون خادم.'),
    ('⎚', 'HDMI devices and soundbar', 'أجهزة HDMI ومكبر الصوت',
     'Named inputs (“HDMI 2 · PlayStation 5”), remote keys to devices on HDMI through HDMI-CEC, and a volume that knows when a soundbar or receiver plays the sound. Fix it unmutes, sets the usual volume and input, and says what it fixed.',
     'مصادر إدخال بأسمائها («HDMI 2 · PlayStation 5»)، وأزرار جهاز التحكم تصل إلى «الأجهزة المتصلة عبر HDMI» عبر HDMI-CEC، والصوت يعرف متى يخرج من مكبر صوت أو جهاز استقبال. و«إصلاح المشكلة» يلغي كتم الصوت ويعيد مستوى الصوت ومصدر الإدخال المعتادين، ويقول ما أصلحه.'),
]

# 0.9.5 SHOTS HERE: the 0.9.5 feature screenshots (docs/assets/shots/en|ar/) go in this list, as
# (file name without .jpg, English caption, Arabic caption); new_095() shows them as one row under the cards.
SHOTS_095 = [
    ('n95_setup', 'Ready-made settings in the first-time setup', 'الإعدادات الجاهزة في خطوات الإعداد الأولي'),
    ('n95_help', 'Help from far away: the TV asks what the helper may do', 'المساعدة عن بُعد: يسألك التلفاز عمّا يُسمح للمساعد به'),
    ('n95_tip', 'A tip of the day on Home (Back hides it)', 'نصيحة اليوم على الشاشة الرئيسية (الرجوع يُخفيها)'),
    ('n95_simple', 'Simple mode: larger text and a thick yellow frame', 'الوضع المبسّط: نص أكبر وإطار تحديد أصفر عريض'),
    ('n95_away', 'Control from away: what is on now, more time, lock', 'التحكم من خارج المنزل: ما يُعرض الآن، ووقت إضافي، والقفل', True),
]


# 0.9.6 SHOTS: phone page / remote app frames from tools/phone/vidcap096.mjs (stand-in TVs, a made-up video),
# TV frames from tools/desktop/ui-shots.mjs (Sofa Tube's TV page in desktop Chromium); EN and AR each.
SHOT_FIND = ('n96_find', 'Find my TV: the phone shows a code', '«ابحث عن التلفاز»: يُظهر الهاتف رمزًا')
SHOT_TVASK = ('n96_tvask', 'The TV asks with the same code: OK, then the PIN', 'يسأل التلفاز بالرمز نفسه: OK ثم الرمز السري')
SHOT_INSIDE = ('n96_inside', 'The TV’s page inside the Sofa Tube app, no browser bar', 'صفحة التلفاز داخل تطبيق صوفا تيوب، دون شريط المتصفح')
SHOT_AWAY = ('n96_away', 'From away: the whole page, the parent PIN first', 'من خارج المنزل: الصفحة كاملة، والرمز السري لولي الأمر أولًا')
SHOT_UPD = ('n96_updates', 'Updates card: one tap updates the TV (a sample version)', 'بطاقة «التحديثات»: لمسة واحدة تحدّث التلفاز (رقم إصدار للمثال)')
SHOT_CHANNEL = ('n96_channel', 'On the TV: Update channel (Stable, Testing, Experimental)', 'على التلفاز: «قناة التحديثات» («المستقر» و«الاختبار» و«التجريبي»)')
SHOTS_096_TV = [SHOT_TVASK, SHOT_CHANNEL]
SHOTS_096_PHONE = [
    SHOT_FIND, SHOT_INSIDE, SHOT_AWAY,
    ('n96_pin', 'Live view pinned while you use the remote (Android TV)', 'العرض المباشر مثبّتًا أثناء استخدام جهاز التحكم (Android TV)'),
    ('n96_pointer', 'Pointer: touchpad, hold to aim, keys under the thumb', 'المؤشر: لوحة لمس، والتوجيه بالضغط المطوّل، والأزرار تحت الإبهام'),
    ('n96_more', 'More on this TV: the one step that turns a feature on', '«المزيد على هذا التلفاز»: الخطوة الواحدة التي تفعّل الميزة'),
    SHOT_UPD,
    ('n96_seek', 'Show on the TV: a seek bar for videos from the phone', '«العرض على التلفاز»: شريط الموضع لفيديوهات الهاتف'),
]


def shot(lang, f, ce, ca, phone=False):
    w, h = (390, 844) if phone else (1280, 720)
    cap = L(lang, ce, ca)
    return f'<figure><img src="/assets/shots/{lang}/{f}.jpg" alt="{html.escape(cap)}" width="{w}" height="{h}" loading="lazy" decoding="async"><figcaption>{cap}</figcaption></figure>'


def away_shot(lang):
    return f'<div class="phones">{shot(lang, *SHOT_AWAY, phone=True)}</div>'


def join_shots(lang):
    # Find my TV, OK on the TV, the page inside the app (0.9.6)
    return (f'<div class="phones">{shot(lang, *SHOT_FIND, phone=True)}{shot(lang, *SHOT_INSIDE, phone=True)}</div>'
            f'<div class="shots two">{shot(lang, *SHOT_TVASK)}</div>')


def updates_096(lang):
    # Update channels and one-tap updates (0.9.6; code repo CHANGELOG "Updates (every TV)", docs/steps/update-channels.md)
    pics = f'<div class="phones">{shot(lang, *SHOT_UPD, phone=True)}</div><div class="shots two">{shot(lang, *SHOT_CHANNEL)}</div>'
    v = video_len(lang, '47')
    if lang == 'ar':
        return f'''<section class="spot" id="updates">
<div class="spot-txt">
<p class="kicker">التحديثات</p>
<h2>ثلاث قنوات للتحديثات، ولمسة واحدة من الهاتف</h2>
<p class="lead">جديد في <bdi>0.9.6</bdi>: اختر متى يصل الإصدار الجديد إلى تلفازك، وحدّثه من الهاتف دون أن تقوم إلى التلفاز.</p>
<ul class="ticks">
<li><b>«المستقر»</b> (ما يصل إلى الجميع)، و<b>«الاختبار»</b> (الإصدار القادم قبل الجميع بأيام قليلة، للمساعدة في اكتشاف الأخطاء)، و<b>«التجريبي»</b> (تجارب مبكرة لميزات جديدة، قد يتعطّل فيها شيء). على التلفاز: الإعدادات ← «حول التطبيق والنسخ الاحتياطي» ← «قناة التحديثات».</li>
<li><b>لا يتأخر التلفاز عن «المستقر» أبدًا:</b> يأخذ أحدث إصدار من قناته ومن القنوات الأكثر استقرارًا منها. وتغيير القناة لا يثبّت إصدارًا أقدم من تلقاء نفسه.</li>
<li><b>«التجريبي» يحتاج إلى أحد الوالدين:</b> تحذير أولًا، ثم الرمز السري إن كان مضبوطًا، على التلفاز أو على هاتف أحد الوالدين.</li>
<li><b>لمسة واحدة على الهاتف:</b> بطاقة «التحديثات» (لأحد الوالدين فقط: الإعدادات ← التطبيق ← حول التطبيق والنسخ الاحتياطي، وفي «قيد التشغيل» حين يكون التحديث جاهزًا) تقول «صوفا تيوب جاهز لهذا التلفاز» مع رقم الإصدار، و<b>«تحديث التلفاز»</b> يشغّل أداة التثبيت في التلفاز نفسه، وتُظهر البطاقة مدى تقدّمه. وفي أندرويد من 9 إلى 11 يسأل التلفاز: اضغط OK عليه (أو من الهاتف عبر «التلفاز كله»).</li>
<li><b>ملف موقَّع:</b> ملف التحديثات موقَّع بمفتاح صوفا تيوب المحفوظ خارج الإنترنت، وترفض أجهزة التلفاز من <bdi>0.9.6</bdi> أي ملف غير موقَّع. ولا يُبحث عن شيء إلا حين يطلب أحد ذلك أو يكون البحث الأسبوعي مفعّلًا، وتبقى إعداداتك.</li>
</ul>
<div class="row"><a class="btn ghost" href="/ar/videos/#v47">▶ تحديث التلفاز من الهاتف · <bdi>{v}</bdi></a> <a class="btn ghost" href="/ar/faq/#updates">كل الطرق</a></div>
</div>
{pics}
</section>'''
    return f'''<section class="spot" id="updates">
<div class="spot-txt">
<p class="kicker">Updates</p>
<h2>Three update channels, one tap from the phone</h2>
<p class="lead">New in 0.9.6: choose how early your TV gets new versions, and update it from the phone without getting up.</p>
<ul class="ticks">
<li><b>Stable</b> (what everyone gets), <b>Testing</b> (the next version a few days early, to help find bugs) and <b>Experimental</b> (early tries of new features; things may break). On the TV: Settings → Backup and about → Update channel.</li>
<li><b>Never behind Stable:</b> a TV takes the newest version of its channel and of the more stable ones. Changing the channel never installs an older version by itself.</li>
<li><b>Experimental needs a parent:</b> a warning first, then the PIN when one is set, on the TV or on a parent's phone.</li>
<li><b>One tap on the phone:</b> the Updates card (parents only: Settings → App → Backup and about, and on Now playing while an update is ready) says “Sofa Tube … is ready for this TV”; <b>Update the TV</b> starts the TV's own installer and the card shows how far it got. Android 9 to 11 ask on the TV: press OK there (or from the phone, through Whole TV).</li>
<li><b>Signed:</b> the update file is signed with Sofa Tube's own key, kept offline; TVs from 0.9.6 refuse a file that is not. Nothing is checked unless someone asks or the weekly check is on, and your settings stay.</li>
</ul>
<div class="row"><a class="btn ghost" href="/videos/#v47">▶ Update the TV from the phone · {v}</a> <a class="btn ghost" href="/faq/#updates">All the ways</a></div>
</div>
{pics}
</section>'''


def whole_tv(lang):
    # The Whole TV feature gets its own section near the top: it is what sets Sofa Tube apart.
    phones = ''.join(shot(lang, *s, phone=True) for s in SHOTS_WHOLE)
    tvs = ''.join(shot(lang, *s) for s in SHOTS_WHOLE_TV)
    v18, v19, v46 = video_len(lang, '18'), video_len(lang, '19'), video_len(lang, '46')
    if lang == 'ar':
        return f'''<section class="spot" id="whole-tv">
<div class="spot-txt">
<p class="kicker">التلفاز كله</p>
<h2>هاتفك يتحكم في التلفاز كله</h2>
<p class="lead">ليس YouTube فقط: الشاشة الرئيسية للتلفاز، وتطبيقاته الأخرى، والصوت، ومصادر الإدخال، والكتابة، وإطفاؤه، من الهاتف الذي في يدك.</p>
<ul class="ticks">
<li><b>أزرار تعمل في أي مكان:</b> الأسهم وOK والرجوع والرئيسية والقائمة والخروج والصوت والقنوات، ولو كان صوفا تيوب في الخلفية.</li>
<li><b>التطبيقات ومصادر الإدخال:</b> افتح أي تطبيق على التلفاز، أو انتقل إلى جهاز آخر متصل به.</li>
<li><b>الكتابة على التلفاز:</b> حين يُفتح مربع نص على التلفاز، اكتب من هاتفك.</li>
<li><b>المؤشر:</b> شاشة واحدة فيها لوحة لمس (اسحب، وانقر، وبإصبعين للتمرير)، و«اضغط مطولًا للتوجيه» ماوسًا هوائيًا، والرجوع والرئيسية و OK والقائمة تحت الإبهام، كما في <bdi>Magic Remote</bdi> من LG. و<b>«المزيد على هذا التلفاز»</b> يذكر الخطوة الواحدة التي تفعّل ميزة ناقصة.</li>
<li><b>لولي الأمر:</b> غير مفعّل في البداية، ويُفعَّل من إعدادات صوفا تيوب؛ ولا يحصل عليه هاتف الأطفال.</li>
</ul>
<div class="row"><a class="btn ghost" href="/ar/videos/#v18">▶ الإعداد · <bdi>{v18}</bdi></a> <a class="btn ghost" href="/ar/videos/#v19">▶ الاستخدام · <bdi>{v19}</bdi></a> <a class="btn ghost" href="/ar/videos/#v46">▶ المؤشر · <bdi>{v46}</bdi></a></div>
<p class="meta">لأجهزة LG وسامسونج و<bdi>Android TV</bdi>. جُرِّب على محاكيَي LG و<bdi>Google TV</bdi>، وجُرِّبت نسخة سابقة منه على تلفاز أندرويد حقيقي؛ ولم يُتأكَّد منه بعدُ على تلفاز سامسونج حقيقي.</p>
</div>
<div class="phones spot-phones">{phones}</div>
<div class="shots two">{tvs}</div>
</section>'''
    return f'''<section class="spot" id="whole-tv">
<div class="spot-txt">
<p class="kicker">Whole TV</p>
<h2>Your phone controls the whole TV</h2>
<p class="lead">Not only YouTube: the TV's home screen, its other apps, volume, inputs, typing and turning it off, from the phone already in your hand.</p>
<ul class="ticks">
<li><b>Keys that work anywhere:</b> arrows, OK, Back, Home, Menu, Exit, volume and channels, even with Sofa Tube in the background.</li>
<li><b>Apps and inputs:</b> open any app on the TV, or switch to another device connected to it.</li>
<li><b>Type on the TV:</b> when a text box opens on the TV, type on your phone.</li>
<li><b>Pointer:</b> one screen with a touchpad (slide, tap, two fingers to scroll), “Hold to aim” as an air mouse, and Back, Home, OK and Menu under your thumb, like LG's Magic Remote. <b>More on this TV</b> says the one step that turns a missing feature on.</li>
<li><b>For parents:</b> off at first and turned on in Sofa Tube's settings; a kids phone never gets it.</li>
</ul>
<div class="row"><a class="btn ghost" href="/videos/#v18">▶ Setting it up · {v18}</a> <a class="btn ghost" href="/videos/#v19">▶ Using it · {v19}</a> <a class="btn ghost" href="/videos/#v46">▶ Pointer · {v46}</a></div>
<p class="meta">LG, Samsung and Android TV. Tried on the LG and Google TV emulators, and an earlier build on a real Android TV; on Samsung not yet confirmed on a real TV.</p>
</div>
<div class="phones spot-phones">{phones}</div>
<div class="shots two">{tvs}</div>
</section>'''


def phone_app(lang, short=False):
    # The phone remote at /remote/ (a web app, no app store): what it is and the three steps.
    # Owner (2026-11-14): it existed but nothing on the site said so.
    if lang == 'ar':
        steps = '''<ol class="steps">
<li>على هاتفك افتح <a href="/remote/"><bdi>sofatube.github.io/remote</bdi></a>&rlm; (<bdi>Chrome</bdi> في أندرويد، أو <bdi>Safari</bdi> في آيفون)، على شبكة الواي فاي نفسها التي يتصل بها التلفاز.</li>
<li>أضفه إلى الشاشة الرئيسية فيصبح تطبيقًا: في <bdi>Chrome</bdi>: <bdi>⋮</bdi> ← <b>تثبيت التطبيق</b> (أو «إضافة إلى الشاشة الرئيسية»)؛ وفي <bdi>Safari</bdi>: <b>مشاركة</b> ← <b>إضافة إلى الشاشة الرئيسية</b>.</li>
<li>اضغط <b>«ابحث عن التلفاز»</b>: يظهر الرمز نفسه على الهاتف والتلفاز، فاضغط OK على التلفاز (ثم الرمز السري إن كان مضبوطًا). أو امسح الرمز الظاهر على التلفاز (صوفا تيوب ← الإعدادات ← جهاز التحكم من الهاتف). ويتذكّر التطبيقُ التلفازَ في المرة القادمة، ويعرض صفحته داخل التطبيق دون شريط المتصفح.</li>
</ol>'''
        if short:
            return f'''<section class="tv-section" id="phone">
<h2>بعد التثبيت: اربط هاتفك</h2>
<p>جهاز التحكم من الهاتف تطبيق ويب، دون متجر تطبيقات:</p>
{steps}
<p><a class="btn" href="/remote/">فتح جهاز التحكم من الهاتف</a></p>
</section>'''
        return f'''<section class="spot" id="phone-remote">
<div class="spot-txt">
<p class="kicker">على هاتفك</p>
<h2>جهاز التحكم على هاتفك، دون متجر تطبيقات</h2>
<p class="lead"><bdi>sofatube.github.io/remote</bdi> هو جهاز التحكم في صوفا تيوب تطبيقَ ويب: يجد تلفازك على الواي فاي نفسه (أو يمسح الرمز الظاهر على التلفاز) ويفتح جهاز التحكم كاملًا: قيد التشغيل، والبحث، والأطفال، والتلفاز كله، والمؤشر.</p>
{steps}
<div class="row"><a class="btn" href="/remote/">فتح جهاز التحكم من الهاتف</a> <a class="btn ghost" href="/remote/away-help.html">من خارج المنزل</a> <a class="btn ghost" href="/ar/videos/#v45">▶ ابحث عن التلفاز · <bdi>{video_len(lang, '45')}</bdi></a></div>
</div>
{join_shots(lang)}
</section>'''
    steps = '''<ol class="steps">
<li>On your phone, open <a href="/remote/">sofatube.github.io/remote</a> (Chrome on Android, Safari on iPhone), on the same Wi-Fi as the TV.</li>
<li>Add it to your home screen and it becomes an app: in Chrome ⋮ → <b>Install app</b> (or “Add to Home screen”); in Safari <b>Share</b> → <b>Add to Home Screen</b>.</li>
<li>Tap <b>Find my TV</b>: the phone and the TV show the same code; press OK on the TV (then the PIN, if one is set). Or scan the code on the TV (Sofa Tube → Settings → Phone remote). The app remembers the TV next time and shows its page inside the app, with no browser bar.</li>
</ol>'''
    if short:
        return f'''<section class="tv-section" id="phone">
<h2>After installing: connect your phone</h2>
<p>The phone remote is a web app, no app store:</p>
{steps}
<p><a class="btn" href="/remote/">Open the phone remote</a></p>
</section>'''
    return f'''<section class="spot" id="phone-remote">
<div class="spot-txt">
<p class="kicker">On your phone</p>
<h2>The remote on your phone, no app store</h2>
<p class="lead"><a href="/remote/">sofatube.github.io/remote</a> is Sofa Tube's remote as a web app. It finds your TV on the same Wi-Fi (or scans the code on the TV) and opens the full remote: Now playing, search, kids, Whole TV and the pointer.</p>
{steps}
<div class="row"><a class="btn" href="/remote/">Open the phone remote</a> <a class="btn ghost" href="/remote/away-help.html">From away</a> <a class="btn ghost" href="/videos/#v45">▶ Find my TV · {video_len(lang, '45')}</a></div>
</div>
{join_shots(lang)}
</section>'''


def news(lang):
    # Version history, newest first. It was the home page's "New in 0.9.6 and 0.9.5" and #updates parts; moved
    # here because almost every visitor is new (site/NOTES-newcomer.md). The home page links here in one line.
    cards = ''.join(
        f'<div class="card feature"><span class="ico" aria-hidden="true">{ico}</span><h3>{L(lang, te, ta)}</h3><p>{L(lang, de, da)}</p></div>'
        for ico, te, ta, de, da in NEW_095)
    # TV shots in the 16:9 row, phone shots in their own row (like whole_tv)
    tv_shots = ''.join(shot(lang, *x) for x in SHOTS_095 if len(x) < 4)
    ph_shots = ''.join(shot(lang, *x[:3], phone=True) for x in SHOTS_095 if len(x) > 3)
    row = (f'<div class="shots">{tv_shots}</div>' if tv_shots else '') + (f'<div class="phones">{ph_shots}</div>' if ph_shots else '')
    row096 = ('<div class="shots two">' + ''.join(shot(lang, *x) for x in SHOTS_096_TV) + '</div>'
              '<div class="phones">' + ''.join(shot(lang, *x, phone=True) for x in SHOTS_096_PHONE) + '</div>')
    rel = REPO + '/releases'
    if lang == 'ar':
        return f'''<h1>ما الجديد في صوفا تيوب</h1>
<p class="lead">كل إصدار، الأحدث أولًا. جديد هنا؟ ابدأ من <a href="/ar/">الصفحة الرئيسية</a>، أو ثبّته بـ<a href="/ar/setup/">إعداد صوفا تيوب</a>.</p>
<h2 id="new">الإصدار <bdi>0.9.6</bdi></h2>
<p>يضيف إصدار <bdi>0.9.6</bdi> <a href="/ar/setup/">إعداد صوفا تيوب</a> للتثبيت الأول دون كتابة شيء على التلفاز، و<a href="/ar/usb/">التثبيت عبر USB</a>، و«ابحث عن التلفاز» ثم OK على التلفاز (دون رمز QR)، وصفحة الهاتف كاملة داخل تطبيق صوفا تيوب دون شريط المتصفح، في المنزل ومن خارجه (بالرمز السري لولي الأمر)، والعرض المباشر للتلفاز مثبّتًا أثناء استخدام بقية الصفحة، وثلاث قنوات للتحديثات مع التحديث بلمسة من الهاتف (<a href="#updates">كيف</a>)، وشريط الموضع في «العرض على التلفاز»، وشاشة واحدة للمؤشر.</p>
{row096}
{updates_096(lang)}
<p class="meta">على LG حدّث تطبيق «صوفا تيوب للهاتف» أيضًا: <a href="/ar/install/#lg-update">كيف</a>.</p>
<h2 id="v095">الإصدار <bdi>0.9.5</bdi></h2>
<p>أضاف إصدار <bdi>0.9.5</bdi> قواعد للعائلة على التلفاز كله، والتحكم من خارج المنزل، والهاتف شاشة ثانية، والمساعدة عن بُعد، وشاشات أسهل لكبار السن.</p>
<div class="grid">{cards}</div>
{row}
<p class="meta">بعض الأجزاء لم يُتأكَّد منها بعدُ على كل أنواع التلفاز الحقيقية، وما يقدر عليه كل نوع يختلف: <a href="/ar/faq/#limits">الحدود المعروفة</a>.</p>
<h2 id="older">الإصدارات السابقة</h2>
<p>ملاحظات كل إصدار وملفاته في <a href="{rel}">صفحة الإصدارات على GitHub</a>.</p>'''
    return f'''<h1>What's new in Sofa Tube</h1>
<p class="lead">Every version, newest first. New here? Start at the <a href="/">home page</a>, or install it with <a href="/setup/">Sofa Tube Setup</a>.</p>
<h2 id="new">Version 0.9.6</h2>
<p>0.9.6 adds <a href="/setup/">Sofa Tube Setup</a> for the first install with nothing typed on the TV, <a href="/usb/">install over USB</a>, Find my TV with OK on the TV (no QR code), the TV's whole phone page inside the Sofa Tube app with no browser bar, at home and from away (parent PIN first), a live view of the TV pinned while you use the rest, three update channels with one-tap updates from the phone (<a href="#updates">how</a>), a seek bar for Show on the TV, and one Pointer screen.</p>
{row096}
{updates_096(lang)}
<p class="meta">On LG, update the Sofa Tube Phone app too: <a href="/install/#lg-update">how</a>.</p>
<h2 id="v095">Version 0.9.5</h2>
<p>0.9.5 added family rules for the whole TV, control from away, the phone as a second screen, remote help, and easier screens for elderly viewers.</p>
<div class="grid">{cards}</div>
{row}
<p class="meta">Some parts are not yet confirmed on every real TV, and what each brand can do differs: <a href="/faq/#limits">known limits</a>.</p>
<h2 id="older">Earlier versions</h2>
<p>The notes and files of every version are on the <a href="{rel}">GitHub releases page</a>.</p>'''


def install_first(lang):
    # Install for a first-time visitor (site/NOTES-newcomer.md): Sofa Tube Setup first, then each brand by hand.
    if lang == 'ar':
        return f'''<section class="spot solo" id="install">
<div class="spot-txt">
<p class="kicker">التثبيت · الطريقة المقترحة</p>
<h2>أسهل طريقة: إعداد صوفا تيوب، دون كتابة شيء على التلفاز</h2>
<p class="lead">شغّل إعداد صوفا تيوب مرة واحدة على حاسوب ويندوز أو ماك، أو على هاتف أندرويد، متصل بشبكة الواي فاي نفسها التي يتصل بها التلفاز. يجد الإعداد التلفاز وينفّذ الخطوات عنك، وتُكتب الرموز والروابط وتسجيلات الدخول على الحاسوب أو الهاتف.</p>
<ul class="ticks">
<li><b><bdi>Android TV</bdi> و<bdi>Google TV</bdi>:</b> اكتب في الإعداد الرمز الظاهر على التلفاز، ثم اضغط «تثبيت» على التلفاز مرة واحدة.</li>
<li><b>LG:</b> اضغط YES على التلفاز، فيفتح الإعداد وضع المطوّر ويثبّت صوفا تيوب و«صوفا تيوب للهاتف» بنفسه (يلزم حساب مطوّر LG مجاني).</li>
<li><b>سامسونج:</b> يفعّل الإعداد وضع المطوّر ويثبّت صوفا تيوب (نسخة الحاسوب). وفي أجهزة التلفاز من سنة 2023 أو أحدث يجهّز التلفاز ثم يرشدك إلى طريقة <bdi>Apps2Samsung</bdi>.</li>
</ul>
<div class="row"><a class="btn" href="/ar/setup/">تنزيل إعداد صوفا تيوب</a> <a class="btn ghost" href="/ar/usb/">جهاز <bdi>Android TV</bdi> فيه منفذ USB</a></div>
<p class="meta">آيفون فقط؟ استخدم حاسوبًا مرة واحدة، ثم يعمل جهاز التحكم من الآيفون عاديًا. ولـ<bdi>Fire TV</bdi>: تطبيق Downloader أدناه.</p>
</div>
</section>
<h2 id="download">أو ثبّته بنفسك: اختر تلفازك</h2>
<p>روابط قصيرة (اكتبها في تطبيق <b>Downloader</b> على التلفاز أو في هاتفك):</p>
{download_cards(lang)}
{test_note(lang)}'''
    return f'''<section class="spot solo" id="install">
<div class="spot-txt">
<p class="kicker">Install · recommended</p>
<h2>The easy way: Sofa Tube Setup, nothing typed on the TV</h2>
<p class="lead">Run Sofa Tube Setup once on a Windows or Mac computer, or on an Android phone, on the same Wi-Fi as the TV. It finds the TV and does the steps for you; codes, links and logins are typed on the computer or phone.</p>
<ul class="ticks">
<li><b>Android TV and Google TV:</b> type the code the TV shows into Setup, then press Install on the TV once.</li>
<li><b>LG:</b> press YES on the TV; Setup opens Developer Mode and installs Sofa Tube and Sofa Tube Phone itself (a free LG developer account is needed).</li>
<li><b>Samsung:</b> Setup turns on Developer mode and installs Sofa Tube (computer version). On TVs from 2023 or newer it prepares the TV, then points you to the Apps2Samsung steps.</li>
</ul>
<div class="row"><a class="btn" href="/setup/">Get Sofa Tube Setup</a> <a class="btn ghost" href="/usb/">Android TV box with USB</a></div>
<p class="meta">iPhone only? Use a computer once; the phone remote works on the iPhone afterwards. Fire TV: use the Downloader app below.</p>
</div>
</section>
<h2 id="download">Or install it yourself: pick your TV</h2>
<p>Short links (type them in the TV's <b>Downloader</b> app or on your phone):</p>
{download_cards(lang)}
{test_note(lang)}'''


def home(lang):
    # Built for a first-time visitor (site/NOTES-newcomer.md): what it is and which TVs (hero), what it does
    # with real screens, the Whole TV difference, how to install (Setup first), the phone remote, the rest;
    # the version history is one line at the end and its own page (/news/).
    top, rest = FEATURES[:6], FEATURES[6:]
    feats = ''.join(
        f'<div class="card feature"><span class="ico" aria-hidden="true">{ico}</span><h3>{L(lang, te, ta)}</h3><p>{L(lang, de, da)}</p></div>'
        for ico, te, ta, de, da in top)
    more = ''.join(
        f'<li><span class="ico" aria-hidden="true">{ico}</span><span><b>{L(lang, te, ta)}:</b> {L(lang, de, da)}</span></li>'
        for ico, te, ta, de, da in rest)
    shots = ''.join(shot(lang, *x) for x in SHOTS_TV[:6])
    later = SHOTS_TV[6:]
    shots_more = ''.join(shot(lang, *x) for x in later)
    phones = ''.join(shot(lang, *x, phone=True) for x in SHOTS_PHONE)
    v = video_file(lang, '26')
    clip = f'''<figure class="hero-video"><video controls preload="none" playsinline poster="{v}.jpg" width="1280" height="720" aria-label="{html.escape(L(lang, VNAME['26'][1], VNAME['26'][2]))}"><source src="{v}.mp4" type="video/mp4"></video>
<figcaption>▶ {L(lang, VNAME['26'][1], VNAME['26'][2])} · <bdi>{video_len(lang, '26')}</bdi></figcaption></figure>'''
    if lang == 'ar':
        hero = f'''<section class="hero split">
<div>
<div class="title"><img class="icon" src="/icon.svg" alt="شعار صوفا تيوب" width="72" height="72"><h1>صوفا تيوب<span class="alt" lang="en" dir="ltr">Sofa Tube</span></h1></div>
<p class="pitch">تطبيق YouTube أفضل لتلفازك: دون إعلانات، وبسرعة تشغيل حقيقية، وقفل بالرمز السري، ووضع للأطفال، وأوقات الصلاة، وهاتفك جهاز تحكم في التلفاز كله.</p>
<p class="sub">يعمل على <bdi>Android TV</bdi> و<bdi>Google TV</bdi> و<bdi>Fire TV</bdi>، وتلفاز سامسونج من سنة 2018 أو أحدث، وتلفاز LG ‏(webOS). بالعربية والإنجليزية. مجاني ومفتوح المصدر، ودون حساب.</p>
<div class="cta"><a class="btn" href="#install">التثبيت على تلفازك</a><a class="btn ghost" href="#features">ماذا يقدّم؟</a></div>
<p class="sub"><span class="badge">نسخة تجريبية <bdi>{VER}</bdi></span></p>
</div>
{clip}
</section>'''
        return hero + f'''
<h2 id="features">ماذا يقدّم صوفا تيوب؟</h2>
<p>يفتح صفحة YouTube الخاصة بالتلفاز ويضيف إليها هذه الميزات.</p>
<div class="grid">{feats}</div>
<div class="shots" id="screens">{shots}</div>
<p class="meta">من فيديوهات الشرح لإصدار <bdi>0.9.4</bdi>، على محاكي تلفاز LG ‏(webOS)؛ وصفحة الهاتف واحدة على كل أجهزة التلفاز.</p>
''' + whole_tv(lang) + install_first(lang) + phone_app(lang) + f'''
<h2 id="more">ميزات أخرى</h2>
<ul class="feat-list">{more}</ul>
<h2 id="remote">أزرار جهاز التحكم</h2>
{remote_keys(lang)}
<h2 id="more-screens">لقطات أخرى</h2>
<div class="phones">{phones}</div>
<details class="more-shots"><summary>لقطات التلفاز ({len(later)})</summary><div class="shots">{shots_more}</div></details>
<div class="cta end"><a class="btn" href="#install">التثبيت على تلفازك</a><a class="btn ghost" href="/ar/videos/">كل الفيديوهات ({len(VIDEOS)})</a></div>
<p class="meta ver-line">هذا صوفا تيوب <bdi>{VER}</bdi>، نسخة تجريبية. <a href="/ar/news/">ما الجديد والإصدارات السابقة</a> · <a href="/ar/testers/#status">ما الذي جُرِّب</a></p>
'''
    hero = f'''<section class="hero split">
<div>
<div class="title"><img class="icon" src="/icon.svg" alt="Sofa Tube logo" width="72" height="72"><h1>Sofa Tube<span class="alt" lang="ar" dir="rtl">صوفا تيوب</span></h1></div>
<p class="pitch">A better YouTube app for your TV: no ads, real playback speed, PIN locks, kid mode, prayer times, and your phone as the remote for the whole TV.</p>
<p class="sub">Works on Android TV, Google TV and Fire TV, Samsung TVs from 2018 or newer, and LG webOS TVs. English and Arabic. Free and open source, no account.</p>
<div class="cta"><a class="btn" href="#install">Install on your TV</a><a class="btn ghost" href="#features">What it does</a></div>
<p class="sub"><span class="badge">Test version {VER}</span></p>
</div>
{clip}
</section>'''
    return hero + f'''
<h2 id="features">What it does</h2>
<p>It opens YouTube's own TV page and adds these features on top.</p>
<div class="grid">{feats}</div>
<div class="shots" id="screens">{shots}</div>
<p class="meta">From the 0.9.4 how-to videos, on LG's webOS TV Emulator; the phone page is the same on every TV.</p>
''' + whole_tv(lang) + install_first(lang) + phone_app(lang) + f'''
<h2 id="more">More features</h2>
<ul class="feat-list">{more}</ul>
<h2 id="remote">Remote buttons</h2>
{remote_keys(lang)}
<h2 id="more-screens">More screenshots</h2>
<div class="phones">{phones}</div>
<details class="more-shots"><summary>TV screenshots ({len(later)})</summary><div class="shots">{shots_more}</div></details>
<div class="cta end"><a class="btn" href="#install">Install on your TV</a><a class="btn ghost" href="/videos/">All {len(VIDEOS)} videos</a></div>
<p class="meta ver-line">This is Sofa Tube {VER}, a test version. <a href="/news/">What's new and earlier versions</a> · <a href="/testers/#status">What has been tested</a></p>
'''


# ------------------------------------------------------------------ install

def install(lang):
    if lang == 'ar':
        return f'''<h1>التثبيت</h1>
<p>اختر تلفازك. لكل تلفاز فيديو قصير، ثم الخطوات مكتوبة.</p>
<p class="note"><b>جديد:</b> <a href="/ar/setup/">إعداد صوفا تيوب</a> يثبّت صوفا تيوب من حاسوب أو هاتف أندرويد، دون كتابة شيء على التلفاز.</p>
<nav class="pick" aria-label="اختر تلفازك">
<a href="#android"><b>أندرويد تي في · جوجل تي في · فاير تي في</b><span>جهاز التحكم فقط · نحو 5 دقائق</span></a>
<a href="#lg"><b>تلفاز LG</b><span>هاتف أندرويد أو حاسوب · نحو 15 دقيقة</span></a>
<a href="#samsung"><b>تلفاز سامسونج</b><span>هاتف أندرويد أو حاسوب · نحو 10 دقائق</span></a>
</nav>
<p class="meta">لا تعرف نوع تلفازك؟ <a href="/ar/videos/#v27">أي فيديو يناسبني؟</a> (<bdi>{video_len(lang, '27')}</bdi>)</p>

<section class="tv-section" id="android">
<h2>أندرويد تي في · جوجل تي في · فاير تي في</h2>
<div class="note"><p><b>الحالة:</b> جُرِّب على محاكي Google TV، وجُرِّبت نسخ تجريبية منه على تلفاز أندرويد حقيقي واحد (TCL). لم يُجرَّب على Fire TV. إذا لم يُثبَّت أو لم يُفتح أصلًا فهذه نتيجة مهمة: <a href="/ar/testers/#report">أخبرنا بها</a>.</p></div>
{howto(lang, '28', 'شاهده مرة، ثم اتبع الخطوات المكتوبة أدناه؛ ويمكنك إيقافه مؤقتًا عند كل خطوة.')}
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
<li>لا يحتاج الإعداد من الهاتف إلى تطبيق إضافي هنا: الإعدادات ← جهاز التحكم من الهاتف (أول صفحة).</li>
<li>للتحديث: ثبّت ملف apk الجديد فوق هذا بالطريقة نفسها، وتبقى الإعدادات.</li>
</ul>
</section>

<section class="tv-section" id="lg">
<h2>تلفاز LG ‏(webOS)</h2>
<div class="note"><p><b>أولًا:</b> احذف تطبيق YouTube الرسمي من التلفاز؛ فصوفا تيوب يستخدم مُعرّف التطبيق نفسه (<code dir="ltr">youtube.leanback.v4</code>)، ولا يمكن تثبيتهما معًا. <b>منذ <bdi>0.9.4</bdi>:</b> يثبّت <bdi>Sofa Tube Phone</bdi> صوفا تيوب لك. جُرِّب على محاكي LG، ولم يُجرَّب بعد على تلفاز LG حقيقي: <a href="/ar/testers/#report">أخبرنا كيف جرى</a>.</p></div>
{howto(lang, '29', 'شاهده مرة، ثم اتبع الخطوات المكتوبة أدناه؛ ويمكنك إيقافه مؤقتًا عند كل خطوة.', 'يُظهر الفيديو الطريقة السابقة: تثبيت ملفين. أما الآن فثبّت <bdi>Sofa Tube Phone</bdi> وحده، وهو يثبّت صوفا تيوب لك (الخطوة 8).')}
<h3>ما تحتاج إليه</h3>
<p>تلفاز LG بنظام webOS، وهاتف أندرويد على شبكة الواي فاي نفسها (أو حاسوب). حساب مطوّر مجاني من LG وتطبيق Developer Mode من LG. لا حاجة إلى كسر الحماية (root) ولا إلى Homebrew Channel.</p>
<h3>الأسهل: بهاتف أندرويد</h3>
<ol class="steps">
<li>على الهاتف، أنشئ حساب مطوّر من LG في <a href="https://webostv.developer.lge.com/">webostv.developer.lge.com</a>.</li>
<li>على التلفاز، ثبّت تطبيق <b>Developer Mode</b> من متجر LG Content Store، وافتحه وسجّل الدخول بذلك الحساب.</li>
<li>فعّل <b>Dev Mode Status</b> (يُعاد تشغيل التلفاز)، ثم افتح التطبيق مجددًا وفعّل <b>Key Server</b>. دوّن <b>عنوان IP</b> و<b>عبارة المرور</b> (Passphrase).</li>
<li>على الهاتف، ثبّت <b>webOS Dev Manager</b>: <a href="https://github.com/webosbrew/dev-manager-desktop/releases/latest">github.com/webosbrew/dev-manager-desktop</a> ← Releases ← الملف المنتهي بـ<code dir="ltr">universal.apk</code>. واسمح لمتصفحك بتثبيت التطبيقات غير المعروفة عند السؤال.</li>
<li>في webOS Dev Manager، أضف التلفاز بعنوان IP وعبارة المرور.</li>
<li>في متصفح الهاتف، افتح <a href="/lg-phone/"><bdi>sofatube.github.io/lg-phone</bdi></a>: يُنزَّل ملف تطبيق <bdi>Sofa Tube Phone</bdi>.</li>
<li>في webOS Dev Manager، ثبّت هذا الملف من مجلد التنزيلات في الهاتف.</li>
<li>على التلفاز، افتح <b><bdi>Sofa Tube Phone</bdi></b> واضغط <b>OK</b> عند «ثبّت صوفا تيوب»: ينزّل أحدث إصدار ويتحقق منه ويثبّته ثم يفتحه (يحتاج التلفاز إلى الإنترنت).</li>
<li>يسألك الإعداد الأول في صوفا تيوب عن اللغة والرمز السري ووضع الأطفال. الزر الأخضر يفتح الإعدادات.</li>
</ol>
<h3>البديل: بحاسوب</h3>
<p>الخطوات نفسها، مع <a href="https://github.com/webosbrew/dev-manager-desktop/releases/latest">webOS Dev Manager</a> لويندوز أو ماك أو لينكس (من الصفحة نفسها) وملف <bdi>Sofa Tube Phone</bdi> من الرابط أعلاه. وإن أردت تثبيت صوفا تيوب بنفسك: <a href="/lg/"><bdi>sofatube.github.io/lg</bdi></a>.</p>
<h3>معلومات مفيدة</h3>
<ul>
<li>لجلسة وضع المطوّر مدة <b>تنتهي</b>، وبعدها لا تُفتح التطبيقات التي ثبّتّها. افتح تطبيق Developer Mode من حين لآخر ومدّد الجلسة.</li>
<li>لماذا تطبيقان؟ يحتاج صوفا تيوب إلى هوية تطبيق YouTube لدى LG، وهي تمنعه من تشغيل الخدمات. لذلك يشغّل <bdi>Sofa Tube Phone</bdi> الاتصال بالهاتف والتحكم في التلفاز كله والتحديثات. افتحه مرة واحدة بعد تشغيل التلفاز (بعد إعادة التشغيل أو الإطفاء الكامل) إن احتجت إلى الهاتف أو إطفاء الشاشة أو التحديث أو <b>التحكم من خارج المنزل</b> أو وقت النوم و«التطبيقات المسموح بها فقط»: تنتظر هذه حتى تفتحه، ولا يكفي فتح صوفا تيوب وحده. واستخدم أيضًا قفل التطبيقات في التلفاز نفسه (<bdi>Settings</bdi> ← <bdi>Safety</bdi>).</li>
<li id="lg-update"><b>للتحديث:</b> الإعدادات ← حول التطبيق والنسخ الاحتياطي ← البحث عن تحديثات؛ يثبّت <bdi>Sofa Tube Phone</bdi> صوفا تيوب الجديد أولًا ثم إصداره الجديد هو، وتبقى إعداداتك كما هي. <b>في <bdi>0.9.5</bdi> حدّث <bdi>Sofa Tube Phone</bdi> أيضًا:</b> تغيّر مساعده (التحقق من التنزيلات، وبقاء التحكم في التلفاز كله مفعّلًا، وقواعد العائلة ووقت الأطفال، وهاتف الضيف وهاتف المساعد، وبطاقات التلفاز كله الجديدة). وإن لم يتحدّث، فثبّت الملف الجديد من <a href="/lg-phone/"><bdi>sofatube.github.io/lg-phone</bdi></a> بـ<bdi>webOS Dev Manager</bdi> (الخطوتان 6 و7).</li>
</ul>
</section>

<section class="tv-section" id="samsung">
<h2>تلفاز سامسونج ‏(Tizen)</h2>
<div class="note"><p><b>الحالة:</b> صوفا تيوب تطبيق مستقل على التلفاز (أيقونة في «التطبيقات»). ثُبّت وجُرِّب بـ<bdi>Apps2Samsung</bdi> من هاتف أندرويد على ثلاثة أجهزة تلفاز سامسونج حقيقية (من 2025 و2022 و2020) في مختبر سامسونج عن بُعد. <a href="/ar/testers/#report">أخبرنا كيف جرى على تلفازك</a>.</p></div>
{howto(lang, '30', 'شاهده مرة، ثم اتبع الخطوات المكتوبة أدناه؛ ويمكنك إيقافه مؤقتًا عند كل خطوة.')}
<h3>ما تحتاج إليه</h3>
<ul>
<li>تلفاز سامسونج من سنة 2018 أو أحدث (Tizen 4.0 أو أحدث)، و<b>هاتف أندرويد</b> على شبكة الواي فاي نفسها. ليس لديك هاتف أندرويد (آيفون)؟ استخدم حاسوبًا بويندوز أو ماك (أدناه).</li>
<li>حساب سامسونج (مجاني): يطلب <bdi>Apps2Samsung</bdi> على الهاتف تسجيل الدخول في أول تثبيت، مهما كان طراز التلفاز (وعلى الحاسوب لأجهزة Tizen 7 فما فوق فقط، وأغلبها من 2023). يصنع منه شهادة توقيع خاصة بك ويحتفظ بها، فتسجّل الدخول مرة واحدة.</li>
</ul>
<h3>بهاتف أندرويد (دون حاسوب): 6 خطوات</h3>
<ol class="steps">
<li><b>التلفاز:</b> افتح «<b>التطبيقات</b>» (<bdi>Apps</bdi>) واكتب <bdi>1 2 3 4 5</bdi> (بأزرار الأرقام، أو بزر <bdi>123</bdi> / زر الألوان لإظهار الأرقام على الشاشة). اجعل <bdi>Developer mode</bdi> على <bdi>On</bdi>، واكتب <b>عنوان IP للهاتف</b> في خانة <bdi>Host PC IP</bdi>، واضغط <bdi>OK</bdi>، ثم أعد تشغيل التلفاز: اضغط مطولًا على زر الطاقة حتى ينطفئ ثم يعمل من جديد. (عنوان IP للهاتف: الإعدادات ← الواي فاي ← شبكتك ← عنوان IP.)</li>
<li><b>الهاتف:</b> ثبّت <b><bdi>Apps2Samsung</bdi></b>: <a href="https://github.com/Apps2Samsung/Apps2Samsung/releases/latest"><bdi>github.com/Apps2Samsung/Apps2Samsung/releases</bdi></a> ← الملف المنتهي بـ<code dir="ltr">-android.apk</code>. يحذّر كروم «<bdi>File might be harmful</bdi>»: اضغط <bdi>Download anyway</bdi> ثم <bdi>Open</bdi>. إن قال الهاتف إنه لا يسمح بتثبيت تطبيقات غير معروفة من هذا المصدر: <bdi>Settings</bdi> ← فعّل <bdi>Allow from this source</bdi> ← رجوع ← <bdi>Install</bdi>. إن عرض <bdi>Apps2Samsung</bdi> عند فتحه تحديثًا (<bdi>Update Available</bdi>) فاختر ما شئت (<bdi>Later</bdi> يكفي). لعرضه بالعربية: ⚙ ← <bdi>Language</bdi> ← العربية.</li>
<li><b>الهاتف:</b> افتح <a href="/samsung/"><bdi>sofatube.github.io/samsung</bdi></a>: يُنزَّل ملف صوفا تيوب (<code dir="ltr">SofaTube-…-Samsung.wgt</code>).</li>
<li><b><bdi>Apps2Samsung</bdi>:</b> اضغط خانة «التطبيق» (<bdi>App</bdi>) وانزل إلى <b>آخر</b> القائمة: <bdi>📁 Custom WGT / TPK…</bdi>، ثم اختر ملف صوفا تيوب (<code dir="ltr">SofaTube-…-Samsung.wgt</code>)؛ يظهر «حزمة مخصصة جاهزة». تحت <bdi>Select TV</bdi> يظهر عنوان تلفازك (اضغط ⟳ إن لم يظهر). اضغط <bdi>Download &amp; Install</bdi>. في المرة الأولى تُفتح صفحة <bdi>Samsung Account</bdi>: سجّل الدخول (أو <bdi>Sign in with Google</bdi>). قد يستغرق التثبيت الأول بضع دقائق. ينتهي بصفحة «<bdi>… has been successfully installed!</bdi>» (اضغط <bdi>Close</bdi>) ثم «تم تثبيت … افتح قائمة تطبيقات التلفزيون لتشغيلها».</li>
<li><b>التلفاز:</b> «التطبيقات» ← <bdi>1 2 3 4 5</bdi> مرة أخرى، واجعل <bdi>Host PC IP</bdi> هو <code dir="ltr">127.0.0.1</code>، ثم <bdi>OK</bdi>، ثم أعد تشغيل التلفاز (اضغط مطولًا على زر الطاقة). قوائم التلفاز العربية تعرض العنوان معكوسًا: اكتب <code dir="ltr">1.0.0.127</code>.</li>
<li><b>التلفاز:</b> افتح <b>صوفا تيوب</b> من «التطبيقات». إن ظهرت شاشة «خطوة أخيرة على التلفاز» فاتبع ما فيها (تعرض قيمة <bdi>Host PC IP</bdi> التي وجدتها).</li>
</ol>
<div class="faq">
<details><summary>ليس لديك هاتف أندرويد؟ بحاسوب ويندوز أو ماك (6 خطوات)</summary>
<ol class="steps">
<li><b>التلفاز:</b> الخطوة 1 أعلاه، مع <b>عنوان IP للحاسوب</b> في <bdi>Host PC IP</bdi> (ويندوز: الإعدادات ← الشبكة والإنترنت ← اتصالك ← عنوان IPv4؛ ماك: إعدادات النظام ← الواي فاي ← التفاصيل ← عنوان IP).</li>
<li><b>الحاسوب:</b> ثبّت <b><bdi>Apps2Samsung</bdi></b> من <a href="https://github.com/Apps2Samsung/Apps2Samsung/releases/latest">صفحة إصداراته</a>: ويندوز <code dir="ltr">-win-x64.msi</code>، ماك <code dir="ltr">-macos-arm64.dmg</code> (معالج Apple) أو <code dir="ltr">-macos-x64.dmg</code> (معالج Intel).</li>
<li><b>الحاسوب:</b> نزّل صوفا تيوب من <a href="/samsung/"><bdi>sofatube.github.io/samsung</bdi></a>.</li>
<li><b><bdi>Apps2Samsung</bdi>:</b> <bdi>Select TV</bdi> (أو اكتب عنوان IP للتلفاز)، ثم <bdi>Custom WGT / TPK</bdi>، واختر ملف صوفا تيوب، ثم <bdi>Download &amp; Install</bdi>. سجّل الدخول إلى سامسونج إن طُلب منك (مرة واحدة).</li>
<li><b>التلفاز:</b> <bdi>Host PC IP</bdi> = <code dir="ltr">127.0.0.1</code> (القوائم العربية: <code dir="ltr">1.0.0.127</code>)، ثم أعد تشغيل التلفاز.</li>
<li><b>التلفاز:</b> افتح <b>صوفا تيوب</b> من «التطبيقات».</li>
</ol>
<p>يعمل أيضًا: <a href="https://github.com/reisxd/TizenBrewInstaller/releases/latest"><bdi>TizenBrew Installer</bdi></a> على الحاسوب ← افتح <code dir="ltr">http://localhost:8091/ui/dist/index.html</code> ← عنوان التلفاز ← <bdi>Install from GitHub</bdi> ← <code dir="ltr">sofatube/sofatube.github.io</code>. بالإنجليزية فقط؛ استخدم «<bdi>Install from GitHub</bdi>» لا «<bdi>Select file to install</bdi>» (خيار الملف ينسى شهادة سامسونج بعد تثبيت واحد).</p>
</details>
<details><summary>تستخدم TizenBrew؟ وحدة TizenBrew</summary>
{howto(lang, '31', 'إضافة وحدة <code dir="ltr">sofatube</code> في TizenBrew.')}
<p>في <b>TizenBrew</b> اضغط <b>الأخضر</b> وأضف وحدة <bdi>NPM</bdi> باسم <code dir="ltr">sofatube</code>. تتحدّث تلقائيًا؛ افتح صوفا تيوب من TizenBrew (ويمكن أن يفتحه TizenBrew مباشرة: <bdi>Settings</bdi> ← <bdi>Autolaunch</bdi>). أما تثبيت TizenBrew نفسه فيحتاج إلى حاسوب و<a href="https://github.com/reisxd/TizenBrewInstaller/releases/latest"><bdi>TizenBrew Installer</bdi></a>.</p>
</details>
<details><summary>إذا حدثت مشكلة</summary>
{howto(lang, '32', 'أكثر الرسائل شيوعًا، وما تفعله عند كل منها.')}
<ul>
<li><b>«تم اكتشاف التلفزيون، ولكن وضع المطور متوقف»</b> (<bdi>TV detected, but Developer Mode is off</bdi>): أعد الخطوة 1 وأعد تشغيل التلفاز.</li>
<li><b>«… لا يتطابق مع هذا الكمبيوتر»</b> (<bdi>Developer Mode IP doesn't match</bdi>): يجب أن تكون <bdi>Host PC IP</bdi> عنوان هذا الهاتف أو الحاسوب؛ اكتبه مرة أخرى وأعد تشغيل التلفاز.</li>
<li><b>«<bdi>IP is in reversed order on the TV</bdi>»</b> (القوائم العربية): اكتب العنوان معكوسًا، مثلًا <code dir="ltr">192.168.1.5</code> ← <code dir="ltr">5.1.168.192</code>.</li>
<li><b>«… منفذ التصحيح الخاص به لا يستجيب بعد»</b> (<bdi>debug port isn't responding … power-cycle</bdi>): افصل التلفاز عن الكهرباء 30 ثانية، ثم أعد وصله، ثم اضغط ⟳ (<bdi>Rescan</bdi>).</li>
<li><b>«<bdi>Could not read a valid TV DUID</bdi>»</b>: اضغط <bdi>Download &amp; Install</bdi> مرة أخرى؛ وإن تكرّر فأعد تشغيل التلفاز.</li>
<li><b>«<bdi>Install failed: A task was canceled</bdi>»</b>: انقطع الاتصال بالتلفاز أثناء التثبيت. أعد تشغيل التلفاز (اضغط مطولًا على زر الطاقة)، ثم ⟳، واختر الملف مرة أخرى، ثم <bdi>Download &amp; Install</bdi> (لا يُطلب تسجيل الدخول مرة ثانية).</li>
<li><b>«تم إلغاء تسجيل الدخول»</b> (<bdi>Sign-in cancelled</bdi>): أُغلقت صفحة سامسونج قبل تسجيل الدخول؛ اضغط <bdi>Download &amp; Install</bdi> مرة أخرى وسجّل الدخول.</li>
<li><b>«… مع شهادة توقيع مختلفة»</b> (<bdi>already installed with a different signing certificate</bdi>) أو <b>«مثبَّت بالفعل، وتلفازك لا يسمح باستبداله»</b>: على التلفاز نسخة أقدم من صوفا تيوب بشهادة أخرى. على التلفاز: «التطبيقات» ← صوفا تيوب ← اضغط مطولًا على <bdi>OK</bdi> ← حذف، ثم ثبّته من جديد (تضيع إعداداته، فاحفظ رمز الإعدادات أولًا).</li>
<li><b>لا يظهر التلفاز</b> («لم يتم العثور على التلفزيون»): يجب أن يكون التلفاز والهاتف أو الحاسوب على الواي فاي نفسه؛ أوقف أي VPN؛ أو اضغط خانة <bdi>Select TV</bdi> واكتب عنوان التلفاز (التلفاز: <bdi>Settings</bdi> ← <bdi>General</bdi> ← <bdi>Network</bdi> ← <bdi>Network Status</bdi> ← <bdi>IP Settings</bdi>).</li>
<li><b>يفتح صوفا تيوب على «خطوة أخيرة على التلفاز»</b>: لم تُنفَّذ الخطوة 5 (يجب أن تكون <bdi>Host PC IP</bdi> هي <code dir="ltr">127.0.0.1</code>) أو لم يُعَد تشغيل التلفاز.</li>
</ul>
</details>
</div>
<h3>معلومات مفيدة</h3>
<ul>
<li><b>البحث الصوتي:</b> لا ميكروفون في YouTube على سامسونج هنا. ابحث بصوتك من هاتفك: صفحة الهاتف ← <b>البحث</b> ← 🎤.</li>
<li><b>التحديثات:</b> صوفا تيوب ← الإعدادات ← «حول التطبيق والنسخ الاحتياطي» ← <b>البحث عن تحديثات</b>. يُحدَّث على التلفاز نفسه حين يمكن ذلك، وإلا يعرض الخطوات (ثبّت الملف الجديد بالطريقة نفسها، وتبقى الإعدادات).</li>
<li>يجب أن يبقى <bdi>Developer mode</bdi> على <bdi>On</bdi> و<bdi>Host PC IP</bdi> على <code dir="ltr">127.0.0.1</code>: يحتاج إليه صوفا تيوب في كل مرة يفتح فيها YouTube.</li>
</ul>
</section>'''
    return f'''<h1>Install</h1>
<p>Pick your TV. Each one has a short video, then the written steps.</p>
<p class="note"><b>New:</b> <a href="/setup/">Sofa Tube Setup</a> installs Sofa Tube from a computer or an Android phone, with nothing typed on the TV.</p>
<nav class="pick" aria-label="Pick your TV">
<a href="#android"><b>Android TV · Google TV · Fire TV</b><span>Remote only · about 5 minutes</span></a>
<a href="#lg"><b>LG TV</b><span>Android phone or computer · about 15 minutes</span></a>
<a href="#samsung"><b>Samsung TV</b><span>Android phone or computer · about 10 minutes</span></a>
</nav>
<p class="meta">Not sure which TV you have? <a href="/videos/#v27">Which video is mine?</a> ({video_len(lang, '27')})</p>

<section class="tv-section" id="android">
<h2>Android TV · Google TV · Fire TV</h2>
<div class="note"><p><b>Status:</b> tried on a Google TV emulator, and test builds of it on one real Android TV (TCL). Fire TV is untested. If it does not install or open at all, that is an important result: <a href="/testers/#report">tell us</a>.</p></div>
{howto(lang, '28', 'Watch it once, then follow the written steps below; pause the video at each step if you like.')}
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
<li>Phone settings need no extra app here: Settings → Phone remote (the first page).</li>
<li>Updates: install the new .apk over this one the same way; settings stay.</li>
</ul>
</section>

<section class="tv-section" id="lg">
<h2>LG TV (webOS)</h2>
<div class="note"><p><b>First:</b> uninstall the official YouTube app from the TV. Sofa Tube uses the same app ID (<code>youtube.leanback.v4</code>), so both cannot be installed together. <b>Since 0.9.4:</b> Sofa Tube Phone installs Sofa Tube for you. Tried on LG's emulator, not yet on a real LG TV: <a href="/testers/#report">tell us how it went</a>.</p></div>
{howto(lang, '29', 'Watch it once, then follow the written steps below; pause the video at each step if you like.', 'The video shows the older way, installing two files. Now you install only Sofa Tube Phone, and it installs Sofa Tube for you (step 8).')}
<h3>You need</h3>
<p>An LG webOS TV and an Android phone on the same Wi-Fi (or a computer). A free LG Developer account and LG's Developer Mode app. No rooting, no Homebrew Channel.</p>
<h3>Easiest: with an Android phone</h3>
<ol class="steps">
<li>On the phone, create an LG Developer account at <a href="https://webostv.developer.lge.com/">webostv.developer.lge.com</a>.</li>
<li>On the TV, install <b>Developer Mode</b> from the LG Content Store, open it and sign in with that account.</li>
<li>Turn on <b>Dev Mode Status</b> (the TV restarts), open the app again and turn on <b>Key Server</b>. Write down the <b>IP address</b> and the <b>passphrase</b>.</li>
<li>On the phone, install <b>webOS Dev Manager</b>: <a href="https://github.com/webosbrew/dev-manager-desktop/releases/latest">github.com/webosbrew/dev-manager-desktop</a> → Releases → the file ending <code>universal.apk</code>. Allow your browser to install unknown apps when asked.</li>
<li>In webOS Dev Manager, add the TV with that IP and passphrase.</li>
<li>In the phone's browser, open <a href="/lg-phone/">sofatube.github.io/lg-phone</a>: the Sofa Tube Phone file downloads.</li>
<li>In webOS Dev Manager, install that file from the phone's Downloads.</li>
<li>On the TV, open <b>Sofa Tube Phone</b> and press <b>OK</b> at "Install Sofa Tube": it downloads the latest version, checks it, installs it and opens it (the TV needs internet).</li>
<li>Sofa Tube's first-time setup asks for language, PIN and kid mode. Green opens the settings.</li>
</ol>
<h3>Fallback: with a computer</h3>
<p>Same steps, with <a href="https://github.com/webosbrew/dev-manager-desktop/releases/latest">webOS Dev Manager</a> for Windows, Mac or Linux (same page) and the Sofa Tube Phone file from the link above. To install Sofa Tube yourself instead: <a href="/lg/">sofatube.github.io/lg</a>.</p>
<h3>Good to know</h3>
<ul>
<li>Developer Mode sessions <b>expire</b>, and then the apps you installed stop opening. Open the Developer Mode app now and then and extend the session.</li>
<li>Why two apps? Sofa Tube needs LG's YouTube app identity, which keeps it from running services, so Sofa Tube Phone runs the phone link, the whole-TV control and the updates. Open it once after the TV starts (after a restart or a full power-off) when you need the phone, Screen off, an update, <b>Control from away</b> or the family plan's bedtime and allowed apps: they wait until then, and opening Sofa Tube alone is not enough. Use the TV's own app lock as well (Settings → Safety).</li>
<li id="lg-update"><b>To update:</b> Settings → Backup and about → Check for updates; Sofa Tube Phone installs the new Sofa Tube first and then its own new version, and your settings stay. <b>For 0.9.5, update Sofa Tube Phone too:</b> its helper changed (checked downloads, whole-TV control that stays on, the family plan and kids time, the guest and helper phones, the new Whole TV cards). If it did not update, install the new file from <a href="/lg-phone/">sofatube.github.io/lg-phone</a> with webOS Dev Manager (steps 6 and 7).</li>
</ul>
</section>

<section class="tv-section" id="samsung">
<h2>Samsung TV (Tizen)</h2>
<div class="note"><p><b>Status:</b> Sofa Tube is its own app on the TV (an icon in Apps). Installed and tested with Apps2Samsung from an Android phone on three real Samsung TVs (2025, 2022 and 2020) in Samsung's Remote Test Lab. <a href="/testers/#report">Tell us how it went on yours</a>.</p></div>
{howto(lang, '30', 'Watch it once, then follow the written steps below; pause the video at each step if you like.')}
<h3>You need</h3>
<ul>
<li>A Samsung TV from 2018 or newer (Tizen 4.0 or newer), and an <b>Android phone</b> on the same Wi-Fi. No Android phone (iPhone)? Use a Windows or Mac computer instead (below).</li>
<li>A free Samsung account: Apps2Samsung on a phone asks you to sign in at the first install, for any TV (on a computer only for TVs with Tizen 7 or newer, most TVs from 2023 on). It makes your own signing certificate from it and keeps it, so you sign in once.</li>
</ul>
<h3>With an Android phone (no computer): 6 steps</h3>
<ol class="steps">
<li><b>TV:</b> open <b>Apps</b>, type <b>1 2 3 4 5</b> (number keys, or the remote's <b>123</b> / colour button for on-screen numbers). Set <b>Developer mode</b> to <b>On</b>, type <b>the phone's IP address</b> in <b>Host PC IP</b>, press <b>OK</b>, then restart the TV: hold the remote's <b>Power</b> button until it turns off and on again. (The phone's IP: Settings → Wi-Fi → your network → IP address.)</li>
<li><b>Phone:</b> install <b>Apps2Samsung</b>: <a href="https://github.com/Apps2Samsung/Apps2Samsung/releases/latest">github.com/Apps2Samsung/Apps2Samsung/releases</a> → the file ending <code>-android.apk</code>. Chrome warns "File might be harmful": tap <b>Download anyway</b>, then <b>Open</b>. If the phone says it isn't allowed to install unknown apps from this source: <b>Settings</b> → turn on <b>Allow from this source</b> → back → <b>Install</b>. If Apps2Samsung shows "Update Available" when it opens, either answer is fine (<b>Later</b> is enough).</li>
<li><b>Phone:</b> open <a href="/samsung/">sofatube.github.io/samsung</a>: the Sofa Tube file (<code>SofaTube-…-Samsung.wgt</code>) downloads.</li>
<li><b>Apps2Samsung:</b> tap the <b>App</b> box and scroll to the <b>end</b> of the list: <b>📁 Custom WGT / TPK…</b>, then pick the Sofa Tube file (<code>SofaTube-…-Samsung.wgt</code>); it says "Custom package ready". <b>Select TV</b> shows your TV's IP (tap ⟳ if it is missing). Tap <b>Download &amp; Install</b>. The first time a <b>Samsung Account</b> page opens: sign in (or <b>Sign in with Google</b>). The first install can take a few minutes. Done when it shows "… has been successfully installed!" (tap <b>Close</b>) and "Installed … Open the TV's Apps list to launch it."</li>
<li><b>TV:</b> Apps → <b>1 2 3 4 5</b> again, <b>Host PC IP</b> = <code>127.0.0.1</code>, OK, restart the TV (hold Power). Arabic TV menus show the address reversed: type <code>1.0.0.127</code>.</li>
<li><b>TV:</b> open <b>Sofa Tube</b> from Apps. If it shows "One last step on the TV", do what it says (it shows the Host PC IP it found).</li>
</ol>
<div class="faq">
<details><summary>No Android phone? With a Windows or Mac computer (6 steps)</summary>
<ol class="steps">
<li><b>TV:</b> step 1 above, with <b>the computer's IP address</b> in <b>Host PC IP</b> (Windows: Settings → Network &amp; internet → your connection → IPv4 address; Mac: System Settings → Wi-Fi → Details → IP address).</li>
<li><b>Computer:</b> install <b>Apps2Samsung</b> from <a href="https://github.com/Apps2Samsung/Apps2Samsung/releases/latest">its releases</a>: Windows <code>-win-x64.msi</code>, Mac <code>-macos-arm64.dmg</code> (Apple chip) or <code>-macos-x64.dmg</code> (Intel).</li>
<li><b>Computer:</b> download Sofa Tube from <a href="/samsung/">sofatube.github.io/samsung</a>.</li>
<li><b>Apps2Samsung:</b> <b>Select TV</b> (or type its IP), choose <b>Custom WGT / TPK</b>, pick the Sofa Tube file, <b>Download &amp; Install</b>. Sign in to Samsung if asked (once).</li>
<li><b>TV:</b> Host PC IP = <code>127.0.0.1</code> (Arabic menus: <code>1.0.0.127</code>), restart the TV.</li>
<li><b>TV:</b> open <b>Sofa Tube</b> from Apps.</li>
</ol>
<p>Also works: <a href="https://github.com/reisxd/TizenBrewInstaller/releases/latest">TizenBrew Installer</a> on the computer → open <code>http://localhost:8091/ui/dist/index.html</code> → TV IP → <b>Install from GitHub</b> → <code>sofatube/sofatube.github.io</code>. English only; use "Install from GitHub" rather than "Select file to install" (the file option forgets your Samsung certificate after one install).</p>
</details>
<details><summary>Already use TizenBrew? The TizenBrew module</summary>
{howto(lang, '31', 'Adding the <code>sofatube</code> module in TizenBrew.')}
<p>In <b>TizenBrew</b>, press <b>Green</b>, add an <b>NPM</b> module: <code>sofatube</code>. It updates itself; open Sofa Tube from TizenBrew (TizenBrew → Settings → Autolaunch can open it straight away). Installing TizenBrew itself needs a computer and <a href="https://github.com/reisxd/TizenBrewInstaller/releases/latest">TizenBrew Installer</a>.</p>
</details>
<details><summary>If something goes wrong</summary>
{howto(lang, '32', 'The most common messages, and what to do for each.')}
<ul>
<li><b>"TV detected, but Developer Mode is off"</b>: do step 1 again and restart the TV.</li>
<li><b>"Developer Mode IP doesn't match"</b>: Host PC IP must be the IP of this phone or computer; type it again, restart the TV.</li>
<li><b>"IP is in reversed order on the TV"</b> (Arabic menus): type the address reversed, e.g. <code>192.168.1.5</code> → <code>5.1.168.192</code>.</li>
<li><b>"debug port isn't responding … power-cycle"</b>: unplug the TV for 30 seconds, plug it in, tap ⟳ (Rescan).</li>
<li><b>"Could not read a valid TV DUID"</b>: tap <b>Download &amp; Install</b> again; if it repeats, restart the TV.</li>
<li><b>"Install failed: A task was canceled."</b>: the TV dropped the connection during the install. Restart the TV (hold Power), tap ⟳, pick the file again, <b>Download &amp; Install</b> (no second sign-in).</li>
<li><b>"Sign-in cancelled."</b>: the Samsung page was closed before signing in; tap <b>Download &amp; Install</b> again and sign in.</li>
<li><b>"already installed with a different signing certificate"</b> or <b>"already installed and your TV doesn't allow replacing"</b>: an older Sofa Tube with another certificate is on the TV. On the TV, Apps → Sofa Tube → hold OK → Delete, then install again (its settings are lost; save a settings code first).</li>
<li><b>TV not found</b> ("No TVs found"): same Wi-Fi for TV and phone/computer; turn a VPN off; or tap the <b>Select TV</b> box and type the TV's IP (TV: Settings → General → Network → Network Status → IP Settings).</li>
<li><b>Sofa Tube opens "One last step on the TV"</b>: step 5 is missing (Host PC IP must be <code>127.0.0.1</code>) or the TV was not restarted.</li>
</ul>
</details>
</div>
<h3>Good to know</h3>
<ul>
<li><b>Voice search:</b> YouTube on Samsung has no microphone here. Search by voice from your phone: phone page → <b>Search</b> → 🎤.</li>
<li><b>Updates:</b> Sofa Tube → Settings → Backup and about → <b>Check for updates</b>. When it can, it updates on the TV itself; otherwise it shows the steps (install the new file the same way; settings stay).</li>
<li>Developer mode must stay <b>On</b> with Host PC IP <code>127.0.0.1</code>: Sofa Tube needs it every time it opens YouTube.</li>
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
    ('15', 'Connect-phone', 'Connect your phone', 'توصيل هاتفك',
     'Your phone becomes the remote', 'هاتفك يصبح جهاز التحكم'),
    ('16', 'Phone-remote', 'The phone remote', 'جهاز التحكم من الهاتف',
     'Arrows or touchpad, volume, More controls', 'الأسهم أو لوحة اللمس، والصوت، والمزيد من أزرار التحكم'),
    ('17', 'My-buttons', 'My buttons', 'أزراري',
     'Your own buttons, and learned remote buttons', 'أزرارك الخاصة، والأزرار المخصّصة'),
    ('18', 'Whole-TV-setup', 'The whole TV: setting it up', 'التحكم في التلفاز كله: الإعداد',
     'LG · Samsung · Android TV', 'LG · Samsung · Android TV'),
    ('19', 'Whole-TV-use', 'The whole TV: using it', 'التحكم في التلفاز كله: الاستخدام',
     'Keys, apps, typing, air mouse', 'الأزرار والتطبيقات والكتابة والماوس الهوائي'),
    ('20', 'Parent-tools', 'Parent tools on the phone', 'أدوات ولي الأمر على الهاتف',
     'Settings › Family › Parental controls', 'الإعدادات › العائلة › الرقابة الأبوية'),
    ('21', 'Settings-code-backup', 'Settings code and backup', 'رمز الإعدادات والنسخ الاحتياطي',
     'A short code, a QR code, a backup file', 'رمز قصير، ورمز QR، وملف نسخة احتياطية'),
    ('22', 'Updates', 'Updates', 'التحديثات',
     'Nothing goes online unless you ask', 'لا اتصال بالإنترنت إلا إذا طلبت'),
    ('23', 'Player-look-DeArrow', 'Player look, dislikes and DeArrow', 'مظهر الفيديو وعدم الإعجاب و DeArrow',
     '', ''),
    ('24', 'Feed-filters-sidebar', 'Feed filters and sidebar', 'تصفية المحتوى والقائمة الجانبية',
     '', ''),
    ('25', 'Help-diagnostics', 'Help and diagnostics', 'المساعدة والتشخيص',
     '', ''),
    ('26', 'In-one-minute', 'Sofa Tube in one minute', 'صوفا تيوب في دقيقة',
     'YouTube on your TV, your way', 'يوتيوب على تلفازك، كما تريد'),
    ('27', 'Install-which-video', 'Install · Which video is mine?', 'التثبيت · أي فيديو يناسبني؟',
     '', ''),
    ('28', 'Install-Android-TV', 'Install · Android TV, Google TV, Fire TV', 'التثبيت · Android TV و Google TV و Fire TV',
     'Remote only · about 5 minutes', 'جهاز التحكم فقط · نحو 5 دقائق'),
    ('29', 'Install-LG', 'Install · LG (webOS)', 'التثبيت · إل جي (webOS)',
     'Android phone or computer · about 15 minutes', 'هاتف Android أو حاسوب · نحو 15 دقيقة'),
    ('30', 'Install-Samsung', 'Install · Samsung', 'التثبيت · سامسونج',
     'Android phone, or a Windows / Mac computer · about 10 minutes', 'هاتف Android، أو حاسوب Windows / Mac · نحو 10 دقائق'),
    ('31', 'Install-Samsung-TizenBrew', 'Install · Samsung with TizenBrew', 'التثبيت · سامسونج مع TizenBrew',
     'Another way', 'طريق آخر'),
    ('32', 'Install-troubleshooting', 'Install · If something goes wrong', 'التثبيت · إن لم ينجح شيء',
     '', ''),
    ('33', 'Privacy', 'Privacy: what Sofa Tube sends', 'الخصوصية: ماذا يرسل صوفا تيوب',
     'What Sofa Tube sends', 'ماذا يرسل صوفا تيوب'),
    ('34', 'Remove', 'Remove Sofa Tube', 'حذف صوفا تيوب',
     '', ''),
    # 0.9.5: text on the screen, no voice
    ('35', 'Control-from-away', 'Control from away', 'التحكم من خارج المنزل',
     'Give more time, lock the TV or send a message from a parent’s phone, outside the home.',
     'امنح وقتًا إضافيًا أو اقفل التلفاز أو أرسل رسالة من هاتف أحد الوالدين خارج المنزل.'),
    ('36', 'Kids-TV-time', 'Kids’ TV time in every app', 'وقت تلفاز الأطفال في كل التطبيقات',
     'A daily TV time that counts every app, not only YouTube.', 'وقت يومي على التلفاز يحسب كل التطبيقات، لا YouTube وحده.'),
    ('37', 'Routines-reminders', 'Routines and reminders', 'الإجراءات الروتينية والتذكيرات',
     'Several steps with one tap, or at a set time.', 'عدة خطوات بلمسة واحدة، أو في وقت محدد.'),
    ('38', 'Photos-Simple-mode', 'Photos on the TV, Simple mode', 'الصور على التلفاز والوضع المبسّط',
     'Your phone’s photos on the big screen, and a phone page that is easy for older viewers.',
     'صور هاتفك على الشاشة الكبيرة، وصفحة هاتف سهلة لكبار السن.'),
    ('39', 'Learn-memorise-listen', 'Learn: memorise and listen', 'التعلّم: الحفظ والاستماع',
     'Repeat a part, stop after each line, or just listen.', 'كرّر جزءًا، أو توقّف بعد كل سطر، أو استمع فقط.'),
    ('40', 'Share-another-TV', 'Share with another TV', 'المشاركة مع تلفاز آخر',
     'Copy your settings and lists to another TV. No server.', 'انسخ إعداداتك وقوائمك إلى تلفاز آخر. دون أي خادم.'),
    ('41', 'HDMI-soundbar', 'HDMI devices and soundbar', 'أجهزة HDMI ومكبر الصوت',
     'Your game console, TV box and soundbar, from the same phone. Needs whole-TV control.',
     'جهاز الألعاب وصندوق التلفاز ومكبر الصوت، من الهاتف نفسه. يحتاج إلى التحكم في التلفاز كله.'),
    ('42', 'Remote-help', 'Help from far away', 'المساعدة عن بُعد',
     'Someone you trust helps with your TV from their own phone, wherever they are.',
     'شخص تثق به يساعدك في تلفازك من هاتفه، أينما كان.'),
    ('43', 'More-while-watching', 'More while watching', 'المزيد أثناء المشاهدة',
     'Repeat a part, jump to the most replayed part, save a moment.',
     'كرّر جزءًا، وانتقل إلى الجزء الأكثر إعادة، واحفظ لحظة.'),
    ('44', 'New-feed-filters', 'New feed filters', 'تصفية المحتوى: الجديد',
     'New filters for the feed and for sponsors. Most are off until you turn them on.',
     'خيارات جديدة لتصفية المحتوى ولمقاطع الرعاية. معظمها غير مفعّل حتى تفعّله.'),
    # 0.9.6: text on the screen, no voice (code repo media/tutorials/storyboard_096.py)
    ('45', 'Find-my-TV', 'Find my TV, then OK on the TV', 'ابحث عن التلفاز، ثم OK على التلفاز',
     'A new phone connects without the QR code: the same code on both screens, then OK on the TV.',
     'يتصل الهاتف الجديد دون رمز QR: الرمز نفسه على الشاشتين، ثم OK على التلفاز.'),
    ('46', 'Pointer', 'The Pointer screen', 'شاشة المؤشر',
     'Touchpad, air mouse and keys on one screen, and More on this TV.',
     'لوحة اللمس والماوس الهوائي والأزرار في شاشة واحدة، و«المزيد على هذا التلفاز».'),
    ('47', 'Update-from-phone', 'Update the TV from the phone', 'تحديث التلفاز من الهاتف',
     'Three update channels, and one tap on the phone to update the TV.',
     'ثلاث قنوات للتحديثات، ولمسة واحدة على الهاتف لتحديث التلفاز.'),
]


VNAME = {n: (name, te, ta) for n, name, te, ta, de, da in VIDEOS}
TEXT_FROM, TEXT_TO = 35, 47  # text on the screen, no voice

# The videos page in topics, in the order people need them.
VGROUPS = [
    ('start', 'Start here', 'ابدأ من هنا', ['26', '00', '01']),
    ('install', 'Install and remove', 'التثبيت والحذف', ['27', '28', '29', '30', '31', '32', '34']),
    ('phone', 'Your phone', 'هاتفك', ['06', '15', '45', '16', '17', '14', '37', '38', '40', '42', '18', '19', '46', '41']),
    ('family', 'Family and locks', 'العائلة والقفل', ['04', '05', '20', '36', '35']),
    ('watch', 'Watching', 'المشاهدة', ['02', '03', '07', '11', '12', '13', '08', '10', '09', '23', '24', '43', '39', '44']),
    ('more', 'Settings, updates and help', 'الإعدادات والتحديثات والمساعدة', ['21', '22', '47', '25', '33']),
]
assert sorted(n for g in VGROUPS for n in g[3]) == sorted(VNAME), 'every video in exactly one topic'


def videos(lang):
    ofolder = 'en' if lang == 'ar' else 'ar'
    info = {n: (te, ta, de, da) for n, name, te, ta, de, da in VIDEOS}
    groups = []
    for gid, ge, ga, ns in VGROUPS:
        cards = []
        for n in ns:
            te, ta, de, da = info[n]
            f = video_file(lang, n)
            o = video_file(ofolder, n) + '.mp4'
            title = L(lang, te, ta)
            note = ''
            if TEXT_FROM <= int(n) <= TEXT_TO:
                nv = '0.9.6' if int(n) >= 45 else '0.9.5'
                note = L(lang, f'<p class="meta">New in {nv} · text on the screen, no voice</p>',
                         f'<p class="meta">جديد في <bdi>{nv}</bdi> · نصّ على الشاشة دون تعليق صوتي</p>')
            if n == '33':
                note = L(lang, '<p class="warn">Made for 0.9.4. What 0.9.5 adds online (Control from away, remote help, lyrics) is in the FAQ: <a href="/faq/#privacy">What goes online?</a></p>',
                         '<p class="warn">صُنع لإصدار <bdi>0.9.4</bdi>. وما يضيفه <bdi>0.9.5</bdi> من اتصال بالإنترنت («التحكم من خارج المنزل» و«المساعدة عن بُعد» وكلمات الأغنية) في الأسئلة الشائعة: <a href="/ar/faq/#privacy">ما الذي يتصل بالإنترنت؟</a></p>')
            if n == '29':
                note = L(lang, '<p class="warn">Shows the older way with two files. Now install only Sofa Tube Phone; it installs Sofa Tube.</p>',
                         '<p class="warn">يُظهر الطريقة السابقة بملفين. أما الآن فثبّت <bdi>Sofa Tube Phone</bdi> وحده، وهو يثبّت صوفا تيوب.</p>')
            cards.append(f'''<article class="video" id="v{n}">
<video controls preload="none" playsinline poster="{f}.jpg" width="640" height="360" aria-label="{html.escape(title)}"><source src="{f}.mp4" type="video/mp4"><a href="{f}.mp4">{L(lang, 'Download the video (MP4)', 'تنزيل الفيديو (MP4)')}</a></video>
<div class="txt"><h3>{int(n)} · {title}</h3><p>{L(lang, de, da)}</p>{note}
<p class="more"><bdi>{video_len(lang, n)}</bdi> · <a href="{f}.mp4" download>MP4</a> · <a href="{o}" hreflang="{ofolder}">{L(lang, 'Arabic version', 'النسخة الإنجليزية')}</a></p></div>
</article>''')
        groups.append(f'<section class="vgroup" id="{gid}"><h2>{L(lang, ge, ga)} <span class="count">{len(ns)}</span></h2><div class="videos">{"".join(cards)}</div></section>')
    chips = ''.join(f'<li><a href="#{gid}">{L(lang, ge, ga)}</a></li>' for gid, ge, ga, ns in VGROUPS)
    intro = L(lang,
              f'<h1>Videos</h1><p>Tutorials for Sofa Tube 0.9: {len(VIDEOS)} videos in English, from installing to every feature, with the remote buttons to press and the phone screen. Videos {TEXT_FROM} to {TEXT_TO}, for 0.9.5 and 0.9.6, have text on the screen and no voice. The same videos in Arabic: <a href="/ar/videos/" hreflang="ar" lang="ar">الفيديوهات بالعربية</a>.</p>',
              f'<h1>الفيديوهات</h1><p>شروح بالفيديو لصوفا تيوب <bdi>0.9</bdi>: <bdi>{len(VIDEOS)}</bdi> فيديوًا بالعربية، من التثبيت إلى كل ميزة، تُظهر أزرار جهاز التحكم التي تضغطها وشاشة الهاتف. والفيديوهات من <bdi>{TEXT_FROM}</bdi> إلى <bdi>{TEXT_TO}</bdi>، لإصدارَي <bdi>0.9.5</bdi> و<bdi>0.9.6</bdi>، فيها نصّ على الشاشة دون تعليق صوتي. والفيديوهات نفسها بالإنجليزية: <a href="/videos/" hreflang="en" lang="en">Videos in English</a>.</p>')
    return intro + f'<ul class="toc">{chips}</ul>' + ''.join(groups)


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
    (16, True, 'Settings from your phone.', 'LG: open the Sofa Tube Phone app. Samsung / Android: Settings → Phone remote (the first page). Scan the QR code with a real phone on the same Wi-Fi, change a setting: does the TV follow at once?',
     'الإعدادات من الهاتف.', 'في LG: افتح تطبيق <bdi>Sofa Tube Phone</bdi>. في سامسونج وأندرويد: الإعدادات ← جهاز التحكم من الهاتف (أول صفحة). امسح رمز QR بهاتف حقيقي على شبكة الواي فاي نفسها، وغيّر إعدادًا: هل يتغيّر على التلفاز فورًا؟', 'Samsung: most important', 'سامسونج: الأهم'),
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
    ('LG webOS', 'LG emulator (webOS 4), including installing Sofa Tube from the Sofa Tube Phone app; earlier versions on a real LG TV.',
     'LG ‏(webOS)', 'محاكي LG \u200f(webOS 4)، ومنه تثبيت صوفا تيوب من تطبيق <bdi>Sofa Tube Phone</bdi>؛ والإصدارات السابقة على تلفاز LG حقيقي.'),
    ('Samsung app (<code>.wgt</code>)', "Real Samsung TVs in Samsung's Remote Test Lab (2025 QN80F, 2022 QB80, 2020 QT80) and a 2025 Q7F at home, installed with Apps2Samsung from an Android phone. Whole-TV control from the phone: newer Samsung TVs need a TV box, a computer at home or the parent's open phone page as a relay; the relay is not yet confirmed on a home TV.",
     'تطبيق سامسونج (ملف <code dir="ltr">.wgt</code>)', 'أجهزة تلفاز سامسونج حقيقية في مختبر سامسونج عن بُعد (<bdi>QN80F</bdi> من 2025، و<bdi>QB80</bdi> من 2022، و<bdi>QT80</bdi> من 2020) وجهاز <bdi>Q7F</bdi> من 2025 في المنزل، ثُبّت عليها بـ<bdi>Apps2Samsung</bdi> من هاتف أندرويد. التحكم في التلفاز كله من الهاتف: أجهزة سامسونج الأحدث تحتاج إلى جهاز Android TV أو حاسوب في المنزل أو صفحة هاتف أحد الوالدين مفتوحة وسيطًا؛ ولم يُتأكَّد من الوسيط بعدُ على تلفاز في المنزل.'),
    ('Samsung (TizenBrew, npm <code>sofatube</code>)', 'Samsung emulator only. <b>Never tried on a real Samsung TV.</b>',
     'سامسونج (TizenBrew، وحدة <code dir="ltr">sofatube</code>)', 'محاكي سامسونج فقط. <b>لم يُجرَّب على تلفاز سامسونج حقيقي.</b>'),
    ('Android TV / Google TV', 'Google TV emulator, and a 0.9.6 build on one real Android TV (TCL). <b>Other brands untested.</b>',
     '<bdi>Android TV</bdi> و<bdi>Google TV</bdi>', 'محاكي Google TV، ونسخة من <bdi>0.9.6</bdi> على تلفاز أندرويد حقيقي واحد (TCL). <b>لم يُجرَّب على الشركات الأخرى.</b>'),
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



# ------------------------------------------------------------------ faq: privacy, from away, remote help, limits
# Facts from the code repo: CHANGELOG "Unreleased (0.9.5)", tools/site-finder/away-help.html and README.md,
# tools/site-help/help-core.js (the STUN/TURN setting), docs/steps/away-095.md, docs/steps/release-095-check.md.
STUN = 'stun.l.google.com:19302'

EN_PRIVACY = f"""<p>Only what a feature needs, and most of it only when you turn it on or ask for it:</p>
<ul>
<li><b>YouTube</b>, for everything you watch. <b>Mark the most replayed part</b> on the seek bar (off by default) and <b>Jump to the most replayed part</b> ask youtube.com too.</li>
<li><b>SponsorBlock, Return YouTube Dislike and DeArrow</b> (community services), for the video you watch.</li>
<li><b>Lyrics</b> (Action menu, only when you ask): LRCLIB (lrclib.net) gets only the artist, the song and its length.</li>
<li><b>Updates:</b> only when you press Check for updates or turn on the weekly check (from sofatube.github.io, or its jsDelivr copy). The same file can carry a switch-off list that turns a feature off when a YouTube change breaks it, until a fix is out: data only, never code. Diagnostics shows what and why, and “Follow Sofa Tube's switch-off list” can be turned off.</li>
<li><b>Control from away</b> and <b>remembered helpers</b> (both off until you set them up): sealed messages through ntfy.sh or your own server. <a href="#away">Who can see what</a>.</li>
<li><b>Remote help:</b> the two phones connect directly; to find each other they ask a public STUN server. <a href="#help">What goes where</a>.</li>
</ul>
<p><b>Stays at home:</b> the phone page (the TV serves it on your Wi-Fi), Share with another TV and My TVs (no server), photos and videos shown from the phone (kept on the TV only briefly, deleted when the viewer closes), home automation (home network only), the Wi-Fi check and the “YouTube changed something” check.</p>"""

EN_AWAY = f"""<p>Control from away is <b>off by default</b>. A parent turns it on at the TV (Settings → Kids → Control from away; a PIN is needed) and adds a phone at home by scanning the TV's code. Both screens show the same 4 words; then OK and the PIN on the TV.</p>
<ul>
<li><b>An end-to-end encrypted mailbox.</b> The TV and the phone leave sealed messages for each other on a free public ntfy server, <b>ntfy.sh</b> by default. Only your TV and your phone have the keys. The server sees the internet addresses of the TV and the phone, when a message is left and its size (always one of three fixed sizes), never what is in it: not the video, not the app, not the time used, not your messages. The TV only calls out; nothing on the internet can call into your TV.</li>
<li><b>The server can be changed:</b> run your own ntfy server and type its address on the TV (Settings → Kids → Own mailbox server); paired phones move to it by themselves. Or use your own <b>Tailscale</b>: the phone is then “at home” and no mailbox server is used. The guide, in plain words: <a href="/remote/away-help.html">How to connect from away</a>.</li>
<li><b>Kids' requests</b> (“more time”, “can I watch this?”, “can I open this app?”) reach the parent's phone as a notification that the TV itself sends through the phone's own notification service (Apple, Google or Mozilla). That service also gets only a sealed message.</li>
<li><b>“Now” shows only what is on at that moment</b>, made when the parent asks; no history is kept. While Control from away is on, the TV shows a small sign (“A parent's phone can see what's on now”) and a short message each time a parent looks.</li>
<li><b>The whole phone page from away (0.9.6):</b> the Sofa Tube app opens the TV's full phone page over a direct, end-to-end encrypted connection, with the parent PIN first; when no direct connection can be made, the simple view stays and says why. Through the family's own Tailscale it works as at home.</li>
<li><b>Some things stay at home:</b> changing the PIN, removing phones and turning Control from away off can only be done on the TV. Turning the TV off from away needs “Control the whole TV from the phone”. If the internet is down, the rules keep working on the TV.</li>
</ul>"""

EN_HELP = f"""<p>Remote help lets someone you trust help from far away, phone to phone. It starts on the family's side: <b>Get help</b> on the phone page makes a code to send to the helper (WhatsApp or another app), the helper's answer comes back the same way, and both phones show the same 4 pictures to check. The helper uses <a href="/help/">sofatube.github.io/help</a>.</p>
<ul>
<li><b>No server of ours:</b> the two phones connect directly. To find a way between two homes, both phones ask a public STUN server (by default <code>{STUN}</code>, Google's) for their own public address; it learns that address and nothing else. In the help card's <b>Connection</b> settings you can turn this off (then only on the same Wi-Fi), use your own STUN server, or add your own TURN server.</li>
<li><b>The TV asks first</b>, with the remote, what the helper may do (see, remote keys and Up next, settings, Fix it) for 30 minutes, shows a banner the whole time and keeps a list of what was changed. Back twice or Stop ends it. Kid rules change only with the PIN on the TV.</li>
<li><b>Remembered helpers:</b> after a session the family can remember the helper, and next time “Ask … for help” connects without copying codes, through the same end-to-end encrypted mailbox as Control from away (ntfy.sh, or your own ntfy server). The mailbox sees only the phones' addresses, and nothing stays there beyond 12 hours. The TV still asks every time, and either side can forget.</li>
<li>The TV's diagnostics and a Fix it result go to the helper only after you have seen them. The helper sees the TV through the relative's phone camera only when the relative taps it, and it stops at any time.</li>
</ul>"""

EN_LIMITS = """<p><b>LG</b></p>
<ul>
<li>After a TV restart or a full power-off, open <b>Sofa Tube Phone</b> once on the TV: Control from away and the family plan's bedtime and allowed apps wait until then (Sofa Tube itself can't start the Phone app's helper on LG). Use the TV's own app lock as well (Settings → Safety).</li>
<li>“Ask for more time” on the bedtime warning is checked on the LG emulator, not yet on a real LG TV. “Even out loud and quiet parts” is not yet tried on a real LG TV.</li>
</ul>
<p><b>Samsung (Whole TV)</b></p>
<ul>
<li>Kids' allowed apps work for the common apps only (Netflix, Prime Video, Disney+, Apple TV, Spotify, Internet); other apps are never closed, so use the TV's own app lock as well. YouTube is always allowed, since Sofa Tube runs inside it. A daily limit per app: common apps only too.</li>
<li>No rules for HDMI inputs (game consoles, boxes): Samsung doesn't let apps see HDMI.</li>
<li>Reminders and a routine's message show only inside Sofa Tube, not over other apps. “Ask a parent” on a blocked app shows only on Sofa Tube's own screen.</li>
<li>“On the TV now” is hidden on TVs whose app interface does not answer (the 2023 and newer TVs in Samsung's Remote Test Lab answered “not found” for every app).</li>
<li>The TV volume number and the kids volume cap work only where the TV's network volume control answers, and are not yet confirmed on a real Samsung TV. Whole-TV pairing and the Soundbar badge also still need a check on a Samsung TV at home (the lab TVs refused new remote connections).</li>
<li>No Next / Previous keys on the phone (Samsung has none). The most replayed part comes through Sofa Tube's own service on the TV, which asks youtube.com for it (YouTube does not send it to Samsung TVs); checked on the Samsung TV emulator, not yet on a real Samsung TV. “Even out loud and quiet parts” is hidden (the TV's sound can't be processed).</li>
</ul>
<p><b>All TVs</b></p>
<ul>
<li>“Play the adhan or a playlist” at prayer time and reminders for lives and premieres work only while Sofa Tube is open.</li>
<li>Android TV: the family plan's volume cap, allowed apps and prayer mute were checked on a real Android TV; turning the TV off at bedtime was not tried there. “Even out loud and quiet parts” is hidden (the TV's sound can't be processed).</li>
<li>“Hide YouTube's extra Home rows” is not yet seen on a real TV (the rows show only for signed-in accounts). “Fill the screen” is checked on a real Android TV, not yet on a real LG or Samsung picture.</li>
<li>iPhone: Control from away pairs and gets notifications only inside the Home Screen app (notifications need iOS 16.4 or newer).</li>
<li>Remote help does not always connect (about 1 in 5 tries fail, more on mobile data); a WhatsApp video call pointed at the TV works too.</li>
</ul>"""

AR_PRIVACY = f"""<p>ما تحتاج إليه كل ميزة فقط، وأغلبه لا يحدث إلا حين تفعّلها أو تطلبه:</p>
<ul>
<li><b>YouTube</b>، لكل ما تشاهده. ويتصل <b>«تمييز الجزء الأكثر إعادة»</b> في شريط التقدّم (غير مفعّل في البداية) و<b>«الانتقال إلى الجزء الأكثر إعادة»</b> بـ<bdi>youtube.com</bdi> أيضًا.</li>
<li><b>SponsorBlock وReturn YouTube Dislike وDeArrow</b> (خدمات يديرها المشاهدون)، للفيديو الذي تشاهده.</li>
<li><b>كلمات الأغنية</b> (من قائمة الإجراءات، عند الطلب فقط): لا يصل إلى LRCLIB ‏(<bdi>lrclib.net</bdi>) إلا اسم الفنان واسم الأغنية ومدتها.</li>
<li><b>التحديثات:</b> فقط حين تضغط «البحث عن تحديثات» أو تفعّل «البحث عن تحديثات مرة كل أسبوع» (من <bdi>sofatube.github.io</bdi> أو نسخته على jsDelivr). وقد يحمل الملف نفسه قائمة إيقاف تُوقف ميزة أفسدها تغيير في YouTube حتى يصدر إصلاح: بيانات فقط، ولا برمجيات أبدًا. تعرض صفحة «التشخيص» ما أُوقف ولماذا، ويمكن إيقاف «اتباع قائمة الإيقاف من صوفا تيوب».</li>
<li><b>التحكم من خارج المنزل</b> و<b>المساعدون المحفوظون</b> (كلاهما غير مفعّل حتى تُعدّه): رسائل مختومة عبر ntfy.sh أو خادمك الخاص. <a href="#away">من يرى ماذا</a>.</li>
<li><b>المساعدة عن بُعد:</b> يتصل الهاتفان مباشرة، وليجد كل منهما الآخر يسألان خادم STUN عامًا. <a href="#help">ماذا يمر وأين</a>.</li>
</ul>
<p><b>يبقى في المنزل:</b> صفحة الهاتف (يقدّمها التلفاز عبر شبكة الواي فاي في بيتك)، و«المشاركة مع تلفاز آخر» و«أجهزة التلفاز الخاصة بي» (دون خادم)، والصور والفيديوهات المعروضة من الهاتف (يحتفظ بها التلفاز مدة قصيرة فقط، وتُحذف عند إغلاق العارض)، و«أتمتة المنزل» (على شبكة المنزل فقط)، وفحص الواي فاي، وفحص «YouTube غيّر شيئًا».</p>"""

AR_AWAY = f"""<p>«التحكم من خارج المنزل» <b>غير مفعّل في البداية</b>. يفعّله أحد الوالدين على التلفاز (الإعدادات ← الأطفال ← «التحكم من خارج المنزل»، ويلزم الرمز السري)، ويضيف هاتفًا وهو في المنزل بمسح رمز التلفاز. تظهر الكلمات الأربع نفسها على الجهازين، ثم OK والرمز السري على التلفاز.</p>
<ul>
<li><b>خادم رسائل مشفّر بين الطرفين.</b> يترك التلفاز وهاتفك رسائل مختومة لبعضهما على خادم ntfy عام مجاني، وهو <b>ntfy.sh</b> في البداية. لا يملك المفاتيح إلا تلفازك وهاتفك. يرى الخادم عنوانَي التلفاز والهاتف على الإنترنت، ووقت ترك الرسالة، وحجمها (وهو دائمًا أحد ثلاثة أحجام ثابتة)، ولا يرى محتواها أبدًا: لا الفيديو ولا التطبيق ولا الوقت المستخدم ولا رسائلك. والتلفاز هو من يتصل دائمًا؛ ولا يمكن لأي جهة على الإنترنت الاتصال بتلفازك.</li>
<li><b>يمكن تغيير الخادم:</b> شغّل خادم ntfy خاصًا بك واكتب عنوانه على التلفاز (الإعدادات ← الأطفال ← «خادم رسائل خاص»)، فتنتقل الهواتف المقترنة إليه تلقائيًا. أو استخدم شبكة <b>Tailscale</b> الخاصة بك: يكون الهاتف حينها «في المنزل» ولا يُستخدم خادم رسائل. الدليل بكلمات بسيطة: <a href="/remote/away-help.html">طرق الاتصال من خارج المنزل</a>.</li>
<li><b>طلبات الأطفال</b> («وقت إضافي»، «هل أشاهد هذا؟»، «هل أفتح هذا التطبيق؟») تصل إلى هاتف أحد الوالدين إشعارًا يرسله التلفاز نفسه عبر خدمة الإشعارات في الهاتف (Apple أو Google أو Mozilla). ولا يصل إلى تلك الخدمة أيضًا إلا رسالة مختومة.</li>
<li><b>«الآن» لا تُظهر إلا ما يُعرض في تلك اللحظة</b>، وتُعدّ فقط حين يطلبها أحد الوالدين، ولا يُحفظ أي سجل. وأثناء تفعيل الميزة تظهر على التلفاز علامة صغيرة («يمكن لهاتف أحد الوالدين رؤية ما يُعرض الآن»)، ورسالة قصيرة كلما اطّلع أحد الوالدين.</li>
<li><b>صفحة الهاتف كاملة من خارج المنزل (<bdi>0.9.6</bdi>):</b> يفتح تطبيق صوفا تيوب صفحة الهاتف كاملة عبر اتصال مباشر مشفّر بين الطرفين، والرمز السري لولي الأمر أولًا؛ وإن تعذّر الاتصال المباشر تبقى الواجهة المبسّطة وتذكر السبب. ومع شبكة Tailscale الخاصة بالعائلة يعمل كما في المنزل.</li>
<li><b>بعض الأمور تبقى في المنزل:</b> تغيير الرمز السري وإزالة الهواتف وإيقاف «التحكم من خارج المنزل» لا تكون إلا من التلفاز. ويتطلب إطفاء التلفاز من خارج المنزل تفعيل «التحكم في التلفاز كله من الهاتف». وإن انقطع الإنترنت تبقى القواعد سارية على التلفاز.</li>
</ul>"""

AR_HELP = f"""<p>تتيح «المساعدة عن بُعد» لشخص تثق به أن يساعدك من بعيد، من هاتف إلى هاتف. تبدأ من جهة العائلة: يصنع زر <b>«طلب المساعدة»</b> في صفحة الهاتف رمزًا ترسله إلى المساعد (عبر واتساب أو تطبيق آخر)، ويعود رد المساعد بالطريقة نفسها، ثم يُظهر الهاتفان الصور الأربع نفسها للتأكد. ويستخدم المساعد <a href="/help/"><bdi>sofatube.github.io/help</bdi></a>.</p>
<ul>
<li><b>لا خادم لنا:</b> يتصل الهاتفان مباشرة. وليجدا طريقًا بين منزلين، يسأل كل منهما خادم STUN عامًا (في البداية <code dir="ltr">{STUN}</code> من Google) عن عنوانه العام، ولا يعرف الخادم إلا ذلك العنوان. ومن إعدادات <b>«الاتصال»</b> في بطاقة المساعدة يمكنك إيقاف ذلك (فتعمل على شبكة الواي فاي نفسها فقط)، أو استخدام خادم STUN خاص بك، أو إضافة خادم TURN خاص بك.</li>
<li><b>يسأل التلفاز أولًا</b>، بجهاز التحكم، عمّا يُسمح للمساعد به (الرؤية، وأزرار جهاز التحكم و«التالي»، والإعدادات، و«إصلاح المشكلة») مدة 30 دقيقة، ويُظهر شريطًا طوال المساعدة، ويحتفظ بقائمة بما تغيّر. والضغط على زر الرجوع مرتين أو «إيقاف» يُنهيها. ولا تتغيّر قواعد الأطفال إلا بالرمز السري على التلفاز.</li>
<li><b>المساعدون المحفوظون:</b> بعد المساعدة يمكن للعائلة حفظ المساعد، وفي المرة التالية يتصل «طلب المساعدة من …» دون نسخ رموز، عبر خادم الرسائل المشفّر نفسه الذي يستخدمه «التحكم من خارج المنزل» (ntfy.sh أو خادم ntfy خاص بك). لا يرى الخادم إلا عنوانَي الهاتفين، ولا يبقى فيه شيء أكثر من 12 ساعة. ويسأل التلفاز في كل مرة، ويمكن لأي من الطرفين حذف الحفظ.</li>
<li>لا يصل تشخيص التلفاز ولا نتيجة «إصلاح المشكلة» إلى المساعد إلا بعد أن تراهما. ولا يرى المساعد التلفاز بكاميرا هاتف قريبه إلا حين يضغط القريب على ذلك، ويمكن إيقافها في أي وقت.</li>
</ul>"""

AR_LIMITS = """<p><b>LG</b></p>
<ul>
<li>بعد إعادة تشغيل التلفاز أو إطفائه بالكامل، افتح <b><bdi>Sofa Tube Phone</bdi></b> مرة واحدة على التلفاز: ينتظر «التحكم من خارج المنزل» ووقت النوم و«التطبيقات المسموح بها فقط» حتى تفتحه (لا يستطيع صوفا تيوب نفسه تشغيل مساعد تطبيق الهاتف على LG). واستخدم أيضًا قفل التطبيقات في التلفاز نفسه (<bdi>Settings</bdi> ← <bdi>Safety</bdi>).</li>
<li>جُرِّب «اطلب وقتًا إضافيًا» في تنبيه وقت النوم على محاكي LG، ولم يُجرَّب بعد على تلفاز LG حقيقي. ولم تُجرَّب «موازنة الأجزاء العالية والهادئة» بعد على تلفاز LG حقيقي.</li>
</ul>
<p><b>سامسونج (التلفاز كله)</b></p>
<ul>
<li>«التطبيقات المسموح بها» للأطفال تعمل مع التطبيقات الشائعة فقط (<bdi>Netflix</bdi> و<bdi>Prime Video</bdi> و<bdi>Disney+</bdi> و<bdi>Apple TV</bdi> و<bdi>Spotify</bdi> و<bdi>Internet</bdi>)، ولا تُغلق التطبيقات الأخرى أبدًا، فاستخدم أيضًا قفل التطبيقات في التلفاز نفسه. ويبقى YouTube مسموحًا به دائمًا، لأن صوفا تيوب يعمل داخله. والحد اليومي لكل تطبيق: للتطبيقات الشائعة فقط أيضًا.</li>
<li>لا قواعد لمصادر إدخال HDMI (أجهزة الألعاب والصناديق): لا تسمح سامسونج للتطبيقات برؤية HDMI.</li>
<li>التذكيرات ورسالة الروتين لا تظهر إلا داخل صوفا تيوب، لا فوق التطبيقات الأخرى. و«اطلب من أحد الوالدين» على تطبيق محظور لا يظهر إلا على شاشة صوفا تيوب نفسه.</li>
<li>تُخفى «على التلفاز الآن» على الأجهزة التي لا تجيب واجهة تطبيقاتها (أجابت أجهزة 2023 وما بعدها في مختبر سامسونج عن بُعد «غير موجود» لكل تطبيق).</li>
<li>رقم مستوى صوت التلفاز و«أقصى مستوى للصوت» للأطفال يعملان فقط حيث يجيب التحكم في الصوت عبر الشبكة في التلفاز، ولم يُتأكَّد منهما بعدُ على تلفاز سامسونج حقيقي. ولا يزال الاقتران للتحكم في التلفاز كله وشارة «مكبر الصوت» يحتاجان إلى تجربة على تلفاز سامسونج في المنزل (رفضت أجهزة المختبر الاتصالات الجديدة بجهاز التحكم).</li>
<li>لا زرّي التالي والسابق على الهاتف (لا يوجدان في سامسونج). ويصل «الجزء الأكثر إعادة» عبر خدمة صوفا تيوب نفسها على التلفاز، فهي تطلبه من <bdi>youtube.com</bdi> (لا يرسله YouTube إلى أجهزة سامسونج)؛ وجُرِّب ذلك على محاكي تلفاز سامسونج، ولم يُجرَّب بعدُ على تلفاز سامسونج حقيقي. وتُخفى «موازنة الأجزاء العالية والهادئة» (لا يمكن معالجة صوت التلفاز).</li>
</ul>
<p><b>كل أجهزة التلفاز</b></p>
<ul>
<li>«تشغيل الأذان أو قائمة تشغيل» عند الأذان، والتذكير بالبث المباشر والعروض الأولى، لا يعملان إلا وصوفا تيوب مفتوح.</li>
<li><bdi>Android TV</bdi>: جُرِّب «أقصى مستوى للصوت» و«التطبيقات المسموح بها» وكتم الصوت عند الأذان على تلفاز أندرويد حقيقي، ولم يُجرَّب إطفاء التلفاز في وقت النوم هناك. وتُخفى «موازنة الأجزاء العالية والهادئة» (لا يمكن معالجة صوت التلفاز).</li>
<li>لم تُرَ «إخفاء الصفوف الإضافية في الصفحة الرئيسية» بعد على تلفاز حقيقي (تظهر هذه الصفوف للحسابات المسجّلة فقط). وجُرِّب «ملء الشاشة» على تلفاز أندرويد حقيقي، ولم يُجرَّب بعد على صورة تلفاز LG أو سامسونج حقيقي.</li>
<li>الآيفون: لا يقترن «التحكم من خارج المنزل» ولا تصل إشعاراته إلا داخل التطبيق على الشاشة الرئيسية (تحتاج الإشعارات إلى iOS 16.4 أو أحدث).</li>
<li>لا ينجح اتصال «المساعدة عن بُعد» دائمًا (تفشل محاولة من كل 5 تقريبًا، وأكثر مع بيانات الجوال)؛ وتنفع أيضًا مكالمة فيديو على واتساب موجّهة إلى التلفاز.</li>
</ul>"""


# ------------------------------------------------------------------ faq

def faq(lang):
    if lang == 'ar':
        qs = [
            ('ما أجهزة التلفاز المدعومة؟',
             '<p>أجهزة <bdi>Android TV</bdi> و<bdi>Google TV</bdi> و<bdi>Fire TV</bdi> (ملف apk)، وتلفاز سامسونج من سنة 2018 أو أحدث (تطبيق مستقل يُثبَّت بـ<bdi>Apps2Samsung</bdi>، أو وحدة TizenBrew)، وتلفاز LG ‏(webOS) عبر وضع المطوّر. <a href="/ar/install/">خطوات التثبيت</a>.</p>'),
            ('هل هو مجاني؟',
             f'<p>نعم. صوفا تيوب مشروع مجاني برخصة <bdi>GPL-3.0</bdi>، دون إعلانات ودون حساب. يُرفق بكل إصدار ملف المصدر <bdi>SofaTube-&lt;version&gt;-source.zip</bdi> في <a href="{RELEASES}">صفحة الإصدار</a>، والمصدر الكامل متاح عند الطلب.</p>'),
            ('لماذا لا أجده في متجر تطبيقات التلفاز؟',
             '<p>صوفا تيوب يفتح صفحة YouTube الخاصة بالتلفاز ويضيف إليها ميزات (منها حجب الإعلانات)، فيُثبَّت من خارج المتجر: بتطبيق Downloader في أندرويد، وبـ<bdi>Apps2Samsung</bdi> (أو TizenBrew) في سامسونج، وبوضع المطوّر في LG.</p>'),
            ('كيف أحدّث التطبيق؟',
             '<p><b>جديد في <bdi>0.9.6</bdi>:</b> ثلاث قنوات للتحديثات («المستقر» و«الاختبار» و«التجريبي»؛ الإعدادات ← «حول التطبيق والنسخ الاحتياطي» ← «قناة التحديثات»)، وبطاقة «التحديثات» على هاتف أحد الوالدين: لمسة على «تحديث التلفاز» تشغّل التحديث على التلفاز نفسه، في كل أنواع التلفاز. <a href="/ar/news/#updates">التفاصيل</a>.</p><ul><li><b>أندرويد:</b> ثبّت ملف apk الجديد فوق هذا بالطريقة نفسها، وتبقى الإعدادات.</li><li><b>سامسونج:</b> الإعدادات ← «حول التطبيق والنسخ الاحتياطي» ← البحث عن تحديثات (يُحدَّث على التلفاز حين يمكن ذلك، وإلا فثبّت الملف الجديد بـ<bdi>Apps2Samsung</bdi> بالطريقة نفسها، وتبقى الإعدادات). أما وحدة TizenBrew فتتحدّث تلقائيًا.</li><li><b>LG:</b> الإعدادات ← حول التطبيق والنسخ الاحتياطي ← البحث عن تحديثات (مع <bdi>Sofa Tube Phone</bdi>)، أو ثبّت ملفات ipk الجديدة بالطريقة نفسها، وتبقى إعداداتك كما هي. وحدّث <bdi>Sofa Tube Phone</bdi> أيضًا حين يطلب الإصدار ذلك (ويطلبه <bdi>0.9.6</bdi>): <a href="/ar/install/#lg-update">كيف</a>.</li></ul><p>لا يُفحص شيء إلا إذا طلبت ذلك (أو فعّلت الفحص الأسبوعي). والروابط القصيرة (<code dir="ltr">sofatube.github.io/tv</code> و<code dir="ltr">/lg</code> و<code dir="ltr">/lg-phone</code> و<code dir="ltr">/samsung</code>) تشير دائمًا إلى أحدث إصدار.</p>', 'updates'),
            ('هل أحتاج إلى حساب؟ وأين تُحفظ إعداداتي؟',
             '<p>لا حاجة إلى حساب: تابع القنوات دون تسجيل الدخول («قنواتي»). تبقى الإعدادات وسجل مشاهدة الأطفال على التلفاز. صفحة الهاتف يقدّمها التلفاز نفسه عبر شبكة الواي فاي في بيتك، ويبقى الرمز السري على التلفاز، ولا تتضمن النسخة الاحتياطية الرمز السري أبدًا.</p><p>ما الذي يتصل بالإنترنت ومتى: <a href="#privacy">ما الذي يتصل بالإنترنت؟</a></p>'),
            ('ما الذي يتصل بالإنترنت؟', AR_PRIVACY, 'privacy'),
            ('التحكم من خارج المنزل: من يرى ماذا؟', AR_AWAY + away_shot('ar'), 'away'),
            ('المساعدة عن بُعد: ماذا يمر وأين؟', AR_HELP, 'help'),
            ('الحدود المعروفة في <bdi>0.9.6</bdi>', AR_LIMITS, 'limits'),
            ('هل يضر بالتلفاز؟',
             '<p>لا شيء هنا يضر بالتلفاز؛ أسوأ ما قد يحدث أن ميزة ما لا تعمل. في LG احذف تطبيق YouTube الرسمي أولًا (يستخدم صوفا تيوب مُعرّف التطبيق نفسه).</p>'),
            ('حل المشكلات',
             '<ul><li><b>لا توجد أزرار ملونة؟</b> استخدم ★ صوفا تيوب في القائمة الجانبية لـYouTube أو زر ★ بين أزرار التحكم.</li><li><b>LG: لا تُفتح التطبيقات التي ثبّتّها؟</b> لجلسة وضع المطوّر مدة تنتهي: افتح تطبيق Developer Mode ومدّد الجلسة.</li><li><b>ينقطع الصوت عند بعض السرعات؟</b> التشغيل ← طريقة تغيير السرعة ← «عبر التطبيق».</li><li><b>أوقات الصلاة غير صحيحة؟</b> اضبط التلفاز على المنطقة الزمنية الصحيحة.</li><li><b>الهاتف لا يتصل؟</b> يجب أن يكون الهاتف على شبكة الواي فاي نفسها التي يتصل بها التلفاز. وإن تغيّر عنوان التلفاز، فإن <a href="/remote/"><bdi>sofatube.github.io/remote</bdi></a> يجد التلفاز من جديد (في Chrome) أو يفتح آخر عنوان.</li><li><b>أندرويد: لا يُثبَّت؟</b> اسمح لـDownloader بتثبيت التطبيقات غير المعروفة.</li></ul>'),
            ('كيف أتواصل معكم؟',
             f'<p>راسلنا على <a href="mailto:{MAIL}"><bdi>{MAIL}</bdi></a> أو <a href="{ISSUES}">افتح بلاغًا (Issue)</a>.</p>'),
        ]
        title = '<h1>الأسئلة الشائعة</h1>'
    else:
        qs = [
            ('Which TVs does it work on?',
             '<p>Android TV, Google TV and Fire TV (the .apk; 32-bit ARM, runs on 32- and 64-bit devices), Samsung TVs from 2018 or newer (its own app, installed with Apps2Samsung; or the TizenBrew module), and LG webOS TVs through Developer Mode. <a href="/install/">Install steps</a>.</p>'),
            ('Is it free?',
             f'<p>Yes. Sofa Tube is a free GPL-3.0 project, with no ads and no account. Each release carries a <code>SofaTube-&lt;version&gt;-source.zip</code> on the <a href="{RELEASES}">release page</a>; the full source is available on request.</p>'),
            ('Why is it not in the TV\'s app store?',
             '<p>Sofa Tube opens YouTube\'s own TV page and adds features on top (ad blocking among them), so it is installed from outside the store: with the Downloader app on Android, Apps2Samsung (or TizenBrew) on Samsung and Developer Mode on LG.</p>'),
            ('How do updates work?',
             '<p><b>New in 0.9.6:</b> three update channels (Stable, Testing, Experimental; Settings → Backup and about → Update channel) and the Updates card on a parent\'s phone: one tap on <b>Update the TV</b> starts the update on the TV itself, on every brand. <a href="/news/#updates">Details</a>.</p><ul><li><b>Android:</b> install the new .apk over this one the same way; settings stay.</li><li><b>Samsung:</b> Settings → Backup and about → Check for updates (it updates on the TV when it can; otherwise install the new file with Apps2Samsung the same way; settings stay). The TizenBrew module updates itself.</li><li><b>LG:</b> Settings → Backup and about → Check for updates (with Sofa Tube Phone), or install the new .ipk files the same way; your settings stay. Update Sofa Tube Phone too when a release says so (0.9.6 does): <a href="/install/#lg-update">how</a>.</li></ul><p>Nothing is checked unless you ask (or turn on the weekly check). The short links (<code>sofatube.github.io/tv</code>, <code>/lg</code>, <code>/lg-phone</code>, <code>/samsung</code>) always point to the latest release.</p>', 'updates'),
            ('Do I need an account? Where are my settings kept?',
             '<p>No account is needed: follow channels without signing in (My channels). Settings and the kids\' watch history stay on the TV. The phone page is served by the TV itself on your Wi-Fi; the PIN stays on the TV and is never in a backup.</p><p>What goes online, and when: <a href="#privacy">What goes online?</a></p>'),
            ('What goes online?', EN_PRIVACY, 'privacy'),
            ('Control from away: who can see what?', EN_AWAY + away_shot('en'), 'away'),
            ('Remote help: what goes where?', EN_HELP, 'help'),
            ('Known limits in 0.9.6', EN_LIMITS, 'limits'),
            ('Can it harm my TV?',
             '<p>Nothing here can harm your TV; at worst a feature does not work. On LG, uninstall the official YouTube app first (Sofa Tube uses the same app ID).</p>'),
            ('Troubleshooting',
             '<ul><li><b>No colour buttons?</b> Use ★ Sofa Tube in YouTube\'s sidebar or the ★ button in the player bar.</li><li><b>LG: the apps stopped opening?</b> The Developer Mode session expired: open the Developer Mode app and extend it.</li><li><b>Sound cuts out at some speeds?</b> Playback → Speed method → Re-timing.</li><li><b>Prayer times wrong?</b> Set the TV to the right time zone.</li><li><b>The phone can\'t connect?</b> The phone must be on the same Wi-Fi as the TV. If the TV\'s address changed, <a href="/remote/">sofatube.github.io/remote</a> finds the TV again (on Chrome) or opens the last address.</li><li><b>Android: won\'t install?</b> Allow Downloader to install unknown apps.</li></ul>'),
            ('How do I contact you?',
             f'<p>Write to <a href="mailto:{MAIL}">{MAIL}</a> or <a href="{ISSUES}">open an issue</a>.</p>'),
        ]
        title = '<h1>FAQ</h1>'
    # An optional third item is the question's anchor (linked from the home and install pages).
    out = []
    for i, (q, a, *x) in enumerate(qs):
        anchor = f' id="{x[0]}"' if x else ''
        out.append(f'<details{anchor}{" open" if i == 0 else ""}><summary>{q}</summary>{a}</details>')
    # A link to #away, #limits … opens that question (a closed <details> does not open by itself).
    opener = ("<script>function o(){var d=location.hash&&document.getElementById(location.hash.slice(1));"
              "if(d&&d.tagName==='DETAILS'){d.open=true;d.scrollIntoView();}}o();addEventListener('hashchange',o);</script>")
    return title + '<div class="faq">' + ''.join(out) + '</div>' + opener


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
    urls = [f'{SITE}{url(lang, s)}' for s, _, _ in PAGES for lang in ('en', 'ar')] + [f'{SITE}/testers/guide.html', f'{SITE}/remote/', f'{SITE}/setup/', f'{SITE}/ar/setup/', f'{SITE}/usb/', f'{SITE}/ar/usb/', f'{SITE}/news/', f'{SITE}/ar/news/',
                                                                                       f'{SITE}/remote/away-help.html', f'{SITE}/help/']
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
               'خطوات تثبيت صوفا تيوب على <bdi>Android TV</bdi> و<bdi>Google TV</bdi> و<bdi>Fire TV</bdi> وLG وسامسونج.'), install(lang) + phone_app(lang, short=True))
        page(lang, 'videos/', L(lang, 'Videos', 'الفيديوهات'),
             L(lang, f'{len(VIDEOS)} Sofa Tube tutorials in English and Arabic.', 'شروح صوفا تيوب المصوّرة بالعربية والإنجليزية.'), videos(lang))
        page(lang, 'testers/', L(lang, 'Testers', 'للمجرّبين'),
             L(lang, 'Sofa Tube tester guide, checklist, how to report and what has been tested.', 'دليل التجربة وقائمة الفحص وطريقة إرسال التقرير وما الذي جُرِّب.'), testers(lang))
        page(lang, 'setup/', L(lang, 'Sofa Tube Setup', 'إعداد صوفا تيوب'),
             L(lang, 'Sofa Tube Setup installs Sofa Tube on Android TV, LG and Samsung TVs from a Windows or Mac computer or an Android phone, with nothing typed on the TV.',
               'إعداد صوفا تيوب يثبّت صوفا تيوب على تلفزيونات أندرويد وLG وسامسونج من حاسوب ويندوز أو ماك أو من هاتف أندرويد، دون كتابة شيء على التلفاز.'),
             setup_page(lang, VER, L, url))
        page(lang, 'usb/', L(lang, 'Install over USB', 'التثبيت عبر USB'),
             L(lang, 'Install Sofa Tube on a Chromecast with Google TV or Nvidia Shield TV over a USB cable, from Chrome or Edge on a computer.',
               'ثبّت صوفا تيوب على Chromecast with Google TV أو Nvidia Shield TV عبر كابل USB، من Chrome أو Edge على حاسوب.'),
             usb_page(lang, VER, L, url))
        page(lang, 'news/', L(lang, "What's new", 'ما الجديد'),
             L(lang, "What's new in each Sofa Tube version, newest first.", 'الجديد في كل إصدار من صوفا تيوب، الأحدث أولًا.'), news(lang))
        page(lang, 'faq/', L(lang, 'FAQ', 'الأسئلة الشائعة'),
             L(lang, 'Sofa Tube questions: which TVs, cost, updates, privacy, troubleshooting.', 'أسئلة شائعة عن صوفا تيوب: الأجهزة المدعومة، والتكلفة، والتحديث، والخصوصية، وحل المشكلات.'), faq(lang))
    not_found()


if __name__ == '__main__':
    main()
