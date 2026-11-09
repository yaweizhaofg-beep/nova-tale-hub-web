import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Check, Gift, Sparkles } from "lucide-react";
import { colors } from "../shared";
import {
  PLANS, PLAN_PERIOD_DAYS, STARS_PER_YUAN, RECHARGE_VALID_DAYS, RECHARGE_PACKS,
  getWallet, subscribeWallet, creditRecharge, findPlan, canUpgrade, computeUpgrade,
} from "../billing";
import type { Plan, SpaceKind } from "../billing";
import { PrimaryBtn, GhostBtn, ModalShell, ModalHead, ModalFoot } from "./team/shared";
import "./membership.css";

type Order = {
  title: string; scope: SpaceKind; amount: number; stars: number; expiry: string; recharge: boolean;
};

const scopeName = (scope: SpaceKind) => scope === "team" ? "团队钱包" : "个人钱包";
const number = (value: number) => value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });

export default function MembershipPage({ currentSpace }: { currentSpace: SpaceKind }) {
  const [scope, setScope] = useState(currentSpace);
  const [amount, setAmount] = useState("199");
  const [order, setOrder] = useState<Order | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [, redraw] = useState(0);
  const paymentLock = useRef(false);
  useEffect(() => subscribeWallet(() => redraw(value => value + 1)), []);
  const wallet = getWallet(scope);
  const currentPlan = findPlan(wallet.planId);
  const active = wallet.planActive && new Date(wallet.planExpiresAt + "T23:59:59+08:00").getTime() > Date.now();
  const price = Number(amount);
  const cents = Math.round(price * 100);
  const validAmount = amount.trim() !== "" && Number.isFinite(price) && cents > 0 && Math.abs(price * 100 - cents) < 0.00001;
  const rechargeStars = cents / 100 * STARS_PER_YUAN;
  const plans = PLANS.filter(plan => plan.scope === scope);
  const openOrder = (next: Order) => {
    paymentLock.current = false; setAgreed(false); setNotice(""); setOrder(next);
  };
  const buyPlan = (plan: Plan) => {
    const upgrade = active && currentPlan && canUpgrade(currentPlan.id, plan.id)
      ? computeUpgrade(currentPlan, plan,
        Math.max(0, (new Date(wallet.planExpiresAt + "T23:59:59+08:00").getTime() - Date.now()) / 1000), wallet.planExpiresAt)
      : undefined;
    const start = active && currentPlan?.id === plan.id ? new Date(wallet.planExpiresAt + "T23:59:59+08:00").getTime() : Date.now();
    openOrder({
      title: upgrade ? `升级至${plan.name}` : `${active && currentPlan?.id === plan.id ? "续费" : "开通"}${plan.name}`,
      scope, amount: upgrade?.topUpAmount ?? plan.price, stars: upgrade?.topUpStars ?? plan.stars,
      expiry: upgrade ? wallet.planExpiresAt : new Date(start + PLAN_PERIOD_DAYS * 86400000).toLocaleDateString("sv-SE"),
      recharge: false,
    });
  };
  const confirm = () => {
    if (!order || !agreed || paymentLock.current) return;
    if (order.recharge && !active) return;
    paymentLock.current = true;
    if (order.recharge) creditRecharge(order.scope, order.stars);
    setNotice(order.recharge
      ? `充值演示完成，${scopeName(order.scope)}增加 ${number(order.stars)} 星石。会员到期日保持为 ${wallet.planExpiresAt}。`
      : `${order.title}的订单演示已确认。实付 ¥${order.amount.toFixed(2)}，到账 ${number(order.stars)} 星石，至 ${order.expiry}。套餐尚未实际开通。`);
    setOrder(null);
  };

  return (
    <section className="membership-page" style={{
      "--member-surface": colors.bgSurface, "--member-inset": colors.bgSecondary,
      "--member-ink": colors.textPrimary, "--member-muted": colors.textSecondary,
      "--member-border": colors.border, "--member-accent": colors.accent, "--member-selected": colors.accentDim,
    } as CSSProperties}>
      <header className="membership-heading">
        <div><h1>会员与积分</h1><p>选择适合你的创作套餐，按需补充星石</p></div>
        <span className="membership-badge">演示交易</span>
      </header>
      <div className="membership-scope" role="tablist" aria-label="会员类型">
        {(["personal", "team"] as const).map(value => <button key={value} role="tab" aria-selected={scope === value}
          onClick={() => { setScope(value); setOrder(null); setNotice(""); }}>
          {value === "personal" ? "个人会员" : "团队会员"}
        </button>)}
        <span>{scopeName(scope)} · 当前{currentPlan?.name ?? "未开通"} · {active ? `有效至 ${wallet.planExpiresAt}` : "已到期"}</span>
      </div>

      <div className="membership-plans">
        <article className="membership-card membership-trial">
          <Gift size={23} /><h2>免费体验</h2><div className="membership-price">¥0</div>
          <p>50 体验积分 · 每账号限领一次</p>
          <ul><li>1 人使用</li><li>最多同时运行 2 个任务</li><li>指定体验模型</li></ul>
          <GhostBtn onClick={() => setTrialOpen(true)}>查看体验权益</GhostBtn>
        </article>
        {plans.map(plan => {
          const current = wallet.planId === plan.id;
          const lower = active && !!currentPlan && currentPlan.price > plan.price;
          return <article className="membership-card" key={plan.id} data-current={current}>
            <div className="membership-card-title"><h2>{plan.name}</h2>{current && <span className="membership-badge">当前套餐</span>}</div>
            <div className="membership-price">¥{number(plan.price)}<small> / {PLAN_PERIOD_DAYS} 天</small></div>
            <p>{number(plan.stars)} 星石到账</p>
            <ul>
              <li><Check size={14} />{plan.seats} 人{scope === "team" ? "，含管理员" : "使用"}</li>
              <li><Check size={14} />{scope === "team" ? "全团队" : ""}最多同时运行 {plan.concurrencyPerSeat} 个任务</li>
              <li><Check size={14} />平台开放模型</li>
              <li><Check size={14} />{scope === "team" ? "项目素材共享，成员消耗可查" : "个人使用"}</li>
              <li><Check size={14} />默认永久保存 <button className="membership-text-link" onClick={() => setRulesOpen(true)}>查看规则*</button></li>
            </ul>
            <PrimaryBtn disabled={lower} onClick={() => buyPlan(plan)}>
              {lower ? "当前套餐等级较高" : active && current ? "续费套餐" : active && currentPlan && canUpgrade(currentPlan.id, plan.id) ? "升级套餐" : "开通套餐"}
            </PrimaryBtn>
          </article>;
        })}
      </div>

      <details className="membership-compare"><summary>展开完整套餐权益对比</summary>
        <div className="membership-table-scroll"><table>
          <thead><tr><th>权益</th><th>免费体验</th>{PLANS.map(plan => <th key={plan.id}>{plan.name}</th>)}</tr></thead>
          <tbody>
            <tr><th>价格 / 30天</th><td>¥0</td>{PLANS.map(plan => <td key={plan.id}>¥{number(plan.price)}</td>)}</tr>
            <tr><th>到账积分</th><td>50</td>{PLANS.map(plan => <td key={plan.id}>{number(plan.stars)}</td>)}</tr>
            <tr><th>使用人数</th><td>1 人</td>{PLANS.map(plan => <td key={plan.id}>{plan.seats} 人{plan.scope === "team" ? "，含管理员" : ""}</td>)}</tr>
            <tr><th>同时运行任务</th><td>最多 2 个</td>{PLANS.map(plan => <td key={plan.id}>{plan.scope === "team" ? "全团队" : ""}最多 {plan.concurrencyPerSeat} 个</td>)}</tr>
            <tr><th>可用模型</th><td>指定体验模型</td>{PLANS.map(plan => <td key={plan.id}>平台开放模型</td>)}</tr>
            <tr><th>团队协作</th><td>—</td>{PLANS.map(plan => <td key={plan.id}>{plan.scope === "team" ? "项目与素材共享" : "—"}</td>)}</tr>
            <tr><th>积分管理</th><td>个人使用</td>{PLANS.map(plan => <td key={plan.id}>{plan.scope === "team" ? "团队共享、成员消耗查看" : "个人使用"}</td>)}</tr>
            <tr><th>作品保存</th><td>适用作品保存规则</td>{PLANS.map(plan => <td key={plan.id}>默认永久保存*</td>)}</tr>
          </tbody>
        </table></div>
      </details>

      <section className="membership-recharge">
        <div><h2>积分不够？随时充值</h2><p>¥1 = {STARS_PER_YUAN} 星石 · 每笔有效 {RECHARGE_VALID_DAYS} 天 · 使用需有效付费会员</p></div>
        <div className="membership-recharge-options">
          {RECHARGE_PACKS.map(pack => <button key={pack.price} aria-pressed={amount === String(pack.price)} onClick={() => setAmount(String(pack.price))}>
            ¥{pack.price}<small>{number(pack.stars)} 星石</small>
          </button>)}
          <label>自定义金额（元）<input type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} /></label>
        </div>
        <div className="membership-recharge-footer">
          <span>充值至{scopeName(scope)} · 到账 <b>{validAmount ? number(rechargeStars) : "—"}</b> 星石</span>
          <PrimaryBtn disabled={!validAmount || !active} onClick={() => openOrder({
            title: "星石充值", scope, amount: cents / 100, stars: rechargeStars,
            expiry: new Date(Date.now() + RECHARGE_VALID_DAYS * 86400000).toLocaleDateString("sv-SE"), recharge: true,
          })}>确认充值</PrimaryBtn>
        </div>
        {!active && <p role="status">请先开通或续费当前空间会员。</p>}
      </section>

      <details className="membership-notices"><summary>购买须知与作品保存规则</summary>
        <ul>
          <li>套餐积分随本期会员到期，优先于充值积分使用。</li>
          <li>充值仅增加积分，会员到期时间保持原日期。</li>
          <li>团队共享积分和同时运行任务额度，高峰期任务可能排队。</li>
          <li>免费体验每账号限领一次，领取前展示可用模型与积分有效期。</li>
          <li>支持同类型套餐升级，按剩余时间补差价和积分，确认前展示具体金额。</li>
          <li>具体服务变动以官方通知为准。</li>
        </ul>
        <button className="membership-text-link" onClick={() => setRulesOpen(true)}>查看作品保存与合理使用规则</button>
      </details>
      {notice && <p className="membership-notice" role="status">{notice}</p>}

      {order && <ModalShell onClose={() => setOrder(null)} width={460}>
        <ModalHead title={order.title} sub="演示支付，不产生真实扣款" onClose={() => setOrder(null)} />
        <div className="membership-confirm">
          <dl><div><dt>目标钱包</dt><dd>{scopeName(order.scope)}</dd></div>
            <div><dt>支付金额</dt><dd>¥{order.amount.toFixed(2)}</dd></div>
            <div><dt>到账积分</dt><dd>{number(order.stars)} 星石</dd></div>
            <div><dt>{order.recharge ? "充值积分有效至" : "会员有效至"}</dt><dd>{order.expiry}</dd></div>
          </dl>
          {order.recharge && <p>充值后余额 {number(wallet.rechargeStars + order.stars)} 星石。会员仍于 {wallet.planExpiresAt} 到期。</p>}
          <p>默认永久保存，适用合理使用规则。异常使用经复核可能限制功能或清理文件，清理前提前 7 天、3 天及 1 天通知，并在项目中展示倒计时。</p>
          <label><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} />我已阅读购买须知和<button className="membership-text-link" onClick={() => setRulesOpen(true)}>作品保存规则</button></label>
        </div>
        <ModalFoot><GhostBtn onClick={() => setOrder(null)}>取消</GhostBtn><PrimaryBtn disabled={!agreed} onClick={confirm}>模拟支付 ¥{order.amount.toFixed(2)}</PrimaryBtn></ModalFoot>
      </ModalShell>}
      {rulesOpen && <ModalShell onClose={() => setRulesOpen(false)} width={520}>
        <ModalHead title="作品保存与合理使用规则" onClose={() => setRulesOpen(false)} />
        <div className="membership-confirm">
          <p>付费套餐默认永久保存作品，适用合理使用规则。</p>
          <p>达到用量阈值或出现异常使用行为，经复核可能限制功能或启动文件清理。平台将提前 7 天、剩余 3 天及 1 天通知，并在项目内展示倒计时。</p>
          <p>具体阈值与完整服务协议待正式发布，购买前请查看当时生效的规则。</p>
        </div><ModalFoot><GhostBtn onClick={() => setRulesOpen(false)}>我知道了</GhostBtn></ModalFoot>
      </ModalShell>}
      {trialOpen && <ModalShell onClose={() => setTrialOpen(false)} width={420}>
        <ModalHead title="免费体验" onClose={() => setTrialOpen(false)} />
        <div className="membership-confirm"><Sparkles color={colors.accent} /><h2>50 体验积分</h2><p>每账号限领一次，1 人使用，最多同时运行 2 个任务。</p><p>可用模型与积分有效期将在体验开放时展示。</p></div>
        <ModalFoot><GhostBtn onClick={() => setTrialOpen(false)}>关闭</GhostBtn><PrimaryBtn disabled>暂未开放领取</PrimaryBtn></ModalFoot>
      </ModalShell>}
    </section>
  );
}
