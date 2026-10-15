#!/usr/bin/env python3
"""Polishes the voice (EQ, gentle compression, de-essing, a small room), adds sound effects (whooshes at scene changes; a sound on every check, cross, lock and toggle, and a coin sound
(sfx.py) when a coin appears or lands, timed by render_design.py --probe),
and mixes it with the music. Music sits well under the voice and dips further while someone speaks.
Final mix is loudness normalised to -16 LUFS, true peak -1.5 dBTP. Writes out/audio/mix.wav (48 kHz stereo)."""
import json, subprocess
from sfx import coin_appear, CLINK_AT
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
    ev = ROOT / "out/audio/sfx_events.json"
    events = json.loads(ev.read_text()) if ev.exists() else []
    def blip(f0, f1, dur, decay):
        L = int(dur * SR); t = np.arange(L) / SR; ph = 2 * np.pi * np.cumsum(np.linspace(f0, f1, L)) / SR
        return np.sin(ph) * (1 - np.exp(-t / 0.003)) * np.exp(-t / decay)
    def bell(freqs, dur, decay):
        L = int(dur * SR); t = np.arange(L) / SR
        return sum(np.sin(2 * np.pi * f * t) * 0.6 ** i for i, f in enumerate(freqs)) * (1 - np.exp(-t / 0.002)) * np.exp(-t / decay)
    def mixa(*ys):
        out = np.zeros(max(len(y) for y in ys))
        for y in ys:
            out[:len(y)] += y
        return out
    def swish(dur):
        L = int(dur * SR); t = np.linspace(0, 1, L); env = np.sin(np.pi * t) ** 1.5; noise = rng.standard_normal(L); y = np.zeros(L); acc = 0.0
        for j in range(L):
            acc += (0.03 + 0.35 * t[j]) * (noise[j] - acc); y[j] = acc
        return y * env
    COIN = coin_appear(); OFFS = {"form": -0.30, "coin": -0.30, "land": -CLINK_AT}
    SND = {"ok": (mixa(blip(1200, 1800, 0.10, 0.03), 0.4 * blip(2400, 2400, 0.03, 0.006)), -19), "no": (blip(220, 110, 0.25, 0.08), -18),
           "lock": (blip(1800, 1600, 0.06, 0.012), -21), "coin": (COIN, -20),
           "form": (COIN, -20),
           "land": (COIN, -20), "toggle": (mixa(blip(2600, 2300, 0.035, 0.008), 0.6 * blip(500, 380, 0.05, 0.02)), -20)}
    cuts = [(sc[i]["end"] + sc[i + 1]["start"]) / 2 for i in range(len(sc) - 1)]
    tp = ROOT / "out/audio/token_tracks.json"
    for uid, pts in (json.loads(tp.read_text()) if tp.exists() else {}).items():
        segs = []
        for p0, p1 in zip(pts, pts[1:]):
            v = ((p1[1] - p0[1]) ** 2 + (p1[2] - p0[2]) ** 2) ** 0.5
            if v > 3 and p1[4] > 0.3:
                if segs and p1[0] - segs[-1]["end"] < 0.3:
                    g = segs[-1]; g["end"] = p1[0]; g["dist"] += v; g["xe"], g["effe"] = p1[1], p1[4]
                else:
                    segs.append({"start": p0[0], "end": p1[0], "dist": v, "x0": p0[1], "xe": p1[1], "effe": p1[4]})
        for g in segs:
            if g["end"] - g["start"] < 0.25 or g["dist"] < 120:
                continue
            if min(abs(g["start"] - c) for c in cuts) >= 0.6:
                events.append({"t": g["start"], "kind": "move", "x": g["x0"]})
            if g["effe"] > 0.5:
                events.append({"t": g["end"], "kind": "land", "x": g["xe"]})
    events = [e for e in events if e["kind"] != "move"]
    events.sort(key=lambda e: e["t"]); kept, lastk = [], {}
    for e in events:
        if e["t"] - lastk.get(e["kind"], -9) >= 0.25:
            kept.append(e); lastk[e["kind"]] = e["t"]
    events = kept
    print("sound cues:", {k: sum(1 for e in events if e["kind"] == k) for k in sorted({e["kind"] for e in events})})
    def place(y, t, pan, db):
        y = y * vrms * 10 ** (db / 20) / (np.sqrt(np.mean(y ** 2)) + 1e-9); s0 = int(t * SR); e0 = min(n, s0 + len(y))
        if 0 <= s0 < n:
            sfx[s0:e0, 0] += y[:e0 - s0] * (1 - pan); sfx[s0:e0, 1] += y[:e0 - s0] * pan
    for e in events:
        y, db = SND[e["kind"]]; place(y, e["t"] + OFFS.get(e["kind"], 0), 0.25 + 0.5 * min(max(e["x"] / 1920, 0), 1), db)
    close = (sc[-2]["end"] + sc[-1]["start"]) / 2 + 0.3
    place(COIN, close - 0.14, 0.5, -20)
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
