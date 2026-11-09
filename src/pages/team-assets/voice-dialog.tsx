import layout from "./asset-layout.module.css";
import { X, Plus, Mic2, Check } from "lucide-react";
import { Dialog } from "@/components/ui";
import { gold, bdr, dim } from "./presentation";
import { SYS_VOICES, CUSTOM_VOICES } from "@/features/assets/asset-mock";
import { useState } from "react";
import type { VGender, VAge, VTb } from "@/features/assets/asset-types";

interface Props {
  voiceTarget: string;
  cloneCustom: boolean;
  cvGender: VGender;
  setCvGender: (value: VGender) => void;
  cvAge: VAge;
  setCvAge: (value: VAge) => void;
  onClose: () => void;
}

export function VoiceDialog({ voiceTarget, cloneCustom, cvGender, setCvGender, cvAge, setCvAge, onClose }: Props) {
  const [voiceTab, setVoiceTab] = useState<VTb>(cloneCustom ? "custom" : "system");
  const [selVoice, setSelVoice] = useState<string | null>(null);
  const [voiceCreating, setVoiceCreating] = useState(cloneCustom);
  const [cvName, setCvName] = useState("");
  return (
    <Dialog label="配置音色" onClose={onClose}
            overlayClassName={layout.voiceOverlay}
            contentClassName={layout.voicePanel}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "white", margin: 0 }}>配置音色</h3>
                  <div style={{ fontSize: 12, color: dim, marginTop: 2 }}>{voiceTarget || "音色管理"}</div>
                </div>
                <button aria-label="关闭音色配置" onClick={onClose} style={{ background: "none", border: "none", color: dim, cursor: "pointer", display: "flex" }}>
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 6 }}>
                {(["system", "custom"] as VTb[]).map(vt => (
                  <button key={vt} onClick={() => { setVoiceTab(vt); setVoiceCreating(false); setSelVoice(null); }}
                    style={{ flex: 1, padding: "8px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer",
                      background: voiceTab === vt ? "rgba(255,138,31,.12)" : "rgba(255,255,255,.05)",
                      border: `1px solid ${voiceTab === vt ? "rgba(255,138,31,.35)" : "rgba(255,255,255,.1)"}`,
                      color: voiceTab === vt ? gold : "rgba(255,255,255,.5)" }}>
                    {vt === "system" ? "系统音色" : "自定义音色"}
                  </button>
                ))}
              </div>

              {/* System voices */}
              {voiceTab === "system" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {SYS_VOICES.map(v => (
                    <button key={v.id} onClick={() => setSelVoice(v.id)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                        background: selVoice === v.id ? "rgba(255,138,31,.08)" : "rgba(255,255,255,.04)",
                        border: `1px solid ${selVoice === v.id ? "rgba(255,138,31,.3)" : "rgba(255,255,255,.08)"}` }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: v.gender === "女" ? "rgba(244,114,182,.15)" : "rgba(96,165,250,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Mic2 style={{ width: 16, height: 16, color: v.gender === "女" ? "#f472b6" : "#60a5fa" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: "white" }}>{v.name}</span>
                          <span style={{ fontSize: 10.5, color: dim, background: "rgba(255,255,255,.06)", padding: "1px 7px", borderRadius: 20 }}>{v.tag}</span>
                        </div>
                        <div style={{ fontSize: 11, color: dim }}>{v.gender} · {v.age} · {v.lang}</div>
                      </div>
                      {selVoice === v.id && <Check style={{ width: 14, height: 14, color: gold, flexShrink: 0 }} />}
                    </button>
                  ))}
                </div>
              )}

              {/* Custom voices list */}
              {voiceTab === "custom" && !voiceCreating && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {CUSTOM_VOICES.map(v => (
                    <button key={v.id} onClick={() => setSelVoice(v.id)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                        background: selVoice === v.id ? "rgba(255,138,31,.08)" : "rgba(255,255,255,.04)",
                        border: `1px solid ${selVoice === v.id ? "rgba(255,138,31,.3)" : "rgba(255,255,255,.08)"}` }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,138,31,.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Mic2 style={{ width: 16, height: 16, color: gold }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "white", marginBottom: 3 }}>{v.name}</div>
                        <div style={{ fontSize: 11, color: dim }}>{v.gender} · {v.age} · {v.lang}</div>
                      </div>
                      {selVoice === v.id && <Check style={{ width: 14, height: 14, color: gold, flexShrink: 0 }} />}
                    </button>
                  ))}
                  <button onClick={() => setVoiceCreating(true)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "2px dashed rgba(255,255,255,.1)", color: dim, fontSize: 13, cursor: "pointer" }}>
                    <Plus style={{ width: 14, height: 14 }} />克隆新音色
                  </button>
                </div>
              )}

              {/* Clone new voice form */}
              {voiceTab === "custom" && voiceCreating && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input value={cvName} onChange={e => setCvName(e.target.value)} placeholder="音色名称"
                    style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "9px 12px", fontSize: 13, color: "white", outline: "none" }} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                    {(["男", "女"] as VGender[]).map(g => (
                      <button key={g} onClick={() => setCvGender(g)}
                        style={{ flex: 1, padding: "7px", borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: "pointer",
                          background: cvGender === g ? "rgba(255,138,31,.12)" : "rgba(255,255,255,.05)",
                          border: `1px solid ${cvGender === g ? "rgba(255,138,31,.35)" : "rgba(255,255,255,.1)"}`,
                          color: cvGender === g ? gold : "rgba(255,255,255,.5)" }}>
                        {g}
                      </button>
                    ))}
                    {(["儿童", "少年", "青年", "中年", "老年"] as VAge[]).map(a => (
                      <button key={a} onClick={() => setCvAge(a)}
                        style={{ flex: 1, padding: "7px", borderRadius: 9, fontSize: 11, fontWeight: 500, cursor: "pointer",
                          background: cvAge === a ? "rgba(255,138,31,.12)" : "rgba(255,255,255,.05)",
                          border: `1px solid ${cvAge === a ? "rgba(255,138,31,.35)" : "rgba(255,255,255,.1)"}`,
                          color: cvAge === a ? gold : "rgba(255,255,255,.5)" }}>
                        {a}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => setVoiceCreating(false)}
                      style={{ padding: "8px 16px", borderRadius: 9, fontSize: 13, cursor: "pointer", background: "rgba(255,255,255,.05)", border: `1px solid ${bdr}`, color: dim }}>
                      取消
                    </button>
                    <button disabled={!cvName.trim()}
                      style={{ padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: cvName.trim() ? "pointer" : "not-allowed",
                        background: cvName.trim() ? `linear-gradient(135deg,${gold},#FF6A1A)` : "rgba(255,138,31,.3)",
                        border: "none", color: "white", opacity: cvName.trim() ? 1 : 0.5 }}>
                      开始克隆（演示）
                    </button>
                  </div>
                </div>
              )}
          </Dialog>
  );
}
