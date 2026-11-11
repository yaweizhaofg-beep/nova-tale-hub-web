import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  History,
  Maximize2,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Video,
} from 'lucide-react';
import {
  ASSET_KINDS,
  type AssetKind,
  type DemoAsset,
  getDemoShot,
  getDemoShotStatus,
  type DemoStoryboard,
} from '@/features/storyboard/demo-storyboard';
import { videoModelLabel } from '@/features/storyboard/demo-storyboard-media';
import { AssetLinks } from './StoryboardMediaPanel';
import styles from './storyboard-shots.module.css';

const ROW_HEIGHT = 148;
const OVERSCAN = 4;
const COLUMN_COUNT = 9;
const rowStyle = { '--shot-row-height': ROW_HEIGHT + 'px' } as CSSProperties;

function rowSpacer(count: number) {
  return (
    count > 0 && (
      <tr className={styles.rowSpacer} aria-hidden="true">
        <td colSpan={COLUMN_COUNT} style={{ height: count * ROW_HEIGHT }} />
      </tr>
    )
  );
}

export type RowDialog = 'remark' | 'model' | 'generate' | 'records';
export type ShotScrollRequest = { id: number; reason: 'jump' | 'insert' };

interface ShotTableProps {
  region: RefObject<HTMLDivElement>;
  ids: number[];
  storyboard: DemoStoryboard;
  scrollRequest: ShotScrollRequest | null;
  activeId: number | null;
  selected: ReadonlySet<number>;
  assets: DemoAsset[];
  onDialog: (id: number, kind: RowDialog) => void;
  onActive: (id: number) => void;
  onSelect: (id: number, selected: boolean) => void;
  onPrompt: (id: number, prompt: string) => boolean;
  onEdit: (id: number) => void;
  onAsset: (id: number, kind: AssetKind) => void;
  onReference: (id: number) => void;
  onVideo: (id: number, reference: boolean) => void;
  onRemove: (id: number) => void;
  onInsert: (id: number, after: boolean) => void;
}

