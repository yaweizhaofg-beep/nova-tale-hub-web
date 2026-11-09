import { useEffect, useRef } from "react";
import "./story-headline.css";

type Dot = {x:number;y:number;ox:number;oy:number;vx:number;vy:number;color:string;alpha:number};
export default function StoryHeadline() {
  const title = useRef<HTMLHeadingElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const element=title.current, surface=canvas.current;
    if(!element||!surface)return;
    const context=surface.getContext("2d");
    if(!context)return;
    const reduced=matchMedia("(prefers-reduced-motion: reduce)");
    const pointer={x:-1000,y:-1000,inside:false};
    let dots:Dot[]=[], frame=0, settled=0, width=0, height=0;
    const stop=()=>{cancelAnimationFrame(frame);frame=0;dots=[];pointer.inside=false;element.removeAttribute("data-particles");context.clearRect(0,0,width,height)};
    const sample=()=>{
      const bounds=element.getBoundingClientRect();
      width=Math.ceil(bounds.width);height=Math.ceil(bounds.height);
      if(!width||!height)return false;
      const raster=document.createElement("canvas");raster.width=width;raster.height=height;
      const ink=raster.getContext("2d",{willReadFrequently:true});if(!ink)return false;
      for(const glyph of element.querySelectorAll<HTMLElement>(".xl-story-glyph")){
        const style=getComputedStyle(glyph),r=glyph.getBoundingClientRect();
        ink.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        ink.fillStyle=style.color;
        const metrics=ink.measureText(glyph.textContent||"");
        const ascent=metrics.fontBoundingBoxAscent||parseFloat(style.fontSize)*.9;
        const descent=metrics.fontBoundingBoxDescent||parseFloat(style.fontSize)*.1;
        ink.textBaseline="alphabetic";
        ink.fillText(glyph.textContent||"",r.left-bounds.left,r.top-bounds.top+(r.height-ascent-descent)/2+ascent);
      }
      const pixels=ink.getImageData(0,0,width,height).data;
      dots=[];
      for(let y=1;y<height;y+=2){for(let x=1;x<width;x+=2){const i=(y*width+x)*4;if(pixels[i+3]>90)dots.push({x,y,ox:x,oy:y,vx:0,vy:0,color:`rgb(${pixels[i]},${pixels[i+1]},${pixels[i+2]})`,alpha:pixels[i+3]/255})}}
      const ratio=Math.min(devicePixelRatio||1,2);surface.width=width*ratio;surface.height=height*ratio;context.setTransform(ratio,0,0,ratio,0,0);
      return dots.length>0;
    };
    const render=()=>{
      context.clearRect(0,0,width,height);let energy=0;
      for(const dot of dots){
        const dx=dot.x-pointer.x,dy=dot.y-pointer.y,distance=Math.hypot(dx,dy);
        if(pointer.inside&&distance<70){const force=(1-distance/70)*1.4;dot.vx+=(dx/(distance||1))*force;dot.vy+=(dy/(distance||1))*force}
        dot.vx=(dot.vx+(dot.ox-dot.x)*.045)*.8;dot.vy=(dot.vy+(dot.oy-dot.y)*.045)*.8;dot.x+=dot.vx;dot.y+=dot.vy;
        energy+=Math.abs(dot.x-dot.ox)+Math.abs(dot.y-dot.oy);
        context.globalAlpha=dot.alpha;context.fillStyle=dot.color;context.fillRect(dot.x-.9,dot.y-.9,1.8,1.8);
      }
      context.globalAlpha=1;
      if(!pointer.inside&&energy<dots.length*.04){if(++settled>5){stop();return}}else settled=0;
      frame=requestAnimationFrame(render);
    };
    const move=(event:PointerEvent)=>{
      if(reduced.matches||event.pointerType!=="mouse")return;
      const r=element.getBoundingClientRect();pointer.x=event.clientX-r.left;pointer.y=event.clientY-r.top;pointer.inside=true;
      if(!frame&&sample()){element.setAttribute("data-particles","active");render()}
    };
    const leave=()=>{pointer.inside=false;pointer.x=-1000;pointer.y=-1000};
    const resize=new ResizeObserver(stop);resize.observe(element);
    element.addEventListener("pointermove",move);element.addEventListener("pointerleave",leave);
    reduced.addEventListener("change",stop);window.addEventListener("blur",stop);
    return()=>{stop();resize.disconnect();element.removeEventListener("pointermove",move);element.removeEventListener("pointerleave",leave);reduced.removeEventListener("change",stop);window.removeEventListener("blur",stop)};
  },[]);
  return <h1 ref={title} className="xl-story-title" aria-label="让故事成剧，让热爱有收获">
    <span className="xl-story-word xl-story-first" aria-hidden="true">{Array.from("让故事成剧，").map((glyph,i)=><span className={`xl-story-glyph ${glyph==="，"?"xl-story-comma":""}`} key={i}>{glyph}</span>)}</span>
    <span className="xl-story-word xl-story-second" aria-hidden="true">{Array.from("让热爱有收获").map((glyph,i)=><span className="xl-story-glyph" key={i}>{glyph}</span>)}</span>
    <canvas ref={canvas} aria-hidden="true"/>
  </h1>;
}
