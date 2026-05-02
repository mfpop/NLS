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
const ApplicationSettingsPage = lazy(() =>
  import("@/pages/system").then((module) => ({ default: module.ApplicationSettingsPage }))
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
          <Route path="execution/line-performance" element={<LinePerformancePage />} />
          <Route path="execution/live-shopfloor" element={<LiveShopfloorPage />} />
          <Route path="execution/vsm" element={<VsmPage />} />
          <Route path="execution/daily-gemba-walk" element={<DailyGembaWalkPage />} />
          <Route path="check/problems" element={<ProblemsPage />} />
          <Route path="check/actions" element={<ActionsPage />} />
          <Route path="improve/kaizen" element={<KaizenPage />} />
          <Route path="improve/standard-work" element={<StandardWorkPage />} />
          <Route path="system/data-management" element={<DataManagementPage />} />
          <Route path="system/application-settings" element={<ApplicationSettingsPage />} />
          <Route path="status" element={<GraphqlStatusPage />} />
          <Route path="docs" element={<DocumentationCenter />} />
          <Route path="home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
