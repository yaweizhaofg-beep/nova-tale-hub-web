import { useEffect, useRef, useState } from "react";
import { X, ImagePlus } from "lucide-react";
import { colors } from "../shared";
import { GhostBtn } from "../pages/team/shared";

import supportPortrait from "../assets/support-agent-v1.png";
import "./support-widget.css";

interface Screenshot { id: string; name: string; url: string }
interface Feedback { id: string; kind: string; text: string; contact: string; screenshots: Screenshot[]; page: string; time: string }

export default function SupportWidget({ requested, onHandled }: { requested: boolean; onHandled: () => void }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("问题反馈");
  const [text, setText] = useState("");
  const [contact, setContact] = useState("");
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [history, setHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const loading = useRef(false);
  useEffect(() => { if (requested) { setOpen(true); setHistory(false); onHandled(); } }, [requested, onHandled]);
  const inputStyle = { width: "100%", padding: 10, border: `1px solid ${colors.border}`, borderRadius: 8, background: colors.bgSecondary, color: colors.textPrimary, boxSizing: "border-box" as const };
  const attach = async (files: FileList | null) => {
    if (!files || loading.current) return;
    const chosen = [...files];
    if (screenshots.length + chosen.length > 5) { setMessage("最多添加 5 张截图"); return; }
    if (chosen.some(file => !["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setMessage("请选择 PNG、JPG 或 WebP 图片，每张不超过 5MB"); return;
    }
    loading.current = true; setBusy(true); setMessage("");
    try {
      const images = await Promise.all(chosen.map(file => new Promise<Screenshot>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("截图读取失败，请重新选择"));
        reader.onload = () => resolve({ id: crypto.randomUUID(), name: file.name, url: String(reader.result) });
        reader.readAsDataURL(file);
      })));
      setScreenshots(current => [...current, ...images]);
    } catch { setMessage("截图读取失败，请重新选择"); }
    finally { loading.current = false; setBusy(false); }
  };

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 180 }}>
      {open && <section id="support-feedback-panel" role="dialog" aria-label="客服与反馈" style={{
        position: "absolute", right: 0, bottom: 104, width: "min(380px, calc(100vw - 24px))",
        maxHeight: "calc(100dvh - 150px)", overflowY: "auto", background: colors.bgSurface, border: `1px solid ${colors.borderStrong}`,
        borderRadius: 14, padding: 18, boxSizing: "border-box", color: colors.textPrimary, boxShadow: "0 18px 60px rgba(0,0,0,.45)",
      }}>
        <header style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <img src={supportPortrait} alt="" style={{ width: 38, height: 38, objectFit: "cover", borderRadius: "50%", border: "1px solid rgba(255,150,70,.3)" }} /><div><strong style={{ fontSize: 15 }}>客服与反馈</strong><p style={{ margin: "3px 0 0", fontSize: 11, color: colors.textMuted }}>问题反馈 · 意见建议</p></div>
          <button aria-label="关闭客服" onClick={() => setOpen(false)} style={{ marginLeft: "auto", border: 0, background: "none", color: colors.textSecondary, cursor: "pointer" }}><X size={16} /></button>
        </header>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {["问题反馈", "意见建议"].map(label => <GhostBtn key={label} onClick={() => { setKind(label); setHistory(false); setMessage(""); }}>{label}</GhostBtn>)}
          <GhostBtn onClick={() => { setHistory(true); setMessage(""); }}>我的反馈</GhostBtn>
        </div>
        {history ? feedback.length === 0 ? <p style={{ fontSize: 12 }}>暂无反馈记录</p> : feedback.map(item => <article key={item.id} style={{ borderTop: `1px solid ${colors.border}`, paddingBlock: 12, fontSize: 12 }}>
          <strong>{item.kind}</strong><p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{item.text}</p><small>{item.time} · 本地演示记录</small>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>{item.screenshots.map(image => <a key={image.id} href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={image.name} style={{ width: 70, height: 52, objectFit: "cover", borderRadius: 6 }} /></a>)}</div>
        </article>) : <form onSubmit={event => {
          event.preventDefault(); if (!text.trim() || loading.current) return;
          setFeedback(current => [{ id: crypto.randomUUID(), kind, text: text.trim(), contact: contact.trim(), screenshots: [...screenshots], page: window.location.search, time: new Date().toLocaleString("zh-CN") }, ...current]);
          setText(""); setScreenshots([]); setMessage("反馈已保存为本地演示记录，可在「我的反馈」查看。客服服务尚未接入。");
        }} style={{ display: "grid", gap: 12 }}>
          <label style={{ fontSize: 12 }}>{kind}<textarea aria-label="反馈内容" maxLength={3000} rows={5} style={{ ...inputStyle, display: "block", resize: "vertical", marginTop: 6 }} placeholder="描述遇到的问题或你的建议" value={text} onChange={event => setText(event.target.value)} /></label>
          <label style={{ fontSize: 12 }}>联系方式（选填）<input aria-label="联系方式" maxLength={100} style={{ ...inputStyle, marginTop: 6 }} placeholder="邮箱或手机号" value={contact} onChange={event => setContact(event.target.value)} /></label>
          <label style={{ fontSize: 12, color: colors.textSecondary, cursor: "pointer" }}><ImagePlus size={14} /> 添加截图（{screenshots.length}/5）
            <input aria-label="上传截图" type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy} style={{ display: "block", marginTop: 8, width: "100%" }}
              onChange={event => { void attach(event.target.files); event.target.value = ""; }} />
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{screenshots.map(image => <div key={image.id} style={{ position: "relative" }}>
            <img src={image.url} alt={image.name} style={{ width: 80, height: 64, objectFit: "cover", borderRadius: 6 }} />
            <button type="button" aria-label={`删除截图 ${image.name}`} disabled={busy} onClick={() => setScreenshots(current => current.filter(item => item.id !== image.id))} style={{ position: "absolute", right: 0, top: 0, cursor: "pointer" }}>×</button>
          </div>)}</div>
          <small style={{ color: colors.textMuted }}>PNG / JPG / WebP，每张不超过 5MB</small>
          <button type="submit" disabled={!text.trim() || busy} className="btn-primary" style={{ padding: 10, border: 0, borderRadius: 9, cursor: "pointer", opacity: !text.trim() || busy ? .5 : 1 }}>
            {busy ? "正在读取截图…" : "提交反馈"}
          </button>
        </form>}
        {message && <p role="status" style={{ fontSize: 12, lineHeight: 1.7, color: colors.textSecondary }}>{message}</p>}
      </section>}
      <button className="support-avatar-button" onClick={() => setOpen(value => !value)} title="客服与反馈" aria-label="客服与反馈" aria-expanded={open} aria-controls="support-feedback-panel">
        <span className="support-avatar-frame"><img src={supportPortrait} alt="女性客服形象" draggable={false}/></span>
        <span className="support-avatar-caption">客服</span>
      </button>
    </div>
  );
}
