

export function ElectricEdge({ a, b, color, selected }: {
  a:[number,number]; b:[number,number]; color:string; selected?:boolean;
}) {
  const mx  = a[0] + (b[0]-a[0])*0.5;
  const d   = `M ${a[0]} ${a[1]} C ${mx} ${a[1]} ${mx} ${b[1]} ${b[0]} ${b[1]}`;
  const chord = Math.hypot(b[0]-a[0], b[1]-a[1]);
  const len   = Math.max(120, chord * 1.35);
  const delay = (((a[0]*1.3 + a[1]*0.9 + b[0]*0.6) % 2400) / 2400).toFixed(3);
  const dur   = (2.2 + ((a[0]+b[1]) % 80) / 80).toFixed(2);
  const gap  = len + 600;
  const tailLen = 48;
  const midLen  = 28;
  const tipLen  = 8;

  return (
    <g>
      {selected && <path d={d} fill="none" stroke={color} strokeWidth={10} strokeOpacity={0.08} strokeLinecap="round"/>}
      <path d={d} fill="none" stroke={color} strokeWidth={1} strokeOpacity={selected ? 0.3 : 0.14} strokeLinecap="round"/>
      <path d={d} fill="none" stroke={color} strokeWidth={9} strokeLinecap="round"
        strokeDasharray={`${tailLen} ${gap}`}
        style={{ strokeOpacity:0.22, filter:`blur(5px)`,
          animation:`comet ${dur}s ease-in-out -${delay}s infinite` }}/>
      <path d={d} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"
        strokeDasharray={`${midLen} ${gap + tailLen - midLen}`}
        style={{ strokeOpacity:0.7, animation:`comet ${dur}s ease-in-out -${delay}s infinite` }}/>
      <path d={d} fill="none" stroke="rgba(255,255,255,.95)" strokeWidth={2} strokeLinecap="round"
        strokeDasharray={`${tipLen} ${gap + midLen - tipLen}`}
        style={{ animation:`comet ${dur}s ease-in-out -${delay}s infinite`,
          filter:`drop-shadow(0 0 3px ${color}) drop-shadow(0 0 6px ${color})` }}/>
      <circle cx={b[0]} cy={b[1]} r={4} fill={color} fillOpacity={0.15}/>
      <circle cx={b[0]} cy={b[1]} r={2.5} fill={color} fillOpacity={0.85}
        style={{filter:`drop-shadow(0 0 5px ${color}) drop-shadow(0 0 10px ${color})`}}/>
      <circle cx={a[0]} cy={a[1]} r={1.8} fill={color} fillOpacity={0.45}/>
    </g>
  );
}
