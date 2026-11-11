import { create } from "zustand";

export const CANVAS_SIDE_PANEL_MIN_WIDTH = 220;
export const CANVAS_SIDE_PANEL_MAX_WIDTH = 480;
export const CANVAS_SIDE_PANEL_DEFAULT_WIDTH = 280;
export const CANVAS_SIDE_PANEL_RAIL_WIDTH = 48;

const WIDTH_KEY = "canvas-side-panel-width";
const OPEN_KEY = "canvas-side-panel-open";

function initialWidth() {
    if (typeof window === "undefined") return CANVAS_SIDE_PANEL_DEFAULT_WIDTH;
    const stored = Number(localStorage.getItem(WIDTH_KEY));
    if (!stored) return CANVAS_SIDE_PANEL_DEFAULT_WIDTH;
    return Math.min(CANVAS_SIDE_PANEL_MAX_WIDTH, Math.max(CANVAS_SIDE_PANEL_MIN_WIDTH, stored));
}

function initialOpen() {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(OPEN_KEY);
    return stored === null ? window.innerWidth >= 700 : stored === "1";
}

type CanvasSidePanelStore = {
    width: number;
    panelOpen: boolean;
    setWidth: (width: number) => void;
    setPanelOpen: (open: boolean) => void;
};

export const useCanvasSidePanelStore = create<CanvasSidePanelStore>((set) => ({
    width: initialWidth(),
    panelOpen: initialOpen(),
    setWidth: (width) => set({ width }),
    setPanelOpen: (open) => {
        if (typeof window !== "undefined") localStorage.setItem(OPEN_KEY, open ? "1" : "0");
        set({ panelOpen: open });
    },
}));
