import layout from "./asset-layout.module.css";
import { Download, Trash2 } from "lucide-react";
import { dim } from "./presentation";

interface Props {
  count: number;
  onClear: () => void;
  onDelete: () => void;
}

export function AssetBatchActions({ count, onClear, onDelete }: Props) {
  return (
    <div className={layout.batchBar}>
                  <span style={{ fontSize: 13, color: "white", fontWeight: 600, marginRight: 4 }}>已选 {count} 项</span>
                  <button onClick={onClear}
                    style={{ fontSize: 12, color: dim, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 8 }}>
                    取消
                  </button>
                  <div style={{ width: 1, height: 20, background: "rgba(255,255,255,.12)" }} />
                  <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10,
                    fontSize: 13, fontWeight: 500, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)",
                    color: "rgba(255,255,255,.85)", cursor: "pointer" }}>
                    <Download style={{ width: 13, height: 13 }} />批量下载
                  </button>
                  <button onClick={onDelete}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10,
                      fontSize: 13, fontWeight: 500, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.3)",
                      color: "#f87171", cursor: "pointer" }}>
                    <Trash2 style={{ width: 13, height: 13 }} />批量删除
                  </button>
                </div>
  );
}
