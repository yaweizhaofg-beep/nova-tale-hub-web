import { useState } from 'react';
import { Download, FileUp } from 'lucide-react';
import { saveAs } from 'file-saver';
import {
  getDemoShot,
  MAX_SHOTS,
  type DemoStoryboard,
  type ShotFields,
} from '@/features/storyboard/demo-storyboard';
import { SaveDialogActions, StoryboardDialog } from './StoryboardDialog';
import styles from './storyboard-shots.module.css';

export function StoryboardFileActions({
  storyboard,
  onSave,
}: {
  storyboard: DemoStoryboard;
  onSave: (next: DemoStoryboard) => void;
}) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');

  async function download(template: boolean) {
    setExporting(true);
    setMessage('');
    try {
      const { createShotWorkbook } = await import('@/features/storyboard/storyboard-workbook');
      const shots = template ? [] : storyboard.shotIds.map((id) => getDemoShot(storyboard, id));
      const workbook = createShotWorkbook(shots, storyboard.model);
      saveAs(workbook, (template ? '分镜导入模板' : storyboard.name + ' - 分镜') + '.xlsx');
    } catch {
      setMessage('导出失败，请重试。');
    } finally {
      setExporting(false);
    }
  }

  function appendShots(shots: ShotFields[]) {
    const first = storyboard.lastShotId + 1;
    const ids = shots.map((_, index) => first + index);
    const edits = { ...storyboard.edits };
    shots.forEach((shot, index) => {
      edits[ids[index]] = shot;
    });
    onSave({
      ...storyboard,
      lastShotId: first + shots.length - 1,
      edits,
      shotIds: [...storyboard.shotIds, ...ids],
    });
    setMessage('已导入 ' + shots.length + ' 个分镜');
    setImporting(false);
  }

  return (
    <div className={styles.headerFiles} role="group" aria-label="表格工具">
      <button
        type="button"
        className={styles.toolButton}
        onClick={() => {
          setMessage('');
          setImporting(true);
        }}
      >
        <FileUp size={14} aria-hidden="true" /> 导入(xlsx)
      </button>
      <button
        type="button"
        className={styles.toolButton}
        disabled={exporting}
        onClick={() => void download(true)}
      >
        导出模板(xlsx)
      </button>
      <button
        type="button"
        className={styles.toolButton}
        disabled={exporting || !storyboard.shotIds.length}
        onClick={() => void download(false)}
      >
        <Download size={14} aria-hidden="true" /> 导出分镜
      </button>
      {message && (
        <span className={styles.sideHint} role="status">
          {message}
        </span>
      )}
      {importing && (
        <WorkbookImportDialog
          storyboard={storyboard}
          onClose={() => setImporting(false)}
          onImport={appendShots}
        />
      )}
    </div>
  );
}

function WorkbookImportDialog({
  storyboard,
  onClose,
  onImport,
}: {
  storyboard: DemoStoryboard;
  onClose: () => void;
  onImport: (shots: ShotFields[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const [shots, setShots] = useState<ShotFields[]>([]);
  const [error, setError] = useState('');
  const available = MAX_SHOTS - storyboard.shotIds.length;

  async function read(file: File) {
    setBusy(true);
    setError('');
    setShots([]);
    setFileName(file.name);
    try {
      const { readShotWorkbook } = await import('@/features/storyboard/storyboard-workbook');
      const next = await readShotWorkbook(file, storyboard.model);
      if (next.length > available)
        throw new Error('当前剧目最多还可追加 ' + Math.max(0, available) + ' 个分镜。');
      setShots(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '文件读取失败。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <StoryboardDialog
      title="导入分镜"
      description="新分镜将追加到当前剧目的列表末尾"
      width={580}
      onClose={onClose}
      actions={
        <SaveDialogActions
          onClose={onClose}
          label="确认导入"
          disabled={busy || !shots.length || shots.length > available}
        />
      }
      onSubmit={() => {
        if (busy || !shots.length || shots.length > available) return;
        try {
          onImport(shots);
        } catch {
          setError('保存失败，请检查浏览器会话存储。');
        }
      }}
    >
      <label className={styles.field}>
        选择 XLSX 文件
        <input
          type="file"
          accept=".xlsx"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void read(file);
          }}
        />
      </label>
      <p className={styles.sideHint}>
        读取首个工作表。表头必填「描述词」，支持时长、分辨率、比例、模型和备注。
      </p>
      {busy && (
        <p className={styles.sideHint} role="status">
          正在读取 {fileName}…
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {shots.length > 0 && (
        <>
          <p className={styles.sideHint} role="status">
            {fileName} · 识别到 {shots.length} 个分镜
          </p>
          <ul className={styles.recordList}>
            {shots.slice(0, 3).map((shot, index) => (
              <li key={index} className={styles.recordRow}>
                <span className={styles.recordText}>
                  <strong title={shot.prompt}>{shot.prompt}</strong>
                  <span>
                    {shot.durationSeconds} 秒 · {shot.ratio} · {shot.resolution}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </StoryboardDialog>
  );
}
