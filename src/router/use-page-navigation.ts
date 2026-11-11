import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  hasDemoSession,
  rememberDemoDestination,
  resolveGuestLocation,
} from '@/features/auth/demo-session';
import { appBasePath, isAppEntry, createPageSearch, readAppPageSearch, readPage, type Nav, type RoutePage } from './page-location';

export function usePageNavigation() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const base = import.meta.env.BASE_URL;
  const isEntry = isAppEntry(location.pathname, base);
  const appSearch = readAppPageSearch(location.pathname, location.search, base);
  const resolved = appSearch === null ? { search: location.search } : resolveGuestLocation(appSearch, hasDemoSession());
  const pathname = !isEntry && appSearch !== null ? appBasePath(base) : location.pathname;

  useEffect(() => {
    if (resolved.returnTo) rememberDemoDestination(resolved.returnTo);
    if (location.pathname !== pathname || location.search !== resolved.search) {
      routerNavigate({ pathname, search: resolved.search, hash: location.hash }, { replace: true });
    }
  }, [location.pathname, location.search, location.hash, pathname, resolved.search, resolved.returnTo, routerNavigate]);

  const navigate = useCallback<Nav['navigate']>(
    (page, extra) => {
      const target = resolveGuestLocation(
        createPageSearch(location.search, page, extra),
        hasDemoSession(),
      );
      if (target.returnTo) rememberDemoDestination(target.returnTo);
      if (!isEntry || target.search !== location.search) {
        routerNavigate({ pathname: isEntry ? location.pathname : appBasePath(base), search: target.search, hash: isEntry ? location.hash : "" });
      }
    },
    [isEntry, base, location.pathname, location.search, location.hash, routerNavigate],
  );

  const setSearch = useCallback(
    (search: string, options?: { replace?: boolean }) => {
      if (search !== location.search) routerNavigate({ search, hash: location.hash }, options);
    },
    [location.search, location.hash, routerNavigate],
  );
  const params = new URLSearchParams(resolved.search);
  const currentPage: RoutePage = (appSearch === null ? null : readPage(params)) ?? "not-found";
  return { currentPage, params, navigate, setSearch };
}
