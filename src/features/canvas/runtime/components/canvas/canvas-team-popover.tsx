import { useEffect, useState } from "react";
import { ChevronRight, UsersRound } from "canvas-lucide";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popup";
import { colors } from "@/shared";
import { CANVAS_TEAM_REQUEST, CANVAS_TEAM_SUMMARY, type CanvasTeamSummary } from "@/features/canvas/frame-bridge";
import type { CanvasTheme } from "@canvas/lib/canvas-theme";

export function CanvasTeamPopover({ theme, onManage }: { theme: CanvasTheme; onManage: () => void }) {
    const [open, setOpen] = useState(false);
    const [team, setTeam] = useState<CanvasTeamSummary>();

    useEffect(() => {
        if (window.parent === window) return;
        const receive = (event: MessageEvent<CanvasTeamSummary>) => {
            if (event.origin !== window.location.origin || event.source !== window.parent) return;
            if (event.data?.type === CANVAS_TEAM_SUMMARY && Array.isArray(event.data.members)) setTeam(event.data);
        };
        window.addEventListener("message", receive);
        window.parent.postMessage(CANVAS_TEAM_REQUEST, window.location.origin);
        return () => window.removeEventListener("message", receive);
    }, []);

    const online = team?.members.filter((member) => member.online) ?? [];
    const avatars = online.length ? online : (team?.members ?? []);

    return (
        <Popover open={open} onOpenChange={(next) => {
            setOpen(next);
            if (next && window.parent !== window) window.parent.postMessage(CANVAS_TEAM_REQUEST, window.location.origin);
        }}>
            <PopoverTrigger asChild>
                <button type="button" aria-label="团队"
                    className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[7px] border px-2 text-xs font-semibold transition hover:brightness-125"
                    style={{ background: open ? theme.toolbar.activeBg : theme.toolbar.itemHover, borderColor: theme.toolbar.border, color: open ? theme.toolbar.activeText : theme.toolbar.item }}>
                    <span aria-hidden className="flex items-center -space-x-1">
                        {avatars.length ? avatars.slice(0, 3).map((member) => (
                            <span key={member.id} className="grid size-[18px] place-items-center rounded-full border text-[8px]"
                                style={{ background: theme.node.fill, borderColor: theme.toolbar.panel, color: theme.toolbar.activeText }}>{member.avatar}</span>
                        )) : <UsersRound className="size-3.5" />}
                    </span>
                    <span className="hidden min-[400px]:inline">团队</span>
                </button>
            </PopoverTrigger>
            <PopoverContent aria-label="团队成员" sideOffset={8}
                className="w-[min(280px,calc(100vw-24px))]"
                style={{ padding: 0, borderRadius: 12, background: theme.node.fill, color: theme.node.text, borderColor: theme.toolbar.border }}>
                <div className="flex items-center gap-2.5 border-b px-3 py-3" style={{ borderColor: theme.toolbar.border }}>
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ color: theme.toolbar.activeText, background: theme.toolbar.activeBg }}>
                        <UsersRound className="size-4" />
                    </span>
                    <div className="min-w-0">
                        <strong className="block truncate text-[13px] font-semibold">{team?.name ?? "团队成员"}</strong>
                        {team && <span className="mt-0.5 block text-[11px]" style={{ color: theme.node.muted }}>{online.length} 人在线 · {team.members.length} 位成员</span>}
                    </div>
                </div>
                <div className="thin-scrollbar max-h-[min(250px,40vh)] overflow-auto px-2 py-1">
                    {team?.members.length ? team.members.map((member) => (
                        <div key={member.id} className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5">
                            <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full border text-[11px] font-semibold"
                                style={{ color: theme.toolbar.activeText, background: theme.toolbar.activeBg, borderColor: theme.toolbar.border }}>{member.avatar}</span>
                            <div className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-medium">{member.name}</span>
                                <span className="mt-0.5 block truncate text-[10px]" style={{ color: theme.node.muted }}>{member.role}</span>
                            </div>
                            <span className="flex items-center gap-1 text-[10px]" style={{ color: member.online ? colors.success : theme.node.muted }}>
                                <span aria-hidden className="size-1.5 rounded-full bg-current" />{member.online ? "在线" : "离线"}
                            </span>
                        </div>
                    )) : <p className="px-2 py-4 text-center text-xs" style={{ color: theme.node.muted }}>{team ? "暂无团队成员" : "成员信息暂未加载"}</p>}
                </div>
                <button type="button" className="flex w-full items-center justify-between border-t px-3 py-2.5 text-left !text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: theme.toolbar.activeText, borderColor: theme.toolbar.border }} onClick={() => { setOpen(false); onManage(); }}>
                    管理团队成员<ChevronRight className="size-3.5" />
                </button>
            </PopoverContent>
        </Popover>
    );
}
