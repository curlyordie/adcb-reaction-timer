import {GAME_RESUMES_AT} from '../shared/game-pause';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {handleApi} from '../cloudflare/backend';
import {schemaStatements} from '../cloudflare/schema';
import {baseline} from '../shared/domain';
test('startup bootstraps empty/partial D1 without overwriting existing designs or scores',async(t)=>{
 const realNow=Date.now.bind(Date);t.mock.method(Date,'now',()=>Math.max(realNow(),GAME_RESUMES_AT+1000));
 const sql=(await readFile('migrations/0001_cloud.sql','utf8')).split('\n').filter(line=>line.startsWith('CREATE ')).map(line=>line.trim().replace(/;$/,''));assert.deepEqual([...schemaStatements],sql);
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test");}}',compatibilityDate:'2026-08-01',d1Databases:['EMPTY','EXISTING','INCOMPATIBLE']});
 try{
 const empty=await mf.getD1Database('EMPTY');const request=()=>new Request('https://fab.example/api/public/content');let response=await handleApi(request(),{DB:empty} as any);assert.equal(response.status,200);assert.equal((await response.json() as any).settings.title,baseline.title);
 const tables=await empty.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();for(const name of ['studio','design_versions','assets','asset_chunks','rounds','records','rate_limits','admin_sessions'])assert.ok(tables.results.some(row=>row.name===name));
 const existing=await mf.getD1Database('EXISTING');await existing.exec(sql.filter(s=>s.startsWith('CREATE TABLE IF NOT EXISTS studio ')||s.startsWith('CREATE TABLE IF NOT EXISTS design_versions ')||s.startsWith('CREATE TABLE IF NOT EXISTS records ')).join(';\n')+';');
 const settings=JSON.stringify({...baseline,title:'Keep this existing event'});await existing.batch([existing.prepare('INSERT INTO design_versions(id,settings,reason,created_at) VALUES(?,?,?,?)').bind('existing-version',settings,'Existing event','2026-10-31T00:00:00Z'),existing.prepare('INSERT INTO studio VALUES(1,7,?,?)').bind(settings,'existing-version'),existing.prepare('INSERT INTO records(id,data,difference,completed_at) VALUES(?,?,?,?)').bind('keep-this-score','{}',0,'2026-10-31T00:00:00Z')]);
 response=await handleApi(request(),{DB:existing} as any);assert.equal(response.status,200);assert.equal((await response.json() as any).settings.title,'Keep this existing event');assert.equal((await existing.prepare('SELECT revision FROM studio').first() as any).revision,7);assert.equal((await existing.prepare('SELECT count(*) AS count FROM records').first() as any).count,1);
 const bad=await mf.getD1Database('INCOMPATIBLE');await bad.exec('CREATE TABLE studio(id INTEGER PRIMARY KEY);');response=await handleApi(request(),{DB:bad} as any);assert.equal(response.status,503);assert.match((await response.json() as any).error,/schema does not match/);assert.equal((await bad.prepare('PRAGMA table_info(studio)').all()).results.length,1);
 response=await handleApi(request(),{DB:'incorrect-plain-text-binding'} as any);assert.equal(response.status,503);assert.match((await response.json() as any).error,/not a plain-text variable/);
 }finally{await mf.dispose();}
});
