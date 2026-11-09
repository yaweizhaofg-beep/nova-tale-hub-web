import { create } from "zustand";
import { SPACE_KINDS, type SpaceKind } from "@/enums/space-kind";
import { USER } from "@/shared";

interface WorkspaceState {
  currentSpace: SpaceKind;
  selectSpace: (space: SpaceKind) => void;
}

const storageKey = "xinghe-space";

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentSpace: SPACE_KINDS.find(space => space === sessionStorage.getItem(storageKey)) ?? USER.currentSpace,
  selectSpace: (currentSpace) => {
    sessionStorage.setItem(storageKey, currentSpace);
    set({ currentSpace });
  },
}));
