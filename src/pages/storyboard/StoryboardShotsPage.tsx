import { useState } from 'react';
import { ArrowLeft, Clapperboard } from 'lucide-react';
import {
  readDemoStoryboard,
  saveDemoStoryboard,
  type DemoStoryboard,
} from '@/features/storyboard/demo-storyboard';
import type { Nav } from '@/router/page-location';
import { StoryboardFileActions } from './StoryboardFileActions';
import { StoryboardWorkbench } from './StoryboardWorkbench';
import styles from './storyboard-shots.module.css';

interface StoryboardShotsPageProps extends Nav {
  storyboardId: string | null;
}

export default function StoryboardShotsPage({ storyboardId, navigate }: StoryboardShotsPageProps) {
  const [storyboard, setStoryboard] = useState(() => readDemoStoryboard(storyboardId));
  const [assetsCollapsed, setAssetsCollapsed] = useState(false);

  if (!storyboard) {
    return (
      <main className={`studio-shell ${styles.page} ${styles.emptyPage}`}>
        <section className={styles.empty}>
          <Clapperboard size={26} aria-hidden="true" />
          <h1>分镜草稿不可用</h1>
          <p>请从新建剧目开始拆分。演示草稿仅保存在当前浏览器标签页的会话中。</p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => navigate('new-project')}
          >
            返回新建剧目
          </button>
        </section>
      </main>
    );
  }

  function commit(next: DemoStoryboard) {
    saveDemoStoryboard(next);
    setStoryboard(next);
  }

  return (
    <main className={`studio-shell ${styles.page}`}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.backButton}`}
            aria-label="返回剧目创作"
            title="返回剧目创作"
            onClick={() => navigate('projects')}
          >
            <ArrowLeft size={16} aria-hidden="true" />
          </button>
          <div className={styles.projectIdentity}>
            <h1>分镜管理</h1>
            <span className={styles.projectName} title={storyboard.name}>
              {storyboard.name}
            </span>
          </div>
          <span className={styles.demoBadge}>演示模式</span>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.controlLabel}>
            生成线路 <span className={styles.routeLabel}>演示线路</span>
          </span>
          <StoryboardFileActions storyboard={storyboard} onSave={commit} />
        </div>
      </header>
      <StoryboardWorkbench
        storyboard={storyboard}
        assetsCollapsed={assetsCollapsed}
        onAssetsCollapsedChange={setAssetsCollapsed}
        onSave={commit}
      />
    </main>
  );
}
