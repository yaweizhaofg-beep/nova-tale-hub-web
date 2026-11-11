import { Suspense, useState, useCallback, useEffect } from 'react';
import { usePageNavigation } from './router/use-page-navigation';
import type { Nav, PageId } from './router/page-location';
import { PageSearchContext } from './router/page-search';
import { TASK_CONTEXT_PAGES, TASK_CONTEXT_PARAMS } from './router/page-location';
import { PageRoutes } from './router/page-routes';
import { useWorkspaceStore } from './features/workspace/workspace-store';
import { SpacePickerModal } from './app/shell/space-picker';
import { Sidebar } from './app/shell/sidebar';
import { HelpPopup } from './app/shell/help-popup';
import { AppHeader } from './app/shell/app-header';
import { QRModal } from './app/shell/service-dialog';
import TaskNotifications, { notificationTasks } from './components/TaskNotifications';
import SupportWidget from './components/SupportWidget';
import './styles/studio.css';

export default function App() {
  const { currentPage, navigate: routeTo, params, setSearch } = usePageNavigation();
  const currentSpace = useWorkspaceStore((state) => state.currentSpace);
  const selectSpace = useWorkspaceStore((state) => state.selectSpace);
  const [showSpacePicker, setShowSpacePicker] = useState(false);
  const [pendingNav, setPendingNav] = useState<PageId | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [readNoticeIds, setReadNoticeIds] = useState<Set<string>>(new Set());
  const [helpOpen, setHelpOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const openSpacePicker = (dest?: PageId) => {
    setPendingNav(dest ?? null);
    setShowSpacePicker(true);
  };
  const confirmSpace = (s: 'personal' | 'team') => {
    const required =
      pendingNav === 'my-tasks'
        ? 'personal'
        : pendingNav === 'team' || pendingNav === 'team-tasks'
          ? 'team'
          : null;
    if (required && required !== s) return;
    selectSpace(s);
    setShowSpacePicker(false);
    setPendingNav(null);
    if (pendingNav && pendingNav !== currentPage) navigate(pendingNav);
    else if (!pendingNav && s !== currentSpace && currentPage !== "not-found" && TASK_CONTEXT_PAGES.has(currentPage))
      navigate('workspace');
  };

  const navigate = useCallback<Nav['navigate']>(
    (page, extra) => {
      setNotifOpen(false);
      setHelpOpen(false);
      routeTo(page, extra);
    },
    [routeTo],
  );

  /**
   * 团队管理仅在团队空间下有数据。
   * 从个人空间进入团队页时，先确认切换到团队空间。
   */
  const navWithSpace = useCallback(
    (page: PageId) => {
      if (
        ((page === 'team' || page === 'team-tasks') && currentSpace !== 'team') ||
        (page === 'my-tasks' && currentSpace !== 'personal')
      ) {
        setPendingNav(page);
        setShowSpacePicker(true);
        return;
      }
      if (page !== currentPage) {
        const cleared = Object.fromEntries(TASK_CONTEXT_PARAMS.map((key) => [key, null]));
        navigate(page, cleared);
      }
    },
    [currentPage, currentSpace, navigate],
  );

  /**
   * 直接以 ?page=team 打开时，若当前是个人空间，先弹出空间确认。
   */
  const requiredSpace =
    currentPage === 'team' || currentPage === 'team-tasks'
      ? 'team'
      : currentPage === 'my-tasks'
        ? 'personal'
        : null;
  useEffect(() => {
    if (requiredSpace && currentSpace !== requiredSpace) {
      if (currentPage !== 'not-found') setPendingNav(currentPage);
      setShowSpacePicker(true);
    }
  }, [currentPage, currentSpace, requiredSpace]);

  const isAppShell =
    currentPage !== 'landing' &&
    currentPage !== 'register' &&
    currentPage !== 'not-found' &&
    currentPage !== 'onboarding' &&
    currentPage !== 'login' &&
    currentPage !== 'upgrade' &&
    currentPage !== 'storyboard-shots' &&
    currentPage !== 'canvas';

  const unread = notificationTasks(currentSpace).filter(
    (task) => !readNoticeIds.has(currentSpace + ':' + task.taskId),
  ).length;

  const page = (
    <PageSearchContext.Provider value={setSearch}>
      <Suspense fallback={null}>
        <PageRoutes
          page={currentPage}
          params={params}
          navigate={navigate}
          currentSpace={currentSpace}
          onSpacePick={openSpacePicker}
        />
      </Suspense>
    </PageSearchContext.Provider>
  );

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#090A0E',
        overflow: 'hidden',
      }}
    >
      {isAppShell ? (
        <>
          <div className="studio-shell" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <Sidebar
              currentPage={currentPage}
              currentSpace={currentSpace}
              onNavigate={navWithSpace}
              onSpacePick={() => openSpacePicker()}
              onNotifToggle={() => {
                setNotifOpen((o) => !o);
                setHelpOpen(false);
              }}
              onHelpToggle={() => {
                setHelpOpen((o) => !o);
                setNotifOpen(false);
              }}
              unread={unread}
              serviceOpen={serviceOpen}
            />
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: '#090A0E',
                minWidth: 0,
              }}
            >
              <AppHeader
                currentSpace={currentSpace}
                onMembership={() => navigate('membership')}
                onSpacePick={() => openSpacePicker()}
              />
              <main
                className="studio-main"
                data-page={currentPage}
                style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
              >
                {(!requiredSpace || requiredSpace === currentSpace) && page}
              </main>
            </div>
          </div>

          {showSpacePicker && (
            <SpacePickerModal
              currentSpace={currentSpace}
              onConfirm={confirmSpace}
              onClose={() => {
                setShowSpacePicker(false);
                setPendingNav(null);
                if (requiredSpace && requiredSpace !== currentSpace) navigate('workspace');
              }}
            />
          )}
          {notifOpen && (
            <TaskNotifications
              scope={currentSpace}
              readIds={readNoticeIds}
              onRead={(ids) => setReadNoticeIds((current) => new Set([...current, ...ids]))}
              onClose={() => setNotifOpen(false)}
              navigate={navigate}
            />
          )}
          {helpOpen && (
            <HelpPopup
              onClose={() => setHelpOpen(false)}
              onOpenService={() => setServiceOpen(true)}
              onOpenFeedback={() => setFeedbackOpen(true)}
            />
          )}
          {serviceOpen && <QRModal onClose={() => setServiceOpen(false)} />}
        </>
      ) : (
        page
      )}
      <SupportWidget requested={feedbackOpen} onHandled={() => setFeedbackOpen(false)} />
    </div>
  );
}
