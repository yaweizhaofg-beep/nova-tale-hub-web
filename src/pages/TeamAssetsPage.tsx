import { ProjectPermissions } from "./team-assets/project-permissions";
import { AssetProjectList } from "./team-assets/asset-project-list";
import { AssetBatchActions } from "./team-assets/asset-batch-actions";
import { AssetGrid } from "./team-assets/asset-grid";
import { AssetToolbar } from "./team-assets/asset-toolbar";
import { VoiceLibrary } from "./team-assets/voice-library";
import { VoiceDialog } from "./team-assets/voice-dialog";
import { AssetDetailDialog } from "./team-assets/asset-detail-dialog";
import { ASSET_DATA, DEFAULT_COSTUMES, PROJECTS, TEAM_MEMBERS } from "@/features/assets/asset-mock";
import type { AssetTab, AssetItem, CostumeVersion, VGender, VAge } from "@/features/assets/asset-types";
import { CreateAssetModal } from "./team-assets/create-asset-modal";
import { ImportAssetModal } from "./team-assets/import-asset-modal";
import { dim } from "./team-assets/presentation";
import { useProjectSelection } from "@/features/assets/use-project-selection";
import { Dialog } from "@/components/ui";
// ═══════════════════════════════════════════════════════════════════════════════════
// TeamAssetsPage — 对齐 Figma Make TeamAssetsPage（App.tsx 内联源码）
// 两级视图：无 selProj → 项目卡片列表；有 selProj → 资产详情
// 包含：权限管理、声音配置、详情弹窗、提示词编辑器、批量操作、删除确认
// ═══════════════════════════════════════════════════════════════════════════════════

import { useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, Trash2 } from "lucide-react";
import type { PageId } from "../shared";

// ═══ Design tokens ════════════════════════════════════════════════════════════
// ═══ Types ════════════════════════════════════════════════════════════════════
interface Props { navigate: (p: PageId) => void; from?: string; initialSelProj?: string; }

