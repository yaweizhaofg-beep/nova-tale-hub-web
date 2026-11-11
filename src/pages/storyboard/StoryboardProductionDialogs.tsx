import { useState } from 'react';
import { Check, Film, Sparkles } from 'lucide-react';
import { Select } from '@/components/ui';
import type { ArtStyle, VideoModel, VideoRecord } from '@/features/storyboard/demo-storyboard';
import {
  DEMO_POSTER_URL,
  DEMO_VIDEO_URL,
  ENHANCE_RESOLUTIONS,
  ENHANCE_SCENES,
  STYLE_PRESETS,
  VIDEO_MODEL_OPTIONS,
  videoModelLabel,
  videoRecordTime,
} from '@/features/storyboard/demo-storyboard-media';
import { SaveDialogActions, StoryboardDialog } from './StoryboardDialog';
import styles from './storyboard-shots.module.css';

const saveError = '保存失败，请检查浏览器存储后重试。';
type DialogProps = { onClose: () => void };

export function StyleDialog({
  initial,
  onClose,
  onSave,
}: DialogProps & {
  initial?: ArtStyle;
  onSave: (value: ArtStyle) => boolean;
}) {
  const [draft, setDraft] = useState(initial ?? { preset: 'none', description: '' });
  const [error, setError] = useState('');
  return (
    <StoryboardDialog
      title="画风素材"
      description="应用到本剧目后续生成的分镜。"
      width={580}
      onClose={onClose}
      actions={<SaveDialogActions onClose={onClose} />}
      onSubmit={() => {
        if (onSave({ ...draft, description: draft.description.trim() })) onClose();
        else setError(saveError);
      }}
    >
      <div className={styles.choiceGrid} role="group" aria-label="画风预设">
        {STYLE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={styles.choiceTile}
            aria-pressed={draft.preset === preset.value}
            onClick={() =>
              setDraft({
                preset: preset.value,
                description: 'description' in preset ? preset.description : '',
              })
            }
          >
            <Sparkles size={15} aria-hidden="true" /> {preset.label}
          </button>
        ))}
      </div>
      <label className={styles.field}>
        画风描述
        <textarea
          rows={4}
          maxLength={400}
          value={draft.description}
          placeholder="可补充色彩、光线、构图和材质"
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        />
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </StoryboardDialog>
  );
}

export function ModelDialog({
  id,
  model,
  onClose,
  onSave,
}: DialogProps & {
  id: number;
  model: VideoModel;
  onSave: (model: VideoModel) => boolean;
}) {
  const [draft, setDraft] = useState(model);
  const [error, setError] = useState('');
  return (
    <StoryboardDialog
      title="选择模型"
      description={'第 ' + id + ' 镜 · 仅应用到当前分镜'}
      onClose={onClose}
      actions={<SaveDialogActions onClose={onClose} label="确定" />}
      onSubmit={() => {
        if (onSave(draft)) onClose();
        else setError(saveError);
      }}
    >
      <div className={styles.field}>
        <span>视频模型</span>
        <Select
          label="视频模型"
          value={draft}
          options={VIDEO_MODEL_OPTIONS}
          onValueChange={setDraft}
        />
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </StoryboardDialog>
  );
}

