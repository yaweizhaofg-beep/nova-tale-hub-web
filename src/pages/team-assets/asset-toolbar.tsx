import { Download, Wand2, Check } from "lucide-react";
import { Select } from "@/components/ui";
import { gold, bdr, dim, card, ddSel } from "./presentation";
import type { AssetItem, AssetTab } from "@/features/assets/asset-types";

interface Props {
  genModel: string;
  setGenModel: (value: string) => void;
  genQuality: string;
  setGenQuality: (value: string) => void;
  genRes: string;
  setGenRes: (value: string) => void;
  onImport: () => void;
  onCreate: () => void;
  assetTab: AssetTab;
  data: Record<AssetTab, AssetItem[]>;
  allSel: boolean;
  onTab: (tab: AssetTab) => void;
  onToggleAll: () => void;
}

export function AssetToolbar({ genModel, setGenModel, genQuality, setGenQuality, genRes, setGenRes, onImport, onCreate, assetTab, data, allSel, onTab, onToggleAll }: Props) {
  return (
    <>
{/* Batch generation settings */}
              <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, marginBottom: 16, padding: "13px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", rowGap: 8 }}>
                  <span style={{ fontSize: 12, color: dim, whiteSpace: "nowrap", marginRight: 4 }}>批量生成设置</span>
                  <Select
                    label="生成模型"
                    value={genModel}
                    onValueChange={value => setGenModel(value)}
                    style={ddSel}
                    options={[{ value: "Flux 1.1 Pro", label: "Flux 1.1 Pro" }, { value: "SDXL Turbo", label: "SDXL Turbo" }, { value: "Stable Cascade", label: "Stable Cascade" }]}
                  />
                  <Select
                    label="画质"
                    value={genQuality}
                    onValueChange={value => setGenQuality(value)}
                    style={ddSel}
                    options={[{ value: "中", label: "中画质" }, { value: "高", label: "高画质" }]}
                  />
                  <Select
                    label="分辨率"
                    value={genRes}
                    onValueChange={value => setGenRes(value)}
                    style={ddSel}
                    options={[{ value: "2K", label: "2K" }, { value: "4K", label: "4K" }]}
                  />
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={onImport}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10,
                      fontSize: 12.5, fontWeight: 600, color: dim, border: `1px solid ${bdr}`, cursor: "pointer", flexShrink: 0,
                      background: "rgba(255,255,255,.04)" }}>
                    <Download style={{ width: 13, height: 13 }} />导入资产
                  </button>
                  <button
                    onClick={onCreate}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10,
                      fontSize: 12.5, fontWeight: 600, color: dim, border: `1px solid ${bdr}`, cursor: "pointer", flexShrink: 0,
                      background: "rgba(255,255,255,.04)" }}>
                    <Wand2 style={{ width: 13, height: 13 }} />新建资产
                  </button>
                </div>
              </div>

              {/* Asset tabs + select-all */}
              <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${bdr}`, marginBottom: 16 }}>
                <div style={{ display: "flex", flex: 1 }}>
                  {([
                    { k: "chars" as AssetTab, l: "角色",    count: data.chars.length },
                    { k: "scenes" as AssetTab, l: "场景",   count: data.scenes.length },
                    { k: "props" as AssetTab,  l: "道具",   count: data.props.length },
                    { k: "audio" as AssetTab,  l: "声音配置", count: data.audio.length },
                  ]).map(t => (
                    <button key={t.k} onClick={() => onTab(t.k)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "none", border: "none",
                        borderBottom: `2px solid ${assetTab === t.k ? gold : "transparent"}`,
                        cursor: "pointer", color: assetTab === t.k ? gold : dim, fontSize: 13, fontWeight: assetTab === t.k ? 600 : 400 }}>
                      {t.l}
                      <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 20,
                        background: assetTab === t.k ? "rgba(255,138,31,.15)" : "rgba(255,255,255,.06)",
                        color: assetTab === t.k ? gold : dim }}>
                        {t.count}
                      </span>
                    </button>
                  ))}
                </div>
                <button onClick={onToggleAll}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", marginBottom: -2,
                    fontSize: 12, color: allSel ? gold : dim, background: "none", border: "none", cursor: "pointer" }}>
                  <div style={{ width: 15, height: 15, borderRadius: 4, border: `1.5px solid ${allSel ? gold : "rgba(255,255,255,.3)"}`,
                    background: allSel ? "rgba(255,138,31,.2)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {allSel && <Check style={{ width: 9, height: 9, color: gold }} />}
                  </div>
                  全选
                </button>
              </div>

              </>
  );
}
