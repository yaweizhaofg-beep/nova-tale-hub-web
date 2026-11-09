import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import "./auth-motion.css";

export function AuthMotion() {
  const video=useRef<HTMLVideoElement>(null);
  const [paused,setPaused]=useState(false);
  const [failed,setFailed]=useState(false);
  const media=`${import.meta.env.BASE_URL}media/`;
  useEffect(()=>{
    const reduced=matchMedia("(prefers-reduced-motion: reduce)");
    const update=()=>{if(reduced.matches){video.current?.pause();setPaused(true)}};
    update();reduced.addEventListener("change",update);
    return()=>reduced.removeEventListener("change",update);
  },[]);
  const toggle=async()=>{if(!video.current)return;if(video.current.paused){try{await video.current.play()}catch{setPaused(true)}}else video.current.pause()};
  return <>
    <div className="auth-motion" aria-hidden="true">
      <video ref={video} className="auth-motion-video" src={`${media}landing-hero.mp4`} poster={`${media}landing-hero-poster.jpg`} autoPlay muted loop playsInline preload="metadata" onPlay={()=>{if(matchMedia("(prefers-reduced-motion: reduce)").matches){video.current?.pause();return}setPaused(false)}} onPause={()=>setPaused(true)} onError={()=>setFailed(true)}/>
      <div className="auth-motion-shade" />
    </div>
    <button type="button" className="auth-motion-control" onClick={toggle} disabled={failed} aria-label={paused ? "播放背景动画" : "暂停背景动画"} aria-pressed={paused}>
      {paused ? <Play size={14} /> : <Pause size={14} />} {failed?"背景画面":paused ? "播放动画" : "暂停动画"}
    </button>
  </>;
}