export function RemarkDialog({
  id,
  value,
  onClose,
  onSave,
}: DialogProps & {
  id: number;
  value: string;
  onSave: (remark: string) => boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');
  return (
    <StoryboardDialog
      title="编辑备注"
      description={'第 ' + id + ' 镜'}
      onClose={onClose}
      actions={<SaveDialogActions onClose={onClose} />}
      onSubmit={() => {
        if (onSave(draft.trim())) onClose();
        else setError(saveError);
      }}
    >
      <label className={styles.field}>
        备注
        <textarea
          data-ui-autofocus
          rows={4}
          maxLength={500}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </StoryboardDialog>
  );
}

export function GenerateDialog({
  count,
  eligible,
  autoMatch,
  onClose,
  onGenerate,
}: DialogProps & {
  count: number;
  eligible: number;
  autoMatch: boolean;
  onGenerate: () => boolean;
}) {
  const [error, setError] = useState('');
  return (
    <StoryboardDialog
      title="生成分镜视频"
      description="演示模式 · 使用本地样片"
      onClose={onClose}
      actions={<SaveDialogActions onClose={onClose} label="确认生成" disabled={!eligible} />}
      onSubmit={() => {
        if (!eligible) return;
        if (onGenerate()) onClose();
        else setError(saveError);
      }}
    >
      <p className={styles.sideHint}>
        将按各分镜的模型与参数生成 {eligible} 个演示结果。再次生成会保留已有版本。
      </p>
      {count > eligible && (
        <p className={styles.sideHint}>{count - eligible} 个分镜的描述词为空，将跳过。</p>
      )}
      {autoMatch && (
        <p className={styles.sideHint}>已开启自动匹配，生成前会按描述词匹配素材名称和别名。</p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </StoryboardDialog>
  );
}

export function VideoRecordsDialog({
  title,
  shotId,
  records,
  activeId,
  onClose,
  onPreview,
  onUse,
}: DialogProps & {
  title: '生成记录' | '视频历史';
  shotId: number;
  records: VideoRecord[];
  activeId?: string;
  onPreview: (record: VideoRecord) => void;
  onUse: (record: VideoRecord) => boolean;
}) {
  const [error, setError] = useState('');
  return (
    <StoryboardDialog
      title={title}
      description={'第 ' + shotId + ' 镜 · 演示记录'}
      width={650}
      onClose={onClose}
    >
      {records.length ? (
        <ul className={styles.recordList}>
          {records.map((record) => (
            <li key={record.id} className={styles.recordRow}>
              <div className={styles.recordText}>
                <strong>
                  {record.operation}{' '}
                  <span className={styles.status} data-status={record.failed ? '失败' : '成功'}>
                    {record.failed ? '失败' : '成功'}
                  </span>
                </strong>
                <span>
                  {videoRecordTime(record)} · {videoModelLabel(record.model)} · {record.resolution}
                </span>
                <span>
                  {record.durationSeconds} 秒 · {record.ratio}
                  {record.scene ? ' · ' + record.scene : ''}
                </span>
                {record.style && <span title={record.style}>画风 · {record.style}</span>}
                {record.assetCount !== undefined && (
                  <span title={record.referenceName}>
                    关联素材 {record.assetCount} 项
                    {record.referenceName && ' · 参考视频 ' + record.referenceName}
                  </span>
                )}
                {record.prompt && <span title={record.prompt}>{record.prompt}</span>}
              </div>
              {record.failed ? (
                <span className={styles.sideHint}>预置失败记录</span>
              ) : (
                <div className={styles.toolGroup}>
                  <button
                    type="button"
                    className={styles.subtleButton}
                    onClick={() => onPreview(record)}
                  >
                    播放
                  </button>
                  <button
                    type="button"
                    className={styles.subtleButton}
                    disabled={activeId === record.id}
                    onClick={() => setError(onUse(record) ? '' : saveError)}
                  >
                    {activeId === record.id ? (
                      <>
                        <Check size={14} aria-hidden="true" /> 当前版本
                      </>
                    ) : (
                      '设为当前'
                    )}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.libraryEmpty}>该分镜暂无生成记录。</p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </StoryboardDialog>
  );
}

export function VideoPlaybackDialog({
  record,
  onClose,
  onEnhance,
  onErase,
}: DialogProps & {
  record: VideoRecord;
  onEnhance: () => void;
  onErase: () => void;
}) {
  return (
    <StoryboardDialog
      title="视频播放"
      description={record.operation + ' · ' + record.resolution + ' · 本地样片'}
      width={820}
      onClose={onClose}
      actions={
        <>
          <a className={styles.subtleButton} href={DEMO_VIDEO_URL} download="分镜演示视频.mp4">
            下载视频
          </a>
          <button type="button" className={styles.subtleButton} onClick={onErase}>
            擦除字幕
          </button>
          <button type="button" className={styles.primaryButton} onClick={onEnhance}>
            画质增强
          </button>
        </>
      }
    >
      <video
        className={styles.dialogVideo}
        controls
        playsInline
        preload="metadata"
        src={DEMO_VIDEO_URL}
        poster={DEMO_POSTER_URL}
      />
    </StoryboardDialog>
  );
}

export function VideoVariantDialog({
  operation,
  record,
  history,
  onClose,
  onSave,
}: DialogProps & {
  operation: '画质增强' | '擦除字幕';
  record: VideoRecord;
  history: VideoRecord[];
  onSave: (options: { resolution?: string; scene?: string }) => boolean;
}) {
  const [scene, setScene] = useState<(typeof ENHANCE_SCENES)[number]>('通用模板');
  const [resolution, setResolution] = useState<(typeof ENHANCE_RESOLUTIONS)[number]>('1080p');
  const [error, setError] = useState('');
  const enhance = operation === '画质增强';
  return (
    <StoryboardDialog
      title={operation}
      description="演示模式 · 生成独立版本与处理记录"
      width={540}
      onClose={onClose}
      actions={<SaveDialogActions onClose={onClose} label={enhance ? '确认增强' : '确认擦除'} />}
      onSubmit={() => {
        if (!onSave(enhance ? { resolution, scene } : {})) setError(saveError);
      }}
    >
      {enhance && (
        <div className={styles.editorSpecs}>
          <div className={styles.field}>
            <span>增强场景</span>
            <Select
              label="增强场景"
              value={scene}
              options={ENHANCE_SCENES.map((value) => ({ value, label: value }))}
              onValueChange={setScene}
            />
          </div>
          <div className={styles.field}>
            <span>目标分辨率</span>
            <Select
              label="目标分辨率"
              value={resolution}
              options={ENHANCE_RESOLUTIONS.map((value) => ({ value, label: value.toUpperCase() }))}
              onValueChange={setResolution}
            />
          </div>
        </div>
      )}
      <p className={styles.sideHint}>源视频 {record.resolution} · 输出沿用本地样片，不消耗积分。</p>
      {history.length > 0 && (
        <ul className={styles.recordList} aria-label={operation + '历史'}>
          {history.map((entry) => (
            <li className={styles.recordRow} key={entry.id}>
              <Film size={15} aria-hidden="true" />
              <span className={styles.recordText}>
                <strong>
                  {entry.resolution}
                  {entry.scene ? ' · ' + entry.scene : ''}
                </strong>
                <span>{videoRecordTime(entry)}</span>
              </span>
              <span className={styles.status} data-status="成功">
                成功
              </span>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </StoryboardDialog>
  );
}
