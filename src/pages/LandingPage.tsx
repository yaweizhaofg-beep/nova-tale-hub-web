import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, Film, Sparkles, Users, X, PenLine, Package, Wrench, Crown } from "lucide-react";
import type { Nav } from "../shared";
import LandingPricing from "../components/LandingPricing";
import FooterInformation from "../components/FooterInformation";
import OfferStrip from "../components/OfferStrip";
import StoryHeadline from "../components/StoryHeadline";
import ProjectCover from "../components/ProjectCover";
import BrandLogo from "../components/BrandLogo";
import AnnouncementCarousel from "../components/AnnouncementCarousel";
import "./landing.css";
import "./landing-lower.css";

const FEATURED_ITEMS = [
    { rank: "01", tag: "全站头部爆剧", subTag: "男频玄幻·逆袭",  title: "逆天棋局",     badge: "全网亿级爆品", color: "#ff8c20" },
    { rank: "02", tag: "全网亿级爆品", subTag: "古装重生·虐恋", title: "她在烽火尽头加冕", badge: "全网亿级爆品", color: "#a78bfa" },
    { rank: "03", tag: "垂类头部热剧", subTag: "男频仙侠·逆袭", title: "剑域无双",     badge: "垂类头部热剧", color: "#06b6d4" },
    { rank: "04", tag: "全站头部爆剧", subTag: "民国乱世·都市", title: "旗袍风华",     badge: "全站头部爆剧", color: "#ec4899" },
    { rank: "05", tag: "年度爆款热剧", subTag: "古装·虐恋情仇", title: "双生花",       badge: "年度爆款热剧", color: "#f59e0b" },
    { rank: "06", tag: "千万级爆款剧", subTag: "都市·重生复仇", title: "重生之巅峰",   badge: "千万级爆款剧", color: "#34d399" },
    { rank: "07", tag: "年度爆款热剧", subTag: "古装·虐恋情仇", title: "倾城之恋",     badge: "年度爆款热剧", color: "#a78bfa" },
    { rank: "08", tag: "垂类头部热剧", subTag: "都市豪门·爽剧", title: "霸总的逆袭",   badge: "垂类头部热剧", color: "#ff8c20" },
    { rank: "09", tag: "全站头部爆剧", subTag: "古装武侠·国内精选", title: "山河令",   badge: "全站头部爆剧", color: "#06b6d4" },
    { rank: "10", tag: "全网亿级爆品", subTag: "现代·都市豪门", title: "她的荣耀",     badge: "全网亿级爆品", color: "#ec4899" },
  ];

