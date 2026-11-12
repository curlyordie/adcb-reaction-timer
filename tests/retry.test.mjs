import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
test('Retry keeps the name and one best score until Home ends the sequence',async()=>{
 const html=await readFile('fab-reaction-timer.html');const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
 await page.getByPlaceholder('ENTER FULL NAME').fill('Repeat Player');await page.getByRole('button',{name:'Close keyboard',exact:true}).click();await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'PRESS HERE TO BEGIN',exact:true}).click();await page.getByRole('button',{name:'PRESS HERE TO BEGIN',exact:true}).click();
 await page.getByRole('button',{name:'STOP TIMER',exact:true}).waitFor();await page.waitForTimeout(1000);await page.getByRole('button',{name:'STOP TIMER',exact:true}).click();
 const records=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fab-records')));const first=(await records())[0];assert.equal(first.fullName,'REPEAT PLAYER');
 await page.getByRole('button',{name:'RETRY',exact:true}).click();await page.getByRole('button',{name:'STOP TIMER',exact:true}).waitFor();await page.getByRole('button',{name:'STOP TIMER',exact:true}).click();
 assert.equal((await records()).length,1);assert.equal((await records())[0].finalTime,first.finalTime,'Worse attempt does not replace best');
 await page.getByRole('button',{name:'RETRY',exact:true}).click();await page.getByRole('button',{name:'STOP TIMER',exact:true}).waitFor();await page.waitForTimeout(1400);await page.getByRole('button',{name:'STOP TIMER',exact:true}).click();
 const best=(await records())[0];assert.equal(best.id,first.id);assert.ok(best.finalTime>first.finalTime);assert.equal((await records()).length,1);
 await page.getByRole('button',{name:'VIEW LEADERBOARD',exact:true}).click();await page.getByText('REPEAT PLAYER',{exact:true}).waitFor();await page.getByRole('button',{name:'RETRY',exact:true}).waitFor();
 await page.getByRole('button',{name:'HOME',exact:true}).click();assert.equal(await page.getByPlaceholder('ENTER FULL NAME').inputValue(),'');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
