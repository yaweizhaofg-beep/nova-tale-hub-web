import { useLayoutEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { readWalletSnapshot, subscribeWallet } from "./wallet-repository";
import type { WalletSnapshot } from "./wallet-types";

const walletKey = ["demo-wallet"] as const;

export function WalletProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  useLayoutEffect(() => {
    const update = (snapshot: WalletSnapshot) => { queryClient.setQueryData(walletKey, snapshot); };
    const unsubscribe = subscribeWallet(update);
    update(readWalletSnapshot());
    return unsubscribe;
  }, [queryClient]);
  return <>{children}</>;
}

export function useWalletSnapshot() {
  return useQuery({
    queryKey: walletKey,
    queryFn: readWalletSnapshot,
    initialData: readWalletSnapshot,
    staleTime: Infinity,
  }).data;
}
