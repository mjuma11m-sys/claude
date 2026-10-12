import json, sys
from faster_whisper import WhisperModel
m = WhisperModel('small', device='cpu', compute_type='int8')
segs, info = m.transcribe('v16.wav', language='ar', word_timestamps=True, vad_filter=False, initial_prompt='هلا! هذا حياتي، يومك كله بمكان واحد. مصاريفك، رسالة البنك، المبلغ والمحل.')
out = []
for s in segs:
    print(f'{s.start:6.2f}-{s.end:6.2f} {s.text}')
    out.append({'s': s.start, 'e': s.end, 'text': s.text, 'words': [{'w': w.word, 's': w.start, 'e': w.end} for w in s.words]})
json.dump(out, open('words.json', 'w'), ensure_ascii=False, indent=1)
