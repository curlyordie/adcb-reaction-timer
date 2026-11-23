import {readabilityPublicationId,withReadableText} from '../../shared/readability';
import {load,save,normalize,type Version,type Settings} from './settings';
import type {Studio} from './studio';

export function upgradeLocalReadability(){
 if(localStorage.getItem(readabilityPublicationId))return;
 const studio=load<Studio|null>('adcb-studio',null);
 const versions=studio?.versions??load<Version[]>('adcb-versions',[]);
 if(versions.length){
  const version:Version={id:readabilityPublicationId,settings:withReadableText(normalize(versions.at(-1)!.settings)),reason:'Readable type for the 768 × 1024 LED screen',createdAt:new Date().toISOString()};
  if(studio)save('adcb-studio',{...studio,revision:studio.revision+1,draft:withReadableText(normalize(studio.draft)),versions:[...versions,version]});
  else{
   save('adcb-versions',[...versions,version]);
   const draft=load<Settings|null>('adcb-draft',null);if(draft)save('adcb-draft',withReadableText(normalize(draft)));
  }
 }
 localStorage.setItem(readabilityPublicationId,'1');
}
