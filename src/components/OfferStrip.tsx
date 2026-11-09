const messages = ["限时优惠 · Seedance 2.0 低至 7.5折", "灵感即刻开拍 · 让故事成剧，让热爱有收获", "优惠适用规格及最终费用以生成确认页为准"];
export default function OfferStrip({onOpen}: {onOpen:()=>void}) {
  return <div className="xl-offer-strip"><span className="xl-offer-label">限时优惠</span><div className="xl-offer-window" aria-label={messages.join("；")}><div className="xl-offer-track" aria-hidden="true">{[...messages,...messages].map((message,i)=><span key={i}>{message}<i>✦</i></span>)}</div></div><button onClick={onOpen}>查看优惠 <span aria-hidden="true">↗</span></button></div>;
}
