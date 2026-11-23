import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {loadIdleVideo} from '../lib/idle-video';
import {assetURL} from '../lib/assets';
import {copy} from '../lib/settings';

export function IdleVideo(){
 const video=useRef<HTMLVideoElement>(null);
 const [src,setSrc]=useState('');
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  let active=true,started=false;
  const prepare=()=>{
   if(document.hidden||started)return;
   started=true;
   void loadIdleVideo().then(url=>{if(active)setSrc(url);}).catch(()=>{if(active)setFailed(true);});
  };
  prepare();document.addEventListener('visibilitychange',prepare);
  return()=>{active=false;document.removeEventListener('visibilitychange',prepare);};
 },[]);
 useEffect(()=>{
  const player=video.current;if(!player||!src)return;
  const update=()=>{if(document.hidden)player.pause();else void player.play().catch(()=>{});};
  update();document.addEventListener('visibilitychange',update);
  return()=>{player.pause();document.removeEventListener('visibilitychange',update);};
 },[src]);
 return createPortal(<div className="idle-video-cover" role="region" aria-label="AAIHEX idle video">
  {src&&!failed&&<video ref={video} src={src} autoPlay muted loop playsInline preload="auto" disablePictureInPicture onError={()=>setFailed(true)} aria-label="AAIHEX 2026 exhibition video"/>}
  {failed&&<img className="idle-video-fallback" src={assetURL('/brand/adcb-logo-66a2316b71.png')} alt="ADCB"/>}
  <p className="idle-video-prompt">{copy('idleEnter')||'Touch to play'}</p>
 </div>,document.body);
}

export function IdleVideoPreview(){
 const [src,setSrc]=useState('');
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 async function preview(){
  setLoading(true);setError('');
  try{setSrc(await loadIdleVideo());}catch{setError('The video could not be loaded. Check the connection and try again.');}
  finally{setLoading(false);}
 }
 return <div className="idle-video-preview">
  {!src&&<button disabled={loading} onClick={()=>void preview()}>{loading?'Preparing preview…':'Preview bundled video'}</button>}
  {src&&<video src={src} autoPlay muted loop playsInline controls preload="auto" aria-label="Bundled idle video preview"/>}
  {error&&<p role="alert">{error}</p>}
 </div>;
}
