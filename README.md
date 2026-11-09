# arunkumara.com

Personal website of Arunkumar Arunagiri, co-founder and co-CEO of TARS AI. It is a single static page for owners of
human-driven fleets who are working out a robotaxi plan.

Live at https://arunkumara.com, served by GitHub Pages from the `main` branch.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The built page. Generated, do not edit by hand. |
| `img/` | Portrait, episode title cards, and the static fallback for the diagram. |
| `src/page.html` | The page copy and styles. Edit this. |
| `src/ops.html`, `src/ops.css`, `src/ops.js` | The animated operations diagram in the TARS AI section. |
| `src/build.py` | Assembles `index.html` from the files above. |
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

## Videos

Each episode in the series has a card in `src/page.html` and a `VideoObject` entry in the structured data at
the bottom of the same file. Add both for a new episode.
