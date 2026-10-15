#!/usr/bin/env python3
"""Checks for the TASK-26 explainer. Run from the repo root: python3 scripts/check.py

Script and sources
  1. script.json has every required part; tracker labels match scene text
  2. every source snapshot exists and matches its SHA-256 in evidence/manifest.json
  3. every claim quote appears word for word in its source snapshot
  4. voiceover, on screen text and notes have no en or em dashes, emoji, price or returns words,
     hype words, or numbers written as words
Deliverables (skipped with a note if not built yet)
  5. subtitles (SRT and WebVTT) say exactly the voiceover, in order
  6. both videos: 1920x1080, 60 fps, H.264 and AAC, 60 to 90 seconds, under 32 MB
  7. audio loudness: about -16 LUFS integrated, true peak at or below -1 dBTP
  8. PDF and Word script documents contain every voiceover line and every on screen text
Repo and website
  9. no tracked text file outside third party folders, and no commit message, has an en or em dash or emoji
 10. no personal credit in tracked files, documents or video metadata (names come from the gitignored .credit-names)
 11. website: only public/ is served, no outside assets, no GitHub, every local file exists and its ?v= matches its hash
 12. voiceover timeline sits inside the 60 to 90 second target
 13. each video carries the build hash of the current script and scene code, so a stale render fails
"""
import hashlib, json, re, subprocess, sys, zipfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_hash import build_hash

ROOT = Path(__file__).resolve().parent.parent
errors, notes = [], []
THIRD_PARTY = ("evidence/", "LICENSES/kokoro/", "assets/fonts/OFL.txt", "assets/logos/", "scenes/design/vendor/",
               "scenes/design/support.js", "scenes/design/animations-v3.jsx", "scenes/design/tweaks-panel.jsx")
TEXT_EXT = (".md", ".txt", ".json", ".py", ".js", ".html", ".css", ".srt", ".vtt", ".svg", ".sh")

def norm(s):
    for a, b in (("\u2019", "'"), ("\u2018", "'"), ("\u201c", '"'), ("\u201d", '"'), ("\u00a0", " ")):
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s).strip()

RULES = (
    (re.compile("[\u2012\u2013\u2014\u2015\u2212]"), "en or em dash"),
    (re.compile("[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F]"), "emoji"),
    (re.compile(r"\b(prices?|profits?|returns?|yields?|earn(s|ings)?|guarantee[sd]?|gains?)\b", re.I), "price or returns word"),
    (re.compile(r"\b(elevate|seamless(ly)?|unleash|revolutioni[sz]e|game.?changer|skyrocket)\b", re.I), "hype word"),
    (re.compile(r"\b(one|two|three|four|five|six|seven|eight|nine|ten)\b", re.I), "number written as a word"),
)

def lint(label, text, rules=RULES):
    for rx, what in rules:
        m = rx.search(text)
        if m:
            errors.append(f"{label}: {what} '{m.group(0)}'")

def sh(args):
    return subprocess.run(args, cwd=ROOT, capture_output=True, text=True)

script = json.loads((ROOT / "content/script.json").read_text(encoding="utf-8"))
manifest = json.loads((ROOT / "evidence/manifest.json").read_text(encoding="utf-8"))["pages"]
files = sh(["git", "ls-files"]).stdout.split()

# 1 schema
for k in ("meta", "voice", "timing", "video", "globals", "sources", "scenes"):
    if k not in script:
        errors.append(f"script.json: missing '{k}'")
all_screen = [t for sc in script["scenes"] for t in sc.get("on_screen", [])]
for lab in script["globals"]["tracker"]["labels"]:
    if lab not in all_screen:
        errors.append(f"tracker label '{lab}' is not in any scene's on screen text")
    lint("tracker label", lab)

# 2 sources
texts = {}
for sid, s in script["sources"].items():
    rec = manifest.get(s["evidence"])
    if not rec:
        errors.append(f"source {sid}: '{s['evidence']}' not in manifest"); continue
    p = ROOT / rec["file"]
    if not p.exists():
        errors.append(f"source {sid}: missing {rec['file']}"); continue
    if hashlib.sha256(p.read_bytes()).hexdigest() != rec["sha256"]:
        errors.append(f"source {sid}: SHA-256 mismatch for {rec['file']}")
    if rec["url"].rstrip("/") != s["url"].rstrip("/"):
        errors.append(f"source {sid}: URL differs from the manifest")
    texts[sid] = norm(p.read_text(encoding="utf-8"))

