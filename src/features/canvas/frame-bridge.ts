export const CANVAS_SESSION_KEY = 'nova:canvas-session';
export const CANVAS_SESSION_EXPIRED = 'nova:canvas-session-expired';
export const CANVAS_TEAM_REQUEST = 'nova-canvas:team-request';
export const CANVAS_TEAM_SUMMARY = 'nova-canvas:team-summary';

export type CanvasTeamMember = { id: number; name: string; avatar: string; role: string; online: boolean };
export type CanvasTeamSummary = { type: typeof CANVAS_TEAM_SUMMARY; name: string; members: CanvasTeamMember[] };

export function isCanvasId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

export type CanvasNavigation =
  | { type: 'nova-canvas:navigate'; page: 'workspace' | 'list' | 'team' }
  | { type: 'nova-canvas:navigate'; page: 'editor'; id: string };

export function isCanvasNavigation(data: unknown): data is CanvasNavigation {
  if (!data || typeof data !== 'object' || !('type' in data) || data.type !== 'nova-canvas:navigate') {
    return false;
  }
  if (!('page' in data)) return false;
  return data.page === 'list' || data.page === 'workspace' || data.page === 'team' ||
    (data.page === 'editor' && 'id' in data && isCanvasId(data.id));
}
