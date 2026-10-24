# فيديو التطبيق (≈50 ث، 9:16، صامت)

لقطات النسخة التجريبية (بيانات خيالية) + حركة تركيز. الجلسة: `videos/diwaniya-skill/sessions/sports-hub-app-video.html`.

- لقطات الجوال: `node shoot.cjs` على نسخة مبنية (`npx vite preview --port 4399`) ← `shots/`. الجدول الشهري من `../sports-hub-deck/crops/att-month.png`.
- الإطارات: `node make.cjs <مجلد>` (30fps، 1080×1920) ثم `ffmpeg -framerate 30 -i <مجلد>/f%05d.png -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart sports-hub-app-video.mp4`.
- بدون يوم إطلاق ولا اسم الاتحاد ولا أسعار. مشهد «بصراحة» يذكر اللي ما يشتغل بعد.
