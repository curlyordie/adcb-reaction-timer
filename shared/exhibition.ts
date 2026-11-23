import type {DesignElement} from './design-elements';
import type {DesignFormat} from './canvas';

// Original files have different transparent margins. Their measured visible
// centres and feet let each composition share a ground line without cropping art.
const art={
  camp: {name:"Desert camp",src:"/brand/EE55_Scenarios_DesertCamping_02-44fcf620ce.webp",center:0.478214,bottom:0.712857},
  tent: {name:"Practice camp",src:"/brand/EE55_Scenarios_DesertCamping_01-5e34d81702.webp",center:0.517143,bottom:0.833571},
  family: {name:"Family arriving at camp",src:"/brand/EE55_Families_Emirati_02-ba2c1c90db.webp",center:0.623571,bottom:0.776429},
  tree: {name:"Ghaf tree",src:"/brand/EE55_Flora_Ghaff-Tree_01-c24d7db3d0.webp",center:0.538929,bottom:0.692857},
  falcon: {name:"Falcon in flight",src:"/brand/EE55_Fauna_Falcon_02-d54f2f5b71.webp",center:0.464286,bottom:0.566429},
  visitor: {name:"Emirati visitor",src:"/brand/EE55_People_09-a302a19115.webp",center:0.550000,bottom:0.774286},
  observer: {name:"Watching the falcon",src:"/brand/EE55_People_16-137914390e.webp",center:0.640714,bottom:0.866429},
  woman: {name:"Watching the falcon together",src:"/brand/EE55_People_17-a4be245a3d.webp",center:0.668571,bottom:0.852857},
  guest: {name:"Majlis guest",src:"/brand/EE55_People_02-6fd19e1c60.webp",center:0.598214,bottom:0.778571},
  host: {name:"Emirati host",src:"/brand/EE55_People_21-85955761a3.webp",center:0.585000,bottom:0.665714},
  majlis: {name:"The gathering",src:"/brand/EE55_Scenarios_Majlis-13caa7717d.webp",center:0.503929,bottom:0.565714},
  horse: {name:"Equestrian honours",src:"/brand/EE55_Fauna_Horse-B-086560741b.webp",center:0.555714,bottom:0.800000},
  palm: {name:"Oasis palm",src:"/brand/EE55_Flora_Palm-Tree_01-9c0945742b.webp",center:0.543571,bottom:0.688571},
} as const;
type Art=keyof typeof art;
type Placement=[Art,number,number,number]; // visible centre (%), ground (%), file width (%)
const scenes:Record<string,Placement[]>={
 home:[['palm',25,93,43],['camp',40,95,76],['family',74,96,43]],
 instructions:[['tree',36,95,65],['observer',60,97,32],['woman',74,97,30],['falcon',65,79,55]],
 countdown:[['observer',37,96,30],['woman',63,96,30],['falcon',52,80,55]],
 playing:[['tent',50,96,76],['visitor',24,97,33],['guest',77,97,32]],
 result:[['majlis',49,96,85],['visitor',16,95,28],['family',78,96,34]],
 leaderboard:[['palm',29,94,42],['horse',46,97,55],['host',75,97,60]],
};

export function exhibitionElements(format:DesignFormat):DesignElement[]{
 const landscape=format==='landscape',led=format==='led';
 const ratio=led?768/1024:landscape?1920/1080:1080/1920;
 return Object.entries(scenes).flatMap(([page,placements])=>placements.map(([key,center,ground,size],layer)=>{
  const item=art[key];
  // A panoramic scene retains the same figure heights and brings the group
  // together below the controls, rather than enlarging portrait images.
  const width=led?size*.32:landscape?size*(1080/1920)**2:size;
  const xCenter=led?50+(center-50)*.6:landscape?50+(center-50)*.40:center;
  const floor=led?96+(ground-96)*.35:ground;
  const round=(n:number)=>Math.round(n*1000)/1000;
  return {id:`exhibition-v5-${led?'e':landscape?'l':'p'}-${page}-${key}`,name:item.name,src:item.src,page,
   x:round(xCenter-width*item.center),y:round(floor-width*ratio*item.bottom),width:round(width),rotation:0,opacity:1,layer};
 }));
}

// Only pristine supplied elements change format automatically. Moved or uploaded
// artwork keeps its exact editor coordinates.
export function orientExhibitionElements(elements:DesignElement[],format:DesignFormat){
 const from=(['portrait','landscape','led'] as const).filter(value=>value!==format).flatMap(value=>exhibitionElements(value));
 const to=exhibitionElements(format);
 return elements.map(el=>{
  const index=from.findIndex(item=>item.id===el.id);
  if(index<0)return el;
  const original=from[index];
  return Object.keys(original).every(key=>el[key as keyof DesignElement]===original[key as keyof DesignElement])?to[index%to.length]:el;
 });
}
