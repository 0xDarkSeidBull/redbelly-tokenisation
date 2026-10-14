#!/usr/bin/env python3
"""Renders every frame of out/stage/index.html to out/frames/NNNNN.png with headless Chromium.

  python3 scripts/render_frames.py                 # all frames, skips frames already rendered
  python3 scripts/render_frames.py --stills 3,20   # only stills at these seconds, to out/stills/
"""
import argparse, json, math, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--stills"); ap.add_argument("--budget", type=float, default=0); a = ap.parse_args()
    fps = json.loads((ROOT / "content/script.json").read_text(encoding="utf-8"))["video"]["fps"]
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        pg.goto((ROOT / "out/stage/index.html").resolve().as_uri())
        pg.wait_for_function("window.READY === true || window.ERROR !== undefined", timeout=60000)
        err = pg.evaluate("window.ERROR")
        if err:
            raise SystemExit("stage error: " + err)
        total = pg.evaluate("window.TOTAL")
        clip = {"x": 0, "y": 0, "width": 1920, "height": 1080}
        if a.stills:
            out = ROOT / "out/stills"; out.mkdir(parents=True, exist_ok=True)
            for s in a.stills.split(","):
                pg.evaluate(f"window.seek({float(s)})")
                pg.screenshot(path=str(out / f"t{float(s):06.2f}.png"), clip=clip)
            print("stills done"); return
        out = ROOT / "out/frames"; out.mkdir(parents=True, exist_ok=True)
        n = math.ceil(total * fps); t0 = time.time(); done = 0
        for f in range(n):
            path = out / f"{f:05d}.png"
            if path.exists():
                continue
            pg.evaluate(f"window.seek({f / fps})")
            pg.screenshot(path=str(path), clip=clip)
            done += 1
            if a.budget and time.time() - t0 > a.budget:
                print(f"budget reached at frame {f + 1}/{n}, run again to continue"); b.close(); return
            if done % 150 == 0:
                print(f"{f + 1}/{n} frames, {done / (time.time() - t0):.1f} fps", flush=True)
        (out / "DONE").write_text(str(n))
        print(f"all {n} frames rendered")
        b.close()

if __name__ == "__main__":
    main()
