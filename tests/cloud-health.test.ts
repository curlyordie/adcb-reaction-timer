import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleApi} from '../cloudflare/backend';
test('connection check is read-only and separates binding, D1 and quota failures without exposing errors',async()=>{
 const request=()=>new Request('https://fab.example/api/public/health');
 let reads=0;
 const response=await handleApi(request(),{DB:{prepare(sql:string){assert.equal(sql,'SELECT 1 AS ok');return {async first(){reads++;return {ok:1};}};}}} as any);
 assert.equal(response.status,200);assert.equal((await response.json() as any).databaseRead,'ok');assert.equal(reads,1);assert.equal(response.headers.get('Cache-Control'),'no-store');
 const missing=await handleApi(request(),{} as any);assert.equal((await missing.json() as any).databaseRead,'binding_missing');
 for(const [message,expected] of [['quota exceeded','usage_limit_reported'],['private-secret-should-not-appear','unavailable']]){
 const response=await handleApi(request(),{DB:{prepare(){return {first(){throw Error(message);}};}}} as any);assert.equal(response.status,503);const report=await response.json() as any;assert.equal(report.server,'reachable');assert.equal(report.databaseRead,expected);assert.ok(!JSON.stringify(report).includes(message));
 }
});
