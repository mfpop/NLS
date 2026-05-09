import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { LoginPage } from "@/auth/LoginPage";
import { ProtectedRoute } from "@/auth/ProtectedRoute";

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
const ProductionFlow = lazy(() =>
  import("@/pages/system").then((module) => ({ default: module.ProductionFlow }))
);
const ProductionComponents = lazy(() =>
  import("@/pages/system").then((module) => ({ default: module.ProductionComponents }))
);
const ReferencesPage = lazy(() =>
  import("@/pages/system").then((module) => ({ default: module.ReferencesPage }))
);
const EntityVisualSettingsPage = lazy(() =>
  import("@/pages/system").then((module) => ({ default: module.EntityVisualSettingsPage }))
);
const StructurePage = lazy(() =>
  import("@/pages/system").then((module) => ({ default: module.StructurePage }))
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
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
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
          <Route path="standardize/standard-work" element={<StandardWorkPage />} />
          <Route path="system/production-structure" element={<ProductionFlow />} />
                    <Route path="system/production-structure/flow" element={<ProductionFlow />} />
                    <Route path="system/production-structure/components" element={<ProductionComponents />} />
          <Route path="system/production-structure/references" element={<ReferencesPage />} />
          <Route path="system/production-structure/references/:tableId" element={<ReferencesPage />} />
          <Route path="system/production-structure/structure" element={<StructurePage />} />
          <Route path="system/reference-tables" element={<ReferencesPage />} />
          <Route path="system/reference-tables/:tableId" element={<ReferencesPage />} />
          <Route path="system/entity-visual-settings" element={<EntityVisualSettingsPage />} />
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
