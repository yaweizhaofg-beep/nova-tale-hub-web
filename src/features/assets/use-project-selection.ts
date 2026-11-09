import { useState } from 'react';

const emptyIds: ReadonlySet<string> = new Set();
type UpdateIds = ReadonlySet<string> | ((ids: ReadonlySet<string>) => ReadonlySet<string>);

export function useProjectSelection(scopeKey: string | null) {
  const [byScope, setByScope] = useState<Record<string, ReadonlySet<string>>>({});
  const ids = scopeKey ? (byScope[scopeKey] ?? emptyIds) : emptyIds;
  const updateIds = (update: UpdateIds) => {
    if (!scopeKey) return;
    setByScope((current) => ({
      ...current,
      [scopeKey]: typeof update === 'function' ? update(current[scopeKey] ?? emptyIds) : update,
    }));
  };
  return [ids, updateIds] as const;
}