const CATEGORIES = ["全部", "国内精选", "国外精选", "逆袭爽剧", "都市豪门", "虐恋情仇", "古装古风", "重生复仇"];
export function LandingPage({ navigate }: Nav) {
  const video = useRef<HTMLVideoElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const manualClose = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [featuredTab, setFeaturedTab] = useState("hot");
  const [category, setCategory] = useState("全部");
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
  useEffect(() => {
    if (!manual && !offer) return;
    returnFocus.current = document.activeElement as HTMLElement;
    manualClose.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setManual(false); setOffer(false); }
      if (e.key === "Tab") { e.preventDefault(); manualClose.current?.focus(); }
    };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); returnFocus.current?.focus(); };
  }, [manual, offer]);
  const setBackgroundPaused = useCallback((paused: boolean) => {
    if (paused) video.current?.pause();
    else if (video.current) void video.current.play().catch(() => {});
  }, []);
  const visibleWorks = FEATURED_ITEMS.filter(item => category === "全部" || item.subTag.includes(category) ||
    (category === "古装古风" && /古装|仙侠|玄幻|武侠/.test(item.subTag)) ||
    (category === "逆袭爽剧" && /逆袭|爽剧/.test(item.subTag)) ||
    (category === "国内精选" && !item.subTag.includes("国外")));
  const coverName = (i: number) => ["镜像", "归途", "星坠", "制作画布"][i % 4];
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
      <video ref={video} className="xl-hero-video" src={`${media}landing-hero.mp4`} poster={`${media}landing-hero-poster.jpg`} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
      <div className="xl-hero-shade" />
      <AnnouncementCarousel onPlaybackChange={setBackgroundPaused} onOffer={()=>setOffer(true)} onCreate={()=>navigate("new-project")} />
      <div className="xl-hero-copy">
        <p className="xl-intro"><span /> AI 漫剧生产平台 · 内测开放中</p>
        <StoryHeadline />
        <p className="xl-lede">一站式 AI 漫剧生产平台，贯通剧本拆解、角色与场景资产、分镜、生图、生视频和画质处理，帮助个人创作者与专业团队高效完成整部作品。</p>
        <div className="xl-hero-stats">{[["10x", "创作效率"], ["500+", "活跃创作者"], ["50+", "参考素材支持"]].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
      </div>
    </section>

    <section id="inspiration" className="xl-section xl-inspiration">
      <div className="xl-section-heading"><div><h2>爆款 AI 剧 · 一键改编</h2><p>热门题材库 + AI 改编工具，让爆款生产效率翻倍</p></div><Sparkles size={34} className="xl-section-symbol" /></div>
      <div className="xl-tabs" role="tablist" aria-label="灵感类型">{[{id:"hot",label:"爆款AI剧",icon:Film},{id:"novel",label:"星推小说",icon:BookOpen},{id:"character",label:"明星角色",icon:Users}].map(({id,label,icon:Icon})=><button key={id} role="tab" aria-selected={featuredTab===id} onClick={()=>setFeaturedTab(id)}><Icon size={16}/>{label}</button>)}</div>
      {featuredTab === "hot" ? <>
        <div className="xl-categories" aria-label="作品分类">{CATEGORIES.map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div>
        {visibleWorks.length ? <div className="xl-works">{visibleWorks.map((f,i)=><article className={`xl-work ${i===0 ? "xl-work-featured":""}`} key={f.rank}>
          <ProjectCover name={coverName(Number(f.rank)-1)}/><div className="xl-work-shade"/><span className="xl-work-tag">{f.subTag}</span><span className="xl-work-rank">{f.rank}</span><div className="xl-work-caption"><small>{f.badge}</small><h3>{f.title}</h3><div><span>{f.tag}</span><button onClick={()=>navigate("new-project")} aria-label={`改编${f.title}`}>{i===0 ? "立即改编":"改编"}<ArrowUpRight size={16}/></button></div></div>
        </article>)}</div>:<div className="xl-empty">当前分类暂无作品<button onClick={()=>setCategory("全部")}>查看全部作品 <ArrowRight size={16}/></button></div>}
        <p className="xl-demo-note">示例封面 · 题材展示</p>
      </>:<div className="xl-empty"><h3>{featuredTab === "novel" ? "星推小说" : "明星角色"}</h3><p>{featuredTab === "novel" ? "从剧本导入或剧情解析开始，AI 自动拆解分镜。" : "角色与场景资产，延续你的故事风格。"}</p><button onClick={()=>navigate(featuredTab === "novel" ? "new-project":"assets")}>{featuredTab === "novel" ? "导入剧本":"查看角色资产"}<ArrowRight size={17}/></button></div>}
    </section>

    <LandingPricing navigate={navigate} />

    <footer className="xl-footer"><div className="xl-brand"><BrandLogo size={40}/><span>星核耀火Hub<small>Nova Tale Hub</small></span></div><span>© 2026 星核耀火Hub · 让创作更简单</span><button onClick={()=>navigate("register")}>免费注册 <ArrowUpRight size={16}/></button></footer>
    <FooterInformation />
    {offer&&<div className="xl-modal-backdrop" onClick={()=>setOffer(false)}><div className="xl-manual xl-offer-dialog" role="dialog" aria-modal="true" aria-labelledby="xl-offer-title" onClick={e=>e.stopPropagation()}><button ref={manualClose} className="xl-close" aria-label="关闭优惠说明" onClick={()=>setOffer(false)}><X size={20}/></button><span className="xl-banner-kicker">限时模型特惠</span><h2 id="xl-offer-title">Seedance 2.0<br/><strong>低至 7.5折</strong></h2><p>具体适用模型、规格及最终费用以生成确认页展示为准。</p><button className="xl-button xl-primary" onClick={()=>navigate("new-project")}>开始创作 <ArrowUpRight size={17}/></button></div></div>}
    {manual&&<div className="xl-modal-backdrop" onClick={()=>setManual(false)}><div className="xl-manual" role="dialog" aria-modal="true" aria-labelledby="xl-manual-title" onClick={e=>e.stopPropagation()}><button ref={manualClose} className="xl-close" aria-label="关闭使用手册" onClick={()=>setManual(false)}><X size={20}/></button><h2 id="xl-manual-title">使用手册</h2><h3>怎么开始创作？</h3><p>从剧本导入或剧情解析开始，AI 自动拆解分镜，批量生成视频素材。</p><h3>可以团队协作吗？</h3><p>支持多人团队，邀请成员、分配职能、共享项目和资产，协同更高效。</p><h3>费用如何查看？</h3><p>1元=10付费星石。实际任务价格由模型、规格和参数决定，生成前完整展示。</p></div></div>}
  </div>;
}
export default LandingPage;
