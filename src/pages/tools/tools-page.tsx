import { Scissors } from "lucide-react";
const gold = "#FF8A1F";

export function ToolsPage() {
  return (
    <section style={{ padding: "24px 28px" }}>
      <h1 style={{ color: "#F4F5F7", fontSize: 22, marginBottom: 24 }}>工具</h1>
      <div style={{ maxWidth: 320, padding: 20, borderRadius: 12, color: "#F4F5F7",
        background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>
        <Scissors size={22} color={gold} />
        <strong style={{ display: "block", fontSize: 15, marginTop: 14 }}>视频分割</strong>
        <p style={{ fontSize: 12, opacity: .6, marginTop: 7 }}>按时间拆分视频片段</p>
        <span style={{ display: "inline-block", marginTop: 14, fontSize: 11, opacity: .5 }}>暂未开放</span>
      </div>
    </section>
  );
}
