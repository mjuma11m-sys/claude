# صوت كشف شعار «ودقة» 8 ث (مولّد بالكود = ما فيه حقوق)
#   python3 music.py → music.wav
# نقرة قطرة لما توصل النقطة (1.2) ← pad يطلع مع رسم القطرة ← نقرة ثانية عند الاكتمال (2.7) ← نوتات بيانو مع الاسم (3.5، 4.2، 4.9)
import numpy as np, wave
SR, DUR = 48000, 8.0
N = int(SR * DUR); mix = np.zeros((N, 2))
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR); sig = sig[: N - i] * gain
    mix[i:i + len(sig), 0] += sig * np.sqrt(0.5 * (1 - pan)); mix[i:i + len(sig), 1] += sig * np.sqrt(0.5 * (1 + pan))
def plink(start, f0=1500, vel=0.6):
    n = int(0.7 * SR); t = np.arange(n) / SR; f = f0 * np.exp(-t * 9) + 480
    add(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * vel, start)
def pad(ms, start, dur, vel=0.06):
    n = int(dur * SR); t = np.arange(n) / SR; x = sum(np.sin(2 * np.pi * hz(m) * (1 + d) * t) for m in ms for d in (-8e-4, 8e-4))
    e = np.minimum(1, t / 1.2) * np.minimum(1, (dur - t) / 1.5); add(x * e * vel / len(ms), start)
def piano(m, start, vel=0.25, pan=0.0):
    n = int(3 * SR); t = np.arange(n) / SR; f = hz(m)
    x = np.sin(2 * np.pi * f * t + 0.8 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 4)) * np.exp(-t * 1.8); x[:200] *= np.linspace(0, 1, 200)
    add(x * vel, start, pan)
# whoosh خفيف وقت سقوط النقطة
n = int(1.0 * SR); t = np.arange(n) / SR; noise = np.random.default_rng(5).standard_normal(n)
y = np.zeros(n)
for i in range(1, n): y[i] = y[i - 1] + 0.05 * (noise[i] - y[i - 1])
add(y * np.sin(np.pi * t / 1.0) ** 2 * 0.5, 0.2)
plink(1.2); plink(2.7, 1900, 0.4)
pad([57, 64, 69], 1.2, 6.8); pad([45, 52], 2.7, 5.3, 0.05)
for s, m, p in [(3.5, 76, -0.2), (4.2, 81, 0.2), (4.9, 84, 0)]: piano(m, s, pan=p)
mix /= np.max(np.abs(mix)) * 1.1
mix *= np.clip((N - np.arange(N)) / (SR * 0.6), 0, 1)[:, None]
with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
