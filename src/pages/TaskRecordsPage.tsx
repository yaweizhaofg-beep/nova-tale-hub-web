import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getTaskById } from "../records";
import type { SpaceKind } from "../records";
import { colors, TEAM_OWNER_ID } from "../shared";
import type { Nav } from "../shared";
import UsageTab from "./team/UsageTab";
import { GhostBtn } from "./team/shared";
import { parseUsageRoute, usageRouteParams } from "./team/route";
import type { UsageRoute } from "./team/route";

function readRoute(space: SpaceKind): UsageRoute {
  const search = window.location.search;
  const params = new URLSearchParams(search);
  const route = parseUsageRoute(search);
  const task = route.task ? getTaskById(route.task) : undefined;
  const personal = space === "personal";
  const selected = task?.space === space && (!personal || task.memberId === TEAM_OWNER_ID) ? task : undefined;
  return {
    ...route, view: "tasks", member: personal ? null : route.member, task: selected?.taskId ?? null,
    from: params.get("dfrom") ?? "",
    to: params.get("dto") ?? "",
  };
}

export default function TaskRecordsPage({ navigate, space, embedded = false }: Nav & { space: SpaceKind; embedded?: boolean }) {
  const personal = space === "personal";
  const page = personal ? "my-tasks" : "team-tasks";
  const [route, setRoute] = useState(() => readRoute(space));
  const [notice, setNotice] = useState("");
  const source = new URLSearchParams(window.location.search).get("source");

  useEffect(() => {
    const sync = () => setRoute(readRoute(space));
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [space]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const updateRoute = (patch: Partial<UsageRoute>, opts?: { replace?: boolean }) => {
    const next = { ...route, ...patch, view: "tasks" as const };
    const params = usageRouteParams(next);
    params.set("page", embedded ? "team" : page);
    if (embedded) params.set("tab", "tasks");
    params.set("dfrom", next.from);
    params.set("dto", next.to);
    if (source) params.set("source", source);
    const search = "?" + params.toString();
    if (window.location.search !== search) {
      if (opts?.replace) window.history.replaceState(null, "", search);
      else window.history.pushState(null, "", search);
    }
    setRoute(next);
  };

  return (
    <section className="task-records-page" style={{ color: colors.textPrimary, ...(embedded ? { padding: 0, margin: 0, maxWidth: "none" } : {}) }}>
      <UsageTab standalone title={embedded ? undefined : personal ? "我的任务" : "任务记录"}
        route={route} space={space} onRouteChange={updateRoute}
        toolbarAction={source ? <GhostBtn onClick={() => {
          if (source === "billing") navigate("billing", { source: null });
          else if (!personal) navigate("team", { tab: "usage", view: null, task: null, member: null, source: null });
          else navigate("workspace");
        }}>
          <ArrowLeft size={14} />{source === "billing" ? "返回账单" : "返回用量"}
        </GhostBtn> : undefined}
        onToast={setNotice}
        onOpenBilling={task => navigate("billing", {
          task, source: page, dfrom: route.from, dto: route.to,
        })} />
      {notice && <p role="status" style={{ marginTop: 10, color: colors.textSecondary }}>{notice}</p>}
    </section>
  );
}
