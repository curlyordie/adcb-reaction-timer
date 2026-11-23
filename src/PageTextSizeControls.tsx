import {gamePages} from '../shared/editor';
import type {Settings} from './lib/settings';

export function PageTextSizeControls({page,draft,onChange}:{page:string;draft:Settings;onChange:(settings:Settings)=>void}){
 const percent=draft.pageTextScale[page]??100;
 const change=(value:number)=>onChange({...draft,pageTextScale:{...draft.pageTextScale,[page]:value}});
 return <fieldset className="page-text-size-controls">
  <legend>All text on this page</legend>
  <label>Text size · <output>{percent}%</output>
   <input type="range" aria-label="All text size" min={75} max={200} step={5} value={percent} onChange={event=>change(Number(event.target.value))}/>
  </label>
  <div className="page-text-size-actions">
   <button type="button" aria-label="Decrease all text sizes" disabled={percent<=75} onClick={()=>change(Math.max(75,percent-10))}>A−</button>
   <button type="button" aria-label="Increase all text sizes" disabled={percent>=200} onClick={()=>change(Math.min(200,percent+10))}>A+</button>
   <button type="button" disabled={percent===100} onClick={()=>change(100)}>Reset page text size</button>
  </div>
  <p>Adjust headings, buttons, labels and timer digits together. Check text wrapping in the preview. At larger sizes, timer cards stack to keep the numbers visible. Individual text sizes below stay available.</p>
  <button type="button" onClick={()=>onChange({...draft,pageTextScale:Object.fromEntries(gamePages.map(key=>[key,percent]))})}>Apply text size to all pages</button>
 </fieldset>;
}
