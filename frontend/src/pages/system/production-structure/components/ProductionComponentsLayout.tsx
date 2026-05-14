import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { PageHeader } from "@/pages/shared/PageHeader";
import { Landmark, Factory, TrendingUpDown, Layers, Component, Dumbbell, Search, X, Plus, Pencil, Trash2, RefreshCw, Database, Check } from "lucide-react";
import { ToolbarProvider, useToolbar, useToolbarActions } from "./ToolbarContext";
import { theme } from "@/styles/themeTokens";

const BASE = "/system/production-structure/components";

const NAV_ITEMS = [
  { key: "company", label: "Company", to: `${BASE}/company`, Icon: Landmark, colorActive: "text-emerald-700 dark:text-emerald-300", bgActive: "bg-emerald-50 dark:bg-emerald-500/10", colorInactive: "text-emerald-600/70 dark:text-emerald-400/55", bgInactive: "bg-emerald-50/40 dark:bg-emerald-900/10", accent: "bg-emerald-500 dark:bg-emerald-400", subtitle: "Company root profile, global defaults, and production structure overview." },
  { key: "plants", label: "Plants", to: `${BASE}/plants`, Icon: Factory, colorActive: "text-blue-700 dark:text-blue-300", bgActive: "bg-blue-50 dark:bg-blue-500/10", colorInactive: "text-blue-600/70 dark:text-blue-400/55", bgInactive: "bg-blue-50/40 dark:bg-blue-900/10", accent: "bg-blue-500 dark:bg-blue-400", subtitle: "Facilities, locations, and production sites." },
  { key: "line", label: "Line", to: `${BASE}/line`, Icon: TrendingUpDown, colorActive: "text-amber-700 dark:text-amber-300", bgActive: "bg-amber-50 dark:bg-amber-500/10", colorInactive: "text-amber-600/70 dark:text-amber-400/55", bgInactive: "bg-amber-50/40 dark:bg-amber-900/10", accent: "bg-amber-500 dark:bg-amber-400", subtitle: "Production lines and flow paths." },
  { key: "dept", label: "Dept", to: `${BASE}/dept`, Icon: Layers, colorActive: "text-purple-700 dark:text-purple-300", bgActive: "bg-purple-50 dark:bg-purple-500/10", colorInactive: "text-purple-600/70 dark:text-purple-400/55", bgInactive: "bg-purple-50/40 dark:bg-purple-900/10", accent: "bg-purple-500 dark:bg-purple-400", subtitle: "Organizational departments and work centers." },
  { key: "rg", label: "RG", to: `${BASE}/rg`, Icon: Component, colorActive: "text-rose-700 dark:text-rose-300", bgActive: "bg-rose-50 dark:bg-rose-500/10", colorInactive: "text-rose-600/70 dark:text-rose-400/55", bgInactive: "bg-rose-50/40 dark:bg-rose-900/10", accent: "bg-rose-500 dark:bg-rose-400", subtitle: "Work cells, teams, and resource groupings." },
  { key: "resource", label: "Resource", to: `${BASE}/resource`, Icon: Dumbbell, colorActive: "text-slate-700 dark:text-slate-300", bgActive: "bg-slate-100 dark:bg-slate-800/70", colorInactive: "text-slate-500/80 dark:text-slate-400/65", bgInactive: "bg-slate-50/40 dark:bg-slate-900/40", accent: "bg-slate-500 dark:bg-slate-400", subtitle: "Machines, workstations, and production assets." },
];

function getTitle(key: string): string {
  const map: Record<string, string> = {
    company: "Production Structure - Company",
    plants: "Production Structure - Plants",
    line: "Production Lines",
    dept: "Departments",
    rg: "Resource Groups",
    resource: "Resources",
  };
  return map[key] || "Production Structure";
}

