import localforage from "localforage";
import { canvasStorageName } from "@canvas/lib/auth-token";
import type { StateStorage } from "zustand/middleware";

localforage.config({
    name: canvasStorageName(),
    storeName: "app_state",
});

export const localForageStorage: StateStorage = {
    getItem: (name) => localforage.getItem<string>(name),
    setItem: async (name, value) => { await localforage.setItem(name, value); },
    removeItem: (name) => localforage.removeItem(name),
};
