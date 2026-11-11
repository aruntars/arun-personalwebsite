# arunkumara.com

Personal website of Arunkumar Arunagiri, co-founder and co-CEO of TARS AI. It is a single static page for owners of
human-driven fleets who are working out a robotaxi plan.

Live at https://arunkumara.com, served by GitHub Pages from the `main` branch.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The built page. Generated, do not edit by hand. |
| `img/` | Portrait, episode title cards, the 192px icon, and the static fallback for the diagram. |
| `favicon.ico`, `apple-touch-icon.png` | Browser tab and home screen icons, made from the portrait. |
| `src/page.html` | The page copy and styles. Edit this. |
| `src/ops.html`, `src/ops.css`, `src/ops.js` | The animated operations diagram in the TARS AI section. |
| `src/build.py` | Assembles `index.html` from the files above. |
| `src/make_icons.py` | Makes the icons from the portrait. See Icons below. |
| `src/videos.json`, `src/update_videos.py` | The video list and the script that keeps it current. See Videos below. |
| `.github/workflows/update-videos.yml` | Runs the video update twice a day. |
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

## Videos

The series section shows every video from the YouTube channel in one strip that scrolls sideways, newest
first, and keeps itself up to date. The strip can be swiped or scrolled, and two arrow buttons move it by
the cards in view. The arrows are added by a script in `src/page.html`. Without scripts the strip still
scrolls.

- `src/videos.json` is the list of every video seen so far, with its episode number.
- `src/update_videos.py` reads the channel feed and adds new videos to the list, with a thumbnail under `img/`.
- `.github/workflows/update-videos.yml` runs that script twice a day, rebuilds `index.html`, and commits
  to `main` when something changed. The commit publishes the site. It can also be run by hand from the
  Actions tab.

A new card takes its title from YouTube and its blurb from the first sentences of the video description.
To word a card by hand, add `"display_title"` or `"blurb"` to that video in `src/videos.json`. To keep a
video off the page, add `"hide": true`. `"show"` is `0`, which means every video. A number above 0 keeps
only that many of the newest.

YouTube's feed is sometimes unavailable for hours. A run that cannot read it changes nothing, and the next
run tries again. GitHub pauses scheduled workflows in a repository that has had no activity for 60 days.
It sends an email first, and the workflow can be switched back on from the Actions tab.
