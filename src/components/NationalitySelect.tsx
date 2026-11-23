import {useEffect,useId,useRef,useState} from 'react';
import {countries,nationalityName} from '../../shared/countries';
const aliases:Record<string,string>={AE:'uae emirates emirati',GB:'uk britain british england',US:'usa america american',PH:'filipino philippines',IN:'indian',PK:'pakistani',KR:'south korea korean',KP:'north korea',TR:'turkey turkish',CI:'ivory coast',CZ:'czech republic',RU:'russian'};
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function Flag({code}:{code:string}){return <img className="nationality-flag" src={'/flags/'+code.toLowerCase()+'.svg'} alt={nationalityName(code)+' flag'} width={32} height={24} loading="lazy"/>;}
export function NationalitySelect({value,onChange,disabled=false}:{value:string;onChange:(code:string)=>void;disabled?:boolean}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(0);
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);const id=useId();
 const matches=countries.filter(country=>normalize(country.name+' '+country.code+' '+(aliases[country.code]||'')).includes(normalize(query)));
 const close=()=>setOpen(false);
 useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))close();};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open]);
 useEffect(()=>{setActive(0);},[query]);
 useEffect(()=>{if(open)document.getElementById(id+'-'+matches[active]?.code)?.scrollIntoView({block:'nearest'});},[open,active,id,query]);
 const choose=(code:string)=>{onChange(code);close();trigger.current?.focus();};
 return <div className="nationality-picker" ref={root} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();close();trigger.current?.focus();}}}>
 <label id={id+'-label'}>NATIONALITY <span aria-hidden="true">*</span></label>
 <button ref={trigger} type="button" className="nationality-trigger" disabled={disabled} aria-labelledby={id+'-label '+id+'-value'} aria-haspopup="listbox" aria-expanded={open} aria-controls={id+'-list'} onClick={()=>{if(open){close();return;}setQuery('');setOpen(true);}}>{value&&<Flag code={value}/>}<span id={id+'-value'}>{value?nationalityName(value):'SELECT NATIONALITY'}</span><span aria-hidden="true">▾</span></button>
 {!value&&<span className="nationality-help">Required — choose your country.</span>}
 {open&&<div className="nationality-menu"><input autoFocus type="text" role="combobox" aria-label="Search countries" aria-required="true" aria-autocomplete="list" aria-expanded="true" aria-controls={id+'-list'} aria-activedescendant={matches[active]?id+'-'+matches[active].code:undefined} placeholder="TYPE TO SEARCH COUNTRIES" autoComplete="off" maxLength={100} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setActive(i=>Math.min(matches.length-1,i+1));}if(e.key==='ArrowUp'){e.preventDefault();setActive(i=>Math.max(0,i-1));}if(e.key==='Enter'){e.preventDefault();if(matches[active])choose(matches[active].code);}if(e.key==='Tab')close();}}/>
 <div id={id+'-list'} role="listbox" aria-label="Countries" className="nationality-options">{matches.map((country,i)=><button type="button" role="option" aria-selected={country.code===value} id={id+'-'+country.code} key={country.code} className={i===active?'nationality-option active':'nationality-option'} onPointerDown={e=>e.preventDefault()} onClick={()=>choose(country.code)}><Flag code={country.code}/><span>{country.name}</span></button>)}{matches.length===0&&<p role="status">No matching countries. Try another name.</p>}</div>
 </div>}
 </div>;
}
