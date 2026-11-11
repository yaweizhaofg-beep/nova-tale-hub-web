import type {
  AssetKind,
  DemoAsset,
  DemoStoryboard,
  ShotFields,
  VideoRecord,
} from '@/features/storyboard/demo-storyboard';
import { getDemoShot } from '@/features/storyboard/demo-storyboard';
import {
  addDemoVideoVariant,
  generateDemoVideos,
  getActiveVideo,
  getShotRecords,
} from '@/features/storyboard/demo-storyboard-media';
import { AssetComplianceDialog, AssetEditorDialog } from './StoryboardAssetDialogs';
import { StoryboardReferenceDialog } from './StoryboardReferenceDialog';
import {
  GenerateDialog,
  ModelDialog,
  RemarkDialog,
  StyleDialog,
  VideoPlaybackDialog,
  VideoRecordsDialog,
  VideoVariantDialog,
} from './StoryboardProductionDialogs';

type PlaybackDialog = { shotId: number; record: VideoRecord; from?: 'records' | 'history' };

export type WorkbenchDialog =
  | { kind: 'style' }
  | { kind: 'reference'; shotId: number }
  | { kind: 'model' | 'remark'; shotId: number }
  | { kind: 'generate'; ids: number[] }
  | { kind: 'records' | 'history'; shotId: number }
  | ({ kind: 'playback' } & PlaybackDialog)
  | ({ kind: 'variant'; operation: '画质增强' | '擦除字幕' } & PlaybackDialog)
  | { kind: 'asset'; assetKind: AssetKind; asset?: DemoAsset }
  | { kind: 'compliance' };

export function StoryboardWorkbenchDialogs({
  dialog,
  storyboard,
  assets,
  autoMatch,
  onChange,
  onSave,
  onUpdateShot,
  onGenerated,
  onRemoveReference,
}: {
  dialog: WorkbenchDialog;
  storyboard: DemoStoryboard;
  assets: DemoAsset[];
  autoMatch: boolean;
  onChange: (dialog: WorkbenchDialog | null) => void;
  onSave: (next: DemoStoryboard) => boolean;
  onUpdateShot: (id: number, patch: Partial<ShotFields>) => boolean;
  onGenerated: (ids: number[]) => void;
  onRemoveReference: (id: number) => void;
}) {
  const close = () => onChange(null);
  switch (dialog.kind) {
    case 'style':
      return (
        <StyleDialog
          initial={storyboard.artStyle}
          onClose={close}
          onSave={(artStyle) => onSave({ ...storyboard, artStyle })}
        />
      );
    case 'model':
      return (
        <ModelDialog
          id={dialog.shotId}
          onClose={close}
          model={getDemoShot(storyboard, dialog.shotId).videoModel ?? storyboard.model}
          onSave={(videoModel) => onUpdateShot(dialog.shotId, { videoModel })}
        />
      );
    case 'remark':
      return (
        <RemarkDialog
          id={dialog.shotId}
          value={getDemoShot(storyboard, dialog.shotId).remark}
          onClose={close}
          onSave={(remark) => onUpdateShot(dialog.shotId, { remark })}
        />
      );
    case 'reference':
      return (
        <StoryboardReferenceDialog
          shot={getDemoShot(storyboard, dialog.shotId)}
          shotId={dialog.shotId}
          onClose={close}
          onSave={(patch) => {
            if (!onUpdateShot(dialog.shotId, patch)) return false;
            if (!patch.referenceVideo) onRemoveReference(dialog.shotId);
            return true;
          }}
        />
      );
    case 'generate': {
      const eligible = dialog.ids.filter((id) => getDemoShot(storyboard, id).prompt.trim());
      return (
        <GenerateDialog
          count={dialog.ids.length}
          eligible={eligible.length}
          autoMatch={autoMatch}
          onClose={close}
          onGenerate={() => {
            if (!onSave(generateDemoVideos(storyboard, eligible, autoMatch))) return false;
            onGenerated(eligible);
            return true;
          }}
        />
      );
    }
    case 'asset':
      return (
        <AssetEditorDialog
          asset={dialog.asset}
          kind={dialog.assetKind}
          onClose={close}
          onSave={(entries) =>
            onSave({
              ...storyboard,
              assets: {
                ...storyboard.assets,
                ...Object.fromEntries(entries.map((asset) => [asset.id, asset])),
              },
            })
          }
        />
      );
    case 'compliance':
      return <AssetComplianceDialog assets={assets} onClose={close} />;
    case 'history':
    case 'records': {
      const { kind, shotId } = dialog;
      return (
        <VideoRecordsDialog
          title={dialog.kind === 'history' ? '视频历史' : '生成记录'}
          shotId={shotId}
          records={getShotRecords(storyboard, shotId).filter(
            (record) => dialog.kind !== 'history' || !record.failed,
          )}
          activeId={getActiveVideo(storyboard, shotId)?.id}
          onClose={close}
          onPreview={(record) => onChange({ kind: 'playback', shotId, record, from: kind })}
          onUse={(record) =>
            onSave({
              ...storyboard,
              activeVideos: { ...storyboard.activeVideos, [shotId]: record.id },
            })
          }
        />
      );
    }
    case 'playback': {
      const { shotId, record, from } = dialog;
      return (
        <VideoPlaybackDialog
          record={record}
          onClose={() => onChange(from ? { kind: from, shotId } : null)}
          onEnhance={() =>
            onChange({ kind: 'variant', shotId, record, from, operation: '画质增强' })
          }
          onErase={() => onChange({ kind: 'variant', shotId, record, from, operation: '擦除字幕' })}
        />
      );
    }
    case 'variant': {
      const { shotId, record, operation, from } = dialog;
      return (
        <VideoVariantDialog
          operation={operation}
          record={record}
          history={getShotRecords(storyboard, shotId).filter(
            (item) => item.operation === operation,
          )}
          onClose={() => onChange({ kind: 'playback', shotId, record, from })}
          onSave={(options) => {
            if (!onSave(addDemoVideoVariant(storyboard, shotId, record, operation, options)))
              return false;
            onGenerated([shotId]);
            close();
            return true;
          }}
        />
      );
    }
  }
}
