"""Build the site.

    python3 src/build.py                 writes index.html at the repository root
    python3 src/build.py --artifact OUT  also writes OUT, the same page without its document shell
    python3 src/build.py --root DIR      writes everything under DIR instead, for a preview that leaves the
                                         repository's built files alone
    python3 src/build.py --only SLUG     builds that one article only, even if it is not in sitemap.xml yet

The page is src/page.html. The diagram in the TARS AI section is assembled from ops.html (markup),
ops.css (styles) and ops.js (script), which replace the <figure class="lens-visual"> placeholder.
The series cards and the video data for search engines are generated from src/videos.json.
A video with a "slug" and a folder src/series/<slug>/ also gets a written page at series/<slug>/, built from
src/series/template.html. See "Articles" in README.md.
Edit those files, never index.html or anything under series/, then run this script.
"""
import json
import re
import sys
from html import escape
from pathlib import Path

here = Path(__file__).resolve().parent
root = here.parent
out_root = Path(sys.argv[sys.argv.index("--root") + 1]) if "--root" in sys.argv else root
only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
out_root.mkdir(parents=True, exist_ok=True)
src = (here / "page.html").read_text(encoding="utf-8")
raw = src   # the page as written, before the series is filled in; the article pages borrow from it
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
SITE = "https://arunkumara.com/"


def has_article(v):
    """A video has a written page when it names a slug and src/series/<slug>/article.html exists."""
    slug = v.get("slug")
    if not slug or (only and slug != only):
        return False
    assert re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug), "slug must be lower-case words joined by hyphens"
    return (here / "series" / slug / "article.html").exists()


cards, nodes = [], []
for v in shown:
    assert re.fullmatch(r"[A-Za-z0-9_-]{11}", v["id"]), "unexpected video id"
    title = v.get("display_title") or v["title"]
    blurb = v.get("blurb") or v.get("auto_blurb") or ""
    watch = "https://www.youtube.com/watch?v=" + v["id"]
    lines = [
        "<li>",
        '<a class="ep" href="series/%s/">' % v["slug"] if has_article(v) else '<a class="ep" href="%s" target="_blank" rel="noopener">' % watch,
        '<img src="%s" width="405" height="720" loading="lazy" alt="Episode %d title card: %s">' % (escape(v["thumb"]), v["episode"], escape(title)),
        '<span class="n">EP %02d%s</span>' % (v["episode"], " \u00b7 <b>Start here</b>" if v.get("pin") else ""),
        '<span class="t">%s</span>' % escape(title, quote=False),
    ]
    if blurb:
        lines.append('<span class="d">%s</span>' % escape(blurb, quote=False))
    lines += ['<span class="w">%s</span>' % ("Read and watch" if has_article(v) else "Watch on YouTube"), "</a>", "</li>"]
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
(out_root / "index.html").write_text(out, encoding="utf-8")
print("index.html", len(out), "bytes")

