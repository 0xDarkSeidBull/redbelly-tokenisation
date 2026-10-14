# Tokenisation Explainer Animation (TASK-26)

A 1:23 animated explainer that follows one regulated asset, a new Australian fund, from the real world asset to a token on Redbelly Network through Tokeniser. Every fact comes from the supplied resources and is quoted word for word in the script document.

## Deliverables

| Deliverable | File |
|---|---|
| Final video, subtitles burned in (1920 x 1080, 30 fps, H.264 MP4) | `public/video/tokenisation-explainer.mp4` |
| Same video without subtitles | `public/video/tokenisation-explainer-clean.mp4` |
| Subtitles as separate files | `public/video/tokenisation-explainer.srt`, `public/video/tokenisation-explainer.vtt` |
| Script document, with the source and exact quote for every claim | `public/docs/tokenisation-explainer-script.pdf`, `public/docs/tokenisation-explainer-script.docx` |
| Project files | this repository: `content/`, `scenes/`, `scripts/`, `assets/`, `render.sh` |
| Licence proof | `LICENSES/` |

The website in `public/` plays the video and lists the script, sources and downloads. Every file it uses is served from the site itself.

## One source for everything

`content/script.json` holds the voiceover, the on screen text, the visual notes and a source quote for every claim. The voiceover, subtitles, animation, both script documents and the website are all built from it, so the video cannot drift from the script.

| Path | What it holds |
|---|---|
| `content/script.json` | The single source |
| `scenes/` | The animation: `stage.js` draws any frame from the script and the voice timeline |
| `scripts/build_voice.py` | Voiceover with Kokoro-82M, plus a sentence level timeline |
| `scripts/build_music.py`, `scripts/build_audio.py` | Music made from code, and the final mix at -16 LUFS |
| `scripts/build_subs.py` | SRT and WebVTT from the timeline |
| `scripts/build_stage.py`, `scripts/render_frames.py`, `scripts/encode.py` | Frame render in headless Chromium, then H.264 encode |
| `scripts/build_pdf.py`, `scripts/build_docx.js` | Script document as PDF and Word |
| `scripts/build_site.py` | The website in `public/` |
| `scripts/check.py` | All checks, listed below |
| `evidence/` | A text snapshot of every source page, with `manifest.json` (URL, capture time in UTC, SHA-256) |
| `assets/` | Font files and the 2 official logos |

## Rebuild and check

```
./render.sh
```

`render.sh` runs every build step and then `scripts/check.py`. To only run the checks: `python3 scripts/check.py`. The voice model files are listed in `LICENSES/voice.md`.

`check.py` confirms that every quote is in its source snapshot, that the subtitles and both documents say exactly what the script says, that both videos are 1920 x 1080 at 30 fps, 60 to 90 seconds and under 32 MB, that loudness is about -16 LUFS, that no dash, emoji, price talk or hype word is used, and that the website loads nothing from outside its own domain.

## Recapture the sources

```
playwright install chromium
python3 scripts/snap_sources.py
```
