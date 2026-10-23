#!/usr/bin/env python3
"""صوت كشف الشعار v3: صعود مع البرج، وإيقاع خليجي (دم/تك) على 96bpm من ضربة الغطاء، وباص، وباد بصدى، وأجراس. كله numpy (بلا حقوق).
python3 mix.py renders  → renders/audio.wav"""
import sys, json, wave
import numpy as np
from scipy import signal

SR = 48000
d = sys.argv[1]
L = json.load(open(f"{d}/meta.json"))["length"]
n = int(L * SR); t = np.arange(n) / SR
rng = np.random.default_rng(3)
dry = np.zeros(n); wet = np.zeros(n)          # wet يروح للصدى
hz = lambda m: 440 * 2 ** ((m - 69) / 12)

def put(buf, at, x, g=1.0):
    a = int(at * SR); b = min(n, a + len(x))
    if 0 <= a < n: buf[a:b] += g * x[: b - a]

def bell(f, dur=2.5):
    tt = np.arange(int(dur * SR)) / SR
    return (np.sin(2*np.pi*f*tt) + .4*np.sin(2*np.pi*f*2.01*tt) + .15*np.sin(2*np.pi*f*3.02*tt)) * np.exp(-tt*2.2) * np.minimum(1, tt/0.004)

def doum():
    tt = np.arange(int(.5*SR))/SR
    return np.sin(2*np.pi*(62 + 90*np.exp(-tt*30))*tt) * np.exp(-tt*7)
def tak(bright=1.0):
    x = rng.standard_normal(int(.12*SR)); tt = np.arange(len(x))/SR
    x = signal.sosfilt(signal.butter(2, [1800, 6000], btype="band", fs=SR, output="sos"), x)
    return x * np.exp(-tt*(45/bright))

# صعود 0→1.55
a, b = 0, int(1.55*SR); tt = np.arange(b-a)/SR; k = tt/tt[-1]
r = signal.sosfilt(signal.butter(2, [300, 4000], btype="band", fs=SR, output="sos"), rng.standard_normal(b-a)) * k**2 * .22
r += np.sin(2*np.pi*np.cumsum(110 + 330*k**2)/SR) * k**1.5 * .18
dry[a:b] += r

# ضربة الغطاء 1.6
tt = np.arange(int(1.5*SR))/SR
put(dry, 1.6, np.sin(2*np.pi*(52+70*np.exp(-tt*18))*tt) * np.exp(-tt*4.5), .9)
put(wet, 1.6, bell(hz(74)), .3)
for i, at in enumerate([1.45, 1.58, 1.71]):
    put(wet, at, bell(hz(86 + i*2), .4), .05)

# إيقاع خليجي: كل بار 4 ضربات (0.625ث)
beat = 60/96; bar = 4*beat; t0 = 1.6
pattern = [(0, "D"), (1, "T"), (1.5, "D"), (2.5, "T"), (3, "T"), (3.5, "t")]
for i in range(int((L - t0) / bar) + 1):
    for off, kind in pattern:
        at = t0 + i*bar + off*beat
        if at > L - .9: continue
        g = min(1, (at - t0) / 1.2 + .35)                       # يدخل تدريجياً
        if kind == "D": put(dry, at, doum(), .55*g)
        elif kind == "T": put(dry, at, tak(), .22*g)
        else: put(dry, at, tak(.6), .1*g)

# باص + باد: D ← Bm ← G ← A (بار لكل كورد)
chords = [[50,57,62,66],[47,54,59,62],[43,50,55,59],[45,52,57,61]]
for j in range(4):
    s0 = t0 + j*bar; s1 = min(L, s0 + bar + (.4 if j < 3 else 0))
    a, b = int(s0*SR), min(n, int(s1*SR)); tt = np.arange(b-a)/SR
    env = np.minimum(1, tt/.5) * np.clip((s1-s0-tt)/.5, 0, 1)
    for m in chords[j]:
        wet[a:b] += env * (np.sin(2*np.pi*hz(m)*tt) + .3*np.sin(2*np.pi*hz(m)*1.004*tt)) * .045
    root = hz(chords[j][0] - 12)
    for off in (0, 1.5, 2.5):                                   # باص على الدم
        at = s0 + off*beat
        if at < L - .9:
            tb = np.arange(int(.45*SR))/SR
            put(dry, at, (np.sin(2*np.pi*root*tb) + .25*np.sin(2*np.pi*root*2*tb)) * np.exp(-tb*4) * np.minimum(1, tb/.01), .32)

for i, m in enumerate([62, 66, 69, 74]): put(wet, 2.55 + i*.12, bell(hz(m), 2.2), .16)   # الاسم
a, b = int(6.45*SR), int(7.5*SR); tt = np.arange(b-a)/SR; k = tt/tt[-1]                  # طيران
dry[a:b] += signal.sosfilt(signal.butter(2, 1200, btype="low", fs=SR, output="sos"), rng.standard_normal(b-a)) * np.sin(np.pi*k)**2 * .3
put(wet, 7.2, bell(hz(81), .6), .12)
for i, m in enumerate([62, 69, 74, 78]): put(wet, 8.95 + i*.05, bell(hz(m), 2.5), .13)   # الختام

# صدى: استجابة ضجيج تتلاشى 1.6ث
ir_t = np.arange(int(1.6*SR))/SR
ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t*3.2); ir[0] = 1; ir /= np.abs(ir).sum() / 12
rev = signal.fftconvolve(wet, ir)[:n]
mix = dry + .75*wet + .35*rev
mix *= np.clip((L - t) / .7, 0, 1)
mix = np.tanh(mix * 1.15); mix /= np.abs(mix).max() / .85
st = np.stack([mix, np.roll(mix, 260)], 1)
with wave.open(f"{d}/audio.wav", "wb") as wv:
    wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR)
    wv.writeframes((st * 32767).astype("<i2").tobytes())
print("audio ok", L)
