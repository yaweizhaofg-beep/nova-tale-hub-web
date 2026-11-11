import { useLocation } from 'react-router';
import { CanvasFrame } from '@/features/canvas/canvas-frame';
import type { Nav } from '@/router/page-location';

export default function CanvasListPage({ navigate }: Nav) {
  const create = new URLSearchParams(useLocation().search).get('create') === '1';
  return <CanvasFrame navigate={navigate} create={create} />;
}
