import {applyUnionTribute} from '../../shared/union-tribute';
import {load,save,normalize,type Version,type Settings} from './settings';
import type {Studio} from './studio';

const upgradeId='adcb-union-tribute-v1';
export function upgradeLocalUnionTribute(){
 if(localStorage.getItem(upgradeId))return;
 const studio=load<Studio|null>('adcb-studio',null);
 const versions=studio?.versions??load<Version[]>('adcb-versions',[]);
 if(versions.length){
  const published:Version={id:upgradeId,settings:applyUnionTribute(normalize(versions.at(-1)!.settings)),reason:'55 Years of the Union tribute',createdAt:new Date().toISOString()};
  if(studio)save('adcb-studio',{...studio,revision:studio.revision+1,draft:applyUnionTribute(normalize(studio.draft)),versions:[...versions,published]});
  else{
   save('adcb-versions',[...versions,published]);
   const draft=load<Settings|null>('adcb-draft',null);
   if(draft)save('adcb-draft',applyUnionTribute(normalize(draft)));
  }
 }
 localStorage.setItem(upgradeId,'1');
}
