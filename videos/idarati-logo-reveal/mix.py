#!/usr/bin/env python3
"""صوت كشف الشعار: صعود مع البرج، ضربة عند الغطاء، رنّة عند الاسم، وباد هادي. كله numpy (بلا حقوق).
python3 mix.py renders  → renders/audio.wav"""
import sys, json, wave
import numpy as np
from scipy import signal

SR = 48000
d = sys.argv[1]
L = json.load(open(f"{d}/meta.json"))["length"]
n = int(L * SR); t = np.arange(n) / SR
rng = np.random.default_rng(3)
mix = np.zeros(n)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)

def put(at, x, g=1.0):
    a = int(at * SR); b = min(n, a + len(x))
    if a < n: mix[a:b] += g * x[: b - a]

def bell(f, dur=2.5):
    tt = np.arange(int(dur * SR)) / SR
    return (np.sin(2*np.pi*f*tt) + .4*np.sin(2*np.pi*f*2.01*tt) + .15*np.sin(2*np.pi*f*3.02*tt)) * np.exp(-tt*2.2) * np.minimum(1, tt/0.004)

# صعود 0.2→2.9: ضجيج مفلتر يفتح + نغمة تطلع
a, b = int(0*SR), int(1.55*SR); tt = np.arange(b-a)/SR; k = tt/tt[-1]
noise = rng.standard_normal(b-a)
sos = signal.butter(2, [300, 4000], btype="band", fs=SR, output="sos")
rise = signal.sosfilt(sos, noise) * (k**2) * .25
f = 110 + 330*k**2
rise += np.sin(2*np.pi*np.cumsum(f)/SR) * k**1.5 * .2
mix[a:b] += rise

# ضربة الغطاء 2.95: ثمب منخفض + جرس
tt = np.arange(int(1.5*SR))/SR
put(1.6, np.sin(2*np.pi*(55+60*np.exp(-tt*18))*tt) * np.exp(-tt*5) * .9)
put(1.6, bell(hz(74)), .25)
# فتحات التهوية: ثلاث نقرات ناعمة
for i, at in enumerate([1.45, 1.58, 1.71]):
    put(at, bell(hz(86 + i*2), .4), .06)
# رنّة الاسم 4.2: أربيجو D
for i, m in enumerate([62, 66, 69, 74]):
    put(2.55 + i*.12, bell(hz(m), 2.2), .18)

# باد من 3.6 لين النهاية: Dmaj ← Bm ← G ← A
pad = np.zeros(n)
for j, ch in enumerate([[50,57,62,66],[47,54,59,62],[43,50,55,59],[45,52,57,61]]):
    s0 = 2.2 + j*2.2; s1 = s0 + 2.6 if j < 3 else L
    a, b = int(s0*SR), min(n, int(s1*SR)); tt = np.arange(b-a)/SR
    env = np.minimum(1, tt/.7) * np.clip((s1-s0-tt)/.7, 0, 1)
    for m in ch:
        pad[a:b] += env * (np.sin(2*np.pi*hz(m)*tt) + .3*np.sin(2*np.pi*hz(m)*1.003*tt)) * .05
mix += pad

# طيران الشعار للجوال 8.6: ووش
a, b = int(6.45*SR), int(7.5*SR); tt = np.arange(b-a)/SR; k = tt/tt[-1]
w = signal.sosfilt(signal.butter(2, 1200, btype="low", fs=SR, output="sos"), rng.standard_normal(b-a))
mix[a:b] += w * np.sin(np.pi*k)**2 * .35
put(7.2, bell(hz(81), .6), .12)          # الأيقونة تثبت
for i, m in enumerate([62, 69, 74, 78]):   # الختام
    put(8.95 + i*.05, bell(hz(m), 2.5), .12)

# نهاية ناعمة + تطبيع
mix *= np.clip((L - t) / .8, 0, 1)
mix = np.tanh(mix * 1.2); mix /= np.abs(mix).max() / .85
st = np.stack([mix, np.roll(mix, 240)], 1)
with wave.open(f"{d}/audio.wav", "wb") as wv:
    wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR)
    wv.writeframes((st * 32767).astype("<i2").tobytes())
print("audio ok", L)
