import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
test('touch-only registration keyboard supports name-only registration and dismissal',async()=>{
 const html=await readFile('fab-reaction-timer.html');const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{const page=await browser.newPage({hasTouch:true,viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);const keyboard=page.getByRole('region',{name:'On-screen keyboard'});const key=async name=>keyboard.getByRole('button',{name,exact:true}).tap();
 await page.getByLabel('FULL NAME',{exact:true}).tap();await keyboard.waitFor();await key('Key A');for(const c of 'lex')await key('Key '+c);await key('Space');await key('Shift');await key('Key D');for(const c of 'oe')await key('Key '+c);assert.equal(await page.getByLabel('FULL NAME',{exact:true}).inputValue(),'Alex Doe');
 await key('Next field');await keyboard.waitFor({state:'hidden'});assert.equal(await page.getByLabel('EMAIL ADDRESS',{exact:true}).count(),0);assert.equal(await page.getByLabel('Phone number',{exact:true}).count(),0);
 await page.getByRole('checkbox').check();assert.equal(await page.getByRole('button',{name:'PRESS HERE TO BEGIN',exact:true}).isEnabled(),true);
 await page.getByLabel('FULL NAME',{exact:true}).tap();await key('Close keyboard');await keyboard.waitFor({state:'hidden'});await page.getByLabel('FULL NAME',{exact:true}).tap();await keyboard.waitFor();await page.getByRole('heading',{name:'TEST YOUR REACTION TIME'}).tap();await keyboard.waitFor({state:'hidden'});
 await page.getByRole('button',{name:'PRESS HERE TO BEGIN',exact:true}).tap();await page.getByRole('heading',{name:'HOW TO PLAY'}).waitFor();assert.equal(await keyboard.count(),0);assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
