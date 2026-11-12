import {getSettings} from '../lib/settings';
import {assetURL} from '../lib/assets';
export function DesignElements({page}:{page:string}){return <div className="design-elements" aria-hidden="true">{getSettings().elements.filter(el=>el.page===page).map(el=><div key={el.id} data-design-id={el.id} className="design-element" style={{left:el.x+'%',top:el.y+'%',width:el.width+'%',transform:`rotate(${el.rotation}deg)`,opacity:el.opacity,zIndex:el.layer}}><img src={assetURL(el.src)} alt="" draggable={false}/><span className="element-resize"/></div>)}</div>;}
