import { DismissiblePanel } from "@/components/ui";
import { ChevronRight, Headphones, MessageSquare, BookOpen, FileText } from "lucide-react";

export function HelpPopup({ onOpenService, onOpenFeedback, onClose }: {
  onOpenService: () => void;
  onOpenFeedback: () => void;
  onClose: () => void;
}) {
  return (
    <DismissiblePanel label="帮助中心" ownerId="help-trigger" onClose={onClose}
      backdropStyle={{ position: "fixed", inset: 0, zIndex: 198 }}
      contentStyle={{ position: "fixed", left: 72, bottom: 60, zIndex: 199, width: 280, background: "#111218", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.8)", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 2 }}>帮助中心</div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)" }}>遇到问题？我们来帮你</div>
        </div>
        <button onClick={() => { onClose(); onOpenService(); }}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "background .12s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.04)")}
          onMouseLeave={e => (e.currentTarget.style.background = "none")}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Headphones style={{ width: 16, height: 16, color: "#22C55E" } as React.CSSProperties} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.85)" }}>联系客服</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", marginTop: 1 }}>扫码添加专属客服微信</div>
          </div>
          <ChevronRight style={{ width: 14, height: 14, color: "rgba(255,255,255,.2)", marginLeft: "auto" } as React.CSSProperties} />
        </button>
        <div style={{ height: 1, background: "rgba(255,255,255,.05)", margin: "0 14px" }} />
        <button onClick={() => { onClose(); onOpenFeedback(); }}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "background .12s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.04)")}
          onMouseLeave={e => (e.currentTarget.style.background = "none")}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,138,31,.1)", border: "1px solid rgba(255,138,31,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <MessageSquare style={{ width: 16, height: 16, color: "rgba(255,138,31,.9)" } as React.CSSProperties} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.85)" }}>提交问题 · 申请反馈</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", marginTop: 1 }}>报告 Bug 或提交功能建议</div>
          </div>
          <ChevronRight style={{ width: 14, height: 14, color: "rgba(255,255,255,.2)", marginLeft: "auto" } as React.CSSProperties} />
        </button>
        <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,.06)" }}>
          <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "10px 0", background: "none", border: "none", cursor: "pointer", fontSize: 11.5, color: "rgba(255,255,255,.3)", transition: "color .12s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.6)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.3)")}>
            <BookOpen style={{ width: 12, height: 12 } as React.CSSProperties} />使用文档
          </button>
          <div style={{ width: 1, background: "rgba(255,255,255,.06)" }} />
          <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "10px 0", background: "none", border: "none", cursor: "pointer", fontSize: 11.5, color: "rgba(255,255,255,.3)", transition: "color .12s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.6)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.3)")}>
            <FileText style={{ width: 12, height: 12 } as React.CSSProperties} />更新日志
          </button>
        </div>
    </DismissiblePanel>
  );
}
