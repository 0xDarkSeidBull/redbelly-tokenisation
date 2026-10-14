# Tokenisation Explainer Animation (TASK-26)

A 60 to 90 second animated explainer that follows one regulated asset, a new Australian fund, from the real world asset to a compliant token on Redbelly Network through Tokeniser.

Status: script draft 1 is in, with a source quote for every claim and a voiceover build. Video, subtitles and the script document follow.

## Layout

| Path | What it holds |
|---|---|
| `content/script.json` | The single source for everything: voiceover sentences, on screen text, visual notes, and a source quote for every claim |
| `scripts/check.py` | Runs all checks: quotes against snapshots, snapshot SHA-256, wording rules, personal credit, timing |
| `scripts/build_voice.py` | Builds the voiceover and a sentence level timeline from the script |
| `scripts/snap_sources.py` | Recaptures the source snapshots |
| `sources.json` | Resource links from the brief, plus every page captured from them |
| `evidence/` | A text snapshot of each page. `manifest.json` lists the URL, capture time (UTC) and SHA-256 of each |
| `LICENSES/` | Licence proof for the voice. Fonts and music follow |

## Build and check

```
pip install playwright kokoro-onnx soundfile numpy
python3 scripts/build_voice.py
python3 scripts/check.py
```

`build_voice.py` needs the 2 model files listed in `LICENSES/voice.md`, placed in `models/`.

## Rules this project follows

- Every claim in the script is quoted from a supplied resource and checked against its snapshot.
- No price talk, no investment advice, no promises of returns.
- Only self made or openly licensed assets, with licence proof in `LICENSES/`.

## Recapture the sources

```
playwright install chromium
python3 scripts/snap_sources.py
```
