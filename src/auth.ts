import type { PageId } from "./shared";
// Frontend demo session only. Real authentication must be checked by the server.
const SESSION_KEY="xinghe-demo-auth";
const RETURN_KEY="xinghe-auth-return";
const PUBLIC_PAGES=new Set(["landing","login","register"]);
export function guardGuestSearch(search:string):string {
  const params=new URLSearchParams(search);
  const page=params.get("page");
  if(!page)return `?page=${sessionStorage.getItem(SESSION_KEY)==="1"?"workspace":"landing"}`;
  if(sessionStorage.getItem(SESSION_KEY)==="1"||PUBLIC_PAGES.has(page))return search;
  sessionStorage.setItem(RETURN_KEY,"?"+params.toString());
  return "?page=login";
}
export function completeDemoLogin(fallback:PageId="workspace"): {page:PageId;extra:Record<string,string>} {
  sessionStorage.setItem(SESSION_KEY,"1");
  const target=sessionStorage.getItem(RETURN_KEY);sessionStorage.removeItem(RETURN_KEY);
  const params=new URLSearchParams(target||"");
  const page=(params.get("page")||fallback) as PageId;params.delete("page");
  return {page,extra:Object.fromEntries(params.entries())};
}
