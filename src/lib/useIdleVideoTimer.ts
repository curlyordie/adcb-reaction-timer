import {useEffect,useRef} from 'react';

const activityEvents=['pointerdown','pointermove','keydown','input','wheel','scroll'] as const;
export function useIdleVideoTimer({enabled,seconds,onIdle,onWake}:{enabled:boolean;seconds:number;onIdle:()=>void;onWake:()=>void}){
 const callbacks=useRef({onIdle,onWake});callbacks.current={onIdle,onWake};
 useEffect(()=>{
  if(!enabled)return;
  let lastActivity=Date.now(),asleep=false,timer:ReturnType<typeof setTimeout>;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(check,Math.max(1,seconds*1000-(Date.now()-lastActivity)));};
  function check(){
   if(asleep)return;
   if(Date.now()-lastActivity>=seconds*1000){asleep=true;callbacks.current.onIdle();}
   else schedule();
  }
  const activity=(event:Event)=>{
   if(asleep){
    // A moving cursor or an incidental scroll must not dismiss an unattended video.
    if(!['pointerdown','keydown'].includes(event.type))return;
    event.preventDefault();event.stopImmediatePropagation();
    asleep=false;callbacks.current.onWake();
   }
   lastActivity=Date.now();schedule();
  };
  const visible=()=>{if(!document.hidden)check();};
  schedule();
  for(const event of activityEvents)window.addEventListener(event,activity,{capture:true,passive:false});
  document.addEventListener('visibilitychange',visible);
  return()=>{clearTimeout(timer);for(const event of activityEvents)window.removeEventListener(event,activity,true);document.removeEventListener('visibilitychange',visible);};
 },[enabled,seconds]);
}
