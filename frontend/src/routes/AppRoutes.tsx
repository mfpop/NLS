import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { LoginPage } from "@/auth/LoginPage";
import { ForgotPasswordPage } from "@/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/auth/ResetPasswordPage";
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
const StandardWorkPage = lazy(() =>
  import("@/pages/standardize/StandardWorkPage").then((module) => ({ default: module.StandardWorkPage }))
);
const WorkInstructionsPage = lazy(() =>
  import("@/pages/standardize/WorkInstructionsPage").then((module) => ({ default: module.WorkInstructionsPage }))
);
const MaterialFlowStandardsPage = lazy(() =>
  import("@/pages/standardize/MaterialFlowStandardsPage").then((module) => ({ default: module.MaterialFlowStandardsPage }))
);
const DocumentControlPage = lazy(() =>
  import("@/pages/standardize/DocumentControlPage").then((module) => ({ default: module.DocumentControlPage }))
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
const ProductMasterDataPage = lazy(() =>
  import("@/pages/system/product-master-data/ProductMasterDataPage").then((module) => ({ default: module.ProductMasterDataPage }))
);
const EntityVisualSettingsPage = lazy(() =>
  import("@/pages/system/production-structure/EntityVisualSettingsPage").then((module) => ({ default: module.EntityVisualSettingsPage }))
);
const StructurePage = lazy(() =>
  import("@/pages/system/production-structure/StructurePage").then((module) => ({ default: module.StructurePage }))
);
const MaterialBinsPage = lazy(() =>
  import("@/pages/system/material-bins/MaterialBinsPage").then((module) => ({ default: module.MaterialBinsPage }))
);
const WarehousesPage = lazy(() =>
  import("@/pages/system/warehouses/WarehousesPage").then((module) => ({ default: module.WarehousesPage }))
);
const ApplicationSettingsPage = lazy(() =>
  import("@/pages/system/ApplicationSettingsPage").then((module) => ({ default: module.ApplicationSettingsPage }))
);
const ERPDataPage = lazy(() =>
  import("@/pages/system/erp-data/ERPDataPage").then((module) => ({ default: module.ERPDataPage }))
);
const ImportSourcesPage = lazy(() =>
  import("@/pages/system/erp-data/import-sources/ImportSourcesPage").then((module) => ({ default: module.ImportSourcesPage }))
);
const ImportJobsPage = lazy(() =>
  import("@/pages/system/erp-data/import-jobs/ImportJobsPage").then((module) => ({ default: module.ImportJobsPage }))
);

const ComponentMappingPage = lazy(() =>
  import("@/pages/system/erp-data/admin/component-mapping/ComponentMappingPage").then((module) => ({ default: module.ComponentMappingPage }))
);
const FileHistoryPage = lazy(() =>
  import("@/pages/system/erp-data/file-history/FileHistoryPage").then((module) => ({ default: module.FileHistoryPage }))
);
const MappingRulesPage = lazy(() =>
  import("@/pages/system/erp-data/mapping-rules/MappingRulesPage").then((module) => ({ default: module.MappingRulesPage }))
);
const ValidationErrorsPage = lazy(() =>
  import("@/pages/system/erp-data/validation-errors/ValidationErrorsPage").then((module) => ({ default: module.ValidationErrorsPage }))
);
const IntegrationStatusPage = lazy(() =>
  import("@/pages/system/erp-data/integration-status/IntegrationStatusPage").then((module) => ({ default: module.IntegrationStatusPage }))
);
const FilePreviewPage = lazy(() =>
  import("@/pages/system/erp-data/file-preview/FilePreviewPage").then((module) => ({ default: module.FilePreviewPage }))
);
const CompareResultsPage = lazy(() =>
  import("@/pages/system/erp-data/compare-results/CompareResultsPage").then((module) => ({ default: module.CompareResultsPage }))
);
const ERPImportPage = lazy(() =>
  import("@/pages/system/erp-data/erp-import/ERPImportPage").then((module) => ({ default: module.ERPImportPage }))
);
const LineagePage = lazy(() =>
  import("@/pages/system/erp-data/lineage/LineagePage").then((module) => ({ default: module.LineagePage }))
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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
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
          <Route path="plan/capacity/line-balancing" element={<CapacityPage />} />
          <Route path="plan/capacity/bottleneck-analysis" element={<CapacityPage />} />
          <Route path="plan/capacity/operator-allocation" element={<CapacityPage />} />
          <Route path="plan/capacity/takt-vs-cycle" element={<CapacityPage />} />
          <Route path="plan/capacity/capacity-loss" element={<CapacityPage />} />
          <Route path="plan/capacity/workload-distribution" element={<CapacityPage />} />
          <Route path="plan/capacity/constraints" element={<CapacityPage />} />
          <Route path="plan/capacity/scenarios" element={<CapacityPage />} />
          <Route path="check/problems" element={<ProblemsPage />} />
          <Route path="check/actions" element={<ActionsPage />} />
          <Route path="check/audits" element={<AuditsPage />} />
          <Route path="check/quality" element={<QualityPage />} />
          <Route path="improve/kaizen" element={<KaizenPage />} />
          <Route path="improve/continuous-improvement" element={<ContinuousImprovementPage />} />
          <Route path="improve/suggestions" element={<SuggestionsPage />} />
          <Route path="standardize/work-instructions" element={<WorkInstructionsPage />} />
          <Route path="standardize/standard-work" element={<StandardWorkPage />} />
          <Route path="standardize/material-flow-standards" element={<MaterialFlowStandardsPage />} />
          <Route path="standardize/material-flow" element={<Navigate to="/standardize/material-flow-standards" replace />} />
          <Route path="standardize/procedures" element={<ProceduresPage />} />
          <Route path="standardize/document-control" element={<DocumentControlPage />} />
          <Route path="standardize/templates" element={<Navigate to="/standardize/document-control" replace />} />
          <Route path="standardize/best-practices" element={<Navigate to="/standardize/document-control" replace />} />
          <Route path="standardize/training" element={<Navigate to="/standardize/document-control" replace />} />
          <Route path="standardize/governance" element={<Navigate to="/standardize/document-control" replace />} />
          <Route path="system/production-structure" element={<ProductionFlow />} />
                    <Route path="system/production-structure/flow" element={<Navigate to="company" replace />} />
                    <Route path="system/manufacturing-structure" element={<Navigate to="/system/production-structure" replace />} />
                    <Route path="system/manufacturing-structure/flow" element={<Navigate to="company" replace />} />
                    <Route path="system/manufacturing-structure/components" element={<Navigate to="/system/production-structure/components" replace />} />
                    <Route path="system/manufacturing-structure/product-master-data" element={<Navigate to="/system/product-master-data" replace />} />
                    <Route path="system/application/diagnostics" element={<Navigate to="/system/diagnostics" replace />} />
                    <Route path="system/application/settings" element={<Navigate to="/system/application-settings" replace />} />
                    <Route path="system/application/documentation" element={<Navigate to="/docs/core" replace />} />
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
          <Route path="system/warehouses" element={<WarehousesPage />} />
          <Route path="system/material-bins" element={<MaterialBinsPage />} />
          <Route path="system/product-master-data" element={<ProductMasterDataPage />} />
          <Route path="system/reference-tables" element={<ReferencesPage />} />
          <Route path="system/reference-tables/:tableId" element={<ReferencesPage />} />
          <Route path="system/diagnostics" element={<GraphqlStatusPage />} />
          <Route path="system/entity-visual-settings" element={<EntityVisualSettingsPage />} />
          <Route path="system/application-settings" element={<ApplicationSettingsPage />} />
          <Route path="system/erp-data" element={<ERPDataPage />} />
          <Route path="system/erp-data/import" element={<ERPImportPage />} />
          <Route path="system/erp-data/lineage" element={<LineagePage />} />
          <Route path="system/erp-data/import-sources" element={<ImportSourcesPage />} />
          <Route path="system/erp-data/import-jobs" element={<ImportJobsPage />} />
          <Route path="system/erp-data/admin/component-mapping" element={<ComponentMappingPage />} />
          <Route path="system/erp-data/file-history" element={<FileHistoryPage />} />
          <Route path="system/erp-data/mapping-rules" element={<MappingRulesPage />} />
          <Route path="system/erp-data/validation-errors" element={<ValidationErrorsPage />} />
          <Route path="system/erp-data/integration-status" element={<IntegrationStatusPage />} />
          <Route path="system/erp-data/file-preview" element={<FilePreviewPage />} />
          <Route path="system/erp-data/compare-results" element={<CompareResultsPage />} />
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
