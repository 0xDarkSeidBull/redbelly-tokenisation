#!/usr/bin/env python3
"""Draws each subtitle cue as a transparent 1920x1080 overlay in the brand style (Montserrat, rounded pill),
from the SRT built by build_subs.py. Writes out/captions/cue_NN.png and out/captions/cues.json."""
import base64, json, re
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent

def ts(s):
    h, m, rest = s.split(":"); sec, ms = rest.split(","); return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000

def main():
    srt = (ROOT / "out/subs/tokenisation-explainer.srt").read_text(encoding="utf-8").strip().split("\n\n")
    cues = []
    for block in srt:
        ls = block.splitlines(); a, b = ls[1].split(" --> "); cues.append((ts(a), ts(b), ls[2:]))
    font = base64.b64encode((ROOT / "assets/fonts/Montserrat-SemiBold.woff2").read_bytes()).decode()
    page = ("<html><head><style>@font-face{font-family:M;font-weight:600;src:url(data:font/woff2;base64," + font + ")}"
            "html,body{margin:0;width:1920px;height:1080px;background:transparent}"
            ".cap{position:absolute;left:50%;bottom:30px;transform:translateX(-50%);max-width:1400px;padding:10px 26px 12px;"
            "border-radius:18px;background:rgba(32,35,42,0.84);color:#fff;font:600 32px/1.32 M,sans-serif;text-align:center;"
            "white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,0.16)}</style></head><body><div class='cap' id='c'></div></body></html>")
    out = ROOT / "out/captions"; out.mkdir(parents=True, exist_ok=True)
    meta = []
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1920, "height": 1080})
        pg.set_content(page); pg.evaluate("document.fonts.ready")
        for i, (a, e, lines) in enumerate(cues, 1):
            pg.evaluate("(h) => { document.getElementById('c').innerHTML = h; }", "<br>".join(l.replace("&", "&amp;").replace("<", "&lt;") for l in lines))
            pg.wait_for_timeout(30)
            f = out / f"cue_{i:02d}.png"; pg.screenshot(path=str(f), omit_background=True)
            meta.append({"file": f.name, "start": a, "end": e})
        b.close()
    (out / "cues.json").write_text(json.dumps(meta, indent=1)); print(f"{len(meta)} caption overlays")

if __name__ == "__main__":
    main()
