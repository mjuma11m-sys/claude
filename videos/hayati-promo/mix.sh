#!/bin/bash
# مؤثرات صوتية على حركات الإعلان ← hayati-promo.mp4 (بدون موسيقى: ضيف ترند الصوت من إنستقرام نفسه)
set -e; cd "$(dirname "$0")"
SFX=/home/user/claude/.claude/skills/video-ad-editor/studio/sfx_prev
EV="thud 0.12 0.75
tap 0.32 0.35
tap 0.46 0.3
tap 0.6 0.3
whoosh_down 2.45 0.55
thud 3.0 0.7
tap 3.88 0.6
whoosh_up 4.9 0.55
tap 5.95 0.6
whoosh_up 8.7 0.45
whoosh_up 9.1 0.5
tap 10.5 0.7
whoosh_up 10.9 0.4
whoosh_up 12.5 0.45
tap 13.15 0.6
whoosh_up 15.7 0.45
tap 16.25 0.6
tap 16.6 0.6
whoosh_up 18.9 0.45
tap 19.45 0.6
whoosh_down 21.3 0.55
thud 21.75 0.8
tap 22.95 0.7"
IN=""; FC=""; i=0
while read f t g; do
  IN="$IN -i $SFX/$f.wav"; ms=$(python3 -c "print(int($t*1000))")
  FC="$FC[$i:a]adelay=$ms|$ms,volume=$g[a$i];"; i=$((i+1))
done <<< "$EV"
MIX=""; for j in $(seq 0 $((i-1))); do MIX="$MIX[a$j]"; done
ffmpeg -y -v error $IN -filter_complex "${FC}${MIX}amix=inputs=$i:normalize=0,apad,atrim=0:25,loudnorm=I=-16:TP=-1.5:LRA=11[out]" -map "[out]" -ar 48000 sfx.wav
ffmpeg -y -v error -i promo_video.mp4 -i sfx.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart hayati-promo.mp4
echo "→ hayati-promo.mp4"
