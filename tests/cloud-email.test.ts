import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {handleApi} from '../cloudflare/backend';
import {validEmail} from '../shared/email';

test('email format validation accepts common addresses and rejects malformed inputs',()=>{
 for(const value of ['name@example.com','first.last+event@sub.example.ae',' name@example.com ','a_b@example.co.uk'])assert.equal(validEmail(value),true,value);
 for(const value of ['','plain','a@b','@example.com','a@@example.com','a b@example.com','a@-example.com','a@example..com','.a@example.com','a..b@example.com','a@example.c','a@ex_ample.com','a'.repeat(65)+'@example.com','a@example.com\nBcc:other@example.com'])assert.equal(validEmail(value),false,value);
});

test('jiu jitsu API requires email and preserves it in saved daily data while redacting public scores',async()=>{
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-08-01',d1Databases:['DB']});
 try{
  const env:any={DB:await mf.getD1Database('DB'),ADMIN_PASSWORD:'email-test-password-not-for-production'};let cookie='';
  const request=(path:string,body?:unknown)=>handleApi(new Request('https://fab.example/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:'https://fab.example','Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)}),env);
  const login=await request('admin/login',{password:env.ADMIN_PASSWORD});cookie=login.headers.get('set-cookie')!.split(';')[0];
  const initial:any=await (await request('admin/snapshot')).json();await request('admin/switch-event',{eventId:'jiu-jitsu',revision:initial.eventRevision});
  const content:any=await (await request('public/content')).json();
  for(const email of [undefined,'','invalid','a@b','a b@example.com','a@example..com']){const response=await request('public/start',{player:{fullName:'Email player',email,consent:true},versionId:content.versionId});assert.equal(response.status,400,email);}
  const started=await request('public/start',{player:{fullName:'  Email player  ',email:' registration+test@example.com ',nationality:'AE',consent:true},versionId:content.versionId,retrySequence:true});assert.equal(started.status,200);
  const token:any=await started.json();const completed=await request('public/complete',{...token,finalTime:9.9});assert.equal(completed.status,200);const saved:any=await completed.json();assert.equal(saved.email,'registration+test@example.com');assert.equal(saved.fullName,'Email player');
  const all:any=await (await request('admin/event-records?event=jiu-jitsu')).json();assert.equal(all.records[0].email,saved.email);
  const daily:any=await (await request('admin/daily-results')).json();assert.equal(daily.records[0].email,saved.email);assert.equal(daily.leaderboard[0].email,saved.email);
  const publicScores:any=await (await request('public/leaderboard')).json();assert.equal(publicScores[0].email,'');
 }finally{await mf.dispose();}
});
