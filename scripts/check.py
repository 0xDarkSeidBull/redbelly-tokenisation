#!/usr/bin/env python3
"""Checks for the TASK-26 explainer. Run from the repo root: python3 scripts/check.py

1. script.json has every required part
2. every source snapshot exists and matches its SHA-256 in evidence/manifest.json
3. every claim quote appears word for word in its source snapshot
4. voiceover, on screen text and notes have no en or em dashes, emoji, price or returns
   words, hype words, or numbers written as words; no tracked text file outside evidence/
   and no commit message has an en or em dash or emoji
5. no personal credit in tracked files (names are read from the gitignored .credit-names)
6. voiceover timeline sits inside the 60 to 90 second target
"""
import hashlib, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
errors, notes = [], []

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

def lint(label, text):
    for rx, what in RULES:
        m = rx.search(text)
        if m:
            errors.append(f"{label}: {what} '{m.group(0)}'")

script = json.loads((ROOT / "content/script.json").read_text(encoding="utf-8"))
manifest = json.loads((ROOT / "evidence/manifest.json").read_text(encoding="utf-8"))["pages"]

for k in ("meta", "voice", "timing", "video", "sources", "scenes"):
    if k not in script:
        errors.append(f"script.json: missing '{k}'")

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

ids, nclaims, words = set(), 0, 0
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
        lint(f"{sid} vo[{i}]", line)
        words += len(line.split())
        if not re.search(r"[.?!]$", line):
            errors.append(f"{sid} vo[{i}]: sentence must end with . ? or !")
    for i, t in enumerate(sc.get("on_screen", [])):
        lint(f"{sid} on_screen[{i}]", t)
    lint(f"{sid} name", sc.get("name", ""))
    lint(f"{sid} visual", sc.get("visual", ""))
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

files = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True).stdout.split()
TEXT_EXT = (".md", ".txt", ".json", ".py", ".html", ".css", ".js", ".srt", ".vtt", ".svg")
for f in files:
    if f.startswith("evidence/") or not f.endswith(TEXT_EXT):
        continue
    t = (ROOT / f).read_text(encoding="utf-8", errors="ignore")
    for rx, what in RULES[:2]:
        m = rx.search(t)
        if m:
            errors.append(f"{f}: {what} found")
msgs = subprocess.run(["git", "log", "--format=%B"], cwd=ROOT, capture_output=True, text=True).stdout
for rx, what in RULES[:2]:
    if rx.search(msgs):
        errors.append(f"commit messages: {what} found")

cn = ROOT / ".credit-names"
if cn.exists():
    names = [n.strip().lower() for n in cn.read_text().splitlines() if n.strip()]
    for f in files:
        if f.startswith("evidence/"):
            continue
        t = (ROOT / f).read_bytes().decode("utf-8", "ignore").lower()
        for n in names:
            if n in t:
                errors.append(f"personal credit: {f} contains a listed name")
else:
    notes.append("personal credit scan skipped, .credit-names not present")

tl = ROOT / "out/voice/timeline.json"
if tl.exists():
    total = json.loads(tl.read_text())["total_seconds"]
    lo, hi = script["timing"]["target_seconds"]
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
