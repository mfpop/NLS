const prefetchedKeys = new Set<string>();

type Matcher = {
  key: string;
  matches: (path: string) => boolean;
  load: () => Promise<unknown>;
};

const matchers: Matcher[] = [
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
    key: "myworkspace-chat",
    matches: (path) => path.startsWith("/myworkspace/chat"),
    load: () => import("@/pages/myworkspace/ChatPage"),
  },
  {
    key: "myworkspace-activity-feed",
    matches: (path) => path.startsWith("/myworkspace/activity-feed"),
    load: () => import("@/pages/myworkspace/ActivityFeedPage"),
  },
  {
    key: "myworkspace-profile",
    matches: (path) => path.startsWith("/myworkspace/profile"),
    load: () => import("@/pages/system/UserProfilePage"),
  },
  {
    key: "myworkspace-preferences",
    matches: (path) => path.startsWith("/myworkspace/preferences"),
    load: () => import("@/pages/system/UserPreferencesPage"),
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
    key: "plan-mer",
    matches: (path) => path.startsWith("/plan/mer"),
    load: () => import("@/pages/plan/ManufacturingEngineeringRequestsPage"),
  },
  {
    key: "plan-mer-dashboard",
    matches: (path) => path.startsWith("/plan/mer-dashboard"),
    load: () => import("@/pages/plan/MERDashboardPage"),
  },
  {
    key: "plan-capacity",
    matches: (path) => path.startsWith("/plan/capacity"),
    load: () => import("@/pages/plan/CapacityPage"),
  },
  {
    key: "check-quality-control",
    matches: (path) => path.startsWith("/check/quality-control"),
    load: () => import("@/pages/check/QualityControlPage"),
  },
  {
    key: "check-production-control",
    matches: (path) => path.startsWith("/check/production-control"),
    load: () => import("@/pages/check/ProductionControlPage"),
  },
  {
    key: "check-safety-control",
    matches: (path) => path.startsWith("/check/safety-control"),
    load: () => import("@/pages/check/SafetyControlPage"),
  },
  {
    key: "check-material-control",
    matches: (path) => path.startsWith("/check/material-control"),
    load: () => import("@/pages/check/MaterialControlPage"),
  },
  {
    key: "improve-kaizen",
    matches: (path) => path.startsWith("/improve/kaizen"),
    load: () => import("@/pages/improve/KaizenPage"),
  },
  {
    key: "improve-a3-pdca",
    matches: (path) => path.startsWith("/improve/a3-pdca"),
    load: () => import("@/pages/improve/A3PdcaPage"),
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
    matches: (path) => path.startsWith("/system/erp-data/import"),
    load: () => import("@/pages/system/erp-data/erp-import/ErpImportPage"),
  },
  {
    key: "system-erp-patterns",
    matches: (path) => path.startsWith("/system/erp-data/erp-patterns"),
    load: () => import("@/pages/system/erp-data/ErpImportPatternPage"),
  },
  {
    key: "system-health",
    matches: (path) => path.startsWith("/system/health"),
    load: () => import("@/pages/system/SystemHealthPage"),
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
