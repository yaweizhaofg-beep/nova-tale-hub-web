import { useRef, useState } from "react";

// ─── TiltCard ─────────────────────────────────────────────────────────────────
interface TiltCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function TiltCard({ children, style, className }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = (e.clientX - cx) / (r.width / 2);
    const dy = (e.clientY - cy) / (r.height / 2);
    setTilt({ x: -dy * 8, y: dx * 8 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: tilt.x !== 0 || tilt.y !== 0 ? "transform 0.1s ease" : "transform 0.4s ease",
        ...style,
      }}
      className={className}
    >
      {children}
    </div>
  );
}
