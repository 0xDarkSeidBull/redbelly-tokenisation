#!/usr/bin/env python3
"""Builds subtitles (SRT and WebVTT) from the voiceover timeline. Text is the script text, word for word.
Cues hold at most 2 lines of 42 characters; long sentences are split at commas or between words."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LINE, CUE = 42, 84

def split_cue(text):
    if len(text) <= CUE:
        return [text]
    words = text.split(" "); best = None
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        if len(a) > CUE:
            break
        score = abs(len(a) - len(b)) - (25 if a.endswith(",") else 0)
        if best is None or score < best[0]:
            best = (score, a, b)
    return [best[1]] + split_cue(best[2])

def lines(text):
    if len(text) <= LINE:
        return [text]
    words = text.split(" "); best = None
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        score = max(len(a), len(b))
        if best is None or score < best[0]:
            best = (score, a, b)
    return [best[1], best[2]]

def stamp(t, sep):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"

def main():
    tl = json.loads((ROOT / "out/voice/timeline.json").read_text())
    cues = []
    for sc in tl["scenes"]:
        for s in sc["sentences"]:
            parts = split_cue(s["text"]); total = sum(len(p) for p in parts); t = s["start"]
            for p in parts:
                d = (s["end"] - s["start"]) * len(p) / total
                cues.append((t, t + d, lines(p))); t += d
    for c in cues:
        assert all(len(l) <= LINE + 6 for l in c[2]), c
    out = ROOT / "out/subs"; out.mkdir(parents=True, exist_ok=True)
    srt = "\n".join(f"{i}\n{stamp(a, ',')} --> {stamp(b, ',')}\n" + "\n".join(ls) + "\n" for i, (a, b, ls) in enumerate(cues, 1))
    vtt = "WEBVTT\n\n" + "\n".join(f"{stamp(a, '.')} --> {stamp(b, '.')}\n" + "\n".join(ls) + "\n" for a, b, ls in cues)
    (out / "tokenisation-explainer.srt").write_text(srt, encoding="utf-8")
    (out / "tokenisation-explainer.vtt").write_text(vtt, encoding="utf-8")
    print(f"{len(cues)} cues written")

if __name__ == "__main__":
    main()
