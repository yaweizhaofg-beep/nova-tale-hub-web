import { DismissiblePanel } from "@/components/ui";
import { useLocation } from "react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, History, ImagePlus, MessageSquare, Send, Sparkles, X } from "lucide-react";

import supportPortrait from "../assets/support-agent-v1.png";
import { useSupportPlacement } from "./use-support-placement";
import "./support-widget.css";

interface Screenshot { id: string; name: string; url: string }
const feedbackKinds = ["问题反馈", "意见建议"] as const;
type FeedbackKind = (typeof feedbackKinds)[number];
interface Feedback {
  id: string;
  kind: FeedbackKind;
  text: string;
  contact: string;
  screenshots: Screenshot[];
  page: string;
  time: string;
}

const attachmentLimit = 5;
const textLimit = 3000;

export default function SupportWidget({ requested, onHandled }: { requested: boolean; onHandled: () => void }) {
  const { search } = useLocation();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("问题反馈");
  const [text, setText] = useState("");
  const [contact, setContact] = useState("");
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [history, setHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const loading = useRef(false);
  const togglePanel = () => setOpen(value => !value);
  const { buttonRef, dragging, suppressClick, anchorStyle, panelStyle, pointerHandlers } = useSupportPlacement(togglePanel);

  useEffect(() => {
    if (!requested) return;
    setOpen(true);
    setHistory(false);
    onHandled();
  }, [requested, onHandled]);

  const attach = async (files: FileList | null) => {
    if (!files?.length || loading.current) return;
    const chosen = [...files];
    if (screenshots.length + chosen.length > attachmentLimit) {
      setMessage("最多添加 5 张截图");
      return;
    }
    if (chosen.some(file => !["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setMessage("请选择 PNG、JPG 或 WebP 图片，每张不超过 5MB");
      return;
    }
    loading.current = true;
    setBusy(true);
    setMessage("");
    try {
      const images = await Promise.all(chosen.map(file => new Promise<Screenshot>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("截图读取失败，请重新选择"));
        reader.onload = () => resolve({ id: crypto.randomUUID(), name: file.name, url: String(reader.result) });
        reader.readAsDataURL(file);
      })));
      setScreenshots(current => [...current, ...images]);
    } catch {
      setMessage("截图读取失败，请重新选择");
    } finally {
      loading.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="support-widget" style={anchorStyle}>
      {open && <DismissiblePanel id="support-feedback-panel" label="客服与反馈" ownerId="support-feedback-trigger"
        dismissOnOutside={false} onClose={() => setOpen(false)} contentClassName="support-feedback-panel" contentStyle={panelStyle}>
        <header className="support-feedback-header">
          <img src={supportPortrait} alt="" className="support-feedback-portrait" />
          <div className="support-feedback-intro">
            <strong>客服与反馈</strong>
            <p>分享遇到的问题和改进建议</p>
          </div>
          <button type="button" className="support-icon-button" aria-label="关闭客服" onClick={() => setOpen(false)}><X size={16} /></button>
        </header>

        <div className="support-feedback-body">
          <div className="support-feedback-switch" role="group" aria-label="反馈类型">
            {feedbackKinds.map((label, index) => {
              const Icon = index === 0 ? MessageSquare : Sparkles;
              return <button type="button" key={label} aria-pressed={!history && kind === label}
                onClick={() => { setKind(label); setHistory(false); setMessage(""); }}>
                <Icon size={14} aria-hidden />{label}
              </button>;
            })}
            <button type="button" aria-pressed={history} onClick={() => { setHistory(true); setMessage(""); }}>
              <History size={14} aria-hidden />我的反馈
            </button>
          </div>

          {history ? (
            <div className="support-feedback-history">
              {feedback.length === 0 ? (
                <div className="support-feedback-empty">
                  <History size={22} aria-hidden />
                  <strong>暂无反馈记录</strong>
                  <p>提交后可在这里查看记录。</p>
                </div>
              ) : feedback.map(item => (
                <article key={item.id} className="support-feedback-record">
                  <header><strong>{item.kind}</strong><small>{item.time}</small></header>
                  <p>{item.text}</p>
                  <small>本地演示记录</small>
                  {item.screenshots.length > 0 && <div className="support-feedback-thumbnails">
                    {item.screenshots.map(image => (
                      <a key={image.id} href={image.url} target="_blank" rel="noreferrer" title={image.name}>
                        <img src={image.url} alt={image.name} />
                      </a>
                    ))}
                  </div>}
                </article>
              ))}
            </div>
          ) : (
            <form className="support-feedback-form" onSubmit={event => {
              event.preventDefault();
              if (!text.trim() || loading.current) return;
              setFeedback(current => [{
                id: crypto.randomUUID(), kind, text: text.trim(), contact: contact.trim(),
                screenshots: [...screenshots], page: search, time: new Date().toLocaleString("zh-CN"),
              }, ...current]);
              setText("");
              setScreenshots([]);
              setMessage("反馈已保存为本地演示记录，可在「我的反馈」查看。客服服务尚未接入。");
            }}>
              <label className="support-feedback-field">
                <span>反馈内容 <small>{text.length}/{textLimit}</small></span>
                <textarea aria-label="反馈内容" maxLength={textLimit} rows={4} required
                  placeholder="描述遇到的问题或你希望改进的地方" value={text} onChange={event => setText(event.target.value)} />
              </label>
              <label className="support-feedback-field">
                <span>联系方式 <small>选填</small></span>
                <input aria-label="联系方式" maxLength={100} placeholder="邮箱或手机号"
                  value={contact} onChange={event => setContact(event.target.value)} />
              </label>
              <div>
                <label className="support-feedback-upload" data-disabled={busy}>
                  <span className="support-feedback-upload-icon"><ImagePlus size={17} aria-hidden /></span>
                  <span><strong>添加截图</strong><small>PNG / JPG / WebP，每张不超过 5MB</small></span>
                  <span className="support-feedback-upload-count">{screenshots.length}/{attachmentLimit} <ArrowUpRight size={13} aria-hidden /></span>
                  <input aria-label="上传截图" type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy}
                    onChange={event => { void attach(event.target.files); event.target.value = ""; }} />
                </label>
                {screenshots.length > 0 && <div className="support-feedback-thumbnails">
                  {screenshots.map(image => (
                    <div key={image.id}>
                      <img src={image.url} alt={image.name} />
                      <button type="button" aria-label={"删除截图 " + image.name} disabled={busy}
                        onClick={() => setScreenshots(current => current.filter(item => item.id !== image.id))}><X size={13} /></button>
                    </div>
                  ))}
                </div>}
              </div>
              <button type="submit" className="support-feedback-submit" disabled={!text.trim() || busy}>
                <Send size={15} aria-hidden />{busy ? "正在读取截图…" : "提交反馈"}
              </button>
            </form>
          )}
          {message && <p role="status" className="support-feedback-message">{message}</p>}
        </div>
      </DismissiblePanel>}

      <button ref={buttonRef} id="support-feedback-trigger" type="button" className="support-avatar-button"
        data-dragging={dragging} title="点击打开客服，按住可拖动" aria-label="客服与反馈"
        aria-expanded={open} aria-controls={open ? "support-feedback-panel" : undefined}
        {...pointerHandlers} onClick={event => {
          const fromPointer = event.detail > 0 || (event.nativeEvent instanceof PointerEvent && !!event.nativeEvent.pointerType);
          if (fromPointer && suppressClick.current) return;
          togglePanel();
        }}>
        <span className="support-avatar-frame"><img src={supportPortrait} alt="" draggable={false} /></span>
        <span className="support-avatar-caption">客服</span>
      </button>
    </div>
  );
}
