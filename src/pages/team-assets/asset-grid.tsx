import layout from "./asset-layout.module.css";
import { Plus, Download, Trash2, PenLine, Mic2, ImageIcon, AlertTriangle, Loader2, Check } from "lucide-react";
import { gold, bdr, dim, card, imgBg, compCfg, statusToComp } from "./presentation";
import type { AssetItem, AssetTab } from "@/features/assets/asset-types";

interface Props {
  visibleItems: AssetItem[];
  selectedIds: ReadonlySet<string>;
  assetTab: AssetTab;
  toggleSel: (id: string) => void;
  onOpen: (item: AssetItem) => void;
  openVoice: (name: string) => void;
  onDelete: (item: AssetItem) => void;
}

export function AssetGrid({ visibleItems, selectedIds, assetTab, toggleSel, onOpen, openVoice, onDelete }: Props) {
  return (
    <div className={layout.grid}>
                  {visibleItems.map(item => {
                    const comp = statusToComp(item.status);
                    const cc = compCfg[comp];
                    const hasImg = !!(item.image || item.imageStyle);
                    const isSel = selectedIds.has(item.id);

                    return (
                      <div key={item.id}
                        style={{ border: `1px solid ${isSel ? "rgba(255,138,31,.5)" : bdr}`, borderRadius: 14, overflow: "hidden", cursor: "pointer",
                          transition: "border-color .15s,box-shadow .15s", position: "relative", background: card,
                          boxShadow: isSel ? "0 0 0 2px rgba(255,138,31,.2)" : "none" }}
                        onMouseEnter={e => { if (!isSel) ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,138,31,.35)"); }}
                        onMouseLeave={e => { if (!isSel) ((e.currentTarget as HTMLElement).style.borderColor = bdr); }}>

                        {/* 16:9 image */}
                        <div style={{ aspectRatio: "16/9", position: "relative", overflow: "hidden", background: imgBg }}
                          onClick={() => {
                            if (selectedIds.size > 0) toggleSel(item.id);
                            else { onOpen(item); }
                          }}>
                          {item.image && <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                          {item.imageStyle && !item.image && <div style={{ width: "100%", height: "100%", background: item.imageStyle }} />}
                          {!hasImg && comp === "generating" && (
                            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                              <div style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid rgba(96,165,250,.2)", borderTopColor: "#60a5fa", animation: "spin 1s linear infinite" }} />
                              <span style={{ fontSize: 11, color: "#60a5fa", fontWeight: 500 }}>AI 生成中</span>
                            </div>
                          )}
                          {!hasImg && comp === "failed" && (
                            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                              <AlertTriangle style={{ width: 14, height: 14, color: "#f87171" }} />
                              <span style={{ fontSize: 11, color: "#f87171", fontWeight: 500 }}>生成失败</span>
                            </div>
                          )}
                          {!hasImg && comp === "empty" && (
                            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                              <ImageIcon style={{ width: 18, height: 18, color: "rgba(255,255,255,.18)" }} />
                              <span style={{ fontSize: 10, color: dim }}>暂无图像</span>
                            </div>
                          )}
                          {hasImg && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(9,10,14,.9) 0%,transparent 60%)", pointerEvents: "none" }} />}

                          {/* Checkbox */}
                          <div onClick={e => { e.stopPropagation(); toggleSel(item.id); }}
                            style={{ position: "absolute", top: 8, left: 8, zIndex: 3, width: 18, height: 18, borderRadius: 5,
                              border: `1.5px solid ${isSel ? gold : "rgba(255,255,255,.5)"}`,
                              background: isSel ? "rgba(255,138,31,.25)" : "rgba(0,0,0,.45)",
                              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .12s" }}>
                            {isSel && <Check style={{ width: 10, height: 10, color: gold }} />}
                          </div>

                          {/* Status badge */}
                          <div style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: cc.bg, color: cc.c, border: `1px solid ${cc.border}`, display: "inline-flex", alignItems: "center", gap: 3 }}>
                              {comp === "generating" && <Loader2 style={{ width: 8, height: 8 }} />}
                              {cc.text}
                            </span>
                          </div>
                        </div>

                        {/* Card footer */}
                        <div style={{ padding: "10px 14px 12px", display: "flex", alignItems: "center", gap: 8 }}
                          onClick={() => {
                            if (selectedIds.size > 0) toggleSel(item.id);
                            else { onOpen(item); }
                          }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                            <div style={{ fontSize: 11, color: dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{item.desc || "（暂无描述）"}</div>
                          </div>
                          {/* Action buttons */}
                          <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            <button title="编辑" onClick={() => { onOpen(item); }}
                              style={{ width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,138,31,.08)", border: "1px solid rgba(255,138,31,.2)", cursor: "pointer", color: "rgba(255,138,31,.7)" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = gold; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,138,31,.45)"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,138,31,.7)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,138,31,.2)"; }}>
                              <PenLine style={{ width: 11, height: 11 }} />
                            </button>
                            {assetTab === "chars" && (
                              <button title="配置音色" onClick={() => openVoice(item.name)}
                                style={{ width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.06)", border: `1px solid rgba(255,255,255,.1)`, cursor: "pointer", color: dim }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f472b6"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,114,182,.35)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = dim; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.1)"; }}>
                                <Mic2 style={{ width: 11, height: 11 }} />
                              </button>
                            )}
                            <button title="下载" style={{ width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.06)", border: `1px solid rgba(255,255,255,.1)`, cursor: "pointer", color: dim }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "white"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = dim; }}>
                              <Download style={{ width: 11, height: 11 }} />
                            </button>
                            <button title="删除" onClick={() => onDelete(item)}
                              style={{ width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.06)", border: `1px solid rgba(255,255,255,.1)`, cursor: "pointer", color: dim }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(248,113,113,.3)"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = dim; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.1)"; }}>
                              <Trash2 style={{ width: 11, height: 11 }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add new */}
                  <button
                    style={{ border: `2px dashed rgba(255,255,255,.1)`, borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", minHeight: 140, background: "transparent", transition: "all .15s", color: dim }}
                    onMouseEnter={e => { ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,138,31,.3)"); ((e.currentTarget as HTMLElement).style.color = gold); }}
                    onMouseLeave={e => { ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.1)"); ((e.currentTarget as HTMLElement).style.color = dim); }}>
                    <Plus style={{ width: 20, height: 20 }} />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>新增{({ chars: "角色", scenes: "场景", props: "道具", audio: "声音配置" } as Record<AssetTab, string>)[assetTab]}</span>
                  </button>
                </div>
  );
}
