import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,sep} from 'node:path';
import {chromium,type Page} from '@playwright/test';
import {baseline} from '../shared/domain';
import {idleVideo} from '../shared/idle-video';
import {createHash} from 'node:crypto';

async function fixture(useBundled=false){
 const mediaPath=useBundled?idleVideo.src!:'/media/idle-test.mp4';
 const bytes=await readFile(useBundled?'public'+mediaPath:'tests/fixtures/idle-test.mp4');
 const counts:Record<string,number>={};let denyVideo=false,videoFit:'fill'|'contain'='fill';
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url!,'http://localhost').pathname;
  counts[path]=(counts[path]||0)+1;
  if(path===mediaPath){
   if(denyVideo){res.writeHead(503);res.end();return;}
   res.writeHead(200,{'Content-Type':'video/mp4','Content-Length':bytes.length,'Cache-Control':'public, max-age=31536000, immutable'});res.end(bytes);return;
  }
  if(path.startsWith('/api/')){
   res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
   if(path==='/api/public/content'){res.end(JSON.stringify({eventId:'aaihex-2026',versionId:'idle-test',settings:{...baseline,idleEnabled:true,idleTimeout:60,idleVideoFit:videoFit}}));return;}
   if(path==='/api/public/version'){res.end(JSON.stringify({versionId:'idle-test'}));return;}
   if(path==='/api/public/start'){res.end(JSON.stringify({id:'test-round',token:'test-token'}));return;}
   if(path==='/api/public/complete'){res.writeHead(503);res.end(JSON.stringify({error:'Test score save unavailable'}));return;}
   if(path==='/api/public/leaderboard'){res.end('[]');return;}
   res.writeHead(404);res.end('{}');return;
  }
  if(path==='/review'){res.setHeader('Content-Type','text/html');res.end('<iframe title="Frozen preview" src="/?preview=1&frozen=1&screen=home" style="width:100%;height:900px"></iframe>');return;}
  const file=resolve('dist','.'+path);
  if(!file.startsWith(resolve('dist')+sep)&&file!==resolve('dist')){res.writeHead(403);res.end();return;}
  let body:Buffer;
  try{body=await readFile(file);}catch{body=await readFile('dist/index.html');}
  res.setHeader('Content-Type',path.endsWith('.js')?'application/javascript':path.endsWith('.css')?'text/css':path.endsWith('.png')?'image/png':path.endsWith('.webp')?'image/webp':path.endsWith('.woff')?'font/woff':'text/html');
  res.end(body);
 });
 await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
 const address=server.address();assert.ok(address&&typeof address!=='string');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:768,height:1024}});
 await context.addInitScript(src=>{window.__ADCB_IDLE_VIDEO__=src;},mediaPath);
 const page=await context.newPage();
 await page.clock.install({time:new Date('2026-11-23T00:00:00Z')});
 await page.clock.pauseAt(new Date('2026-11-23T00:00:01Z'));
 return {page,context,counts,mediaPath,url:`http://127.0.0.1:${address.port}`,blockVideo:()=>{denyVideo=true;},setVideoFit:(value:'fill'|'contain')=>{videoFit=value;},close:async()=>{await browser.close();await new Promise<void>(done=>server.close(()=>done()));}};
}
async function waitForPlayback(page:Page){
 const video=page.getByRole('region',{name:'AAIHEX idle video'}).locator('video');
 await video.waitFor();
 await video.evaluate(async player=>{
  if(player.readyState<2)await new Promise<void>((resolve,reject)=>{player.addEventListener('loadeddata',()=>resolve(),{once:true});player.addEventListener('error',()=>reject(Error('Video decode failed')),{once:true});});
  await player.play();
 });
 return video;
}
async function register(page:Page){
 await page.getByPlaceholder('ENTER FULL NAME').fill('Idle Guest');
 await page.getByPlaceholder('ENTER EMAIL ADDRESS').fill('idle@example.com');
 await page.getByPlaceholder('ENTER PHONE NUMBER').fill('0501234567');
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'START GAME',exact:true}).click();
 await page.getByRole('button',{name:'START GAME',exact:true}).click();
}

