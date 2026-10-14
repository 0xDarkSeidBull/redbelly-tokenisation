#!/bin/sh
# Rebuilds every output from content/script.json, then runs all checks.
# Needs: python3 with playwright, kokoro-onnx, soundfile, numpy, scipy, reportlab, fonttools; node with docx; ffmpeg with libass.
set -e
cd "$(dirname "$0")"
python3 scripts/build_voice.py
python3 scripts/build_music.py
python3 scripts/build_audio.py
python3 scripts/build_subs.py
python3 scripts/build_stage.py
rm -rf out/frames
python3 scripts/render_frames.py
python3 scripts/encode.py
python3 scripts/build_pdf.py
node scripts/build_docx.js
python3 scripts/build_site.py
python3 scripts/check.py
