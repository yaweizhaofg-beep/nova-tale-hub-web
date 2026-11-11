import { useState, type FormEvent } from 'react';
import { ModalShell, Select } from '@/components/ui';
import {
  MAX_SHOT_DURATION,
  MIN_SHOT_DURATION,
  SHOT_RATIOS,
  SHOT_RESOLUTIONS,
  type ShotFields,
  type ShotStatus,
} from '@/features/storyboard/demo-storyboard';
import { VIDEO_MODEL_OPTIONS } from '@/features/storyboard/demo-storyboard-media';
import styles from './storyboard-shots.module.css';

export type ShotSpecs = Pick<ShotFields, 'ratio' | 'resolution' | 'durationSeconds' | 'videoModel'>;
export type ShotCriteria = Partial<ShotSpecs> & { status?: ShotStatus };
export type SettingsMode = 'filter' | 'batch' | 'defaults';
const statusOptions = ['待开始', '成功', '失败'] as const;
const titles = { filter: '筛选条件', batch: '批量设置', defaults: '默认设置' };

export function StoryboardSettingsDialog({
  mode,
  initial,
  onClose,
  onApply,
}: {
  mode: SettingsMode;
  initial: ShotCriteria;
  onClose: () => void;
  onApply: (next: ShotCriteria) => boolean;
}) {
  const [draft, setDraft] = useState(initial);
  const [duration, setDuration] = useState(initial.durationSeconds?.toString() ?? '');
  const [error, setError] = useState('');
  const title = titles[mode];
  const blank = mode === 'filter' ? '全部' : '沿用当前';

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (onApply({ ...draft, durationSeconds: duration === '' ? undefined : Number(duration) }))
      onClose();
    else setError('保存失败，请检查浏览器存储后重试。');
  }

  return (
    <ModalShell label={title} onClose={onClose} width={520}>
      <form className={'studio-shell ' + styles.editor} onSubmit={submit}>
        <header className={styles.editorHeader}>
          <h2>{title}</h2>
        </header>
        <div className={styles.editorBody}>
          <div className={styles.editorSpecs}>
            <label className={styles.field}>
              时长（秒）
              <input
                type="number"
                data-ui-autofocus
                min={MIN_SHOT_DURATION}
                max={MAX_SHOT_DURATION}
                step={1}
                value={duration}
                placeholder={blank}
                onChange={(event) => setDuration(event.target.value)}
              />
            </label>
            <div className={styles.field}>
              <span>比例</span>
              <Select
                label="比例"
                value={draft.ratio ?? ''}
                options={[
                  { value: '', label: blank },
                  ...SHOT_RATIOS.map((value) => ({ value, label: value })),
                ]}
                onValueChange={(value) => setDraft({ ...draft, ratio: value || undefined })}
              />
            </div>
            <div className={styles.field}>
              <span>分辨率</span>
              <Select
                label="分辨率"
                value={draft.resolution ?? ''}
                options={[
                  { value: '', label: blank },
                  ...SHOT_RESOLUTIONS.map((value) => ({ value, label: value })),
                ]}
                onValueChange={(value) => setDraft({ ...draft, resolution: value || undefined })}
              />
            </div>
            <div className={styles.field}>
              <span>视频模型</span>
              <Select
                label="视频模型"
                value={draft.videoModel ?? ''}
                options={[{ value: '', label: blank }, ...VIDEO_MODEL_OPTIONS]}
                onValueChange={(value) => setDraft({ ...draft, videoModel: value || undefined })}
              />
            </div>
            {mode === 'filter' && (
              <div className={styles.field}>
                <span>状态</span>
                <Select
                  label="状态"
                  value={draft.status ?? ''}
                  options={[
                    { value: '', label: blank },
                    ...statusOptions.map((value) => ({ value, label: value })),
                  ]}
                  onValueChange={(value) => setDraft({ ...draft, status: value || undefined })}
                />
              </div>
            )}
          </div>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className={styles.editorFooter}>
          <button
            type="button"
            className={styles.subtleButton}
            onClick={() => {
              setDraft({});
              setDuration('');
              setError('');
            }}
          >
            重置
          </button>
          <button type="submit" className={styles.primaryButton}>
            {mode === 'filter' ? '筛选' : '应用'}
          </button>
        </footer>
      </form>
    </ModalShell>
  );
}
