#!/usr/bin/env python3
"""خلفية صوتية لفيديو الشرح: باد هادي + بلك خفيف + نقرة عند كل ضغطة. كله مركّب بـ numpy (بلا حقوق).
python3 mix.py renders  → renders/audio.wav"""
import sys, json, wave
import numpy as np
from scipy import signal

SR = 48000
d = sys.argv[1]
meta = json.load(open(f"{d}/taps.json"))
L = meta["length"]
n = int(L * SR)
t = np.arange(n) / SR
rng = np.random.default_rng(7)
mix = np.zeros((n, 2))

def hz(m): return 440 * 2 ** ((m - 69) / 12)

# A minor: Am – F – C – G، كل كورد بارين (4.8 ث على 100bpm)
beat = 60 / 100
chords = [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]]
bar = beat * 4
pad = np.zeros(n)
for i in range(int(L / (bar * 2)) + 1):
    s0, s1 = i * bar * 2, min(L, (i + 1) * bar * 2 + 0.4)
    a, b = int(s0 * SR), int(s1 * SR)
    if a >= n: break
    tt = np.arange(b - a) / SR
    env = np.minimum(1, tt / 0.8) * np.minimum(1, (s1 - s0 - tt) / 0.6).clip(0, 1)
    for m in chords[i % 4]:
        for det in (-0.08, 0.08):
            f = hz(m) * 2 ** (det / 12)
            pad[a:b][: len(tt)] += (signal.sawtooth(2 * np.pi * f * tt + rng.uniform(0, 6)) * env)[: n - a]
sos = signal.butter(2, 900, "low", fs=SR, output="sos")
pad = signal.sosfilt(sos, pad) * 0.05
mix[:, 0] += pad; mix[:, 1] += pad

# بلك ثُمن (eighth) من نوتات الكورد، يبدأ بعد الهوك
step = beat / 2
k = 0
while k * step < L - 4:
    s = 3.8 + k * step
    if s > L - 4.5: break
    ch = chords[int(s / (bar * 2)) % 4]
    m = ch[[0, 1, 2, 1][k % 4]] + 12
    a = int(s * SR); ln = int(0.5 * SR)
    tt = np.arange(ln) / SR
    v = np.sin(2 * np.pi * hz(m) * tt) * np.exp(-tt * 9) * (0.05 if k % 2 == 0 else 0.032)
    pan = 0.35 if k % 2 else -0.35
    seg = slice(a, min(n, a + ln)); w = seg.stop - seg.start
    mix[seg, 0] += v[:w] * (1 - pan); mix[seg, 1] += v[:w] * (1 + pan)
    k += 1

# نقرة لكل ضغطة (تيك ناعم + تون قصير)
for tp in meta["taps"]:
    a = int((tp + 0.38) * SR); ln = int(0.09 * SR)
    if a + ln > n: continue
    tt = np.arange(ln) / SR
    noise = signal.sosfilt(signal.butter(2, [2500, 7000], "band", fs=SR, output="sos"), rng.standard_normal(ln))
    v = noise * np.exp(-tt * 70) * 0.18 + np.sin(2 * np.pi * 1400 * tt) * np.exp(-tt * 45) * 0.08
    mix[a:a + ln, 0] += v; mix[a:a + ln, 1] += v

# fade + معايرة تقريبية (RMS ≈ -18 dBFS)، وسقف ‎-1 dB
fade = np.minimum(1, t / 0.6) * np.minimum(1, (L - t) / 2.0).clip(0, 1)
mix *= fade[:, None]
rms = np.sqrt((mix ** 2).mean())
mix *= 10 ** (-18 / 20) / rms
mix = np.clip(mix, -0.89, 0.89)
with wave.open(f"{d}/audio.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("audio", round(L, 2), "s")
