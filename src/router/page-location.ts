export const PAGES = [
  'landing',
  'register',
  'onboarding',
  'workspace',
  'projects',
  'new-project',
  'assets',
  'cost-confirm',
  'batch',
  'result',
  'delivery',
  'billing',
  'canvas',
  'tools',
  'membership',
  'user-center',
  'team',
  'my-tasks',
  'team-tasks',
  'team-assets',
  'login',
  'upgrade',
] as const;

export type PageId = (typeof PAGES)[number];
export type RoutePage = PageId | "not-found";
export type PageParams = Record<string, string | null>;
export interface Nav {
  navigate: (page: PageId, extra?: PageParams) => void;
}

export const TASK_CONTEXT_PAGES = new Set<PageId>([
  'team',
  'team-tasks',
  'my-tasks',
  'billing',
  'result',
]);
export const TASK_CONTEXT_PARAMS = [
  'tab',
  'member',
  'focus',
  'source',
  'space',
  'view',
  'dfrom',
  'dto',
  'cat',
  'project',
  'model',
  'status',
  'q',
  'pg',
  'sort',
  'task',
] as const;

export function readPage(params: URLSearchParams): PageId | null {
  const page = params.get('page');
  return PAGES.find((id) => id === page) ?? null;
}

export function createPageSearch(currentSearch: string, page: PageId, extra?: PageParams) {
  const params = new URLSearchParams(currentSearch);
  if (!TASK_CONTEXT_PAGES.has(page)) TASK_CONTEXT_PARAMS.forEach((key) => params.delete(key));
  if (page !== 'result') params.delete('from');
  if (page !== 'canvas') params.delete('canvas');
  if (page !== 'projects') {
    params.delete('kind');
    params.delete('create');
  }
  params.set('page', page);
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  return '?' + params.toString();
}

export function appBasePath(base: string) {
  return base === "./" ? "/" : base;
}

export function isAppEntry(pathname: string, base: string) {
  const prefix = appBasePath(base);
  return pathname === prefix || pathname === prefix.slice(0, -1) || pathname === prefix + "index.html";
}
