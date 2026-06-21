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
const CapacityPage = lazy(() =>
  import("@/pages/plan/CapacityPage").then((module) => ({ default: module.CapacityPage }))
);
const KaizenPage = lazy(() =>
  import("@/pages/improve/KaizenPage").then((module) => ({ default: module.KaizenPage }))
);
const ProceduresPage = lazy(() =>
  import("@/pages/standardize/ProceduresPage").then((module) => ({ default: module.ProceduresPage }))
);
const ManufacturingEngineeringRequestsPage = lazy(() =>
  import("@/pages/plan/ManufacturingEngineeringRequestsPage").then((module) => ({ default: module.ManufacturingEngineeringRequestsPage }))
);
const MaintenanceDashboardPage = lazy(() =>
  import("@/pages/maintenance/MaintenanceDashboardPage").then((module) => ({ default: module.MaintenanceDashboardPage }))
);
const WorkOrdersPage = lazy(() =>
  import("@/pages/maintenance/WorkOrdersPage").then((module) => ({ default: module.WorkOrdersPage }))
);
const PreventiveMaintenancePage = lazy(() =>
  import("@/pages/maintenance/PreventiveMaintenancePage").then((module) => ({ default: module.PreventiveMaintenancePage }))
);
const BreakdownsPage = lazy(() =>
  import("@/pages/maintenance/BreakdownsPage").then((module) => ({ default: module.BreakdownsPage }))
);
const SparePartsPage = lazy(() =>
  import("@/pages/maintenance/SparePartsPage").then((module) => ({ default: module.SparePartsPage }))
);
const MERDashboardPage = lazy(() =>
  import("@/pages/plan/MERDashboardPage").then((module) => ({ default: module.MERDashboardPage }))
);
const ProductionPlanPage = lazy(() =>
  import("@/pages/plan/ProductionPlanPage").then((module) => ({ default: module.ProductionPlanPage }))
);
const QualityControlPage = lazy(() =>
  import("@/pages/check/QualityControlPage").then((module) => ({ default: module.QualityControlPage }))
);
const ProductionControlPage = lazy(() =>
  import("@/pages/check/ProductionControlPage").then((module) => ({ default: module.ProductionControlPage }))
);

