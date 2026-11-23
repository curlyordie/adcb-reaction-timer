import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium,expect,type Browser,type Page,type FrameLocator} from '@playwright/test';
import {baseline,normalize,validate} from '../shared/domain';
import {gamePages} from '../shared/editor';

let browser:Browser,url:string;
const server=createServer();
before(async()=>{
 const html=await readFile('adcb-reaction-timer.html');
 const embedded=html.toString().match(/<script>window\.__ADCB_OFFLINE__=true;[\s\S]*?<\/script>/)![0];
 server.on('request',(req,res)=>{res.setHeader('Content-Type','text/html');res.end(req.url==='/review'?embedded+'<iframe title="Scale review" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>':html);});
 await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const address=server.address();assert.ok(address&&typeof address!=='string');url=`http://127.0.0.1:${address.port}/`;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
});
after(async()=>{await browser.close();await new Promise<void>(done=>server.close(()=>done()));});

async function measure(target:FrameLocator|Page,selectors:string[]){
 await target.locator('body').evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).map(im=>im.decode().catch(()=>{})));});
 return target.locator('.game').evaluate((root,selectors)=>({
  fonts:selectors.map(selector=>{const el=root.querySelector(selector);if(!el)throw Error('Missing '+selector);return parseFloat(getComputedStyle(el).fontSize);}),
  logo:(root.querySelector('.adcb-logo') as HTMLElement).offsetWidth,
  art:(root.querySelector('.design-element') as HTMLElement)?.offsetWidth,
 }),selectors);
}
function enlarged(actual:Awaited<ReturnType<typeof measure>>,base:Awaited<ReturnType<typeof measure>>,factor:number){
 actual.fonts.forEach((size,i)=>assert.ok(Math.abs(size-base.fonts[i]*factor)<.05,`Font ${i}: ${base.fonts[i]} → ${size}, expected ×${factor}`));
 assert.equal(actual.logo,base.logo,'Text controls must not resize the logo');assert.equal(actual.art,base.art,'Text controls must not change artwork widths');
}

