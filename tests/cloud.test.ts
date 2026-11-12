import {GAME_RESUMES_AT} from '../shared/game-pause';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {handleApi} from '../cloudflare/backend';
import {baseline} from '../shared/domain';
import {chromium} from '@playwright/test';
import {existsSync} from 'node:fs';
import {createServer} from 'node:http';
import {resolve,sep} from 'node:path';

test('Cloud backend: password sessions, D1 publication CAS, private D1 artwork, idempotent scores and separate-browser sync',async(t)=>{
 const realNow=Date.now.bind(Date);t.mock.method(Date,'now',()=>Math.max(realNow(),GAME_RESUMES_AT+1000));
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test");}}',compatibilityDate:'2026-08-01',d1Databases:['DB']});
 let browser:any,server:any;
 try{
 const env:any={DB:await mf.getD1Database('DB'),ADMIN_PASSWORD:'test-only-password-not-for-deployment-1234'};
 const sql=await readFile('migrations/0001_cloud.sql','utf8');await env.DB.exec(sql.split('\n').filter((line:string)=>!line.startsWith('--')&&!line.includes('asset_chunks')&&!line.includes('admin_sessions')).join('\n'));
 const upgrade=(await readFile('migrations/0002_d1_artwork.sql','utf8')).split('\n').filter((line:string)=>!line.startsWith('--')).join('\n');await env.DB.exec(upgrade);await env.DB.exec(upgrade);
 const sessionUpgrade=(await readFile('migrations/0003_admin_login.sql','utf8')).split('\n').filter(line=>!line.startsWith('--')).join('\n');await env.DB.exec(sessionUpgrade);await env.DB.exec(sessionUpgrade);
 let valid='';
 async function request(path:string,data?:unknown,auth:string|false=valid,origin='https://fab.example',ip='198.51.100.10'){const headers:any={'CF-Connecting-IP':ip};if(auth)headers.Cookie=auth;if(data!==undefined){headers.Origin=origin;headers['Content-Type']='application/json';}return handleApi(new Request('https://fab.example/api/'+path,{method:data===undefined?'GET':'POST',headers,body:data===undefined?undefined:JSON.stringify(data)}),env);}
 assert.equal((await request('admin/snapshot',undefined,false)).status,401);
 assert.equal((await request('admin/login',{password:'wrong'},false)).status,401);
 async function signIn(){const response=await request('admin/login',{password:env.ADMIN_PASSWORD},false);assert.equal(response.status,200);const setCookie=response.headers.get('Set-Cookie')!;assert.ok(setCookie.includes('HttpOnly'));assert.ok(setCookie.includes('Secure'));assert.ok(setCookie.includes('SameSite=Strict'));assert.ok(setCookie.includes('Path=/api/admin'));valid=setCookie.split(';')[0];}
 await signIn();assert.equal((await request('admin/snapshot',undefined,'__Secure-fab_admin='+'A'.repeat(43))).status,401);
 const rotated={...env,ADMIN_PASSWORD:'different-test-password-for-rotation-1234'};assert.equal((await handleApi(new Request('https://fab.example/api/admin/snapshot',{headers:{Cookie:valid}}),rotated)).status,401);
 await env.DB.prepare('UPDATE admin_sessions SET expires=0').run();assert.equal((await request('admin/snapshot')).status,401);await signIn();
 assert.equal((await request('admin/logout',{})).status,200);assert.equal((await request('admin/snapshot')).status,401);await signIn();
 for(let i=0;i<5;i++)assert.equal((await request('admin/login',{password:'wrong'},false,'https://fab.example','203.0.113.55')).status,401);
 assert.equal((await request('admin/login',{password:env.ADMIN_PASSWORD},false,'https://fab.example','203.0.113.55')).status,429);
 assert.equal((await request('admin/login',{password:env.ADMIN_PASSWORD},false,'https://evil.example')).status,403);
 assert.equal((await handleApi(new Request('https://fab.example/api/public/content'),{} as any)).status,503);
 let snap=await (await request('admin/snapshot')).json() as any;
 assert.equal((await request('admin/draft',{revision:snap.revision,draft:{...baseline,textColors:{home:{title:'url(evil)'}}}})).status,400);
 assert.equal((await request('admin/draft',{revision:snap.revision,draft:{...baseline,hiddenElements:{home:['begin']}}})).status,400);
 const privateSettings={...baseline,title:'Unpublished private heading'};
 assert.equal((await request('admin/draft',{revision:snap.revision,draft:privateSettings},valid,'https://evil.example')).status,403);
 assert.equal((await request('admin/draft',{revision:0,draft:{...baseline,target:0}})).status,400);
 assert.equal((await request('admin/draft',{revision:0,draft:privateSettings})).status,200);
 const publicBefore=await (await request('public/content',undefined,false)).json() as any;assert.equal(publicBefore.settings.title,baseline.title);assert.equal('draft' in publicBefore,false);assert.equal('versions' in publicBefore,false);
 assert.equal((await request('admin/publish',{revision:0,draft:baseline,reason:'Stale'})).status,409);
 const attempts=await Promise.all([request('admin/publish',{revision:1,draft:{...baseline,title:'Shared title'},reason:'First concurrent publisher'}),request('admin/publish',{revision:1,draft:baseline,reason:'Second concurrent publisher'})]);assert.deepEqual(attempts.map(r=>r.status).sort(),[200,409]);
 snap=await (await request('admin/snapshot')).json() as any;assert.equal(snap.revision,2);assert.equal(snap.versions.length,2);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9XcAAAAASUVORK5CYII=','base64');
 const uploaded=await handleApi(new Request('https://fab.example/api/admin/assets',{method:'POST',headers:{Origin:'https://fab.example','Content-Type':'image/png',Cookie:valid},body:png}),env);assert.equal(uploaded.status,200);const ref=(await uploaded.json() as any).ref;
 assert.equal((await request(ref.slice(5),undefined,false)).status,404);assert.equal((await request(ref.replace('/api/art/','admin/art/'))).status,200);
 const live={...snap.draft,logo:ref,title:'Cloud FAB',target:1,tolerance:1};assert.equal((await request('admin/publish',{revision:2,draft:live,reason:'Publish artwork'})).status,200);assert.equal((await request(ref.slice(5),undefined,false)).status,200);const returned=await request(ref.slice(5),undefined,false);assert.deepEqual(Buffer.from(await returned.arrayBuffer()),png);
 // Artwork larger than D1's per-row limit is stored and streamed in small chunks.
 const large=Buffer.alloc(2300000);png.copy(large);const largeUpload=await handleApi(new Request('https://fab.example/api/admin/assets',{method:'POST',headers:{Origin:'https://fab.example','Content-Type':'image/png',Cookie:valid},body:large}),env);assert.equal(largeUpload.status,200);const largeRef=(await largeUpload.json() as any).ref;const largeImage=await request(largeRef.replace('/api/art/','admin/art/'));assert.equal(largeImage.status,200);assert.deepEqual(Buffer.from(await largeImage.arrayBuffer()),large);assert.equal((await request(largeRef.slice(5),undefined,false)).status,404);
 const content=await (await request('public/content',undefined,false)).json() as any;
 const person={fullName:'Alex Example',consent:true};
 assert.equal((await request('public/start',{versionId:content.versionId,player:{...person,consent:false}},false)).status,400);
 const round=await (await request('public/start',{versionId:content.versionId,player:person},false)).json() as any;
 assert.equal((await request('public/complete',{...round,token:'wrong',finalTime:1},false)).status,403);
 const completed=await (await request('public/complete',{...round,finalTime:1},false)).json() as any;assert.equal(completed.qualified,true);
 const duplicate=await (await request('public/complete',{...round,finalTime:2},false)).json() as any;assert.equal(duplicate.id,completed.id);assert.equal(duplicate.finalTime,1);
 const publicScores=await (await request('public/leaderboard',undefined,false)).json() as any[];assert.equal(publicScores.length,1);assert.equal(publicScores[0].fullName,'Alex Example');assert.equal(publicScores[0].email,'');assert.equal(publicScores[0].phoneNumber,'');assert.equal((await request('admin/records',undefined,false)).status,401);
 assert.equal((await request('admin/records')).status,200);
 // Serve the actual hosted build and real backend to independent browser profiles.
 server=createServer(async(req,res)=>{try{const origin='http://127.0.0.1:'+server.address().port;const url=new URL(req.url!,origin);if(url.pathname.startsWith('/api/')){const chunks=[];for await(const c of req)chunks.push(c);const headers=new Headers(req.headers as any);const method=req.method||'GET';const response=await handleApi(new Request(url,{method,headers,body:method==='GET'?undefined:Buffer.concat(chunks)}),env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}const file=url.pathname.startsWith('/assets/')?resolve('dist','.'+url.pathname):resolve('dist/index.html');if(!file.startsWith(resolve('dist')+sep)){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(file));}catch{res.writeHead(500).end();}});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const site='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});const adminContext=await browser.newContext(),gameContext=await browser.newContext();for(const context of [adminContext,gameContext])await context.addInitScript(({resumesAt})=>{const realNow=Date.now.bind(Date);Date.now=()=>Math.max(realNow(),resumesAt+1000);},{resumesAt:GAME_RESUMES_AT});const admin=await adminContext.newPage(),game=await gameContext.newPage();const errors:string[]=[];admin.on('pageerror',(e:any)=>errors.push(e.message));game.on('pageerror',(e:any)=>errors.push(e.message));
 await admin.goto(site+'/admin');await admin.getByRole('heading',{name:'Admin sign in'}).waitFor();await admin.getByLabel('Password',{exact:true}).fill(env.ADMIN_PASSWORD);await admin.getByRole('button',{name:'Sign in',exact:true}).click();await admin.getByText('Cloud Admin is connected.',{exact:false}).waitFor();await game.goto(site);await game.getByRole('heading',{name:'Cloud FAB'}).waitFor();
 await admin.getByLabel('Headline',{exact:true}).fill('REMOTE UPDATED FAB');await admin.getByLabel('Publication note').fill('Publish from another device');await admin.getByRole('button',{name:'Publish settings'}).click();await admin.getByRole('status').filter({hasText:'Published to Cloudflare'}).waitFor();await game.reload();await game.getByRole('heading',{name:'REMOTE UPDATED FAB'}).waitFor();
 await game.getByPlaceholder('ENTER FULL NAME').fill('Browser Player');await game.getByRole('checkbox').check();await game.getByRole('button',{name:'PRESS HERE TO BEGIN',exact:true}).click();await game.getByRole('button',{name:'PRESS HERE TO BEGIN',exact:true}).click();await game.getByRole('button',{name:'STOP TIMER'}).waitFor();await game.waitForTimeout(1000);await game.getByRole('button',{name:'STOP TIMER'}).click();await game.getByText('WINNER',{exact:true}).waitFor();assert.equal(await game.evaluate(()=>localStorage.getItem('fab-records')),null);
 await admin.reload();await admin.getByRole('button',{name:'Leaderboard',exact:true}).click();await admin.getByRole('table',{name:'Admin leaderboard'}).getByText('Browser Player',{exact:true}).waitFor();// Transfer a legacy browser's design and scores without clearing its local history.
 const importedId=crypto.randomUUID();await admin.evaluate(({settings,id})=>{localStorage.setItem('fab-draft',JSON.stringify({...settings,title:'Transferred browser design'}));localStorage.setItem('fab-records',JSON.stringify([{id,fullName:'Legacy Player',email:'legacy@example.com',phoneNumber:'501234567',countryCode:'+971',finalTime:10,target:10,tolerance:.005,difference:0,qualified:true,timestamp:'2026-10-30T12:00:00Z'}]));},{settings:baseline,id:importedId});
 await admin.getByRole('button',{name:'Backup',exact:true}).click();await admin.getByRole('button',{name:'Transfer this browser’s design and scores',exact:true}).click();await admin.getByRole('status').filter({hasText:'Browser design published to Cloudflare and scores transferred'}).waitFor();
 await game.getByRole('button',{name:'HOME',exact:true}).click();await game.reload();await game.getByRole('heading',{name:'Transferred browser design'}).waitFor();
 await admin.getByRole('button',{name:'Leaderboard',exact:true}).click();await admin.getByRole('table',{name:'Admin leaderboard'}).getByText('Legacy Player',{exact:true}).waitFor();assert.equal(await admin.evaluate(()=>JSON.parse(localStorage.getItem('fab-records')||'[]').length),1);
 await admin.getByRole('button',{name:'Page editor',exact:true}).click();await admin.getByLabel('Text element',{exact:true}).selectOption('title');await admin.getByLabel('Text colour',{exact:true}).fill('#9c2440');await admin.frameLocator('iframe').locator('[data-edit-key="title"][style*="color"]').waitFor();assert.equal(await admin.frameLocator('iframe').locator('[data-edit-key="title"]').evaluate(el=>getComputedStyle(el).color),'rgb(156, 36, 64)');
 await admin.getByRole('button',{name:'Hide selected element',exact:true}).click();await admin.frameLocator('iframe').locator('[data-edit-key="title"].decoration-hidden').waitFor();await admin.getByLabel('Change note',{exact:true}).fill('Hide headline with saved colour');await admin.getByRole('button',{name:'Publish design',exact:true}).click();await admin.getByRole('status').filter({hasText:'Published to Cloudflare'}).waitFor();await game.reload();await game.getByRole('heading',{name:'Transferred browser design'}).waitFor({state:'hidden'});await game.reload();assert.equal(await game.getByRole('heading',{name:'Transferred browser design'}).count(),0);
 await admin.getByRole('button',{name:'Restore selected element',exact:true}).click();await admin.getByLabel('Change note',{exact:true}).fill('Restore coloured headline');await admin.getByRole('button',{name:'Publish design',exact:true}).click();await admin.getByRole('status').filter({hasText:'Published to Cloudflare'}).waitFor();await game.reload();await game.getByRole('heading',{name:'Transferred browser design'}).waitFor();assert.equal(await game.locator('h1 .campaign-text').evaluate(el=>getComputedStyle(el).color),'rgb(156, 36, 64)');
 await admin.getByRole('button',{name:'Settings',exact:true}).click();await admin.getByLabel('Headline',{exact:true}).fill('Unsaved edits survive expired login');await env.DB.prepare('DELETE FROM admin_sessions').run();try{await admin.getByRole('button',{name:'Save draft',exact:true}).click({timeout:1500});}catch(error){if(!await admin.getByRole('heading',{name:'Admin sign in'}).isVisible())throw error;}await admin.getByRole('heading',{name:'Admin sign in'}).waitFor();await admin.getByLabel('Password',{exact:true}).fill(env.ADMIN_PASSWORD);const [relogin]=await Promise.all([admin.waitForResponse(r=>r.url().endsWith('/api/admin/login')&&r.request().method()==='POST'),admin.getByRole('button',{name:'Sign in',exact:true}).click()]);assert.equal(relogin.status(),200);await admin.getByRole('heading',{name:'Admin sign in'}).waitFor({state:'hidden'});assert.equal(await admin.getByLabel('Headline',{exact:true}).inputValue(),'Unsaved edits survive expired login');
 await admin.getByRole('button',{name:'Sign out',exact:true}).click();await admin.getByRole('heading',{name:'Admin sign in'}).waitFor();
 assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();if(server)await new Promise<void>(r=>server.close(r));await mf.dispose();}
});
