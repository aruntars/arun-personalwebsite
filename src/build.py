"""Build the site.

    python3 src/build.py                 writes index.html at the repository root
    python3 src/build.py --artifact OUT  also writes OUT, the same page without its document shell

The page is src/page.html. The diagram in the TARS AI section is assembled from ops.html (markup),
ops.css (styles) and ops.js (script), which replace the <figure class="lens-visual"> placeholder.
The series cards and the video data for search engines are generated from src/videos.json.
Edit those files, never index.html, then run this script.
"""
import json
import re
import sys
from html import escape
from pathlib import Path

here = Path(__file__).resolve().parent
root = here.parent
src = (here / "page.html").read_text(encoding="utf-8")
css = (here / "ops.css").read_text(encoding="utf-8")
html = (here / "ops.html").read_text(encoding="utf-8").strip()
js = (here / "ops.js").read_text(encoding="utf-8").strip()

# The series: every video in src/videos.json, pinned ones first, then newest first.
# A "show" above 0 keeps only that many.
ledger = json.loads((here / "videos.json").read_text(encoding="utf-8"))
shown = sorted((v for v in ledger["videos"] if not v.get("hide")), key=lambda v: v["published"], reverse=True)
shown.sort(key=lambda v: not v.get("pin"))
limit = int(ledger.get("show", 0))
if limit > 0:
    shown = shown[:limit]
cards, nodes = [], []
for v in shown:
    assert re.fullmatch(r"[A-Za-z0-9_-]{11}", v["id"]), "unexpected video id"
    title = v.get("display_title") or v["title"]
    blurb = v.get("blurb") or v.get("auto_blurb") or ""
    watch = "https://www.youtube.com/watch?v=" + v["id"]
    lines = [
        "<li>",
        '<a class="ep" href="%s" target="_blank" rel="noopener">' % watch,
        '<img src="%s" width="405" height="720" loading="lazy" alt="Episode %d title card: %s">' % (escape(v["thumb"]), v["episode"], escape(title)),
        '<span class="n">EP %02d%s</span>' % (v["episode"], " \u00b7 <b>Start here</b>" if v.get("pin") else ""),
        '<span class="t">%s</span>' % escape(title, quote=False),
    ]
    if blurb:
        lines.append('<span class="d">%s</span>' % escape(blurb, quote=False))
    lines += ['<span class="w">Watch on YouTube</span>', "</a>", "</li>"]
    cards.append("\n".join(lines))
    node = {
        "@type": "VideoObject",
        "name": v["title"],
        "thumbnailUrl": "https://i.ytimg.com/vi/%s/maxresdefault.jpg" % v["id"],
        "uploadDate": v["published"],
        "url": watch,
        "embedUrl": "https://www.youtube.com/embed/" + v["id"],
        "position": v["episode"],
        "isPartOf": {"@type": "CreativeWorkSeries", "name": "The 1 to N series"},
        "author": {"@type": "Person", "name": "Arunkumar Arunagiri"},
    }
    if blurb:
        node["description"] = blurb
    nodes.append(node)
ol = re.compile(r'(<ol class="episodes">).*?(</ol>)', re.S)
assert len(ol.findall(src)) == 1, "expected exactly one episodes list"
src = ol.sub(lambda m: m.group(1) + "\n" + "\n".join(cards) + "\n" + m.group(2), src)
count = re.compile(r'(<span class="ep-count">).*?(</span>)', re.S)
assert len(count.findall(src)) == 1, "expected exactly one episode count"
src = count.sub(lambda m: m.group(1) + "%d episode%s" % (len(shown), "" if len(shown) == 1 else "s") + m.group(2), src)
block = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', src, re.S)
data = json.loads(block.group(2))
data["@graph"] = [n for n in data["@graph"] if n.get("@type") != "VideoObject"] + nodes
src = src[:block.start(2)] + "\n" + json.dumps(data, indent=2, ensure_ascii=False).replace("</", "<\\/") + "\n" + src[block.end(2):]

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
    # The artifact has its own icon and its own address, so the favicon and canonical links stay out of it.
    links = "\n".join(l for l in re.findall(r"<link [^>]*>", head) if not re.search(r'rel="(?:(?:apple-touch-)?icon|canonical)"', l))
    style = head[head.index("<style>"):head.index("</style>") + len("</style>")]
    frag = "\n".join(['<meta charset="utf-8">', "<title>Arunkumar Arunagiri</title>", '<meta name="claude:viewport-fit-sides" content="cover">',
                      desc, links, style, out[body_open + len("<body>"):body_close].strip(), ""])
    target.write_text(frag, encoding="utf-8")
    print(target, len(frag), "bytes")
