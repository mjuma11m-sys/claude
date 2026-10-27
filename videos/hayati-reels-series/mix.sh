#!/bin/bash
# موسيقى (music.py) + مؤثرات ← hayati-reel-costa.mp4
set -e; cd "$(dirname "$0")"
SFX=/home/user/claude/.claude/skills/video-ad-editor/studio/sfx_prev
EV="whoosh_up 0.05 0.35
tap 0.3 0.5
whoosh_up 1.0 0.45
thud 2.6 0.8
tap 2.85 0.6
whoosh_up 4.0 0.4
whoosh_down 6.6 0.5
tap 7.85 0.7
tap 8.35 0.6"
IN=""; FC=""; i=0
while read f t g; do
  IN="$IN -i $SFX/$f.wav"; ms=$(python3 -c "print(int($t*1000))")
  FC="$FC[$i:a]adelay=$ms|$ms,volume=$g[a$i];"; i=$((i+1))
done <<< "$EV"
IN="$IN -i music.wav"; FC="$FC[$i:a]volume=0.6[a$i];"; i=$((i+1))
MIX=""; for j in $(seq 0 $((i-1))); do MIX="$MIX[a$j]"; done
ffmpeg -y -v error $IN -filter_complex "${FC}${MIX}amix=inputs=$i:normalize=0,apad,atrim=0:10,loudnorm=I=-16:TP=-1.5:LRA=11[out]" -map "[out]" -ar 48000 sfx.wav
ffmpeg -y -v error -i ${V}_video.mp4 -i sfx.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/${V}.mp4
echo "→ out/${V}.mp4"
