#!/usr/bin/env python3
"""Polishes the voice (EQ, gentle compression, de-essing, a small room), adds soft whooshes at scene changes,
and mixes it with the music. Music sits well under the voice and dips further while someone speaks.
Final mix is loudness normalised to -16 LUFS, true peak -1.5 dBTP. Writes out/audio/mix.wav (48 kHz stereo)."""
import json, subprocess
from pathlib import Path
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SR = 48000

def main():
    tl = json.loads((ROOT / "out/voice/timeline.json").read_text())
    pol = ROOT / "out/audio/voice_polished.wav"; (ROOT / "out/audio").mkdir(parents=True, exist_ok=True)
    chain = ("highpass=f=70,equalizer=f=250:t=q:w=1:g=-2,equalizer=f=3200:t=q:w=1.2:g=2.5,equalizer=f=9500:t=q:w=1.5:g=1.5,"
             "acompressor=threshold=-20dB:ratio=3:attack=6:release=120:makeup=2,deesser=i=0.35,aecho=0.85:0.35:24|41:0.10|0.06,aresample=48000")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(ROOT / "out/voice/voiceover.wav"), "-af", chain, str(pol)], check=True)
    vo, vsr = sf.read(pol, dtype="float64"); assert vsr == SR
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
    rng = np.random.default_rng(7); sc = tl["scenes"]; sfx = np.zeros((n, 2))
    for i in range(len(sc) - 1):
        cut = (sc[i]["end"] + sc[i + 1]["start"]) / 2; L = int(0.8 * SR); s0 = int(cut * SR) - L // 2
        if s0 < 0 or s0 + L > n:
            continue
        t = np.linspace(0, 1, L); env = np.sin(np.pi * t) ** 2
        noise = rng.standard_normal(L); y = np.zeros(L); acc = 0.0
        for j in range(L):
            k = 0.02 + 0.25 * env[j]; acc += k * (noise[j] - acc); y[j] = acc
        y *= env / (np.max(np.abs(y)) + 1e-9)
        sfx[s0:s0 + L, 0] += y * (1 - 0.6 * t); sfx[s0:s0 + L, 1] += y * (0.4 + 0.6 * t)
    sfx *= vrms * 10 ** (-17 / 20) / (np.sqrt(np.mean(sfx[np.abs(sfx).sum(1) > 0] ** 2)) + 1e-9)
    mix = mu * gain[:, None] + vo[:, None] + sfx
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
