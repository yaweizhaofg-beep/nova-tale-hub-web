import { lazy } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import type { SpaceKind } from '@/enums/space-kind';
import NotFoundPage from "@/pages/not-found/not-found-page";
import LandingPage from '@/pages/LandingPage';
import type { Nav, PageId, RoutePage } from './page-location';

const AuthPage = lazy(() =>
  import('@/pages/AuthPage').then((module) => ({ default: module.AuthPage })),
);
const RegisterPage = lazy(() =>
  import('@/pages/RegisterPage').then((module) => ({ default: module.RegisterPage })),
);
const OnboardingPage = lazy(() =>
  import('@/pages/OnboardingPage').then((module) => ({ default: module.OnboardingPage })),
);
const NewProjectPage = lazy(() =>
  import('@/pages/NewProjectPage').then((module) => ({ default: module.NewProjectPage })),
);
const StoryboardShotsPage = lazy(() => import('@/pages/storyboard/StoryboardShotsPage'));
const UserCenterPage = lazy(() => import('@/pages/UserCenterPage'));
const CanvasPage = lazy(() => import('@/pages/CanvasPage'));
const CanvasListPage = lazy(() => import('@/pages/CanvasListPage'));
const CostConfirmPage = lazy(() => import('@/pages/CostConfirmPage'));
const TeamPage = lazy(() => import('@/pages/TeamPage'));
const BatchPage = lazy(() => import('@/pages/BatchPage'));
const ResultPage = lazy(() => import('@/pages/ResultPage'));
const DeliveryPage = lazy(() => import('@/pages/DeliveryPage'));
const UpgradePage = lazy(() => import('@/pages/UpgradePage'));
const TeamAssetsPage = lazy(() => import('@/pages/TeamAssetsPage'));
const BillingPage = lazy(() => import('@/pages/BillingPage'));
const MembershipPage = lazy(() => import('@/pages/MembershipPage'));
const TaskRecordsPage = lazy(() => import('@/pages/TaskRecordsPage'));
const ToolsPage = lazy(() =>
  import('@/pages/tools/tools-page').then((module) => ({ default: module.ToolsPage })),
);
const WorkspacePage = lazy(() =>
  import('@/pages/workspace/workspace-page').then((module) => ({ default: module.WorkspacePage })),
);
const ProjectListPage = lazy(() =>
  import('@/pages/projects/project-list-page').then((module) => ({
    default: module.ProjectListPage,
  })),
);

interface PageRoutesProps extends Nav {
  page: RoutePage;
  params: URLSearchParams;
  currentSpace: SpaceKind;
  onSpacePick: (page?: PageId) => void;
}

export function PageRoutes({ page, params, currentSpace, navigate, onSpacePick }: PageRoutesProps) {
  const location = useLocation();
  const workspace = (
    <WorkspacePage navigate={navigate} onSpacePick={onSpacePick} currentSpace={currentSpace} />
  );
  const assets = <TeamAssetsPage navigate={navigate} />;
  const team = <TeamPage navigate={navigate} />;

  // The query-based public URLs also work under the GitHub Pages project subpath.
  return (
    <Routes location={{ ...location, pathname: '/' + page }}>
      <Route path="/landing" element={<LandingPage navigate={navigate} />} />
      <Route path="/login" element={<AuthPage navigate={navigate} />} />
      <Route path="/register" element={<RegisterPage navigate={navigate} />} />
      <Route path="/onboarding" element={<OnboardingPage navigate={navigate} />} />
      <Route path="/workspace" element={workspace} />
      <Route
        path="/projects"
        element={
          params.get('kind') === 'canvas' ? (
            <CanvasListPage key={currentSpace} navigate={navigate} />
          ) : (
            <ProjectListPage navigate={navigate} onSpacePick={onSpacePick} />
          )
        }
      />
      <Route path="/new-project" element={<NewProjectPage navigate={navigate} />} />
      <Route
        path="/storyboard-shots"
        element={
          <StoryboardShotsPage
            key={params.get('storyboardId')}
            storyboardId={params.get('storyboardId')}
            navigate={navigate}
          />
        }
      />
      <Route
        path="/canvas"
        element={
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <CanvasPage
              key={currentSpace + ':' + (params.get('canvas') ?? '')}
              navigate={navigate}
            />
          </div>
        }
      />
      <Route path="/tools" element={<ToolsPage />} />
      <Route path="/team" element={team} />
      <Route path="/team-tasks" element={team} />
      <Route path="/my-tasks" element={<TaskRecordsPage navigate={navigate} space="personal" />} />
      <Route path="/team-assets" element={assets} />
      <Route path="/assets" element={assets} />
      <Route path="/batch" element={<BatchPage navigate={navigate} />} />
      <Route path="/result" element={<ResultPage navigate={navigate} space={currentSpace} />} />
      <Route path="/delivery" element={<DeliveryPage navigate={navigate} />} />
      <Route path="/upgrade" element={<UpgradePage navigate={navigate} />} />
      <Route path="/cost-confirm" element={<CostConfirmPage navigate={navigate} />} />
      <Route
        path="/billing"
        element={<BillingPage key={currentSpace} navigate={navigate} space={currentSpace} />}
      />
      <Route
        path="/membership"
        element={<MembershipPage key={currentSpace} currentSpace={currentSpace} />}
      />
      <Route
        path="/user-center"
        element={
          <UserCenterPage key={currentSpace} navigate={navigate} currentSpace={currentSpace} />
        }
      />
      <Route path="*" element={<NotFoundPage navigate={navigate} />} />
    </Routes>
  );
}
