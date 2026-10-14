#!/usr/bin/env python3
"""Mixes voiceover and music. Music sits well under the voice and dips further while someone speaks.
Final mix is loudness normalised to -16 LUFS, true peak -1.5 dBTP. Writes out/audio/mix.wav (48 kHz stereo)."""
import json, subprocess
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

ROOT = Path(__file__).resolve().parent.parent
SR = 48000

def main():
    tl = json.loads((ROOT / "out/voice/timeline.json").read_text())
    vo, vsr = sf.read(ROOT / "out/voice/voiceover.wav", dtype="float64")
    assert vsr == 24000
    vo = resample_poly(vo, 2, 1)
    mu, msr = sf.read(ROOT / "out/audio/music.wav", dtype="float64"); assert msr == SR
    n = min(len(vo), len(mu)); vo, mu = vo[:n], mu[:n]
    speech = np.zeros(n)
    for sc in tl["scenes"]:
        for s in sc["sentences"]:
            speech[int(s["start"] * SR):int(s["end"] * SR)] = 1
    k = int(0.3 * SR); speech = np.convolve(speech, np.ones(k) / k, mode="same")
    vrms = np.sqrt(np.mean(vo[speech > 0.5] ** 2)); mrms = np.sqrt(np.mean(mu ** 2))
    g_speech, g_gap = vrms / mrms * 10 ** (-19 / 20), vrms / mrms * 10 ** (-12 / 20)
    gain = g_gap + (g_speech - g_gap) * speech
    mix = mu * gain[:, None] + vo[:, None]
    out = ROOT / "out/audio"; raw = out / "mix_raw.wav"
    sf.write(raw, (mix / np.max(np.abs(mix)) * 0.7).astype("float32"), SR)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(raw), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = json.loads(r.stderr[r.stderr.rindex("{"):])
    af = (f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
          f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(raw), "-af", af, "-ar", str(SR), str(out / "mix.wav")], check=True)
    print(f"mix written, music sits {20 * np.log10(g_speech * mrms / vrms):.0f} dB under the voice while speaking")

if __name__ == "__main__":
    main()
