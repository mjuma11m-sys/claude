#!/bin/bash
# دمج: الآيفون 3D + كرت الشعار + المؤثرات ← hayati-explainer.mp4
set -e
cd "$(dirname "$0")"
SFX=/home/user/claude/.claude/skills/video-ad-editor/studio/sfx_prev
XF=34.7   # بداية دخول كرت الشعار
ffmpeg -y -v error -i device3d.mp4 -i outro/outro.mp4 -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.3:offset=$XF,format=yuv420p[v]" -map "[v]" -c:v libx264 -crf 18 -preset medium -r 60 video.mp4
# المؤثرات: [ملف, وقت, قوة]
EV="whoosh_up 0.05 0.5
thud 0.15 0.7
whoosh_up 4.4 0.45
tap 6.1 0.8
whoosh_up 7.9 0.45
whoosh_up 11.4 0.45
whoosh_up 14.4 0.45
tap 16.6 0.8
whoosh_up 18.9 0.45
tap 20.9 0.8
whoosh_up 22.4 0.45
whoosh_up 25.9 0.45
whoosh_up 29.4 0.45
whoosh_down 34.6 0.5
thud 35.55 0.8"
IN=""; FC=""; i=0
while read f t g; do
  IN="$IN -i $SFX/$f.wav"; ms=$(python3 -c "print(int($t*1000))")
  FC="$FC[$i:a]adelay=$ms|$ms,volume=$g[a$i];"; i=$((i+1))
done <<< "$EV"
MIX=""; for j in $(seq 0 $((i-1))); do MIX="$MIX[a$j]"; done
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 video.mp4)
ffmpeg -y -v error $IN -filter_complex "${FC}${MIX}amix=inputs=$i:normalize=0,apad,atrim=0:$DUR[out]" -map "[out]" -ar 48000 sfx_raw.wav
if [ -f vo.wav ]; then   # الصوت البحريني فوق، والمؤثرات أوطى تحته
  ffmpeg -y -v error -i vo.wav -i sfx_raw.wav -filter_complex "[0:a]apad,atrim=0:$DUR,volume=1.0[v];[1:a]volume=0.45[s];[v][s]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[out]" -map "[out]" -ar 48000 sfx.wav
else
  ffmpeg -y -v error -i sfx_raw.wav -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ar 48000 sfx.wav
fi
ffmpeg -y -v error -i video.mp4 -i sfx.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart hayati-explainer.mp4
echo "→ hayati-explainer.mp4 ($DUR ث)"
