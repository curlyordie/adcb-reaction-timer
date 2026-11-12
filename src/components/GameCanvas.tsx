import {useLayoutEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {designCanvases} from '../../shared/canvas';
import {getSettings} from '../lib/settings';

// The editor and live game share one logical canvas. Device dimensions only
// determine its scale; they never change text wrapping or artwork coordinates.
export function GameCanvas({children}:{children:ReactNode}){
 const settings=getSettings();const design=designCanvases[settings.designFormat];
 const host=useRef<HTMLDivElement>(null);const canvas=useRef<HTMLDivElement>(null);
 const [viewport,setViewport]=useState({width:window.innerWidth,height:window.innerHeight});
 const [contentHeight,setContentHeight]=useState<number>(design.height);
 useLayoutEffect(()=>{
  const element=host.current;if(!element)return;
  const measure=()=>setViewport({width:element.clientWidth,height:Math.min(element.clientHeight,window.visualViewport?.height??element.clientHeight)});
  const observer=new ResizeObserver(measure);observer.observe(element);window.visualViewport?.addEventListener('resize',measure);measure();
  return()=>{observer.disconnect();window.visualViewport?.removeEventListener('resize',measure);};
 },[]);
 useLayoutEffect(()=>{
  const game=canvas.current?.querySelector<HTMLElement>('.game');if(!game)return;
  const measure=()=>setContentHeight(Math.max(design.height,game.offsetHeight,game.scrollHeight));
  const observer=new ResizeObserver(measure);observer.observe(game);measure();
  return()=>observer.disconnect();
 },[design.height]);
 const height=Math.max(design.height,contentHeight);const scale=Math.min(viewport.width/design.width,viewport.height/height);
 const style={width:design.width,height,left:(viewport.width-design.width*scale)/2,top:(viewport.height-height*scale)/2,transform:`scale(${scale})`,'--canvas-width':design.width+'px','--canvas-height':design.height+'px','--canvas-vw':design.width/100+'px','--canvas-vh':design.height/100+'px','--canvas-vmin':Math.min(design.width,design.height)/100+'px'} as CSSProperties;
 return <div ref={host} className="game-viewport" style={{backgroundColor:settings.background}}><div ref={canvas} className="game-canvas" data-format={settings.designFormat} style={style}>{children}</div></div>;
}