export function StoryboardShotTable({
  region,
  ids,
  storyboard,
  scrollRequest,
  activeId,
  selected,
  assets,
  onDialog,
  onActive,
  onSelect,
  onPrompt,
  onEdit,
  onAsset,
  onReference,
  onVideo,
  onRemove,
  onInsert,
}: ShotTableProps) {
  const [viewport, setViewport] = useState({ first: 0, count: 8 });
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const lastScrollRequest = useRef<ShotScrollRequest | null>(null);
  const positions = useMemo(() => new Map(ids.map((id, index) => [id, index])), [ids]);
  const assetsById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  const syncViewport = useCallback((node: HTMLDivElement) => {
    const first = Math.floor(node.scrollTop / ROW_HEIGHT);
    const count = Math.ceil(node.clientHeight / ROW_HEIGHT) + 1;
    setViewport((current) =>
      current.first === first && current.count === count ? current : { first, count },
    );
  }, []);

  useLayoutEffect(() => {
    const node = region.current;
    if (!node) return;
    const observer = new ResizeObserver(() => syncViewport(node));
    observer.observe(node);
    return () => observer.disconnect();
  }, [region, syncViewport]);

  useLayoutEffect(() => {
    if (!scrollRequest || scrollRequest === lastScrollRequest.current) return;
    lastScrollRequest.current = scrollRequest;
    const index = positions.get(scrollRequest.id);
    const node = region.current;
    if (index === undefined || !node) return;
    const jump = scrollRequest.reason === 'jump';
    const offset = jump ? Math.max(0, (node.clientHeight - ROW_HEIGHT) / 2) : ROW_HEIGHT;
    node.scrollTop = Math.max(0, index * ROW_HEIGHT - offset);
    if (jump) node.scrollLeft = 0;
  }, [positions, region, scrollRequest]);

  const first = Math.min(viewport.first, Math.max(0, ids.length - viewport.count));
  const start = Math.max(0, first - OVERSCAN);
  const end = Math.min(ids.length, first + viewport.count + OVERSCAN);
  const indices = Array.from({ length: end - start }, (_, offset) => start + offset);
  // Keep the row holding keyboard focus mounted when the user scrolls away mid-edit.
  const focusedIndex = focusedId === null ? undefined : positions.get(focusedId);
  if (focusedIndex !== undefined && focusedIndex < start) indices.unshift(focusedIndex);
  if (focusedIndex !== undefined && focusedIndex >= end) indices.push(focusedIndex);

  return (
    <div
      ref={region}
      className={styles.tableScroll}
      role="region"
      aria-label="全部分镜"
      tabIndex={0}
      onScroll={(event) => syncViewport(event.currentTarget)}
    >
      <table className={styles.table} style={rowStyle} aria-rowcount={ids.length + 1}>
        <colgroup>
          <col className={styles.selectCol} />
          <col className={styles.statusCol} />
          <col className={styles.promptCol} />
          {ASSET_KINDS.map((kind) => (
            <col key={kind} className={styles.assetCol} />
          ))}
          <col className={styles.mediaCol} />
          <col className={styles.mediaCol} />
          <col className={styles.actionsCol} />
        </colgroup>
        <thead>
          <tr aria-rowindex={1}>
            <th scope="col" aria-label="选择分镜" />
            <th scope="col">状态</th>
            <th scope="col">
              描述词{' '}
              <span className={styles.keyHint} title="Enter 保存 · Shift + Enter 换行 · Esc 取消">
                快捷键
              </span>
            </th>
            {ASSET_KINDS.map((kind) => (
              <th key={kind} scope="col">
                {kind}
              </th>
            ))}
            <th scope="col">参考视频</th>
            <th scope="col">视频</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          {indices.map((index, renderedIndex) => {
            const id = ids[index];
            const fields = getDemoShot(storyboard, id);
            const status = getDemoShotStatus(storyboard, id);
            const previous = indices[renderedIndex - 1] ?? -1;
            return (
              <Fragment key={id}>
                {rowSpacer(index - previous - 1)}
                <tr
                  className={styles.shotRow}
                  aria-rowindex={index + 2}
                  onFocusCapture={() => setFocusedId(id)}
                  onBlurCapture={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setFocusedId((current) => (current === id ? null : current));
                    }
                  }}
                  data-active={activeId === id}
                  data-selected={selected.has(id)}
                  onClick={() => onActive(id)}
                >
                  <td>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      aria-label={`选择分镜 ${id}`}
                      checked={selected.has(id)}
                      onChange={(event) => onSelect(id, event.target.checked)}
                    />
                  </td>
                  <td>
                    <div className={styles.statusCell}>
                      <strong>{String(id).padStart(2, '0')}</strong>
                      <span className={styles.status} data-status={status}>
                        {status}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.promptPanel}>
                      <div className={styles.promptActions}>
                        <button
                          type="button"
                          className={styles.remarkButton}
                          title={fields.remark || '编辑备注'}
                          aria-label={'编辑备注 ' + id}
                          onClick={() => onDialog(id, 'remark')}
                        >
                          <b>备注</b> {fields.remark || '添加备注'}
                        </button>
                        <button
                          type="button"
                          className={styles.editAction}
                          aria-label={`编辑分镜 ${id}`}
                          onClick={() => onEdit(id)}
                        >
                          <Maximize2 size={13} aria-hidden="true" /> 大屏编辑
                        </button>
                      </div>
                      <div className={styles.specs}>
                        <button
                          type="button"
                          className={styles.modelTrigger}
                          aria-label={'选择模型 ' + id}
                          onClick={() => onDialog(id, 'model')}
                        >
                          {videoModelLabel(fields.videoModel ?? storyboard.model)}{' '}
                          <ChevronDown size={11} aria-hidden="true" />
                        </button>
                        <span>{fields.durationSeconds} 秒</span>
                        <span>
                          {fields.ratio} · {fields.resolution}
                        </span>
                      </div>
                      <InlinePrompt
                        id={id}
                        prompt={fields.prompt}
                        onSave={(value) => onPrompt(id, value)}
                      />
                    </div>
                  </td>
                  {ASSET_KINDS.map((kind) => (
                    <td key={kind}>
                      <AssetLinks
                        kind={kind}
                        assetsById={assetsById}
                        ids={fields.assetIds ?? []}
                        onOpen={() => onAsset(id, kind)}
                      />
                    </td>
                  ))}
                  <td>
                    <div className={styles.referenceCell}>
                      <button
                        type="button"
                        className={styles.addAsset}
                        aria-label={fields.referenceVideo ? '移除参考视频' : '添加参考视频'}
                        title={fields.referenceVideo ? '移除参考视频' : '添加参考视频'}
                        onClick={() => onReference(id)}
                      >
                        {fields.referenceVideo ? (
                          <Trash2 size={13} aria-hidden="true" />
                        ) : (
                          <Plus size={16} aria-hidden="true" />
                        )}
                      </button>
                      {fields.referenceVideo && (
                        <button
                          type="button"
                          className={styles.videoPreview}
                          aria-label="参考片段"
                          onClick={() => onVideo(id, true)}
                        >
                          <Video size={14} aria-hidden="true" /> 片段
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={styles.videoCell}>
                      {status === '成功' && (
                        <button
                          type="button"
                          className={styles.videoPreview}
                          onClick={() => onVideo(id, false)}
                        >
                          <Play size={14} aria-hidden="true" /> 预览
                        </button>
                      )}
                      <div className={styles.videoRowActions}>
                        <button
                          type="button"
                          className={styles.iconButton}
                          title="生成视频"
                          aria-label={'生成视频 ' + id}
                          disabled={!fields.prompt.trim()}
                          onClick={() => onDialog(id, 'generate')}
                        >
                          <Sparkles size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className={styles.iconButton}
                          title="生成记录"
                          aria-label={'生成记录 ' + id}
                          onClick={() => onDialog(id, 'records')}
                        >
                          <History size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        data-danger
                        title="删除"
                        aria-label={`删除分镜 ${id}`}
                        onClick={() => onRemove(id)}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        title="向上插入"
                        aria-label={`在分镜 ${id} 上方插入`}
                        onClick={() => onInsert(id, false)}
                      >
                        <ArrowUp size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        title="向下插入"
                        aria-label={`在分镜 ${id} 下方插入`}
                        onClick={() => onInsert(id, true)}
                      >
                        <ArrowDown size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              </Fragment>
            );
          })}
          {rowSpacer(ids.length - (indices[indices.length - 1] ?? -1) - 1)}
        </tbody>
      </table>
    </div>
  );
}

