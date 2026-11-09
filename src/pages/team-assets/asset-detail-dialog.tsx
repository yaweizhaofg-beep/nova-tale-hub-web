import layout from "./asset-layout.module.css";
import { X, Plus, ImageIcon, Wand2, Check } from "lucide-react";
import { Dialog } from "@/components/ui";
import { gold, bdr, dim, green, imgBg, STATUS_CFG } from "./presentation";
import { useState, type Dispatch, type SetStateAction } from "react";
import type { AssetItem, AssetTab, CostumeVersion, DView } from "@/features/assets/asset-types";
import { PromptEditorDialog } from "./prompt-editor-dialog";

interface Props {
  selItem: AssetItem;
  assetTab: AssetTab;
  costumes: CostumeVersion[];
  setCostumes: Dispatch<SetStateAction<CostumeVersion[]>>;
  costumeEditId: string | null;
  setCostumeEditId: (id: string | null) => void;
  modalRatio: string;
  setModalRatio: (value: string) => void;
  modalStyle: string;
  setModalStyle: (value: string) => void;
  onClose: () => void;
}

export function AssetDetailDialog({ selItem, assetTab, costumes, setCostumes, costumeEditId, setCostumeEditId, modalRatio, setModalRatio, modalStyle, setModalStyle, onClose }: Props) {
  const [dView, setDView] = useState<DView>("front");
  const [histIdx, setHistIdx] = useState(0);
  const [modalPrompt, setModalPrompt] = useState(selItem.desc ? selItem.name + "：" + selItem.desc : selItem.name);
  const [modalRemark, setModalRemark] = useState("");
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);
  return (
    <>
<Dialog label="资产详情" onClose={onClose}
            overlayClassName={layout.detailOverlay}
            contentClassName={layout.detailPanel}>

              {/* Close */}
              <button aria-label="关闭资产详情" onClick={onClose}
                style={{ position: "absolute", top: 14, right: 14, zIndex: 20, width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.55)", cursor: "pointer" }}>
                <X style={{ width: 14, height: 14 }} />
              </button>

              {/* Left: image column */}
              <div style={{ width: "46%", flexShrink: 0, background: imgBg, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: 0 }}>
                  {selItem.image && <img src={selItem.image} alt={selItem.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                  {selItem.imageStyle && !selItem.image && <div style={{ width: "100%", height: "100%", background: selItem.imageStyle }} />}
                  {!selItem.image && !selItem.imageStyle && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <ImageIcon style={{ width: 36, height: 36, color: "rgba(255,255,255,.12)" }} />
                      <span style={{ fontSize: 13, color: dim }}>暂无图像</span>
                    </div>
                  )}
                  <div style={{ position: "absolute", top: 12, left: 12, zIndex: 2, background: "rgba(0,0,0,.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, padding: "3px 10px", fontSize: 11, color: "rgba(255,255,255,.8)", fontWeight: 500 }}>
                    当前主图
                  </div>
                  {(selItem.image || selItem.imageStyle) && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 55%,rgba(9,10,14,.85) 100%)", pointerEvents: "none" }} />}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 18px", zIndex: 3 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "white", letterSpacing: "-0.02em", textShadow: "0 2px 12px rgba(0,0,0,.8)" }}>{selItem.name}</div>
                    <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)", marginTop: 3 }}>{selItem.desc || "（暂无描述）"}</div>
                  </div>
                </div>

                {/* History strip */}
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: "rgba(0,0,0,.3)", borderTop: "1px solid rgba(255,255,255,.06)", overflowX: "auto" }}>
                  <span style={{ fontSize: 11, color: dim, flexShrink: 0 }}>历史</span>
                  {(selItem.historyImages ?? []).length > 0
                    ? (selItem.historyImages ?? []).map((src, i) => (
                        <button key={i} onClick={() => setHistIdx(i)}
                          style={{ flexShrink: 0, padding: 0, background: "none", border: `2px solid ${histIdx === i ? gold : "rgba(255,255,255,.14)"}`, borderRadius: 8, overflow: "hidden", cursor: "pointer", transition: "border-color .12s", width: 80, height: 52 }}>
                          <img src={src} alt={`历史${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </button>
                      ))
                    : <span style={{ fontSize: 11, color: "rgba(255,255,255,.2)" }}>暂无历史版本</span>}
                </div>
              </div>

              {/* Right: detail panel */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", minHeight: 0 }}>
                  {/* Status + count */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: STATUS_CFG[selItem.status].bg, color: STATUS_CFG[selItem.status].color, border: `1px solid ${STATUS_CFG[selItem.status].border}`, fontWeight: 600 }}>
                      {STATUS_CFG[selItem.status].label}
                    </span>
                    <span style={{ fontSize: 12, color: dim }}>使用次数：<span style={{ color: gold, fontWeight: 700 }}>{selItem.count}</span></span>
                  </div>

                  {/* View tabs */}
                  <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                    {([
                      { k: "front" as DView, l: "正面" },
                      { k: "side" as DView, l: "侧面" },
                      { k: "back" as DView, l: "背面" },
                      { k: "outfit" as DView, l: "服装" },
                      { k: "detail" as DView, l: "细节" },
                    ]).map(v => (
                      <button key={v.k} onClick={() => setDView(v.k)}
                        style={{ padding: "5px 13px", borderRadius: 8, fontSize: 12, fontWeight: dView === v.k ? 600 : 400,
                          background: dView === v.k ? `${gold}15` : "rgba(255,255,255,.04)",
                          border: `1px solid ${dView === v.k ? "rgba(255,138,31,.3)" : "rgba(255,255,255,.08)"}`,
                          color: dView === v.k ? gold : dim, cursor: "pointer" }}>
                        {v.l}
                      </button>
                    ))}
                  </div>

                  {/* Prompt */}
                  <div style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${bdr}`, borderRadius: 11, padding: "12px 14px", marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: dim, marginBottom: 5, fontWeight: 600 }}>生成提示词</div>
                    <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.8)", lineHeight: 1.7 }}>{modalPrompt}</div>
                  </div>
                  <button onClick={() => setPromptEditorOpen(true)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "rgba(255,138,31,.1)", border: "1px solid rgba(255,138,31,.28)", color: gold, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>
                    <Wand2 style={{ width: 11, height: 11 }} />打开提示词编辑器
                  </button>

                  {/* Costume versions (角色特有) */}
                  {assetTab === "chars" && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: dim, fontWeight: 600 }}>造型版本</span>
                        <span style={{ marginLeft: "auto", fontSize: 10.5, color: "rgba(255,255,255,.28)" }}>
                          {costumes.length} 个造型
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {costumes.map(v => {
                          const editing = costumeEditId === v.id;
                          return (
                            <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8,
                              background: editing ? "rgba(255,138,31,.1)" : "rgba(255,255,255,.04)",
                              border: `1px solid ${editing ? "rgba(255,138,31,.35)" : bdr}` }}>
                              <Check style={{ width: 10, height: 10, color: green, flexShrink: 0 }} />
                              <button onClick={() => setCostumeEditId(editing ? null : v.id)}
                                style={{ fontSize: 12, color: editing ? gold : "rgba(255,255,255,.8)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                {v.name}
                              </button>
                              <button onClick={() => setCostumes(prev => prev.filter(c => c.id !== v.id))}
                                title="删除"
                                style={{ display: "flex", alignItems: "center", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                                <X style={{ width: 10, height: 10, color: "rgba(255,255,255,.3)" }} />
                              </button>
                            </div>
                          );
                        })}
                        <button
                          onClick={() => {
                            const id = `cv${Date.now()}`;
                            setCostumes(prev => [...prev, { id, name: "新造型", prompt: "" }]);
                            setCostumeEditId(id);
                          }}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", color: dim, fontSize: 12, cursor: "pointer" }}>
                          <Plus style={{ width: 10, height: 10 }} />新增
                        </button>
                      </div>

                      {/* 编辑区：名称 + 提示词 */}
                      {costumeEditId && (() => {
                        const c = costumes.find(x => x.id === costumeEditId);
                        if (!c) return null;
                        return (
                          <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 11,
                            background: "rgba(255,255,255,.03)", border: `1px solid ${bdr}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                              <span style={{ fontSize: 11, color: dim, fontWeight: 600 }}>造型名称</span>
                              <input
                                value={c.name}
                                onChange={e => setCostumes(prev => prev.map(x => x.id === c.id ? { ...x, name: e.target.value } : x))}
                                placeholder="如：雨夜追杀"
                                style={{ flex: 1, padding: "6px 10px", borderRadius: 8, fontSize: 12.5,
                                  background: "rgba(255,255,255,.05)", border: `1px solid ${bdr}`,
                                  color: "#F4F5F7", outline: "none" }}
                              />
                              <button onClick={() => setCostumeEditId(null)}
                                style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                                  background: "rgba(255,138,31,.12)", border: "1px solid rgba(255,138,31,.3)", color: gold }}>
                                完成
                              </button>
                            </div>
                            <div style={{ fontSize: 11, color: dim, fontWeight: 600, marginBottom: 5 }}>提示词</div>
                            <textarea
                              value={c.prompt}
                              onChange={e => setCostumes(prev => prev.map(x => x.id === c.id ? { ...x, prompt: e.target.value } : x))}
                              rows={8}
                              placeholder="描述该造型的服装、发型、表情、场景、光线等…"
                              style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${bdr}`, borderRadius: 9,
                                padding: "11px 13px", fontSize: 12.5, color: "rgba(255,255,255,.85)", outline: "none",
                                resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.7, minHeight: 150 }}
                            />
                            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.28)", textAlign: "right", marginTop: 4 }}>
                              {c.prompt.length} 字
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Remark */}
                  <div>
                    <div style={{ fontSize: 11, color: dim, fontWeight: 600, marginBottom: 5 }}>备注</div>
                    <textarea value={modalRemark} onChange={e => setModalRemark(e.target.value)} rows={6} placeholder="添加备注信息…"
                      style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${bdr}`, borderRadius: 9, padding: "10px 12px", fontSize: 12.5, color: "rgba(255,255,255,.8)", outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.7, minHeight: 110 }} />
                  </div>
                </div>

                {/* Footer actions */}
                <div style={{ padding: "14px 20px", borderTop: `1px solid ${bdr}`, display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
                  <button onClick={onClose}
                    style={{ padding: "8px 18px", borderRadius: 9, fontSize: 13, cursor: "pointer", background: "rgba(255,255,255,.06)", border: `1px solid ${bdr}`, color: dim }}>
                    取消
                  </button>
                  <button onClick={onClose}
                    style={{ padding: "8px 20px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", color: "black", border: "none",
                      background: `linear-gradient(135deg,${gold},#FF6A1A)` }}>
                    保存
                  </button>
                </div>
              </div>
          </Dialog>
    {promptEditorOpen && <PromptEditorDialog name={selItem.name} modalPrompt={modalPrompt} setModalPrompt={setModalPrompt}
      modalRatio={modalRatio} setModalRatio={setModalRatio} modalStyle={modalStyle} setModalStyle={setModalStyle} onClose={() => setPromptEditorOpen(false)} />}
    </>
  );
}
