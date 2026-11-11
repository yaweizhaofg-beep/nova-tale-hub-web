import { clearCanvasSession, readCanvasSession } from '@/features/canvas/canvas-session';
import { MEDIA_API_BASE_URL, API_BASE_URL } from '@canvas/constant/env';

export const clearAuthSession = clearCanvasSession;

export function getToken() {
  return readCanvasSession()?.token ?? '';
}

export function getPlatformActorIds() {
  const session = readCanvasSession();
  return {
    staffId: session?.subjectType === 'STAFF' ? session.subjectId : undefined,
    talentId: session?.subjectType === 'TALENT' ? session.subjectId : undefined,
  };
}

export function getUsername() {
  const session = readCanvasSession();
  return session ? session.subjectType + ':' + session.subjectId : '';
}

export function canvasStorageName() {
  return 'nova-canvas:' + API_BASE_URL + ':' + MEDIA_API_BASE_URL + ':' + getUsername();
}
