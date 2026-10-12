# موسيقى تشويق أصلية 15 ث: نبض قلب يتسارع ← رايزر ← ضربة مع الشعار (9.6 ث) ← بيانو هادي
import numpy as np, wave
SR, DUR = 48000, 15.0
N = int(SR * DUR); rng = np.random.default_rng(3)
mix = np.zeros((N, 2))
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    mix[i:i + len(sig), 0] += sig * np.sqrt(0.5 * (1 - pan)); mix[i:i + len(sig), 1] += sig * np.sqrt(0.5 * (1 + pan))
def drone(m, dur, vel):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m)
    x = sum(np.sin(2 * np.pi * f * (1 + d) * t) for d in (-0.003, 0, 0.003)) / 3
    e = np.minimum(1, t / 1.5) * np.minimum(1, (dur - t) / 0.4)
    return x * e * vel
def thump(vel):
    n = int(0.3 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(42 + 60 * np.exp(-t * 30)) / SR) * np.exp(-t * 11) * vel
def epiano(m, dur, vel):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m)
    x = np.sin(2 * np.pi * f * t + 1.1 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3))
    return x * np.exp(-t * 1.1) * np.minimum(1, t / 0.004) * vel
# درون منخفض يكبر لين الكشف
add(drone(33, 9.6, 0.22), 0); add(drone(40, 9.6, 0.12), 0.5, pan=0.3)
# نبض قلب: دقتين، ويتسارع
t, gap = 0.4, 1.0
while t < 9.4:
    add(thump(0.9), t); add(thump(0.6), t + 0.22)
    t += gap; gap = max(0.42, gap * 0.9)
# رايزر نويز 7.4 → 9.6
n = int(2.2 * SR); tt = np.arange(n) / SR
noise = rng.standard_normal(n); noise = np.convolve(noise, np.ones(3) / 3, 'same')
add(noise * (tt / 2.2) ** 2.5 * 0.35, 7.4)
# الضربة مع الشعار
n = int(2.5 * SR); tt = np.arange(n) / SR
boom = np.sin(2 * np.pi * np.cumsum(38 + 80 * np.exp(-tt * 12)) / SR) * np.exp(-tt * 2.2)
add(boom * 1.0, 9.6); add(rng.standard_normal(int(0.4 * SR)) * np.exp(-np.arange(int(0.4 * SR)) / SR * 12) * 0.25, 9.6)
# بيانو الشعار (A minor add9) + نوتة «قريباً»
for i, m in enumerate([57, 64, 69, 71, 72]):
    add(epiano(m, 5.0, 0.13), 9.75 + i * 0.07, pan=-0.3 + 0.15 * i)
add(epiano(76, 3.0, 0.12), 11.3, pan=0.2); add(epiano(81, 3.0, 0.09), 12.1, pan=0.3)
fo = int(1.2 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
mix /= np.max(np.abs(mix)) * 1.12
with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('music.wav', DUR)
