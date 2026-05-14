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
    key: "standardize-standard-work",
    matches: (path) => path.startsWith("/standardize/standard-work"),
    load: () => import("@/pages/improve/StandardWorkPage"),
  },
  {
    key: "standardize-procedures",
    matches: (path) => path.startsWith("/standardize/procedures"),
    load: () => import("@/pages/standardize/ProceduresPage"),
  },
  {
    key: "standardize-templates",
    matches: (path) => path.startsWith("/standardize/templates"),
    load: () => import("@/pages/standardize/TemplatesPage"),
  },
  {
    key: "standardize-best-practices",
    matches: (path) => path.startsWith("/standardize/best-practices"),
    load: () => import("@/pages/standardize/BestPracticesPage"),
  },
  {
    key: "system-flow",
    matches: (path) => path === "/system/production-structure" || path === "/system/production-structure/flow",
    load: () => import("@/pages/system/ProductionStructurePage"),
  },
  {
    key: "system-flow-components",
    matches: (path) => path.startsWith("/system/production-structure/flow/"),
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
    key: "routing-editor",
    matches: (path) => path.startsWith("/system/production-structure/flow/routing"),
    load: () => import("@/pages/system/production-structure/RoutingEditorPage"),
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
