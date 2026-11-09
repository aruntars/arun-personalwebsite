"""Build the site.

    python3 src/build.py                 writes index.html at the repository root
    python3 src/build.py --artifact OUT  also writes OUT, the same page without its document shell

The page is src/page.html. The diagram in the TARS AI section is assembled from ops.html (markup),
ops.css (styles) and ops.js (script), which replace the <figure class="lens-visual"> placeholder.
Edit those four files, never index.html, then run this script.
"""
import re
import sys
from pathlib import Path

here = Path(__file__).resolve().parent
root = here.parent
src = (here / "page.html").read_text(encoding="utf-8")
css = (here / "ops.css").read_text(encoding="utf-8")
html = (here / "ops.html").read_text(encoding="utf-8").strip()
js = (here / "ops.js").read_text(encoding="utf-8").strip()

fig = re.compile(r'<figure class="lens-visual">.*?</figure>', re.S)
assert len(fig.findall(src)) == 1, "expected exactly one diagram placeholder"
out = fig.sub(lambda m: html, src)
assert out.count("</style>") == 1
out = out.replace("</style>", css.rstrip() + "\n</style>")
ld = '<script type="application/ld+json">'
assert out.count(ld) == 1
out = out.replace(ld, js + "\n" + ld)

# Keep the output pure ASCII, so the page reads correctly even where the file is opened without its
# character set being declared (a curly apostrophe otherwise shows up as three junk characters).
NAMED = {0x2019: "&rsquo;", 0x2018: "&lsquo;", 0x201C: "&ldquo;", 0x201D: "&rdquo;", 0x00B7: "&middot;", 0x2013: "&ndash;", 0x00A0: "&nbsp;"}


def _utf16(ch):
    b = ch.encode("utf-16-be")
    return [int.from_bytes(b[i:i + 2], "big") for i in range(0, len(b), 2)]


def ascii_safe(doc):
    parts = re.split(r"(<script\b.*?</script>|<style\b.*?</style>)", doc, flags=re.S)
    res = []
    for part in parts:
        if part.startswith("<script"):
            part = re.sub(r"[^\x00-\x7f]", lambda m: "".join("\\u%04x" % u for u in _utf16(m.group(0))), part)
        elif part.startswith("<style"):
            assert part.isascii(), "non-ASCII character in a style block"
        else:
            part = re.sub(r"[^\x00-\x7f]", lambda m: NAMED.get(ord(m.group(0)), "&#x%X;" % ord(m.group(0))), part)
        res.append(part)
    return "".join(res)


out = ascii_safe(out)
assert out.isascii()
(root / "index.html").write_text(out, encoding="utf-8")
print("index.html", len(out), "bytes")

if "--artifact" in sys.argv:
    target = Path(sys.argv[sys.argv.index("--artifact") + 1])
    head_end = out.index("</head>")
    body_open = out.index("<body>")
    body_close = out.rindex("</body>")
    head = out[:head_end]
    desc = re.search(r'<meta name="description"[^>]*>', head).group(0)
    links = "\n".join(re.findall(r"<link [^>]*>", head))
    style = head[head.index("<style>"):head.index("</style>") + len("</style>")]
    frag = "\n".join(['<meta charset="utf-8">', "<title>Arunkumar Arunagiri</title>", '<meta name="claude:viewport-fit-sides" content="cover">',
                      desc, links, style, out[body_open + len("<body>"):body_close].strip(), ""])
    target.write_text(frag, encoding="utf-8")
    print(target, len(frag), "bytes")
