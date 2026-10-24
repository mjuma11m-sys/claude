const {chromium}=require('/home/user/claude/sports-hub-app/node_modules/playwright');
const O='/tmp/claude-0/deck/shots/', U='http://localhost:4399';
(async()=>{const b=await chromium.launch();
const mk=async(w,h,dpr)=>{const c=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:dpr,locale:'ar-BH'});const p=await c.newPage();await p.goto(U+'/login');await p.evaluate(()=>localStorage.setItem('sh.demoRole','club_admin'));return p};
const d=await mk(980,1500,1.6);
const go=async(p,path,wait=900)=>{await p.goto(U+path);await p.waitForTimeout(wait)};
// attendance sessions
await go(d,'/attendance');
const plan=[[1,[[11,'غائب'],[3,'متأخر']]],[3,[[11,'غائب']]],[5,[[3,'متأخر'],[9,'غائب']]],[8,[[11,'غائب'],[4,'متأخر']]],[10,[]],[12,[[11,'غائب'],[9,'غائب بعذر']]],[15,[[3,'غائب']]],[19,[]],[35,[[11,'غائب']]],[40,[[3,'متأخر'],[11,'غائب']]],[48,[]],[52,[[4,'غائب']]]];
for(const [back,marks] of plan){
  await d.getByLabel('اليوم').fill(new Date(Date.now()-back*864e5).toISOString().slice(0,10));
  await d.getByRole('button',{name:'الكل حاضر'}).click();
  for(const [n,s] of marks) await d.getByRole('radiogroup',{name:new RegExp('حضور اللاعب '+n+'$')}).getByRole('radio',{name:s,exact:true}).click();
  await d.getByRole('button',{name:/^احفظ/}).click();await d.waitForTimeout(350);
}
// last one keeps the summary open: record a fresh session for today
await d.getByLabel('اليوم').fill(new Date().toISOString().slice(0,10));
await d.getByRole('button',{name:'الكل حاضر'}).click();
for(const [n,s] of [[11,'غائب'],[3,'متأخر'],[9,'غائب بعذر']]) await d.getByRole('radiogroup',{name:new RegExp('حضور اللاعب '+n+'$')}).getByRole('radio',{name:s,exact:true}).click();
await d.getByRole('button',{name:/^احفظ/}).click();await d.waitForTimeout(500);
await d.evaluate(()=>window.scrollTo(0,0));await d.waitForTimeout(300);await d.locator('#main').screenshot({path:O+'att-top.png'});
await d.getByRole('textbox',{name:'نص الملخص'}).scrollIntoViewIfNeeded();await d.waitForTimeout(300);await d.locator('#main').screenshot({path:O+'att-summary.png'});
await d.getByRole('tab',{name:'الجدول الشهري'}).click();await d.waitForTimeout(500);await d.evaluate(()=>window.scrollTo(0,0));await d.locator('#main').screenshot({path:O+'att-month.png'});
for(const [f,path] of [['club','/club'],['lineup','/lineup'],['report','/report'],['player','/player/demo-9'],['settings','/settings'],['analysis','/analysis'],['rights','/rights'],['development','/development']]){await go(d,path,1200);await d.locator('#main').screenshot({path:O+f+'.png'})}
// data center + roster paste
await go(d,'/data');
await d.locator('#signatory').fill('فلان الفلاني');await d.locator('#title').fill('المدير');await d.locator('#reference').fill('DPA-1');await d.locator('#ack').check();await d.getByRole('button',{name:'سجّل الاتفاقية'}).click();await d.waitForTimeout(500);
await d.getByLabel('الصق القائمة (سطر لكل لاعب)').fill('41 خالد المحمد مهاجم\n٤٢، سالم العلي، وسط\n43 يوسف حارس\n44 عبدالله الكوهجي\n45 ناصر الحمد ظهير ايسر');
await d.getByRole('button',{name:'اقرأ القائمة'}).click();await d.waitForTimeout(400);
await d.getByRole('article',{name:'أضف لاعبين'}).scrollIntoViewIfNeeded();await d.locator('#main').screenshot({path:O+'roster.png'});
await d.evaluate(()=>window.scrollTo(0,0));await d.locator('#main').screenshot({path:O+'data.png'});
// phone
const ph=await mk(390,844,2);
await go(ph,'/club',1400);await ph.screenshot({path:O+'ph-club.png'});
await go(ph,'/attendance',1000);await ph.screenshot({path:O+'ph-att.png'});
await go(ph,'/login',600);await ph.evaluate(()=>localStorage.clear());await go(ph,'/login',900);await ph.screenshot({path:O+'ph-login.png'});
await b.close()})().catch(e=>{console.error(e);process.exit(1)})
