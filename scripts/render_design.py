#!/usr/bin/env python3
"""Renders the Claude Design animation frame by frame. A local server runs inside this script, every frame
is a synchronous seek to its exact time, so the output never drops or repeats a frame.
  python3 scripts/render_design.py --budget 270      # resumable: skips frames already on disk
  python3 scripts/render_design.py --stills 4,30     # stills to out/stills/
"""
import argparse, functools, http.server, json, math, threading, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
FPS = 60

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

SETUP = """() => {
  const css = document.createElement('style');
  css.textContent = 'svg[data-om-exportable-video-with-duration-secs]{transform:none!important;box-shadow:none!important}[data-om-starter]>div:not(:first-child){display:none!important}';
  document.head.appendChild(css);
  const svg = document.querySelector('svg[data-om-exportable-video-with-duration-secs]');
  for (const e of document.querySelectorAll('body *')) {
    if (getComputedStyle(e).position === 'fixed' && !e.contains(svg)) e.style.display = 'none';
  }
  window.__seek = t => svg.dispatchEvent(new CustomEvent('data-om-seek-to-time-frame', {bubbles: true, detail: {time: t, sync: true, playing: false}}));
  const r = svg.getBoundingClientRect();
  return {x: r.x, y: r.y, w: r.width, h: r.height, dur: +svg.getAttribute('data-om-exportable-video-with-duration-secs')};
}"""

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--stills"); ap.add_argument("--budget", type=float, default=0); a = ap.parse_args()
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT / "out/design")))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(f"http://127.0.0.1:{srv.server_address[1]}/index.html")
        pg.wait_for_selector("svg[data-om-exportable-video-with-duration-secs]", timeout=90000)
        pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(1500)
        box = pg.evaluate(SETUP); pg.wait_for_timeout(300)
        if errs:
            raise SystemExit("page error: " + errs[0])
        if (round(box["x"]), round(box["y"]), round(box["w"]), round(box["h"])) != (0, 0, 1920, 1080):
            raise SystemExit(f"stage not at 1920x1080 origin: {box}")
        clip = {"x": 0, "y": 0, "width": 1920, "height": 1080}
        if a.stills:
            out = ROOT / "out/stills"; out.mkdir(parents=True, exist_ok=True)
            for s in a.stills.split(","):
                pg.evaluate(f"window.__seek({float(s)})"); pg.screenshot(path=str(out / f"d{float(s):06.2f}.png"), clip=clip)
            print("stills done, duration", box["dur"]); return
        out = ROOT / "out/frames60"; out.mkdir(parents=True, exist_ok=True)
        n = math.floor(box["dur"] * FPS); t0 = time.time(); done = 0
        for f in range(n):
            path = out / f"{f:05d}.png"
            if path.exists():
                continue
            pg.evaluate(f"window.__seek({f / FPS})"); pg.screenshot(path=str(path), clip=clip); done += 1
            if done % 300 == 0:
                print(f"{f + 1}/{n} frames, {done / (time.time() - t0):.1f} fps", flush=True)
            if a.budget and time.time() - t0 > a.budget:
                print(f"budget reached at {f + 1}/{n}, run again to continue"); return
        (out / "DONE").write_text(str(n)); print(f"all {n} frames rendered")

if __name__ == "__main__":
    main()
