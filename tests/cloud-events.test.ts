import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile} from 'node:fs/promises';
import {handleApi} from '../cloudflare/backend';
import {baseline,original} from '../shared/domain';

const score=(id:string,timestamp='2026-11-02T10:00:00Z')=>({id,fullName:'Saved F1 player',email:'',phoneNumber:'',countryCode:'',finalTime:9.9,target:10,tolerance:.005,difference:-.1,qualified:false,timestamp});

test('event migration preserves F1 data, deduplicates archives and isolates settings, switches and in-flight scores',async()=>{
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-08-01',d1Databases:['DB']});
 try{
  const DB=await mf.getD1Database('DB');
  const env:any={DB,ADMIN_PASSWORD:'events-test-password-not-for-production'};
  // Simulate the deployed, pre-event database, including the preserved reset backup.
  const oldSql=(await readFile('migrations/0001_cloud.sql','utf8')).split('\n').filter(line=>line.startsWith('CREATE ')&&!/event_profiles|game_event_state|event_design_versions|records_event/.test(line)).join('\n');
  await DB.exec(oldSql);
  const published={...baseline,eventName:'F1 original',title:'F1 LIVE'};
  const draft={...published,title:'F1 UNSAVED DRAFT'};
  await DB.batch([
   DB.prepare('INSERT INTO design_versions(id,settings,reason,created_at) VALUES(?,?,?,?)').bind(original.id,JSON.stringify(published),'Existing F1','2026-11-02T00:00:00Z'),
   DB.prepare('INSERT INTO studio(id,revision,draft,active_id) VALUES(1,7,?,?)').bind(JSON.stringify(draft),original.id),
   DB.prepare('INSERT INTO records(id,data,difference,completed_at) VALUES(?,?,?,?)').bind('overlap',JSON.stringify(score('overlap')),-.1,'2026-11-02T10:00:00Z')
  ]);
  await DB.prepare('CREATE TABLE records_backup_20261103 AS SELECT * FROM records').run();
  await DB.prepare('UPDATE records_backup_20261103 SET data=? WHERE id=?').bind(JSON.stringify({...score('overlap'),fullName:'Older backup name'}),'overlap').run();
  const archived=Array.from({length:502},(_,i)=>score('archived-'+String(i).padStart(4,'0')));
  await DB.batch(archived.map((r,i)=>DB.prepare('INSERT INTO records_backup_20261103(seq,id,data,difference,completed_at) VALUES(?,?,?,?,?)').bind(i+2,r.id,JSON.stringify(r),r.difference,r.timestamp)));
  const backupBefore=await DB.prepare('SELECT * FROM records_backup_20261103 ORDER BY rowid').all();
  let cookie='';
  const request=(path:string,body?:unknown,auth=true)=>handleApi(new Request('https://fab.example/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:'https://fab.example','Content-Type':'application/json',Cookie:auth?cookie:''},body:body===undefined?undefined:JSON.stringify(body)}),env);
  const read=async(path:string)=>{const response=await request(path);assert.equal(response.status,200,await response.clone().text());return response.json() as any;};
  const content=await read('public/content');assert.equal(content.eventId,'f1');assert.equal(content.settings.title,'F1 LIVE');
  for(const path of ['admin/snapshot?event=jiu-jitsu','admin/event-records?event=f1'])assert.equal((await request(path,undefined,false)).status,401);
  assert.equal((await request('admin/switch-event',{eventId:'jiu-jitsu',revision:0},false)).status,401);
  const login=await request('admin/login',{password:env.ADMIN_PASSWORD});assert.equal(login.status,200);cookie=login.headers.get('set-cookie')!.split(';')[0];
  let f1=await read('admin/snapshot?event=f1');assert.equal(f1.revision,7);assert.equal(f1.draft.title,'F1 UNSAVED DRAFT');assert.equal(f1.versions.length,1);
  let jiu=await read('admin/snapshot?event=jiu-jitsu');assert.equal(jiu.draft.title,'F1 LIVE','New profile clones published, not unpublished, F1 design');assert.equal(jiu.draft.eventName,'Jiu jitsu');assert.equal(jiu.versions.length,1);assert.notEqual(jiu.versions[0].id,content.versionId);
  const page1=await read('admin/event-records?event=f1');assert.equal(page1.records.length,500);assert.equal(page1.next,500);
  const page2=await read('admin/event-records?event=f1&cursor='+page1.next);assert.equal(page2.records.length,3);assert.equal(page2.next,null);
  const all=[...page1.records,...page2.records];assert.equal(new Set(all.map(r=>r.id)).size,503);assert.equal(all.find(r=>r.id==='overlap').fullName,'Saved F1 player');
  assert.equal((await read('admin/event-records?event=jiu-jitsu')).records.length,0);
  assert.equal((await read('public/leaderboard')).length,1,'Archived scores stay off public board');
  const start=await request('public/start',{player:{fullName:'In-flight F1',consent:true},versionId:content.versionId,retrySequence:true});assert.equal(start.status,200);const round:any=await start.json();
  assert.equal((await request('admin/publish',{eventId:'jiu-jitsu',revision:0,draft:{...jiu.draft,title:'JIU JITSU LIVE',target:5},reason:'Prepare jiu jitsu'})).status,200);
  assert.equal((await read('public/content')).settings.title,'F1 LIVE','Editing inactive event does not change live site');
  const switched=await request('admin/switch-event',{eventId:'jiu-jitsu',revision:f1.eventRevision});assert.equal(switched.status,200);jiu=await switched.json();
  assert.equal((await read('public/content')).settings.title,'JIU JITSU LIVE');assert.deepEqual(await read('public/leaderboard'),[]);
  assert.equal((await request('admin/switch-event',{eventId:'f1',revision:0})).status,409,'Stale admin cannot override a newer switch');
  assert.equal((await request('public/start',{player:{fullName:'Stale F1 page',consent:true},versionId:content.versionId})).status,409);
  const completed=await request('public/complete',{...round,finalTime:9.99});assert.equal(completed.status,200);assert.equal((await completed.json() as any).eventId,'f1');
  assert.deepEqual(await read('public/leaderboard'),[],'F1 round completed after switch stays out of jiu jitsu');
  const jiuContent=await read('public/content');const jiuRound=await request('public/start',{player:{fullName:'Jiu jitsu player',email:'jiu@example.com',nationality:'AE',consent:true},versionId:jiuContent.versionId,retrySequence:true});assert.equal(jiuRound.status,200);
  const jiuToken:any=await jiuRound.json();const jiuResult=await request('public/complete',{...jiuToken,finalTime:4.99});assert.equal(jiuResult.status,200);const saved:any=await jiuResult.json();assert.equal(saved.eventId,'jiu-jitsu');assert.equal(saved.target,5);
  assert.equal((await read('public/leaderboard')).length,1);assert.equal((await read('public/leaderboard?event=f1')).length,2);
  const jiuScores=await read('admin/event-records?event=jiu-jitsu');assert.equal(jiuScores.records.length,1);assert.equal(jiuScores.records[0].id,saved.id);
  const f1Record=JSON.parse((await DB.prepare('SELECT data FROM records WHERE id=?').bind(round.id).first() as any).data);
  assert.equal((await request('admin/import',{eventId:'jiu-jitsu',records:[f1Record]})).status,200);
  assert.equal((await read('admin/event-records?event=jiu-jitsu')).records.length,1,'Import cannot copy an existing F1 score into the daily jiu jitsu history');
  // An old Admin without event support must refresh once a different event is live.
  assert.equal((await request('admin/draft',{revision:7,draft:{...draft,title:'Wrong legacy save'}})).status,409);
  assert.equal((await request('admin/draft',{eventId:'f1',revision:7,draft:{...draft,title:'Saved F1 draft'}})).status,200);
  assert.equal((await read('admin/snapshot?event=jiu-jitsu')).draft.title,'JIU JITSU LIVE');
  const back=await request('admin/switch-event',{eventId:'f1',revision:jiu.eventRevision});assert.equal(back.status,200);
  assert.equal((await read('public/content')).settings.title,'F1 LIVE');assert.equal((await read('public/leaderboard')).length,2);
  f1=await read('admin/snapshot?event=f1');assert.equal(f1.draft.title,'Saved F1 draft');assert.equal(f1.versions.length,1);
  const beforeRestart=await read('public/content');const newBinding:any={...env,DB:await mf.getD1Database('DB')};
  const restarted=await handleApi(new Request('https://fab.example/api/public/content'),newBinding);assert.equal(restarted.status,200);assert.deepEqual(await restarted.json(),beforeRestart);
  assert.deepEqual((await DB.prepare('SELECT * FROM records_backup_20261103 ORDER BY rowid').all()).results,backupBefore.results,'Backup rows are byte-for-byte unchanged');
  assert.equal((await DB.prepare('SELECT revision FROM studio WHERE id=1').first() as any).revision,7,'Original studio is preserved');
  assert.equal((await request('admin/event-records?event=invalid')).status,400);assert.equal((await request('admin/event-records?event=f1&cursor=-1')).status,400);
 }finally{await mf.dispose();}
});
