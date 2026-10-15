#!/usr/bin/env python3
"""Polishes the voice (EQ, gentle compression, de-essing, a small room), adds sound effects
(Mixkit samples fetched by scripts/fetch_sfx.py: a soft sweep at each scene change, a click on every check, toggle and lock,
a tone when the last token lands and as the voice ends; a low synthesised blip on each rejected transfer),
all timed by render_design.py --probe, plus the extra whoosh, coin, sweep, click and buzz cues listed in content/sfx_cues.json, clearly audible but under the voice,
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
    def sample(name):
        y, r = sf.read(ROOT / "assets/sfx" / name, dtype="float64")
        y = y.mean(axis=1) if y.ndim > 1 else y
        if r != SR:
            from scipy.signal import resample_poly
            y = resample_poly(y, SR, r)
        a = np.abs(y); keep = np.nonzero(a > a.max() * 10 ** (-50 / 20))[0]
        return y[keep[0]:keep[-1] + 1]  # trim leading and trailing silence
    SWEEP, CLICK, TONE = sample("sweep.wav"), sample("click.wav"), sample("tone.wav")
    def buzz():
        # "Eh eh" error buzzer made from code: two short band limited sawtooth buzzes, 88 Hz then 75 Hz.
        out = []
        for f0, dur in ((88, 0.09), (75, 0.13)):
            t = np.arange(int(dur * SR)) / SR
            y = sum(np.sin(2 * np.pi * f0 * h * t) / h for h in range(1, int(20000 / f0))) + 0.8 * np.sin(2 * np.pi * f0 * t)
            out += [y * np.minimum(1, t / 0.004) * np.minimum(1, (dur - t) / 0.012), np.zeros(int(0.02 * SR))]
        return np.concatenate(out[:-1])
    LIB = {"sweep": SWEEP, "click": CLICK, "tone": TONE, "whoosh": sample("whoosh.wav"), "coin": sample("coin.wav"), "buzz": buzz()}
    def level(y, db):
        # loudness of the effect while it sounds, relative to the voice while it speaks
        act = y[np.abs(y) > np.max(np.abs(y)) * 0.05]
        return y * vrms * 10 ** (db / 20) / (np.sqrt(np.mean(act ** 2)) + 1e-9)
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
    SND = {"ok": (CLICK, 2), "toggle": (CLICK, 1), "lock": (CLICK, 2), "no": (blip(220, 110, 0.25, 0.08), -1)}
    cuts = [(sc[i]["end"] + sc[i + 1]["start"]) / 2 for i in range(len(sc) - 1)]
    coins = [e for e in events if e["kind"] == "coin"]
    events = [e for e in events if e["kind"] in SND]
    events.sort(key=lambda e: e["t"]); kept, lastk = [], {}
    for e in events:
        if e["t"] - lastk.get(e["kind"], -9) >= 0.25:
            kept.append(e); lastk[e["kind"]] = e["t"]
    events = kept
    print("sound cues:", {k: sum(1 for e in events if e["kind"] == k) for k in sorted({e["kind"] for e in events})})
    def place(y, t, pan, db):
        y = level(y, db); s0 = int(t * SR); e0 = min(n, s0 + len(y))
        if 0 <= s0 < n:
            sfx[s0:e0, 0] += y[:e0 - s0] * (1 - pan); sfx[s0:e0, 1] += y[:e0 - s0] * pan
    for e in events:
        y, db = SND[e["kind"]]; place(y, e["t"], 0.25 + 0.5 * min(max(e["x"] / 1920, 0), 1), db)
    # Scene changes: one soft sweep each, centred on the cut.
    for c in cuts:
        place(SWEEP, c - len(SWEEP) / SR / 2, 0.5, -2)
    # Two accents: a tone when the last token lands in its verified wallet, and as the voice ends and tokeniser.com appears.
    if coins:
        last = max(coins, key=lambda e: e["t"])
        place(TONE, last["t"] + 0.12, 0.25 + 0.5 * min(max(last["x"] / 1920, 0), 1), 3)
    place(TONE, sc[-1]["end"] + 0.3, 0.5, 2)
    # Extra cues: whooshes on the slides and toggles, coins as the fund forms, extra clicks on the check lists, a buzz on a blocked transfer.
    extra = json.loads((ROOT / "content/sfx_cues.json").read_text())["cues"]
    for c in extra:
        place(LIB[c["sound"]], c["t"], c["pan"], c["db"])
    # Effects step back 2 dB while the voice speaks, so every word stays on top.
    sfx *= (1 - 0.2 * speech)[:, None]
    print(f"effects: {len(cuts)} sweeps, {len(events)} clicks and blips, 2 tones, {len(extra)} extra cues")
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
