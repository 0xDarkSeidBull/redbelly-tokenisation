# Tokenisation Explainer Animation (TASK-26)

A 60 to 90 second animated explainer that follows one regulated asset, an Australian fund, from the real world asset to a compliant token on Redbelly Network through Tokeniser.

Status: sources captured. The script, video, subtitles and build files follow in later commits.

## Layout

| Path | What it holds |
|---|---|
| `sources.json` | The resource links from the task brief, plus every page captured from them |
| `evidence/` | A text snapshot of each page. `manifest.json` lists the URL, capture time (UTC) and SHA-256 of every snapshot |
| `scripts/snap_sources.py` | Recaptures the snapshots and rebuilds the manifest |

## Rules this project follows

- Every claim in the script is quoted from a supplied resource and checked against its snapshot.
- No price talk, no investment advice, no promises of returns.
- Only self made or openly licensed assets, with licence proof kept next to them.

## Recapture the sources

```
pip install playwright
playwright install chromium
python3 scripts/snap_sources.py
```
