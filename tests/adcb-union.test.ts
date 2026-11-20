import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium,type Browser,type Page} from '@playwright/test';
import {Miniflare} from 'miniflare';
import {baseline} from '../shared/domain';
import {ensureSchema} from '../cloudflare/schema';
import {handleApi} from '../cloudflare/backend';
import {initializeEvents} from '../cloudflare/events';

let browser:Browser,url:string;
const server=createServer();
before(async()=>{
 const html=await readFile('adcb-reaction-timer.html');
 server.on('request',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();assert.ok(address&&typeof address!=='string');url=`http://127.0.0.1:${address.port}/`;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
});
after(async()=>{await browser?.close();await new Promise<void>(resolve=>server.close(()=>resolve()));});

async function register(page:Page){
 await page.goto(url);
 await page.getByPlaceholder('ENTER FULL NAME').fill('Union Guest');
 await page.getByPlaceholder('ENTER EMAIL ADDRESS').fill('guest@example.com');
 await page.getByPlaceholder('ENTER PHONE NUMBER').fill('0501234567');
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'START GAME',exact:true}).click();
}
async function stopAt(page:Page,round:number,milliseconds:number){
 const card=page.getByRole('article',{name:'Round '+round,exact:true});
 await card.getByRole('button',{name:'START',exact:true}).click();
 await page.evaluate(ms=>{(window as any).__unionClock+=ms;},milliseconds);
 await card.getByRole('button',{name:'STOP',exact:true}).click();
}

test('Union tribute uses real results, joins the two scores into the official gold mark, and never celebrates a miss',async()=>{
 const context=await browser.newContext({viewport:{width:1080,height:1920}});
 await context.addInitScript(()=>{(window as any).__unionClock=0;performance.now=()=>(window as any).__unionClock;});
 try{
  const page=await context.newPage();await register(page);
  await page.getByText('Round 01 — 5 seconds for the first 50 years (1971–2021).',{exact:true}).waitFor();
  await page.getByText('Round 02 — 5 seconds for the next 5 years (2021–2026).',{exact:true}).waitFor();
  const logo=await page.locator('.adcb-logo').boundingBox();const contextLine=await page.getByText('Celebrating 55 Years of the Union',{exact:true}).boundingBox();
  assert.ok(logo&&contextLine&&contextLine.y>=logo.y+logo.height,'The context belongs below the ADCB logo');
  await page.getByRole('button',{name:'START GAME',exact:true}).click();
  await page.getByText('The first 50 years · 1971–2021',{exact:true}).waitFor();
  await page.getByText('The next 5 years · 2021–2026',{exact:true}).waitFor();
  await stopAt(page,1,4970);await stopAt(page,2,5007);
  await page.getByText('55 YEARS COMPLETE!',{exact:true}).waitFor();
  assert.match(await page.locator('.union-equation').innerText(),/4\.970 \+ 5\.007 = 55 YEARS \(1971–2026\)/);
  assert.equal(await page.locator('.union-merging-score').count(),2);
  assert.equal(await page.locator('.union-score-0 strong').innerText(),'4.970');
  assert.equal(await page.locator('.union-score-1 strong').innerText(),'5.007');
  assert.equal(await page.locator('.union-score-0').evaluate(el=>getComputedStyle(el).animationName),'union-scores-meet');
  const mark=page.getByRole('img',{name:'55',exact:true});
  await mark.evaluate(async el=>{await Promise.all(el.getAnimations().map(animation=>animation.finished));});
  const appearance=await mark.evaluate(el=>{const style=getComputedStyle(el);return {filter:style.filter,opacity:style.opacity,mask:style.maskImage,background:style.backgroundImage};});
  assert.match(appearance.filter,/^(none|grayscale\(0\) brightness\(1\))$/);assert.equal(appearance.opacity,'1');
  assert.match(appearance.mask,/data:image\/png;base64/,'The official silhouette must remain embedded offline');
  assert.match(appearance.background,/linear-gradient/);
  assert.equal(await page.locator('.union-official-caption').innerText(),'روح الاتحاد');
  assert.equal(await page.locator('.union-arabic').innerText(),'٥٥ عاماً من الاتحاد');
  assert.equal(await page.locator('.union-arabic').getAttribute('dir'),'rtl');
  assert.equal(await page.evaluate(()=>{const c=document.createElement('canvas');return c.getContext('2d')!==null&&document.fonts.check('23px "National Day Arabic"');}),true);
  await page.screenshot({path:'/tmp/adcb-union-win.png',fullPage:true});
  const records=await page.evaluate(()=>JSON.parse(localStorage.getItem('adcb-records')!));
  assert.deepEqual(records[0].roundTimes,[4.970,5.007]);
  await page.getByRole('button',{name:'VIEW UNION CHAMPIONS',exact:true}).click();
  await page.getByRole('heading',{name:'55 UNION CHAMPIONS',exact:true}).waitFor();
  await page.getByRole('button',{name:'RETRY',exact:true}).click();await stopAt(page,1,4911);
  await page.getByText('NOT QUITE! GIVE IT ANOTHER GO.',{exact:true}).waitFor();
  assert.equal(await page.locator('.union-win').count(),0,'An out-of-range time must not display the winning tribute');
 }finally{await context.close();}
});

