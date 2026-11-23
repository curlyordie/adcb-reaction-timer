import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium,type Browser,type FrameLocator,type Page} from '@playwright/test';
import {Miniflare} from 'miniflare';
import {baseline,normalize,type Settings} from '../shared/domain';
import {exhibitionElements} from '../shared/exhibition';
import {gamePages} from '../shared/editor';
import {readabilityPublicationId,withReadableText} from '../shared/readability';
import {idleVideoPublicationId} from '../shared/idle-video';
import {ensureSchema} from '../cloudflare/schema';
import {handleApi} from '../cloudflare/backend';
import {initializeEvents} from '../cloudflare/events';

let browser:Browser,url:string;
const server=createServer();
before(async()=>{
 const html=await readFile('adcb-reaction-timer.html');
 const embedded=html.toString().match(/<script>window\.__ADCB_OFFLINE__=true;[\s\S]*?<\/script>/)![0];
 server.on('request',(req,res)=>{res.setHeader('Content-Type','text/html');res.end(req.url==='/review'?embedded+'<iframe style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>':html);});
 await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const address=server.address();assert.ok(address&&typeof address!=='string');url=`http://127.0.0.1:${address.port}/`;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
});
after(async()=>{await browser.close();await new Promise<void>(done=>server.close(()=>done()));});

function previousDesign():Settings{
 return normalize({...baseline,designFormat:'portrait',elements:exhibitionElements('portrait'),tolerance:.17,
  pageTextScale:Object.fromEntries(gamePages.map(page=>[page,150])),textSizes:{playing:{round1Tribute:40,round2Tribute:40}}});
}
async function settle(target:FrameLocator|Page){
 await target.locator('.game').waitFor();await target.locator('body').evaluate(async()=>{
  await document.fonts.ready;await Promise.all(Array.from(document.images).map(image=>image.decode().catch(()=>{})));
  await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
 });
}
async function readable(target:FrameLocator|Page,minimums:Record<string,number>){
 await settle(target);
 const result=await target.locator('.game-canvas').evaluate((canvas,minimums)=>{
  const scale=canvas.getBoundingClientRect().width/(canvas as HTMLElement).offsetWidth;
  const stage=canvas.querySelector('.game-stage')!.getBoundingClientRect();
  return {scale,height:(canvas as HTMLElement).offsetHeight,stage:{left:stage.left,right:stage.right,top:stage.top,bottom:stage.bottom},
   text:Object.entries(minimums).flatMap(([selector,min])=>Array.from(canvas.querySelectorAll<HTMLElement>(selector)).map(el=>{
    const rect=el.getBoundingClientRect();return {selector,min,font:parseFloat(getComputedStyle(el).fontSize)*scale,
     fits:rect.left>=0&&rect.right<=innerWidth+.5&&rect.top>=0&&rect.bottom<=innerHeight+.5,
     overflows:el.scrollWidth>el.clientWidth+1};
   }))};
 },minimums);
 assert.equal(result.scale,1,'Native LED content must not be shrunk to fit');assert.equal(result.height,1024);
 assert.ok(result.stage.left>=0&&result.stage.right<=768&&result.stage.bottom<=794,'All content must fit above the full-size scene');
 for(const item of result.text){assert.ok(item.font>=item.min-.05,`${item.selector}: ${item.font}px is below ${item.min}px`);assert.ok(item.fits,`${item.selector} is clipped`);assert.equal(item.overflows,false,`${item.selector} overflows horizontally`);}
 assert.ok(result.text.length>=Object.keys(minimums).length,'Every requested text style must be present');
}

