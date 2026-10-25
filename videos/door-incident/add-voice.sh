#!/bin/sh
# usage: ./add-voice.sh voice.(mp3|wav|m4a)  → out/door-incident-voice.mp4
# يدمج التعليق مع الأجواء (الأجواء تنخفض تحت الصوت) بدون إعادة ترميز الفيديو
cd "$(dirname "$0")"
ffmpeg -y -v error -i out/door-incident.mp4 -i "$1" \
 -filter_complex "[0:a]volume=0.45[a];[1:a]adelay=4000|4000,volume=1.4[v];[a][v]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[m]" \
 -map 0:v -map "[m]" -c:v copy -c:a aac -b:a 192k -movflags +faststart out/door-incident-voice.mp4 && echo done
