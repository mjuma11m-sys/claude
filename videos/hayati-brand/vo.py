#!/usr/bin/env python3
"""التعليق الصوتي البحريني (ar-BH-AliNeural) — كل سطر على وقت مشهده ← vo.wav"""
import asyncio, json, os, subprocess, sys
import edge_tts
VOICE = os.environ.get('VOICE', 'ar-BH-AliNeural')
LINES = [  # (الوقت بالثواني, النص)
    (0.25, 'هلا! هذا «حياتي»… يومك كله بمكان واحد.'),
    (2.7, 'يعرف وش وقته الحين.'),
    (5.0, 'الماي، النوم، وعاداتك اليومية.'),
    (8.4, 'مصاريفك تحت عينك…'),
    (11.8, 'وتعرف وين راحت فلوسك.'),
    (14.8, 'تلصق رسالة البنك…'),
    (17.0, 'ويقرا المبلغ والمحل بروحه.'),
    (19.4, 'توفّر لأهدافك.'),
    (22.9, 'محاضراتك وصلاتك.'),
    (26.4, 'تمرينك وأوزانك.'),
    (29.9, 'وواجباتك واختباراتك.'),
    (35.1, 'حياتي… يومك كله بمكان واحد.'),
]
os.makedirs('vo', exist_ok=True)
proxy = os.environ.get('HTTPS_PROXY')
async def gen(i, text):
    out = f'vo/l{i:02d}.mp3'
    await edge_tts.Communicate(text, VOICE, rate='+4%', proxy=proxy).save(out)
    return out
async def main():
    return [await gen(i, t) for i, (_, t) in enumerate(LINES)]
files = asyncio.run(main())
durs = [float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).decode()) for f in files]
for i, ((t, txt), d) in enumerate(zip(LINES, durs)):
    nxt = LINES[i + 1][0] if i + 1 < len(LINES) else 99
    print(f'{t:5.2f}–{t + d:5.2f}  {"⚠️ يتداخل" if t + d > nxt else "✓"}  {txt}')
inp, fc = [], ''
for i, ((t, _), f) in enumerate(zip(LINES, files)):
    inp += ['-i', f]; ms = int(t * 1000); fc += f'[{i}:a]aresample=48000,adelay={ms}|{ms}[v{i}];'
fc += ''.join(f'[v{i}]' for i in range(len(files))) + f'amix=inputs={len(files)}:normalize=0[out]'
subprocess.check_call(['ffmpeg', '-y', '-v', 'error', *inp, '-filter_complex', fc, '-map', '[out]', '-ac', '1', 'vo.wav'])
json.dump([{'t': t, 'text': x, 'dur': d} for (t, x), d in zip(LINES, durs)], open('vo/lines.json', 'w'), ensure_ascii=False, indent=1)
print('→ vo.wav')
