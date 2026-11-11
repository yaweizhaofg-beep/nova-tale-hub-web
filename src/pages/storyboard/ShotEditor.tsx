import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { ModalShell, Select } from '@/components/ui';
import {
  MAX_SHOT_DURATION,
  MIN_SHOT_DURATION,
  SHOT_RATIOS,
  SHOT_RESOLUTIONS,
  type ShotFields,
  type VideoModel,
} from '@/features/storyboard/demo-storyboard';
import { VIDEO_MODEL_OPTIONS } from '@/features/storyboard/demo-storyboard-media';
import styles from './storyboard-shots.module.css';

const ratioOptions = SHOT_RATIOS.map((value) => ({ value, label: value }));
const resolutionOptions = SHOT_RESOLUTIONS.map((value) => ({ value, label: value }));

export function ShotEditor({
  shotNumber,
  shot,
  defaultModel,
  onClose,
  onSave,
}: {
  shotNumber: number;
  shot: ShotFields;
  defaultModel: VideoModel;
  onClose: () => void;
  onSave: (fields: ShotFields) => void;
}) {
  const [draft, setDraft] = useState(shot);
  const [duration, setDuration] = useState(String(shot.durationSeconds));
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = draft.prompt.trim();
    if (!prompt) {
      setError('请填写分镜描述词。');
      return;
    }
    try {
      onSave({ ...draft, prompt, remark: draft.remark.trim(), durationSeconds: Number(duration) });
    } catch {
      setError('保存失败，请检查浏览器存储后重试。');
      return;
    }
    onClose();
  }

  return (
    <ModalShell label={`编辑分镜 ${shotNumber}`} onClose={onClose} width={880}>
      <form className={'studio-shell ' + styles.editor} onSubmit={submit}>
        <header className={styles.editorHeader}>
          <div>
            <h2>编辑分镜</h2>
            <p>第 {shotNumber} 镜 · 演示草稿</p>
          </div>
          <button
            type="button"
            className={styles.subtleButton}
            aria-label="关闭编辑"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </header>
        <div className={styles.editorBody}>
          <label className={styles.field}>
            描述词
            <textarea
              data-ui-autofocus
              rows={8}
              required
              maxLength={4000}
              value={draft.prompt}
              onChange={(event) => setDraft({ ...draft, prompt: event.target.value })}
            />
          </label>
          <label className={styles.field}>
            备注
            <textarea
              rows={2}
              maxLength={500}
              value={draft.remark}
              onChange={(event) => setDraft({ ...draft, remark: event.target.value })}
            />
          </label>
          <div className={styles.editorSpecs}>
            <div className={styles.field}>
              <span>视频模型</span>
              <Select
                label="视频模型"
                value={draft.videoModel ?? defaultModel}
                options={VIDEO_MODEL_OPTIONS}
                onValueChange={(videoModel) => setDraft({ ...draft, videoModel })}
              />
            </div>
            <label className={styles.field}>
              时长（秒）
              <input
                type="number"
                required
                min={MIN_SHOT_DURATION}
                max={MAX_SHOT_DURATION}
                step={1}
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              />
            </label>
            <div className={styles.field}>
              <label htmlFor="shot-ratio">比例</label>
              <Select
                id="shot-ratio"
                label="比例"
                value={draft.ratio}
                options={ratioOptions}
                onValueChange={(ratio) => setDraft({ ...draft, ratio })}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="shot-resolution">分辨率</label>
              <Select
                id="shot-resolution"
                label="分辨率"
                value={draft.resolution}
                options={resolutionOptions}
                onValueChange={(resolution) => setDraft({ ...draft, resolution })}
              />
            </div>
          </div>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className={styles.editorFooter}>
          <button type="button" className={styles.subtleButton} onClick={onClose}>
            取消
          </button>
          <button type="submit" className={styles.primaryButton}>
            保存分镜
          </button>
        </footer>
      </form>
    </ModalShell>
  );
}
