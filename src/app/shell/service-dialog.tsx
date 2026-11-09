import { Dialog } from "@/components/ui";


export function QRModal({ onClose }: { onClose: () => void }) {
  return (
    <Dialog label="专属客服" onClose={onClose} overlayStyle={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.6)", backdropFilter: "blur(8px)" }}
      contentStyle={{ background: "#13151C", border: "1px solid rgba(255,255,255,.09)", borderRadius: 18, padding: "28px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, boxShadow: "0 32px 80px rgba(0,0,0,.7)", minWidth: 240 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#F4F5F7", marginBottom: 4 }}>专属客服</div>
          <div style={{ fontSize: 12, color: "#6F7480" }}>扫码添加微信，7×12小时在线</div>
        </div>
        <svg width="148" height="148" viewBox="0 0 148 148" style={{ display: "block", borderRadius: 10 }}>
          <rect width="148" height="148" fill="#ffffff" rx="8" />
          <rect x="10" y="10" width="42" height="42" fill="#111" rx="4" />
          <rect x="16" y="16" width="30" height="30" fill="#fff" rx="2" />
          <rect x="22" y="22" width="18" height="18" fill="#111" rx="1" />
          <rect x="96" y="10" width="42" height="42" fill="#111" rx="4" />
          <rect x="102" y="16" width="30" height="30" fill="#fff" rx="2" />
          <rect x="108" y="22" width="18" height="18" fill="#111" rx="1" />
          <rect x="10" y="96" width="42" height="42" fill="#111" rx="4" />
          <rect x="16" y="102" width="30" height="30" fill="#fff" rx="2" />
          <rect x="22" y="108" width="18" height="18" fill="#111" rx="1" />
          {[
            [60,10],[66,10],[72,10],[78,10],[84,10],[90,10],
            [60,16],[72,16],[84,16],
            [60,22],[66,22],[78,22],[90,22],
            [60,28],[72,28],[84,28],
            [60,34],[66,34],[72,34],[78,34],[84,34],[90,34],
            [10,60],[16,60],[22,60],[28,60],[34,60],[40,60],[46,60],[52,60],
            [10,66],[22,66],[34,66],[52,66],
            [10,72],[28,72],[46,72],[52,72],
            [10,78],[16,78],[22,78],[40,78],[52,78],
            [10,84],[34,84],[40,84],[52,84],
            [10,90],[16,90],[22,90],[28,90],[34,90],[40,90],[46,90],[52,90],
            [60,60],[72,60],[78,60],[90,60],[96,60],[102,60],[108,60],[120,60],[132,60],
            [60,66],[72,66],[84,66],[96,66],[108,66],[120,66],[132,66],
            [60,72],[66,72],[78,72],[90,72],[102,72],[114,72],[126,72],[132,72],
            [60,78],[72,78],[84,78],[96,78],[108,78],[120,78],
            [60,84],[66,84],[78,84],[90,84],[96,84],[102,84],[108,84],[114,84],[120,84],[132,84],
            [60,90],[72,90],[84,90],[96,90],[120,90],[132,90],
            [60,96],[66,96],[72,96],[78,96],[90,96],[96,96],[108,96],[120,96],
            [66,102],[78,102],[84,102],[90,102],[96,102],[108,102],[114,102],[132,102],
            [60,108],[66,108],[78,108],[84,108],[102,108],[108,108],[114,108],[120,108],[132,108],
            [60,114],[72,114],[84,114],[90,114],[96,114],[102,114],[114,114],[126,114],[132,114],
            [60,120],[66,120],[78,120],[90,120],[96,120],[108,120],[120,120],
            [66,126],[72,126],[78,126],[84,126],[96,126],[108,126],[114,126],[120,126],[132,126],
            [60,132],[66,132],[84,132],[90,132],[102,132],[114,132],[126,132],[132,132],
          ].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="5" height="5" fill="#111" rx="0.5" />
          ))}
        </svg>
        <div style={{ fontSize: 11, color: "#6F7480", textAlign: "center", lineHeight: 1.6 }}>
          工作日 9:00–21:00<br />节假日 10:00–18:00
        </div>
        <button onClick={onClose} style={{ padding: "7px 28px", borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)", color: "#A4A8B3", fontSize: 12, cursor: "pointer" }}>
          关闭
        </button>
    </Dialog>
  );
}
