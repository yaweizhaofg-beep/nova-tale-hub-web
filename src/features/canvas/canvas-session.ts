import { CANVAS_SESSION_KEY } from './frame-bridge';

export type CanvasSession = { token: string; subjectType: 'STAFF' | 'TALENT'; subjectId: number };

export function readCanvasSession(): CanvasSession | null {
  const raw = sessionStorage.getItem(CANVAS_SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Partial<CanvasSession>;
    if (typeof session.token !== 'string' || !session.token ||
      (session.subjectType !== 'STAFF' && session.subjectType !== 'TALENT') ||
      typeof session.subjectId !== 'number' || !Number.isSafeInteger(session.subjectId) || session.subjectId <= 0) return null;
    return { token: session.token, subjectType: session.subjectType, subjectId: session.subjectId };
  } catch {
    return null;
  }
}

export function storeCanvasSession(session: CanvasSession) {
  sessionStorage.setItem(CANVAS_SESSION_KEY, JSON.stringify(session));
}

export function clearCanvasSession() {
  sessionStorage.removeItem(CANVAS_SESSION_KEY);
}
