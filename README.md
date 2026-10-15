# Tokenisation Explainer Animation (TASK-26)

A 1:23 animated explainer, 60 fps, that follows one regulated asset, a new Australian fund, from the real world asset to a token on Redbelly Network through Tokeniser. Every fact comes from the supplied resources and is quoted word for word in the script document.

## Deliverables

| Deliverable | File |
|---|---|
| Final video, subtitles shown in the frame (1920 x 1080, 60 fps, H.264 MP4) | `public/video/tokenisation-explainer.mp4` |
| Same video without subtitles | `public/video/tokenisation-explainer-clean.mp4` |
| Subtitles as separate files | `public/video/tokenisation-explainer.srt`, `public/video/tokenisation-explainer.vtt` |
| Script document, with the source and exact quote for every claim | `public/docs/tokenisation-explainer-script.pdf`, `public/docs/tokenisation-explainer-script.docx` |
| Project files | this repository: `content/`, `scenes/design/` (the Claude Design animation source), `scripts/`, `assets/`, `render.sh` |
| Licence proof | `LICENSES/` |

The website in `public/` plays the video and lists the script, sources and downloads. Every file it uses is served from the site itself.

## One source for everything

`content/script.json` holds the voiceover, the on screen text, the words inside the illustrations (`ui_text`), the visual notes and a source quote for every claim. The voiceover, subtitles, animation, both script documents and the website are all built from it, so the video cannot drift from the script.

| Path | What it holds |
|---|---|
| `content/script.json` | The single source |
| `scenes/design/` | The animation, designed in Claude Design. `explainer.jsx` draws any frame from `tk-data.js`, which `scripts/build_design.py` writes from the script and the voice timeline. React, ReactDOM and Babel run from `vendor/`, no CDN |
| `scripts/build_voice.py` | Voiceover with Kokoro-82M, plus a sentence level timeline |
| `scripts/build_music.py`, `scripts/build_audio.py` | Music made from code, voice polish, sound effects made from code and timed to every pop in the animation, final mix at -16 LUFS |
| `scripts/build_subs.py` | SRT and WebVTT from the timeline |
| `scripts/build_design.py`, `scripts/render_design.py` | Builds the animation and renders all 5016 frames at 60 fps, each a seek to its exact time |
| `scripts/build_captions.py`, `scripts/encode.py` | Subtitle overlays in the brand style, then H.264 encode of both videos |
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

`check.py` confirms that every quote is in its source snapshot, that the subtitles and both documents say exactly what the script says, that each video carries the build hash of the current script and animation code, that both videos are 1920 x 1080 at 60 fps, 60 to 90 seconds and under 32 MB, that loudness is about -16 LUFS, that no dash, emoji, price talk or hype word is used, and that the website loads nothing from outside its own domain.

## Recapture the sources

```
playwright install chromium
python3 scripts/snap_sources.py
```
