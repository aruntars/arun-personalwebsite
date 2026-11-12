# arunkumara.com

Personal website of Arunkumar Arunagiri, co-founder and co-CEO of TARS AI. It is a single static page for owners of
human-driven fleets who are working out a robotaxi plan.

Live at https://arunkumara.com, served by GitHub Pages from the `main` branch.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The built page. Generated, do not edit by hand. |
| `img/` | Portrait, episode title cards, the 192px icon, and the static fallback for the diagram. |
| `robots.txt`, `sitemap.xml` | Tell search engines the site may be read and where its one page is. |
| `src/og.html` | Source of `img/og.jpg`, the picture shown when the link is shared. See Search and sharing below. |
| `favicon.ico`, `apple-touch-icon.png` | Browser tab and home screen icons, made from the portrait. |
| `src/page.html` | The page copy and styles. Edit this. |
| `src/ops.html`, `src/ops.css`, `src/ops.js` | The animated operations diagram in the TARS AI section. |
| `src/build.py` | Assembles `index.html` from the files above. |
| `src/make_icons.py` | Makes the icons from the portrait. See Icons below. |
| `src/videos.json`, `src/update_videos.py` | The video list and the script that keeps it current. See Videos below. |
| `.github/workflows/update-videos.yml` | Runs the video update every hour. |
| `CNAME` | The custom domain GitHub Pages serves. |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are. |

## Changing the page

1. Edit `src/page.html`, or the `src/ops.*` files for the diagram.
2. Rebuild:

   ```bash
   python3 src/build.py
   ```

3. Open `index.html` in a browser to check it, then commit both the source and the rebuilt `index.html`.

The build needs only Python 3, with no packages to install. It writes plain ASCII, turning curly apostrophes
and similar characters into HTML entities, so the page reads correctly wherever the file is opened.

## The diagram

Stages and their supporting functions are the `ST` list at the top of `src/ops.js`. To add or rename one, edit
that list. Positions are in a 1040 by 690 box. Below 760px of width the diagram shows the six stages only and
lists the supporting functions underneath. It starts paused when the visitor's system asks for reduced motion.

## Icons

The browser tab icon is the portrait, cropped to the head. `favicon.ico`, `img/icon-192.png` and
`apple-touch-icon.png` are made from `img/profile.jpg` by `src/make_icons.py`. Run that script only when
the portrait changes, after moving the crop box at the top of it, and commit the three files it writes.
It needs the Pillow package, which the normal build does not.

## Search and sharing

The head of `src/page.html` holds what search engines and link previews read: the title, the description,
the canonical address, the Open Graph tags and the structured data about Arun and this page. Keep the title
under 60 characters and the description under 160, or search results cut them off.

`robots.txt` and `sitemap.xml` are plain files at the root. Edit them by hand if a second page is ever added.
The build does not write them, because the video workflow only commits the files it expects to change.

`img/og.jpg` is the 1200 by 630 picture that LinkedIn, Slack and others show beside the link. It is drawn by
`src/og.html`. To make it again after changing the headline or the portrait, render that file with Chrome
and convert the result to JPEG:

    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
      --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=8000 \
      --user-data-dir=/tmp/og-profile --screenshot=/tmp/og.png "file://$PWD/src/og.html"
    python3 -c "from PIL import Image; Image.open('/tmp/og.png').convert('RGB').save('img/og.jpg', quality=88, optimize=True, progressive=True)"

## Analytics

The Google tag near the top of the head of `src/page.html` sends visits to Google Analytics. Its ID,
`GTM-WFB22P62`, is public by design. The two `gtag('consent', 'default', ...)` lines must stay above the
line that loads the tag. They switch advertising signals off for everyone and count visitors in the EU, the
wider EEA, the UK and Switzerland without cookies. The footer carries a one-line note with Google's link
about how it uses the data. To stop counting, delete the tag block and the note, then rebuild.

## Videos

The series section shows every video from the YouTube channel in one strip that scrolls sideways, newest
first, and keeps itself up to date. The strip can be swiped or scrolled, and two arrow buttons move it by
the cards in view. The arrows are added by a script in `src/page.html`. Without scripts the strip still
scrolls.

- `src/videos.json` is the list of every video seen so far, with its episode number.
- `src/update_videos.py` reads the channel feed and adds new videos to the list, with a thumbnail under `img/`.
- `.github/workflows/update-videos.yml` runs that script every hour, rebuilds `index.html`, and commits
  to `main` when something changed. The commit publishes the site. It can also be run by hand from the
  Actions tab.

A new card takes its title from YouTube and its blurb from the first sentences of the video description.
To word a card by hand, add `"display_title"` or `"blurb"` to that video in `src/videos.json`. To keep a
video off the page, add `"hide": true`. To keep a video at the front of the strip, ahead of newer ones,
add `"pin": true`. Its card is then marked "Start here". `"show"` is `0`, which means every video. A number
above 0 keeps only that many, pinned ones first.

GitHub can start a scheduled run late, sometimes by hours, so a new video can take longer than an hour to
appear. YouTube's feed is also sometimes unavailable for hours. A run that cannot read it changes nothing,
and the next run tries again. GitHub pauses scheduled workflows in a repository that has had no activity for 60 days.
It sends an email first, and the workflow can be switched back on from the Actions tab.
