import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { ChevronRight, Filter, ListChecks, Plus, Settings2, Sparkles, Trash2 } from 'lucide-react';
import { ModalShell } from '@/components/ui';
import {
  getDemoShot,
  getDemoShotStatus,
  MAX_SHOTS,
  type AssetKind,
  type DemoStoryboard,
  type ShotFields,
} from '@/features/storyboard/demo-storyboard';
import { getActiveVideo, getStoryboardAssets } from '@/features/storyboard/demo-storyboard-media';
import { ShotEditor } from './ShotEditor';
import { StoryboardAssetPanel, StoryboardVideoPanel } from './StoryboardMediaPanel';
import {
  StoryboardSettingsDialog,
  type SettingsMode,
  type ShotCriteria,
  type ShotSpecs,
} from './StoryboardSettingsDialog';
import { StoryboardShotTable, type ShotScrollRequest } from './StoryboardShotTable';
import { StoryboardWorkbenchDialogs, type WorkbenchDialog } from './StoryboardWorkbenchDialogs';
import styles from './storyboard-shots.module.css';

function specsFrom(criteria: ShotCriteria): Partial<ShotSpecs> {
  const { durationSeconds, ratio, resolution, videoModel } = criteria;
  return {
    ...(durationSeconds !== undefined && { durationSeconds }),
    ...(ratio && { ratio }),
    ...(resolution && { resolution }),
    ...(videoModel && { videoModel }),
  };
}

