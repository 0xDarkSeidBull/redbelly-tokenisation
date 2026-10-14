#!/usr/bin/env python3
"""Recapture text snapshots of every page in sources.json and rebuild evidence/manifest.json.

Usage:
  pip install playwright && playwright install chromium
  python3 scripts/snap_sources.py                 # text snapshots only
  python3 scripts/snap_sources.py --screens DIR   # also save full page JPEG screenshots to DIR
"""
import argparse, asyncio, datetime, hashlib, json, re
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
EVID = ROOT / "evidence"

def slug(url):
    s = re.sub(r"^https?://(www\.)?", "", url).rstrip("/")
    return re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()

async def capture(ctx, url, screens):
    pg = await ctx.new_page()
    try:
        await pg.goto(url, wait_until="load", timeout=45000)
    except Exception as e:
        print("  load warning:", str(e)[:100])
    await pg.wait_for_timeout(2500)
    for label in ("Reject all", "Reject All", "Decline"):
        try:
            b = pg.get_by_role("button", name=label)
            if await b.count():
                await b.first.click(timeout=2000)
                await pg.wait_for_timeout(500)
                break
        except Exception:
            pass
    await pg.evaluate("""async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); }""")
    await pg.wait_for_timeout(1200)
    text = await pg.inner_text("body")
    s = slug(url)
    path = EVID / f"{s}.txt"
    path.write_text(text)
    if screens:
        Path(screens).mkdir(parents=True, exist_ok=True)
        await pg.screenshot(path=str(Path(screens) / f"{s}.jpg"), full_page=True, type="jpeg", quality=55)
    rec = {"url": url, "final_url": pg.url,
           "captured_utc": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
           "file": f"evidence/{s}.txt", "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "chars": len(text)}
    await pg.close()
    return s, rec

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--screens", help="folder for JPEG screenshots (kept out of git)")
    args = ap.parse_args()
    urls = json.loads((ROOT / "sources.json").read_text())["pages"]
    EVID.mkdir(exist_ok=True)
    pages = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={"width": 1280, "height": 800})
        for u in urls:
            s, rec = await capture(ctx, u, args.screens)
            pages[s] = rec
            print(f"{rec['chars']:>6}  {u}")
        await browser.close()
    manifest = {"captured_with": "Playwright Chromium, visible page text (document.body.innerText)", "pages": pages}
    (EVID / "manifest.json").write_text(json.dumps(manifest, indent=1))
    print(len(pages), "pages captured")

if __name__ == "__main__":
    asyncio.run(main())
