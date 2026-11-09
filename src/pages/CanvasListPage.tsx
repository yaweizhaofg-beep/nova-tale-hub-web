import { useState } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { getCanvases, createCanvas } from "../canvases";
import type { Nav } from "../shared";
import ProjectCover from "../components/ProjectCover";
import { colors } from "../shared";
import type { SpaceKind } from "../billing";
import { ModalShell, ModalHead, ModalFoot, PrimaryBtn, GhostBtn } from "./team/shared";

export default function CanvasListPage({ navigate, scope }: Nav & { scope: SpaceKind }) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(() => new URLSearchParams(window.location.search).get("create") === "1");
  const [name, setName] = useState("");
  const canvases = getCanvases(scope).filter(canvas => canvas.name.toLowerCase().includes(query.trim().toLowerCase()));
  const inputStyle = { width: "100%", maxWidth: 360, padding: "9px 12px", borderRadius: 8, boxSizing: "border-box" as const, border: `1px solid ${colors.border}`, background: colors.bgSurface, color: colors.textPrimary };
  return (
    <section style={{ padding: "24px 28px", color: colors.textPrimary }}>
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <GhostBtn onClick={() => navigate("workspace")}><ChevronLeft size={14} />工作台</GhostBtn>
        <h1 style={{ fontSize: 20, margin: 0 }}>全部画布</h1>
        <span style={{ fontSize: 12, color: colors.textMuted }}>共 {canvases.length} 个</span>
        <PrimaryBtn onClick={() => setCreating(true)} style={{ marginLeft: "auto" }}><Plus size={14} />新建画布</PrimaryBtn>
      </header>
      <input aria-label="搜索画布" placeholder="搜索画布" value={query} onChange={event => setQuery(event.target.value)} style={inputStyle} />
      <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
        {canvases.length === 0 && <p style={{ color: colors.textMuted }}>没有匹配的画布</p>}
        {canvases.map(canvas => <button key={canvas.id}
          onClick={() => navigate("canvas", { canvas: canvas.id, kind: null, create: null })}
          style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14, textAlign: "left", cursor: "pointer", padding: 18, borderRadius: 10, color: colors.textPrimary, border: `1px solid ${colors.border}`, background: colors.bgSurface }}>
          <span style={{ width: 44, height: 60, position: "relative", overflow: "hidden", borderRadius: 6, flexShrink: 0 }}>
            <ProjectCover name={canvas.name} />
          </span>
          <span style={{ flex: "1 1 180px" }}><strong style={{ fontSize: 14 }}>{canvas.name}</strong>
            <small style={{ display: "block", color: colors.textMuted, marginTop: 6 }}>{canvas.nodes} 节点 · {canvas.edges} 连线</small></span>
          <span style={{ fontSize: 12, color: colors.textMuted }}>更新于 {canvas.updated}</span>
        </button>)}
      </div>
      {creating && <ModalShell onClose={() => setCreating(false)} width={420}>
        <ModalHead title="新建画布" onClose={() => setCreating(false)} />
        <div style={{ padding: 20 }}><label>画布名称<input autoFocus aria-label="画布名称" maxLength={80} style={{ ...inputStyle, display: "block", marginTop: 10 }}
          value={name} onChange={event => setName(event.target.value)} placeholder="输入画布名称" /></label></div>
        <ModalFoot><GhostBtn onClick={() => setCreating(false)}>取消</GhostBtn>
          <PrimaryBtn disabled={!name.trim()} onClick={() => {
            const canvas = createCanvas(scope, name);
            navigate("canvas", { canvas: canvas.id, kind: null, create: null });
          }}>创建画布</PrimaryBtn></ModalFoot>
      </ModalShell>}
    </section>
  );
}
