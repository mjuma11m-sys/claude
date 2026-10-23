# موسيقى إعلان «ودقة» (مولّدة بالكود = ما فيها حقوق): أمبينت هادي 20 ث
#   python3 music.py → music.wav
# مطر خفيف + pad + نقرة قطرة عند التموج (0.75) وعند الشعار (15.35)، ونوتة بيانو مع كل قيمة ومنتج
import numpy as np, wave

SR, DUR = 48000, 20.0
N = int(SR * DUR)
rng = np.random.default_rng(3)
mix = np.zeros((N, 2))

def hz(m): return 440 * 2 ** ((m - 69) / 12)

def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR)
    sig = sig[: N - i] * gain
    mix[i:i + len(sig), 0] += sig * np.sqrt(0.5 * (1 - pan))
    mix[i:i + len(sig), 1] += sig * np.sqrt(0.5 * (1 + pan))

def fade(n, a, r):
    e = np.ones(n); A, R = int(a * SR), int(r * SR)
    e[:A] = np.linspace(0, 1, A); e[-R:] *= np.linspace(1, 0, R); return e

def pad(ms, start, dur, vel=0.05):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in ms:
        for d in (-0.08, 0.08):
            x += np.sin(2 * np.pi * hz(m) * (1 + d / 100) * t)
    add(x * fade(n, 1.2, 1.5) * vel / len(ms), start)

def piano(m, start, vel=0.22, pan=0.0):
    n = int(2.5 * SR); t = np.arange(n) / SR; f = hz(m)
    x = np.sin(2 * np.pi * f * t + 0.8 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 4)) * np.exp(-t * 2.2)
    x[:200] *= np.linspace(0, 1, 200)
    add(x * vel, start, pan)

def plink(start, vel=0.5):
    n = int(0.6 * SR); t = np.arange(n) / SR
    f = 1400 * np.exp(-t * 9) + 500
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 10)
    add(x * vel, start)

# مطر: ضوضاء مفلترة (low-pass بسيط) خافتة
rain = rng.standard_normal((N, 2))
for c in range(2):
    y = np.zeros(N); a = 0.08
    for i in range(1, N): y[i] = y[i - 1] + a * (rain[i, c] - y[i - 1])
    rain[:, c] = y
env = np.clip(np.minimum(np.arange(N) / (SR * 1.5), (N - np.arange(N)) / (SR * 2)), 0, 1)
mix += rain * env[:, None] * 0.06

# A minor ← F ← C ← G ← Am (هادي)
for ms, s, d in [([57, 64, 69], 0.6, 5), ([53, 60, 65], 5.2, 4.6), ([48, 55, 64], 9.4, 4.8), ([55, 62, 67], 13.8, 2.4), ([57, 64, 69, 72], 15.3, 4.7)]:
    pad(ms, s, d)
plink(0.75); plink(15.35, 0.6)
for s, m in [(2.8, 76), (5.0, 79), (7.2, 81), (9.8, 72), (10.15, 76), (10.5, 79), (15.8, 69), (16.25, 76), (16.8, 81)]:
    piano(m, s, pan=0.2 if m % 2 else -0.2)

mix /= np.max(np.abs(mix)) * 1.12
mix *= np.clip((N - np.arange(N)) / (SR * 1.2), 0, 1)[:, None]
pcm = (mix * 32767).astype(np.int16)
with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
