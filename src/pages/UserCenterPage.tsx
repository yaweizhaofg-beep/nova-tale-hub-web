import { useState } from "react";
import { USER, TEAM_MEMBERS_INIT, TEAM_OWNER_ID, colors } from "../shared";
import type { Nav } from "../shared";
import { findPlan, getWallet } from "../billing";
import type { SpaceKind } from "../billing";
import { getInvoiceRequests } from "../invoices";
import type { InvoiceRequest } from "../invoices";
import { Panel, PrimaryBtn, GhostBtn, ModalShell, ModalHead, ModalFoot } from "./team/shared";
import "./user-center.css";

let contactPhone = "";

export default function UserCenterPage({ navigate, currentSpace }: Nav & { currentSpace: SpaceKind }) {
  const [tab, setTab] = useState("账号信息");
  const [nickname, setNickname] = useState(USER.name);
  const [phone, setPhone] = useState(contactPhone);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [invoice, setInvoice] = useState<InvoiceRequest | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState("all");
  const account = TEAM_MEMBERS_INIT.find(member => member.id === TEAM_OWNER_ID)?.account ?? "";
  const wallet = getWallet(currentSpace);
  const plan = findPlan(wallet.planId);
  const invoices = getInvoiceRequests(currentSpace).filter(item => invoiceStatus === "all" || item.status === invoiceStatus);
  const inputStyle = { border: `1px solid ${colors.border}`, background: colors.bgSecondary, color: colors.textPrimary, borderRadius: 8, padding: 10, width: "100%", boxSizing: "border-box" as const };
  const save = () => {
    if (!nickname.trim()) { setNotice("请填写昵称"); return; }
    if (phone.trim() && !/^[+\d()\s-]{6,25}$/.test(phone.trim())) { setNotice("请填写有效联系电话"); return; }
    USER.name = nickname.trim();
    contactPhone = phone.trim();
    setEditing(false); setNotice("资料已保存（当前演示会话）");
  };

  return (
    <section className="user-center-page" style={{ color: colors.textPrimary }}>
      <header className="user-center-heading"><h1>个人中心</h1><GhostBtn onClick={() => navigate("workspace")}>返回工作台</GhostBtn></header>
      <div className="user-center-tabs" role="tablist" aria-label="个人中心">
        {["账号信息", "积分充值", "我的发票", "安全设置"].map(label => <button key={label}
          role="tab" aria-selected={tab === label} onClick={() => { setTab(label); setNotice(""); }}>{label}</button>)}
      </div>
      {tab === "账号信息" && <Panel title="账号信息" extra={!editing ? <GhostBtn onClick={() => setEditing(true)}>编辑资料</GhostBtn> : undefined}>
        <div className="user-center-content">
          <div className="user-profile-identity"><span>{USER.avatar}</span><div><h2>{USER.name}</h2><p>{account || "暂无账号信息"}</p></div></div>
          <div className="user-profile-fields">
            <label>昵称{editing ? <input aria-label="昵称" maxLength={32} style={inputStyle} value={nickname} onChange={event => setNickname(event.target.value)} /> : <strong>{USER.name}</strong>}</label>
            <label>账号<strong>{account || "暂无记录"}</strong></label>
            <label>邮箱<strong>{account.includes("@") ? account : "未绑定"}</strong></label>
            <label>联系电话{editing ? <input aria-label="联系电话" type="tel" style={inputStyle} value={phone} onChange={event => setPhone(event.target.value)} placeholder="选填" /> : <strong>{contactPhone || "未填写"}</strong>}</label>
            <label>当前会员<strong>{plan?.name ?? "未开通"}</strong></label>
            <label>会员有效期<strong>{wallet.planExpiresAt || "—"}</strong></label>
            {currentSpace === "team" && <label>所属团队<strong>{USER.team}</strong></label>}
          </div>
          {editing && <div className="user-center-actions"><GhostBtn onClick={() => { setEditing(false); setNickname(USER.name); setPhone(contactPhone); setNotice(""); }}>取消</GhostBtn><PrimaryBtn onClick={save}>保存资料</PrimaryBtn></div>}
        </div>
      </Panel>}
      {tab === "积分充值" && <Panel title="积分充值">
        <div className="user-center-content"><p>{currentSpace === "team" ? "团队钱包" : "个人钱包"} · 付费星石 {wallet.rechargeStars.toLocaleString()}</p>
          <p>¥1 = 10 星石，每笔充值积分有效 365 天。</p>
          <PrimaryBtn onClick={() => navigate("membership")}>前往会员积分充值</PrimaryBtn>
        </div>
      </Panel>}
      {tab === "我的发票" && <Panel title="我的发票" extra={<GhostBtn onClick={() => navigate("billing")}>申请开票</GhostBtn>}>
        <div className="user-center-content">
          <label>开票状态 <select aria-label="开票状态" value={invoiceStatus} onChange={event => setInvoiceStatus(event.target.value)} style={{ ...inputStyle, width: 140 }}>
            <option value="all">全部状态</option><option value="待开具">待开具</option>
          </select></label>
          <div className="invoice-table-scroll"><table>
            <thead><tr>{["申请时间", "发票抬头", "金额", "状态", "操作"].map(label => <th key={label}>{label}</th>)}</tr></thead>
            <tbody>{invoices.length === 0 ? <tr><td colSpan={5}>暂无发票申请，可在账单中选择订单申请开票。</td></tr> :
              invoices.map(item => <tr key={item.id}><td>{item.createdAt}</td><td>{item.title}</td><td>¥{item.amount.toFixed(2)}</td><td>{item.status}</td><td><GhostBtn onClick={() => setInvoice(item)}>查看详情</GhostBtn></td></tr>)}
            </tbody>
          </table></div>
          <p>发票申请为当前会话演示，实际开票服务尚未接入。</p>
        </div>
      </Panel>}
      {tab === "安全设置" && <Panel title="安全设置"><div className="user-center-content">
        <div className="user-profile-fields"><label>账号邮箱<strong>{account.includes("@") ? account : "未绑定"}</strong></label><label>联系电话<strong>{contactPhone || "未填写"}</strong></label></div>
        <p>联系电话仅作为联系资料。密码修改、手机验证和邮箱绑定需接入账号服务后开放。</p>
      </div></Panel>}
      {notice && <p role="status">{notice}</p>}
      {invoice && <ModalShell onClose={() => setInvoice(null)} width={480}>
        <ModalHead title="发票申请详情" onClose={() => setInvoice(null)} />
        <div className="user-center-content"><p>抬头　{invoice.title}</p><p>金额　¥{invoice.amount.toFixed(2)}</p><p>接收邮箱　{invoice.email}</p><p>状态　{invoice.status}</p><p>申请时间　{invoice.createdAt}</p>
          <p>关联订单</p>{invoice.orderIds.map(id => <p key={id}>{id}</p>)}
        </div><ModalFoot><GhostBtn onClick={() => setInvoice(null)}>关闭</GhostBtn></ModalFoot>
      </ModalShell>}
    </section>
  );
}
