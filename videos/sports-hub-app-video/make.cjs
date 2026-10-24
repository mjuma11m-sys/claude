// node make.cjs <outdir> [startFrame] [t1,t2,...|-] [stopFrame]  — deterministic frames of video.html at 30fps (1080x1920).
const { chromium } = require('../../sports-hub-app/node_modules/playwright'); const fs=require('fs'), path=require('path');
(async()=>{ const out=process.argv[2]; fs.mkdirSync(out,{recursive:true}); const start=+(process.argv[3]||0); const stop=+(process.argv[5]||0); const only=process.argv[4]&&process.argv[4]!=='-'?process.argv[4].split(',').map(Number):null;
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
 await p.goto('file://'+path.resolve(__dirname,'video.html')); await p.evaluate(()=>window.ready); await p.waitForTimeout(300);
 const FPS=30, END=await p.evaluate(()=>window.END);
 const times=only?only:Array.from({length:Math.round(FPS*END)},(_,i)=>i/FPS); 
 for(let i=0;i<times.length;i++){ if(!only&&(i<start||(stop&&i>=stop))) continue; const t=only?times[i]:i/FPS; await p.evaluate(t=>render(t),t); await p.screenshot({path:path.join(out,only?('t'+t+'.png'):('f'+String(i).padStart(5,'0')+'.png'))}); }
 await b.close(); })();
