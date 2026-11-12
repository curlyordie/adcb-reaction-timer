import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {baseline} from '../shared/domain';

test('an open jiu jitsu leaderboard refreshes at Dubai midnight without reloading the game',async()=>{
 const server=createServer(async(req,res)=>{const path=(req.url!.startsWith('/assets/')||req.url!.startsWith('/flags/'))?resolve('dist','.'+req.url):resolve('dist/index.html');res.setHeader('Content-Type',path.endsWith('.js')?'application/javascript':path.endsWith('.css')?'text/css':path.endsWith('.svg')?'image/svg+xml':'text/html');res.end(await readFile(path));});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage();const midnight=Date.parse('2026-11-07T20:00:00Z');await page.clock.install({time:new Date(midnight-1000)});
  let requests=0,navigations=0;page.on('framenavigated',()=>navigations++);
  const players=Array.from({length:5},(_,i)=>({id:'player-'+i,fullName:'PLAYER '+(i+1),email:'',phoneNumber:'',countryCode:'',timestamp:'2026-11-07T10:00:00Z',finalTime:9.99-i*.01,difference:-.01-i*.01,target:10,tolerance:.005,qualified:false}));
  await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;if(path.endsWith('/content')){await route.fulfill({json:{eventId:'jiu-jitsu',versionId:'jiu-v1',settings:baseline}});return;}if(path.endsWith('/leaderboard')){requests++;const now=await page.evaluate(()=>Date.now());await route.fulfill({json:now<midnight?players:players.slice(0,3)});return;}await route.fulfill({status:404,json:{error:'Unexpected API'}});});
  await page.goto('http://127.0.0.1:'+(server.address() as any).port);await page.getByRole('button',{name:'VIEW LEADERBOARD',exact:true}).click();await page.getByText('PLAYER 5',{exact:true}).waitFor();
  await page.clock.runFor(2000);await page.getByText('PLAYER 5',{exact:true}).waitFor({state:'hidden'});assert.equal(await page.locator('.leaderboard-scroll>div').count(),3);assert.ok(requests>=2);assert.equal(navigations,1);
 }finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));}
});

test('a worse retry after Dubai midnight is saved as a new daily score',async()=>{
 const server=createServer(async(req,res)=>{const path=(req.url!.startsWith('/assets/')||req.url!.startsWith('/flags/'))?resolve('dist','.'+req.url):resolve('dist/index.html');res.setHeader('Content-Type',path.endsWith('.js')?'application/javascript':path.endsWith('.css')?'text/css':path.endsWith('.svg')?'image/svg+xml':'text/html');res.end(await readFile(path));});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage();const midnight=Date.parse('2026-11-07T20:00:00Z');await page.clock.install({time:new Date(midnight-60000)});const completions:number[]=[];
  await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;
   if(path.endsWith('/content')){await route.fulfill({json:{eventId:'jiu-jitsu',versionId:'jiu-v1',settings:baseline}});return;}
   if(path.endsWith('/start')){await route.fulfill({json:{id:'same-round',token:'same-token'}});return;}
   if(path.endsWith('/complete')){const body=route.request().postDataJSON();completions.push(body.finalTime);await route.fulfill({json:{...body,fullName:'Midnight player',eventId:'jiu-jitsu',timestamp:new Date(await page.evaluate(()=>Date.now())).toISOString(),target:10,tolerance:.005,difference:body.finalTime-10,qualified:false}});return;}
   await route.fulfill({json:[]});
  });
  await page.goto('http://127.0.0.1:'+(server.address() as any).port);await page.getByPlaceholder('ENTER FULL NAME').fill('Midnight player');await page.getByPlaceholder('ENTER EMAIL ADDRESS').fill('midnight@example.com');await page.getByRole('button',{name:'Close keyboard',exact:true}).click();await page.getByRole('button',{name:/NATIONALITY.*SELECT NATIONALITY/}).click();await page.getByRole('combobox',{name:'Search countries',exact:true}).fill('United Arab');await page.getByRole('option',{name:/United Arab Emirates/}).click();await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'PRESS HERE TO BEGIN',exact:true}).click();await page.getByRole('button',{name:'PRESS HERE TO BEGIN',exact:true}).click();await page.clock.runFor(4000);await page.getByRole('button',{name:'STOP TIMER',exact:true}).waitFor();await page.clock.runFor(8000);await page.getByRole('button',{name:'STOP TIMER',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('button[disabled]'));assert.equal(completions.length,1);
  await page.clock.setSystemTime(new Date(midnight+1000));await page.getByRole('button',{name:'RETRY',exact:true}).click();await page.clock.runFor(4000);await page.getByRole('button',{name:'STOP TIMER',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('button[disabled]'));assert.equal(completions.length,2,'The UI and client save helper must both reset their daily best');assert.ok(Math.abs(completions[1]-10)>Math.abs(completions[0]-10));
 }finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));}
});
