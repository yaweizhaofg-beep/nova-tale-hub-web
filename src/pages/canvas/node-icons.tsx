import { type NodeKind } from "@/features/canvas/canvas-types";
import { ImageIcon, Mic2, Layers, Zap, Film, AlignLeft } from "lucide-react";

export function IconText({ c }: { c: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M1 2.5h10M6 2.5V10M2.5 10h7" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
export function IconImage({ c }: { c: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="10" height="10" rx="2" stroke={c} strokeWidth="1.2"/>
      <circle cx="4" cy="4" r="1.2" fill={c} fillOpacity=".8"/>
      <path d="M1 8l3-3 2.5 2.5L9 5l2 3" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
export function IconVideo({ c }: { c: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="2.5" width="7.5" height="7" rx="1.5" stroke={c} strokeWidth="1.2"/>
      <path d="M8.5 5l2.5-1.5v5L8.5 7" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
export function IconAudio({ c }: { c: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="4.5" y="1" width="3" height="6" rx="1.5" stroke={c} strokeWidth="1.2"/>
      <path d="M2 6.5a4 4 0 008 0" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="6" y1="10.5" x2="6" y2="11.5" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
export function IconGenImg({ c }: { c: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 1l.9 2.7L9.7 4.5 7 6.2l.9 2.7L6 7.2 3.1 8.9 4 6.2 1.3 4.5 4.1 3.7z" stroke={c} strokeWidth="1.1" strokeLinejoin="round" fill={`${c}25`}/>
      <circle cx="10" cy="10" r="1.5" fill={c} fillOpacity=".6"/>
    </svg>
  );
}
export function IconGenVid({ c }: { c: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 1l.9 2.7L9.7 4.5 7 6.2l.9 2.7L6 7.2 3.1 8.9 4 6.2 1.3 4.5 4.1 3.7z" stroke={c} strokeWidth="1.1" strokeLinejoin="round" fill={`${c}25`}/>
      <path d="M8 9.5l2.5-1.5v3z" fill={c}/>
    </svg>
  );
}
export function IconGroup({ c }: { c: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="4.5" height="4.5" rx="1" stroke={c} strokeWidth="1.1"/>
      <rect x="6.5" y="1" width="4.5" height="4.5" rx="1" stroke={c} strokeWidth="1.1"/>
      <rect x="1" y="6.5" width="4.5" height="4.5" rx="1" stroke={c} strokeWidth="1.1"/>
      <rect x="6.5" y="6.5" width="4.5" height="4.5" rx="1" stroke={c} strokeWidth="1.1"/>
    </svg>
  );
}
export type IconCProps = { c: string };
export const KIND_SVG: Record<NodeKind, React.FC<IconCProps>> = {
  text: IconText, image: IconImage, video: IconVideo, audio: IconAudio,
  genImg: IconGenImg, genVid: IconGenVid, group: IconGroup,
};
export const KIND_ICON: Record<NodeKind,React.ElementType> = {
  text:AlignLeft, image:ImageIcon, video:Film, audio:Mic2,
  genImg:Zap, genVid:Zap, group:Layers,
};
