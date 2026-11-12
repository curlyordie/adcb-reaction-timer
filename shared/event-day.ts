const offset=4*60*60*1000;
export function dubaiDay(now=Date.now()){return new Date(now+offset).toISOString().slice(0,10);}
export function nextDubaiMidnight(now=Date.now()){return Date.parse(dubaiDay(now)+'T00:00:00Z')-offset+24*60*60*1000;}
