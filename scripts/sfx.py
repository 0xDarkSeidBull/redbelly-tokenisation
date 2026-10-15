"""Coin sound made from code: a metallic swell that rises into a clink (the clink lands 0.44 s after the start)."""
import numpy as np
from scipy.signal import butter, lfilter

SR = 48000
CLINK_AT = 0.44

def _hit(rng, scale=1.0, dur=0.6, damp=1.0, bright=1.0):
    t = np.arange(int(dur * SR)) / SR; y = np.zeros_like(t)
    for f, d, a in zip([2730, 4110, 5870, 7650, 9420], [0.28, 0.18, 0.12, 0.08, 0.05], [1, 0.7, 0.5, 0.35, 0.22 * bright]):
        y += a * np.sin(2 * np.pi * f * scale * t + rng.random() * 6.28) * np.exp(-t / (d * damp))
    n = int(0.004 * SR); y[:n] += 0.7 * rng.standard_normal(n) * np.linspace(1, 0, n)
    return y

def coin_appear(seed=3):
    rng = np.random.default_rng(seed)
    swell = _hit(rng, 1.1, dur=CLINK_AT, bright=1.4)[::-1] * np.linspace(0, 1, int(CLINK_AT * SR)) ** 2
    b, a = butter(2, 1500 / (SR / 2), "high"); swell = lfilter(b, a, swell)
    out = np.zeros(int(1.0 * SR)); out[:len(swell)] += 0.7 * swell
    clink = _hit(rng, 1.05, damp=0.7); s = int(CLINK_AT * SR); out[s:s + len(clink)] += 0.5 * clink[:len(out) - s]
    return out