function Toolbar() {
  const { search, setSearch, statusFilter, setStatusFilter, toolbarVariant, entityContext } = useToolbar();
  const actions = useToolbarActions();
  const toolbarButtonClass = "inline-flex items-center gap-1.5 h-8 px-2 rounded text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors disabled:pointer-events-none disabled:text-slate-400 disabled:bg-transparent dark:disabled:text-slate-500 disabled:opacity-70";
  const saveDisabled = actions.isSaving || !actions.isDirty || actions.isValid === false;
  const isEditMode = !!actions.onSave;
  const requestFilterChange = (apply: () => void) => {
    if (isEditMode && actions.isDirty) {
      const discard = window.confirm("You have unsaved changes. Discard them and update the list filter?");
      if (!discard) return;
      actions.onDiscardChanges?.();
    }
    apply();
  };
  const searchFilterControls = (
    <>
      <div className="relative min-w-0 flex-1">
        <Search className={`absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 stroke-current pointer-events-none ${isEditMode ? theme.textDisabled : "text-slate-400"}`} />
        <input type="text" value={search} onChange={(e) => requestFilterChange(() => setSearch(e.target.value))} placeholder="Search"
          className="h-7 w-full border border-slate-300 bg-white pl-3 pr-7 text-xs outline-none text-slate-700 placeholder-slate-400 transition-colors focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-blue-400" />
        {search && (
          <button type="button" onClick={() => requestFilterChange(() => setSearch(""))}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5 stroke-current" />
          </button>
        )}
      </div>
      <select value={statusFilter} onChange={(e) => requestFilterChange(() => setStatusFilter(e.target.value))}
        className="h-7 w-24 shrink-0 border border-slate-300 bg-white px-2 text-xs outline-none text-slate-600 cursor-pointer dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
      </select>
    </>
  );
  const actionControls = actions.onSave ? (
    <>
      <span className={`inline-flex items-center gap-1.5 h-8 px-2 rounded text-[11px] font-medium ${theme.textSecondary}`}>
        <Pencil className="h-4 w-4 stroke-current" />
        {actions.editLabel || "Editing"}
      </span>
      <span className={`inline-flex items-center gap-1 h-8 px-2 text-[11px] font-medium ${actions.isDirty ? theme.textWarning : theme.textMuted}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${actions.isDirty ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600"}`} />
        {actions.isDirty ? "Unsaved changes" : "No changes"}
      </span>
      <button type="button" onClick={actions.onSave} title={saveDisabled ? "Save is available after valid changes" : "Save"} disabled={saveDisabled}
        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded text-[11px] font-semibold transition-colors ${saveDisabled ? `${theme.chip} ${theme.textSecondary} cursor-not-allowed` : theme.buttonSuccessSolid}`}>
        <Check className="h-4 w-4 stroke-current" />
        <span className="hidden sm:inline">{actions.isSaving ? "Saving..." : "Save"}</span>
      </button>
      <button type="button" onClick={actions.onCancel} title="Cancel"
        className={`inline-flex items-center gap-1.5 h-8 px-2 rounded border text-[11px] font-medium ${theme.buttonSecondary} border-slate-300 dark:border-slate-600 transition-colors`}>
        <X className="h-4 w-4 stroke-current" />
        <span className="hidden sm:inline">Cancel</span>
      </button>
    </>
  ) : (
    <>
      <button type="button" onClick={actions.onAdd} title="Create a new plant (Ctrl+N)" disabled={!actions.onAdd}
        className={toolbarButtonClass}>
        <Plus className="h-4 w-4 stroke-current" />
        <span>New</span>
      </button>
      <button type="button" onClick={actions.onEdit} title="Edit selected plant (Enter)" disabled={!actions.hasSelected || !actions.onEdit}
        className={toolbarButtonClass}>
        <Pencil className="h-4 w-4 stroke-current" />
        <span>Edit</span>
      </button>
      <button type="button" onClick={actions.onDelete} title="Delete selected plant (Delete)" disabled={!actions.hasSelected || !actions.onDelete}
        className={toolbarButtonClass}>
        <Trash2 className="h-4 w-4 stroke-current" />
        <span>Delete</span>
      </button>
      <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-600 shrink-0" />
      <button type="button" onClick={actions.onRefresh} title="Refresh list" disabled={!actions.onRefresh}
        className={toolbarButtonClass}>
        <RefreshCw className="h-4 w-4 stroke-current" />
        <span>Refresh</span>
      </button>
      {actions.hasSelected && (
        <span className="ml-2 inline-flex items-center gap-1 h-8 px-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700">
          1 selected
        </span>
      )}
    </>
  );

  return (
    <div className="shrink-0 flex items-center gap-0.5 border-b border-slate-300 bg-white pl-6 pr-4 dark:border-slate-600 dark:bg-slate-900 h-10 select-none">
      {toolbarVariant === "splitListDetail" ? (
        <>
          <div className="flex h-full min-w-0 items-center gap-2 pr-2" style={{ flex: "0 0 280px", width: 280 }}>
            {searchFilterControls}
          </div>
          <span className="h-5 w-px shrink-0 bg-slate-300 dark:bg-slate-600" />
          <div className="flex min-w-0 flex-1 items-center gap-0.5 pl-3">
            {actionControls}
          </div>
        </>
      ) : (
        <>
          {entityContext && (
            <>
              <span className="mr-2 inline-flex h-7 items-center rounded border border-slate-200 bg-slate-50 px-2 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {entityContext}
              </span>
              <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-600 shrink-0" />
            </>
          )}
          {actionControls}
          <div className="flex-1" />
          <div className="flex w-72 items-center gap-2">
            {searchFilterControls}
          </div>
        </>
      )}
    </div>
  );
}

function Footer() {
  const { footerContent, entityContext } = useToolbar();
  const parts = (footerContent || "").split(" · ");
  const leftParts: string[] = [];
  const rightParts: string[] = [];
  let foundMeta = false;
  for (const p of parts) {
    if (p.startsWith("Created") || p.startsWith("Updated") || foundMeta) {
      rightParts.push(p);
      foundMeta = true;
    } else {
      leftParts.push(p);
    }
  }

  return (
    <div className="shrink-0 border-t border-slate-200/50 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 flex items-center justify-between px-5 text-xs text-slate-500 dark:text-slate-300 font-medium h-10">
      <div className="flex items-center gap-2">
        <Database className="h-3.5 w-3.5 stroke-current text-slate-400" />
        <span className="text-slate-400">{leftParts.join(" · ") || `Production Components${entityContext ? ` / ${entityContext}` : ""}`}</span>
      </div>
      {rightParts.length > 0 && <div className="text-slate-400">{rightParts.join(" · ")}</div>}
    </div>
  );
}

export function ProductionComponentsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastSegment = location.pathname.replace(/\/+$/, "").split("/").pop() || "";
  const tab = lastSegment === "components" ? "company" : lastSegment;
  const currentItem = NAV_ITEMS.find((i) => i.key === tab) || NAV_ITEMS[0];

  return (
    <ToolbarProvider>
      <div className="flex flex-col overflow-hidden h-full">
        <PageHeader
          icon={<currentItem.Icon className="h-5 w-5 stroke-current" />}
          iconClass={`${currentItem.bgInactive} ${currentItem.colorInactive}`}
          title={getTitle(tab)}
          subtitle={currentItem.subtitle}
        />
        <Toolbar />
        <div className="flex flex-1 overflow-hidden p-0 m-0">
          <div className="flex flex-col shrink-0" style={{ width: 24, maxWidth: 24 }}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.Icon;
              const isActiveTab = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className={`relative flex items-center justify-center transition-colors duration-150 font-['Segoe_UI',system-ui,sans-serif] ${
                    isActiveTab
                      ? `${item.bgActive} ${item.colorActive} font-medium`
                      : `${item.bgInactive} ${item.colorInactive} hover:text-slate-500 dark:hover:text-slate-400`
                  }`}
                  style={{ flex: "1 0 auto", minHeight: 0 }}
                  title={item.label}
                >
                  {isActiveTab && <span className={`absolute left-0 top-2 bottom-2 w-px ${item.accent}`} />}
                  <div className="flex items-center gap-1" style={{ transform: "rotate(-90deg)", transformOrigin: "center", whiteSpace: "nowrap" }}>
                    <span className={`flex items-center justify-center w-3.5 h-3.5 ${isActiveTab ? item.colorActive : item.colorInactive}`}>
                      <Icon className="h-3 w-3" />
                    </span>
                    <span className={`text-[9px] ${isActiveTab ? `font-medium ${item.colorActive}` : `font-semibold ${item.colorInactive}`}`}>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="shrink-0 bg-slate-200/60 dark:bg-slate-700/60" style={{ width: 1 }} />
          <div className="flex flex-col overflow-hidden flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
        <Footer />
      </div>
    </ToolbarProvider>
  );
}
