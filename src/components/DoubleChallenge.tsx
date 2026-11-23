import {CampaignText} from './CampaignText';
import {useEffect,useRef,useState} from 'react';
import {captureSeconds,passes} from '../../shared/challenge';
import {getSettings,isFrozen,copy} from '../lib/settings';
import {DigitalStopwatch} from './DigitalStopwatch';
function tributeText(value:string){
 return value.split(/(\d{4}\s*[–-]\s*\d{4})/).map((part,index)=>index%2?<span className="round-year-range" key={index}>{part}</span>:part);
}
export function DoubleChallenge({onComplete}:{onComplete:(times:number[])=>void}){
 const {target,tolerance}=getSettings();const [times,setTimes]=useState<number[]>([]);const [running,setRunning]=useState(false);const [display,setDisplay]=useState(0);
 const started=useRef<number|null>(null);const locked=useRef(false);const frame=useRef(0);const round=times.length;
 useEffect(()=>{if(!running)return;const tick=()=>{if(started.current!==null)setDisplay((performance.now()-started.current)/1000);frame.current=requestAnimationFrame(tick);};frame.current=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame.current);},[running]);
 function start(){if(isFrozen||started.current!==null||locked.current||round>1)return;started.current=performance.now();setDisplay(0);setRunning(true);}
 function stop(){if(isFrozen||started.current===null||locked.current)return;const time=captureSeconds((performance.now()-started.current)/1000);started.current=null;cancelAnimationFrame(frame.current);setRunning(false);setDisplay(time);const next=[...times,time];setTimes(next);if(!passes(time,target,tolerance)||next.length===2){locked.current=true;onComplete(next);}else setDisplay(0);}
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.code==='Space'&&!event.repeat&&!(event.target instanceof HTMLButtonElement)){event.preventDefault();if(started.current===null)start();else stop();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
 return <section className="double-challenge" aria-label="Two-stage precision challenge"><p className="eyebrow">1971–2026 · 55 YEARS OF THE UNION</p><h1>{getSettings().title}</h1><p className="challenge-instruction" role="status">{times.length===1?'FIRST 50 YEARS COMPLETE. Now celebrate the next 5.':running?'Find your moment. Stop at five.':'Start Round 1 when you are ready.'}</p><div className="timer-pair">{[0,1].map(index=>{const done=times[index]!==undefined;const active=round===index;const time=done?times[index]:active?display:0;return <article key={index} className={'timer-card '+(done?'passed':active?'active':'locked')} aria-label={'Round '+(index+1)}><div className="round-heading"><span>ROUND 0{index+1}</span><span>{done?'✓ COMPLETE':active?'YOUR MOMENT':'LOCKED'}</span></div><p className="round-tribute"><CampaignText page="playing" name={index===0?'round1Tribute':'round2Tribute'}>{tributeText(copy(index===0?'round1Tribute':'round2Tribute'))}</CampaignText></p><DigitalStopwatch time={time}/><p>Target {target.toFixed(3)} seconds</p><button className="timer-action" disabled={!active||isFrozen} onClick={running?stop:start}>{done?'FIRST 50 YEARS COMPLETE':!active?'PASS ROUND 1 TO UNLOCK':running?'STOP':'START'}</button></article>;})}</div><p className="tolerance-note">A little room for perfection. {(target-tolerance).toFixed(3)}–{(target+tolerance).toFixed(3)} seconds, inclusive, in each round.</p></section>;
}
