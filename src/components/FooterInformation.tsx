import { Dialog } from "@/components/ui";
import { useState } from "react";
import { X } from "lucide-react";
const labels = ["用户协议", "隐私政策", "模型备案公示说明", "AI功能使用规范"];
export default function FooterInformation() {
  const [selected,setSelected] = useState<string|null>(null);
  return <>
    <div className="xl-legal-footer" aria-label="网站协议与备案信息">
      <div className="xl-legal-links">{labels.map(label=><button key={label} onClick={()=>setSelected(label)}>{label}</button>)}</div>
      <div className="xl-legal-registration"><span>ICP备案号：京ICP备00000000号（示例）</span><span>公安备案号：京公网安备00000000000000号（示例）</span></div>
      <div className="xl-legal-company"><span>星核耀火科技有限公司（示例）</span><span>地址：XX市XX区XX路XX号（示例）</span></div>
      <p className="xl-legal-example">以上为展示示例，非真实备案及企业信息</p>
    </div>
    {selected&&<Dialog label={selected} onClose={()=>setSelected(null)} overlayClassName="xl-modal-backdrop" contentClassName="xl-manual"><button data-ui-autofocus className="xl-close" aria-label="关闭协议说明" onClick={()=>setSelected(null)}><X size={20}/></button><h2 id="xl-legal-title">{selected}</h2><p>此处为{selected}展示信息位，正式内容待补充。</p><p>当前为界面演示，不构成正式协议或备案公示。</p></Dialog>}
  </>;
}