// ═══ Static data ════════════════════════════════════════════════════════════
export default function TeamAssetsPage({ navigate, from, initialSelProj }: Props) {
  const [selProj,      setSelProj]      = useState<string | null>(initialSelProj ?? null);
  const [assetTab,     setAssetTab]     = useState<AssetTab>("chars");
  const [permOpen,     setPermOpen]     = useState<string | null>(null);
  const [visibility,   setVisibility]   = useState<Record<string, Set<string>>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deletedIds, setDeletedIds] = useProjectSelection(selProj);
  const [selItem,      setSelItem]      = useState<AssetItem | null>(null);
  const [selectedIds, setSelectedIds] = useProjectSelection(selProj ? selProj + "/" + assetTab : null);
  const [genModel,     setGenModel]     = useState("Flux 1.1 Pro");
  const [genQuality,   setGenQuality]   = useState("高");
  const [genRes,       setGenRes]       = useState("4K");
  const [modalRatio,   setModalRatio]   = useState("16:9");
  const [modalStyle,   setModalStyle]   = useState("写实");
  const [importAssetOpen, setImportAssetOpen] = useState(false);
  const [projects,        setProjects]        = useState(PROJECTS);
  const [assetData,       setAssetData]       = useState(ASSET_DATA);
  const importedUrls = useRef(new Set<string>());
  useLayoutEffect(() => {
    const urls = importedUrls.current;
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);
  const [newAssetOpen,    setNewAssetOpen]    = useState(false);
  const [projAssetOpen,   setProjAssetOpen]   = useState(false);
  const [costumes,      setCostumes]      = useState<CostumeVersion[]>(DEFAULT_COSTUMES);
  const [costumeEditId, setCostumeEditId] = useState<string | null>(null);
  const [cvGender,      setCvGender]     = useState<VGender>("女");
  const [cvAge,         setCvAge]       = useState<VAge>("青年");

  const toggleSel     = (id: string)  => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll     = (ids: string[]) => setSelectedIds(prev => ids.every(id => prev.has(id)) ? new Set() : new Set(ids));
  const getProjVisible = (projId: string) => visibility[projId] ?? new Set(TEAM_MEMBERS.map(m => m.id));
  const toggleMember  = (projId: string, uid: string) => {
    setVisibility(prev => {
      const cur = new Set(prev[projId] ?? TEAM_MEMBERS.map(m => m.id));
      cur.has(uid) ? cur.delete(uid) : cur.add(uid);
      return { ...prev, [projId]: cur };
    });
  };

  const [voiceDialog, setVoiceDialog] = useState<{ name: string; cloneCustom: boolean } | null>(null);
  const openVoice = (name: string) => setVoiceDialog({ name, cloneCustom: false });

  // ═══ Shared modals (rendered in both list & detail views) ═══════════════════
  const modals = (
    <>
      {/* 列表页：新建资产 → 解析后创建新项目 */}
      {newAssetOpen && !selProj && <CreateAssetModal
        onClose={() => setNewAssetOpen(false)}
        onParsed={(list, opts) => {
          const id = `p${Date.now()}`;
          const colors = ["#FF8A1F", "#a855f7", "#06b6d4", "#10b981", "#ec4899"];
          const color = colors[projects.length % colors.length];
          setProjects(prev => [...prev, {
            id, name: list[0]?.name ?? "新建资产", genre: "新建资产", color,
            date: new Date().toISOString().slice(0, 10),
            chars: list.length, scenes: 0, props: 0, audioReady: false, status: "draft",
          }]);
          setAssetData(prev => ({
            ...prev,
            [id]: {
              chars: list.map((a, i) => ({
                id: `${id}c${i + 1}`, name: a.name, desc: a.desc,
                status: "generating" as const, count: a.count || opts.genCount,
                aspect: opts.aspect, prefix: opts.prefix,
              })),
              scenes: [], props: [], audio: [],
            },
          }));
          setSelProj(id);
          setAssetTab("chars");
        }}
      />}

      {importAssetOpen && selProj && <ImportAssetModal key={selProj}
        onClose={() => setImportAssetOpen(false)}
        onCreate={(name, images) => {
          images.forEach(image => importedUrls.current.add(image.url));
          setAssetData(prev => ({
            ...prev,
            [selProj]: {
              ...(prev[selProj] ?? { chars: [], scenes: [], props: [], audio: [] }),
              chars: [
                ...(prev[selProj]?.chars ?? []),
                ...images.map((im, i) => ({
                  id: `${selProj}ic${Date.now()}${i}`,
                  name: im.name.replace(/\.[^.]+$/, "") || name,
                  desc: `${name} · 导入待确认`,
                  status: "pending" as const, count: 0, image: im.url,
                })),
              ],
            },
          }));
          setImportAssetOpen(false);
          setAssetTab("chars");
        }}
      />}

      {/* 新建资产：喂信息 → AI 解析 → 批量生成 */}
      {projAssetOpen && selProj && <CreateAssetModal key={selProj}
        onClose={() => setProjAssetOpen(false)}
        onParsed={(list, opts) => {
          if (!selProj) return;
          setAssetData(prev => ({
            ...prev,
            [selProj]: {
              ...(prev[selProj] ?? { chars: [], scenes: [], props: [], audio: [] }),
              chars: [
                ...(prev[selProj]?.chars ?? []),
                ...list.map((a, i) => ({
                  id: `${selProj}nc${Date.now()}${i}`,
                  name: a.name, desc: a.desc,
                  status: "generating" as const, count: a.count || opts.genCount,
                  aspect: opts.aspect, prefix: opts.prefix,
                })),
              ],
            },
          }));
          setAssetTab("chars");
        }}
      />}
    </>
  );

  // ═══ Project detail view ══════════════════════════════════════════════════
  const proj = projects.find(project => project.id === selProj);
  if (selProj && proj) {
    const data  = assetData[selProj] ?? { chars: [], scenes: [], props: [], audio: [] };
    const visibleItems = data[assetTab].filter(item => !deletedIds.has(item.id));
    const allIds = visibleItems.map(item => item.id);
    const allSel = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
    const visible = getProjVisible(selProj);

    return (
      <>
      {modals}
      <div className="studio-asset-page" style={{ padding: "20px 32px" }}>
        {/* Back */}
        <button
          onClick={() => {
            from === "new-project"
              ? navigate("new-project")
              : (setSelProj(null), setAssetTab("chars"), setPermOpen(null));
          }}
          style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, background: "none", border: "none",
            color: dim, fontSize: 13, cursor: "pointer", padding: "4px 0", transition: "color .15s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "white")}
          onMouseLeave={e => (e.currentTarget.style.color = dim)}>
          <ChevronLeft style={{ width: 15, height: 15 }} />
          {from === "new-project" ? "返回新建剧目" : "返回团队资产"}
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: proj.color }} />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "white", marginBottom: 3 }}>{proj.name}</h1>
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: dim }}>
                <span>{proj.genre}</span><span>·</span><span>更新于 {proj.date}</span>
                {proj.status === "archived" && (
                  <span style={{ color: "rgba(255,255,255,.3)", background: "rgba(255,255,255,.06)", padding: "0 8px", borderRadius: 20, border: "1px solid rgba(255,255,255,.1)" }}>
                    已归档
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {([
              { l: "角色", v: data.chars.length },
              { l: "场景", v: data.scenes.length },
              { l: "道具", v: data.props.length },
              { l: "声音", v: data.audio.length },
            ]).map(s => (
              <div key={s.l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "white" }}>{s.v}</div>
                <div style={{ fontSize: 11, color: dim }}>{s.l}</div>
              </div>
            ))}
            <div style={{ width: 1, height: 36, background: "rgba(255,255,255,.08)", flexShrink: 0 }} />
          </div>
        </div>

        <ProjectPermissions expanded={permOpen === selProj} visible={visible}
          onToggle={() => setPermOpen(permOpen ? null : selProj)} onMemberToggle={id => toggleMember(selProj, id)} />

        <AssetToolbar genModel={genModel} setGenModel={setGenModel} genQuality={genQuality} setGenQuality={setGenQuality}
          genRes={genRes} setGenRes={setGenRes} onImport={() => setImportAssetOpen(true)} onCreate={() => setProjAssetOpen(true)}
          assetTab={assetTab} data={data} allSel={allSel} onTab={tab => { setAssetTab(tab); setSelectedIds(new Set()); }} onToggleAll={() => toggleAll(allIds)} />
        {assetTab === "audio"
          ? <VoiceLibrary openVoice={openVoice} onCloneCustom={() => setVoiceDialog({ name: "", cloneCustom: true })} />
          : <AssetGrid visibleItems={visibleItems} selectedIds={selectedIds} assetTab={assetTab} toggleSel={toggleSel}
              onOpen={setSelItem} openVoice={openVoice} onDelete={setDeleteTarget} />}
        {selectedIds.size > 0 && <AssetBatchActions count={selectedIds.size} onClear={() => setSelectedIds(new Set())}
          onDelete={() => { setDeletedIds(prev => new Set([...prev, ...selectedIds])); setSelectedIds(new Set()); }} />}

        {selItem && <AssetDetailDialog selItem={selItem} assetTab={assetTab} costumes={costumes} setCostumes={setCostumes}
          costumeEditId={costumeEditId} setCostumeEditId={setCostumeEditId} modalRatio={modalRatio} setModalRatio={setModalRatio}
          modalStyle={modalStyle} setModalStyle={setModalStyle} onClose={() => setSelItem(null)} />}
        {voiceDialog && <VoiceDialog voiceTarget={voiceDialog.name} cloneCustom={voiceDialog.cloneCustom} cvGender={cvGender}
          setCvGender={setCvGender} cvAge={cvAge} setCvAge={setCvAge} onClose={() => setVoiceDialog(null)} />}

        {/* Delete confirmation modal */}
        {deleteTarget && (
          <Dialog label="确认删除" onClose={() => setDeleteTarget(null)}
            overlayStyle={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.55)" }}
            contentStyle={{ background: "#1a1726", border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: "28px 32px", width: 340, boxShadow: "0 20px 60px rgba(0,0,0,.7)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Trash2 style={{ width: 20, height: 20, color: "#f87171" }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 6 }}>确认删除</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.7, marginBottom: 22 }}>
                删除资产「{deleteTarget.name}」后不可恢复，关联的引用将会失效。确认继续？
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button data-ui-autofocus onClick={() => setDeleteTarget(null)}
                  style={{ flex: 1, padding: "9px", borderRadius: 11, fontSize: 13, fontWeight: 500, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.7)", cursor: "pointer" }}>
                  取消
                </button>
                <button onClick={() => { setDeletedIds(p => { const n = new Set(p); n.add(deleteTarget.id); return n; }); setSelectedIds(ids => new Set([...ids].filter(id => id !== deleteTarget.id))); setDeleteTarget(null); }}
                  style={{ flex: 1, padding: "9px", borderRadius: 11, fontSize: 13, fontWeight: 700, background: "rgba(248,113,113,.18)", border: "1px solid rgba(248,113,113,.3)", color: "#f87171", cursor: "pointer" }}>
                  删除
                </button>
              </div>
          </Dialog>
        )}
      </div>

      </>
    );
  }

    return (
    <>
      {modals}
      <AssetProjectList projects={projects} permOpen={permOpen} setPermOpen={setPermOpen} getProjVisible={getProjVisible}
        toggleMember={toggleMember} onOpenProject={id => { setSelProj(id); setAssetTab("chars"); setPermOpen(null); }}
        onCreate={() => setNewAssetOpen(true)} />
    </>
  );
}
