import {getSettings} from '../lib/settings';
import {assetURL} from '../lib/assets';
import type {DesignElement} from '../../shared/design-elements';
function Artwork({element:el}:{element:DesignElement}){
 return <div data-design-id={el.id} className="design-element" style={{left:el.x+'%',top:el.y+'%',width:el.width+'%',transform:`rotate(${el.rotation}deg)`,opacity:el.opacity,zIndex:el.layer}}><img src={assetURL(el.src)} alt="" draggable={false}/><span className="element-resize"/></div>;
}
export function DesignElements({page}:{page:string}){
 const elements=getSettings().elements.filter(el=>el.page===page);
 return <div className="design-elements" aria-hidden="true">
  <div className="exhibition-scene">{elements.filter(el=>el.id.startsWith('exhibition-v5-')).map(el=><Artwork key={el.id} element={el}/>)}</div>
  {elements.filter(el=>!el.id.startsWith('exhibition-v5-')).map(el=><Artwork key={el.id} element={el}/>)}
 </div>;
}
