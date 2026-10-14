#!/usr/bin/env python3
"""Encodes the rendered frames and the final mix into two MP4 files:
  out/video/tokenisation-explainer.mp4        subtitles burned in
  out/video/tokenisation-explainer-clean.mp4  no subtitles (use the .srt or .vtt file)
Both are 1920x1080, 30 fps, H.264 and AAC, sized to stay under 32 MB.
  python3 scripts/encode.py --test 3.0   # burn a short 6 second sample and save a still at 3.0 s
"""
import argparse, json, subprocess
from build_hash import build_hash
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STYLE = ("FontName=Montserrat SemiBold,FontSize=12,PrimaryColour=&H00FFFFFF,OutlineColour=&H00403734,"
         "BackColour=&H00403734,BorderStyle=3,Outline=3,Shadow=0,Alignment=2,MarginV=14,MarginL=40,MarginR=40")

def run(args):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"] + args, check=True)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--test", type=float); ap.add_argument("--only", choices=["captioned", "clean"]); a = ap.parse_args()
    fps = json.loads((ROOT / "content/script.json").read_text(encoding="utf-8"))["video"]["fps"]
    out = ROOT / "out/video"; out.mkdir(parents=True, exist_ok=True)
    subs = f"subtitles=filename=out/subs/tokenisation-explainer.srt:fontsdir=assets/fonts:force_style='{STYLE}'"
    vin = ["-framerate", str(fps), "-i", "out/frames/%05d.png"]
    venc = ["-c:v", "libx264", "-preset", "medium", "-tune", "animation", "-crf", "18", "-maxrate", "2800k", "-bufsize", "5600k",
            "-g", str(fps * 2), "-pix_fmt", "yuv420p", "-r", str(fps)]
    aenc = ["-c:a", "aac", "-b:a", "160k", "-ar", "48000"]
    meta = ["-map_metadata", "-1", "-metadata", "title=From fund to token", "-metadata", f"comment=build {build_hash(ROOT)}", "-movflags", "+faststart"]
    if a.test is not None:
        run(vin + ["-t", "6", "-vf", subs] + venc + [str(out / "test.mp4")])
        run(["-ss", str(a.test), "-i", str(out / "test.mp4"), "-frames:v", "1", str(out / "test.png")]); print("test written"); return
    if a.only != "clean":
        run(vin + ["-i", "out/audio/mix.wav", "-vf", subs] + venc + aenc + meta + ["-shortest", str(out / "tokenisation-explainer.mp4")])
    if a.only != "captioned":
        run(vin + ["-i", "out/audio/mix.wav"] + venc + aenc + meta + ["-shortest", str(out / "tokenisation-explainer-clean.mp4")])
    if not (out / "tokenisation-explainer-clean.mp4").exists():
        return
    run(["-ss", "5.0", "-i", str(out / "tokenisation-explainer-clean.mp4"), "-frames:v", "1", "-q:v", "3", str(out / "poster.jpg")])
    for f in ("tokenisation-explainer.mp4", "tokenisation-explainer-clean.mp4"):
        if (out / f).exists():
            print(f, f"{(out / f).stat().st_size / 1e6:.1f} MB")

if __name__ == "__main__":
    main()
