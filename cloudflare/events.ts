import {exhibitionElements} from '../shared/exhibition';
import {applyUnionTribute} from '../shared/union-tribute';
import {baseline,original,normalize} from '../shared/domain';
import {HttpError} from './auth';

export const eventProfiles=[{id:'aaihex-2026',name:'AAIHEX 2026'}] as const;
export function eventId(value:unknown){if(!eventProfiles.some(event=>event.id===value))throw new HttpError(400,'Choose a valid event.');return value as string;}
type DatabaseEnv={DB:D1Database};
const initialized=new WeakMap<D1Database,Promise<void>>();
// Copy the old studio once. Historical tables and all existing scores stay intact.
export async function initializeEvents(env:DatabaseEnv){
 let pending=initialized.get(env.DB);
 if(!pending){pending=(async()=>{
  await env.DB.batch([
   env.DB.prepare('INSERT OR IGNORE INTO design_versions(id,settings,reason,created_at) VALUES(?,?,?,?)').bind(original.id,JSON.stringify(baseline),original.reason,new Date().toISOString()),
   env.DB.prepare('INSERT OR IGNORE INTO event_design_versions(version_id,event_id) VALUES(?,?)').bind(original.id,'aaihex-2026'),
   env.DB.prepare('INSERT OR IGNORE INTO event_profiles(id,name,revision,draft,active_id) VALUES(?,?,0,?,?)').bind('aaihex-2026','AAIHEX 2026',JSON.stringify(baseline),original.id),
   env.DB.prepare("INSERT OR IGNORE INTO game_event_state(id,active_event_id,revision) VALUES(1,'aaihex-2026',0)"),
   // This independent ADCB deployment keeps legacy rows but never makes the old projects live.
   env.DB.prepare("UPDATE game_event_state SET active_event_id='aaihex-2026',revision=revision+1 WHERE id=1 AND active_event_id IN ('f1','jiu-jitsu')")
  ]);
  // Publish the requested exhibition composition once for existing installations.
  // A version marker prevents subsequent deployments from overwriting editor work.
  const redesignId='adcb-exhibition-composition-v5';
  const applied=await env.DB.prepare('SELECT id FROM design_versions WHERE id=?').bind(redesignId).first();
  if(!applied){
   const profile=await env.DB.prepare("SELECT active_id,draft FROM event_profiles WHERE id='aaihex-2026'").first<{active_id:string;draft:string}>();
   if(profile){
    const published=await env.DB.prepare('SELECT settings FROM design_versions WHERE id=?').bind(profile.active_id).first<{settings:string}>();
    const compose=(settings:string)=>({...normalize(JSON.parse(settings)),elements:exhibitionElements(normalize(JSON.parse(settings)).designFormat),background:baseline.background,artwork:'',title:baseline.title,text:{...normalize(JSON.parse(settings)).text,subtitle:baseline.text.subtitle,instructions:baseline.text.instructions}});
    await env.DB.batch([
     env.DB.prepare('INSERT OR IGNORE INTO design_versions(id,parent_id,settings,reason,created_at) VALUES(?,?,?,?,?)').bind(redesignId,profile.active_id,JSON.stringify(compose(published?.settings??profile.draft)),'Centred AAIHEX scenes and precision console',new Date().toISOString()),
     env.DB.prepare('INSERT OR IGNORE INTO event_design_versions(version_id,event_id) VALUES(?,?)').bind(redesignId,'aaihex-2026'),
     env.DB.prepare("UPDATE event_profiles SET active_id=?,draft=?,revision=revision+1 WHERE id='aaihex-2026' AND active_id=?").bind(redesignId,JSON.stringify(compose(profile.draft)),profile.active_id)
    ]);
   }
  }
  // A separate copy publication preserves the layout and all Admin adjustments
  // made after the exhibition redesign. Historical versions remain recoverable.
  const tributeId='adcb-union-tribute-v1';
  if(!await env.DB.prepare('SELECT id FROM design_versions WHERE id=?').bind(tributeId).first()){
   const profile=await env.DB.prepare("SELECT active_id,draft FROM event_profiles WHERE id='aaihex-2026'").first<{active_id:string;draft:string}>();
   if(profile){
    const published=await env.DB.prepare('SELECT settings FROM design_versions WHERE id=?').bind(profile.active_id).first<{settings:string}>();
    const tribute=(settings:string)=>JSON.stringify(applyUnionTribute(normalize(JSON.parse(settings))));
    await env.DB.batch([
     env.DB.prepare('INSERT OR IGNORE INTO design_versions(id,parent_id,settings,reason,created_at) VALUES(?,?,?,?,?)').bind(tributeId,profile.active_id,tribute(published?.settings??profile.draft),'55 Years of the Union tribute',new Date().toISOString()),
     env.DB.prepare('INSERT OR IGNORE INTO event_design_versions(version_id,event_id) VALUES(?,?)').bind(tributeId,'aaihex-2026'),
     env.DB.prepare("UPDATE event_profiles SET active_id=?,draft=?,revision=revision+1 WHERE id='aaihex-2026' AND active_id=?").bind(tributeId,tribute(profile.draft),profile.active_id)
    ]);
   }
  }
 })();initialized.set(env.DB,pending);}
 try{await pending;}catch(error){initialized.delete(env.DB);throw error;}
}
export async function activeEvent(env:DatabaseEnv){const row=await env.DB.prepare('SELECT active_event_id,revision FROM game_event_state WHERE id=1').first<{active_event_id:string;revision:number}>();if(!row)throw new HttpError(503,'Event profiles are not initialized.');return row;}
export async function eventState(env:DatabaseEnv,selected?:string){const id=selected??(await activeEvent(env)).active_event_id;const row=await env.DB.prepare('SELECT id,name,revision,draft,active_id FROM event_profiles WHERE id=?').bind(id).first<{id:string;name:string;revision:number;draft:string;active_id:string}>();if(!row)throw new HttpError(404,'Event profile not found.');return row;}
export async function eventSnapshot(env:DatabaseEnv,selected?:string){
 const row=await eventState(env,selected);const active=await activeEvent(env);
 const versions=await env.DB.prepare("SELECT v.id,v.settings,v.reason,v.created_at FROM design_versions v LEFT JOIN event_design_versions e ON e.version_id=v.id WHERE COALESCE(e.event_id,'f1')=? ORDER BY v.rowid").bind(row.id).all<{id:string;settings:string;reason:string;created_at:string}>();
 return {eventId:row.id,eventName:row.name,activeEventId:active.active_event_id,eventRevision:active.revision,events:eventProfiles,revision:row.revision,draft:normalize(JSON.parse(row.draft)),versions:versions.results.map(v=>({id:v.id,settings:normalize(JSON.parse(v.settings)),reason:v.reason,createdAt:v.created_at}))};
}
export async function switchEvent(env:DatabaseEnv,selected:string,expected:number){
 const result=await env.DB.prepare('UPDATE game_event_state SET active_event_id=?,revision=revision+1 WHERE id=1 AND revision=?').bind(selected,expected).run();
 if(result.meta.changes!==1)throw new HttpError(409,'The active event changed in another Admin window. Reload saved draft before switching.');
 return eventSnapshot(env,selected);
}
export async function savedEventRecords(env:DatabaseEnv,selected:string,cursor:number){
 if(selected==='jiu-jitsu'){const rows=await env.DB.prepare("SELECT data FROM daily_scores WHERE event_id=? ORDER BY day,completed_at,score_id LIMIT 501 OFFSET ?").bind(selected,cursor).all<{data:string}>();return {records:rows.results.slice(0,500).map(r=>JSON.parse(r.data)),next:rows.results.length>500?cursor+500:null};}

 // Current records win when a backup contains the same score ID. The backup is read only.
 const backup=selected==='f1'&&await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='records_backup_20261103'").first();
 const archived=backup?" UNION ALL SELECT b.id,b.data,b.completed_at FROM records_backup_20261103 b WHERE NOT EXISTS(SELECT 1 FROM records r WHERE r.id=b.id)":"";
 const rows=await env.DB.prepare("SELECT id,data FROM (SELECT id,data,completed_at FROM records WHERE COALESCE(json_extract(data,'$.eventId'),'f1')=?"+archived+") ORDER BY completed_at,id LIMIT 501 OFFSET ?").bind(selected,cursor).all<{id:string;data:string}>();
 return {records:rows.results.slice(0,500).map(r=>JSON.parse(r.data)),next:rows.results.length>500?cursor+500:null};
}
