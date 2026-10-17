#!/bin/bash
# موسيقى أصلية (من الإعلان الثاني) + مؤثرات على الحركات ← hayati-iphone.mp4
set -e; cd "$(dirname "$0")"
SFX=/home/user/claude/.claude/skills/video-ad-editor/studio/sfx_prev
EV="tap 0.12 0.4
tap 0.5 0.35
whoosh_up 2.4 0.5
tap 3.85 0.7
thud 4.3 0.5
tap 5.85 0.7
whoosh_down 6.6 0.45
whoosh_up 7.6 0.5
tap 8.3 0.5
whoosh_up 11.3 0.45
tap 11.9 0.5
tap 12.15 0.5
tap 12.4 0.5
whoosh_up 15.4 0.45
tap 16.0 0.5
whoosh_down 17.6 0.5
thud 18.7 0.8
tap 19.15 0.6"
IN=""; FC=""; i=0
while read f t g; do
  IN="$IN -i $SFX/$f.wav"; ms=$(python3 -c "print(int($t*1000))")
  FC="$FC[$i:a]adelay=$ms|$ms,volume=$g[a$i];"; i=$((i+1))
done <<< "$EV"
OUT=hayati-iphone.mp4
if [ -z "$NOMUSIC" ]; then IN="$IN -i music.wav"; FC="$FC[$i:a]volume=0.6,afade=t=out:st=18.8:d=1.2[a$i];"; i=$((i+1)); else OUT=hayati-iphone-sfx.mp4; fi
MIX=""; for j in $(seq 0 $((i-1))); do MIX="$MIX[a$j]"; done
ffmpeg -y -v error $IN -filter_complex "${FC}${MIX}amix=inputs=$i:normalize=0,apad,atrim=0:20,loudnorm=I=-16:TP=-1.5:LRA=11[out]" -map "[out]" -ar 48000 sfx.wav
ffmpeg -y -v error -i promo_video.mp4 -i sfx.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart $OUT
echo "→ $OUT"
