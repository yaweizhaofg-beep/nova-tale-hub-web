import { FeaturedWorks } from "./landing/featured-works";
import { Dialog } from "@/components/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, Film, X, PenLine, Package, Wrench, Crown } from "lucide-react";
import type { Nav } from "../shared";
import LandingPricing from "../components/LandingPricing";
import FooterInformation from "../components/FooterInformation";
import OfferStrip from "../components/OfferStrip";
import StoryHeadline from "../components/StoryHeadline";
import BrandLogo from "../components/BrandLogo";
import AnnouncementCarousel from "../components/AnnouncementCarousel";
import "./landing.css";
import "./landing-lower.css";

export function LandingPage({ navigate }: Nav) {
  const video = useRef<HTMLVideoElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [manual, setManual] = useState(false);
  const [offer, setOffer] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const media = `${import.meta.env.BASE_URL}media/`;
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (reduced.matches) { video.current?.pause(); }
    };
    apply(); reduced.addEventListener("change", apply);
    return () => reduced.removeEventListener("change", apply);
  }, []);
  const setBackgroundPaused = useCallback((paused: boolean) => {
    if (paused) video.current?.pause();
    else if (video.current) void video.current.play().catch(() => {});
  }, []);
  return <div ref={container} className="xinghe-landing" onScroll={e => setScrolled(e.currentTarget.scrollTop > 40)}>
    <OfferStrip onOpen={()=>setOffer(true)}/>
    <header className={`xl-nav ${scrolled ? "is-scrolled" : ""}`}>
      <button className="xl-brand" onClick={() => { container.current?.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="星核耀火Hub首页">
        <BrandLogo size={42}/><span>星核耀火Hub<small>Nova Tale Hub</small></span>
      </button>
      <nav aria-label="首页导航"><button onClick={() => navigate("workspace")}><Film size={15}/>创作</button><button onClick={() => navigate("projects", {kind: "canvas"})}><PenLine size={15}/>画布</button><button onClick={() => navigate("assets")}><Package size={15}/>资产</button><button onClick={() => navigate("tools")}><Wrench size={15}/>工具</button><button className="xl-nav-membership" onClick={() => scrollTo("plans")}><Crown size={15}/>会员套餐</button><button onClick={() => setManual(true)}><BookOpen size={15}/>使用手册</button></nav>
      <button className="xl-workspace-entry xl-glass-login" onClick={()=>navigate("login")}>免费注册 / 登录 <ArrowUpRight size={15}/></button>
    </header>

    <section className="xl-hero" aria-label="星核耀火Hub创作平台">
      <video ref={video} className="xl-hero-video" src={`${media}landing-hero-web.mp4`} poster={`${media}landing-hero-poster.jpg`} autoPlay muted loop playsInline preload="auto" aria-hidden="true" />
      <div className="xl-hero-shade" />
      <AnnouncementCarousel onPlaybackChange={setBackgroundPaused} onOffer={()=>setOffer(true)} onCreate={()=>navigate("new-project")} />
      <div className="xl-hero-copy">
        <p className="xl-intro"><span /> AI 漫剧生产平台 · 内测开放中</p>
        <StoryHeadline />
        <p className="xl-lede">一站式 AI 漫剧生产平台，贯通剧本拆解、角色与场景资产、分镜、生图、生视频和画质处理，帮助个人创作者与专业团队高效完成整部作品。</p>
        <div className="xl-hero-stats">{[["10x", "创作效率"], ["500+", "活跃创作者"], ["50+", "参考素材支持"]].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
      </div>
    </section>

    <FeaturedWorks navigate={navigate} />

    <LandingPricing navigate={navigate} />

    <footer className="xl-footer"><div className="xl-brand"><BrandLogo size={40}/><span>星核耀火Hub<small>Nova Tale Hub</small></span></div><span>© 2026 星核耀火Hub · 让创作更简单</span><button onClick={()=>navigate("register")}>免费注册 <ArrowUpRight size={16}/></button></footer>
    <FooterInformation />
    {offer&&<Dialog label="优惠说明" onClose={()=>setOffer(false)} overlayClassName="xl-modal-backdrop" contentClassName="xl-manual xl-offer-dialog"><button data-ui-autofocus className="xl-close" aria-label="关闭优惠说明" onClick={()=>setOffer(false)}><X size={20}/></button><span className="xl-banner-kicker">限时模型特惠</span><h2 id="xl-offer-title">Seedance 2.0<br/><strong>低至 7.5折</strong></h2><p>具体适用模型、规格及最终费用以生成确认页展示为准。</p><button className="xl-button xl-primary" onClick={()=>navigate("new-project")}>开始创作 <ArrowUpRight size={17}/></button></Dialog>}
    {manual&&<Dialog label="使用手册" onClose={()=>setManual(false)} overlayClassName="xl-modal-backdrop" contentClassName="xl-manual"><button data-ui-autofocus className="xl-close" aria-label="关闭使用手册" onClick={()=>setManual(false)}><X size={20}/></button><h2 id="xl-manual-title">使用手册</h2><h3>怎么开始创作？</h3><p>从剧本导入或剧情解析开始，AI 自动拆解分镜，批量生成视频素材。</p><h3>可以团队协作吗？</h3><p>支持多人团队，邀请成员、分配职能、共享项目和资产，协同更高效。</p><h3>费用如何查看？</h3><p>1元=10付费星石。实际任务价格由模型、规格和参数决定，生成前完整展示。</p></Dialog>}
  </div>;
}
export default LandingPage;
