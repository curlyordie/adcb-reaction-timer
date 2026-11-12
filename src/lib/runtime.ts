import type {Settings} from '../../shared/domain';
import type {Studio} from './studio';
import type {LeaderboardRecord} from './leaderboard';
declare global {interface Window {__ADCB_OFFLINE__?:boolean}}
export const isHosted=import.meta.env.VITE_HOSTED==='true'&&!window.__ADCB_OFFLINE__&&location.protocol!=='file:';
export let hostedContent:{eventId?:string;versionId:string;settings:Settings}|undefined;
export let hostedStudio:Studio|undefined;
export let hostedRecords:LeaderboardRecord[]=[];
export function setHostedStudio(value:Studio){hostedStudio=value;}
let authEpoch=0;
export class ApiError extends Error {constructor(message:string,public status:number){super(message);}}
export async function api<T>(path:string,body?:unknown):Promise<T>{const startedAtEpoch=authEpoch;let response:Response;try{response=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});}catch(error){if(error instanceof Error&&['TimeoutError','AbortError'].includes(error.name))throw new ApiError('Cloudflare is taking too long to respond. Your result stays on screen; retry saving when the connection recovers.',504);throw new ApiError('Could not reach Cloudflare. Check the connection and retry.',503);}let value;try{value=await response.json();}catch{throw Error('Cloud API is unavailable. Check Pages Functions configuration.');}if(!response.ok){if(response.status===401&&path!=='admin/login'&&startedAtEpoch===authEpoch)window.dispatchEvent(new Event('adcb-auth-required'));throw new ApiError(value.error||'Cloud request failed.',response.status);}if(path==='admin/login')authEpoch++;return value;}
export async function fetchVersion(){return api<{eventId?:string;versionId:string}>('public/version');}
export async function fetchContent(){return api<{eventId?:string;versionId:string;settings:Settings}>('public/content');}
export async function refreshHostedRecords(eventId=hostedStudio?.eventId||'f1'){const all:LeaderboardRecord[]=[];let cursor=0;for(;;){const page=await api<{records:LeaderboardRecord[];next:number|null}>('admin/event-records?event='+encodeURIComponent(eventId)+'&cursor='+cursor);all.push(...page.records);if(page.next===null)break;cursor=page.next;}if(eventId===hostedStudio?.eventId)hostedRecords=all;return all;}
export async function initializeHosted(){hostedContent=await fetchContent();if(/^\/admin\/?$/.test(location.pathname)){hostedStudio=await api<Studio>('admin/snapshot');await refreshHostedRecords();}}

export async function fetchArchivedRecords(){const all:LeaderboardRecord[]=[];let cursor=0;for(;;){const page=await api<{records:LeaderboardRecord[];next:number|null}>('admin/archive-records?cursor='+cursor);all.push(...page.records);if(page.next===null)break;cursor=page.next;}return all;}
