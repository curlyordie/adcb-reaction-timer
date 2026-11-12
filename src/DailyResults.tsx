import {nationalityName} from '../shared/countries';
import {useEffect,useState} from 'react';
import {api} from './lib/runtime';
import type {LeaderboardRecord} from './lib/leaderboard';

type Row=LeaderboardRecord&{scoreDay?:string;carried?:boolean};
type Result={day:string;records:Row[];leaderboard:Row[]};
const date=(value:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dubai',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
function exportCSV(day:string,kind:string,rows:Row[]){
 const csv=[[kind==='leaderboard'?'Rank':'Row','Name','Email','Nationality','Phone','Time (seconds)','Target','Difference','Qualified','Completed (Dubai)','Carried from earlier day','Score ID','Tolerance','Event'],...rows.map((r,i)=>[i+1,r.fullName,r.email,nationalityName(r.nationality),r.countryCode+' '+r.phoneNumber,r.finalTime,r.target,r.difference,r.qualified,date(r.timestamp),r.carried?'Yes':'No',r.id,r.tolerance,'jiu-jitsu'])].map(row=>row.map(v=>'"'+String(v).replace(/^[=+@\-]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download='fab-jiu-jitsu-'+day+'-'+kind+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function DailyResults(){
 const [refresh,setRefresh]=useState(0);
 const [day,setDay]=useState(''),[today,setToday]=useState(''),[days,setDays]=useState<string[]>([]),[result,setResult]=useState<Result|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;api<{today:string;days:string[]}>('admin/daily-days').then(value=>{if(active){setToday(value.today);setDays(value.days);setDay(previous=>previous||value.today);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[refresh]);
 useEffect(()=>{if(!day)return;let active=true,request=0;setResult(null);const load=async()=>{const id=++request;try{const value=await api<Result>('admin/daily-results?day='+day);if(active&&id===request){setResult(value);setError('');}}catch(e){if(active&&id===request)setError(e instanceof Error?e.message:'Could not load daily results.');}};void load();return()=>{active=false;};},[day,refresh]);
 return <section><h1>Jiu jitsu daily results</h1><button onClick={()=>setRefresh(value=>value+1)}>Refresh daily results</button><p>Results load when you choose a date or press Refresh. Automatic downloads are off to save data.</p><p>At 00:00 Dubai time, the public leaderboard keeps the event’s best three scores. New scores then compete with those three. Every day’s saved game data and leaderboard remain downloadable throughout the 13-day event.</p>
 <label>Daily results date (Dubai)<input aria-label="Daily results date (Dubai)" type="date" max={today} value={day} onChange={e=>setDay(e.target.value)}/></label>
 <div className="actions">{[...new Set([today,...days])].filter(Boolean).map(value=><button key={value} aria-pressed={day===value} onClick={()=>setDay(value)}>{value}</button>)}</div>
 {error&&<p role="alert">{error}</p>}{!result&&!error&&<p>Loading daily results…</p>}
 {result&&<><p>{result.day} · {result.records.length} saved scores played this day · {result.leaderboard.length} public leaderboard entries. Earlier dates show their closing leaderboard; today shows the live leaderboard.</p>
 <div className="actions"><button onClick={()=>exportCSV(result.day,'game-data',result.records)}>Download daily game data CSV</button><button onClick={()=>exportCSV(result.day,'leaderboard',result.leaderboard)}>Download daily leaderboard CSV</button></div>
 <h2>Daily leaderboard</h2>{result.leaderboard.length===0?<p>No leaderboard scores for this date.</p>:<div className="table"><table aria-label="Daily leaderboard"><thead><tr><th>Rank</th><th>Name</th><th>Time</th><th>Difference</th><th>Score date</th><th>Carried forward</th></tr></thead><tbody>{result.leaderboard.map((r,i)=><tr key={r.id}><td>{i+1}</td><td>{r.fullName}</td><td>{r.finalTime.toFixed(3)}</td><td>{r.difference.toFixed(3)}</td><td>{date(r.timestamp)}</td><td>{r.carried?'Yes':'No'}</td></tr>)}</tbody></table></div>}
 <h2>Game data for this day</h2><p>Contains all saved scores for the selected day, including scores outside the public top 20. Each retry sequence keeps its best score separately for each day.</p>{result.records.length===0?<p>No saved game scores for this date.</p>:<div className="table"><table aria-label="Daily game data"><thead><tr><th>Name</th><th>Email</th><th>Nationality</th><th>Time</th><th>Completed (Dubai)</th></tr></thead><tbody>{result.records.map(r=><tr key={r.id}><td>{r.fullName}</td><td>{r.email}</td><td>{nationalityName(r.nationality)}</td><td>{r.finalTime.toFixed(3)}</td><td>{date(r.timestamp)}</td></tr>)}</tbody></table></div>}</>}
 </section>;
}
