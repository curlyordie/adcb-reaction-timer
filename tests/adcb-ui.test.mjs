import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
let server,browser,url;
before(async()=>{const html=await readFile('adcb-reaction-timer.html');server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port+'/';browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});});
after(async()=>{await browser?.close();await new Promise(r=>server?.close(r));});
async function setup(){const context=await browser.newContext({viewport:{width:1080,height:1500}});await context.addInitScript(()=>{window.__testTime=0;performance.now=()=>window.__testTime;});const page=await context.newPage();await page.goto(url);return {page,context};}
async function begin(page){await page.getByPlaceholder('ENTER FULL NAME').fill('ADCB Player');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'START GAME',exact:true}).click();await page.getByRole('button',{name:'START GAME',exact:true}).click();await page.getByRole('region',{name:'Two-stage precision challenge'}).waitFor();}
async function stopAt(page,index,time){const card=page.getByRole('article',{name:'Round '+index,exact:true});await card.getByRole('button',{name:'START',exact:true}).click();await page.evaluate(ms=>window.__testTime+=ms,time*1000);await card.getByRole('button',{name:'STOP',exact:true}).click();}

test('ADCB branding, two visible timers, independent passes, inclusive tolerance, retries and best-score persistence',async()=>{
 const {page,context}=await setup();try{const errors=[];page.on('pageerror',e=>errors.push(e.message));await begin(page);
 assert.equal(await page.getByRole('timer').count(),2);await page.getByRole('article',{name:'Round 2',exact:true}).getByRole('button',{name:'PASS ROUND 1 TO UNLOCK'}).isDisabled().then(v=>assert.equal(v,true));
 assert.ok((await page.getByRole('timer').first().locator('.national-day-numerals').evaluate(el=>getComputedStyle(el).fontFamily)).includes('National Day Oswald'));
 await stopAt(page,1,4.94);await page.getByText('NOT QUITE! GIVE IT ANOTHER GO.',{exact:true}).waitFor();let records=await page.evaluate(()=>JSON.parse(localStorage.getItem('adcb-records')));assert.equal(records[0].qualified,false);assert.deepEqual(records[0].roundTimes,[4.94]);
 await page.getByRole('button',{name:'RETRY',exact:true}).click();assert.equal(await page.getByRole('timer').first().getAttribute('data-time'),'0.000');await stopAt(page,1,4.95);
 await page.getByText('PERFECT! FIRST 5 COMPLETE. Start Round 2.').waitFor();assert.equal(await page.getByRole('timer').nth(1).getAttribute('data-time'),'0.000');await stopAt(page,2,5.05);
 await page.getByText('5 + 5 COMPLETE! YOU DID IT!',{exact:true}).waitFor();records=await page.evaluate(()=>JSON.parse(localStorage.getItem('adcb-records')));assert.equal(records.length,1);assert.equal(records[0].qualified,true);assert.deepEqual(records[0].roundTimes,[4.95,5.05]);
 await page.screenshot({path:'/tmp/adcb-win.png',fullPage:true});
 await page.getByRole('button',{name:'RETRY',exact:true}).click();await stopAt(page,1,5);await stopAt(page,2,5.06);await page.getByText('NOT QUITE! GIVE IT ANOTHER GO.',{exact:true}).waitFor();records=await page.evaluate(()=>JSON.parse(localStorage.getItem('adcb-records')));assert.deepEqual(records[0].roundTimes,[4.95,5.05]);
 await page.getByRole('button',{name:'HOME',exact:true}).click();assert.equal(await page.getByPlaceholder('ENTER FULL NAME').inputValue(),'');await page.getByRole('button',{name:'VIEW LEADERBOARD',exact:true}).click();await page.getByText('ADCB PLAYER',{exact:true}).waitFor();assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('standalone embeds ADCB logo, National Day art and fonts without external requests, including narrow screens',async()=>{
 const {page,context}=await setup();try{const requests=[];page.on('request',req=>requests.push(req.url()));await page.reload();await page.evaluate(()=>document.fonts.ready);assert.equal(await page.getByAltText('ADCB — Abu Dhabi Commercial Bank').count(),1);assert.equal(await page.evaluate(()=>document.fonts.check('16px "Museo Sans"')),true);await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/adcb-home-mobile.png',fullPage:true});await begin(page);
 assert.equal(await page.getByRole('timer').count(),2);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('img').evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0)),true);assert.ok(requests.every(value=>value===url),'No asset network requests in standalone');
 }finally{await context.close();}
});
test('artwork library adds, drags, resizes, replaces, duplicates and publishes persistent per-page elements',async()=>{
 const {page,context}=await setup();try{await page.goto(url+'admin');await page.getByLabel('Event to manage').waitFor();assert.equal(await page.getByLabel('Event to manage').locator('option').allTextContents().then(v=>v.join(',')),'AAIHEX 2026');await page.getByRole('button',{name:'Page editor',exact:true}).click();
 await page.getByLabel('Find artwork').fill('Falcon 01');await page.getByRole('button',{name:'Add element Fauna Falcon 01',exact:true}).click();await page.getByLabel('Element name').fill('My falcon');await page.getByLabel('Width (%)').fill('22');await page.getByLabel('Rotation',{exact:true}).fill('12');
 const iframe=page.frameLocator('iframe[title="Live page preview"]');await iframe.locator('[data-selected-art]').waitFor();await page.waitForTimeout(650);const target=iframe.locator('[data-selected-art]');const box=await target.boundingBox();assert.ok(box);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+25,box.y+box.height/2+20,{steps:5});await page.mouse.up();await page.waitForTimeout(650);assert.ok(Number(await page.getByLabel('Left (%)').inputValue())>10);
 await page.getByRole('button',{name:'Duplicate element',exact:true}).click();await page.getByRole('button',{name:'Remove element',exact:true}).click();await page.getByLabel('Page artwork').selectOption({label:'My falcon'});await page.getByLabel('Opacity',{exact:true}).fill('0.8');await page.getByLabel('Replace element image').selectOption({label:'Fauna Falcon 02'});
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('status').filter({hasText:'Draft saved.'}).waitFor();
 await page.getByLabel('Change note',{exact:true}).fill('ADCB artwork layout');await page.getByRole('button',{name:'Publish design',exact:true}).click();await page.getByRole('status').filter({hasText:'Published on this browser.'}).waitFor();
 const settings=await page.evaluate(()=>JSON.parse(localStorage.getItem('adcb-studio')).versions.at(-1).settings);const art=settings.elements.find(el=>el.name==='My falcon');assert.equal(art.width,22);assert.equal(art.rotation,12);assert.equal(art.opacity,.8);
 await page.goto(url);assert.equal(await page.locator('[data-design-id="'+art.id+'"]').count(),1);await page.waitForFunction(()=>Array.from(document.images).every(im=>im.complete));await page.screenshot({path:'/tmp/adcb-home.png',fullPage:true});
 }finally{await context.close();}
});
test('uploaded library image is reused, included in private backup and retained after reload',async()=>{
 const {page,context}=await setup();try{await page.goto(url+'admin');await page.getByRole('button',{name:'Page editor',exact:true}).click();await page.getByLabel('Upload to artwork library').setInputFiles({name:'custom.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7S8AAAAASUVORK5CYII=','base64')});await page.getByLabel('Find artwork').fill('custom.png');await page.getByRole('button',{name:'Add element custom.png',exact:true}).click();await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('status').filter({hasText:'Draft saved.'}).waitFor();await page.reload();await page.getByRole('button',{name:'Page editor',exact:true}).click();await page.getByLabel('Find artwork').fill('custom.png');await page.getByRole('button',{name:'Add element custom.png',exact:true}).waitFor();
 await page.getByRole('button',{name:'Backup',exact:true}).click();const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download private backup',exact:true}).click()]);const path=await download.path();const data=JSON.parse(await readFile(path,'utf8'));assert.equal(data.draft.library.length,1);assert.equal(Object.keys(data.assets).length,1);
 }finally{await context.close();}
});

