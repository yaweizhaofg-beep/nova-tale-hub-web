import { useEffect } from "react";
import type { ReactNode } from "react";
import { Plus, Trash2 } from "canvas-lucide";

import { colors } from "@/shared";
import { canvasThemes } from "@canvas/lib/canvas-theme";
import { useThemeStore } from "@canvas/stores/use-theme-store";
import type { ContextMenuState } from "@canvas/types/canvas";

export function CanvasNodeContextMenu({ menu, onClose, onDuplicate, onDelete }: { menu: ContextMenuState; onClose: () => void; onDuplicate: () => void; onDelete: () => void }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];

    useEffect(() => {
        const close = (event: PointerEvent) => {
            const target = event.target;
            if (target instanceof Element && target.closest(".ant-popover")) return;
            onClose();
        };
        window.addEventListener("pointerdown", close);
        return () => window.removeEventListener("pointerdown", close);
    }, [onClose]);

    return (
        <div
            aria-label={menu.type === "node" ? "节点操作" : "连线操作"}
            role="group"
            className="fixed z-[80] w-44 overflow-hidden rounded-xl border p-1.5 shadow-2xl"
            style={{ left: `clamp(8px, ${menu.x}px, calc(100% - 184px))`, top: `clamp(8px, ${menu.y}px, calc(100% - 112px))`,
                background: theme.node.fill, borderColor: theme.toolbar.border, color: theme.node.text }}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <div className="mb-0.5 border-b px-2 py-1 text-[10px]" style={{ borderColor: theme.toolbar.border, color: theme.node.muted }}>
                {menu.type === "node" ? "节点操作" : "连线操作"}
            </div>
            {menu.type === "node" ? <MenuButton icon={<Plus className="size-4" />} label="复制" onClick={onDuplicate} /> : null}
            <MenuButton icon={<Trash2 className="size-4" />} label="删除" onClick={onDelete} danger />
        </div>
    );
}

function MenuButton({ icon, label, onClick, danger = false }: { icon: ReactNode; label: string; onClick?: () => void; danger?: boolean }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];

    return (
        <button type="button" className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left !text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/10" style={{ color: danger ? colors.error : theme.node.text }} onClick={onClick}>
            {icon}
            <span>{label}</span>
        </button>
    );
}
