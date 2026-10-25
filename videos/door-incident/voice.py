import sherpa_onnx, numpy as np, wave, sys, os
M=os.environ['TTS_DIR']+'/vits-piper-ar_JO-kareem-medium/'
cfg=sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(vits=sherpa_onnx.OfflineTtsVitsModelConfig(
  model=M+'ar_JO-kareem-medium.onnx',tokens=M+'tokens.txt',data_dir=M+'espeak-ng-data',length_scale=1.15),num_threads=2))
tts=sherpa_onnx.OfflineTts(cfg)
# (start sec, window sec, text) — مشكّلة جزئياً لنطق أدق
L=[(4.3,6.2,'ما أَعرِضُهُ رِوايَةٌ مَنسوبَةٌ لِمَصادِرِها، وَلَيسَ حُكماً عَلى أَحَد.'),
(11.3,5.4,'المَدينَةُ المُنَوَّرَة، بَعدَ وَفاةِ النَّبِيّ، صَلَّى اللهُ عَلَيهِ وَآلِه.'),
(17.3,5.4,'تَذكُرُ المَصادِرُ الشّيعِيَّةُ أَنَّ بَيتَ الزَّهراء، عَلَيها السَّلام، حُوصِر.'),
(23.4,5.8,'وَأَنَّها كانَت خَلفَ البابِ.'),
(30.3,5.4,'وَتَرْوي أَنَّ جَمعاً مِنَ النّاسِ جاؤوا إِلى البَيت.'),
(36.3,5.4,'وَتَرْوي أَنَّ البابَ دُفِع، وَهِيَ وَراءَه.'),
(42.3,6.2,'وَتَذكُرُ أَنَّها أُصيبَت، وَيُحيي الشّيعَةُ ذِكرى ذَلِكَ حُزناً كُلَّ عام.'),
(49.2,4.6,'رِوايَةُ المَصادِرِ الشّيعِيَّة، وَمَحَلُّ خِلافٍ بَينَ المَذاهِب.')]
sr=tts.sample_rate; T=54; out=np.zeros(int(sr*T),dtype=np.float32)
for st,win,tx in L:
    a=np.array(tts.generate(tx,sid=0,speed=1.0).samples,dtype=np.float32)
    dur=len(a)/sr
    if dur>win: # أسرع بدون تغيير طبقة الصوت
        sp=min(1.4,dur/win*1.02); a=np.array(tts.generate(tx,sid=0,speed=sp).samples,dtype=np.float32)
    print(round(dur,1),'->',round(len(a)/sr,1),'/',win,tx[:20])
    a=a[:int(win*sr)]
    i=int(st*sr); out[i:i+len(a)]+=a
out/=max(1e-6,np.abs(out).max())/0.9
w=wave.open('assets/voice.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((out*32767).astype(np.int16).tobytes()); w.close()
