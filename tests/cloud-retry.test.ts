import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {handleApi} from '../cloudflare/backend';
import {GAME_RESUMES_AT} from '../shared/game-pause';

test('retry sequences atomically retain one best score, preserve ties, and separate new players',async t=>{
 t.mock.method(Date,'now',()=>GAME_RESUMES_AT+1000);
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test");}}',compatibilityDate:'2026-08-01',d1Databases:['DB']});
 try{
 const env:any={DB:await mf.getD1Database('DB')};
 const request=(path:string,data?:unknown)=>handleApi(new Request('https://fab.example/api/public/'+path,{method:data?'POST':'GET',headers:{Origin:'https://fab.example','Content-Type':'application/json'},body:data?JSON.stringify(data):undefined}),env);
 const content=await (await request('content')).json() as any;
 const start=async(name:string,retrySequence=true)=>{const response=await request('start',{player:{fullName:name,consent:true},versionId:content.versionId,retrySequence});assert.equal(response.status,200);return response.json() as any;};
 const round=await start('Retry Player');
 const complete=async(finalTime:number)=>{const response=await request('complete',{...round,finalTime});assert.equal(response.status,200);return response.json() as any;};
 const first=await complete(8);assert.equal(first.finalTime,8);
 assert.equal((await complete(7)).finalTime,8);
 const best=await complete(9.9);assert.equal(best.finalTime,9.9);assert.equal(best.id,first.id);
 assert.equal((await complete(9.9)).timestamp,best.timestamp);
 await Promise.all([complete(9.95),complete(9.99),complete(6)]);
 let scores=await (await request('leaderboard')).json() as any[];assert.equal(scores.length,1);assert.equal(scores[0].finalTime,9.99);
 const other=await start('Retry Player');await request('complete',{...other,finalTime:9});
 scores=await (await request('leaderboard')).json() as any[];assert.equal(scores.length,2,'New sequence remains separate even for the same name');
 const legacy=await start('Old client',false);await request('complete',{...legacy,finalTime:8});await request('complete',{...legacy,finalTime:9.99});
 scores=await (await request('leaderboard')).json() as any[];assert.equal(scores.find(r=>r.id===legacy.id).finalTime,8,'Old clients retain idempotent first completion');
 }finally{await mf.dispose();}
});
