import type { ReactNode } from 'react';
import { Box, Check, Image, Layers, Pencil, Plus, Search, UserRound, Video, X } from 'lucide-react';
import ProjectCover from '@/components/ProjectCover';
import {
  ASSET_KINDS,
  type AssetKind,
  type DemoAsset,
  type ShotFields,
  type VideoRecord,
} from '@/features/storyboard/demo-storyboard';
import { DEMO_POSTER_URL, DEMO_VIDEO_URL } from '@/features/storyboard/demo-storyboard-media';
import styles from './storyboard-shots.module.css';

const assetIcons = { 角色: UserRound, 场景: Image, 道具: Box };

export function AssetThumb({ asset }: { asset: DemoAsset }) {
  const Icon = assetIcons[asset.kind];
  let thumb: ReactNode = <Icon size={20} />;
  if (asset.image) thumb = <img src={asset.image} alt="" loading="lazy" />;
  else if (asset.cover) thumb = <ProjectCover name={asset.cover} />;
  return (
    <span className={styles.assetThumb} data-kind={asset.kind} aria-hidden="true">
      {thumb}
    </span>
  );
}

export function StoryboardAssetPanel({
  id,
  hidden,
  kind,
  shotId,
  linkedIds,
  query,
  onQueryChange,
  onKindChange,
  onToggle,
  assets,
  onCreate,
  onEdit,
  onCompliance,
}: {
  id: string;
  hidden: boolean;
  kind: AssetKind;
  shotId: number | null;
  linkedIds: readonly string[];
  query: string;
  onQueryChange: (query: string) => void;
  onKindChange: (kind: AssetKind) => void;
  onToggle: (id: string) => void;
  assets: DemoAsset[];
  onCreate: () => void;
  onEdit: (asset: DemoAsset) => void;
  onCompliance: () => void;
}) {
  const visible = assets.filter(
    (asset) => asset.kind === kind && asset.name.includes(query.trim()),
  );

  return (
    <aside
      ref={(node) => {
        if (node) node.inert = hidden;
      }}
      id={id}
      hidden={hidden}
      aria-hidden={hidden || undefined}
      className={`${styles.sidePanel} ${styles.assetPanel}`}
      aria-label="素材库"
    >
      <div className={styles.sideHeader}>
        <div className={styles.sideTitle}>
          <span className={styles.libraryIcon}>
            <Layers size={16} aria-hidden="true" />
          </span>
          <div className={styles.libraryTitle}>
            <h2>素材库</h2>
            <span>管理分镜的关联素材</span>
          </div>
          <button type="button" className={styles.subtleButton} onClick={onCompliance}>
            图片合规检验
          </button>
        </div>
        <div className={styles.shotContext}>
          {shotId === null ? (
            <span>请先选择分镜</span>
          ) : (
            <>
              <span>
                当前分镜 <strong>{String(shotId).padStart(2, '0')}</strong>
              </span>
              <span>已关联 {linkedIds.length} 项</span>
            </>
          )}
        </div>
        <div className={styles.assetTabs} role="group" aria-label="素材分类">
          {ASSET_KINDS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={kind === item}
              onClick={() => onKindChange(item)}
            >
              {item} <span>{assets.filter((asset) => asset.kind === item).length}</span>
            </button>
          ))}
        </div>
        <div className={styles.assetSearch}>
          <Search size={15} aria-hidden="true" />
          <input
            className={styles.search}
            aria-label="搜索素材名称"
            placeholder="搜索素材名称"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query && (
            <button
              type="button"
              className={styles.iconButton}
              aria-label="清除素材搜索"
              onClick={() => onQueryChange('')}
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <div className={styles.assetBody}>
        <div className={styles.librarySection}>
          <strong>{kind}</strong>
          <span>{visible.length} 项</span>
          <button type="button" className={styles.subtleButton} onClick={onCreate}>
            <Plus size={14} aria-hidden="true" /> 创建资产
          </button>
        </div>
        {visible.length ? (
          <div className={styles.libraryList}>
            {visible.map((asset) => {
              const linked = linkedIds.includes(asset.id);
              return (
                <div key={asset.id} className={styles.libraryItem} data-linked={linked}>
                  <button
                    type="button"
                    className={styles.assetCard}
                    aria-label={asset.name}
                    aria-pressed={linked}
                    disabled={shotId === null}
                    onClick={() => onToggle(asset.id)}
                  >
                    <AssetThumb asset={asset} />
                    <span className={styles.libraryAssetName} title={asset.name}>
                      {asset.name}
                    </span>
                    <span className={styles.libraryAssetState}>
                      {linked ? (
                        <>
                          <Check size={13} aria-hidden="true" /> 已关联
                        </>
                      ) : (
                        <Plus size={15} aria-hidden="true" />
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={'编辑素材 ' + asset.name}
                    title="编辑素材"
                    onClick={() => onEdit(asset)}
                  >
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.libraryEmpty}>没有匹配的素材</p>
        )}
      </div>
    </aside>
  );
}

export function StoryboardVideoPanel({
  shotId,
  fields,
  reference,
  record,
  onClose,
  onHistory,
  onPlayback,
}: {
  shotId: number;
  fields: ShotFields;
  reference: boolean;
  record?: VideoRecord;
  onClose: () => void;
  onHistory: () => void;
  onPlayback: () => void;
}) {
  return (
    <aside className={styles.sidePanel} aria-label="视频详情">
      <div className={styles.sideHeader}>
        <div className={styles.sideTitle}>
          <h2>视频详情</h2>
          <button
            type="button"
            className={styles.subtleButton}
            aria-label="返回素材库"
            onClick={onClose}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
        <p className={styles.sideHint}>
          第 {shotId} 镜 · {reference ? '参考视频' : '视频记录'}
        </p>
      </div>
      <div className={styles.assetBody}>
        <video
          className={styles.video}
          controls
          playsInline
          preload="none"
          poster={reference && fields.referenceClip ? undefined : DEMO_POSTER_URL}
          src={reference ? (fields.referenceClip?.url ?? DEMO_VIDEO_URL) : DEMO_VIDEO_URL}
        />
        <p className={styles.sideHint}>
          {reference ? (
            (fields.referenceClip?.name ?? '本地样片')
          ) : (
            <>
              本地样片 · {record?.durationSeconds ?? fields.durationSeconds} 秒 ·{' '}
              {record?.ratio ?? fields.ratio} · {record?.resolution ?? fields.resolution}
            </>
          )}
        </p>
        <p className={styles.videoPrompt}>
          <Video size={14} aria-hidden="true" />
          {record?.prompt || fields.prompt || '暂无描述词'}
        </p>
        {!reference && (
          <div className={styles.videoPanelActions}>
            <button type="button" className={styles.subtleButton} onClick={onHistory}>
              视频历史
            </button>
            {record && (
              <button type="button" className={styles.primaryButton} onClick={onPlayback}>
                大屏播放
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

export function AssetLinks({
  kind,
  assetsById,
  ids,
  onOpen,
}: {
  kind: AssetKind;
  assetsById: ReadonlyMap<string, DemoAsset>;
  ids: readonly string[];
  onOpen: () => void;
}) {
  const linked = ids
    .map((id) => assetsById.get(id))
    .filter((asset): asset is DemoAsset => asset?.kind === kind);
  const shown = linked.slice(0, 2);
  const remaining = linked.slice(shown.length);
  const names = linked.map((asset) => asset.name).join('、');
  return (
    <div className={styles.assetLinks}>
      <div className={styles.assetStrip}>
        {shown.map((asset) => (
          <button
            key={asset.id}
            type="button"
            className={styles.linkedAsset}
            aria-label={asset.name}
            title={asset.name}
            onClick={onOpen}
          >
            <AssetThumb asset={asset} />
          </button>
        ))}
        {remaining.length > 0 && (
          <button
            type="button"
            className={styles.assetOverflow}
            aria-label={`查看其余 ${remaining.length} 个${kind}`}
            title={remaining.map((asset) => asset.name).join('、')}
            onClick={onOpen}
          >
            +{remaining.length}
          </button>
        )}
        <button
          type="button"
          className={styles.addAsset}
          aria-label={`添加${kind}`}
          title={`添加${kind}`}
          onClick={onOpen}
        >
          <Plus size={14} aria-hidden="true" />
        </button>
      </div>
      <span className={styles.assetSummary} title={names || undefined}>
        {names || '未关联'}
      </span>
    </div>
  );
}
