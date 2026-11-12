import {evaluateChallenge} from '../../shared/challenge';
import {dubaiDay} from '../../shared/event-day';
import {isHosted,hostedContent,api} from "./runtime";
import { getSettings, load, save, isPreview } from "./settings";
export let TARGET_TIME = getSettings().target;
export let TOLERANCE = getSettings().tolerance;

export interface LeaderboardRecord {
  roundTimes?:number[];
  nationality?:string;
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  finalTime: number;
  difference: number;
  timestamp: string;
  target: number;
  tolerance: number;
  qualified: boolean;
}

export const COUNTRY_CODES = [
  { code: "+971", label: "UAE" },
  { code: "+44", label: "UK" },
  { code: "+1", label: "USA" },
  { code: "+61", label: "AUSTRALIA" },
  { code: "+33", label: "FRANCE" },
  { code: "+49", label: "GERMANY" },
  { code: "+91", label: "INDIA" },
  { code: "+81", label: "JAPAN" },
];

let store: LeaderboardRecord[] = isPreview || isHosted ? [] : load("adcb-records", []);

export function getLeaderboard(): LeaderboardRecord[] {
  if (!isPreview && !isHosted) store = load("adcb-records", []);
  return [...store].sort((a, b) => Math.abs(a.difference) - Math.abs(b.difference));
}

export async function addLeaderboardRecord(rec: Omit<LeaderboardRecord, "id" | "timestamp" | "target" | "tolerance" | "qualified">): Promise<LeaderboardRecord> {
  if(sequenceBest&&(!(isHosted&&hostedContent?.eventId==='jiu-jitsu')||dubaiDay(Date.parse(sequenceBest.timestamp))===dubaiDay())&&Math.abs(sequenceBest.difference)<=Math.abs(rec.difference))return sequenceBest;
  if(isHosted&&!isPreview){if(!round&&roundReady)await roundReady;if(!round&&roundRequest)await beginRound(roundRequest.player,roundRequest.versionId);if(!round)throw Error("Start a new round before saving.");const saved=await api<LeaderboardRecord>("public/complete",{...round,finalTime:rec.finalTime,roundTimes:rec.roundTimes});sequenceBest=saved;window.dispatchEvent(new Event('adcb-score-saved'));return saved;}
  const full: LeaderboardRecord = {
    ...rec,
    target: TARGET_TIME, tolerance: TOLERANCE, qualified: getSettings().gameMode==='double'?evaluateChallenge(rec.roundTimes??[],TARGET_TIME,TOLERANCE).qualified:Math.abs(rec.difference)<=TOLERANCE,
    id: sequenceId,
    timestamp: new Date().toISOString(),
  };
  if (!isPreview) store = load("adcb-records", []);
  const existing=store.find(record=>record.id===sequenceId);
  if(existing&&Math.abs(existing.difference)<=Math.abs(full.difference))return existing;
  store=[...store.filter(record=>record.id!==sequenceId),full];
  if(!isPreview)save("adcb-records",store);

  sequenceBest=full;
  return full;
}

export function formatTime(t: number): string {
  return t.toFixed(3);
}

export function formatDiff(diff: number): string {
  const sign = diff >= 0 ? "+" : "-";
  const abs = Math.abs(diff);
  return `${sign}${abs.toFixed(3)}`;
}

let sequenceId=crypto.randomUUID();
let sequenceBest:LeaderboardRecord|undefined;
export function resetRetrySequence(){sequenceId=crypto.randomUUID();sequenceBest=undefined;round=undefined;roundRequest=undefined;roundReady=undefined;}
let round:{id:string;token:string}|undefined;
let roundReady:Promise<void>|undefined;
let roundRequest:{player:{fullName:string;email:string;phoneNumber:string;countryCode:string;nationality?:string};versionId:string}|undefined;
export function initializeGameSettings(){TARGET_TIME=getSettings().target;TOLERANCE=getSettings().tolerance;}
export async function beginRound(player:{fullName:string;email:string;phoneNumber:string;countryCode:string;nationality?:string},versionId:string){
 if(!isHosted||isPreview||round)return;
 if(roundReady)return roundReady;
 round=undefined;roundRequest={player:{...player},versionId};
 const pending=api<{id:string;token:string}>('public/start',{player:{...player,consent:true},versionId,retrySequence:true}).then(value=>{round=value;});
 roundReady=pending;
 try{await pending;}finally{if(roundReady===pending)roundReady=undefined;}
}
export async function refreshLeaderboard(){if(isHosted&&!isPreview)store=await api<LeaderboardRecord[]>('public/leaderboard'+(hostedContent?.eventId?'?event='+encodeURIComponent(hostedContent.eventId):''));return getLeaderboard();}
