#!/usr/bin/env python3
"""Offline Arabic TTS (sherpa-onnx + piper ar_JO-kareem) → vo/<id>.wav @48k + vo/words.json.
Stand-in for motion/voice.py when edge-tts is unreachable. Each line is voiced phrase by phrase
(split at ، : ؟ .) so word timing is anchored per phrase, then spread by letter count inside it.

  python3 tts_offline.py <proj> [--model-dir DIR] [--speed 1.12]
"""
import sys, os, re, json, argparse, wave
import numpy as np
import sherpa_onnx

SR = 48000
DIAC = re.compile(r'[ً-ْٰـ]')
PUNCT = '،:؟.!,'


def resample(x, sr):
    if sr == SR: return x
    n = int(round(len(x) * SR / sr))
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def trim(x, thr_db=-58):
    win = int(0.01 * SR); n = len(x) // win
    db = 20 * np.log10(np.sqrt(np.mean(x[:n * win].reshape(n, win) ** 2, axis=1) + 1e-12))
    on = np.where(db > thr_db)[0]
    if not len(on): return x
    a = max(0, on[0] * win - int(.05 * SR)); b = min(len(x), (on[-1] + 1) * win + int(.14 * SR))
    y = x[a:b].copy(); f = int(.004 * SR); y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
    return y


def weight(w):
    return len(re.sub(r'[^\w]', '', DIAC.sub('', w))) + 1.5   # +1.5: every word carries some onset time


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('proj')
    ap.add_argument('--model-dir', default='/tmp/claude-0/tts/vits-piper-ar_JO-kareem-medium')
    ap.add_argument('--speed', type=float, default=1.12)
    a = ap.parse_args()
    D = a.model_dir
    tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=f'{D}/ar_JO-kareem-medium.onnx', tokens=f'{D}/tokens.txt',
                                                   data_dir=f'{D}/espeak-ng-data'), num_threads=4)))
    script = json.load(open(os.path.join(a.proj, 'script.json'), encoding='utf-8'))
    os.makedirs(os.path.join(a.proj, 'vo'), exist_ok=True)
    lines = []
    for L in script:
        spoken = L['text'].split(); shown = L.get('show', L['text']).split()
        if len(spoken) != len(shown): sys.exit(f'{L["id"]}: spoken/show word counts differ ({len(spoken)} vs {len(shown)})')
        phrases, cur = [], []                                   # word indices grouped by punctuation
        for i, w in enumerate(spoken):
            cur.append(i)
            if w[-1] in PUNCT: phrases.append(cur); cur = []
        if cur: phrases.append(cur)
        chunks, words, t = [], [], 0.0
        for k, ph in enumerate(phrases):
            g = tts.generate(' '.join(spoken[i] for i in ph), sid=0, speed=L.get('speed', a.speed))
            y = trim(resample(np.asarray(g.samples, dtype=np.float32), g.sample_rate))
            dur = len(y) / SR; tot = sum(weight(spoken[i]) for i in ph); acc = 0.0
            for i in ph:
                s = t + dur * acc / tot; acc += weight(spoken[i])
                words.append({'w': shown[i], 's': round(s, 4), 'e': round(t + dur * acc / tot, 4)})
            chunks.append(y); t += dur
            if k < len(phrases) - 1:
                p = .16 if spoken[ph[-1]][-1] in '،,:' else .22
                chunks.append(np.zeros(int(p * SR), np.float32)); t += p
        x = np.concatenate(chunks); x = x / max(1e-6, np.abs(x).max()) * .89
        fn = os.path.join(a.proj, 'vo', L['id'] + '.wav')
        with wave.open(fn, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
        lines.append({'id': L['id'], 'text': L.get('show', L['text']), 'file': 'vo/' + L['id'] + '.wav', 'dur': round(len(x) / SR, 4),
                      'words': words, 'gap_after': L.get('gap_after'), 'source': 'piper-kareem+proportional'})
        print(f'  ✓ {L["id"]}  {len(x) / SR:5.2f}s  {len(words)} words')
    json.dump({'voice': 'piper:ar_JO-kareem-medium', 'source': 'tts', 'lines': lines},
              open(os.path.join(a.proj, 'vo', 'words.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('total speech', round(sum(l['dur'] for l in lines), 2), 's')


if __name__ == '__main__':
    main()
