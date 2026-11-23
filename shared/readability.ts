import type {Settings} from './domain';
import {gamePages} from './editor';
import {exhibitionElements} from './exhibition';

export const readabilityPublicationId='adcb-led-readable-type-v1';
// Publish a native LED layout rather than enlarging a tall page which is then
// scaled back down. Previous versions retain the earlier layout and type settings.
export function withReadableText(settings:Settings):Settings{
 const supplied=(['portrait','landscape','led'] as const).flatMap(format=>exhibitionElements(format));
 const compact=exhibitionElements('led');
 return {...settings,designFormat:'led',pageTextScale:Object.fromEntries(gamePages.map(page=>[page,100])),textSizes:{},
  elements:settings.elements.map(element=>{
   const index=supplied.findIndex(item=>item.id===element.id);
   if(index<0)return element;
   const placement=compact[index%compact.length];
   return {...element,id:placement.id,x:placement.x,y:placement.y,width:placement.width};
  })};
}
