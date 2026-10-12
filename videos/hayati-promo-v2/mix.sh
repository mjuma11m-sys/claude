#!/bin/bash
# موسيقى أصلية (music.py) + مؤثرات على الحركات ← hayati-promo-v2.mp4
set -e; cd "$(dirname "$0")"
SFX=/home/user/claude/.claude/skills/video-ad-editor/studio/sfx_prev
EV="tap 0.12 0.4
tap 0.35 0.3
tap 0.55 0.3
tap 0.75 0.3
whoosh_down 2.25 0.5
thud 2.95 0.65
tap 3.7 0.6
whoosh_up 6.5 0.45
tap 7.5 0.6
whoosh_up 10.5 0.45
tap 11.5 0.6
whoosh_up 14.8 0.45
tap 15.7 0.5
tap 16.8 0.9
whoosh_down 18.25 0.5
whoosh_up 18.6 0.5
whoosh_up 20.65 0.45
thud 21.5 0.8
tap 21.8 0.5
tap 22.25 0.7"
IN=""; FC=""; i=0
while read f t g; do
  IN="$IN -i $SFX/$f.wav"; ms=$(python3 -c "print(int($t*1000))")
  FC="$FC[$i:a]adelay=$ms|$ms,volume=$g[a$i];"; i=$((i+1))
done <<< "$EV"
# NOMUSIC=1 ./mix.sh → نسخة مؤثرات بس (لو بتحط صوت ترند من إنستقرام)
OUT=hayati-promo-v2.mp4
if [ -z "$NOMUSIC" ]; then
  [ -f music.wav ] || python3 music.py
  IN="$IN -i music.wav"; FC="$FC[$i:a]volume=0.6[a$i];"; i=$((i+1))
else OUT=hayati-promo-v2-sfx.mp4; fi
MIX=""; for j in $(seq 0 $((i-1))); do MIX="$MIX[a$j]"; done
ffmpeg -y -v error $IN -filter_complex "${FC}${MIX}amix=inputs=$i:normalize=0,apad,atrim=0:24,loudnorm=I=-16:TP=-1.5:LRA=11[out]" -map "[out]" -ar 48000 sfx.wav
ffmpeg -y -v error -i promo_video.mp4 -i sfx.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart $OUT
echo "→ $OUT"
