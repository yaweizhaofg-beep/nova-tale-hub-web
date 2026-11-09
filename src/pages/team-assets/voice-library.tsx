import { Plus, Trash2, Mic2 } from "lucide-react";
import { gold, bdr, dim, card } from "./presentation";
import { SYS_VOICES, CUSTOM_VOICES } from "@/features/assets/asset-mock";

interface Props {
  openVoice: (name: string) => void;
  onCloneCustom: () => void;
}

export function VoiceLibrary({ openVoice, onCloneCustom }: Props) {
  return (
    <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>音色管理</div>
                      <div style={{ fontSize: 12, color: dim, marginTop: 2 }}>为项目角色分配或克隆专属音色</div>
                    </div>
                    <button onClick={() => openVoice("")}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10,
                        background: "rgba(255,255,255,.06)", border: `1px solid rgba(255,255,255,.1)`,
                        fontSize: 12, color: "rgba(255,255,255,.75)", cursor: "pointer" }}>
                      <Plus style={{ width: 12, height: 12 }} />克隆新音色
                    </button>
                  </div>

                  <div style={{ fontSize: 12, color: dim, fontWeight: 500, marginBottom: 8 }}>系统音色</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, marginBottom: 20 }}>
                    {SYS_VOICES.map(v => (
                      <div key={v.id}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12,
                          background: card, border: `1px solid ${bdr}`, transition: "border-color .12s" }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.15)")}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = bdr)}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                          background: v.gender === "女" ? "rgba(244,114,182,.12)" : "rgba(96,165,250,.12)" }}>
                          <Mic2 style={{ width: 16, height: 16, color: v.gender === "女" ? "#f472b6" : "#60a5fa" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: "white" }}>{v.name}</span>
                            <span style={{ fontSize: 10, color: dim, background: "rgba(255,255,255,.06)", padding: "1px 6px", borderRadius: 20 }}>{v.tag}</span>
                          </div>
                          <div style={{ fontSize: 11, color: dim }}>{v.gender} · {v.age} · {v.lang}</div>
                        </div>
                        <button onClick={() => openVoice(v.name)}
                          style={{ padding: "5px 11px", borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: "pointer", flexShrink: 0,
                            background: "rgba(255,138,31,.1)", border: "1px solid rgba(255,138,31,.25)", color: gold }}>
                          分配
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 12, color: dim, fontWeight: 500, marginBottom: 8 }}>自定义音色</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {CUSTOM_VOICES.map(v => (
                      <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12,
                        background: card, border: `1px solid ${bdr}` }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,138,31,.12)" }}>
                          <Mic2 style={{ width: 16, height: 16, color: gold }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "white", marginBottom: 2 }}>{v.name}</div>
                          <div style={{ fontSize: 11, color: dim }}>{v.gender} · {v.age} · {v.lang}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => openVoice(v.name)}
                            style={{ padding: "5px 11px", borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: "pointer",
                              background: "rgba(255,138,31,.1)", border: "1px solid rgba(255,138,31,.25)", color: gold }}>
                            分配
                          </button>
                          <button style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(255,255,255,.05)", border: `1px solid rgba(255,255,255,.1)`, cursor: "pointer", color: dim }}>
                            <Trash2 style={{ width: 11, height: 11 }} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button onClick={onCloneCustom}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px",
                        borderRadius: 12, border: "2px dashed rgba(255,255,255,.1)", background: "transparent",
                        color: dim, fontSize: 13, cursor: "pointer", transition: "all .15s" }}
                      onMouseEnter={e => { ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,138,31,.3)"); ((e.currentTarget as HTMLElement).style.color = gold); }}
                      onMouseLeave={e => { ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.1)"); ((e.currentTarget as HTMLElement).style.color = dim); }}>
                      <Plus style={{ width: 16, height: 16 }} />克隆新音色
                    </button>
                  </div>
                </div>
  );
}
