#!/usr/bin/env python3
"""Synthesises the background music from code: a soft major key pad, bass and light plucks.
Made for this project, so no licence is needed. Writes out/audio/music.wav (48 kHz stereo)."""
import json
from pathlib import Path
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
CHORDS = [[48, 52, 55, 59, 64], [45, 48, 52, 55, 60], [41, 45, 48, 52, 57], [43, 47, 50, 55, 62]]  # Cmaj7 Am7 Fmaj7 G
CHORD_SEC = 5.2

def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)

def env(n, a, r):
    e = np.ones(n); ai, ri = min(int(a * SR), n // 2), min(int(r * SR), n // 2)
    e[:ai] = np.linspace(0, 1, ai) ** 2; e[-ri:] *= np.linspace(1, 0, ri) ** 2
    return e

def tone(f, n, detune=0.0, harm=(1.0, 0.22, 0.08)):
    t = np.arange(n) / SR; out = np.zeros(n)
    for k, a in enumerate(harm, 1):
        for c in (-detune, detune):
            out += a * np.sin(2 * np.pi * f * k * (2 ** (c / 1200)) * t + k * 0.7)
    return out / (2 * sum(harm))

def main():
    total = json.loads((ROOT / "out/voice/timeline.json").read_text())["total_seconds"]
    n = int(total * SR) + 1
    L, R = np.zeros(n), np.zeros(n)
    rng = np.random.default_rng(26)
    k = 0; t0 = 0.0
    while t0 < total:
        notes = CHORDS[k % 4]; s = int(t0 * SR); dur = CHORD_SEC + 1.6; m = min(int(dur * SR), n - s)
        e = env(m, 1.2, 1.6)
        for j, note in enumerate(notes):
            v = tone(hz(note), m, detune=4) * e * 0.16
            pan = 0.5 + (j - 2) * 0.12
            L[s:s + m] += v * (1 - pan); R[s:s + m] += v * pan
        b = tone(hz(notes[0] - 12), m, harm=(1.0, 0.1)) * e * 0.20
        L[s:s + m] += b; R[s:s + m] += b
        beat = 60 / 69.0
        for q in range(int(CHORD_SEC / beat)):
            if q % 2:
                continue
            ps = s + int(q * beat * SR); pm = min(int(1.4 * SR), n - ps)
            if pm <= 0:
                continue
            note = notes[1 + (q // 2) % 4] + 24
            pl = tone(hz(note), pm, harm=(1.0, 0.3)) * np.exp(-np.arange(pm) / (0.35 * SR)) * 0.05
            pan = 0.3 + 0.4 * rng.random()
            L[ps:ps + pm] += pl * (1 - pan); R[ps:ps + pm] += pl * pan
        k += 1; t0 += CHORD_SEC
    ir_n = int(2.2 * SR); decay = np.exp(-np.arange(ir_n) / (0.45 * SR))
    for ch in (L, R):
        ir = rng.standard_normal(ir_n) * decay * 0.02; ir[0] = 1.0
        wet = np.fft.irfft(np.fft.rfft(ch, n + ir_n) * np.fft.rfft(ir, n + ir_n))[:n]
        ch[:] = 0.7 * ch + 0.3 * wet / (np.max(np.abs(wet)) + 1e-9) * np.max(np.abs(ch))
    fade = np.ones(n); fi, fo = int(1.5 * SR), int(3.0 * SR)
    fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
    st = np.stack([L * fade, R * fade], axis=1); st /= np.max(np.abs(st)) / 0.89
    (ROOT / "out/audio").mkdir(parents=True, exist_ok=True)
    sf.write(ROOT / "out/audio/music.wav", st.astype("float32"), SR)
    print(f"music {total:.1f}s written")

if __name__ == "__main__":
    main()
