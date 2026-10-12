# صوت محمد: كل سطر من التسجيل، السكتات الداخلية تصير 0.15ث، وكل سطر على وقت مشهده بالفيديو الجديد → ../vo.wav
import wave, numpy as np, json
SR = 48000
with wave.open('clean.wav') as w: x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float32) / 32768
L = [  # (وقت السطر بالفيديو, مقاطع من التسجيل, النص)
 (0.25, [(0.43,0.81),(1.59,2.89),(3.53,4.17),(4.62,6.02)], 'هلا! هذا حياتي… يومك كله بمكان واحد'),
 (5.15, [(6.58,7.72),(8.68,9.46)], 'يعرف وش وقته الحين'),
 (7.90, [(10.94,11.48),(11.79,13.72)], 'الماي، النوم، وعاداتك اليومية'),
 (11.40, [(14.08,15.94)], 'مصاريفك تحت عينك'),
 (14.90, [(15.94,17.92)], 'وتعرف وين راحت فلوسك'),
 (17.90, [(18.21,20.20)], 'تلصق رسالة البنك'),
 (20.35, [(20.73,21.90),(22.23,23.56)], 'ويقرا المبلغ والمحل بروحه'),
 (23.50, [(24.87,26.43)], 'توفّر لأهدافك'),
 (27.00, [(27.16,28.05),(28.38,29.59)], 'محاضراتك وصلاتك'),
 (30.50, [(30.17,30.94),(31.55,32.46)], 'تمرينك وأوزانك'),
 (34.00, [(32.96,33.83),(34.37,35.51)], 'وواجباتك واختباراتك'),
 (39.65, [(36.35,36.85),(37.59,38.45),(38.74,39.75)], 'حياتي… يومك كله بمكان واحد'),
]
PAD, GAP, FADE = 0.06, 0.15, int(0.012 * SR)
def cut(a, b, pa, pb):
    s = x[int((a - pa) * SR):int((b + pb) * SR)].copy()
    r = np.linspace(0, 1, FADE); s[:FADE] *= r; s[-FADE:] *= r[::-1]; return s
out = np.zeros(int(43.2 * SR), np.float32); info = []
for i, (t, segs, txt) in enumerate(L):
    parts = []
    for j, (a, b) in enumerate(segs):
        split = (i in (3, 4)) and ((j == 0 and i == 4) or (i == 3))   # L4/L5 مقصوصين بنص مقطع واحد: بلا حشوة عند القص
        pa = 0.0 if (i == 4 and j == 0) else PAD; pb = 0.0 if (i == 3) else PAD
        parts.append(cut(a, b, pa, pb))
        if j < len(segs) - 1: parts.append(np.zeros(int(GAP * SR), np.float32))
    seg = np.concatenate(parts); i0 = int(t * SR); out[i0:i0 + len(seg)] += seg
    info.append({'t': t, 'end': round(t + len(seg) / SR, 2), 'text': txt})
    nxt = L[i + 1][0] if i + 1 < len(L) else 99
    print(f'{t:5.2f}–{t + len(seg)/SR:5.2f} {"⚠️ يتداخل" if t + len(seg)/SR > nxt - 0.1 else "✓"} {txt}')
with wave.open('../vo.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(out, -1, 1) * 32767).astype('<i2').tobytes())
json.dump(info, open('../vo_lines.json', 'w'), ensure_ascii=False, indent=1)
