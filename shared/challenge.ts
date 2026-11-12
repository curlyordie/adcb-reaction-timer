// Capture and judge the same millisecond precision shown to players.
export function captureSeconds(seconds:number){return Math.round(seconds*1000)/1000;}
export function passes(seconds:number,target=5,tolerance=.05){return Number.isFinite(seconds)&&seconds>=target-tolerance-1e-9&&seconds<=target+tolerance+1e-9;}
export function evaluateChallenge(times:readonly number[],target=5,tolerance=.05){
 if(times.length<1||times.length>2||times.some(t=>!Number.isFinite(t)||t<0||t>120))throw Error('Supply one or two valid round times.');
 if(times.length===2&&!passes(times[0],target,tolerance))throw Error('Round 1 must pass before Round 2 can be played.');
 return {difference:Math.max(...times.map(t=>Math.abs(t-target))),qualified:times.length===2&&times.every(t=>passes(t,target,tolerance))};
}
