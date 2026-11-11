import { useLocation } from 'react-router';
import { CanvasFrame } from '@/features/canvas/canvas-frame';
import type { Nav } from '@/router/page-location';

export default function CanvasPage({ navigate }: Nav) {
  const projectId = new URLSearchParams(useLocation().search).get('canvas') ?? undefined;
  return <CanvasFrame navigate={navigate} projectId={projectId} />;
}
