import {baseline,normalize,validate,type Settings,type Version,original} from "../../shared/domain";
export {baseline,normalize,validate,original};
export type {Settings,Version};
import {hostedContent,isHosted} from "./runtime";
export function load<T>(key:string,fallback:T):T {try {return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
export function save(key:string,value:unknown){localStorage.setItem(key,JSON.stringify(value));}
// Only embedded editor/idle frames may disable gameplay. A copied preview URL
// must never turn the main event page into an unclickable demonstration.
const parameters=new URLSearchParams(location.search);
const embedded=window.self!==window.top;
export const isPreview=embedded&&(parameters.get('preview')==='1'||parameters.get('idle')==='1');
export const isFrozen=isPreview&&(parameters.get('frozen')==='1'||parameters.get('idle')==='1');
let publishedSettings:Settings|undefined;
export function getSettings():Settings{if(isPreview&&parameters.get('preview')==='1'){try{return validate(JSON.parse(sessionStorage.getItem('adcb-preview')||'null'));}catch{return baseline;}}if(publishedSettings)return publishedSettings;if(isHosted&&hostedContent)return publishedSettings=normalize(hostedContent.settings);const studio=load<{versions:Version[]}|null>('adcb-studio',null);return publishedSettings=normalize((studio?.versions||load<Version[]>('adcb-versions',[original])).at(-1)!.settings);}
export function copy(key:string){return (getSettings().text[key]??baseline.text[key]??key).replaceAll('{target}',getSettings().target.toFixed(3));}

export function previewURL(screen?:string,frozen=false){return (/^\/admin\/?$/.test(location.pathname)?"/":"")+"?preview=1"+(frozen?"&frozen=1":"")+(screen?"&screen="+encodeURIComponent(screen):"");}

export function resetSettings(){publishedSettings=undefined;}
