import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {countries,validNationality,nationalityName} from '../shared/countries';
import {handleApi} from '../cloudflare/backend';
import {baseline} from '../shared/domain';

test('nationality is required and validated in the API and preserved in private score reports',async()=>{
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-08-01',d1Databases:['DB']});
 try{
  const env:any={DB:await mf.getD1Database('DB'),ADMIN_PASSWORD:'nationality-test-password-not-for-production'};let cookie='';
  const request=(path:string,body?:unknown)=>handleApi(new Request('https://fab.example/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:'https://fab.example','Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)}),env);
  const login=await request('admin/login',{password:env.ADMIN_PASSWORD});cookie=login.headers.get('set-cookie')!.split(';')[0];const initial:any=await (await request('admin/snapshot')).json();await request('admin/switch-event',{eventId:'jiu-jitsu',revision:initial.eventRevision});const content:any=await (await request('public/content')).json();
  for(const nationality of [undefined,'','ZZ','UK','United Arab Emirates']){const response=await request('public/start',{versionId:content.versionId,player:{fullName:'Country player',email:'player@example.com',nationality,consent:true}});assert.equal(response.status,400,String(nationality));}
  const started=await request('public/start',{versionId:content.versionId,player:{fullName:'Country player',email:'player@example.com',nationality:'ae',consent:true}});assert.equal(started.status,200);const token:any=await started.json();const completed=await request('public/complete',{...token,finalTime:9.99});const saved:any=await completed.json();assert.equal(saved.nationality,'AE');assert.equal(nationalityName(saved.nationality),'United Arab Emirates');
  const all:any=await (await request('admin/event-records?event=jiu-jitsu')).json();assert.equal(all.records[0].nationality,'AE');const daily:any=await (await request('admin/daily-results')).json();assert.equal(daily.records[0].nationality,'AE');
  const scores:any=await (await request('public/leaderboard')).json();assert.equal('nationality' in scores[0],false);assert.equal(scores[0].email,'');
  assert.equal(countries.length,250);assert.equal(new Set(countries.map(c=>c.code)).size,250);assert.equal(validNationality('XK'),true);assert.equal(validNationality('ZZ'),false);
 }finally{await mf.dispose();}
});

test('searchable country picker supports touch and keyboard selection and all self-hosted SVG flags decode',async()=>{
 const server=createServer(async(req,res)=>{const path=req.url!.startsWith('/assets/')||req.url!.startsWith('/flags/')?resolve('dist','.'+req.url):resolve('dist/index.html');res.setHeader('Content-Type',path.endsWith('.js')?'application/javascript':path.endsWith('.css')?'text/css':path.endsWith('.svg')?'image/svg+xml':'text/html');res.end(await readFile(path));});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1080,height:1920}});const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.route('**/api/**',route=>route.fulfill({json:{eventId:'jiu-jitsu',versionId:'test-country-version',settings:baseline}}));await page.goto('http://127.0.0.1:'+(server.address() as any).port);
  await page.getByPlaceholder('ENTER FULL NAME').fill('Country player');await page.getByPlaceholder('ENTER EMAIL ADDRESS').fill('country@example.com');await page.getByRole('button',{name:'Close keyboard',exact:true}).click();await page.getByRole('checkbox').check();const begin=page.getByRole('button',{name:'PRESS HERE TO BEGIN',exact:true});assert.equal(await begin.isDisabled(),true);
  await page.getByRole('button',{name:/NATIONALITY.*SELECT NATIONALITY/}).click();assert.equal(await page.getByRole('option').count(),250);for(const key of ['Key u','Key a','Key e'])await page.getByRole('button',{name:key,exact:true}).click();assert.equal(await page.getByRole('option').count(),1);await page.getByRole('button',{name:'Next field',exact:true}).click();await page.getByRole('button',{name:/NATIONALITY.*United Arab Emirates/}).waitFor();assert.equal(await begin.isDisabled(),false);
  await page.getByRole('button',{name:/NATIONALITY.*United Arab Emirates/}).click();await page.getByRole('combobox',{name:'Search countries'}).fill('singapore');await page.getByRole('combobox',{name:'Search countries'}).press('Enter');await page.getByRole('button',{name:/NATIONALITY.*Singapore/}).waitFor();
  await page.screenshot({path:'/tmp/fab-nationality-registration.png',fullPage:true});
  const failed=await page.evaluate(async codes=>{const results=await Promise.all(codes.map(code=>new Promise<string|null>(resolve=>{const img=new Image();img.onload=()=>resolve(img.naturalWidth>0?null:code);img.onerror=()=>resolve(code);img.src='/flags/'+code.toLowerCase()+'.svg';})));return results.filter(Boolean);},countries.map(c=>c.code));assert.deepEqual(failed,[],'Every flag must render as an image without relying on OS emoji fonts');
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:/NATIONALITY.*Singapore/}).click();await page.getByRole('combobox',{name:'Search countries'}).fill('no such country');await page.getByText('No matching countries. Try another name.',{exact:true}).waitFor();await page.getByRole('combobox',{name:'Search countries'}).fill('united kingdom');await page.getByRole('option',{name:/United Kingdom/}).click();assert.equal(await page.getByRole('option').count(),0);assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));}
});
