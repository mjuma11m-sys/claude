#!/usr/bin/env python3
"""موسيقى فيديو الشركاء (50ث): بداية متوترة خفيفة (المشكلة)، ضربة الشعار عند 5.1ث، بعدها إيقاع خليجي هادي (دم/تك) على 92bpm
مع باص وباد، وجرس خفيف مع كل مشهد. خلفية للقراءة — مو أعلى من النص. كله numpy (بلا حقوق).
python3 mix.py renders  → renders/audio.wav"""
import sys, json, wave
import numpy as np
from scipy import signal

SR = 48000
d = sys.argv[1]
L = json.load(open(f"{d}/meta.json"))["length"]
n = int(L * SR); t = np.arange(n) / SR
rng = np.random.default_rng(7)
dry = np.zeros(n); wet = np.zeros(n)
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
def tick():
    tt = np.arange(int(.05*SR))/SR
    return np.sin(2*np.pi*2400*tt) * np.exp(-tt*120)

# 0–5: المشكلة — تكتكة ساعة + نغمة معلّقة ترتفع
for i in range(10): put(dry, .2 + i*.48, tick(), .12)
a, b = 0, int(5.0*SR); tt = np.arange(b-a)/SR; kk = tt/tt[-1]
for m in (57, 64):
    wet[a:b] += np.sin(2*np.pi*hz(m)*tt) * kk**1.5 * .05
wet[a:b] += signal.sosfilt(signal.butter(2, [400, 3000], btype="band", fs=SR, output="sos"), rng.standard_normal(b-a)) * kk**3 * .05

# 5.1: الشعار
tt = np.arange(int(1.5*SR))/SR
put(dry, 5.1, np.sin(2*np.pi*(52+70*np.exp(-tt*18))*tt) * np.exp(-tt*4.5), .85)
for i, m in enumerate([62, 66, 69, 74]): put(wet, 5.9 + i*.12, bell(hz(m), 2.2), .15)

# إيقاع خليجي من 5.1 لين النهاية
beat = 60/92; bar = 4*beat; t0 = 5.1
pattern = [(0, "D"), (1, "T"), (1.5, "D"), (2.5, "T"), (3, "T"), (3.5, "t")]
for i in range(int((L - t0) / bar) + 1):
    for off, kind in pattern:
        at = t0 + i*bar + off*beat
        if at > L - 1.2: continue
        g = min(1, (at - t0) / 2 + .3) * (.6 if 37.9 < at < 44 else 1)   # الثقة: أهدى
        if kind == "D": put(dry, at, doum(), .42*g)
        elif kind == "T": put(dry, at, tak(), .16*g)
        else: put(dry, at, tak(.6), .07*g)

# باص + باد: D ← Bm ← G ← A يدور
chords = [[50,57,62,66],[47,54,59,62],[43,50,55,59],[45,52,57,61]]
j = 0; s0 = t0
while s0 < L:
    c = chords[j % 4]; s1 = min(L, s0 + bar + .4)
    a, b = int(s0*SR), min(n, int(s1*SR)); tt = np.arange(b-a)/SR
    env = np.minimum(1, tt/.5) * np.clip((s1-s0-tt)/.5, 0, 1)
    for m in c: wet[a:b] += env * (np.sin(2*np.pi*hz(m)*tt) + .3*np.sin(2*np.pi*hz(m)*1.004*tt)) * .035
    root = hz(c[0] - 12)
    for off in (0, 1.5, 2.5):
        at = s0 + off*beat
        if at < L - 1.2:
            tb = np.arange(int(.45*SR))/SR
            put(dry, at, (np.sin(2*np.pi*root*tb) + .25*np.sin(2*np.pi*root*2*tb)) * np.exp(-tb*4) * np.minimum(1, tb/.01), .26)
    j += 1; s0 += bar

# جرس مع كل مشهد
for at, m in [(9.6, 74), (16.8, 76), (23.9, 78), (31.1, 81), (38.1, 74), (44.2, 78)]:
    put(wet, at, bell(hz(m), 1.6), .1)
for i, m in enumerate([62, 69, 74, 78]): put(wet, 45.0 + i*.06, bell(hz(m), 3), .12)   # الختام

ir_t = np.arange(int(1.6*SR))/SR
ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t*3.2); ir[0] = 1; ir /= np.abs(ir).sum() / 12
rev = signal.fftconvolve(wet, ir)[:n]
mix = dry + .75*wet + .35*rev
mix *= np.clip((L - t) / 1.2, 0, 1) * np.clip(t / .3, 0, 1)
mix = np.tanh(mix * 1.1); mix /= np.abs(mix).max() / .7     # أهدى من فيديو الشعار: خلفية
st = np.stack([mix, np.roll(mix, 260)], 1)
with wave.open(f"{d}/audio.wav", "wb") as wv:
    wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR)
    wv.writeframes((st * 32767).astype("<i2").tobytes())
print("audio ok", L)
