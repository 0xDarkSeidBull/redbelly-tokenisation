#!/usr/bin/env python3
"""Builds the voiceover from content/script.json with Kokoro-82M (ONNX build, Apache-2.0).

Put the model files in models/ (download links and SHA-256 are in LICENSES/voice.md):
  models/kokoro-v1.0.onnx  models/voices-v1.0.bin
Writes out/voice/voiceover.wav and out/voice/timeline.json (sentence and scene timings).
Each sentence is synthesised on its own, so subtitle times are exact.
"""
import hashlib, json
from pathlib import Path
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out/voice"
CACHE = OUT / "cache"
SR = 24000

def trim(a, thr=0.003, pad=0.03):
    idx = np.where(np.abs(a) > thr)[0]
    if not len(idx):
        return a
    p = int(pad * SR)
    return a[max(idx[0] - p, 0): min(idx[-1] + p, len(a))]

def main():
    s = json.loads((ROOT / "content/script.json").read_text(encoding="utf-8"))
    v, t = s["voice"], s["timing"]
    CACHE.mkdir(parents=True, exist_ok=True)
    engine = None

    def tts(text):
        nonlocal engine
        key = hashlib.sha256(json.dumps([text, v["voice"], v["lang"], v["speed"]]).encode()).hexdigest()[:16]
        f = CACHE / f"{key}.wav"
        if not f.exists():
            if engine is None:
                from kokoro_onnx import Kokoro
                engine = Kokoro(str(ROOT / "models/kokoro-v1.0.onnx"), str(ROOT / "models/voices-v1.0.bin"))
            a, sr = engine.create(text, voice=v["voice"], speed=v["speed"], lang=v["lang"])
            assert sr == SR
            sf.write(f, a, sr)
        a, sr = sf.read(f, dtype="float32")
        return trim(a)

    sil = lambda sec: np.zeros(int(round(sec * SR)), dtype="float32")
    parts, cur = [sil(t["lead_in"])], t["lead_in"]
    scenes = []
    for si, sc in enumerate(s["scenes"]):
        if si:
            parts.append(sil(t["gap_scene"])); cur += t["gap_scene"]
        start, sents = cur, []
        for i, line in enumerate(sc["vo"]):
            if i:
                parts.append(sil(t["gap_sentence"])); cur += t["gap_sentence"]
            a = tts(line)
            parts.append(a)
            sents.append({"text": line, "start": round(cur, 3), "end": round(cur + len(a) / SR, 3)})
            cur += len(a) / SR
        scenes.append({"id": sc["id"], "start": round(start, 3), "end": round(cur, 3), "sentences": sents})
    parts.append(sil(t["tail"])); cur += t["tail"]
    audio = np.concatenate(parts)
    sf.write(OUT / "voiceover.wav", audio, SR)
    timeline = {"total_seconds": round(cur, 3), "speech_seconds": round(sum(x["end"] - x["start"] for sc in scenes for x in sc["sentences"]), 3),
                "voice": v, "timing": t, "scenes": scenes}
    (OUT / "timeline.json").write_text(json.dumps(timeline, indent=1))
    print(f"total {cur:.1f}s, speech {timeline['speech_seconds']:.1f}s")
    for sc in scenes:
        print(f"  {sc['id']}  {sc['start']:6.2f} to {sc['end']:6.2f}  ({sc['end'] - sc['start']:.1f}s)")

if __name__ == "__main__":
    main()
