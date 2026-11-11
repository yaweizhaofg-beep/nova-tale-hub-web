import { useState, type ReactNode } from 'react';
import {
  Box,
  Eye,
  Image as ImageIcon,
  ImagePlus,
  Mic2,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import ProjectCover from '@/components/ProjectCover';
import type { AssetKind, DemoAsset } from '@/features/storyboard/demo-storyboard';
import {
  audioTypes,
  imageTypes,
  readLocalMedia,
  verifyPlayableMedia,
} from '@/features/storyboard/storyboard-local-media';
import { AssetThumb } from './StoryboardMediaPanel';
import { SaveDialogActions, StoryboardDialog } from './StoryboardDialog';
import styles from './storyboard-shots.module.css';
import editorStyles from './storyboard-asset-editor.module.css';

const maxBatchSize = 4;
const maxMediaKb = 512;
const kindIcons = { 角色: UserRound, 场景: ImageIcon, 道具: Box };

async function readImage(file: File) {
  const url = await readLocalMedia(file, imageTypes, maxMediaKb);
  const image = new Image();
  image.src = url;
  await image.decode().catch(() => {
    throw new Error('无法打开图片，请检查文件格式。');
  });
  if (image.naturalWidth > 4096 || image.naturalHeight > 4096) {
    throw new Error('演示素材的宽高均不能超过 4096 像素。');
  }
  return url;
}

export function AssetEditorDialog({
  asset,
  kind,
  onClose,
  onSave,
}: {
  asset?: DemoAsset;
  kind: AssetKind;
  onClose: () => void;
  onSave: (assets: DemoAsset[]) => boolean;
}) {
  const KindIcon = kindIcons[kind];
  const [draft, setDraft] = useState(asset ?? { kind, id: '', name: '' });
  const [batchMode, setBatchMode] = useState(false);
  const [batch, setBatch] = useState<DemoAsset[]>([]);
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState('');

  async function loadFiles(files: File[]) {
    if (!files.length) return;
    if (batchMode) setBatch([]);
    if (files.length > maxBatchSize) {
      setError('一次最多导入 ' + maxBatchSize + ' 张图片。');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (batchMode) {
        const entries = [];
        for (const file of files) {
          entries.push({
            id: nanoid(),
            kind,
            name:
              file.name
                .replace(/\.[^.]+$/, '')
                .trim()
                .slice(0, 64) || '未命名素材',
            image: await readImage(file),
          });
        }
        setBatch(entries);
      } else {
        const image = await readImage(files[0]);
        setDraft((previous) => ({ ...previous, image }));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '读取图片失败。');
    } finally {
      setBusy(false);
    }
  }

  async function loadAudio(file: File) {
    setBusy(true);
    setError('');
    try {
      const audio = await readLocalMedia(file, audioTypes, maxMediaKb);
      await verifyPlayableMedia(audio, 'audio');
      setDraft((previous) => ({ ...previous, audio }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '读取音频失败。');
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (busy) return;
    const name = draft.name.trim();
    if (batchMode ? !batch.length : !name) return;
    const entries = batchMode
      ? batch
      : [
          {
            ...draft,
            name,
            id: draft.id || nanoid(),
            aliases: draft.aliases?.trim(),
            remark: draft.remark?.trim(),
          },
        ];
    if (onSave(entries)) onClose();
    else setError('保存失败，当前浏览器的会话存储可能已满。');
  }

  if (previewing && (draft.image || draft.cover)) {
    return (
      <StoryboardDialog
        title="素材图片预览"
        description={draft.name}
        width={760}
        onClose={() => setPreviewing(false)}
      >
        {draft.image ? (
          <img className={styles.previewImage} src={draft.image} alt={draft.name || '素材预览'} />
        ) : (
          <div className={editorStyles.coverPreview}>
            <ProjectCover name={draft.cover ?? draft.name} />
          </div>
        )}
      </StoryboardDialog>
    );
  }

  return (
    <StoryboardDialog
      title={asset ? '编辑' + kind : '创建资产'}
      description={
        kind === '角色' ? '管理角色资料、参考图片与音频' : '管理' + kind + '资料与参考图片'
      }
      className={editorStyles.dialog}
      headingIcon={
        <span className={editorStyles.headingIcon} data-kind={kind} aria-hidden="true">
          <KindIcon size={22} />
        </span>
      }
      width={688}
      onClose={onClose}
      onSubmit={submit}
      actions={
        <SaveDialogActions
          onClose={onClose}
          disabled={busy || !(batchMode ? batch.length : draft.name.trim())}
        />
      }
    >
      {!asset && (
        <div className={styles.choiceGrid} role="group" aria-label="创建方式">
          {[false, true].map((mode) => (
            <button
              type="button"
              key={String(mode)}
              className={styles.choiceTile}
              disabled={busy}
              aria-pressed={batchMode === mode}
              onClick={() => {
                setBatchMode(mode);
                setError('');
              }}
            >
              {mode ? '批量导入' : '新建单个'}
            </button>
          ))}
        </div>
      )}
      {batchMode ? (
        <AssetFilePicker
          label="选择图片"
          types={imageTypes}
          className={editorStyles.imagePicker}
          multiple
          disabled={busy}
          onFiles={(files) => void loadFiles(files)}
        >
          <span className={editorStyles.uploadIcon}>
            <Upload size={19} aria-hidden="true" />
          </span>
          <strong>选择多张图片</strong>
          <small>
            一次最多 {maxBatchSize} 张，单张不超过 {maxMediaKb} KB
          </small>
        </AssetFilePicker>
      ) : (
        <div className={editorStyles.columns}>
          <section className={editorStyles.details} aria-label="基本信息">
            <h3>基本信息</h3>
            <label className={styles.field}>
              名称
              <input
                data-ui-autofocus
                required
                maxLength={64}
                value={draft.name}
                placeholder={'输入' + kind + '名称'}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </label>
            <label className={styles.field}>
              别名
              <input
                maxLength={160}
                value={draft.aliases ?? ''}
                placeholder="多个别名用逗号分隔"
                onChange={(event) => setDraft({ ...draft, aliases: event.target.value })}
              />
            </label>
            <label className={styles.field}>
              备注
              <textarea
                rows={3}
                maxLength={500}
                value={draft.remark ?? ''}
                placeholder="记录素材特征或使用说明"
                onChange={(event) => setDraft({ ...draft, remark: event.target.value })}
              />
            </label>
          </section>
          <section className={editorStyles.media} aria-label="媒体素材">
            <h3>媒体素材</h3>
            <div className={editorStyles.mediaField}>
              <div className={editorStyles.mediaLabel}>
                <span>参考图片</span>
                <span>选填</span>
              </div>
              {draft.image || draft.cover ? (
                <>
                  <div className={editorStyles.imageStage}>
                    {draft.image ? (
                      <img src={draft.image} alt="" />
                    ) : (
                      <div className={editorStyles.coverStage}>
                        <ProjectCover name={draft.cover ?? draft.name} />
                      </div>
                    )}
                    <button
                      type="button"
                      className={editorStyles.previewButton}
                      aria-label="预览图片"
                      title="预览图片"
                      disabled={busy}
                      onClick={() => setPreviewing(true)}
                    >
                      <Eye size={16} aria-hidden="true" />
                    </button>
                  </div>
                  <div className={editorStyles.fileActions}>
                    <span className={editorStyles.attached}>已添加图片</span>
                    <AssetFilePicker
                      label="素材图片（选填）"
                      types={imageTypes}
                      className={editorStyles.replacePicker}
                      disabled={busy}
                      onFiles={(files) => void loadFiles(files)}
                    >
                      更换图片
                    </AssetFilePicker>
                    {draft.image && (
                      <button
                        type="button"
                        className={styles.iconButton}
                        disabled={busy}
                        aria-label="移除图片"
                        title="移除图片"
                        onClick={() => setDraft({ ...draft, image: undefined })}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <AssetFilePicker
                  label="素材图片（选填）"
                  types={imageTypes}
                  className={editorStyles.imagePicker}
                  disabled={busy}
                  onFiles={(files) => void loadFiles(files)}
                >
                  <span className={editorStyles.uploadIcon}>
                    <ImagePlus size={20} aria-hidden="true" />
                  </span>
                  <strong>选择图片</strong>
                  <small>PNG、JPG、WebP 或 GIF · {maxMediaKb} KB 以内</small>
                </AssetFilePicker>
              )}
            </div>
            {kind === '角色' && (
              <div className={editorStyles.mediaField}>
                <div className={editorStyles.mediaLabel}>
                  <span>参考音频</span>
                  <span>选填</span>
                </div>
                {draft.audio ? (
                  <div className={editorStyles.audioCard}>
                    <audio controls preload="none" src={draft.audio} aria-label="参考音频播放" />
                    <div className={editorStyles.fileActions}>
                      <span className={editorStyles.attached}>已添加音频</span>
                      <AssetFilePicker
                        label="角色音频（选填）"
                        types={audioTypes}
                        className={editorStyles.replacePicker}
                        disabled={busy}
                        onFiles={(files) => void loadAudio(files[0])}
                      >
                        更换音频
                      </AssetFilePicker>
                      <button
                        type="button"
                        className={styles.iconButton}
                        disabled={busy}
                        aria-label="移除音频"
                        title="移除音频"
                        onClick={() => setDraft({ ...draft, audio: undefined })}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <AssetFilePicker
                    label="角色音频（选填）"
                    types={audioTypes}
                    className={editorStyles.audioPicker}
                    disabled={busy}
                    onFiles={(files) => void loadAudio(files[0])}
                  >
                    <span className={editorStyles.uploadIcon}>
                      <Mic2 size={18} aria-hidden="true" />
                    </span>
                    <span className={editorStyles.audioCopy}>
                      <strong>选择音频</strong>
                      <small>MP3、M4A、WAV 或 OGG · {maxMediaKb} KB 以内</small>
                    </span>
                  </AssetFilePicker>
                )}
              </div>
            )}
          </section>
        </div>
      )}
      {batchMode && batch.length > 0 && (
        <ul className={styles.recordList}>
          {batch.map((item) => (
            <li className={styles.recordRow} key={item.id}>
              <AssetThumb asset={item} />
              {item.name}
            </li>
          ))}
        </ul>
      )}
      {busy && (
        <p className={styles.sideHint} role="status">
          正在读取素材…
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </StoryboardDialog>
  );
}

function AssetFilePicker({
  label,
  types,
  className,
  multiple,
  disabled,
  onFiles,
  children,
}: {
  label: string;
  types: string[];
  className: string;
  multiple?: boolean;
  disabled: boolean;
  onFiles: (files: File[]) => void;
  children: ReactNode;
}) {
  return (
    <label className={editorStyles.picker + ' ' + className} data-disabled={disabled}>
      <input
        type="file"
        aria-label={label}
        accept={types.join(',')}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
      {children}
    </label>
  );
}

export function AssetComplianceDialog({
  assets,
  onClose,
}: {
  assets: DemoAsset[];
  onClose: () => void;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <StoryboardDialog
      title="图片合规检验"
      description="演示模式 · 仅检查素材是否有图片"
      width={600}
      onClose={onClose}
      actions={
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => setChecked(true)}
          disabled={checked}
        >
          <ShieldCheck size={15} aria-hidden="true" /> {checked ? '检查完成' : '开始演示检验'}
        </button>
      }
    >
      {checked ? (
        <ul className={styles.recordList} aria-label="演示检验结果">
          {assets.map((asset) => (
            <li className={styles.recordRow} key={asset.id}>
              <AssetThumb asset={asset} />
              <span className={styles.recordText}>
                <strong>{asset.name}</strong>
                <span>{asset.kind}</span>
              </span>
              <span
                className={styles.status}
                data-status={asset.cover || asset.image ? '成功' : '待开始'}
              >
                {asset.cover || asset.image ? '图片已就绪' : '缺少图片'}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.sideHint}>将检查剧目素材库中的 {assets.length} 项素材。</p>
      )}
    </StoryboardDialog>
  );
}
