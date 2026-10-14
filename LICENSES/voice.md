# Voice licence proof

The voiceover is synthetic speech from Kokoro-82M, voice af_heart. No voice actor, recording or paid voice service was used.

| Item | Licence | Proof in this folder |
|---|---|---|
| Kokoro-82M model weights and voice pack, including af_heart | Apache License 2.0, which allows commercial use | `kokoro/kokoro-82m-licence-excerpt.txt`, `kokoro/Apache-2.0.txt` |
| kokoro-onnx, the runtime that runs the model | MIT | `kokoro/kokoro-onnx-LICENSE.txt` |

Model card: https://huggingface.co/hexgrad/Kokoro-82M
Voice list, where af_heart is listed: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md

Build tools: text is turned into phonemes by phonemizer with espeak-ng (both GPL-3.0). They run only at build time, and no part of them ships in the audio or the video.

## Model files

Put both files in `models/` before running `scripts/build_voice.py`.

| File | Download | SHA-256 |
|---|---|---|
| kokoro-v1.0.onnx | https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx | `7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5` |
| voices-v1.0.bin | https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin | `bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d` |

Voice settings used are under `voice` in `content/script.json`.
