import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";

const ControlTowerPage = lazy(() =>
  import("@/pages/control-tower").then((module) => ({ default: module.ControlTowerPage }))
);
const GraphqlStatusPage = lazy(() =>
  import("@/pages/graphql-status").then((module) => ({ default: module.GraphqlStatusPage }))
);
const LinePerformancePage = lazy(() =>
  import("@/pages/execution").then((module) => ({ default: module.LinePerformancePage }))
);
const LiveShopfloorPage = lazy(() =>
  import("@/pages/execution").then((module) => ({ default: module.LiveShopfloorPage }))
);
const VsmPage = lazy(() =>
  import("@/pages/execution").then((module) => ({ default: module.VsmPage }))
);
const DailyGembaWalkPage = lazy(() =>
  import("@/pages/execution").then((module) => ({ default: module.DailyGembaWalkPage }))
);
const ProblemsPage = lazy(() =>
  import("@/pages/check").then((module) => ({ default: module.ProblemsPage }))
);
const ActionsPage = lazy(() =>
  import("@/pages/check").then((module) => ({ default: module.ActionsPage }))
);
const KaizenPage = lazy(() =>
  import("@/pages/improve").then((module) => ({ default: module.KaizenPage }))
);
const StandardWorkPage = lazy(() =>
  import("@/pages/improve").then((module) => ({ default: module.StandardWorkPage }))
);
const DataManagementPage = lazy(() =>
  import("@/pages/system").then((module) => ({ default: module.DataManagementPage }))
);
const PlantStructurePage = lazy(() =>
  import("@/pages/system").then((module) => ({ default: module.PlantStructurePage }))
);
const PlantDetailPage = lazy(() =>
  import("@/pages/system").then((module) => ({ default: module.PlantDetailPage }))
);
const DepartmentsPage = lazy(() =>
  import("@/pages/system").then((module) => ({ default: module.DepartmentsPage }))
);
const ResourceGroupsPage = lazy(() =>
  import("@/pages/system").then((module) => ({ default: module.ResourceGroupsPage }))
);
const ResourcesPage = lazy(() =>
  import("@/pages/system").then((module) => ({ default: module.ResourcesPage }))
);
const ReferencesPage = lazy(() =>
  import("@/pages/system").then((module) => ({ default: module.ReferencesPage }))
);
const StructurePage = lazy(() =>
  import("@/pages/system").then((module) => ({ default: module.StructurePage }))
);
const ProductionLinesPage = lazy(() =>
  import("@/pages/system/data-management/ProductionLinesPage").then((module) => ({ default: module.ProductionLinesPage }))
);
const ApplicationSettingsPage = lazy(() =>
  import("@/pages/system").then((module) => ({ default: module.ApplicationSettingsPage }))
);
const UserProfilePage = lazy(() =>
  import("@/pages/system").then((module) => ({ default: module.UserProfilePage }))
);
const UserPreferencesPage = lazy(() =>
  import("@/pages/system").then((module) => ({ default: module.UserPreferencesPage }))
);
const SignOutPage = lazy(() =>
  import("@/pages/system").then((module) => ({ default: module.SignOutPage }))
);
const MyDashboardPage = lazy(() =>
  import("@/pages/myworkspace").then((module) => ({ default: module.MyDashboardPage }))
);
const MyTasksPage = lazy(() =>
  import("@/pages/myworkspace").then((module) => ({ default: module.MyTasksPage }))
);
const DocumentationCenter = lazy(() =>
  import("@/pages/DocumentationCenter").then((module) => ({ default: module.DocumentationCenter }))
);
const NotFoundPage = lazy(() =>
  import("@/pages/not-found").then((module) => ({ default: module.NotFoundPage }))
);

function RouteLoader() {
  return <p>Loading page...</p>;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route element={<AppShell />}>
                    <Route index element={<ControlTowerPage />} />
          <Route path="control-tower" element={<ControlTowerPage />} />
          <Route path="home" element={<Navigate to="/control-tower" replace />} />
          <Route path="myworkspace/dashboard" element={<MyDashboardPage />} />
          <Route path="myworkspace/tasks" element={<MyTasksPage />} />
          <Route path="execution/line-performance" element={<LinePerformancePage />} />
          <Route path="execution/live-shopfloor" element={<LiveShopfloorPage />} />
          <Route path="execution/vsm" element={<VsmPage />} />
          <Route path="execution/daily-gemba-walk" element={<DailyGembaWalkPage />} />
          <Route path="check/problems" element={<ProblemsPage />} />
          <Route path="check/actions" element={<ActionsPage />} />
          <Route path="improve/kaizen" element={<KaizenPage />} />
          <Route path="improve/standard-work" element={<StandardWorkPage />} />
          <Route path="system/data-management" element={<DataManagementPage />} />
                    <Route path="system/data-management/plant" element={<PlantStructurePage />} />
                    <Route path="system/data-management/plant/:plantId" element={<PlantDetailPage />} />
          <Route path="system/data-management/departments" element={<DepartmentsPage />} />
          <Route path="system/data-management/departments/:deptId" element={<DepartmentsPage />} />
          <Route path="system/data-management/resource-groups" element={<ResourceGroupsPage />} />
                    <Route path="system/data-management/resource-groups/:groupId" element={<ResourceGroupsPage />} />
          <Route path="system/data-management/resources" element={<ResourcesPage />} />
          <Route path="system/data-management/resources/:resourceId" element={<ResourcesPage />} />
          <Route path="system/data-management/references" element={<ReferencesPage />} />
          <Route path="system/data-management/references/:tableId" element={<ReferencesPage />} />
          <Route path="system/data-management/structure" element={<StructurePage />} />
          <Route path="system/data-management/production-lines" element={<ProductionLinesPage />} />
          <Route path="system/data-management/production-lines/:lineId" element={<ProductionLinesPage />} />
          <Route path="system/application-settings" element={<ApplicationSettingsPage />} />
          <Route path="system/profile" element={<UserProfilePage />} />
          <Route path="system/preferences" element={<UserPreferencesPage />} />
          <Route path="system/sign-out" element={<SignOutPage />} />
          <Route path="status" element={<GraphqlStatusPage />} />
          <Route path="docs" element={<Navigate to="/docs/setup" replace />} />
          <Route path="docs/core" element={<DocumentationCenter />} />
          <Route path="docs/core/:docSlug" element={<DocumentationCenter />} />
          <Route path="docs/setup" element={<DocumentationCenter />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
