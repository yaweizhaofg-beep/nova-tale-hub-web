import { useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, Film, Sparkles, Users } from "lucide-react";
import type { Nav } from "@/router/page-location";
import ProjectCover from "@/components/ProjectCover";
import { FEATURED_ITEMS, CATEGORIES } from "./content";

export function FeaturedWorks({ navigate }: Nav) {
  const [featuredTab, setFeaturedTab] = useState("hot");
  const [category, setCategory] = useState("全部");
  const visibleWorks = FEATURED_ITEMS.filter(item => category === "全部" || item.subTag.includes(category) ||
    (category === "古装古风" && /古装|仙侠|玄幻|武侠/.test(item.subTag)) ||
    (category === "逆袭爽剧" && /逆袭|爽剧/.test(item.subTag)) ||
    (category === "国内精选" && !item.subTag.includes("国外")));
  const coverName = (i: number) => ["镜像", "归途", "星坠", "制作画布"][i % 4];
  return (
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
  );
}
