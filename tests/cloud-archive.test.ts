import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {handleApi} from '../cloudflare/backend';

test('Archived scores require admin, paginate independently and never enter the public leaderboard',async()=>{
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-08-01',d1Databases:['DB']});
 try{
 const DB=await mf.getD1Database('DB');
 const env:any={DB,ADMIN_PASSWORD:'archive-test-password-not-for-production'};
 const request=(path:string,cookie='',body?:unknown)=>handleApi(new Request('https://fab.example/api/'+path,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:'https://fab.example','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),env);
 assert.equal((await request('admin/archive-records')).status,401);
 const login=await request('admin/login','',{password:env.ADMIN_PASSWORD});
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie')!.split(';')[0];
 assert.equal((await request('admin/archive-records',cookie)).status,404);
 await DB.prepare('CREATE TABLE records_backup_20261103 AS SELECT * FROM records').run();
 const insert=DB.prepare('INSERT INTO records_backup_20261103(seq,id,data,difference,completed_at) VALUES(?,?,?,?,?)');
 await DB.batch(Array.from({length:502},(_,i)=>insert.bind(i+1,'archive-'+i,JSON.stringify({id:'archive-'+i,fullName:'Archived participant',timestamp:'2026-11-02T10:00:00Z'}),0,'2026-11-02T10:00:00Z')));
 const first:any=await (await request('admin/archive-records',cookie)).json();
 assert.equal(first.records.length,500);assert.equal(first.next,500);
 const last:any=await (await request('admin/archive-records?cursor='+first.next,cookie)).json();
 assert.equal(last.records.length,2);assert.equal(last.next,null);
 assert.equal((await request('admin/archive-records?cursor=-1',cookie)).status,400);
 const current:any=await (await request('admin/records',cookie)).json();assert.equal(current.records.length,0);
 assert.deepEqual(await (await request('public/leaderboard')).json(),[]);
 assert.equal((await DB.prepare('SELECT count(*) AS n FROM records_backup_20261103').first() as any).n,502);
 }finally{await mf.dispose();}
});
