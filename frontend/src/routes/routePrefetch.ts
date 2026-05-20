const prefetchedKeys = new Set<string>();

type Matcher = {
  key: string;
  matches: (path: string) => boolean;
  load: () => Promise<unknown>;
};

const matchers: Matcher[] = [
  {
    key: "control-tower",
    matches: (path) => path === "/" || path === "/control-tower",
    load: () => import("@/pages/control-tower/ControlTowerPage"),
  },
  {
    key: "myworkspace-dashboard",
    matches: (path) => path.startsWith("/myworkspace/dashboard"),
    load: () => import("@/pages/myworkspace/MyDashboardPage"),
  },
  {
    key: "myworkspace-tasks",
    matches: (path) => path.startsWith("/myworkspace/tasks"),
    load: () => import("@/pages/myworkspace/MyTasksPage"),
  },
  {
    key: "execution-line-performance",
    matches: (path) => path.startsWith("/execution/line-performance"),
    load: () => import("@/pages/execution/LinePerformancePage"),
  },
  {
    key: "execution-live-shopfloor",
    matches: (path) => path.startsWith("/execution/live-shopfloor"),
    load: () => import("@/pages/execution/LiveShopfloorPage"),
  },
  {
    key: "execution-vsm",
    matches: (path) => path.startsWith("/execution/vsm"),
    load: () => import("@/pages/execution/VsmPage"),
  },
  {
    key: "execution-daily-gemba-walk",
    matches: (path) => path.startsWith("/execution/daily-gemba-walk"),
    load: () => import("@/pages/execution/DailyGembaWalkPage"),
  },
  {
    key: "plan-production-plan",
    matches: (path) => path.startsWith("/plan/production-plan"),
    load: () => import("@/pages/plan/ProductionPlanPage"),
  },
  {
    key: "plan-capacity",
    matches: (path) => path.startsWith("/plan/capacity"),
    load: () => import("@/pages/plan/CapacityPage"),
  },
  {
    key: "check-problems",
    matches: (path) => path.startsWith("/check/problems"),
    load: () => import("@/pages/check/ProblemsPage"),
  },
  {
    key: "check-actions",
    matches: (path) => path.startsWith("/check/actions"),
    load: () => import("@/pages/check/ActionsPage"),
  },
  {
    key: "check-audits",
    matches: (path) => path.startsWith("/check/audits"),
    load: () => import("@/pages/check/AuditsPage"),
  },
  {
    key: "check-quality",
    matches: (path) => path.startsWith("/check/quality"),
    load: () => import("@/pages/check/QualityPage"),
  },
  {
    key: "improve-kaizen",
    matches: (path) => path.startsWith("/improve/kaizen"),
    load: () => import("@/pages/improve/KaizenPage"),
  },
  {
    key: "improve-continuous",
    matches: (path) => path.startsWith("/improve/continuous-improvement"),
    load: () => import("@/pages/improve/ContinuousImprovementPage"),
  },
  {
    key: "improve-suggestions",
    matches: (path) => path.startsWith("/improve/suggestions"),
    load: () => import("@/pages/improve/SuggestionsPage"),
  },
  {
    key: "standardize-work-instructions",
    matches: (path) => path.startsWith("/standardize/work-instructions"),
    load: () => import("@/pages/standardize/WorkInstructionsPage"),
  },
  {
    key: "standardize-standard-work",
    matches: (path) => path.startsWith("/standardize/standard-work"),
    load: () => import("@/pages/standardize/StandardWorkPage"),
  },
  {
    key: "standardize-material-flow",
    matches: (path) => path.startsWith("/standardize/material-flow"),
    load: () => import("@/pages/standardize/MaterialFlowStandardsPage"),
  },
  {
    key: "standardize-procedures",
    matches: (path) => path.startsWith("/standardize/procedures"),
    load: () => import("@/pages/standardize/ProceduresPage"),
  },
  {
    key: "standardize-document-control",
    matches: (path) => path.startsWith("/standardize/document-control"),
    load: () => import("@/pages/standardize/DocumentControlPage"),
  },
  {
    key: "system-flow",
    matches: (path) =>
      path === "/system/production-structure"
      || path === "/system/production-structure/flow"
      || path.startsWith("/system/production-structure/flow/"),
    load: () => import("@/pages/system/production-structure/ProductionFlowLayout"),
  },
  {
    key: "system-components",
    matches: (path) => path.startsWith("/system/production-structure/components"),
    load: () => import("@/pages/system/production-structure/components/ProductionComponentsLayout"),
  },
  {
    key: "system-references",
    matches: (path) => path.startsWith("/system/reference-tables") || path.startsWith("/system/production-structure/references"),
    load: () => import("@/pages/system/production-structure/ReferencesPage"),
  },
  {
    key: "system-settings",
    matches: (path) => path.startsWith("/system/application-settings"),
    load: () => import("@/pages/system/ApplicationSettingsPage"),
  },
  {
    key: "system-diagnostics",
    matches: (path) => path.startsWith("/system/diagnostics") || path.startsWith("/status"),
    load: () => import("@/pages/graphql-status/GraphqlStatusPage"),
  },
  {
    key: "routing-editor",
    matches: (path) => path.startsWith("/system/production-structure/flow/routing"),
    load: () => import("@/pages/system/production-structure/RoutingEditorPage"),
  },
  {
    key: "documentation-center",
    matches: (path) => path.startsWith("/docs/"),
    load: () => import("@/pages/DocumentationCenter/DocumentationCenter"),
  },
  {
    key: "system-erp-data",
    matches: (path) => path === "/system/erp-data" || path.startsWith("/system/erp-data/"),
    load: () => import("@/pages/system/erp-data/ERPDataPage"),
  },
  {
    key: "system-erp-import",
    matches: (path) => path.startsWith("/system/erp-data/import") && !path.startsWith("/system/erp-data/import-sources") && !path.startsWith("/system/erp-data/import-jobs"),
    load: () => import("@/pages/system/erp-data/erp-import/ERPImportPage"),
  },
  {
    key: "system-erp-lineage",
    matches: (path) => path.startsWith("/system/erp-data/lineage"),
    load: () => import("@/pages/system/erp-data/lineage/LineagePage"),
  },
  {
    key: "system-erp-import-sources",
    matches: (path) => path.startsWith("/system/erp-data/import-sources"),
    load: () => import("@/pages/system/erp-data/import-sources/ImportSourcesPage"),
  },
  {
    key: "system-erp-import-jobs",
    matches: (path) => path.startsWith("/system/erp-data/import-jobs"),
    load: () => import("@/pages/system/erp-data/import-jobs/ImportJobsPage"),
  },
  {
    key: "system-erp-admin-component-mapping",
    matches: (path) => path.startsWith("/system/erp-data/admin/component-mapping"),
    load: () => import("@/pages/system/erp-data/admin/component-mapping/ComponentMappingPage"),
  },
  {
    key: "system-erp-file-history",
    matches: (path) => path.startsWith("/system/erp-data/file-history"),
    load: () => import("@/pages/system/erp-data/file-history/FileHistoryPage"),
  },
  {
    key: "system-erp-mapping-rules",
    matches: (path) => path.startsWith("/system/erp-data/mapping-rules"),
    load: () => import("@/pages/system/erp-data/mapping-rules/MappingRulesPage"),
  },
  {
    key: "system-erp-validation-errors",
    matches: (path) => path.startsWith("/system/erp-data/validation-errors"),
    load: () => import("@/pages/system/erp-data/validation-errors/ValidationErrorsPage"),
  },
  {
    key: "system-erp-integration-status",
    matches: (path) => path.startsWith("/system/erp-data/integration-status"),
    load: () => import("@/pages/system/erp-data/integration-status/IntegrationStatusPage"),
  },
];

export function prefetchRoute(path: string): void {
  const matcher = matchers.find((item) => item.matches(path));
  if (!matcher) {
    return;
  }

  if (prefetchedKeys.has(matcher.key)) {
    return;
  }

  prefetchedKeys.add(matcher.key);
  void matcher.load();
}