# ---- Articles: one written page per episode that has src/series/<slug>/article.html ----
articles = [v for v in shown if has_article(v)]
if articles:
    template = (here / "series" / "template.html").read_text(encoding="utf-8")
    style = raw[raw.index("<style>") + len("<style>"):raw.index("</style>")]
    shared = style[style.index(":root{"):style.index("/* hero")].rstrip()
    shared += "\n" + "\n".join(l for l in style.splitlines() if l.startswith(("footer", ".skip", ".more", ".cta{", ".nav nav")))
    gtag = raw[raw.index("<!-- Google tag"):raw.index("</script>", raw.index("googletagmanager.com/gtm.js")) + len("</script>")]
    fonts = re.search(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>', raw).group(0)
    nav = re.search(r'<header class="nav">.*?</header>', raw, re.S).group(0).replace('href="#', 'href="../../#')
    footer = re.search(r"<footer>.*?</footer>", raw, re.S).group(0)
    sitemap = (root / "sitemap.xml").read_text(encoding="utf-8")
    newest = sorted(shown, key=lambda v: v["published"], reverse=True)
    months = "January February March April May June July August September October November December".split()

    def fill(text, values):
        for key, value in values.items():
            assert "%%" + key + "%%" in text, "template has no " + key
            text = text.replace("%%" + key + "%%", value)
        left = re.findall(r"%%[A-Z_]+%%", text)
        assert not left, "unfilled template fields: %s" % left
        return text

    (out_root / "series").mkdir(exist_ok=True)
    player = (here / "series" / "player.js").read_text(encoding="utf-8")
    assert player.isascii()
    (out_root / "series" / "player.js").write_text(player, encoding="utf-8")
    for v in articles:
        slug, vid = v["slug"], v["id"]
        url = SITE + "series/%s/" % slug
        assert only or "<loc>%s</loc>" % url in sitemap, "add %s to sitemap.xml" % url
        body = (here / "series" / slug / "article.html").read_text(encoding="utf-8")
        dek = re.match(r'\s*<p class="dek">(.*?)</p>', body, re.S)
        assert dek, "%s: article.html must start with <p class=\"dek\">" % slug
        body = body[dek.end():].strip()
        desc = re.sub(r"<[^>]+>", "", dek.group(1)).strip()
        title = v.get("article_title") or v["title"]
        watch = "https://www.youtube.com/watch?v=" + vid
        image = "https://i.ytimg.com/vi/%s/maxresdefault.jpg" % vid
        y, m, d = (int(x) for x in v["published"][:10].split("-"))
        more = []
        for o in newest:
            if o is v:
                continue
            link = '<a href="../%s/">' % o["slug"] if has_article(o) else '<a href="https://www.youtube.com/watch?v=%s" target="_blank" rel="noopener">' % o["id"]
            more.append('<li>%s<span class="n">EP %02d</span><span class="t">%s</span></a></li>' % (link, o["episode"], escape(o.get("display_title") or o["title"], quote=False)))
        author = {"@type": "Person", "@id": SITE + "#arun", "name": "Arunkumar Arunagiri", "url": SITE}
        graph = {"@context": "https://schema.org", "@graph": [
            {"@type": "Article", "@id": url + "#article", "headline": title, "description": desc, "url": url, "mainEntityOfPage": url,
             "datePublished": v["published"], "image": image, "author": author, "publisher": author,
             "isPartOf": {"@type": "CreativeWorkSeries", "name": "The 1 to N series", "url": SITE + "#series"}, "video": {"@id": url + "#video"}},
            {"@type": "VideoObject", "@id": url + "#video", "name": v["title"], "description": desc, "thumbnailUrl": image,
             "uploadDate": v["published"], "url": watch, "embedUrl": "https://www.youtube.com/embed/" + vid},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Arunkumar Arunagiri", "item": SITE},
                {"@type": "ListItem", "position": 2, "name": "The 1 to N series", "item": SITE + "#series"},
                {"@type": "ListItem", "position": 3, "name": title}]},
        ]}
        html_page = fill(template, {
            "GTAG": gtag, "FONTS": fonts, "SHARED_CSS": shared, "NAV": nav, "FOOTER": footer,
            "TITLE": escape(title), "DESC": escape(desc), "URL": url, "OG_IMAGE": image,
            "EP": "%02d" % v["episode"], "H1": escape(title, quote=False), "DEK": dek.group(1).strip(),
            "DATE_ISO": v["published"][:10], "DATE_TEXT": "%s %d, %d" % (months[m - 1], d, y),
            "WATCH": watch, "VIDEO_ID": vid, "THUMB": escape(v["thumb"]),
            "ARTICLE": body, "MORE": "\n".join(more),
            "JSONLD": json.dumps(graph, indent=2, ensure_ascii=False).replace("</", "<\\/"),
        })
        html_page = ascii_safe(html_page)
        assert html_page.isascii()
        dest = out_root / "series" / slug
        dest.mkdir(exist_ok=True)
        # Pictures a scene draws, if any, sit beside the article and are copied as they are.
        for extra in sorted((here / "series" / slug).rglob("*")):
            rel = extra.relative_to(here / "series" / slug)
            if extra.is_file() and rel.as_posix() not in ("article.html", "scenes.js") and not extra.name.startswith("."):
                (dest / rel).parent.mkdir(parents=True, exist_ok=True)
                (dest / rel).write_bytes(extra.read_bytes())
        (dest / "index.html").write_text(html_page, encoding="utf-8")
        # The episode's graphics: the scene code as drawn for the video, wrapped so that only the
        # timelines and the background colour reach the page.
        scenes = (here / "series" / slug / "scenes.js").read_text(encoding="utf-8")
        scenes = ("(function(){\n" + scenes.rstrip() + "\nwindow.SERIES_SCENES = {BOX: typeof BOX === 'undefined' ? [] : BOX, "
                  "FULL: typeof FULL === 'undefined' ? [] : FULL, BG: BG};\n})();\n")
        scenes = re.sub(r"[^\x00-\x7f]", lambda mm: "".join("\\u%04x" % u for u in _utf16(mm.group(0))), scenes)
        (dest / "scenes.js").write_text(scenes, encoding="utf-8")
        print("series/%s/index.html" % slug, len(html_page), "bytes, scenes.js", len(scenes), "bytes")

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
    # The Google tag is in the head, which the artifact does not carry, so its footer note goes too.
    body = out[body_open + len("<body>"):body_close].strip()
    note = re.compile(r'<span class="note">.*?</span>', re.S)
    assert len(note.findall(body)) == 1, "expected exactly one analytics note"
    body = note.sub("", body)
    # The artifact is the home page alone, so links to the written episodes point at the live site.
    body = body.replace('href="series/', 'href="%sseries/' % SITE)
    frag = "\n".join(['<meta charset="utf-8">', "<title>Arunkumar Arunagiri</title>", '<meta name="claude:viewport-fit-sides" content="cover">',
                      desc, links, style, body, ""])
    target.write_text(frag, encoding="utf-8")
    print(target, len(frag), "bytes")