test('one-minute idle video loops from a local copy, makes no idle API calls, and reuses persistent cache after reload',async()=>{
 const f=await fixture();try{
  await f.page.goto(f.url);await f.page.getByPlaceholder('ENTER FULL NAME').waitFor();
  assert.equal(f.counts['/media/idle-test.mp4']||0,0,'No video download before it is needed');
  await f.page.clock.fastForward(59000);assert.equal(await f.page.locator('.idle-video-cover').count(),0);
  await f.page.mouse.move(200,200);await f.page.clock.fastForward(59999);assert.equal(await f.page.locator('.idle-video-cover').count(),0,'Activity restarts the full minute');
  await f.page.clock.fastForward(1);const video=await waitForPlayback(f.page);
  assert.equal(f.counts['/media/idle-test.mp4'],1);
  assert.deepEqual(await video.evaluate(v=>({local:v.currentSrc.startsWith('blob:'),loop:v.loop,muted:v.muted,inline:v.playsInline})),{local:true,loop:true,muted:true,inline:true});
  await f.page.setViewportSize({width:900,height:1024});
  assert.deepEqual(await video.evaluate(v=>{const r=v.getBoundingClientRect();return {fit:getComputedStyle(v).objectFit,x:r.x,y:r.y,width:r.width,height:r.height};}),{fit:'fill',x:0,y:0,width:900,height:1024});
  const screenshot=await f.page.screenshot();
  const corner=await f.page.evaluate(async source=>{
   const image=new Image();image.src=source;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);return Array.from(ctx.getImageData(5,5,1,1).data);
  },'data:image/png;base64,'+screenshot.toString('base64'));
  assert.ok(corner[0]>20&&corner[1]>20&&corner[2]>20,'The mismatched display aspect ratio must not leave black player bars');
  await video.evaluate(player=>{
   (window as any).__idleLoops=0;
   player.addEventListener('seeking',()=>{(window as any).__idleLoops+=1;});
  });
  await new Promise(done=>setTimeout(done,2400));
  const playback=await video.evaluate(player=>({loops:(window as any).__idleLoops,time:player.currentTime,duration:player.duration,paused:player.paused,ended:player.ended,ready:player.readyState}));
  assert.ok(playback.loops>=1,'The MP4 decoder must actually loop: '+JSON.stringify(playback));
  const before=JSON.stringify(f.counts);await f.page.clock.fastForward(600000);assert.equal(JSON.stringify(f.counts),before,'Looping does not fetch video, poll content or reload the page');
  await f.page.keyboard.press('Escape');await f.page.getByPlaceholder('ENTER FULL NAME').waitFor();
  assert.equal(await f.page.getByPlaceholder('ENTER FULL NAME').inputValue(),'');
  await f.page.clock.fastForward(60000);await waitForPlayback(f.page);assert.equal(f.counts['/media/idle-test.mp4'],1);
  await f.page.mouse.click(384,512);await f.page.getByPlaceholder('ENTER FULL NAME').waitFor();
  f.blockVideo();f.setVideoFit('contain');await f.page.reload();await f.page.getByPlaceholder('ENTER FULL NAME').waitFor();
  await f.page.clock.fastForward(60000);const proportional=await waitForPlayback(f.page);
  assert.equal(await proportional.evaluate(v=>getComputedStyle(v).objectFit),'contain');
  assert.equal(f.counts['/media/idle-test.mp4'],1,'A reload must use Cache Storage rather than download again');
 }finally{await f.close();}
});

