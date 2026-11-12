import {load,normalize,original,type Settings} from './settings';
import {api,hostedStudio} from './runtime';
import {exportArtwork,uploadArtwork} from './assets';
import {writeStudio} from './studio';
import type {LeaderboardRecord} from './leaderboard';
const fields=['logo','artwork','decoration','countdownArtwork','resultArtwork'] as const;
export function oldBrowserData(){const studio=load<any>('adcb-studio',null);const versions=studio?.versions||load('adcb-versions',[original]);const draft=normalize(studio?.draft||load('adcb-draft',versions.at(-1).settings));return {draft,versions,records:load<LeaderboardRecord[]>('adcb-records',[])};}
export async function browserBackup(){return {...oldBrowserData(),assets:await exportArtwork(true)};}
export async function migrateBrowser(expected:number){const old=oldBrowserData();const assets=await exportArtwork(true);const draft:Settings=structuredClone(old.draft);const uploaded=new Map<string,string>();
 async function transfer(ref:string){if(!ref||ref.startsWith('/api/art/')||ref.startsWith('/brand/'))return ref;if(uploaded.has(ref))return uploaded.get(ref)!;const data=ref.startsWith('asset:')?assets[ref]:ref;if(!data)throw Error('A local image is missing. Restore it before transferring.');const response=await fetch(data);const blob=await response.blob();const value=await uploadArtwork(new File([blob],'migration-artwork',{type:blob.type}));uploaded.set(ref,value);return value;}
 for(const key of fields)draft[key]=await transfer(draft[key]);for(const el of draft.elements)el.src=await transfer(el.src);for(const item of draft.library)item.src=await transfer(item.src);
 const next=await writeStudio(expected,draft,'Transferred design from this browser');let imported=0;try{for(let i=0;i<old.records.length;i+=100){const chunk=old.records.slice(i,i+100);await api('admin/import',{records:chunk,eventId:hostedStudio?.eventId||'aaihex-2026'});imported+=chunk.length;}}catch(error){throw Error('Design was published, but only '+imported+' scores were transferred. Reload saved draft and retry; existing IDs will not duplicate. '+(error instanceof Error?error.message:''));}return next;}
