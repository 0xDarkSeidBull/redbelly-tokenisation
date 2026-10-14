#!/usr/bin/env python3
"""Builds out/stage/index.html: one self contained page (fonts, logos, data inlined) that draws any frame on demand."""
import base64, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out/stage"

def data_uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()

def svg_ratio(path):
    vb = re.search(r'viewBox="([\d.\s-]+)"', path.read_text(encoding="utf-8")).group(1).split()
    return float(vb[2]) / float(vb[3])

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    fonts = "".join(
        f"@font-face{{font-family:Montserrat;font-weight:{w};font-style:normal;src:url({data_uri(ROOT / f'assets/fonts/Montserrat-{n}.woff2', 'font/woff2')}) format('woff2');}}"
        for w, n in ((400, "Regular"), (500, "Medium"), (600, "SemiBold"), (700, "Bold")))
    tk, rb = ROOT / "assets/logos/tokeniser-logo.svg", ROOT / "assets/logos/redbelly-horizontal-colour.svg"
    logos = {"tokeniser": data_uri(tk, "image/svg+xml"), "tokeniserRatio": svg_ratio(tk),
             "redbelly": data_uri(rb, "image/svg+xml"), "redbellyRatio": svg_ratio(rb)}
    data = {"script": json.loads((ROOT / "content/script.json").read_text(encoding="utf-8")),
            "timeline": json.loads((ROOT / "out/voice/timeline.json").read_text(encoding="utf-8"))}
    html = (ROOT / "scenes/stage.html").read_text(encoding="utf-8")
    for key, val in (("/*FONTS*/", fonts), ("/*CSS*/", (ROOT / "scenes/stage.css").read_text(encoding="utf-8")),
                     ("/*DATA*/", json.dumps(data, ensure_ascii=False)), ("/*LOGOS*/", json.dumps(logos)),
                     ("/*JS*/", (ROOT / "scenes/stage.js").read_text(encoding="utf-8"))):
        assert html.count(key) == 1, key
        html = html.replace(key, val)
    (OUT / "index.html").write_text(html, encoding="utf-8")
    print(f"stage built: {len(html) // 1024} KB")

if __name__ == "__main__":
    main()
