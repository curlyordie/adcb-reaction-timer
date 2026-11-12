import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';

test('main game ignores copied preview flags while embedded frozen previews remain locked',async()=>{
 const html=await readFile('fab-reaction-timer.html');
 const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(req.url==='/frame'?'<iframe title="Frozen preview" src="/?preview=1&frozen=1"></iframe>':html);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const page=await browser.newPage();
 for(const query of ['?idle=1&screen=home','?preview=1&frozen=1','?frozen=1','?idle=0&frozen=0']){
 await page.goto(url+'/'+query);const name=page.getByPlaceholder('ENTER FULL NAME');assert.equal(await name.isEnabled(),true,query);assert.equal(await name.inputValue(),'');await name.click();await page.getByRole('region',{name:'On-screen keyboard'}).waitFor();await name.fill('Live Player');await page.getByRole('button',{name:'Close keyboard',exact:true}).click();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'VIEW LEADERBOARD',exact:true}).click();await page.getByText('NO SCORES RECORDED YET',{exact:true}).waitFor();
 }
 await page.goto(url+'/frame');const frame=page.frameLocator('iframe');await frame.locator('input[placeholder="ENTER FULL NAME"]:disabled').waitFor();assert.equal(await frame.getByPlaceholder('ENTER FULL NAME').isDisabled(),true);await frame.getByRole('button',{name:'VIEW LEADERBOARD',exact:true}).click();assert.equal(await frame.getByPlaceholder('ENTER FULL NAME').isVisible(),true);
 assert.equal(await page.evaluate(()=>localStorage.getItem('fab-records')),null);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