test('idle video clears abandoned gameplay but preserves an unsaved result and pauses its background save retries',async()=>{
 const f=await fixture();try{
  await f.page.goto(f.url);await register(f.page);
  await f.page.getByRole('article',{name:'Round 1',exact:true}).getByRole('button',{name:'START',exact:true}).click();
  await f.page.clock.fastForward(60000);await waitForPlayback(f.page);
  assert.equal(f.counts['/api/public/complete']||0,0,'An abandoned timer never creates a fabricated score');
  await f.page.keyboard.press('Escape');await f.page.getByPlaceholder('ENTER FULL NAME').waitFor();
  assert.equal(await f.page.getByPlaceholder('ENTER FULL NAME').inputValue(),'');
  await register(f.page);
  await f.page.evaluate(()=>{(window as any).__gameClock=0;performance.now=()=>(window as any).__gameClock;});
  for(const round of [1,2]){
   const card=f.page.getByRole('article',{name:'Round '+round,exact:true});await card.getByRole('button',{name:'START',exact:true}).click();
   await f.page.evaluate(()=>{(window as any).__gameClock+=5000;});await card.getByRole('button',{name:'STOP',exact:true}).click();
  }
  await f.page.getByText('Test score save unavailable',{exact:false}).waitFor();
  await f.page.clock.fastForward(60000);await waitForPlayback(f.page);
  const attempts=f.counts['/api/public/complete'];await f.page.clock.fastForward(600000);
  assert.equal(f.counts['/api/public/complete'],attempts,'Unsaved data is retained without retry traffic throughout the video');
  await f.page.keyboard.press('Escape');await f.page.getByRole('button',{name:'Retry saving score',exact:true}).waitFor();
  assert.match(await f.page.locator('.union-equation').innerText(),/5\.000 \+ 5\.000/);
 }finally{await f.close();}
});

test('frozen editor previews never start the idle video',async()=>{
 const f=await fixture();try{
  await f.page.goto(f.url+'/review');const frame=f.page.frameLocator('iframe');
  await frame.getByRole('heading',{name:'THE 55 YEARS CHALLENGE',exact:true}).waitFor();
  await f.page.clock.fastForward(600000);
  assert.equal(await frame.locator('.idle-video-cover').count(),0);
  assert.equal(f.counts['/media/idle-test.mp4']||0,0);
 }finally{await f.close();}
});

test('the real bundled AAIHEX video decodes at LED resolution, loops locally, and is also embedded in the offline file',async()=>{
 assert.ok(idleVideo.src&&idleVideo.sha256,'The actual supplied video must be included');
 const original=await readFile('public'+idleVideo.src);
 assert.equal(original.length,idleVideo.bytes);assert.ok(original.length<25*1024*1024);
 assert.equal(createHash('sha256').update(original).digest('hex'),idleVideo.sha256);
 const html=await readFile('adcb-reaction-timer.html','utf8');
 const embedded=html.match(/window\.__ADCB_IDLE_VIDEO__="data:video\/mp4;base64,([A-Za-z0-9+/=]+)"/);
 assert.ok(embedded,'Standalone playback must not fetch a separate file');
 assert.equal(createHash('sha256').update(Buffer.from(embedded[1],'base64')).digest('hex'),idleVideo.sha256);
 const f=await fixture(true);try{
  await f.page.goto(f.url);await f.page.getByPlaceholder('ENTER FULL NAME').waitFor();
  await f.page.clock.fastForward(60000);const video=await waitForPlayback(f.page);
  assert.deepEqual(await video.evaluate(v=>[v.videoWidth,v.videoHeight]),[768,1024]);
  await video.evaluate(async player=>{
   player.currentTime=player.duration-.2;
   await new Promise<void>(done=>player.addEventListener('seeked',()=>done(),{once:true}));
   (window as any).__actualLoops=0;
   player.addEventListener('seeking',()=>{(window as any).__actualLoops+=1;});
   await player.play();
  });
  await new Promise(done=>setTimeout(done,1400));
  assert.ok(await f.page.evaluate(()=>(window as any).__actualLoops>=1),'The supplied marketing video must loop after its final frame');
  assert.equal(f.counts[f.mediaPath],1,'No new request when the real video loops');
  await f.page.screenshot({path:'/tmp/adcb-idle-video.png',fullPage:true});
 }finally{await f.close();}
});
