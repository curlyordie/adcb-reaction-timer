import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleApi} from '../cloudflare/backend';
import {GAME_RESUMES_AT,GAME_PAUSE_VERSION,isGamePaused} from '../shared/game-pause';
test('temporary pause blocks public gameplay before D1 access and expires at 08:00 Dubai',async t=>{
 assert.equal(new Date(GAME_RESUMES_AT).toISOString(),'2026-11-03T04:00:00.000Z');
 assert.equal(isGamePaused(GAME_RESUMES_AT-1),true);
 assert.equal(isGamePaused(GAME_RESUMES_AT),false);
 t.mock.method(Date,'now',()=>GAME_RESUMES_AT-60000);
 const env:any={DB:{prepare(){throw Error('Pause must not touch D1');}}};
 const content=await handleApi(new Request('https://fab.example/api/public/content'),env);
 assert.equal(content.status,200);assert.equal((await content.json() as any).versionId,GAME_PAUSE_VERSION);
 for(const path of ['start','complete','leaderboard']){
 const response=await handleApi(new Request('https://fab.example/api/public/'+path,{method:path==='leaderboard'?'GET':'POST'}),env);
 assert.equal(response.status,503);assert.equal(response.headers.get('Retry-After'),'60');assert.match((await response.json() as any).error,/8:00 am/);
 }
});
