import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import seedance from "../assets/banner-seedance-v1.png";
import batch from "../assets/banner-batch-v1.png";
import storyboard from "../assets/banner-storyboard-v1.png";
const slides = [
  { tag:"限时模型特惠", title:"Seedance 2.0", highlight:"低至 7.5折", description:"让每一份想象，都有更轻盈的创作成本", image:seedance, action:"了解优惠", theme:"gold" },
  { tag:"从故事到成片", title:"剧目批量生成", highlight:"20分镜，一键提交", description:"实时进度追踪 · 让创作一气呵成", image:batch, action:"开始创作", theme:"violet" },
  { tag:"让创作更有章法", title:"AI 分镜管理", highlight:"每个镜头，都有故事", description:"自动拆章提取实体 · 费用生成前预览", image:storyboard, action:"探索分镜", theme:"teal" },
];
export default function AnnouncementCarousel({onPlaybackChange,onOffer,onCreate}: {onPlaybackChange?: (paused:boolean)=>void;onOffer:()=>void;onCreate:()=>void}) {
  const [current,setCurrent] = useState(0);
  const [hovered,setHovered] = useState(false);
  const [focused,setFocused] = useState(false);
  const [reduced,setReduced] = useState(false);
  const [visible,setVisible] = useState(!document.hidden);
  const touchStart = useRef<number|null>(null);
  useEffect(()=>{const media=matchMedia("(prefers-reduced-motion: reduce)");const update=()=>setReduced(media.matches);update();media.addEventListener("change",update);const visibility=()=>setVisible(!document.hidden);document.addEventListener("visibilitychange",visibility);return()=>{media.removeEventListener("change",update);document.removeEventListener("visibilitychange",visibility)}},[]);
  useEffect(()=>{if(hovered||focused||reduced||!visible)return;const timer=setInterval(()=>setCurrent(v=>(v+1)%slides.length),5000);return()=>clearInterval(timer)},[hovered,focused,reduced,current,visible]);
  useEffect(()=>{onPlaybackChange?.(reduced||!visible)},[reduced,visible,onPlaybackChange]);
  return <section className="xl-carousel xl-carousel-premium" aria-label="平台动态轮播" aria-roledescription="轮播" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setFocused(false)}} onTouchStart={e=>{touchStart.current=e.touches[0].clientX}} onTouchEnd={e=>{if(touchStart.current===null)return;const delta=e.changedTouches[0].clientX-touchStart.current;if(Math.abs(delta)>45)setCurrent(v=>(v+(delta<0?1:slides.length-1))%slides.length);touchStart.current=null}}>
    <div className="xl-carousel-stage" aria-live={focused?"polite":"off"}>
      {slides.map((slide,i)=><div key={slide.title} className={`xl-carousel-slide xl-banner-${slide.theme} ${current===i?"is-active":i===(current+slides.length-1)%slides.length?"is-previous":"is-next"}`} role="group" aria-roledescription="幻灯片" aria-label={`${i+1} / ${slides.length}`}>
        <img className="xl-banner-image" src={slide.image} alt="" draggable={false}/><div className="xl-banner-scrim"/>
        <div className="xl-banner-content"><span className="xl-banner-kicker">{slide.tag}</span><h2>{slide.title}</h2><strong>{slide.highlight}</strong><p>{slide.description}</p><button className="xl-banner-cta" tabIndex={current===i?0:-1} onClick={()=>i===0?onOffer():onCreate()}>{slide.action}<ArrowUpRight size={16}/></button></div>
        {current!==i&&<button className="xl-banner-select" tabIndex={-1} aria-label={`预览${slide.title}`} onClick={()=>setCurrent(i)}/>}
      </div>)}
    </div>
    <div className="xl-carousel-controls"><div className="xl-carousel-dots">{slides.map((slide,i)=><button key={slide.title} aria-label={`切换到第${i+1}张`} aria-pressed={current===i} onClick={()=>setCurrent(i)}/>)}</div></div>
  </section>;
}
