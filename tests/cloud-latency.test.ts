import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
import {baseline} from '../shared/domain';
import {GAME_RESUMES_AT} from '../shared/game-pause';

test('slow and failed APIs never delay countdown or captured results; retry preserves the round',async()=>{
 const server=createServer(async(req,res)=>{const path=req.url!.startsWith('/assets/')?resolve('dist','.'+req.url):resolve('dist/index.html');res.setHeader('Content-Type',path.endsWith('.js')?'application/javascript':path.endsWith('.css')?'text/css':'text/html');res.end(await readFile(path));});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 let releaseStart!:()=>void;const startGate=new Promise<void>(r=>releaseStart=r);let releaseSave!:()=>void;const saveGate=new Promise<void>(r=>releaseSave=r);
 try{
 const page=await browser.newPage();await page.addInitScript(({time})=>{Date.now=()=>time;},{time:GAME_RESUMES_AT+1000});
 let starts=0,completes=0,polls=0;let submitted:any;
 await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;
 if(path.endsWith('/content')){polls++;await route.fulfill({json:{versionId:'test-version',settings:baseline}});return;}
 if(path.endsWith('/start')){starts++;await startGate;await route.fulfill({json:{id:'round-id',token:'round-token'}});return;}
 if(path.endsWith('/complete')){completes++;submitted=route.request().postDataJSON();if(completes===1){await saveGate;await route.fulfill({status:503,json:{error:'Connection temporarily unavailable'}});}else await route.fulfill({json:{...submitted,fullName:'Latency Player',difference:submitted.finalTime-10}});return;}
 await route.fulfill({status:404,json:{error:'Unexpected endpoint'}});
 });
 await page.goto('http://127.0.0.1:'+(server.address() as any).port);
 await page.getByPlaceholder('ENTER FULL NAME').fill('Latency Player');await page.getByRole('button',{name:'Close keyboard',exact:true}).click();await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'PRESS HERE TO BEGIN',exact:true}).click();const started=performance.now();await page.getByRole('button',{name:'PRESS HERE TO BEGIN',exact:true}).click();
 await page.locator('.game[data-screen="countdown"]').waitFor({timeout:1000});assert.ok(performance.now()-started<1000);await page.getByRole('button',{name:'STOP TIMER'}).waitFor();assert.equal(starts,1);
 await page.waitForTimeout(500);await page.getByRole('button',{name:'STOP TIMER'}).click();await page.locator('.result-panel').waitFor({timeout:1000});assert.equal(completes,0,'Result appears while start API is still pending');
 assert.equal(await page.getByRole('button',{name:'HOME',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'RETRY',exact:true}).click();await page.getByRole('button',{name:'STOP TIMER'}).waitFor();await page.getByRole('button',{name:'STOP TIMER'}).click();await page.locator('.result-panel').waitFor();assert.equal(starts,1,'Retry reuses the pending sequence registration');releaseStart();await page.getByRole('status').waitFor();releaseSave();
 await page.getByRole('button',{name:'Retry saving score',exact:true}).waitFor();assert.equal(submitted.id,'round-id');const captured=submitted.finalTime;
 await page.waitForFunction(()=>!document.querySelector('button[disabled]'),{},{timeout:15000});
 assert.equal(completes,2);assert.equal(starts,1);assert.equal(submitted.finalTime,captured);assert.equal(polls,1,'No content polling during instructions, gameplay or results');
 }finally{releaseStart();releaseSave();await browser.close();await new Promise<void>(r=>server.close(()=>r()));}
});
