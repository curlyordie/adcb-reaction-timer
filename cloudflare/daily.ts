import {dubaiDay} from '../shared/event-day';
import {HttpError} from './auth';
type Env={DB:D1Database};
export function validDay(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw new HttpError(400,'Choose a valid date.');if(value>dubaiDay())throw new HttpError(400,'Future leaderboards are not available yet.');return value;}
// History is immutable after its Dubai day ends. Only the three best previous
// scores survive onto the next day's public board; raw scores stay in D1.
export async function dailyLeaderboard(env:Env,day=dubaiDay()){
 const rows=await env.DB.prepare(`WITH history AS (
 SELECT score_id,data,difference,completed_at,day,ROW_NUMBER() OVER(PARTITION BY score_id ORDER BY abs(difference),completed_at,day) AS n
 FROM daily_scores WHERE event_id='jiu-jitsu' AND day<?
 ), carried AS (
 SELECT score_id,data,difference,completed_at,day FROM history WHERE n=1 ORDER BY abs(difference),completed_at,score_id LIMIT 3
 ), candidates AS (
 SELECT * FROM carried UNION ALL SELECT score_id,data,difference,completed_at,day FROM daily_scores WHERE event_id='jiu-jitsu' AND day=?
 ), ranked AS (
 SELECT *,ROW_NUMBER() OVER(PARTITION BY score_id ORDER BY abs(difference),completed_at,day) AS n FROM candidates
 ) SELECT data,day FROM ranked WHERE n=1 ORDER BY abs(difference),completed_at,score_id LIMIT 20`).bind(day,day).all<{data:string;day:string}>();
 return rows.results.map(row=>({...JSON.parse(row.data),scoreDay:row.day,carried:row.day<day}));
}
export async function dailyResults(env:Env,day:string){
 const rows=await env.DB.prepare("SELECT data FROM daily_scores WHERE event_id='jiu-jitsu' AND day=? ORDER BY completed_at,score_id").bind(day).all<{data:string}>();
 return {day,records:rows.results.map(row=>JSON.parse(row.data)),leaderboard:await dailyLeaderboard(env,day)};
}
