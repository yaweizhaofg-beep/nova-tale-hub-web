import { useState } from "react";
import { X, Loader2, FileText, Wand2, Check, Sparkles } from "lucide-react";
import { Dialog } from "@/components/ui";
import { Select } from "@/components/ui";
import { PROJECTS } from "@/features/assets/asset-mock";
import { useDeferredAction } from "@/hooks/use-deferred-action";
import { gold, bdr, dim, card, green } from "./presentation";

type ParsedAsset = { id: string; name: string; role: string; desc: string; count: number };

type GenOpts = { aspect: string; prefix: string; genCount: number };

const ASPECT_OPTIONS = [
  { v: "16:9",  label: "16:9 横屏",  hint: "1920×1080" },
  { v: "9:16",  label: "9:16 竖屏",  hint: "1080×1920" },
  { v: "1:1",   label: "1:1 方形",   hint: "1024×1024" },
  { v: "4:3",   label: "4:3 经典",   hint: "1440×1080" },
  { v: "3:4",   label: "3:4 竖版",   hint: "1080×1440" },
  { v: "2:3",   label: "2:3 海报",   hint: "1024×1536" },
];

const PREFIX_PRESETS = ["动漫写实", "赛博朋克", "柔光电影感", "国风水墨", "3D 皮克斯风"];

