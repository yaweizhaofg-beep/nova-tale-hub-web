import { App, Button, Modal } from 'antd';
import { ModelPicker } from '@canvas/components/model-picker';
import { RoutePicker } from '@canvas/components/route-picker';
import { saveCloudCanvasPreferences } from '@canvas/lib/canvas/canvas-preference-cloud';
import { bootstrapPlatformModels } from '@canvas/services/api/platform-models';
import { useConfigStore, useEffectiveConfig } from '@canvas/stores/use-config-store';

const capabilities = [
  { key: 'image', field: 'imageModel', label: '生图模型' },
  { key: 'video', field: 'videoModel', label: '视频模型' },
  { key: 'text', field: 'textModel', label: '文本模型' },
] as const;

export function CanvasPlatformSettings() {
  const { message } = App.useApp();
  const open = useConfigStore((state) => state.isConfigOpen);
  const setOpen = useConfigStore((state) => state.setConfigDialogOpen);
  const updateConfig = useConfigStore((state) => state.updateConfig);
  const config = useEffectiveConfig();

  return (
    <Modal title="画布模型配置" open={open} onCancel={() => setOpen(false)} width={560} centered
      okText="保存配置" cancelText="取消"
      onOk={async () => {
        try {
          await saveCloudCanvasPreferences();
          setOpen(false);
        } catch {
          message.error('云端偏好保存失败，请重试。');
        }
      }}>
      <div className="thin-scrollbar grid max-h-[62dvh] gap-2.5 overflow-y-auto p-0.5">
        <span className="text-xs opacity-75">为画布设置默认模型与平台线路</span>
        {capabilities.map(({ key, field, label }) => (
          <div className="grid gap-2 rounded-xl border border-border bg-background p-3" key={key}>
            <span className="text-xs font-semibold">{label}</span>
            <div className={key === 'text' ? 'min-w-0' : 'grid min-w-0 gap-2 sm:grid-cols-2'}>
              {key !== 'text' && <RoutePicker capability={key} fullWidth />}
              <ModelPicker config={config} capability={key} value={config[field]} fullWidth
                placeholder={label} onChange={(value) => updateConfig(field, value)} />
            </div>
          </div>
        ))}
        <Button className="justify-self-start" onClick={() => void bootstrapPlatformModels().then(
          () => message.success('平台线路已刷新'),
          () => message.error('刷新平台线路失败，请重试。'),
        )}>刷新平台线路</Button>
      </div>
    </Modal>
  );
}
