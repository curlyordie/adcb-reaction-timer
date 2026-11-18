import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {baseline,normalize,validate} from '../shared/domain';
import {exhibitionElements,orientExhibitionElements} from '../shared/exhibition';

test('exhibition pages centre their content and keep the scene below the controls in both formats',async()=>{
 const html=await readFile('adcb-reaction-timer.html');
 const server=createServer((_req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();assert.ok(address&&typeof address!=='string');
 const url=`http://127.0.0.1:${address.port}/`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const designFormat of ['portrait','landscape'] as const){
   const settings=validate(normalize({...baseline,designFormat}));
   const context=await browser.newContext({viewport:designFormat==='portrait'?{width:1080,height:1920}:{width:1920,height:1080}});
   try{
    const page=await context.newPage();await page.goto(url);
    await page.evaluate(settings=>{sessionStorage.setItem('adcb-preview',JSON.stringify(settings));document.body.innerHTML='<iframe title="Design review" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>';},settings);
    for(const screen of ['home','instructions','countdown','playing','result','leaderboard']){
     await page.locator('iframe').evaluate((frame,screen)=>(frame as HTMLIFrameElement).src='/?preview=1&frozen=1&screen='+screen,screen);
     const frame=page.frameLocator('iframe');
     await frame.locator(`.game[data-screen="${screen}"]`).waitFor();
     await frame.locator('body').evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).map(img=>img.decode()));});
     const geometry=await frame.locator('.game-stage').evaluate(stage=>{
      const canvas=stage.closest('.game-canvas')!.getBoundingClientRect();
      const center=canvas.left+canvas.width/2;
      const centered=Array.from(stage.querySelectorAll<HTMLElement>('h1,.home-screen,.instruction-panel,.instruction-begin,.timer-pair,.result-panel,.leaderboard-screen,.home-actions button,.result-panel button'));
      const errors=centered.map(el=>{const box=el.getBoundingClientRect();return {element:el.className,error:Math.abs(box.left+box.width/2-center)};});
      const text=Array.from(stage.querySelectorAll('h1,p,label,button,input')).every(el=>getComputedStyle(el).textAlign==='center');
      let sceneTop=Infinity;
      for(const img of stage.closest('.game')!.querySelectorAll<HTMLImageElement>('.design-element img')){
       const sample=document.createElement('canvas');sample.width=128;sample.height=Math.round(128*img.naturalHeight/img.naturalWidth);
       const ctx=sample.getContext('2d')!;ctx.drawImage(img,0,0,sample.width,sample.height);
       const pixels=ctx.getImageData(0,0,sample.width,sample.height).data;
       let first=-1;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>32){first=Math.floor((i/4)/sample.width);break;}
       if(first>=0){const box=img.getBoundingClientRect();sceneTop=Math.min(sceneTop,box.top+box.height*first/sample.height);}
      }
      return {errors,text,mainBottom:stage.getBoundingClientRect().bottom,sceneTop,canvas};
     });
     assert.ok(geometry.errors.every(item=>item.error<1),`${designFormat} ${screen}: ${JSON.stringify(geometry.errors)}`);
     assert.ok(geometry.text,`${designFormat} ${screen} text and buttons must be centred`);
     if(screen!=='countdown')assert.ok(geometry.sceneTop>geometry.mainBottom+10,`${designFormat} ${screen}: scene ${geometry.sceneTop} overlaps content ${geometry.mainBottom}`);
     assert.ok(geometry.canvas.left>=-.5&&geometry.canvas.top>=-.5,`${screen} canvas must fit`);
    }
   }finally{await context.close();}
  }
 }finally{await browser.close();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('changing exhibition format retains custom artwork and moved illustration positions',()=>{
 const portrait=exhibitionElements('portrait');
 assert.deepEqual(orientExhibitionElements(portrait,'landscape'),exhibitionElements('landscape'));
 const moved={...portrait[0],x:portrait[0].x+3};
 const uploaded={...portrait[1],id:'custom-art',src:'/brand/custom.png'};
 const result=orientExhibitionElements([moved,uploaded,...portrait.slice(2)],'landscape');
 assert.deepEqual(result[0],moved);assert.deepEqual(result[1],uploaded);
});
