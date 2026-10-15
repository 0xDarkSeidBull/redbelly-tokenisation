#!/usr/bin/env python3
"""Builds the website in public/ from content/script.json and the build outputs.
Everything is served from the site itself: video, subtitles, documents, fonts. No CDN, no outside scripts."""
import datetime, hashlib, html, json, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
E = html.escape

def ver(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()[:10]

def mmss(t):
    return f"{int(t // 60)}:{int(t % 60):02d}"

def main():
    S = json.loads((ROOT / "content/script.json").read_text(encoding="utf-8"))
    TL = json.loads((ROOT / "out/voice/timeline.json").read_text(encoding="utf-8"))
    man = json.loads((ROOT / "evidence/manifest.json").read_text(encoding="utf-8"))["pages"]
    for d in ("video", "docs", "fonts"):
        if (PUB / d).exists():
            shutil.rmtree(PUB / d)
        (PUB / d).mkdir(parents=True)
    copies = {"video": [ROOT / "out/video/tokenisation-explainer.mp4", ROOT / "out/video/tokenisation-explainer-clean.mp4",
                        ROOT / "out/video/poster.jpg", ROOT / "out/subs/tokenisation-explainer.srt", ROOT / "out/subs/tokenisation-explainer.vtt"],
              "docs": [ROOT / "out/docs/tokenisation-explainer-script.pdf", ROOT / "out/docs/tokenisation-explainer-script.docx"],
              "fonts": [ROOT / f"assets/fonts/Montserrat-{n}.woff2" for n in ("Regular", "Medium", "SemiBold", "Bold")]}
    for d, files in copies.items():
        for f in files:
            shutil.copy2(f, PUB / d / f.name)
    u = lambda rel: f"{rel}?v={ver(PUB / rel)}"
    mb = lambda rel: (lambda n: f"{n / 1e6:.1f} MB" if n >= 1e6 else f"{max(1, round(n / 1e3))} KB")((PUB / rel).stat().st_size)
    m = S["meta"]; verified = datetime.date.fromisoformat(m["last_verified"]).strftime("%-d %b %Y")
    fonts = "\n".join(f"@font-face{{font-family:Montserrat;font-weight:{w};font-style:normal;font-display:swap;src:url('{u(f'fonts/Montserrat-{n}.woff2')}') format('woff2')}}"
                      for w, n in ((400, "Regular"), (500, "Medium"), (600, "SemiBold"), (700, "Bold")))
    downloads = [("video/tokenisation-explainer.mp4", "Video with subtitles", "MP4, 60 fps"), ("video/tokenisation-explainer-clean.mp4", "Video without subtitles", "MP4"),
                 ("docs/tokenisation-explainer-script.pdf", "Script", "PDF"), ("docs/tokenisation-explainer-script.docx", "Script", "Word"),
                 ("video/tokenisation-explainer.srt", "Subtitles", "SRT"), ("video/tokenisation-explainer.vtt", "Subtitles", "WebVTT")]
    dl = "\n".join(f'<li><a href="{u(r)}" download>{E(a)}<span>{E(b)}, {mb(r)}</span></a></li>' for r, a, b in downloads)
    scenes = []
    for sc, tl in zip(S["scenes"], TL["scenes"]):
        claims = "\n".join(
            f'<li><p class="covers">{E(c["covers"])}</p><blockquote>"{E(c["quote"])}"</blockquote>'
            f'<a href="{E(S["sources"][c["source"]]["url"])}" rel="noopener" target="_blank">{E(S["sources"][c["source"]]["title"])}</a></li>'
            for c in sc["claims"])
        scenes.append(f'''<li class="scene">
<p class="time">{mmss(tl["start"])} to {mmss(tl["end"])}</p>
<h3>{E(sc["name"])}</h3>
<p class="vo">{E(" ".join(sc["vo"]))}</p>
<p class="label">On screen</p>
<ul class="onscreen">{"".join(f"<li>{E(x)}</li>" for x in sc["on_screen"])}</ul>{('<p class="label">In the illustrations</p><ul class="onscreen">' + "".join(f"<li>{E(x)}</li>" for x in dict.fromkeys(sc["ui_text"].values())) + "</ul>") if sc.get("ui_text") else ""}
<details><summary>Sources for this scene ({len(sc["claims"])})</summary><ul class="claims">{claims}</ul></details>
</li>''')
    sources = "\n".join(f'<li><a href="{E(s["url"])}" rel="noopener" target="_blank">{E(s["title"])}</a>'
                        f'<span>Snapshot taken {man[s["evidence"]]["captured_utc"][:10]}, SHA-256 {man[s["evidence"]]["sha256"][:16]}</span></li>'
                        for s in S["sources"].values())
    page = f'''<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(m["title"])}: how a fund becomes a token</title>
<meta name="description" content="{E(m["subtitle"])}.">
<link rel="icon" href="{u("favicon.svg")}" type="image/svg+xml">
<style>
{fonts}
:root{{--ink:#343740;--muted:#5e6270;--navy:#323b70;--mint:#a2ffc8;--mint-ink:#20321f;--sky:#c8daee;--mint-soft:#d8fee5;--mist:#e8ebf2;--line:#bdc1cb}}
*{{box-sizing:border-box}}
html{{-webkit-text-size-adjust:100%}}
body{{margin:0;background:#fff;color:var(--ink);font:400 17px/1.6 Montserrat,system-ui,sans-serif}}
a{{color:var(--navy)}}
a:focus-visible,summary:focus-visible,video:focus-visible{{outline:3px solid var(--navy);outline-offset:3px}}
.wrap{{width:100%;max-width:1040px;margin:0 auto;padding:0 24px}}
.hero{{background:var(--sky);padding:56px 0 40px}}
h1{{margin:0 0 10px;font-weight:700;font-size:clamp(36px,6vw,64px);line-height:1.05;letter-spacing:-.01em}}
.lead{{margin:0 0 28px;max-width:44ch;font-weight:500;font-size:clamp(18px,2.3vw,21px);color:var(--ink)}}
.player{{margin:0;background:#fff;border-radius:20px;padding:10px}}
video{{display:block;width:100%;height:auto;border-radius:12px;background:#fff}}
.downloads{{list-style:none;margin:20px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}}
.downloads a{{display:block;padding:12px 16px;background:#fff;border:2px solid #fff;border-radius:12px;text-decoration:none;color:var(--ink);font-weight:600;font-size:16px}}
.downloads a:hover{{border-color:var(--ink)}}
.downloads span{{display:block;font-weight:400;font-size:14px;color:var(--muted)}}
main{{padding:48px 24px 24px}}
h2{{margin:0 0 8px;font-weight:700;font-size:32px;line-height:1.2}}
section{{margin:0 0 56px}}
section>p{{margin:0 0 24px;max-width:62ch;color:var(--muted)}}
.scenes{{list-style:none;margin:0;padding:0;counter-reset:scene}}
.scene{{counter-increment:scene;position:relative;padding:24px 0 24px 64px;border-top:2px solid var(--mist)}}
.scene::before{{content:counter(scene);position:absolute;left:0;top:24px;width:40px;height:40px;border-radius:50%;background:var(--mint);color:var(--mint-ink);font-weight:700;font-size:18px;display:flex;align-items:center;justify-content:center}}
.time{{margin:0;font-size:14px;color:var(--muted)}}
h3{{margin:2px 0 8px;font-weight:600;font-size:20px;line-height:1.3}}
.vo{{margin:0 0 12px;max-width:62ch;font-size:18px;font-weight:500}}
.label{{margin:0 0 4px;font-size:14px;color:var(--muted)}}
.onscreen{{margin:0 0 12px;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px}}
.onscreen li{{background:var(--mist);border-radius:8px;padding:4px 10px;font-size:15px}}
details{{max-width:70ch}}
summary{{cursor:pointer;font-weight:600;font-size:15px;color:var(--navy)}}
.claims{{list-style:none;margin:12px 0 0;padding:0}}
.claims li{{margin:0 0 14px;padding:12px 14px;background:var(--mint-soft);border-radius:10px}}
.covers{{margin:0 0 4px;font-weight:600;font-size:15px}}
blockquote{{margin:0 0 6px;font-size:15px;color:var(--ink)}}
.claims a{{font-size:14px;word-break:break-word}}
.sources{{list-style:none;margin:0;padding:0}}
.sources li{{padding:12px 0;border-top:2px solid var(--mist)}}
.sources span{{display:block;font-size:14px;color:var(--muted);word-break:break-all}}
dl{{margin:0;display:grid;grid-template-columns:200px 1fr;gap:10px 24px}}
dt{{font-weight:600}}
dd{{margin:0;color:var(--ink)}}
footer{{padding:24px 24px 48px;font-size:14px;color:var(--muted)}}
@media (max-width:640px){{.hero{{padding:36px 0 28px}}.scene{{padding-left:52px}}.scene::before{{width:34px;height:34px;font-size:16px}}dl{{grid-template-columns:1fr;gap:2px}}dd{{margin-bottom:12px}}}}
@media (prefers-reduced-motion:reduce){{*{{scroll-behavior:auto}}}}
</style>
</head>
<body>
<header class="hero">
<div class="wrap">
<h1>{E(m["title"])}</h1>
<p class="lead">{E(m["subtitle"])}, in {mmss(TL["total_seconds"])}.</p>
<figure class="player"><video controls preload="metadata" playsinline poster="{u("video/poster.jpg")}"><source src="{u("video/tokenisation-explainer.mp4")}" type="video/mp4"></video></figure>
<ul class="downloads">
{dl}
</ul>
</div>
</header>
<main class="wrap">
<section id="script">
<h2>Script</h2>
<p>The voiceover below plays in the video word for word, and the subtitles use the same text. Open a scene to see the source page and the exact words behind each claim.</p>
<ol class="scenes">
{chr(10).join(scenes)}
</ol>
</section>
<section id="sources">
<h2>Sources</h2>
<p>Every fact comes from these pages. A snapshot of each page was kept with its SHA-256 so the quotes can be checked later.</p>
<ul class="sources">
{sources}
</ul>
</section>
<section id="made">
<h2>How it was made</h2>
<dl>
<dt>Voice</dt><dd>Synthetic voice from Kokoro-82M, voice af_heart. Apache License 2.0, which allows commercial use.</dd>
<dt>Font</dt><dd>Montserrat, under the SIL Open Font License 1.1.</dd>
<dt>Music</dt><dd>Made for this video from code. No third party audio.</dd>
<dt>Sound effects</dt><dd>Made for this video from code, timed to every check, coin and transition.</dd>
<dt>Icons and animation</dt><dd>Designed for this video with Claude Design and rendered frame by frame at 60 fps. No stock footage or stock icons.</dd>
<dt>Logos</dt><dd>Tokeniser logo from tokeniser.com. Redbelly logo from the Redbelly brand kit.</dd>
<dt>Project files</dt><dd>Script source, animation, build scripts, checks and licence proof are in the project repository that came with this submission.</dd>
</dl>
</section>
</main>
<footer class="wrap">Last verified {verified}. Script version {E(m["version"])}.</footer>
</body>
</html>
'''
    (PUB / "index.html").write_text(page, encoding="utf-8")
    print("site built:", sum(1 for _ in PUB.rglob("*") if _.is_file()), "files")

if __name__ == "__main__":
    main()
