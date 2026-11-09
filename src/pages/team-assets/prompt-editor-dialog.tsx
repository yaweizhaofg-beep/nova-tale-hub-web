import layout from "./asset-layout.module.css";
import { X, Wand2 } from "lucide-react";
import { Dialog, Select } from "@/components/ui";
import { gold, dim, ddSel } from "./presentation";

interface Props {
  name: string;
  modalPrompt: string;
  setModalPrompt: (value: string) => void;
  modalRatio: string;
  setModalRatio: (value: string) => void;
  modalStyle: string;
  setModalStyle: (value: string) => void;
  onClose: () => void;
}

export function PromptEditorDialog({ name, modalPrompt, setModalPrompt, modalRatio, setModalRatio, modalStyle, setModalStyle, onClose }: Props) {
  return (
    <Dialog label="提示词编辑" onClose={onClose}
            overlayClassName={layout.promptOverlay}
            contentClassName={layout.promptPanel}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,.07)", flexShrink: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: gold }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{name} · 提示词编辑</span>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: dim }}>{modalPrompt.length} 字</span>
                <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, background: "rgba(255,138,31,.1)", border: "1px solid rgba(255,138,31,.28)", cursor: "pointer", color: gold, fontSize: 12, fontWeight: 600 }}>
                  <Wand2 style={{ width: 12, height: 12 }} />AI 改写
                </button>
                <button aria-label="关闭提示词编辑" onClick={onClose}
                  style={{ width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.55)", cursor: "pointer" }}>
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>
              <textarea value={modalPrompt} onChange={e => setModalPrompt(e.target.value)} data-ui-autofocus
                placeholder="在此输入或编辑生成提示词…"
                style={{ flex: 1, background: "transparent", border: "none", padding: "22px 26px", fontSize: 15, color: "rgba(255,255,255,.9)", outline: "none", resize: "none", lineHeight: 1.85, fontFamily: "inherit", boxSizing: "border-box" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 22px", borderTop: "1px solid rgba(255,255,255,.07)", flexShrink: 0 }}>
                <Select
                  label="画面比例"
                  value={modalRatio}
                  onValueChange={value => setModalRatio(value)}
                  style={{ ...ddSel, fontSize: 12 }}
                  options={["1:1", "4:3", "16:9", "3:4", "9:16"].map(r => ({ value: r, label: r }))}
                />
                <Select
                  label="画面风格"
                  value={modalStyle}
                  onValueChange={value => setModalStyle(value)}
                  style={{ ...ddSel, fontSize: 12 }}
                  options={["写实", "水墨", "3D渲染", "漫画"].map(s => ({ value: s, label: s }))}
                />
                <div style={{ flex: 1 }} />
                <button onClick={onClose}
                  style={{ padding: "8px 20px", borderRadius: 9, fontSize: 13, cursor: "pointer", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", color: dim }}>
                  取消
                </button>
                <button onClick={onClose}
                  style={{ padding: "8px 24px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", color: "black", border: "none",
                    background: `linear-gradient(135deg,${gold},#FF6A1A)` }}>
                  保存并关闭
                </button>
              </div>
          </Dialog>
  );
}