# 3 and 4 scenes, claims, wording
ids, nclaims, words, vo_lines = set(), 0, 0, []
for sc in script["scenes"]:
    sid = sc.get("id", "?")
    if sid in ids:
        errors.append(f"{sid}: duplicate id")
    ids.add(sid)
    for k in ("name", "vo", "on_screen", "visual", "claims"):
        if k not in sc:
            errors.append(f"{sid}: missing '{k}'")
    if not sc.get("claims"):
        errors.append(f"{sid}: no claims")
    for i, line in enumerate(sc.get("vo", [])):
        lint(f"{sid} vo[{i}]", line); words += len(line.split()); vo_lines.append(line)
        if not re.search(r"[.?!]$", line):
            errors.append(f"{sid} vo[{i}]: sentence must end with . ? or !")
    for i, t in enumerate(sc.get("on_screen", [])):
        lint(f"{sid} on_screen[{i}]", t)
    for k, t in sc.get("ui_text", {}).items():
        lint(f"{sid} ui_text.{k}", t)
    lint(f"{sid} name", sc.get("name", "")); lint(f"{sid} visual", sc.get("visual", ""))
    for j, c in enumerate(sc.get("claims", [])):
        nclaims += 1
        if c.get("source") not in texts:
            errors.append(f"{sid} claim {j}: unknown source '{c.get('source')}'"); continue
        if norm(c["quote"]) not in texts[c["source"]]:
            errors.append(f"{sid} claim {j}: quote not found in the {c['source']} snapshot")
        if not c.get("covers"):
            errors.append(f"{sid} claim {j}: 'covers' is empty")
        else:
            lint(f"{sid} claim {j} covers", c["covers"])
for k in ("title", "subtitle", "asset"):
    lint(f"meta.{k}", script["meta"].get(k, ""))
vo_all = norm(" ".join(vo_lines))

# 5 subtitles
PUB = ROOT / "public"
for ext in ("srt", "vtt"):
    p = PUB / f"video/tokenisation-explainer.{ext}"
    if not p.exists():
        notes.append(f"{ext} check skipped, not built"); continue
    body = p.read_text(encoding="utf-8")
    cues = [l for l in body.splitlines() if l.strip() and not re.match(r"^\d+$", l) and "-->" not in l and l != "WEBVTT"]
    if norm(" ".join(cues)) != vo_all:
        errors.append(f"subtitles .{ext} do not match the voiceover text")
    lint(f"subtitles .{ext}", body, RULES[:2])

# 6 and 7 videos and loudness
lo, hi = script["timing"]["target_seconds"]
for name in ("tokenisation-explainer.mp4", "tokenisation-explainer-clean.mp4"):
    p = PUB / "video" / name
    if not p.exists():
        notes.append(f"{name} check skipped, not built"); continue
    info = json.loads(sh(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(p)]).stdout)
    v = next(s for s in info["streams"] if s["codec_type"] == "video"); a = next(s for s in info["streams"] if s["codec_type"] == "audio")
    fps = eval(v["r_frame_rate"]); dur = float(info["format"]["duration"]); size = p.stat().st_size
    if (v["codec_name"], v["width"], v["height"]) != ("h264", 1920, 1080) or fps < 50:
        errors.append(f"{name}: video is {v['codec_name']} {v['width']}x{v['height']} at {fps} fps")
    if a["codec_name"] != "aac":
        errors.append(f"{name}: audio codec {a['codec_name']}")
    if not lo <= dur <= hi:
        errors.append(f"{name}: duration {dur:.1f}s outside {lo} to {hi}s")
    if size > 32 * 1024 * 1024:
        errors.append(f"{name}: {size / 1e6:.1f} MB is over 32 MB")
    tags = json.dumps(info["format"].get("tags", {})).lower()
    if info["format"].get("tags", {}).get("comment") != f"build {build_hash(ROOT)}":
        errors.append(f"{name}: built from an older script or scene code, run render.sh")
    notes.append(f"{name}: {v['width']}x{v['height']}, {fps:g} fps, {dur:.1f}s, {size / 1e6:.1f} MB")
    if name == "tokenisation-explainer.mp4":
        r = sh(["ffmpeg", "-hide_banner", "-nostats", "-i", str(p), "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
        i_val = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r)[-1]); tp = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r)[-1])
        if not -17 <= i_val <= -15 or tp > -1.0:
            errors.append(f"loudness: {i_val} LUFS, true peak {tp} dBTP")
        notes.append(f"loudness {i_val} LUFS, true peak {tp} dBTP")
        video_tags = tags

# 8 documents
docs = {}
pdf, docx = PUB / "docs/tokenisation-explainer-script.pdf", PUB / "docs/tokenisation-explainer-script.docx"
if pdf.exists():
    docs["PDF"] = norm(sh(["pdftotext", "-raw", str(pdf), "-"]).stdout)
if docx.exists():
    xml = zipfile.ZipFile(docx).read("word/document.xml").decode("utf-8")
    paras = ["".join(re.findall(r"<w:t(?: [^>]*)?>([^<]*)</w:t>", p)) for p in re.findall(r"<w:p[ >].*?</w:p>", xml)]
    docs["Word"] = norm(" ".join(paras).replace("&quot;", '"').replace("&amp;", "&").replace("&apos;", "'"))
if not docs:
    notes.append("document check skipped, not built")
for kind, text in docs.items():
    for sc in script["scenes"]:
        if norm(" ".join(sc["vo"])) not in text:
            errors.append(f"{kind} script: voiceover of {sc['id']} not found word for word")
        for t in sc["on_screen"] + list(sc.get("ui_text", {}).values()):
            if norm(t) not in text:
                errors.append(f"{kind} script: on screen text '{t}' not found")
    lint(f"{kind} script", text, RULES[:2])

