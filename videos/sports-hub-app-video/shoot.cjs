// node shoot.cjs  — phone-width clips of the trial build (demo data) for the video. Needs: vite preview --port 4399 on a default build.
const {chromium}=require('../../sports-hub-app/node_modules/playwright'); const path=require('path');
const O=path.join(__dirname,'shots')+'/', U='http://localhost:4399';
(async()=>{const b=await chromium.launch();
const c=await b.newContext({viewport:{width:390,height:900},deviceScaleFactor:2.5,locale:'ar-BH'});const p=await c.newPage();
await p.goto(U+'/login');await p.evaluate(()=>localStorage.setItem('sh.demoRole','club_admin'));
const clip=async(name,box)=>p.screenshot({path:O+name+'.png',fullPage:true,clip:{x:0,y:box.y,width:390,height:box.h}});
const top=async(loc)=>{const bb=await loc.boundingBox();const sy=await p.evaluate(()=>window.scrollY);return {y:bb.y+sy,h:bb.height,x:bb.x}};
await p.addInitScript(()=>{const st=document.createElement('style');st.textContent='nav.fixed,#more-menu,header{display:none !important}';document.addEventListener('DOMContentLoaded',()=>document.head.append(st))});
await p.goto(U+'/club');await p.waitForTimeout(1500);
const today=p.getByRole('region',{name:'اليوم'});const t=await top(today);await clip('club-today',{y:t.y-10,h:t.h+20});
const stats=await p.evaluate(()=>{const e=[...document.querySelectorAll('#main *')].find(x=>x.textContent&&/69%/.test(x.textContent)&&x.children.length>=3&&x.getBoundingClientRect().height<200);const r=e.getBoundingClientRect();return {y:r.top+scrollY,h:r.height}});await clip('club-stats',{y:stats.y-10,h:stats.h+20});
await p.goto(U+'/attendance');await p.waitForTimeout(1200);
const plan=[[1,[[11,'غائب'],[3,'متأخر']]],[3,[[11,'غائب']]],[5,[[3,'متأخر'],[9,'غائب']]],[8,[[11,'غائب'],[4,'متأخر']]],[10,[]],[12,[[11,'غائب'],[9,'غائب بعذر']]],[15,[[3,'غائب']]],[19,[]],[35,[[11,'غائب']]],[40,[[3,'متأخر'],[11,'غائب']]],[48,[]],[52,[[4,'غائب']]]];
for(const [back,marks] of plan){await p.getByLabel('اليوم').fill(new Date(Date.now()-back*864e5).toISOString().slice(0,10));await p.getByRole('button',{name:'الكل حاضر'}).click();
 for(const [n,s] of marks)await p.getByRole('radiogroup',{name:new RegExp('حضور اللاعب '+n+'$')}).getByRole('radio',{name:s,exact:true}).click();await p.getByRole('button',{name:/^احفظ/}).click();await p.waitForTimeout(300)}
await p.getByLabel('اليوم').fill(new Date().toISOString().slice(0,10));await p.getByRole('button',{name:'الكل حاضر'}).click();await p.waitForTimeout(200);
const rows=p.getByRole('listitem').filter({has:p.getByRole('radiogroup',{name:/حضور اللاعب 1$/})});
const r1=await top(rows.first());const rowsBox=async()=>{const a=await top(p.getByRole('listitem').filter({has:p.getByRole('radiogroup',{name:/حضور اللاعب 1$/})}).first());const d=await top(p.getByRole('listitem').filter({has:p.getByRole('radiogroup',{name:/حضور اللاعب 4$/})}).first());return {y:a.y-10,h:d.y+d.h-a.y+20}};
await clip('att-rows-a',await rowsBox());
for(const [n,s] of [[3,'متأخر'],[4,'غائب بعذر']]) await p.getByRole('radiogroup',{name:new RegExp('حضور اللاعب '+n+'$')}).getByRole('radio',{name:s,exact:true}).click();
await p.waitForTimeout(200);await clip('att-rows-b',await rowsBox());
await p.getByRole('radiogroup',{name:/حضور اللاعب 11$/}).getByRole('radio',{name:'غائب',exact:true}).click();
await p.getByRole('button',{name:/^احفظ/}).click();await p.waitForTimeout(700);
const art=p.getByRole('article').filter({has:p.getByRole('heading',{name:'تسجيل جلسة'})});const at=await top(art);
const firstRow=await top(p.getByRole('listitem').filter({has:p.getByRole('radiogroup',{name:/حضور اللاعب 1$/})}).first());
await clip('att-head',{y:at.y,h:firstRow.y-at.y-6});
const sumBox=await top(p.getByRole('heading',{name:'ملخص للمجموعة'}).locator('xpath=..'));const meta={sum:{y:(sumBox.y-at.y)/(firstRow.y-at.y-6),h:sumBox.h/(firstRow.y-at.y-6)}};
const chips=await top(p.getByRole('status',{name:'ملخص التسجيل'}));meta.chips={y:(chips.y-at.y)/(firstRow.y-at.y-6),h:chips.h/(firstRow.y-at.y-6)};require('fs').writeFileSync(O+'meta.json',JSON.stringify(meta));
const team=p.getByRole('article',{name:'نسبة الفريق'});const tt=await top(team);await clip('att-team',{y:tt.y,h:tt.h});
const com=p.getByRole('article').filter({has:p.getByRole('heading',{name:/الالتزام آخر/})});const ct=await top(com);await clip('att-list',{y:ct.y,h:Math.min(ct.h,1100)});
await p.goto(U+'/data');await p.waitForTimeout(900);
await p.locator('#signatory').fill('فلان الفلاني');await p.locator('#title').fill('المدير');await p.locator('#reference').fill('DPA-1');await p.locator('#ack').check();await p.getByRole('button',{name:'سجّل الاتفاقية'}).click();await p.waitForTimeout(500);
const ra=p.getByRole('article',{name:'أضف لاعبين'});
await p.getByLabel('الصق القائمة (سطر لكل لاعب)').fill('41 خالد المحمد مهاجم\n٤٢، سالم العلي، وسط\n43 يوسف حارس\n44 عبدالله الكوهجي\n45 ناصر الحمد ظهير ايسر');
const rt=await top(ra);const ta=await top(p.getByLabel('الصق القائمة (سطر لكل لاعب)'));await clip('roster-a',{y:rt.y,h:ta.y+ta.h-rt.y+250});
await p.getByRole('button',{name:'اقرأ القائمة'}).click();await p.waitForTimeout(500);
const tb=await top(p.getByRole('table').first());await clip('roster-b',{y:tb.y-120,h:tb.h+360});
await b.close()})().catch(e=>{console.error(e);process.exit(1)})