test('native LED pages balance legible text, comfortable leading and prominent illustrations without overlaps',async()=>{
 const context=await browser.newContext({viewport:{width:768,height:1024}});
 try{
  const page=await context.newPage();await page.goto(url+'review');
  await page.evaluate(settings=>sessionStorage.setItem('adcb-preview',JSON.stringify(settings)),withReadableText(previousDesign()));
  const frame=page.frameLocator('iframe');
  const minimums:Record<string,Record<string,number>>={
   home:{'.home-headline':36,'.registration-field label':18,'.registration-field input':20,'.registration-consent':16,'.home-actions button':20},
   instructions:{'h1':36,'.instruction-step':20,'.instruction-step-number':20,'.instruction-range':18,'.instruction-begin':20},
   countdown:{'.countdown-number':260},
   playing:{'h1':36,'.eyebrow':16,'.round-heading>span:first-child':20,'.round-heading>span:last-child':16,'.round-tribute':20,'.national-day-numerals':76,'.stopwatch-units':16,'.timer-action':16,'.tolerance-note':18},
   result:{'.result-panel .text-5xl':34,'.union-equation':18,'.union-arabic':22,'.union-official-caption':22,'.result-detail>span:first-child':18,'.result-detail>span:last-child':28,'.result-panel button':18},
   leaderboard:{'h1':36,'.leaderboard-screen p':18,'.leaderboard-screen button':20},
  };
  for(const screen of gamePages){
   await page.locator('iframe').evaluate((el,screen)=>(el as HTMLIFrameElement).src='/?preview=1&frozen=1&screen='+screen,screen);
   await frame.locator(`.game[data-screen=${screen}]`).waitFor();
   await readable(frame,{'.union-context':20,'.event-name':16,...minimums[screen]});
   const balance=await frame.locator('.game').evaluate(game=>{
    const leading=Array.from(game.querySelectorAll('.instruction-step,.round-tribute,.tolerance-note,.registration-consent,.union-equation')).map(el=>{const css=getComputedStyle(el);return parseFloat(css.lineHeight)/parseFloat(css.fontSize);});
    let sceneTop=Infinity,largestFigure=0;
    for(const img of game.querySelectorAll<HTMLImageElement>('.exhibition-scene img')){
     const sample=document.createElement('canvas');sample.width=128;sample.height=Math.round(128*img.naturalHeight/img.naturalWidth);
     const ctx=sample.getContext('2d')!;ctx.drawImage(img,0,0,sample.width,sample.height);const pixels=ctx.getImageData(0,0,sample.width,sample.height).data;
     let first=Infinity,last=-1;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>32){const row=Math.floor(i/4/sample.width);first=Math.min(first,row);last=Math.max(last,row);}
     if(last>=0){const rect=img.getBoundingClientRect();sceneTop=Math.min(sceneTop,rect.top+first/sample.height*rect.height);largestFigure=Math.max(largestFigure,(last-first+1)/sample.height*rect.height);}
    }
    return {leading,sceneTop,largestFigure,mainBottom:game.querySelector('.game-stage')!.getBoundingClientRect().bottom};
   });
   assert.ok(balance.leading.every(value=>value>=1.45),'Body copy must have comfortable line spacing');
   assert.ok(balance.largestFigure>=(screen==='countdown'?80:130),`${screen}: the illustration scene must remain prominent (${balance.largestFigure}px)`);
   if(screen!=='countdown')assert.ok(balance.sceneTop>=balance.mainBottom+12,`${screen}: illustration ${balance.sceneTop} touches content ${balance.mainBottom}`);
   if(screen==='instructions')assert.equal(await frame.locator('.instruction-step-number').count(),4);
   if(screen==='playing'){
    const ranges=frame.locator('.round-year-range');assert.equal(await ranges.count(),2);
    assert.ok(await ranges.evaluateAll(nodes=>nodes.every(el=>el.getClientRects().length===1)),'Each year range must stay on one line');
   }
  }
  await page.locator('iframe').evaluate(el=>(el as HTMLIFrameElement).src='/?preview=1&frozen=1&screen=result&outcome=lose');
  await frame.locator('.result-timers').waitFor();
  await readable(frame,{'.result-timers article>span':16,'.national-day-numerals':64,'.result-timers strong':16,'.result-detail>span:last-child':28,'.result-panel button':18});
 }finally{await context.close();}
});

