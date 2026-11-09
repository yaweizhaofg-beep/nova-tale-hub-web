import { readPage, type PageId } from "@/router/page-location";

const SESSION_KEY = "xinghe-demo-auth";
const RETURN_KEY = "xinghe-auth-return";
const PUBLIC_PAGES = new Set(["landing", "login", "register"]);

export function hasDemoSession() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

export function resolveGuestLocation(search: string, signedIn: boolean) {
  const params = new URLSearchParams(search);
  if (!params.get("page")) return { search: signedIn ? "?page=workspace" : "?page=landing" };
  const page = readPage(params);
  if (!page || signedIn || PUBLIC_PAGES.has(page)) return { search };
  return { search: "?page=login", returnTo: search };
}

export function rememberDemoDestination(search: string) {
  sessionStorage.setItem(RETURN_KEY, search);
}

export function completeDemoLogin(fallback: PageId = "workspace") {
  sessionStorage.setItem(SESSION_KEY, "1");
  const target = sessionStorage.getItem(RETURN_KEY);
  sessionStorage.removeItem(RETURN_KEY);
  const params = new URLSearchParams(target ?? "");
  const page = readPage(params) ?? fallback;
  params.delete("page");
  return { page, extra: Object.fromEntries(params) };
}
