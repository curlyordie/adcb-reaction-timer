export type DesignElement={id:string;name:string;src:string;page:string;x:number;y:number;width:number;rotation:number;opacity:number;layer:number};
export type LibraryItem={id:string;name:string;src:string};
export const designPages=['home','instructions','countdown','playing','result','leaderboard'];
export function safeArtwork(ref:unknown):boolean {return typeof ref==='string'&&(/^\/brand\/[a-zA-Z0-9_.-]+\.(webp|png)$/.test(ref)||/^asset:[a-f0-9-]{36}$/.test(ref)||/^\/api\/art\/[a-f0-9-]{36}$/.test(ref));}
export function validateElements(elements:DesignElement[],library:LibraryItem[]){
 if(!Array.isArray(elements)||elements.length>100||!Array.isArray(library)||library.length>200)throw Error('Use at most 100 elements and 200 library images.');
 const ids=new Set<string>();
 for(const el of elements){if(!el||typeof el.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(el.id)||ids.has(el.id)||typeof el.name!=='string'||el.name.length>100||!safeArtwork(el.src)||!designPages.includes(el.page)||![el.x,el.y,el.width,el.rotation,el.opacity,el.layer].every(Number.isFinite)||el.x<0||el.x>100||el.y<0||el.y>100||el.width<2||el.width>100||el.rotation< -180||el.rotation>180||el.opacity<0||el.opacity>1||el.layer<0||el.layer>100)throw Error('Invalid artwork element.');ids.add(el.id);}
 for(const item of library)if(!item||typeof item.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(item.id)||typeof item.name!=='string'||item.name.length>100||!safeArtwork(item.src))throw Error('Invalid library image.');
}