export function CreateAssetModal({ onClose, onParsed }: {
  onClose: () => void;
  onParsed: (assets: ParsedAsset[], opts: GenOpts) => void;
}) {
  const [step, onStep] = useState<"input" | "parsing" | "result">("input");
  const schedule = useDeferredAction();
  const [project, setProject]   = useState("p1");
  const [text, setText]         = useState("");
  const [file, setFile]         = useState<string | null>(null);
  const [err, setErr]           = useState("");
  const [parsed, setParsed]     = useState<ParsedAsset[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [model, setModel]       = useState("Flux 1.1 Pro");
  const [quality, setQuality]   = useState("高");
  const [res, setRes]           = useState("4K");
  const [generating, setGenerating] = useState(false);
  const [aspect, setAspect]     = useState("16:9");
  const [prefix, setPrefix]     = useState("");
  const [genCount, setGenCount] = useState(4);

  const doParse = () => {
    if (!text.trim() && !file) { setErr("请填写资产信息或上传文案文件"); return; }
    setErr("");
    onStep("parsing");
    // 演示解析：按行拆出角色
    schedule(() => {
      const lines = (text || "").split(/\n+/).map(l => l.trim()).filter(Boolean);
      const src = lines.length ? lines : ["陈默：女主角 · 内敛冷静 · 28岁", "林凯：男主角 · 温柔执着 · 30岁", "方远：反派 · 城府极深"];
      const list: ParsedAsset[] = src.slice(0, 12).map((l, i) => {
        const [n, ...rest] = l.split(/[:：]/);
        const name = (n || `角色 ${i + 1}`).trim().slice(0, 12);
        const desc = rest.join("：").trim() || "待补充设定";
        return { id: `pa${i}`, name, role: i === 0 ? "主角" : i < 3 ? "配角" : "配角", desc, count: genCount };
      });
      setParsed(list);
      setSelected(new Set(list.map(x => x.id)));
      onStep("result");
    }, 1400);
  };

  const toggle = (id: string) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const selCount = parsed.filter(x => selected.has(x.id)).length;
  const totalImages = parsed.filter(x => selected.has(x.id)).reduce((n, x) => n + (x.count || 0), 0);

  const setAssetCount = (id: string, v: number) => setParsed(prev =>
    prev.map(x => x.id === id ? { ...x, count: Math.max(1, Math.min(8, v)) } : x));

  const applyGlobalCount = (v: number) => {
    setGenCount(v);
    setParsed(prev => prev.map(x => ({ ...x, count: v })));
  };

  return (
    <Dialog label="新建资产" onClose={onClose}
      overlayStyle={{ position: "fixed", inset: 0, zIndex: 220, display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,.68)", backdropFilter: "blur(8px)" }}
      contentStyle={{ width: "min(680px, calc(100vw - 48px))", maxHeight: "calc(100vh - 80px)", display: "flex", flexDirection: "column",
          background: card, border: `1px solid ${bdr}`, borderRadius: 18,
          boxShadow: "0 30px 80px rgba(0,0,0,.6)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: `1px solid ${bdr}`, flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,138,31,.16)", border: "1px solid rgba(255,138,31,.3)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            {step === "result" ? <Wand2 style={{ width: 14, height: 14, color: gold }} /> : <Sparkles style={{ width: 14, height: 14, color: gold }} />}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>
              {step === "input" ? "新建资产" : step === "parsing" ? "AI 解析中" : "解析结果"}
            </div>
            <div style={{ fontSize: 11, color: dim }}>
              {step === "input" ? "喂入资产信息，AI 自动解析出角色资产" : step === "parsing" ? "正在识别角色与设定…" : `共解析出 ${parsed.length} 个资产，已选 ${selCount} 个`}
            </div>
          </div>
          {/* Steps */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            {(["input", "parsing", "result"] as const).map((k, i) => {
              const idx = ["input", "parsing", "result"].indexOf(step);
              const on = i <= idx;
              return (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9.5, fontWeight: 700,
                    background: on ? gold : "rgba(255,255,255,.07)", color: on ? "black" : "rgba(255,255,255,.4)" }}>
                    {i + 1}
                  </div>
                  {i < 2 && <div style={{ width: 14, height: 1, background: on ? gold : "rgba(255,255,255,.1)" }} />}
                </div>
              );
            })}
          </div>
          <button onClick={onClose}
            style={{ marginLeft: 12, width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(255,255,255,.05)",
              color: dim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 20px", overflowY: "auto" }}>

          {/* ── Step 1: 输入资产信息 ── */}
          {step === "input" && (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.6)", marginBottom: 6 }}>目标项目</div>
                <Select
                  label="所属剧目"
                  value={project}
                  onValueChange={value => setProject(value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 10, fontSize: 13,
                    background: "rgba(255,255,255,.04)", border: `1px solid ${bdr}`, color: "#F4F5F7", outline: "none" }}
                  options={PROJECTS.map(p => ({ value: p.id, label: p.name + " · " + p.genre }))}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.6)", marginBottom: 6 }}>资产信息文案</div>
                <textarea value={text} onChange={e => { setText(e.target.value); setErr(""); }}
                  rows={10}
                  placeholder={"每行一个角色，格式：角色名：外貌/性格/年龄/身份\n\n示例：\n陈默：女主角 · 内敛冷静 · 28岁 · 独立摄影师\n林凯：男主角 · 温柔执着 · 30岁 · 刑警"}
                  style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${bdr}`, borderRadius: 11,
                    padding: "12px 14px", fontSize: 12.5, color: "rgba(255,255,255,.85)", outline: "none",
                    resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.75, minHeight: 180 }}
                />
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.28)", textAlign: "right", marginTop: 4 }}>{text.length} 字</div>
              </div>

              {/* 生成尺寸 */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.6)", marginBottom: 7 }}>生成尺寸</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {ASPECT_OPTIONS.map(o => {
                    const on = aspect === o.v;
                    return (
                      <button key={o.v} onClick={() => setAspect(o.v)}
                        style={{ textAlign: "left", padding: "9px 11px", borderRadius: 10, cursor: "pointer",
                          background: on ? "rgba(255,138,31,.12)" : "rgba(255,255,255,.03)",
                          border: `1px solid ${on ? "rgba(255,138,31,.5)" : bdr}`,
                          boxShadow: on ? "0 0 0 1px rgba(255,138,31,.18) inset" : "none" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: on ? gold : "rgba(255,255,255,.8)" }}>{o.label}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,.32)", marginTop: 2 }}>{o.v} · {o.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 统一前置提示词 */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.6)" }}>统一前置提示词</div>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>风格 / 画质 / 镜头语言，将应用到本次全部资产</span>
                </div>
                <textarea value={prefix} onChange={e => setPrefix(e.target.value)}
                  rows={3}
                  placeholder={"示例：动漫写实风格，柔和顶光，干净背景，统一色调，高细节\n（留空则使用默认风格）"}
                  style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${bdr}`, borderRadius: 11,
                    padding: "11px 13px", fontSize: 12.5, color: "rgba(255,255,255,.85)", outline: "none",
                    resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.7, minHeight: 84 }}
                />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
                  {PREFIX_PRESETS.map(p2 => (
                    <button key={p2} onClick={() => setPrefix(prefix ? `${prefix}，${p2}` : p2)}
                      style={{ fontSize: 10.5, padding: "3px 9px", borderRadius: 20, cursor: "pointer",
                        background: "rgba(255,255,255,.05)", border: `1px solid ${bdr}`, color: "rgba(255,255,255,.6)" }}>
                      + {p2}
                    </button>
                  ))}
                </div>
              </div>

              <label style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 11, cursor: "pointer",
                border: `1.5px dashed ${file ? "rgba(255,138,31,.45)" : "rgba(255,255,255,.14)"}`,
                background: file ? "rgba(255,138,31,.06)" : "rgba(255,255,255,.02)",
              }}>
                <input type="file" hidden accept=".txt,.docx,.md,.pdf"
                  onChange={e => { setFile(e.target.files?.[0]?.name ?? null); setErr(""); }} />
                <FileText style={{ width: 16, height: 16, color: file ? gold : "rgba(255,255,255,.28)", flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: file ? "white" : "rgba(255,255,255,.7)" }}>
                    {file ?? "上传资产文案文件（可选）"}
                  </div>
                  <div style={{ fontSize: 11, color: dim, marginTop: 2 }}>支持 .txt · .docx · .md · .pdf</div>
                </div>
                {file && <Check style={{ width: 14, height: 14, color: green, flexShrink: 0 }} />}
              </label>

              {err && <div style={{ marginTop: 12, fontSize: 11.5, color: "#f87171" }}>{err}</div>}
            </>
          )}

          {/* ── Step 2: 解析中 ── */}
          {step === "parsing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "48px 20px" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,138,31,.14)", border: "1px solid rgba(255,138,31,.3)" }}>
                <Loader2 style={{ width: 20, height: 20, color: gold, animation: "spin 1s linear infinite" }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>AI 正在解析资产信息</div>
              <div style={{ fontSize: 12, color: dim, textAlign: "center", lineHeight: 1.7 }}>
                识别角色名称、身份定位、外貌特征与性格标签<br />预计需要几秒钟
              </div>
            </div>
          )}

          {/* ── Step 3: 解析结果 + 批量生成 ── */}
          {step === "result" && (
            <>
              {/* 批量生成设置 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 13px", marginBottom: 12, flexWrap: "wrap",
                background: "rgba(255,255,255,.03)", border: `1px solid ${bdr}`, borderRadius: 11 }}>
                <span style={{ fontSize: 11.5, color: dim, fontWeight: 600 }}>批量生成设置</span>
                <Select
                  label="生成模型"
                  value={model}
                  onValueChange={value => setModel(value)}
                  style={{ fontSize: 12, padding: "5px 9px", borderRadius: 8,
                  background: "rgba(255,255,255,.05)", border: `1px solid ${bdr}`, color: "#F4F5F7", outline: "none" }}
                  options={[{ value: "Flux 1.1 Pro", label: "Flux 1.1 Pro" }, { value: "SDXL Turbo", label: "SDXL Turbo" }, { value: "Stable Cascade", label: "Stable Cascade" }]}
                />
                <Select
                  label="画质"
                  value={quality}
                  onValueChange={value => setQuality(value)}
                  style={{ fontSize: 12, padding: "5px 9px", borderRadius: 8,
                  background: "rgba(255,255,255,.05)", border: `1px solid ${bdr}`, color: "#F4F5F7", outline: "none" }}
                  options={[{ value: "中", label: "中画质" }, { value: "高", label: "高画质" }]}
                />
                <Select
                  label="分辨率"
                  value={res}
                  onValueChange={value => setRes(value)}
                  style={{ fontSize: 12, padding: "5px 9px", borderRadius: 8,
                  background: "rgba(255,255,255,.05)", border: `1px solid ${bdr}`, color: "#F4F5F7", outline: "none" }}
                  options={[{ value: "2K", label: "2K" }, { value: "4K", label: "4K" }]}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11.5, color: dim, fontWeight: 600 }}>生成数量</span>
                  <Select
                    label="每项资产生成数量"
                    value={genCount}
                    onValueChange={value => applyGlobalCount(Number(value))}
                    style={{ fontSize: 12, padding: "5px 9px", borderRadius: 8,
                      background: "rgba(255,255,255,.05)", border: `1px solid ${bdr}`, color: "#F4F5F7", outline: "none" }}
                    options={[1, 2, 3, 4, 6, 8].map(n => ({ value: n, label: n + " 张 / 资产" }))}
                  />
                </div>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: dim }}>已选 {selCount} 个 · 共 {totalImages} 张</span>
              </div>

              {/* 解析结果列表 */}
              <div style={{ border: `1px solid ${bdr}`, borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,.03)",
                  borderBottom: `1px solid ${bdr}` }}>
                  <button onClick={() => setSelected(selected.size === parsed.length ? new Set() : new Set(parsed.map(x => x.id)))}
                    style={{ fontSize: 11.5, fontWeight: 600, color: gold, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    {selected.size === parsed.length && parsed.length > 0 ? "取消全选" : "全选"}
                  </button>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: dim }}>共 {parsed.length} 个角色资产</span>
                </div>
                {parsed.map((a, i) => {
                  const on = selected.has(a.id);
                  return (
                    <div key={a.id} onClick={() => toggle(a.id)}
                      style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", cursor: "pointer",
                        background: on ? "rgba(255,138,31,.05)" : "transparent",
                        borderBottom: i < parsed.length - 1 ? `1px solid ${bdr}` : "none" }}>
                      <div style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        background: on ? gold : "transparent", border: `1.5px solid ${on ? gold : "rgba(255,255,255,.2)"}` }}>
                        {on && <Check style={{ width: 10, height: 10, color: "black" }} />}
                      </div>
                      <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(255,138,31,.14)", border: "1px solid rgba(255,138,31,.24)", fontSize: 12, fontWeight: 700, color: gold }}>
                        {a.name.slice(0, 1)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: dim, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.desc}</div>
                      </div>
                      <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 20, flexShrink: 0,
                        background: "rgba(96,165,250,.12)", color: "#60a5fa" }}>{a.role}</span>
                      {/* 单个资产生成数量 */}
                      <div onClick={e => e.stopPropagation()}
                        style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
                          background: "rgba(255,255,255,.04)", border: `1px solid ${bdr}`, borderRadius: 8, padding: "2px 4px" }}>
                        <button onClick={() => setAssetCount(a.id, (a.count || 1) - 1)}
                          style={{ width: 18, height: 18, borderRadius: 5, border: "none", cursor: "pointer",
                            background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.7)", fontSize: 12, lineHeight: 1 }}>−</button>
                        <span style={{ minWidth: 20, textAlign: "center", fontSize: 11.5, fontWeight: 700, color: "white" }}>{a.count || 1}</span>
                        <button onClick={() => setAssetCount(a.id, (a.count || 1) + 1)}
                          style={{ width: 18, height: 18, borderRadius: 5, border: "none", cursor: "pointer",
                            background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.7)", fontSize: 12, lineHeight: 1 }}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: `1px solid ${bdr}`,
                fontSize: 11, color: dim, lineHeight: 1.65 }}>
                将为选中的 {selCount} 个角色资产生成三视图与参考图（共 {totalImages} 张），
                尺寸 {aspect}，前置提示词：{prefix.trim() || "（默认风格）"}，生成后可在资产列表中继续编辑。
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderTop: `1px solid ${bdr}`, flexShrink: 0 }}>
          {step === "result" ? (
            <>
              <button onClick={() => onStep("input")}
                style={{ padding: "10px 16px", borderRadius: 11, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: "rgba(255,255,255,.05)", border: `1px solid ${bdr}`, color: "rgba(255,255,255,.75)" }}>
                返回修改
              </button>
              <button onClick={onClose}
                style={{ padding: "10px 16px", borderRadius: 11, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: "transparent", border: `1px solid ${bdr}`, color: dim }}>
                取消
              </button>
              <button onClick={() => {
                const list = parsed.filter(x => selected.has(x.id));
                if (!list.length) return;
                setGenerating(true);
                schedule(() => { setGenerating(false); onParsed(list, { aspect, prefix: prefix.trim(), genCount }); onClose(); }, 1600);
              }} disabled={selCount === 0 || generating}
                style={{ flex: 1, padding: "10px", borderRadius: 11, fontSize: 13, fontWeight: 700, border: "none",
                  cursor: selCount === 0 || generating ? "not-allowed" : "pointer",
                  color: selCount === 0 || generating ? "rgba(255,255,255,.3)" : "black",
                  background: selCount === 0 || generating ? "rgba(255,255,255,.07)" : `linear-gradient(135deg,${gold},#FF6A1A)` }}>
                {generating
                  ? <><Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite", marginRight: 6 }} />生成中…</>
                  : `批量生成 ${selCount} 个资产`}
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose}
                style={{ flex: 1, padding: "10px", borderRadius: 11, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: "rgba(255,255,255,.05)", border: `1px solid ${bdr}`, color: "rgba(255,255,255,.75)" }}>
                取消
              </button>
              <button onClick={doParse}
                style={{ flex: 1, padding: "10px", borderRadius: 11, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
                  color: "black", background: `linear-gradient(135deg,${gold},#FF6A1A)`, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Wand2 style={{ width: 13, height: 13 }} />开始解析
              </button>
            </>
          )}
        </div>
    </Dialog>
  );
}