test('reduced motion shows the completed gold tribute immediately',async()=>{
 const context=await browser.newContext({reducedMotion:'reduce'});
 await context.addInitScript(()=>{(window as any).__unionClock=0;performance.now=()=>(window as any).__unionClock;});
 try{
  const page=await context.newPage();await register(page);await page.getByRole('button',{name:'START GAME',exact:true}).click();
  await stopAt(page,1,5000);await stopAt(page,2,5000);
  const mark=page.getByRole('img',{name:'55',exact:true});await mark.waitFor();
  assert.deepEqual(await mark.evaluate(el=>{const s=getComputedStyle(el);return [s.animationName,s.opacity,s.filter];}),['none','1','none']);
  assert.equal(await page.locator('.union-score-0').evaluate(el=>getComputedStyle(el).opacity),'0');
  assert.equal(await page.locator('.union-official-caption').evaluate(el=>getComputedStyle(el).opacity),'1');
 }finally{await context.close();}
});

test('existing local designs receive Union copy once and keep their art, scores and history',async()=>{
 const context=await browser.newContext();
 try{
  const page=await context.newPage();await page.goto(url);
  const old={...structuredClone(baseline),title:'THE 5 + 5 CHALLENGE'};old.elements[0].x+=2;old.text.winner='5 + 5 COMPLETE! YOU DID IT!';
  await page.evaluate(old=>{
   localStorage.removeItem('adcb-union-tribute-v1');
   localStorage.setItem('adcb-studio',JSON.stringify({revision:7,draft:old,versions:[{id:'old-local',settings:old,reason:'Existing',createdAt:'2026-11-01T00:00:00Z'}]}));
   localStorage.setItem('adcb-records','[{"id":"keep-this-result"}]');
  },old);
  await page.reload();await page.getByRole('heading',{name:'THE 55 YEARS CHALLENGE',exact:true}).waitFor();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('adcb-studio')!));
  assert.equal(saved.revision,8);assert.equal(saved.versions.length,2);assert.deepEqual(saved.versions[0].settings,old);
  assert.deepEqual(saved.draft.elements,old.elements);assert.deepEqual(saved.versions[1].settings.elements,old.elements);
  assert.equal(await page.evaluate(()=>localStorage.getItem('adcb-records')),'[{"id":"keep-this-result"}]');
  await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('adcb-studio')!);state.versions.at(-1).settings.title='Later client edit';localStorage.setItem('adcb-studio',JSON.stringify(state));});
  await page.reload();await page.getByRole('heading',{name:'Later client edit',exact:true}).waitFor();
 }finally{await context.close();}
});

test('hosted Union publication preserves existing layouts and timing settings, and does not overwrite later edits',async()=>{
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-08-01',d1Databases:['DB']});
 try{
  const db=await mf.getD1Database('DB');await ensureSchema(db as any);
  const old=structuredClone(baseline);old.title='THE 5 + 5 CHALLENGE';old.target=5.2;old.tolerance=.075;old.elements[0].x+=2;
  const draft=structuredClone(old);draft.elements[0].y+=3;
  const raw=JSON.stringify(old);const created='2026-11-01T00:00:00Z';
  await db.batch([
   db.prepare('INSERT INTO design_versions(id,settings,reason,created_at) VALUES(?,?,?,?)').bind('adcb-exhibition-composition-v5',raw,'Existing composition',created),
   db.prepare('INSERT INTO design_versions(id,settings,reason,created_at) VALUES(?,?,?,?)').bind('custom-published',raw,'User adjustments',created),
   db.prepare('INSERT INTO studio VALUES(1,8,?,?)').bind(raw,'custom-published'),
   db.prepare('INSERT INTO event_profiles VALUES(?,?,8,?,?)').bind('aaihex-2026','AAIHEX 2026',JSON.stringify(draft),'custom-published'),
   db.prepare('INSERT INTO game_event_state VALUES(1,?,0)').bind('aaihex-2026'),
   db.prepare('INSERT INTO records(id,data,difference,completed_at) VALUES(?,?,0,?)').bind('keep-this-score','{}',created),
  ]);
  const response=await handleApi(new Request('https://adcb.example/api/public/content'),{DB:db} as any);
  assert.equal(response.status,200);const content:any=await response.json();
  assert.equal(content.settings.title,'THE 55 YEARS CHALLENGE');assert.equal(content.versionId,'adcb-union-tribute-v1');
  assert.deepEqual(content.settings.elements,old.elements);assert.equal(content.settings.target,5.2);assert.equal(content.settings.tolerance,.075);
  const profile:any=await db.prepare("SELECT * FROM event_profiles WHERE id='aaihex-2026'").first();
  assert.equal(profile.revision,9);assert.deepEqual(JSON.parse(profile.draft).elements,draft.elements);
  assert.equal((await db.prepare("SELECT settings FROM design_versions WHERE id='custom-published'").first() as any).settings,raw);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM records').first() as any).n,1);
  await db.prepare("UPDATE event_profiles SET draft=?,revision=10 WHERE id='aaihex-2026'").bind(raw).run();
  const restarted=new Proxy(db,{get(target,key){const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
  await initializeEvents({DB:restarted} as any);
  const after:any=await db.prepare("SELECT draft,revision FROM event_profiles WHERE id='aaihex-2026'").first();
  assert.equal(after.draft,raw);assert.equal(after.revision,10);
 }finally{await mf.dispose();}
});
