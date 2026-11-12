import {isHosted,hostedContent,hostedStudio,api,setHostedStudio} from "./runtime";
import {load,save,normalize,original,validate,type Settings,type Version} from './settings';
export interface Studio {eventId?:string;eventName?:string;activeEventId?:string;eventRevision?:number;events?:readonly {id:string;name:string}[];revision:number;draft:Settings;versions:Version[]}
export function readStudio():Studio {if(isHosted){if(hostedStudio)return hostedStudio;if(hostedContent)return {revision:0,draft:hostedContent.settings,versions:[{id:hostedContent.versionId,settings:hostedContent.settings,reason:"Published",createdAt:new Date().toISOString()}]};throw Error("Cloud design is not loaded.");}const state=load<Studio|null>('fab-studio',null);if(state)return {...state,draft:normalize(state.draft)};const versions=load<Version[]>('fab-versions',[original]);return {revision:0,versions,draft:normalize(load('fab-draft',versions.at(-1)!.settings))};}
export async function writeStudio(expected:number,draft:Settings,reason?:string){
 if(isHosted){const next=await api<Studio>(reason===undefined?"admin/draft":"admin/publish",{revision:expected,draft,reason,eventId:hostedStudio?.eventId||'f1'});setHostedStudio(next);return next;}
 const operation=()=>{const latest=readStudio();if(latest.revision!==expected)throw Error('The draft changed in another window. Use Reload saved draft before editing again.');const settings=validate(draft);if(reason!==undefined&&!reason.trim())throw Error('Enter a change note before publishing.');const versions=reason!==undefined?[...latest.versions,{id:crypto.randomUUID(),settings:structuredClone(settings),reason:reason.trim(),createdAt:new Date().toISOString()}]:latest.versions;const next={revision:latest.revision+1,draft:settings,versions};save('fab-studio',next);return next;};
 if(navigator.locks)return navigator.locks.request('fab-design-write',operation);
 // Without Web Locks do not pretend multi-tab writes are safe.
 throw Error('This browser cannot safely save designs. Use a current Chrome, Edge, Firefox or Safari browser on HTTPS or localhost.');
}

export async function reloadStudio(selected=hostedStudio?.eventId){if(isHosted){const next=await api<Studio>('admin/snapshot'+(selected?'?event='+encodeURIComponent(selected):''));setHostedStudio(next);}return readStudio();}

export async function activateEvent(eventId:string,revision:number){const next=await api<Studio>('admin/switch-event',{eventId,revision});setHostedStudio(next);return next;}