function InlinePrompt({
  id,
  prompt,
  onSave,
}: {
  id: number;
  prompt: string;
  onSave: (value: string) => boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const restoreFocus = useRef(false);

  function finish(save: boolean, focus = false) {
    if (draft === null) return;
    if (save && draft.trim() !== prompt && !onSave(draft.trim())) return;
    restoreFocus.current = focus;
    setDraft(null);
  }

  return draft === null ? (
    <button
      type="button"
      ref={(node) => {
        if (node && restoreFocus.current) {
          node.focus({ preventScroll: true });
          restoreFocus.current = false;
        }
      }}
      className={styles.promptBody}
      aria-label={`行内编辑分镜 ${id} 的描述词`}
      onClick={() => setDraft(prompt)}
    >
      {prompt || '点击填写描述词'}
    </button>
  ) : (
    <div
      className={styles.inlineEditor}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) finish(true);
      }}
    >
      <textarea
        autoFocus
        aria-label={`分镜 ${id} 描述词`}
        value={draft}
        maxLength={4000}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'Escape' || (event.key === 'Enter' && !event.shiftKey)) {
            event.preventDefault();
            finish(event.key === 'Enter', true);
          }
        }}
      />
      <div className={styles.inlineActions}>
        <button type="button" className={styles.subtleButton} onClick={() => finish(false, true)}>
          取消
        </button>
        <button type="button" className={styles.subtleButton} onClick={() => finish(true, true)}>
          保存
        </button>
      </div>
    </div>
  );
}
