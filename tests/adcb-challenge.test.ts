import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {handleApi} from '../cloudflare/backend';
import {baseline,normalize,validate} from '../shared/domain';
import {captureSeconds,evaluateChallenge,passes} from '../shared/challenge';

for(const [times,win] of [[[5,5],true],[[4.970,5.030],true],[[5.045,4.955],true],[[4.950,5.050],true],[[5,5.060],false],[[4.940],false]] as const)test('independent challenge '+times.join(' / '),()=>assert.equal(evaluateChallenge([...times]).qualified,win));
test('precision, inclusive boundaries, invalid round order and configurable tolerance',()=>{
 assert.equal(captureSeconds(5.0496),5.05);assert.equal(passes(4.95),true);assert.equal(passes(5.05),true);assert.equal(passes(4.949),false);assert.equal(passes(5.051),false);
 assert.equal(evaluateChallenge([5.07,4.93],5,.1).qualified,true);
 for(const times of [[],[NaN],[Infinity],[-1],[121],[5,5,5],[4.94,5],[4.9,5.1]])assert.throws(()=>evaluateChallenge(times));
});
test('design validation protects image references, geometry, names and limits',()=>{
 const draft=structuredClone(baseline);assert.equal(validate(draft).gameMode,'double');assert.equal(normalize({...draft,designFormat:undefined}).designFormat,'portrait');assert.throws(()=>validate({...draft,designFormat:'auto' as any}));assert.ok(draft.elements.length);
 for(const patch of [{src:'javascript:alert(1)'},{width:1000},{rotation:NaN},{page:'admin'},{x:-1},{opacity:2}])assert.throws(()=>validate({...draft,elements:[{...draft.elements[0],...patch}]}));
 assert.throws(()=>validate({...draft,library:[{id:'bad',name:'bad',src:'https://example.com/tracker.png'}]}));
});
test('ADCB hosted D1: event, authentication, two-stage scores, retries, publication, private artwork and backups',async()=>{
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-08-01',d1Databases:['DB']});
 try{
 const env:any={DB:await mf.getD1Database('DB'),ADMIN_PASSWORD:'test-only-adcb-password-123456'};let cookie='';
 async function req(path:string,data?:unknown,auth=true){return handleApi(new Request('https://adcb.example/api/'+path,{method:data===undefined?'GET':'POST',headers:{Origin:'https://adcb.example','Content-Type':'application/json',...(auth?{Cookie:cookie}:{})},body:data===undefined?undefined:JSON.stringify(data)}),env);}
 assert.equal((await req('admin/snapshot')).status,401);
 assert.equal((await req('admin/login',{password:'wrong'})).status,401);
 const login=await req('admin/login',{password:env.ADMIN_PASSWORD});assert.equal(login.status,200);cookie=login.headers.get('set-cookie')!.split(';')[0];
 let snapshot:any=await (await req('admin/snapshot')).json();assert.deepEqual(snapshot.events,[{id:'aaihex-2026',name:'AAIHEX 2026'}]);assert.equal(snapshot.activeEventId,'aaihex-2026');assert.equal(snapshot.draft.target,5);assert.equal(snapshot.draft.tolerance,.05);
 const content:any=await (await req('public/content')).json();
 const begin=async()=>{const r=await req('public/start',{player:{fullName:'Precision Player',consent:true},versionId:content.versionId,retrySequence:true});assert.equal(r.status,200);return await r.json() as any;};
 const round=await begin();const finish=async(times:number[],extra={})=>req('public/complete',{...round,finalTime:times.at(-1),roundTimes:times,...extra});
 assert.equal((await req('public/complete',{...round,finalTime:5})).status,400);
 assert.equal((await finish([5])).status,400);assert.equal((await finish([4.94,5])).status,400);assert.equal((await finish([5,NaN])).status,400);assert.equal((await finish([5,5],{finalTime:4})).status,400);
 let r=await finish([5,5.06]);assert.equal(r.status,200);let record:any=await r.json();assert.equal(record.qualified,false);assert.deepEqual(record.roundTimes,[5,5.06]);
 record=await (await finish([4.95,5.05])).json();assert.equal(record.qualified,true);assert.deepEqual(record.roundTimes,[4.95,5.05]);
 const best:any=await (await finish([5,5.1])).json();assert.deepEqual(best.roundTimes,[4.95,5.05]);
 let board:any=await (await req('public/leaderboard')).json();assert.equal(board.length,1);assert.deepEqual(board[0].roundTimes,[4.95,5.05]);assert.equal(board[0].email,'');
 const r2=await begin();assert.equal((await req('public/complete',{...r2,roundTimes:[4.94],finalTime:4.94})).status,200);
 const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7S8AAAAASUVORK5CYII=','base64'));
 const upload=await handleApi(new Request('https://adcb.example/api/admin/assets',{method:'POST',headers:{Origin:'https://adcb.example',Cookie:cookie,'Content-Type':'image/png'},body:png}),env);assert.equal(upload.status,200);const {ref}=await upload.json() as any;
 assert.equal((await req(ref.replace('/api/',''),undefined,false)).status,404);
 const draft=structuredClone(snapshot.draft);draft.designFormat='landscape';draft.library=[{id:'uploaded',name:'Uploaded illustration',src:ref}];draft.elements.push({id:'art',name:'Custom art',src:ref,page:'home',x:15,y:65,width:18,rotation:10,opacity:.8,layer:3});
 let response=await req('admin/draft',{eventId:'aaihex-2026',revision:snapshot.revision,draft});assert.equal(response.status,200);snapshot=await response.json();
 assert.equal((await req('admin/draft',{eventId:'aaihex-2026',revision:0,draft})).status,409);
 response=await req('admin/publish',{eventId:'aaihex-2026',revision:snapshot.revision,draft,reason:'Publish illustration'});assert.equal(response.status,200);snapshot=await response.json();assert.equal(snapshot.draft.elements.at(-1).src,ref);
 const artwork=await req(ref.replace('/api/',''),undefined,false);assert.equal(artwork.status,200);assert.match(artwork.headers.get('cache-control')!,/immutable/);
 const published:any=await (await req('public/content')).json();assert.equal(published.settings.library[0].src,ref);assert.equal(published.settings.designFormat,'landscape');
 const reports:any=await (await req('admin/event-records?event=aaihex-2026')).json();assert.equal(reports.records.length,2);assert.ok(reports.records.every((r:any)=>Array.isArray(r.roundTimes)));
 assert.equal((await req('admin/snapshot?event=f1')).status,400);assert.equal((await req('admin/snapshot?event=jiu-jitsu')).status,400);
 const bad={...draft,elements:[{...draft.elements[0],src:'/api/art/00000000-0000-0000-0000-000000000000'}]};assert.equal((await req('admin/draft',{eventId:'aaihex-2026',revision:snapshot.revision,draft:bad})).status,400);
 assert.equal((await req('admin/logout',{})).status,200);assert.equal((await req('admin/snapshot')).status,401);
 }finally{await mf.dispose();}
});
