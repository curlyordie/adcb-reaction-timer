import {nationalDayPalette} from '../shared/brand-palette';

export function BrandPalette({onChoose,disabled=false}:{onChoose:(hex:string)=>void;disabled?:boolean}){
 return <details className="brand-palette"><summary>National Day colour palette</summary><div className="palette-swatches" role="group" aria-label="National Day colours">{nationalDayPalette.map(hex=><button key={hex} type="button" disabled={disabled} title={hex} aria-label={'Use '+hex+' colour'} style={{backgroundColor:hex}} onClick={()=>onChoose(hex)}><span className="sr-only">{hex}</span></button>)}</div></details>;
}
