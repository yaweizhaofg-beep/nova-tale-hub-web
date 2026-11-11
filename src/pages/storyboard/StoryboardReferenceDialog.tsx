import { useState } from 'react';
import type { LocalClip, ShotFields } from '@/features/storyboard/demo-storyboard';
import { DEMO_POSTER_URL, DEMO_VIDEO_URL } from '@/features/storyboard/demo-storyboard-media';
import {
  readLocalMedia,
  verifyPlayableMedia,
  videoTypes,
} from '@/features/storyboard/storyboard-local-media';
import { SaveDialogActions, StoryboardDialog } from './StoryboardDialog';
import styles from './storyboard-shots.module.css';

export function StoryboardReferenceDialog({
  shot,
  shotId,
  onClose,
  onSave,
}: {
  shot: ShotFields;
  shotId: number;
  onClose: () => void;
  onSave: (patch: Partial<ShotFields>) => boolean;
}) {
  const removing = Boolean(shot.referenceVideo);
  const [clip, setClip] = useState<LocalClip>();
  const [busy, setBusy] = useState(false);
  const [invalidFile, setInvalidFile] = useState(false);
  const [error, setError] = useState('');

  async function load(file: File) {
    setBusy(true);
    setClip(undefined);
    setInvalidFile(false);
    setError('');
    try {
      const url = await readLocalMedia(file, videoTypes, 1024);
      await verifyPlayableMedia(url, 'video');
      setClip({ url, name: file.name });
    } catch (reason) {
      setInvalidFile(true);
      setError(reason instanceof Error ? reason.message : '读取视频失败。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <StoryboardDialog
      title={removing ? '移除参考视频' : '添加参考视频'}
      description={'第 ' + shotId + ' 镜 · 本地演示'}
      width={560}
      onClose={onClose}
      actions={
        <SaveDialogActions
          onClose={onClose}
          label={removing ? '确认移除' : '添加参考视频'}
          disabled={busy || invalidFile}
        />
      }
      onSubmit={() => {
        if (busy || invalidFile) return;
        if (onSave({ referenceVideo: !removing, referenceClip: removing ? undefined : clip }))
          onClose();
        else setError('保存失败，请检查浏览器存储后重试。');
      }}
    >
      {removing ? (
        <p>移除「{shot.referenceClip?.name ?? '演示片段'}」的关联？</p>
      ) : (
        <>
          <video
            controls
            playsInline
            preload="none"
            className={styles.dialogVideo}
            poster={clip ? undefined : DEMO_POSTER_URL}
            src={clip?.url ?? DEMO_VIDEO_URL}
          />
          <div className={styles.assetUpload}>
            <label className={styles.field}>
              <span>选择本地视频（选填）</span>
              <input
                type="file"
                accept={videoTypes.join(',')}
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void load(file);
                }}
              />
            </label>
            {(clip || invalidFile) && (
              <button
                type="button"
                className={styles.subtleButton}
                onClick={() => {
                  setClip(undefined);
                  setInvalidFile(false);
                  setError('');
                }}
              >
                使用演示片段
              </button>
            )}
          </div>
          <p className={styles.sideHint}>
            {busy
              ? '正在读取视频…'
              : clip
                ? clip.name
                : '默认使用演示片段，可替换为 1 MB 以内的本地视频。'}
          </p>
        </>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </StoryboardDialog>
  );
}
