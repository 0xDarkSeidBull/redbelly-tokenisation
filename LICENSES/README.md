# Licences and asset sources

Everything in the video and on the website is either made for this project or used under the licence shown here.

| Asset | Where it comes from | Licence | Proof |
|---|---|---|---|
| Voiceover | Synthetic voice from Kokoro-82M, voice af_heart | Apache License 2.0, commercial use allowed | `voice.md`, `kokoro/` |
| Font | Montserrat, static weights cut from the variable font by `fontTools` | SIL Open Font License 1.1 | `../assets/fonts/OFL.txt` (the font files also carry the licence in their metadata) |
| Music | Made from code for this video by `scripts/build_music.py`. No samples, no third party audio | Original work | the script itself |
| Sound effects | 5 Mixkit sound effects (sweep, click, tone, whoosh, coin), fetched at build time by `scripts/fetch_sfx.py` and mixed by `scripts/build_audio.py`; one blip and one buzz made from code | Mixkit Sound Effects Free License, commercial use allowed. The files are not stored here because the licence does not allow sharing them on their own | `mixkit.md` |
| Icons, illustrations, animation | Designed for this video in Claude Design, source in `scenes/design/`. Every icon is drawn in code there. No stock footage, stock icons or icon packs | Original work | the code itself |
| React 18.3.1, ReactDOM 18.3.1, Babel standalone 7.29.0 | Run the animation source at build time, from `scenes/design/vendor/` (hashes match the pinned SRI values) | MIT | `../scenes/design/vendor/LICENSE-*.txt` |
| Tokeniser logo | Official logo file from the tokeniser.com site header | Trademark of its owner, used only to name the product | `../assets/logos/tokeniser-logo.svg` |
| Redbelly logo | Horizontal colour logo from the Redbelly brand kit (redbelly.network/brand) | Trademark of its owner, supplied in the brand kit for use | `../assets/logos/redbelly-horizontal-colour.svg` |

No stock footage, stock music or paid assets are used anywhere. The only third party audio is the 5 Mixkit sound effects above.