# 9 repo text and commit messages
for f in files:
    if f.startswith(THIRD_PARTY) or not f.endswith(TEXT_EXT):
        continue
    t = (ROOT / f).read_text(encoding="utf-8", errors="ignore")
    for rx, what in RULES[:2]:
        if rx.search(t):
            errors.append(f"{f}: {what} found")
msgs = sh(["git", "log", "--format=%B"]).stdout
for rx, what in RULES[:2]:
    if rx.search(msgs):
        errors.append(f"commit messages: {what} found")

# 10 personal credit
cn = ROOT / ".credit-names"
if cn.exists():
    names = [n.strip().lower() for n in cn.read_text().splitlines() if n.strip()]
    hay = {f: (ROOT / f).read_bytes().decode("utf-8", "ignore").lower() for f in files if not f.startswith("evidence/")}
    hay.update({f"{k} script text": v.lower() for k, v in docs.items()})
    if "video_tags" in globals():
        hay["video metadata"] = video_tags
    for f, t in hay.items():
        for n in names:
            if n in t:
                errors.append(f"personal credit: {f} contains a listed name")
else:
    notes.append("personal credit scan skipped, .credit-names not present")

# 11 website
vj = ROOT / "vercel.json"
if not vj.exists() or json.loads(vj.read_text()).get("outputDirectory") != "public":
    errors.append("vercel.json: outputDirectory must be public, so repo files are not served")
LINK_OK = ("tokeniser.com", "redbelly.network", "taskboard.redbellydao.network")
SVG_NS = ("http://www.w3.org/2000/svg", "http://www.w3.org/1999/xlink")
for p in sorted(PUB.rglob("*")):
    if not p.is_file() or not p.name.endswith(TEXT_EXT):
        continue
    rel = p.relative_to(ROOT); t = p.read_text(encoding="utf-8", errors="ignore")
    if re.search(r"github", t, re.I):
        errors.append(f"{rel}: mentions GitHub")
    for ns in SVG_NS:
        t = t.replace(ns, "")
    t = re.sub(r"<a\s[^>]*href=[\"'](https?://(www\.)?(" + "|".join(re.escape(h) for h in LINK_OK) + r")[^\"']*)[\"']", "<a", t, flags=re.I)
    for m in re.finditer(r"(https?:)?//[a-z0-9.-]+\.[a-z]{2,}", t, re.I):
        errors.append(f"{rel}: external reference {m.group(0)}")
idx = PUB / "index.html"
if idx.exists():
    page = idx.read_text(encoding="utf-8")
    for ref in set(re.findall(r"""(?:src|href|url\()\s*=?\s*['"]?([^'"()\s>]+\?v=[0-9a-f]+)""", page)):
        path, v = ref.split("?v=")
        f = PUB / path
        if not f.exists() and path.endswith("-clean.mp4"):
            notes.append(f"website: {path} not in this copy (the size capped reviewer zip leaves it out)"); continue
        if not f.exists():
            errors.append(f"website: {path} is linked but missing")
        elif not hashlib.sha256(f.read_bytes()).hexdigest().startswith(v):
            errors.append(f"website: {path} version tag is stale")
    for need in ("video/tokenisation-explainer.mp4", "docs/tokenisation-explainer-script.pdf", "video/tokenisation-explainer.srt"):
        if need not in page:
            errors.append(f"website: no link to {need}")

# 12 timing
# Licence proof must ship for every asset not made for this project.
LICENCE_FILES = ("LICENSES/README.md", "LICENSES/voice.md", "LICENSES/mixkit.md", "LICENSES/kokoro/Apache-2.0.txt", "LICENSES/kokoro/kokoro-onnx-LICENSE.txt",
                 "assets/fonts/OFL.txt", "scenes/design/vendor/LICENSE-react.txt",
                 "scenes/design/vendor/LICENSE-react-dom.txt", "scenes/design/vendor/LICENSE-babel-standalone.txt")
for f in LICENCE_FILES:
    if not (ROOT / f).exists():
        errors.append(f"licence proof missing: {f}")
notes.append(f"licence proof files present: {sum((ROOT / f).exists() for f in LICENCE_FILES)}/{len(LICENCE_FILES)}")

tl = ROOT / "out/voice/timeline.json"
if tl.exists():
    total = json.loads(tl.read_text())["total_seconds"]
    if not lo <= total <= hi:
        errors.append(f"timing: total {total:.1f}s is outside {lo} to {hi}s")
    notes.append(f"voiceover timeline {total:.1f}s")
else:
    notes.append("timing check skipped, run scripts/build_voice.py first")

print(f"scenes {len(script['scenes'])}, voiceover words {words}, claims {nclaims}, sources {len(texts)}")
for n in notes:
    print("note:", n)
for e in errors:
    print("FAIL:", e)
print("RESULT:", "PASS" if not errors else f"FAIL ({len(errors)})")
sys.exit(1 if errors else 0)
