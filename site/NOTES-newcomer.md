# Home page for first-time visitors (0.9.6)

Not served (only `docs/` is). Why the home page is ordered the way it is.

Sofa Tube has few users, so almost everyone on the home page is new. "What's new in 0.9.6" means little to them; what they need is: what is it, is it worth it, does it work on my TV, and how do I install it the easy way.

## Guidance

- **NN/g, Top 10 guidelines for homepage usability** (https://www.nngroup.com/articles/top-ten-guidelines-for-homepage-usability/): a one-line tagline that says what the site does, which matters most for little-known brands; clear starting points for the 1 to 4 main tasks; show real examples of the content. Recent features can sit on the home page as a short list linked to a permanent archive.
- **NN/g, Homepage design principles** (https://www.nngroup.com/articles/homepage-design-principles/): the home page is an elevator pitch. Do not assume the visitor knows the brand. News on the home page makes the offer harder for new visitors to understand.
- **NN/g, 113 homepage guidelines** (https://www.nngroup.com/articles/113-design-guidelines-homepage-usability/): tagline (#2), one key differentiator (#3), 1 to 4 core tasks with room around them (#4), say when a link downloads a file and how large it is (#39).
- **GOV.UK Design System, Start using a service** (https://design-system.service.gov.uk/patterns/start-using-a-service/): name and purpose first, then one primary start action, then the practical facts (cost, what you need), then the other ways in. Long lists go on separate pages.
- **Keep a Changelog** (https://keepachangelog.com/en/1.1.0/): the history is written for people, newest version first, in its own place.

## Benchmarks (open-source TV and media apps)

- **Jellyfin** (https://jellyfin.org/): headline and Download, then feature cards, then the platform list, then screenshots, then a closing Download. No news on the home page: the blog is a nav link and the version is in the footer. Downloads are per-platform cards.
- **NewPipe** (https://newpipe.net/): tagline and get-it button, short intro, traits, features, then a Get section with the latest release highlights. Blog and releases are nav links only.
- **VLC** (https://www.videolan.org/vlc/): screenshot, description, one big Download, platform links, and the version and size in small text under the button.
- **SmartTube** (https://github.com/yuliskov/SmartTube) and **LibreTube** (https://github.com/libre-tube/LibreTube): README is title, screenshot, short description, features, devices, install. News lives in releases and chat channels, not in the README.
- **Kodi** (kodi.tv could not be fetched; https://github.com/xbmc/xbmc): news goes to the blog.

None of them puts "what's new" at the top.

## What the home page does now

1. **Hero:** what it is, which TVs (Android TV, Google TV, Fire TV, Samsung 2018 or newer, LG webOS), free, no account. One primary button, **Install on your TV** (to `#install`), and **What it does**. The 1-minute video. The version stays as a small badge.
2. **What it does:** the six main feature cards with six real TV screenshots under them.
3. **Whole TV:** the differentiator, with the phone pictures and the videos 18, 19 and 46.
4. **Install:** Sofa Tube Setup first (`/setup`, the main route since 0.9.6), with what it asks on each brand and the USB route (`/usb`). Then "Or install it yourself" with the three per-brand cards (`#download` kept) and the test-version note.
5. **Phone remote:** connecting the phone after installing (`/remote`, video 45).
6. **The rest:** more features, remote buttons, more screenshots.
7. **Closing:** Install and All videos buttons, then one line: "This is Sofa Tube 0.9.6, a test version. What's new and earlier versions · What has been tested".

The 0.9.6 and 0.9.5 parts that were on the home page (the update channels, the 0.9.6 pictures and the 0.9.5 cards) moved unchanged to **`/news/`** (`/ar/news/`), newest first. The footer of every page links to it, the FAQ's updates answer links to `/news/#updates`, and it is in the sitemap. It is not in the main navigation: returning users find it from the footer and the home page's last line.

## Real screenshots of the install steps (0.9.6, 2026-11-16)

Taken on this laptop's emulators with the released 0.9.6 files; no mock-ups.

| Files (`docs/assets/shots/{en,ar}/`)                    | Where shown | How                                                                                                                                                            |
| ------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setup_pc_tvs`, `setup_pc_yes`, `setup_pc_done`         | `/setup`    | `SofaTubeSetup-0.9.6-Windows.exe` (fresh pairing folder), its page in headless Chrome (EN, AR), LG emulator typed as `127.0.0.1` (VirtualBox port forward)   |
| `setup_phone_address`, `setup_phone_yes`, `setup_phone_done` | `/setup` | `SofaTubeSetup-0.9.6-Android.apk` on the `ytx-phone` emulator (data cleared, EN and AR), LG emulator typed as `10.0.2.2:13000`                           |
| `setup_atv_code`                                        | `/setup`    | Google TV emulator's own "Device pairing request" screen: the Android Setup app run on the TV emulator itself, address 127.0.0.1 (no host port needed), Cancel |
| `setup_lg_yes`                                          | `/setup`    | LG webOS TV Emulator's own "Connection request" popup for Setup, cropped to the popup                                                                         |
| `usb_tv_build`, `usb_tv_debugging`, `usb_tv_allow`      | `/usb`      | Google TV emulator (Android 14): About, Developer options, and "Allow USB debugging?" asked for a new key by `tools/site-usb` (the page's install code); Cancel |

Anonymity: only emulator addresses (127.0.0.1, 10.0.2.2, 10.0.2.15) and an emulator device name; the one real TV the Setup page found on the home network had its address blurred in `setup_pc_tvs`; status bars with the clock only (demo mode). The TV screens use the TV's own language (English), for both pages.

Not captured: Downloader (not on the emulator; downloading it needs the owner's OK) and Android's install screen (only an app holding the install permission can open the installer, not the adb shell; the emulator has no Downloader or file manager), LG's Developer Mode app (not on the LG emulator), Samsung's Developer mode window and Apps2Samsung (not on the Tizen emulator; it was also busy with a test sweep). The per-brand install steps keep their videos.
