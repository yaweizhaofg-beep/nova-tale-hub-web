import { Select } from "@/components/ui/select";
import { cn } from "@canvas/lib/utils";
import { modelOptionLabel, selectableModelsByCapability, type AiConfig, type ModelCapability } from "@canvas/stores/use-config-store";

type ModelPickerProps = {
    config: AiConfig;
    value?: string;
    onChange: (model: string) => void;
    capability?: ModelCapability;
    className?: string;
    fullWidth?: boolean;
    placeholder?: string;
    onMissingConfig?: () => void;
};

export function ModelPicker({ config, value, onChange, capability, className, fullWidth, placeholder = "选择模型", onMissingConfig }: ModelPickerProps) {
    const models = [...selectableModelsByCapability(config, capability)];
    const current = value ?? "";
    if (config.channelMode === "local" && !capability && current && !models.includes(current)) models.unshift(current);
    const options = [...new Set(models)].map((model) => ({ value: model, label: modelOptionLabel(config, model) }));
    const unavailable = config.models.length && capability ? "当前线路暂无可用模型" : "暂无可用平台模型";

    return (
        <span data-canvas-no-zoom className={cn("inline-flex min-w-0", fullWidth && "w-full")}
            onPointerDown={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
            {!options.length && onMissingConfig ? (
                <button type="button" className="rounded-lg border border-input px-3 py-1 text-sm" onClick={onMissingConfig}>{unavailable}</button>
            ) : (
                <Select label={placeholder} value={current} onValueChange={onChange}
                    options={options} placeholder={options.length ? placeholder : unavailable}
                    className={cn("canvas-composer-model-picker max-w-full", fullWidth && "w-full", className)}
                    disabled={!options.length} />
            )}
        </span>
    );
}
