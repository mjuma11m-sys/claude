# موسيقى فيديو تطوير DW-024 (مولّدة بالكود): لو-فاي 96 BPM، 17 ث
#   python3 music.py → music.wav
# الهوك هادي (بيانو وبس) ← الإيقاع يدخل مع طلعة الجوال (2.4 ث) ← يهدا بالنهاية ويخلص على نوتة الشعار
import numpy as np, wave

SR, DUR, BPM = 48000, 17.0, 96
BEAT = 60 / BPM
N = int(SR * DUR)
t_all = np.arange(N) / SR
rng = np.random.default_rng(7)
mix = np.zeros((N, 2))

def hz(m): return 440 * 2 ** ((m - 69) / 12)

def env(n, a, d, s, r, sus):
    e = np.ones(n) * s
    A, R = min(int(a * SR), n), int(r * SR)
    D = max(0, min(int(d * SR), n - A))
    e[:A] = np.linspace(0, 1, A, endpoint=False)
    e[A:A + D] = np.linspace(1, s, D, endpoint=False)
    rel = min(R, n)
    e[-rel:] *= np.linspace(1, 0, rel)
    return e

def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    mix[i:i + len(sig), 0] += sig * np.sqrt(0.5 * (1 - pan))
    mix[i:i + len(sig), 1] += sig * np.sqrt(0.5 * (1 + pan))

def epiano(m, dur, vel=0.5):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m)
    # FM خفيف = إحساس Rhodes دافي
    mod = np.sin(2 * np.pi * f * 2 * t) * 1.2 * np.exp(-t * 3)
    x = np.sin(2 * np.pi * f * t + mod) + 0.25 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 2)
    x *= 1 + 0.04 * np.sin(2 * np.pi * 4.5 * t)  # tremolo
    return x * env(n, 0.005, 0.6, 0.35, 0.35, dur) * vel

def pad(m, dur, vel=0.12):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m)
    x = sum(np.sin(2 * np.pi * f * (1 + d) * t + p) for d, p in [(-0.004, 0), (0.0, 1.1), (0.0045, 2.3)])
    return x / 3 * env(n, 0.8, 0.5, 0.8, 1.0, dur) * vel

def kick(vel=0.9):
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 48 + 90 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * vel

def snare(vel=0.35):
    n = int(0.25 * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = np.convolve(noise, np.ones(6) / 6, 'same')  # تنعيم = لو-فاي
    return (noise * np.exp(-t * 18) + 0.4 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25)) * vel

def hat(vel=0.08):
    n = int(0.06 * SR); t = np.arange(n) / SR
    x = np.diff(rng.standard_normal(n + 1))
    return x * np.exp(-t * 70) * vel

def bass(m, dur, vel=0.35):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m)
    return (np.sin(2 * np.pi * f * t) + 0.15 * np.sin(2 * np.pi * 2 * f * t)) * env(n, 0.01, 0.2, 0.7, 0.12, dur) * vel

# Am9 – Fmaj7 – Cmaj7 – G6 (كل وحدة مازورة = 4 نبضات = 2.5 ث)
CHORDS = [([57, 60, 64, 67, 71], 45), ([53, 57, 60, 64], 41), ([48, 52, 55, 59, 62], 36), ([55, 59, 62, 64], 43)]
BAR = 4 * BEAT
bars = int(np.ceil(DUR / BAR))
DROP = 2.6
for b in range(bars):
    s = b * BAR
    notes, root = CHORDS[b % 4]
    for i, m in enumerate(notes):  # strum خفيف
        add(epiano(m, BAR * 0.95, 0.16), s + i * 0.018, pan=-0.3 + 0.15 * i)
    for m in notes[:3]:
        add(pad(m + 12, BAR), s, pan=0.2)
    if s + BAR > DROP and s < 12.2:
        add(bass(root, BEAT * 1.6), s)
        add(bass(root, BEAT * 0.9), s + BEAT * 2.5)
    # ميلودي بلك فوق (من المازورة 2)
    if 2 <= b <= 9:
        mel = [76, 74, 72, 71] if b % 2 else [72, 74, 76, 79]
        for k, m in enumerate(mel):
            add(epiano(m, BEAT * 0.9, 0.10), s + k * BEAT + (BEAT / 2 if k % 2 else 0), pan=0.35)

# الطبول: من 3 لين 18.6
beat = 0
while beat * BEAT < DUR:
    tb = beat * BEAT
    swing = 0.035 if beat % 2 else 0
    if DROP - 0.01 <= tb < 12.2:
        if beat % 4 in (0, 2): add(kick(), tb)
        if beat % 4 == 0 and beat % 8 == 4: add(kick(0.6), tb + BEAT * 1.5)
        if beat % 2 == 1: add(snare(), tb, pan=0.05)
        add(hat(), tb, pan=0.4); add(hat(0.05), tb + BEAT / 2 + swing, pan=0.4)
    beat += 1

# نوتة الشعار (18.9): بيانو عالي يطوّل
for i, m in enumerate([69, 72, 76, 81]):
    add(epiano(m, 3.2, 0.14), 12.5 + i * 0.06, pan=0.1 * i)

for i, m in enumerate([76, 79, 84]):
    add(epiano(m, 1.6, 0.10), 9.5 + i * 0.05, pan=-0.1 + 0.1 * i)

# ملمس لو-فاي: كراكل فينيل خفيف
crk = (rng.random(N) > 0.9993) * rng.standard_normal(N) * 0.06
mix += np.stack([crk, crk], 1)

# تنعيم الطبقة العالية (low-pass بسيط) + fade
k = 5
for c in range(2): mix[:, c] = np.convolve(mix[:, c], np.ones(k) / k, 'same')
fade_in, fade_out = int(0.3 * SR), int(1.5 * SR)
mix[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
mix[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
mix /= np.max(np.abs(mix)) * 1.12

with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('music.wav', DUR, 's')