test('Admin enlarges every text style on a page, preserves individual sizes, publishes it, and can reset or apply to all pages',async()=>{
 const context=await browser.newContext({viewport:{width:1440,height:1100}});
 try{
  const page=await context.newPage();await page.goto(url+'admin');await page.getByRole('button',{name:'Adjust all page text sizes',exact:true}).click();
  const frame=page.frameLocator('iframe[title="Live page preview"]');await frame.locator('.game').waitFor();
  await page.getByLabel('Text element',{exact:true}).selectOption('title');await page.getByLabel('Font size',{exact:true}).fill('64');
  await expect(frame.locator('[data-edit-key=title]')).toHaveCSS('font-size','64px');
  const selectors=['[data-edit-key=title]','.union-context','.event-name','.registration-field>label','.registration-field>input','.registration-consent','.home-actions button'];
  const base=await measure(frame,selectors);const adminFont=await page.getByRole('heading',{name:'Page editor',exact:true}).evaluate(el=>getComputedStyle(el).fontSize);
  await page.getByRole('button',{name:'Increase all text sizes',exact:true}).click();
  const slider=page.getByRole('slider',{name:'All text size',exact:true});await slider.focus();for(let i=0;i<3;i++)await slider.press('ArrowRight');
  await expect(frame.locator('.game')).toHaveCSS('--page-text-scale','1.25');enlarged(await measure(frame,selectors),base,1.25);
  assert.equal(await page.getByLabel('Font size',{exact:true}).inputValue(),'64');
  assert.equal(await page.getByRole('heading',{name:'Page editor',exact:true}).evaluate(el=>getComputedStyle(el).fontSize),adminFont,'The Admin controls must retain their own readable size');
  await page.getByLabel('Change note',{exact:true}).fill('Registration text at 125%');await page.getByRole('button',{name:'Publish design',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Published on this browser.'}).waitFor();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('adcb-studio')!));assert.equal(saved.versions.at(-1).settings.pageTextScale.home,125);assert.equal(saved.draft.textSizes.home.title,64);
  const live=await context.newPage();await live.goto(url);await expect(live.locator('.game')).toHaveCSS('--page-text-scale','1.25');
  enlarged(await measure(live,['.home-headline .campaign-text','.union-context','.event-name','.registration-field>label','.registration-field>input','.registration-consent','.home-actions button']),base,1.25);
  await page.getByRole('button',{name:'Reset page text size',exact:true}).click();await expect(frame.locator('.game')).toHaveCSS('--page-text-scale','1');enlarged(await measure(frame,selectors),base,1);
  await expect(live.locator('.game')).toHaveCSS('--page-text-scale','1.25');
  for(let i=0;i<5;i++)await page.getByRole('button',{name:'Increase all text sizes',exact:true}).click();
  await page.getByRole('button',{name:'Apply text size to all pages',exact:true}).click();
  await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('status').filter({hasText:'Draft saved.'}).waitFor();
  const draft=await page.evaluate(()=>JSON.parse(localStorage.getItem('adcb-studio')!).draft);assert.deepEqual(draft.pageTextScale,Object.fromEntries(gamePages.map(key=>[key,150])));
  await page.reload();await page.getByRole('button',{name:'Page editor',exact:true}).click();await page.getByLabel('Page',{exact:true}).selectOption('playing');
  await expect(page.getByRole('slider',{name:'All text size',exact:true})).toHaveValue('150');
  await page.screenshot({path:'/tmp/adcb-admin-text-size.png',fullPage:true});
 }finally{await context.close();}
});

test('all game pages scale their labels, buttons, numbers and Arabic text in portrait and landscape',async()=>{
 const selectors:Record<string,string[]>={
  home:['.home-headline','.union-context','.registration-field label','.registration-field input','.home-actions button'],
  instructions:['h1','.instruction-step>span:last-child','.instruction-step-number','.instruction-range','.instruction-begin'],
  countdown:['.countdown-number','.union-context'],
  playing:['h1','.eyebrow','.round-heading>span:first-child','.round-tribute','.national-day-numerals','.stopwatch-units','.timer-action','.tolerance-note'],
  result:['.result-panel .text-5xl','.union-merging-score strong','.union-official-caption','.union-equation','.union-arabic','.result-detail>span:first-child','.result-detail .text-mono','.result-panel button'],
  leaderboard:['h1','.leaderboard-screen p','.leaderboard-screen button'],
 };
 const context=await browser.newContext({viewport:{width:1080,height:1920}});
 try{
  const page=await context.newPage();await page.goto(url+'review');const frame=page.frameLocator('iframe');
  for(const designFormat of ['portrait','landscape'] as const)for(const screen of gamePages){
   const load=async(percent:number)=>{
    const settings=normalize({...baseline,designFormat,pageTextScale:{[screen]:percent}});
    await page.evaluate(({settings,screen,percent})=>{sessionStorage.setItem('adcb-preview',JSON.stringify(settings));document.querySelector('iframe')!.src='/?preview=1&frozen=1&screen='+screen+'&scale='+percent;},{settings,screen,percent});
    await frame.locator(`.game[data-screen="${screen}"]`).waitFor();await expect(frame.locator('.game')).toHaveCSS('--page-text-scale',String(percent/100));
    return measure(frame,selectors[screen]);
   };
   const base=await load(100);enlarged(await load(125),base,1.25);enlarged(await load(200),base,2);
   if(screen==='playing'){
    assert.ok(await frame.locator('.timer-card').evaluateAll(cards=>cards.every(card=>{const text=card.querySelector('.national-day-numerals')!.getBoundingClientRect(),box=card.getBoundingClientRect();return text.left>=box.left&&text.right<=box.right;})),`${designFormat}: large timer numbers must fit their cards`);
   }
   if(screen!=='countdown'){
    const separated=await frame.locator('.game-stage').evaluate(stage=>{
     let top=Infinity;
     for(const image of stage.closest('.game')!.querySelectorAll<HTMLImageElement>('.exhibition-scene img')){
      const canvas=document.createElement('canvas');canvas.width=128;canvas.height=Math.round(128*image.naturalHeight/image.naturalWidth);
      const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      for(let i=3;i<pixels.length;i+=4)if(pixels[i]>32){const box=image.getBoundingClientRect();top=Math.min(top,box.top+Math.floor((i/4)/canvas.width)*box.height/canvas.height);break;}
     }
     return top>stage.getBoundingClientRect().bottom;
    });
    assert.ok(separated,`${designFormat} ${screen}: enlarged text must not overlap the supplied scene`);
   }
  }
 }finally{await context.close();}
});

test('older settings default to normal text size and invalid page-wide sizes are rejected',()=>{
 const older={...baseline};delete (older as any).pageTextScale;assert.deepEqual(normalize(older).pageTextScale,{});
 for(const pageTextScale of [{home:74},{home:201},{home:NaN},{home:'125'},{admin:125},[],125])assert.throws(()=>validate({...baseline,pageTextScale:pageTextScale as any}),/Page text size/);
 assert.deepEqual(validate({...baseline,pageTextScale:{home:125,instructions:150}}).pageTextScale,{home:125,instructions:150});
 assert.equal(normalize({...baseline,idleVideoFit:undefined}).idleVideoFit,'fill');
 assert.throws(()=>validate({...baseline,idleVideoFit:'cover' as any}),/idle video/);
});
