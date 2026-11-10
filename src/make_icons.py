"""Make the site icons from the profile photo.

    python3 src/make_icons.py

Needs Pillow (pip install pillow). Nothing else in this repository does, and the site build never
runs this script: run it by hand only when img/profile.jpg changes, after moving BOX so that the
head fills the square, and commit the three files it writes.

    favicon.ico            16, 32 and 48 px, round, for browser tabs and bookmarks
    img/icon-192.png       192 px, round, for high-resolution tabs and search results
    apple-touch-icon.png   180 px, square, for the iPhone and iPad home screen (iOS rounds it itself)
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

root = Path(__file__).resolve().parent.parent
out = Path(sys.argv[1]) if len(sys.argv) > 1 else root

# left, top, right, bottom in img/profile.jpg: a square around the head.
BOX = (177, 62, 797, 682)
assert BOX[2] - BOX[0] == BOX[3] - BOX[1], "BOX must be square"

photo = Image.open(root / "img" / "profile.jpg").convert("RGB").crop(BOX)


def face(size, round_corners):
    im = photo.resize((size, size), Image.LANCZOS)
    if size <= 48:
        im = im.filter(ImageFilter.UnsharpMask(radius=0.6, percent=60, threshold=0))
    if round_corners:
        big = size * 4
        mask = Image.new("L", (big, big), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, big - 1, big - 1), fill=255)
        im.putalpha(mask.resize((size, size), Image.LANCZOS))
    im.info.clear()
    return im


small = [face(s, True) for s in (16, 32, 48)]
small[-1].save(out / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)], append_images=small[:-1])
(out / "img").mkdir(exist_ok=True)
face(192, True).save(out / "img" / "icon-192.png", optimize=True)
face(180, False).save(out / "apple-touch-icon.png", optimize=True)
for name in ("favicon.ico", "img/icon-192.png", "apple-touch-icon.png"):
    print(name, (out / name).stat().st_size, "bytes")