export function StoryboardWorkbench({
  storyboard,
  assetsCollapsed,
  onAssetsCollapsedChange,
  onSave,
}: {
  storyboard: DemoStoryboard;
  assetsCollapsed: boolean;
  onAssetsCollapsedChange: (collapsed: boolean) => void;
  onSave: (next: DemoStoryboard) => void;
}) {
  const [scrollRequest, setScrollRequest] = useState<ShotScrollRequest | null>(null);
  const [jumpError, setJumpError] = useState('');
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [activeId, setActiveId] = useState<number | null>(storyboard.shotIds[0] ?? null);
  const [kind, setKind] = useState<AssetKind>('角色');
  const [assetQuery, setAssetQuery] = useState('');
  const [video, setVideo] = useState<{ id: number; reference: boolean } | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [removing, setRemoving] = useState<number[] | null>(null);
  const [settings, setSettings] = useState<SettingsMode | null>(null);
  const [criteria, setCriteria] = useState<ShotCriteria>({});
  const [defaults, setDefaults] = useState<Partial<ShotSpecs>>({});
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<WorkbenchDialog | null>(null);
  const [autoMatch, setAutoMatch] = useState(false);
  const [notice, setNotice] = useState('');
  const tableRegion = useRef<HTMLDivElement>(null);
  const assetPanelId = useId();
  const jumpErrorId = useId();
  const assetToggleLabel = assetsCollapsed ? '展开素材库' : '收起素材库';

  const matching = useMemo(() => {
    if (!Object.values(criteria).some((value) => value !== undefined)) return storyboard.shotIds;
    return storyboard.shotIds.filter((id) => {
      const shot = getDemoShot(storyboard, id);
      return (
        (!criteria.status || getDemoShotStatus(storyboard, id) === criteria.status) &&
        (!criteria.ratio || shot.ratio === criteria.ratio) &&
        (!criteria.resolution || shot.resolution === criteria.resolution) &&
        (!criteria.videoModel || (shot.videoModel ?? storyboard.model) === criteria.videoModel) &&
        (!criteria.durationSeconds || shot.durationSeconds === criteria.durationSeconds)
      );
    });
  }, [criteria, storyboard]);
  const allSelected = matching.length > 0 && matching.every((id) => selected.has(id));
  const assets = useMemo(() => getStoryboardAssets(storyboard), [storyboard]);
  const videoRecord = video && !video.reference ? getActiveVideo(storyboard, video.id) : undefined;
  const filtered = Object.values(criteria).some((value) => value !== undefined);
  const activeShot = activeId === null ? null : getDemoShot(storyboard, activeId);
  const initialSettings = { filter: criteria, batch: {}, defaults };

  function persist(next: DemoStoryboard) {
    try {
      onSave(next);
      setError('');
      return true;
    } catch {
      setError('保存失败，请检查浏览器存储后重试。');
      return false;
    }
  }

  function updateShot(id: number, patch: Partial<ShotFields>) {
    return persist({
      ...storyboard,
      edits: { ...storyboard.edits, [id]: { ...getDemoShot(storyboard, id), ...patch } },
    });
  }

  function toggleSelection(ids: number[], checked: boolean) {
    setSelected((previous) => {
      const next = new Set(previous);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  function jumpToShot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    const value = String(new FormData(event.currentTarget).get('shotNumber') ?? '')
      .trim()
      .normalize('NFKC');
    const id = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id < 1) {
      setJumpError('请输入有效的分镜号。');
      return;
    }
    if (!storyboard.shotIds.includes(id)) {
      setJumpError(`分镜号 ${id} 不存在。`);
      return;
    }

    setJumpError('');
    if (!matching.includes(id)) {
      setCriteria({});
      setNotice(`已清除筛选，定位到分镜 ${id}。`);
    }
    setActiveId(id);
    setScrollRequest({ id, reason: 'jump' });
  }

  function insert(id: number | null, after = true) {
    if (storyboard.shotIds.length >= MAX_SHOTS) {
      setError('当前剧目已达到 ' + MAX_SHOTS + ' 个分镜的上限。');
      return;
    }
    const newId = storyboard.lastShotId + 1;
    const ids = [...storyboard.shotIds];
    const position = id === null ? ids.length : ids.indexOf(id) + Number(after);
    ids.splice(position, 0, newId);
    if (
      !persist({
        ...storyboard,
        lastShotId: newId,
        shotIds: ids,
        edits: { ...storyboard.edits, [newId]: { ...getDemoShot(storyboard, newId), ...defaults } },
      })
    )
      return;
    setScrollRequest({ id: newId, reason: 'insert' });
    setActiveId(newId);
    setEditing(newId);
  }

  function remove() {
    if (!removing) return;
    const ids = new Set(removing);
    const edits = { ...storyboard.edits };
    const videos = { ...storyboard.videos };
    const activeVideos = { ...storyboard.activeVideos };
    ids.forEach((id) => {
      delete edits[id];
      delete videos[id];
      delete activeVideos[id];
    });
    if (
      !persist({
        ...storyboard,
        shotIds: storyboard.shotIds.filter((id) => !ids.has(id)),
        edits,
        videos,
        activeVideos,
      })
    )
      return;
    toggleSelection(removing, false);
    if (activeId !== null && ids.has(activeId)) setActiveId(null);
    if (video && ids.has(video.id)) setVideo(null);
    setRemoving(null);
  }

  function applySettings(next: ShotCriteria) {
    if (settings === 'filter') {
      setNotice('');
      setCriteria(next);
      tableRegion.current?.scrollTo({ top: 0 });
      return true;
    }
    const specs = specsFrom(next);
    if (settings === 'defaults') {
      setDefaults(specs);
      return true;
    }
    const edits = { ...storyboard.edits };
    selected.forEach((id) => {
      edits[id] = { ...getDemoShot(storyboard, id), ...specs };
    });
    return persist({ ...storyboard, edits });
  }

  return (
    <>
      <section className={styles.toolbar} aria-label="分镜工具">
        <div className={styles.toolGroup} role="group" aria-label="列表工具">
          <button
            type="button"
            className={styles.toolButton}
            disabled={!matching.length}
            onClick={() => toggleSelection(matching, !allSelected)}
          >
            <ListChecks size={15} aria-hidden="true" /> {allSelected ? '取消全选' : '全选'}
          </button>
          <button
            type="button"
            className={styles.toolButton}
            aria-pressed={filtered}
            onClick={() => setSettings('filter')}
          >
            <Filter size={14} aria-hidden="true" /> 筛选
          </button>
          <button
            type="button"
            className={styles.toolButton}
            onClick={() => setSettings('defaults')}
          >
            默认设置
          </button>
          {storyboard.shotIds.length > 0 && (
            <button type="button" className={styles.toolButton} onClick={() => insert(null)}>
              <Plus size={14} aria-hidden="true" /> 新建分镜
            </button>
          )}
        </div>
        <div className={styles.toolGroup} role="group" aria-label="批量操作">
          <button
            type="button"
            className={styles.toolButton}
            disabled={!selected.size}
            onClick={() => setSettings('batch')}
          >
            <Settings2 size={14} aria-hidden="true" /> 设置
          </button>
          <button
            type="button"
            className={styles.toolButton}
            data-danger
            disabled={!selected.size}
            onClick={() => setRemoving([...selected])}
          >
            <Trash2 size={14} aria-hidden="true" /> 批量删除
          </button>
        </div>
        <div className={styles.toolGroup} role="group" aria-label="生成工具">
          <button
            type="button"
            className={styles.toolButton}
            onClick={() => setDialog({ kind: 'style' })}
          >
            画风素材
          </button>
          <button
            type="button"
            className={styles.matchSwitch}
            role="switch"
            aria-checked={autoMatch}
            onClick={() => setAutoMatch((enabled) => !enabled)}
          >
            <span className={styles.matchTrack} aria-hidden="true" />
            自动匹配素材
          </button>
          <button
            type="button"
            className={`${styles.primaryButton} ${styles.generateButton}`}
            disabled={!selected.size}
            onClick={() => {
              setNotice('');
              setDialog({ kind: 'generate', ids: [...selected] });
            }}
          >
            <Sparkles size={14} aria-hidden="true" /> 开始生成
          </button>
        </div>
        <form className={styles.shotJump} aria-label="分镜号跳转" onSubmit={jumpToShot}>
          <input
            type="text"
            name="shotNumber"
            inputMode="numeric"
            placeholder="分镜号"
            aria-label="分镜号"
            aria-invalid={Boolean(jumpError)}
            aria-describedby={jumpError ? jumpErrorId : undefined}
            disabled={!storyboard.shotIds.length}
            onChange={() => {
              if (jumpError) setJumpError('');
            }}
          />
          <button type="submit" className={styles.toolButton} disabled={!storyboard.shotIds.length}>
            跳转
          </button>
        </form>
        {notice && (
          <span className={styles.sideHint} role="status">
            {notice}
          </span>
        )}
        <span className={styles.selectionCount} aria-live="polite">
          {selected.size > 0 && '已选 ' + selected.size.toLocaleString() + ' 镜 · '}
          {filtered && '筛选 ' + matching.length.toLocaleString() + ' 个 / '}
          {storyboard.shotIds.length.toLocaleString()} 个分镜
        </span>
      </section>
      {jumpError && (
        <p id={jumpErrorId} className={styles.error} role="alert">
          {jumpError}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div
        className={styles.workArea}
        data-video={Boolean(video)}
        data-assets-collapsed={!video && assetsCollapsed}
      >
        <section className={styles.tablePanel} aria-label="分镜列表">
          <StoryboardShotTable
            region={tableRegion}
            ids={matching}
            storyboard={storyboard}
            scrollRequest={scrollRequest}
            activeId={activeId}
            selected={selected}
            assets={assets}
            onDialog={(shotId, kind) => {
              setNotice('');
              setActiveId(shotId);
              setDialog(kind === 'generate' ? { kind, ids: [shotId] } : { kind, shotId });
            }}
            onActive={setActiveId}
            onSelect={(id, checked) => toggleSelection([id], checked)}
            onPrompt={(id, prompt) => updateShot(id, { prompt })}
            onEdit={setEditing}
            onAsset={(id, nextKind) => {
              setActiveId(id);
              setKind(nextKind);
              setAssetQuery('');
              setVideo(null);
              onAssetsCollapsedChange(false);
            }}
            onReference={(shotId) => setDialog({ kind: 'reference', shotId })}
            onVideo={(id, reference) => {
              setActiveId(id);
              setVideo({ id, reference });
            }}
            onRemove={(id) => setRemoving([id])}
            onInsert={insert}
          />
          {!matching.length && (
            <div className={styles.tableEmpty}>
              {filtered ? (
                <button
                  type="button"
                  className={styles.subtleButton}
                  onClick={() => {
                    setCriteria({});
                    tableRegion.current?.scrollTo({ top: 0 });
                  }}
                >
                  没有匹配的分镜，清除筛选
                </button>
              ) : (
                <button type="button" className={styles.primaryButton} onClick={() => insert(null)}>
                  <Plus size={15} aria-hidden="true" /> 创建新分镜
                </button>
              )}
            </div>
          )}
        </section>
        {!video && (
          <button
            type="button"
            className={styles.assetToggle}
            aria-label={assetToggleLabel}
            title={assetToggleLabel}
            aria-expanded={!assetsCollapsed}
            aria-controls={assetPanelId}
            onClick={() => onAssetsCollapsedChange(!assetsCollapsed)}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
        {video ? (
          <StoryboardVideoPanel
            key={video.id + ':' + video.reference}
            shotId={video.id}
            reference={video.reference}
            fields={getDemoShot(storyboard, video.id)}
            record={videoRecord}
            onHistory={() => setDialog({ kind: 'history', shotId: video.id })}
            onPlayback={() => {
              if (videoRecord)
                setDialog({ kind: 'playback', shotId: video.id, record: videoRecord });
            }}
            onClose={() => setVideo(null)}
          />
        ) : (
          <StoryboardAssetPanel
            id={assetPanelId}
            assets={assets}
            onCreate={() => setDialog({ kind: 'asset', assetKind: kind })}
            onEdit={(asset) => setDialog({ kind: 'asset', assetKind: asset.kind, asset })}
            onCompliance={() => setDialog({ kind: 'compliance' })}
            hidden={assetsCollapsed}
            kind={kind}
            shotId={activeId}
            linkedIds={activeShot?.assetIds ?? []}
            query={assetQuery}
            onQueryChange={setAssetQuery}
            onKindChange={(nextKind) => {
              if (nextKind === kind) return;
              setKind(nextKind);
              setAssetQuery('');
            }}
            onToggle={(id) => {
              if (activeId === null) return;
              const links = activeShot?.assetIds ?? [];
              updateShot(activeId, {
                assetIds: links.includes(id) ? links.filter((item) => item !== id) : [...links, id],
              });
            }}
          />
        )}
      </div>
      {dialog && (
        <StoryboardWorkbenchDialogs
          dialog={dialog}
          storyboard={storyboard}
          assets={assets}
          autoMatch={autoMatch}
          onChange={setDialog}
          onSave={persist}
          onUpdateShot={updateShot}
          onRemoveReference={(id) => {
            if (video?.id === id && video.reference) setVideo(null);
          }}
          onGenerated={(ids) => {
            setNotice(
              dialog.kind === 'variant' ? '已保存处理版本' : '已生成 ' + ids.length + ' 个演示视频',
            );
            if (ids.length === 1) {
              setActiveId(ids[0]);
              setVideo({ id: ids[0], reference: false });
            }
          }}
        />
      )}
      {editing !== null && (
        <ShotEditor
          shotNumber={editing}
          defaultModel={storyboard.model}
          shot={getDemoShot(storyboard, editing)}
          onClose={() => setEditing(null)}
          onSave={(fields) =>
            onSave({ ...storyboard, edits: { ...storyboard.edits, [editing]: fields } })
          }
        />
      )}
      {settings && (
        <StoryboardSettingsDialog
          mode={settings}
          initial={initialSettings[settings]}
          onClose={() => setSettings(null)}
          onApply={applySettings}
        />
      )}
      {removing && (
        <ModalShell label="删除分镜" onClose={() => setRemoving(null)}>
          <div className={styles.editor}>
            <header className={styles.editorHeader}>
              <h2>删除分镜</h2>
            </header>
            <div className={styles.editorBody}>
              <p>确定删除选中的 {removing.length} 个演示分镜？</p>
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
                onClick={() => setRemoving(null)}
              >
                取消
              </button>
              <button type="button" className={styles.dangerButton} onClick={remove}>
                删除
              </button>
            </footer>
          </div>
        </ModalShell>
      )}
    </>
  );
}
