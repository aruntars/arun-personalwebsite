"""Bring src/videos.json up to date with the YouTube channel feed.

    python3 src/update_videos.py
    python3 src/update_videos.py --feed FILE    read a saved copy of the feed instead, for testing

Reads the channel's public feed. Any video that is not in the list yet is added with the next episode
number, and its thumbnail is saved under img/. For videos already in the list, the title and the
automatic blurb are refreshed. The fields written by hand are never touched: display_title, blurb
and hide.

YouTube's feed is sometimes unavailable for hours. When it cannot be read, the script changes nothing,
says so, and still ends normally, so the next scheduled run simply tries again.

Needs only Python 3. Run src/build.py afterwards to rebuild index.html.
"""
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from xml.etree import ElementTree

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
LEDGER = HERE / "videos.json"
NS = {
    "a": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}
VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
CHANNEL_ID = re.compile(r"^UC[A-Za-z0-9_-]{22}$")
AGENT = "arun-personalwebsite-video-updater"


def fetch(url, limit, tries=3, retry_missing=False):
    """Download url, refusing anything larger than limit bytes.

    A 404 is raised at once unless retry_missing is set: for a thumbnail it means that size does not
    exist, for the feed it is usually a passing outage.
    """
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": AGENT})
            with urllib.request.urlopen(req, timeout=30) as res:
                data = res.read(limit + 1)
            if len(data) > limit:
                raise ValueError("response larger than %d bytes: %s" % (limit, url))
            return data
        except urllib.error.HTTPError as err:
            if err.code == 404 and not retry_missing:
                raise
            last = err
        except Exception as err:  # network trouble: wait and try again
            last = err
        if attempt + 1 < tries:
            time.sleep(5 * (attempt + 1))
    raise last


def blurb_from(description, limit=170):
    """The first sentence or two of a video description, without links, lists or the hashtag line."""
    text = re.split(r"(?m)^\s*#|\s#\w", description, maxsplit=1)[0]
    # A numbered or bulleted list ends the opening paragraph, so "1." never ends up as a sentence.
    text = re.split(r"(?m)^\s*(?:\d+[.)]|[-*\u2022])\s", text, maxsplit=1)[0]
    text = re.sub(r"https?://\S+", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    out = ""
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        if out and len(out) + 1 + len(sentence) > limit:
            break
        out = (out + " " + sentence).strip()
    if len(out) > limit + 40:
        out = out[:limit].rsplit(" ", 1)[0].rstrip(",;:") + "..."
    return out


def read_feed(channel_id, saved=None):
    if saved:
        raw = Path(saved).read_bytes()
    else:
        raw = fetch("https://www.youtube.com/feeds/videos.xml?channel_id=" + channel_id, 2_000_000, tries=4, retry_missing=True)
    found = []
    for entry in ElementTree.fromstring(raw).findall("a:entry", NS):
        vid = (entry.findtext("yt:videoId", "", NS) or "").strip()
        if not VIDEO_ID.match(vid):
            continue
        group = entry.find("media:group", NS)
        description = group.findtext("media:description", "", NS) if group is not None else ""
        found.append({
            "id": vid,
            "published": (entry.findtext("a:published", "", NS) or "").strip(),
            "title": " ".join((entry.findtext("a:title", "", NS) or "").split()),
            "auto_blurb": blurb_from(description or ""),
        })
    return found


def save_thumbnail(vid):
    """Save the best thumbnail YouTube has. The page crops it to the upright title card."""
    for name in ("maxresdefault", "sddefault", "hqdefault"):
        try:
            data = fetch("https://i.ytimg.com/vi/%s/%s.jpg" % (vid, name), 3_000_000)
        except urllib.error.HTTPError:
            continue
        if data[:2] == b"\xff\xd8" and len(data) > 5000:
            path = ROOT / "img" / ("yt-%s.jpg" % vid)
            path.write_bytes(data)
            return "img/" + path.name
    return ""


def main():
    ledger = json.loads(LEDGER.read_text(encoding="utf-8"))
    if not CHANNEL_ID.match(ledger.get("channel_id", "")):
        print("channel_id in src/videos.json does not look like a YouTube channel id.")
        return 1
    videos = ledger["videos"]
    known = {v["id"]: v for v in videos}
    saved = sys.argv[sys.argv.index("--feed") + 1] if "--feed" in sys.argv else None
    try:
        feed = read_feed(ledger["channel_id"], saved)
    except Exception as err:
        # "::warning::" makes the line stand out in the GitHub Actions log.
        print("::warning::The YouTube feed could not be read (%s). Nothing changed. The next run will try again." % err)
        return 0
    if not feed:
        print("The feed listed no videos. Nothing changed.")
        return 0

    changed = False
    for item in feed:
        video = known.get(item["id"])
        if video is None:
            continue
        for key in ("title", "auto_blurb"):
            if item[key] and video.get(key) != item[key]:
                video[key] = item[key]
                changed = True

    added = 0
    next_episode = max([v.get("episode", 0) for v in videos] or [0]) + 1
    for item in sorted((i for i in feed if i["id"] not in known), key=lambda i: i["published"]):
        thumb = save_thumbnail(item["id"])
        if not thumb:
            print("No thumbnail for %s yet. It will be picked up on a later run." % item["id"])
            continue
        item["episode"] = next_episode
        item["thumb"] = thumb
        next_episode += 1
        videos.append(item)
        added += 1
        changed = True
        print("Added episode %d: %s" % (item["episode"], item["title"]))

    if changed:
        videos.sort(key=lambda v: v.get("episode", 0))
        LEDGER.write_text(json.dumps(ledger, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("%d videos in the list, %d new, list %s." % (len(videos), added, "updated" if changed else "unchanged"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
