import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { LoginPage } from "@/auth/LoginPage";
import { ProtectedRoute } from "@/auth/ProtectedRoute";

const ControlTowerPage = lazy(() =>
  import("@/pages/control-tower/ControlTowerPage").then((module) => ({ default: module.ControlTowerPage }))
);
const GraphqlStatusPage = lazy(() =>
  import("@/pages/graphql-status/GraphqlStatusPage").then((module) => ({ default: module.GraphqlStatusPage }))
);
const LinePerformancePage = lazy(() =>
  import("@/pages/execution/LinePerformancePage").then((module) => ({ default: module.LinePerformancePage }))
);
const LiveShopfloorPage = lazy(() =>
  import("@/pages/execution/LiveShopfloorPage").then((module) => ({ default: module.LiveShopfloorPage }))
);
const VsmPage = lazy(() =>
  import("@/pages/execution/VsmPage").then((module) => ({ default: module.VsmPage }))
);
const DailyGembaWalkPage = lazy(() =>
  import("@/pages/execution/DailyGembaWalkPage").then((module) => ({ default: module.DailyGembaWalkPage }))
);
const ProblemsPage = lazy(() =>
  import("@/pages/check/ProblemsPage").then((module) => ({ default: module.ProblemsPage }))
);
const ActionsPage = lazy(() =>
  import("@/pages/check/ActionsPage").then((module) => ({ default: module.ActionsPage }))
);
const AuditsPage = lazy(() =>
  import("@/pages/check/AuditsPage").then((module) => ({ default: module.AuditsPage }))
);
const CapacityPage = lazy(() =>
  import("@/pages/plan/CapacityPage").then((module) => ({ default: module.CapacityPage }))
);
const ContinuousImprovementPage = lazy(() =>
  import("@/pages/improve/ContinuousImprovementPage").then((module) => ({ default: module.ContinuousImprovementPage }))
);
const KaizenPage = lazy(() =>
  import("@/pages/improve/KaizenPage").then((module) => ({ default: module.KaizenPage }))
);
const BestPracticesPage = lazy(() =>
  import("@/pages/standardize/BestPracticesPage").then((module) => ({ default: module.BestPracticesPage }))
);
const ProceduresPage = lazy(() =>
  import("@/pages/standardize/ProceduresPage").then((module) => ({ default: module.ProceduresPage }))
);
const ProductionPlanPage = lazy(() =>
  import("@/pages/plan/ProductionPlanPage").then((module) => ({ default: module.ProductionPlanPage }))
);
const QualityPage = lazy(() =>
  import("@/pages/check/QualityPage").then((module) => ({ default: module.QualityPage }))
);
const SuggestionsPage = lazy(() =>
  import("@/pages/improve/SuggestionsPage").then((module) => ({ default: module.SuggestionsPage }))
);
const TemplatesPage = lazy(() =>
  import("@/pages/standardize/TemplatesPage").then((module) => ({ default: module.TemplatesPage }))
);
const StandardWorkPage = lazy(() =>
  import("@/pages/improve/StandardWorkPage").then((module) => ({ default: module.StandardWorkPage }))
);
const ProductionFlow = lazy(() =>
  import("@/pages/system/ProductionStructurePage").then((module) => ({ default: module.ProductionFlow }))
);
const ProductionFlowLayout = lazy(() =>
  import("@/pages/system/production-structure/ProductionFlowLayout").then((module) => ({ default: module.ProductionFlowLayout }))
);
const ProductionComponentsLayout = lazy(() =>
  import("@/pages/system/production-structure/components/ProductionComponentsLayout").then((module) => ({ default: module.ProductionComponentsLayout }))
);
const ProductionComponentsCompany = lazy(() =>
  import("@/pages/system/production-structure/ProductionComponentsCompany").then((module) => ({ default: module.ProductionComponentsCompany }))
);
const ProductionComponentsPlants = lazy(() =>
  import("@/pages/system/production-structure/ProductionComponentsPlants").then((module) => ({ default: module.ProductionComponentsPlants }))
);
const ProductionComponentsProductionLines = lazy(() =>
  import("@/pages/system/production-structure/ProductionComponentsProductionLines").then((module) => ({ default: module.ProductionComponentsProductionLines }))
);
const ProductionComponentsDepartments = lazy(() =>
  import("@/pages/system/production-structure/ProductionComponentsDepartments").then((module) => ({ default: module.ProductionComponentsDepartments }))
);
const ProductionComponentsResourceGroup = lazy(() =>
  import("@/pages/system/production-structure/ProductionComponentsResourceGroup").then((module) => ({ default: module.ProductionComponentsResourceGroup }))
);
const ProductionComponentsResources = lazy(() =>
  import("@/pages/system/production-structure/ProductionComponentsResources").then((module) => ({ default: module.ProductionComponentsResources }))
);
const RoutingEditorPage = lazy(() =>
  import("@/pages/system/production-structure/RoutingEditorPage").then((module) => ({ default: module.RoutingEditorPage }))
);
const PlantsPage = lazy(() =>
  import("@/pages/system/production-structure/PlantsPage").then((module) => ({ default: module.PlantsPage }))
);
const DepartmentsPage = lazy(() =>
  import("@/pages/system/production-structure/DepartmentsPage").then((module) => ({ default: module.DepartmentsPage }))
);
const ResourceGroupsPage = lazy(() =>
  import("@/pages/system/production-structure/ResourceGroupsPage").then((module) => ({ default: module.ResourceGroupsPage }))
);
const ResourcesPage = lazy(() =>
  import("@/pages/system/production-structure/ResourcesPage").then((module) => ({ default: module.ResourcesPage }))
);
const ReferencesPage = lazy(() =>
  import("@/pages/system/production-structure/ReferencesPage").then((module) => ({ default: module.ReferencesPage }))
);
const EntityVisualSettingsPage = lazy(() =>
  import("@/pages/system/production-structure/EntityVisualSettingsPage").then((module) => ({ default: module.EntityVisualSettingsPage }))
);
const StructurePage = lazy(() =>
  import("@/pages/system/production-structure/StructurePage").then((module) => ({ default: module.StructurePage }))
);
const ApplicationSettingsPage = lazy(() =>
  import("@/pages/system/ApplicationSettingsPage").then((module) => ({ default: module.ApplicationSettingsPage }))
);
const UserProfilePage = lazy(() =>
  import("@/pages/system/UserProfilePage").then((module) => ({ default: module.UserProfilePage }))
);
const UserPreferencesPage = lazy(() =>
  import("@/pages/system/UserPreferencesPage").then((module) => ({ default: module.UserPreferencesPage }))
);
const SignOutPage = lazy(() =>
  import("@/pages/system/SignOutPage").then((module) => ({ default: module.SignOutPage }))
);
const MyDashboardPage = lazy(() =>
  import("@/pages/myworkspace/MyDashboardPage").then((module) => ({ default: module.MyDashboardPage }))
);
const MyTasksPage = lazy(() =>
  import("@/pages/myworkspace/MyTasksPage").then((module) => ({ default: module.MyTasksPage }))
);
const DocumentationCenter = lazy(() =>
  import("@/pages/DocumentationCenter/DocumentationCenter").then((module) => ({ default: module.DocumentationCenter }))
);
const NotFoundPage = lazy(() =>
  import("@/pages/not-found/NotFoundPage").then((module) => ({ default: module.NotFoundPage }))
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
          <Route path="plan/production-plan" element={<ProductionPlanPage />} />
          <Route path="plan/capacity" element={<CapacityPage />} />
          <Route path="plan/capacity/load" element={<CapacityPage />} />
          <Route path="plan/capacity/yamazumi" element={<CapacityPage />} />
          <Route path="plan/capacity/constraints" element={<CapacityPage />} />
          <Route path="plan/capacity/scenarios" element={<CapacityPage />} />
          <Route path="check/problems" element={<ProblemsPage />} />
          <Route path="check/actions" element={<ActionsPage />} />
          <Route path="check/audits" element={<AuditsPage />} />
          <Route path="check/quality" element={<QualityPage />} />
          <Route path="improve/kaizen" element={<KaizenPage />} />
          <Route path="improve/standard-work" element={<StandardWorkPage />} />
          <Route path="improve/continuous-improvement" element={<ContinuousImprovementPage />} />
          <Route path="improve/suggestions" element={<SuggestionsPage />} />
          <Route path="standardize/standard-work" element={<StandardWorkPage />} />
          <Route path="standardize/procedures" element={<ProceduresPage />} />
          <Route path="standardize/templates" element={<TemplatesPage />} />
          <Route path="standardize/best-practices" element={<BestPracticesPage />} />
          <Route path="system/production-structure" element={<ProductionFlow />} />
                    <Route path="system/production-structure/flow" element={<Navigate to="company" replace />} />
                    <Route path="system/production-structure/flow/:tab" element={<ProductionFlowLayout />} />
                    <Route path="system/production-structure/components" element={<ProductionComponentsLayout />}>
                      <Route index element={<Navigate to="company" replace />} />
                      <Route path="company" element={<ProductionComponentsCompany />} />
                      <Route path="plants" element={<ProductionComponentsPlants />} />
                      <Route path="line" element={<ProductionComponentsProductionLines />} />
                      <Route path="dept" element={<ProductionComponentsDepartments />} />
                      <Route path="rg" element={<ProductionComponentsResourceGroup />} />
                      <Route path="resource" element={<ProductionComponentsResources />} />
                    </Route>
          <Route path="system/production-structure/plants" element={<PlantsPage />} />
          <Route path="system/production-structure/departments" element={<DepartmentsPage />} />
          <Route path="system/production-structure/resource-groups" element={<ResourceGroupsPage />} />
          <Route path="system/production-structure/resources" element={<ResourcesPage />} />
          <Route path="system/production-structure/references" element={<ReferencesPage />} />
          <Route path="system/production-structure/references/:tableId" element={<ReferencesPage />} />
          <Route path="system/production-structure/flow/routing/:productionLineId" element={<RoutingEditorPage />} />
          <Route path="system/production-structure/flow/routing/:productionLineId/:routingId" element={<RoutingEditorPage />} />
          <Route path="system/production-structure/components/routing/:productionLineId" element={<RoutingEditorPage />} />
          <Route path="system/production-structure/components/routing/:productionLineId/:routingId" element={<RoutingEditorPage />} />
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
