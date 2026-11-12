import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
import {handleApi} from '../cloudflare/backend';
import {baseline} from '../shared/domain';

async function fixture(settings={...baseline,autoReturnEnabled:false},event='f1'){
 const counts:Record<string,number>={};let version='low-data-v1';
 const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url!,'http://localhost');const path=url.pathname;
  if(path.startsWith('/api/')){
   counts[path]=(counts[path]||0)+1;res.setHeader('Content-Type','application/json');
   if(path==='/api/public/content')res.end(JSON.stringify({eventId:event,versionId:version,settings}));
   else if(path==='/api/public/version')res.end(JSON.stringify({eventId:event,versionId:version}));
   else if(path==='/api/public/leaderboard')res.end('[]');
   else if(path==='/api/admin/snapshot')res.end(JSON.stringify({revision:0,draft:settings,versions:[{id:version,settings,reason:'Test',createdAt:'2026-11-12T00:00:00Z'}],eventId:event,eventName:'Test event',activeEventId:event,eventRevision:0,events:[{id:event,name:'Test event'}]}));
   else if(path==='/api/admin/event-records')res.end(JSON.stringify({records:[],next:null}));
   else if(path==='/api/admin/daily-days')res.end(JSON.stringify({today:'2026-11-12',days:['2026-11-12']}));
   else if(path==='/api/admin/daily-results')res.end(JSON.stringify({day:'2026-11-12',records:[],leaderboard:[]}));
   else{res.statusCode=404;res.end('{}');}return;
  }
  const file=path.startsWith('/assets/')||path.startsWith('/flags/')?resolve('dist','.'+path):resolve('dist/index.html');res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(await readFile(file));
 }catch{res.writeHead(500).end();}});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage();await page.clock.install({time:new Date('2026-11-12T08:00:00Z')});
 return {page,counts,publish:()=>{version='low-data-v2';settings={...settings,title:'Changed publication'};},url:'http://127.0.0.1:'+(server.address() as any).port,close:async()=>{await browser.close();await new Promise<void>(r=>server.close(()=>r()));}};
}

test('public version check transfers only the version and performs one read without startup writes',async()=>{
 let reads=0;const response=await handleApi(new Request('https://fab.example/api/public/version'),{DB:{prepare(sql:string){assert.match(sql,/SELECT e.id/);return {async first(){reads++;return {eventId:'jiu-jitsu',versionId:'example-version'};}};}}} as any);
 assert.equal(response.status,200);const body=await response.text();assert.equal(reads,1);assert.ok(body.length<100);assert.equal('settings' in JSON.parse(body),false);assert.equal(response.headers.get('Cache-Control'),'no-store');
});

test('ten minutes on registration downloads settings once and only three tiny version checks',async()=>{
 const f=await fixture();try{
  await f.page.goto(f.url);await f.page.getByPlaceholder('ENTER FULL NAME').waitFor();for(let i=0;i<3;i++){const checked=f.page.waitForResponse(r=>r.url().endsWith('/api/public/version'));await f.page.clock.runFor(180000);await (await checked).finished();await f.page.evaluate(()=>Promise.resolve());}await f.page.clock.runFor(60000);
  assert.equal(f.counts['/api/public/content'],1);assert.equal(f.counts['/api/public/version'],3);assert.equal(f.counts['/api/public/start']||0,0);
  const before=f.counts['/api/public/version'];const opened=f.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/public/leaderboard');await f.page.getByRole('button',{name:'VIEW LEADERBOARD',exact:true}).click();await (await opened).finished();await f.page.getByRole('button',{name:'Refresh leaderboard',exact:true}).waitFor();await f.page.clock.runFor(600000);assert.equal(f.counts['/api/public/leaderboard'],1);assert.equal(f.counts['/api/public/version'],before);
  const refreshed=f.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/public/leaderboard');await f.page.getByRole('button',{name:'Refresh leaderboard',exact:true}).click();await refreshed;
  assert.equal(f.counts['/api/public/leaderboard'],2);
 }finally{await f.close();}
});

test('a changed tiny version triggers one settings reload at registration',async()=>{
 const f=await fixture();try{
  await f.page.goto(f.url);await f.page.getByPlaceholder('ENTER FULL NAME').waitFor();f.publish();await f.page.clock.runFor(180100);await f.page.getByRole('heading',{name:'Changed publication',exact:true}).waitFor();
  assert.equal(f.counts['/api/public/version'],1);assert.equal(f.counts['/api/public/content'],2);
 }finally{await f.close();}
});

test('idle cycles all four scenes in the same page without API requests or score creation',async()=>{
 const f=await fixture({...baseline,idleEnabled:true,idleTimeout:15,autoReturnEnabled:false});try{
  let navigations=0;f.page.on('framenavigated',()=>navigations++);await f.page.goto(f.url);await f.page.getByPlaceholder('ENTER FULL NAME').waitFor();await f.page.clock.runFor(16000);await f.page.locator('.idle-cover').waitFor();const scenes=new Set<string>();
  for(let i=0;i<8;i++){scenes.add((await f.page.locator('.idle-local-scene').getAttribute('data-scene'))!);await f.page.clock.runFor(4500);}
  assert.equal(scenes.size,4);assert.equal(f.page.frames().length,1);assert.equal(navigations,1);assert.deepEqual(f.counts,{'/api/public/content':1});assert.equal(await f.page.evaluate(()=>localStorage.getItem('fab-records')),null);
  await f.page.keyboard.press('Escape');await f.page.locator('.idle-cover').waitFor({state:'hidden'});assert.equal(await f.page.getByPlaceholder('ENTER FULL NAME').inputValue(),'');
 }finally{await f.close();}
});

test('Admin and daily reports do not poll; downloads require an explicit refresh',async()=>{
 const f=await fixture({...baseline,autoReturnEnabled:false},'jiu-jitsu');try{
  await f.page.goto(f.url+'/admin');await f.page.getByRole('button',{name:'Refresh saved results',exact:true}).waitFor();assert.equal(f.counts['/api/admin/event-records'],1);
  await f.page.clock.runFor(600000);await f.page.evaluate(()=>window.dispatchEvent(new Event('focus')));assert.equal(f.counts['/api/admin/event-records'],1);
  await f.page.getByRole('button',{name:'Refresh saved results',exact:true}).click();await f.page.getByRole('status').filter({hasText:'Saved results refreshed.'}).waitFor();assert.equal(f.counts['/api/admin/event-records'],2);
  await f.page.getByRole('button',{name:'Daily results',exact:true}).click();await f.page.getByText('No saved game scores for this date.',{exact:true}).waitFor();assert.equal(f.counts['/api/admin/daily-results'],1);
  await f.page.clock.runFor(600000);assert.equal(f.counts['/api/admin/daily-results'],1);assert.equal(f.counts['/api/admin/event-records'],2);
  const response=f.page.waitForResponse(r=>r.url().includes('/api/admin/daily-results'));await f.page.getByRole('button',{name:'Refresh daily results',exact:true}).click();await response;assert.equal(f.counts['/api/admin/daily-results'],2);
 }finally{await f.close();}
});
