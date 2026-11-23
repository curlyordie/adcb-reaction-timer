import {idleVideo,idleVideoPublicationId,withIdleVideo} from '../../shared/idle-video';
import {load,save,normalize,type Version,type Settings} from './settings';
import type {Studio} from './studio';

export function upgradeLocalIdleVideo(){
 if(!idleVideo.src||!idleVideoPublicationId||localStorage.getItem(idleVideoPublicationId))return;
 const studio=load<Studio|null>('adcb-studio',null);
 const versions=studio?.versions??load<Version[]>('adcb-versions',[]);
 if(versions.length){
  const version:Version={id:idleVideoPublicationId,settings:withIdleVideo(normalize(versions.at(-1)!.settings)),reason:'Bundled AAIHEX idle video · one minute',createdAt:new Date().toISOString()};
  if(studio)save('adcb-studio',{...studio,revision:studio.revision+1,draft:withIdleVideo(normalize(studio.draft)),versions:[...versions,version]});
  else{
   save('adcb-versions',[...versions,version]);
   const draft=load<Settings|null>('adcb-draft',null);
   if(draft)save('adcb-draft',withIdleVideo(normalize(draft)));
  }
 }
 localStorage.setItem(idleVideoPublicationId,'1');
}
