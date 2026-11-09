import { useLayoutEffect, useRef, useState } from "react";
import { X, Download, ImageIcon } from "lucide-react";
import { Dialog } from "@/components/ui";
import { gold, bdr, dim, card } from "./presentation";

// ═══ Import Asset Modal ═══════════════════════════════════════════════════════
// 导入资产：直接上传已有资产图片，追加到当前项目
export function ImportAssetModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, images: { name: string; url: string }[]) => void;
}) {
  const [name, setName] = useState("");
  const [images, setImages] = useState<{ name: string; url: string }[]>([]);
  const [err, setErr] = useState("");

  const draftUrls = useRef(new Set<string>());
  useLayoutEffect(() => {
    const urls = draftUrls.current;
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: { name: string; url: string }[] = [];
    for (const file of files) {
      const url = URL.createObjectURL(file);
      draftUrls.current.add(url);
      next.push({ name: file.name, url });
    }
    setImages(prev => [...prev, ...next]);
    setErr("");
  };

  const submit = () => {
    if (!name.trim()) { setErr("请填写资产名称"); return; }
    if (images.length === 0) { setErr("请至少上传一张图片"); return; }
    onCreate(name.trim(), images);
    draftUrls.current.clear();
  };

  return (
    <Dialog label="导入资产" onClose={onClose}
      overlayStyle={{ position: "fixed", inset: 0, zIndex: 210, display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,.6)", backdropFilter: "blur(6px)" }}
      contentStyle={{ width: "min(520px, calc(100vw - 48px))", background: card, border: `1px solid ${bdr}`, borderRadius: 18,
          boxShadow: "0 30px 80px rgba(0,0,0,.55)", overflow: "hidden", maxHeight: "calc(100vh - 80px)", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: `1px solid ${bdr}`, flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,138,31,.16)", border: "1px solid rgba(255,138,31,.3)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Download style={{ width: 14, height: 14, color: gold }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>导入资产</div>
            <div style={{ fontSize: 11, color: dim }}>上传已有资产图片，追加到当前项目</div>
          </div>
          <button onClick={onClose}
            style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(255,255,255,.05)",
              color: dim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 20px", overflowY: "auto" }}>
          {/* Name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.6)", display: "block", marginBottom: 6 }}>
              资产名称 <span style={{ color: "#f87171" }}>*</span>
            </label>
            <input value={name} onChange={e => { setName(e.target.value); setErr(""); }}
              placeholder="如：角色立绘 / 场景概念图"
              style={{ width: "100%", padding: "10px 13px", borderRadius: 10, fontSize: 13,
                background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)",
                color: "#F4F5F7", outline: "none" }} />
          </div>

          {/* Images */}
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.6)", display: "block", marginBottom: 6 }}>
              图片 <span style={{ color: "#f87171" }}>*</span>
            </label>
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "22px 16px", borderRadius: 12, cursor: "pointer",
              border: "1.5px dashed rgba(255,255,255,.14)", background: "rgba(255,255,255,.02)" }}>
              <input type="file" hidden accept="image/*" multiple onChange={e => handleFiles(e.target.files)} />
              <ImageIcon style={{ width: 20, height: 20, color: "rgba(255,255,255,.28)" }} />
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,.7)" }}>点击选择图片或拖拽到此处</div>
              <div style={{ fontSize: 11, color: dim }}>支持 JPG / PNG / WebP，可多选，单张不超过 10 MB</div>
            </label>

            {images.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8, marginTop: 10 }}>
                {images.map(im => (
                  <div key={im.url} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden",
                    border: `1px solid ${bdr}`, background: "#0b0b12" }}>
                    <img src={im.url} alt={im.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button aria-label={"移除 " + im.name} onClick={() => {
                      URL.revokeObjectURL(im.url);
                      draftUrls.current.delete(im.url);
                      setImages(prev => prev.filter(image => image.url !== im.url));
                    }}
                      style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 6, border: "none",
                        background: "rgba(0,0,0,.6)", color: "#f87171", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <X style={{ width: 11, height: 11 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {err && (
            <div style={{ marginTop: 12, fontSize: 11.5, color: "#f87171" }}>{err}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderTop: `1px solid ${bdr}`, flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "10px", borderRadius: 11, fontSize: 13, fontWeight: 600,
              background: "rgba(255,255,255,.05)", border: `1px solid ${bdr}`, color: "rgba(255,255,255,.75)", cursor: "pointer" }}>
            取消
          </button>
          <button onClick={submit}
            style={{ flex: 1, padding: "10px", borderRadius: 11, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
              color: "black", background: `linear-gradient(135deg,${gold},#FF6A1A)` }}>
            导入
          </button>
        </div>
    </Dialog>
  );
}
