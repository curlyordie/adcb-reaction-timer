import {useEffect,useRef,useState,type ReactNode} from 'react';

export const previewScreens={
 mobile:{label:'Mobile · 390 × 844',width:390,height:844},
 desktop:{label:'Desktop · 1920 × 1080',width:1920,height:1080},
 portrait:{label:'Event screen · 1080 × 1920',width:1080,height:1920},
} as const;
export type PreviewScreen=keyof typeof previewScreens;

// Give the game its real viewport, then scale the entire viewport to fit the editor.
// Changing the editor column width must never change the game's responsive layout.
export function EditorViewport({screen,children}:{screen:PreviewScreen;children:ReactNode}){
 const container=useRef<HTMLDivElement>(null);
 const [available,setAvailable]=useState({width:390,height:700});
 const dimensions=previewScreens[screen];
 useEffect(()=>{
  const element=container.current;if(!element)return;
  const update=()=>setAvailable({width:element.clientWidth,height:Math.max(240,window.innerHeight-200)});
  const observer=new ResizeObserver(update);observer.observe(element);window.addEventListener('resize',update);update();
  return()=>{observer.disconnect();window.removeEventListener('resize',update);};
 },[]);
 const scale=Math.min(1,Math.max(1,available.width-2)/dimensions.width,available.height/dimensions.height);
 return <div ref={container} className="editor-viewport"><p className="preview-dimensions">{dimensions.width} × {dimensions.height} pixels · Fit {Math.round(scale*100)}%</p><div className="editor-viewport-frame" style={{width:dimensions.width*scale,height:dimensions.height*scale}}><div className="editor-viewport-screen" style={{width:dimensions.width,height:dimensions.height,transform:`scale(${scale})`}}>{children}</div></div></div>;
}