test('existing local settings keep history and scores, and physical-keyboard registration keeps the native readable layout',async()=>{
 const context=await browser.newContext({viewport:{width:768,height:1024}});
 try{
  const page=await context.newPage();await page.goto(url);
  const old=previousDesign();old.elements=old.elements.slice(1);old.elements.push({...old.elements[0],id:'custom-illustration',page:'home',width:12,x:12,y:86});
  const records=Array.from({length:20},(_,i)=>({id:'existing-'+i,fullName:'EXHIBITION GUEST '+i,roundTimes:[5,5],finalTime:5,difference:0,qualified:true,countryCode:'+971'}));
  await page.evaluate(({old,records})=>{
   localStorage.removeItem('adcb-led-readable-type-v1');
   localStorage.setItem('adcb-studio',JSON.stringify({revision:7,draft:{...old,eventName:'Private draft'},versions:[{id:'previous-live',settings:old,reason:'Previous',createdAt:'2026-11-01T00:00:00Z'}]}));
   localStorage.setItem('adcb-records',JSON.stringify(records));
  },{old,records});
  await page.reload();await readable(page,{'.registration-field label':18,'.registration-field input':20});
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('adcb-studio')!));
  assert.equal(state.revision,8);assert.equal(state.versions.at(-1).id,readabilityPublicationId);assert.deepEqual(state.versions[0].settings,old);
  assert.equal(state.draft.eventName,'Private draft');assert.equal(state.versions.at(-1).settings.elements.length,old.elements.length);
  assert.deepEqual(state.draft.elements.at(-1),old.elements.at(-1));assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('adcb-records')!)),records);
  await page.getByPlaceholder('ENTER FULL NAME').click();
  for(const [placeholder,value] of [['ENTER FULL NAME','LED Guest'],['ENTER EMAIL ADDRESS','led@example.com'],['ENTER PHONE NUMBER','0501234567']]){
   const input=page.getByPlaceholder(placeholder);assert.equal(await input.evaluate(el=>el===document.activeElement),true,'Tab must move between registration fields');
   await page.keyboard.type(value);assert.equal(await input.inputValue(),value);
   assert.equal(await page.getByRole('region',{name:'On-screen keyboard'}).count(),0,'Focusing and typing must not open an app keyboard');
   await readable(page,{'.registration-field input':20,'.home-actions button':20});
   await page.keyboard.press('Tab');
  }
  assert.equal(await page.getByRole('checkbox').evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Space');await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('button',{name:'START GAME',exact:true}).evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Enter');
  await page.getByRole('heading',{name:'HOW TO PLAY',exact:true}).waitFor();await page.getByRole('button',{name:'START GAME',exact:true}).click();
  await readable(page,{'.timer-action:not(:disabled)':24,'.timer-card>.round-tribute':20});
  await page.goto(url);await page.getByRole('button',{name:'VIEW UNION CHAMPIONS',exact:true}).click();await page.getByText('EXHIBITION GUEST 0',{exact:true}).waitFor();
  await readable(page,{'.leaderboard-scroll>div:first-child .text-sm':20,'.leaderboard-scroll>div:first-child .text-mono':18,'.leaderboard-screen button':20});
  await page.locator('.leaderboard-scroll').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await readable(page,{'.leaderboard-scroll>div:last-child .text-sm':20,'.leaderboard-scroll>div:last-child .text-mono':18,'.leaderboard-screen button':20});
  await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('adcb-studio')!);state.versions.at(-1).settings.title='Later edit';localStorage.setItem('adcb-studio',JSON.stringify(state));});
  await page.goto(url);await page.getByRole('heading',{name:'Later edit',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('adcb-studio')!).versions.length),2);
 }finally{await context.close();}
});

test('hosted publication replaces old shrink-inducing type settings once and preserves timing, draft copy, scores and recoverable history',async()=>{
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-08-01',d1Databases:['DB']});
 try{
  const db=await mf.getD1Database('DB');await ensureSchema(db as any);const old=previousDesign();const created='2026-11-01T00:00:00Z';
  await db.batch([
   ...['adcb-exhibition-composition-v5','adcb-union-tribute-v1',idleVideoPublicationId,'previous-live'].filter((id):id is string=>Boolean(id)).map(id=>db.prepare('INSERT INTO design_versions(id,settings,reason,created_at) VALUES(?,?,?,?)').bind(id,JSON.stringify(old),'Previous',created)),
   db.prepare('INSERT INTO event_profiles VALUES(?,?,8,?,?)').bind('aaihex-2026','AAIHEX 2026',JSON.stringify({...old,eventName:'Private draft'}),'previous-live'),
   db.prepare('INSERT INTO game_event_state VALUES(1,?,0)').bind('aaihex-2026'),
   db.prepare('INSERT INTO records(id,data,difference,completed_at) VALUES(?,?,0,?)').bind('existing-score','{}',created),
  ]);
  const response=await handleApi(new Request('https://adcb.example/api/public/content'),{DB:db} as any);assert.equal(response.status,200);
  const content:any=await response.json();assert.equal(content.versionId,readabilityPublicationId);assert.deepEqual(content.settings,withReadableText(old));
  const profile:any=await db.prepare("SELECT * FROM event_profiles WHERE id='aaihex-2026'").first();assert.equal(profile.revision,9);assert.equal(JSON.parse(profile.draft).eventName,'Private draft');
  assert.equal((await db.prepare("SELECT settings FROM design_versions WHERE id='previous-live'").first() as any).settings,JSON.stringify(old));
  assert.equal((await db.prepare('SELECT count(*) AS n FROM records').first() as any).n,1);
  assert.equal((await db.prepare('SELECT event_id FROM event_design_versions WHERE version_id=?').bind(readabilityPublicationId).first() as any).event_id,'aaihex-2026');
  await db.prepare("UPDATE event_profiles SET draft=?,revision=10 WHERE id='aaihex-2026'").bind(JSON.stringify(old)).run();
  const restarted=new Proxy(db,{get(target,key){const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});await initializeEvents({DB:restarted} as any);
  const after:any=await db.prepare("SELECT draft,revision FROM event_profiles WHERE id='aaihex-2026'").first();assert.equal(after.revision,10);assert.equal(after.draft,JSON.stringify(old));
 }finally{await mf.dispose();}
});
