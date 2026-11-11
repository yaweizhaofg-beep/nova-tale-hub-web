import { App } from "antd";
import { Select } from "@/components/ui/select";
import { cn } from "@canvas/lib/utils";
import { formatRouteLabel, selectImageRoute, selectVideoRoute, usePlatformModelsStore } from "@canvas/services/api/platform-models";

type Props = {
    capability: "image" | "video";
    className?: string;
    fullWidth?: boolean;
    onChanged?: () => void;
};

export function RoutePicker({ capability, className, fullWidth, onChanged }: Props) {
    const { message } = App.useApp();
    const routes = usePlatformModelsStore((state) => capability === "image" ? state.imageRoutes : state.videoRoutes);
    const supplierId = usePlatformModelsStore((state) => capability === "image" ? state.imageSupplierId : state.videoSupplierId);
    const loading = usePlatformModelsStore((state) => capability === "image" ? state.loadingImage : state.loadingVideo);
    if (!routes.length && !loading) return null;

    const options = routes.map((route) => ({
        value: route.id,
        label: [formatRouteLabel(route), route.userRemark?.trim()].filter(Boolean).join(" · "),
    }));
    return (
        <span data-canvas-no-zoom className={cn("inline-flex min-w-0", fullWidth && "w-full")}
            onPointerDown={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
            <Select label={capability === "image" ? "生图线路" : "视频线路"} value={supplierId ?? 0}
                options={options} disabled={loading} placeholder={loading ? "加载线路…" : "选择线路"}
                className={cn("canvas-composer-model-picker max-w-full", fullWidth && "w-full", className)}
                onValueChange={(id) => {
                    void (capability === "image" ? selectImageRoute(id) : selectVideoRoute(id))
                        .then(() => onChanged?.())
                        .catch(() => message.error("线路切换失败，请重试。"));
                }} />
        </span>
    );
}
