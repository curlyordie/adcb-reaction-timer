import {idleVideo} from '../../shared/idle-video';

declare global {interface Window {__ADCB_IDLE_VIDEO__?:string}}
const source=window.__ADCB_IDLE_VIDEO__||idleVideo.src;
export const hasIdleVideo=Boolean(source);
const cacheName='adcb-idle-video-v1';
let prepared:Promise<string>|undefined;

function isVideo(response:Response){return response.status===200&&/^video\//i.test(response.headers.get('Content-Type')||'');}

async function prepare(){
 if(!source)throw Error('No idle video has been bundled.');
 // The standalone HTML carries its video bytes in the file itself.
 if(source.startsWith('data:video/'))return source;
 const url=new URL(source,location.href);
 if(url.origin!==location.origin)throw Error('Idle video must be bundled on this site.');
 let cache:Cache|undefined;
 let response:Response|undefined;
 try{
  cache=await caches.open(cacheName);
  const cached=await cache.match(url.href);
  if(cached&&isVideo(cached))response=cached;
 }catch{/* Private browsing or storage limits: use one in-memory copy. */}
 if(!response){
  const downloaded=await fetch(url.href,{cache:'force-cache',credentials:'same-origin'});
  if(!isVideo(downloaded))throw Error('The bundled idle video could not be loaded.');
  response=downloaded;
  try{
   await cache?.put(url.href,response.clone());
   // Only retire older files from this application's own video cache.
   if(cache)for(const key of await cache.keys())if(key.url!==url.href)await cache.delete(key);
  }catch{/* Playback still uses the complete downloaded copy if persistence is unavailable. */}
 }
 const blob=await response.blob();
 if(!blob.size)throw Error('The bundled idle video is empty.');
 return URL.createObjectURL(blob);
}

// A full local Blob gives the player no remote URL to request on a loop or seek.
// This URL is reused until the document closes; Cache Storage survives reloads.
export function loadIdleVideo():Promise<string>{
 if(!prepared)prepared=prepare().catch(error=>{prepared=undefined;throw error;});
 return prepared;
}
