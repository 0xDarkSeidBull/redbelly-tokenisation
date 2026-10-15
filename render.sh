#!/bin/sh
# Rebuilds every output from content/script.json, then runs all checks.
# Needs: python3 with playwright, kokoro-onnx, soundfile, numpy, scipy, reportlab, fonttools; node with docx; ffmpeg.
set -e
cd "$(dirname "$0")"
python3 scripts/build_voice.py
python3 scripts/build_music.py
python3 scripts/fetch_sfx.py
python3 scripts/build_subs.py
python3 scripts/build_design.py
python3 scripts/render_design.py --probe
python3 scripts/build_audio.py
rm -rf out/frames60 out/video
python3 scripts/render_design.py
python3 scripts/build_captions.py
python3 scripts/encode.py
python3 scripts/build_pdf.py
node scripts/build_docx.js
python3 scripts/build_site.py
python3 scripts/check.py