test('editor fits complete desktop and event viewports without changing their responsive layout',async()=>{
 const {page,context}=await setup();try{
 await page.goto(url+'admin');await page.getByRole('button',{name:'Page editor',exact:true}).click();await page.getByLabel('Preview size').selectOption('desktop');await page.getByLabel('Page',{exact:true}).selectOption('playing');
 const frame=page.frameLocator('iframe[title="Live page preview"]');await frame.getByRole('timer').first().waitFor();
 assert.deepEqual(await frame.locator('body').evaluate(()=>({width:innerWidth,height:innerHeight})),{width:1920,height:1080});
 const checkFit=async()=>{const size=await page.locator('.editor-viewport-frame').evaluate(el=>{const outer=el.getBoundingClientRect(),inner=el.querySelector('iframe').getBoundingClientRect();return {width:Math.abs(outer.width-inner.width),height:Math.abs(outer.height-inner.height),container:el.parentElement.clientWidth,actual:outer.width};});assert.ok(size.width<=3);assert.ok(size.height<=3);assert.ok(size.actual<=size.container+1);};
 await checkFit();assert.equal(await frame.getByRole('timer').count(),2);assert.equal(await frame.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.setViewportSize({width:800,height:1000});await checkFit();assert.deepEqual(await frame.locator('body').evaluate(()=>({width:innerWidth,height:innerHeight})),{width:1920,height:1080});
 await page.getByLabel('Preview size').selectOption('portrait');await frame.getByRole('timer').first().waitFor();assert.deepEqual(await frame.locator('body').evaluate(()=>({width:innerWidth,height:innerHeight})),{width:1080,height:1920});await checkFit();
 await page.getByLabel('Preview size').selectOption('mobile');await frame.getByRole('timer').first().waitFor();assert.deepEqual(await frame.locator('body').evaluate(()=>({width:innerWidth,height:innerHeight})),{width:390,height:844});await checkFit();
 // Artwork positions are measured in the full design viewport, even when the parent scales it.
 await page.getByLabel('Preview size').selectOption('desktop');await page.getByLabel('Find artwork').fill('Falcon 01');await page.getByRole('button',{name:'Add element Fauna Falcon 01',exact:true}).click();await frame.locator('[data-selected-art]').waitFor();await page.waitForTimeout(500);const art=frame.locator('[data-selected-art]');await art.scrollIntoViewIfNeeded();const box=await art.boundingBox();assert.ok(box);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+20,box.y+box.height/2+10,{steps:4});await page.mouse.up();await page.waitForTimeout(500);assert.ok(Number(await page.getByLabel('Left (%)').inputValue())>10);
 }finally{await context.close();}
});
