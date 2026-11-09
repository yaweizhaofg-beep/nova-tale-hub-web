import { createContext, useContext } from 'react';

export const PageSearchContext = createContext<
  ((search: string, options?: { replace?: boolean }) => void) | null
>(null);

export function usePageSearch() {
  const setSearch = useContext(PageSearchContext);
  if (!setSearch) throw new Error('PageSearchContext is missing');
  return setSearch;
}
