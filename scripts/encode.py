#!/usr/bin/env python3
"""Encodes the 60 fps frames and the final mix into:
  out/video/tokenisation-explainer.mp4        brand style subtitles overlaid
  out/video/tokenisation-explainer-clean.mp4  no subtitles (use the .srt or .vtt file)
Both 1920x1080, 60 fps, H.264 and AAC, capped to stay under 32 MB, stamped with the build hash.
Video is encoded in segments (resumable with --budget), then joined without re-encoding and muxed with the audio.
"""
import argparse, json, subprocess, time
from pathlib import Path
from build_hash import build_hash

ROOT = Path(__file__).resolve().parent.parent
FPS, SEG = 60, 1260
OUT = ROOT / "out/video"

def run(args):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"] + args, check=True, cwd=ROOT)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--budget", type=float, default=0); a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True); t0 = time.time()
    n = int((ROOT / "out/frames60/DONE").read_text())
    cues = json.loads((ROOT / "out/captions/cues.json").read_text())
    venc = ["-c:v", "libx264", "-preset", "medium", "-tune", "animation", "-crf", "18", "-maxrate", "2800k", "-bufsize", "5600k",
            "-g", str(FPS * 2), "-pix_fmt", "yuv420p", "-r", str(FPS), "-an"]
    segs = [(s, min(SEG, n - s)) for s in range(0, n, SEG)]
    for variant in ("captioned", "clean"):
        for i, (s, k) in enumerate(segs):
            f = OUT / f"seg_{variant}_{i}.mp4"
            if f.exists():
                continue
            if a.budget and time.time() - t0 > a.budget:
                print("budget reached, run again to continue"); return
            vin = ["-framerate", str(FPS), "-start_number", str(s), "-i", "out/frames60/%05d.png"]
            if variant == "captioned":
                lo, hi = s / FPS, (s + k) / FPS
                use = [c for c in cues if c["end"] > lo and c["start"] < hi]
                ins, chain, last = [], [], "0:v"
                for j, c in enumerate(use):
                    ins += ["-i", f"out/captions/{c['file']}"]
                    chain.append(f"[{last}][{j + 1}:v]overlay=0:0:enable='between(t,{c['start'] - lo:.4f},{c['end'] - lo:.4f})'[v{j}]"); last = f"v{j}"
                args = vin + ins + (["-filter_complex", ";".join(chain), "-map", f"[{last}]"] if chain else [])
            else:
                args = vin
            run(args + ["-frames:v", str(k)] + venc + [str(f.with_suffix(".tmp.mp4"))]); f.with_suffix(".tmp.mp4").rename(f)
            print(f"{variant} segment {i + 1}/{len(segs)} done", flush=True)
    meta = ["-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-map_metadata", "-1", "-metadata", "title=From fund to token",
            "-metadata", f"comment=build {build_hash(ROOT)}", "-movflags", "+faststart", "-shortest"]
    for variant, name in (("captioned", "tokenisation-explainer.mp4"), ("clean", "tokenisation-explainer-clean.mp4")):
        lst = OUT / f"seg_{variant}.txt"
        lst.write_text("".join(f"file '{OUT / f'seg_{variant}_{i}.mp4'}'\n" for i in range(len(segs))))
        run(["-f", "concat", "-safe", "0", "-i", str(lst), "-i", "out/audio/mix.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy"] + meta + [str(OUT / name)])
        print(name, f"{(OUT / name).stat().st_size / 1e6:.1f} MB")
    run(["-ss", "5.0", "-i", str(OUT / "tokenisation-explainer-clean.mp4"), "-frames:v", "1", "-q:v", "3", str(OUT / "poster.jpg")])

if __name__ == "__main__":
    main()
