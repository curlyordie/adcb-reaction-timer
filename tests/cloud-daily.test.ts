import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {handleApi} from '../cloudflare/backend';
import {dubaiDay,nextDubaiMidnight} from '../shared/event-day';

test('Dubai midnight retains only three previous leaders while preserving 13 days of scores and closing boards',async t=>{
 let now=Date.parse('2026-11-07T19:59:59Z');t.mock.method(Date,'now',()=>now);
 assert.equal(dubaiDay(now),'2026-11-07');assert.equal(nextDubaiMidnight(now),Date.parse('2026-11-07T20:00:00Z'));
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-08-01',d1Databases:['DB']});
 try{
  const env:any={DB:await mf.getD1Database('DB'),ADMIN_PASSWORD:'daily-test-password-not-for-production'};let cookie='';
  const request=(path:string,body?:unknown,authenticated=true)=>handleApi(new Request('https://fab.example/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:'https://fab.example','Content-Type':'application/json',Cookie:authenticated?cookie:''},body:body===undefined?undefined:JSON.stringify(body)}),env);
  const read=async(path:string)=>{const response=await request(path);assert.equal(response.status,200,await response.clone().text());return response.json() as any;};
  const login=await request('admin/login',{password:env.ADMIN_PASSWORD});assert.equal(login.status,200);cookie=login.headers.get('set-cookie')!.split(';')[0];
  const initial=await read('admin/snapshot');assert.equal((await request('admin/switch-event',{eventId:'jiu-jitsu',revision:initial.eventRevision})).status,200);
  const content=await read('public/content');
  const start=async(name:string)=>{const response=await request('public/start',{player:{fullName:name,email:"player@example.com",nationality:"AE",consent:true},versionId:content.versionId,retrySequence:true});assert.equal(response.status,200);return response.json() as any;};
  const complete=async(round:any,finalTime:number)=>{const response=await request('public/complete',{...round,finalTime});assert.equal(response.status,200);return response.json() as any;};
  const rounds=[];for(let i=1;i<=5;i++){const round=await start('Day one player '+i);rounds.push(round);await complete(round,10-i*.01);}
  const firstBoard=await read('public/leaderboard');assert.equal(firstBoard.length,5);assert.deepEqual(firstBoard.map((r:any)=>r.fullName),[1,2,3,4,5].map(i=>'Day one player '+i));
  const firstDay=await read('admin/daily-results?day=2026-11-07');assert.equal(firstDay.records.length,5);assert.equal(firstDay.leaderboard.filter((r:any)=>r.carried).length,0);
  now+=1000;assert.equal(dubaiDay(now),'2026-11-08');
  assert.equal((await read('public/leaderboard')).length,3,'Exactly midnight removes everyone except the previous top three');
  assert.equal((await read('admin/daily-results?day=2026-11-08')).records.length,0,'Carried leaders are not new daily plays');
  assert.deepEqual(await read('admin/daily-results?day=2026-11-07'),firstDay,'Reset never edits yesterday');
  const retry=await complete(rounds[0],9.8);assert.equal(retry.finalTime,9.8,'A worse next-day retry is still stored for that day');
  assert.equal((await read('admin/daily-results?day=2026-11-08')).records.length,1);
  assert.equal((await read('public/leaderboard')).length,3,'Carried player and today’s retry appear only once');
  await complete(await start('New daily player'),9.999);
  const secondDay=await read('admin/daily-results?day=2026-11-08');assert.equal(secondDay.records.length,2);assert.equal(secondDay.leaderboard.length,4);
  assert.equal(secondDay.leaderboard[0].fullName,'New daily player');assert.equal(secondDay.leaderboard.filter((r:any)=>r.carried).length,3);
  assert.deepEqual(await read('admin/daily-results?day=2026-11-07'),firstDay);
  now=Date.parse('2026-11-08T20:00:00Z');
  const thirdBoard=await read('public/leaderboard');assert.equal(thirdBoard.length,3);assert.equal(thirdBoard[0].fullName,'New daily player');assert.ok(!thirdBoard.some((r:any)=>r.fullName==='Day one player 3'));
  // No requests or cron jobs at midnight are required: the first request of a day uses that day.
  for(let day=3;day<=13;day++){
   now=Date.parse('2026-11-07T20:00:00Z')+(day-2)*86400000;
   if(day>=3){const response=await request('admin/login',{password:env.ADMIN_PASSWORD});assert.equal(response.status,200);cookie=response.headers.get('set-cookie')!.split(';')[0];}
   await complete(await start('Event day '+day),9.5);
   assert.equal((await read('public/leaderboard')).length,4);
   assert.equal((await read('admin/daily-results?day='+dubaiDay())).records.length,1);
  }
  const days=await read('admin/daily-days');assert.equal(days.days.length,13);
  const all=await read('admin/event-records?event=jiu-jitsu');assert.equal(all.records.length,18,'All daily scores, including repeated sequences, remain in event backup exports');
  assert.deepEqual(await read('admin/daily-results?day=2026-11-07'),firstDay);assert.deepEqual(await read('admin/daily-results?day=2026-11-08'),secondDay);
  assert.equal((await request('admin/daily-results?day=2026-11-07',undefined,false)).status,401);
  assert.equal((await request('admin/daily-results?day=2026-02-30')).status,400);
  assert.equal((await request('admin/daily-results?day=2099-01-01')).status,400);
  assert.deepEqual(await read('public/leaderboard?event=f1'),[]);
 }finally{await mf.dispose();}
});
