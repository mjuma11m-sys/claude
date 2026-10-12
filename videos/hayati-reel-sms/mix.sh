#!/bin/bash
# موسيقى أصلية (music.py) + مؤثرات على الحركات ← hayati-reel-sms.mp4
set -e; cd "$(dirname "$0")"
SFX=/home/user/claude/.claude/skills/video-ad-editor/studio/sfx_prev
EV="whoosh_up 0.15 0.5
tap 0.7 0.6
whoosh_down 2.35 0.5
thud 2.95 0.6
tap 3.95 0.7
whoosh_up 6.8 0.45
tap 7.75 0.6
whoosh_up 10.8 0.45
tap 11.65 0.6
tap 12.5 0.9
whoosh_down 14.9 0.5
thud 15.9 0.8
tap 16.2 0.5
tap 16.65 0.7
tap 17.05 0.5"
[ -f music.wav ] || python3 music.py
IN=""; FC=""; i=0
while read f t g; do
  IN="$IN -i $SFX/$f.wav"; ms=$(python3 -c "print(int($t*1000))")
  FC="$FC[$i:a]adelay=$ms|$ms,volume=$g[a$i];"; i=$((i+1))
done <<< "$EV"
IN="$IN -i music.wav"; FC="$FC[$i:a]volume=0.6[a$i];"; i=$((i+1))
MIX=""; for j in $(seq 0 $((i-1))); do MIX="$MIX[a$j]"; done
ffmpeg -y -v error $IN -filter_complex "${FC}${MIX}amix=inputs=$i:normalize=0,apad,atrim=0:21,loudnorm=I=-16:TP=-1.5:LRA=11[out]" -map "[out]" -ar 48000 sfx.wav
ffmpeg -y -v error -i reel_video.mp4 -i sfx.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart hayati-reel-sms.mp4
echo "→ hayati-reel-sms.mp4"
