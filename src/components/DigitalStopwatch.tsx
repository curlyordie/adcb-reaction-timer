import {formatTime} from '../lib/leaderboard';
export function DigitalStopwatch({time}:{time:number}){const text=formatTime(time);return <div className="digital-stopwatch" role="timer" aria-label="Elapsed time in seconds" aria-live="off" data-time={text}><span className="national-day-numerals">{text}</span><div className="stopwatch-units">SECONDS</div></div>;}
