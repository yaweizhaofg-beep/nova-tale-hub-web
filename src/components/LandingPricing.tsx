import { ArrowUpRight } from "lucide-react";
import { PLANS } from "../billing";
import type { Nav } from "../shared";
const notes = [
  "套餐积分随本期会员到期，优先于充值积分使用。",
  "充值仅增加积分，会员到期时间保持原日期。",
  "团队成员共享积分及同时运行任务额度，高峰期任务可能排队。",
  "免费体验每账号限领一次，领取时展示可用模型与积分有效期。",
  "支持同类型套餐升级，按剩余时间补差价和积分，支付前展示具体金额。",
  "具体服务变动以官方通知为准。",
];
export default function LandingPricing({navigate}:Nav) {
  return <section id="plans" className="xl-section xl-pricing">
    <div className="xl-section-heading"><div><h2>选择创作能量等级</h2><p>个人独立创作 · 或组建团队规模生产 · 团队钱包独立不串账</p></div></div>
    <div className="xl-comparison-scroll" tabIndex={0} role="region" aria-label="五档套餐权益对比，可横向滚动">
      <table className="xl-comparison"><caption className="xl-visually-hidden">免费体验、个人创作版、个人专业版、工作室版、制作团队版套餐对比</caption>
        <thead><tr><th scope="col">套餐权益</th><th scope="col"><span>免费体验</span><small>先体验，再创作</small></th>{PLANS.map(p=><th scope="col" key={p.id}><span>{p.name}</span><small>{p.scope==="team"?"团队协作":"独立创作"}</small></th>)}</tr></thead>
        <tbody>
          <tr className="xl-comparison-price"><th scope="row">价格</th><td>¥0</td>{PLANS.map(p=><td key={p.id}>¥{p.price.toLocaleString()}<small> / 30天</small></td>)}</tr>
          <tr><th scope="row">到账积分</th><td>50 体验积分</td>{PLANS.map(p=><td key={p.id}>{p.stars.toLocaleString()} 积分</td>)}</tr>
          <tr><th scope="row">使用人数</th><td>1 人</td>{PLANS.map(p=><td key={p.id}>{p.seats} 人{p.scope==="team"?"，含管理员":""}</td>)}</tr>
          <tr><th scope="row">同时运行任务</th><td>最多 2 个</td>{PLANS.map(p=><td key={p.id}>{p.scope==="team"?"全团队":""}最多 {p.concurrencyPerSeat} 个</td>)}</tr>
          <tr><th scope="row">可用模型</th><td>指定体验模型</td>{PLANS.map(p=><td key={p.id}>平台开放模型</td>)}</tr>
          <tr><th scope="row">团队协作</th><td>—</td>{PLANS.map(p=><td key={p.id}>{p.scope==="team"?"项目与素材共享":"—"}</td>)}</tr>
          <tr><th scope="row">积分管理</th><td>个人使用</td>{PLANS.map(p=><td key={p.id}>{p.scope==="team"?"团队共享、成员消耗查看":"个人使用"}</td>)}</tr>
          <tr><th scope="row">作品保存</th><td>适用作品保存规则</td>{PLANS.map(p=><td key={p.id}>默认永久保存*</td>)}</tr>
          <tr className="xl-comparison-actions"><th scope="row"><span className="xl-visually-hidden">选择套餐</span></th><td><button onClick={()=>navigate("membership",{scope:"personal"})}>免费体验 <ArrowUpRight size={14}/></button></td>{PLANS.map(p=><td key={p.id}><button onClick={()=>navigate("membership",{scope:p.scope})}>选择套餐 <ArrowUpRight size={14}/></button></td>)}</tr>
        </tbody>
      </table>
    </div>
    <div className="xl-price-notes"><div className="xl-recharge-note"><div><h3>积分不够？随时充值</h3><p><strong>¥1=10 积分</strong>，支持自定义金额。充值积分每笔有效 365 天，使用需有效付费会员。</p></div><button onClick={()=>navigate("membership")}>积分充值 <ArrowUpRight size={16}/></button></div><h3>购买须知</h3><ul>{notes.map(note=><li key={note}>{note}</li>)}</ul></div>
  </section>;
}