const SafetyControlPage = lazy(() =>
  import("@/pages/check/SafetyControlPage").then((module) => ({ default: module.SafetyControlPage }))
);
const SafetyAuditsPage = lazy(() =>
  import("@/pages/check/SafetyAuditsPage").then((module) => ({ default: module.SafetyAuditsPage }))
);
const SafetyDashboard = lazy(() =>
  import("@/pages/safety/SafetyDashboardPage").then((module) => ({ default: module.SafetyDashboardPage }))
);
const SafetyEventsPage = lazy(() =>
  import("@/pages/safety/SafetyEventsPage").then((module) => ({ default: module.SafetyEventsPage }))
);
const SafetyInjuryClaimsPage = lazy(() =>
  import("@/pages/safety/SafetyInjuryClaimsPage").then((module) => ({ default: module.SafetyInjuryClaimsPage }))
);
const SafetyMedicalCasesPage = lazy(() =>
  import("@/pages/safety/SafetyMedicalCasesPage").then((module) => ({ default: module.SafetyMedicalCasesPage }))
);
const SafetyEnvReportsPage = lazy(() =>
  import("@/pages/safety/SafetyEnvReportsPage").then((module) => ({ default: module.SafetyEnvReportsPage }))
);
const SafetyCAPAPage = lazy(() =>
  import("@/pages/safety/SafetyCAPAPage").then((module) => ({ default: module.SafetyCAPAPage }))
);
const MaterialControlPage = lazy(() =>
  import("@/pages/check/MaterialControlPage").then((module) => ({ default: module.MaterialControlPage }))
);
const A3PdcaPage = lazy(() =>
  import("@/pages/improve/A3PdcaPage").then((module) => ({ default: module.A3PdcaPage }))
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
  import("@/pages/system/product-master/ProductMasterDataPage").then((module) => ({ default: module.ProductMasterDataPage }))
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
const AuditTemplateManagerPage = lazy(() =>
  import("@/pages/system/AuditTemplateManagerPage").then((module) => ({ default: module.AuditTemplateManagerPage }))
);
const ApplicationSettingsPage = lazy(() =>
  import("@/pages/system/ApplicationSettingsPage").then((module) => ({ default: module.ApplicationSettingsPage }))
);
const AdministrativeDepartmentsPage = lazy(() =>
  import("@/pages/system/AdministrativeDepartmentsPage").then((module) => ({ default: module.AdministrativeDepartmentsPage }))
);
  const UsersAndRolesPage = lazy(() =>
  import("@/pages/system/UsersAndRolesPage").then((module) => ({ default: module.UsersAndRolesPage }))
);
const ERPDataPage = lazy(() =>
  import("@/pages/system/erp-data/ERPDataPage").then((module) => ({ default: module.ERPDataPage }))
);
const ERPImportPage = lazy(() =>
  import("@/pages/system/erp-data/erp-import/ErpImportPage").then((module) => ({ default: module.ErpImportPage }))
);
const ErpImportPatternPage = lazy(() =>
  import("@/pages/system/erp-data/ErpImportPatternPage").then((module) => ({ default: module.ErpImportPatternPage }))
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
const AdminGuidePage = lazy(() =>
  import("@/pages/docs/AdminGuidePage").then((module) => ({ default: module.AdminGuidePage }))
);
const TrainingMaterialsPage = lazy(() =>
  import("@/pages/docs/TrainingMaterialsPage").then((module) => ({ default: module.TrainingMaterialsPage }))
);
const ReleaseNotesPage = lazy(() =>
  import("@/pages/docs/ReleaseNotesPage").then((module) => ({ default: module.ReleaseNotesPage }))
);
const TechnicalDocsPage = lazy(() =>
  import("@/pages/docs/TechnicalDocsPage").then((module) => ({ default: module.TechnicalDocsPage }))
);
const UserManualPage = lazy(() =>
  import("@/pages/docs/UserManualPage").then((module) => ({ default: module.UserManualPage }))
);
const DocumentationSetupPage = lazy(() =>
  import("@/pages/docs/DocumentationSetupPage").then((module) => ({ default: module.DocumentationSetupPage }))
);

const DemoDataPage = lazy(() =>
  import("@/demo/DemoDataPage").then((module) => ({ default: module.DemoDataPage }))
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
        <Route path="/demo" element={<DemoDataPage />} />
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                    <Route index element={<ControlTowerPage />} />
          <Route path="control-tower" element={<ControlTowerPage />} />
          <Route path="myworkspace/dashboard" element={<MyDashboardPage />} />
          <Route path="myworkspace/tasks" element={<MyTasksPage />} />
          <Route path="execution/line-performance" element={<LinePerformancePage />} />
          <Route path="execution/live-shopfloor" element={<LiveShopfloorPage />} />
          <Route path="execution/vsm" element={<VsmPage />} />
          <Route path="execution/daily-gemba-walk" element={<DailyGembaWalkPage />} />
          <Route path="plan/production-plan" element={<ProductionPlanPage />} />
          <Route path="plan/mer" element={<ManufacturingEngineeringRequestsPage />} />
          <Route path="plan/mer-dashboard" element={<MERDashboardPage />} />
          <Route path="plan/capacity" element={<CapacityPage />} />
          <Route path="plan/capacity/load" element={<CapacityPage />} />
          {/* REVIEW_ONLY: /plan/capacity/load — not in sidebar, may be internal deep-link */}
          <Route path="plan/capacity/yamazumi" element={<CapacityPage />} />
          <Route path="plan/capacity/line-balancing" element={<CapacityPage />} />
          <Route path="plan/capacity/bottleneck-analysis" element={<CapacityPage />} />
          <Route path="plan/capacity/operator-allocation" element={<CapacityPage />} />
          <Route path="plan/capacity/takt-vs-cycle" element={<CapacityPage />} />
          <Route path="plan/capacity/capacity-loss" element={<CapacityPage />} />
          <Route path="plan/capacity/workload-distribution" element={<CapacityPage />} />
          {/* REVIEW_ONLY: /plan/capacity/constraints — not in sidebar, may be internal deep-link */}
          <Route path="plan/capacity/constraints" element={<CapacityPage />} />
          {/* REVIEW_ONLY: /plan/capacity/scenarios — not in sidebar, may be internal deep-link */}
          <Route path="plan/capacity/scenarios" element={<CapacityPage />} />
          <Route path="check/problems" element={<Navigate to="/check/production-control?tab=problems" replace />} />
          <Route path="check/actions" element={<Navigate to="/check/production-control?tab=actions" replace />} />
          <Route path="check/audits" element={<Navigate to="/check/production-control" replace />} />
          <Route path="check/quality-control" element={<QualityControlPage />} />
          <Route path="check/production-control" element={<ProductionControlPage />} />
          <Route path="check/safety-control" element={<SafetyControlPage />} />
          <Route path="check/safety-audits" element={<SafetyAuditsPage />} />
          <Route path="check/material-control" element={<MaterialControlPage />} />
          <Route path="safety/dashboard" element={<SafetyDashboard />} />
          <Route path="safety/incidents" element={<SafetyEventsPage />} />
          <Route path="safety/near-misses" element={<SafetyEventsPage />} />
          <Route path="safety/hazards" element={<SafetyEventsPage />} />
          <Route path="safety/compliance/injury-claims" element={<SafetyInjuryClaimsPage />} />
          <Route path="safety/compliance/medical-cases" element={<SafetyMedicalCasesPage />} />
          <Route path="safety/compliance/environmental-reports" element={<SafetyEnvReportsPage />} />
          <Route path="safety/compliance/capa" element={<SafetyCAPAPage />} />
          <Route path="maintenance/dashboard" element={<MaintenanceDashboardPage />} />
          <Route path="maintenance/work-orders" element={<WorkOrdersPage />} />
          <Route path="maintenance/preventive" element={<PreventiveMaintenancePage />} />
          <Route path="maintenance/breakdowns" element={<BreakdownsPage />} />
          <Route path="maintenance/spare-parts" element={<SparePartsPage />} />
          <Route path="improve/kaizen" element={<KaizenPage />} />
          <Route path="improve/a3-pdca" element={<A3PdcaPage />} />
          <Route path="improve/continuous-improvement" element={<Navigate to="/improve/suggestions" replace />} />
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
                    <Route path="system/manufacturing-structure/product-master-data" element={<Navigate to="/system/product-master" replace />} />
                    <Route path="system/application/diagnostics" element={<Navigate to="/system/diagnostics" replace />} />
                    <Route path="system/application/settings" element={<Navigate to="/system/application-settings" replace />} />
                    <Route path="system/application/documentation" element={<Navigate to="/docs/user-manual" replace />} />
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
          <Route path="system/product-master" element={<ProductMasterDataPage />} />
          <Route path="system/product-master-data" element={<Navigate to="/system/product-master" replace />} />
          {/* REVIEW_ONLY: /system/reference-tables is preferred sidebar route; /system/production-structure/references is retained as compatibility route */}
          <Route path="system/reference-tables" element={<ReferencesPage />} />
          <Route path="system/reference-tables/:tableId" element={<ReferencesPage />} />
          {/* REVIEW_ONLY: /system/diagnostics + /status share GraphqlStatusPage — intentional technical page reuse, page name does not match route */}
          <Route path="system/diagnostics" element={<GraphqlStatusPage />} />
          <Route path="system/entity-visual-settings" element={<EntityVisualSettingsPage />} />
          <Route path="system/application-settings" element={<ApplicationSettingsPage />} />
          <Route path="system/administrative-departments" element={<AdministrativeDepartmentsPage />} />
          <Route path="system/audit-templates" element={<AuditTemplateManagerPage />} />
          <Route path="system/users-and-roles" element={<UsersAndRolesPage />} />
          <Route path="system/erp-data" element={<ERPDataPage />} />
          <Route path="system/erp-data/import" element={<ERPImportPage />} />
          <Route path="system/erp-data/erp-patterns" element={<ErpImportPatternPage />} />
          <Route path="system/profile" element={<UserProfilePage />} />
          <Route path="system/preferences" element={<UserPreferencesPage />} />
          <Route path="system/sign-out" element={<SignOutPage />} />
          {/* REVIEW_ONLY: /status reuses GraphqlStatusPage (same as /system/diagnostics) — kept as internal technical endpoint */}
          <Route path="status" element={<GraphqlStatusPage />} />
          <Route path="docs" element={<Navigate to="/docs/user-manual" replace />} />
          <Route path="docs/user-manual" element={<UserManualPage />} />
          <Route path="docs/admin-guide" element={<AdminGuidePage />} />
          <Route path="docs/training-materials" element={<TrainingMaterialsPage />} />
          <Route path="docs/release-notes" element={<ReleaseNotesPage />} />
          <Route path="docs/technical-docs" element={<TechnicalDocsPage />} />
          <Route path="docs/setup" element={<DocumentationSetupPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
