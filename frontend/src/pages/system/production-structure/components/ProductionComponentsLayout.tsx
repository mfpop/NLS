import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { PageHeader } from "@/pages/shared/PageHeader";
import { Landmark, Factory, TrendingUpDown, Layers, Component, Dumbbell, Search, X, Plus, Pencil, Trash2, RefreshCw, Database, Check, Info } from "lucide-react";
import { ToolbarProvider, useToolbar, useToolbarActions } from "./ToolbarContext";
import { theme } from "@/styles/themeTokens";

const BASE = "/system/production-structure/components";

interface NavItem {
  key: string;
  label: string;
  to: string;
  Icon: typeof Landmark;
  entityClass: string;
  subtitle: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "company", label: "Company", to: `${BASE}/company`, Icon: Landmark, entityClass: "company", subtitle: "Company root profile, global defaults, and production structure overview." },
  { key: "plants", label: "Plants", to: `${BASE}/plants`, Icon: Factory, entityClass: "plant", subtitle: "Facilities, locations, and production sites." },
  { key: "line", label: "Line", to: `${BASE}/line`, Icon: TrendingUpDown, entityClass: "line", subtitle: "Production lines and flow paths." },
  { key: "dept", label: "Dept", to: `${BASE}/dept`, Icon: Layers, entityClass: "department", subtitle: "Organizational departments and work centers." },
  { key: "rg", label: "RG", to: `${BASE}/rg`, Icon: Component, entityClass: "resource-group", subtitle: "Work cells, teams, and resource groupings." },
  { key: "resource", label: "Resource", to: `${BASE}/resource`, Icon: Dumbbell, entityClass: "resource", subtitle: "Machines, workstations, and production assets." },
];

const colorVar = (e: string) => `--color-entity-${e}` as string;

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
  const { search, setSearch, statusFilter, setStatusFilter, toolbarVariant } = useToolbar();
  const actions = useToolbarActions();
  const toolbarButtonClass = "inline-flex items-center gap-1.5 h-8 px-2.5 rounded text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors disabled:pointer-events-none disabled:text-muted-foreground disabled:bg-transparent disabled:opacity-70";
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
        <Search className={`absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 stroke-current pointer-events-none ${isEditMode ? theme.textDisabled : "text-muted-foreground"}`} />
        <input type="text" value={search} onChange={(e) => requestFilterChange(() => setSearch(e.target.value))} placeholder="Search"
          className="h-7 w-full rounded border border-border/35 bg-transparent pl-3 pr-7 text-xs outline-none text-muted-foreground placeholder:text-muted-foreground transition-colors focus:border-border/50 focus:bg-card focus:ring-1 focus:ring-border/20" />
        {search && (
          <button type="button" onClick={() => requestFilterChange(() => setSearch(""))}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground">
            <X className="h-3.5 w-3.5 stroke-current" />
          </button>
        )}
      </div>
      <select value={statusFilter} onChange={(e) => requestFilterChange(() => setStatusFilter(e.target.value))}
        className="h-7 w-24 shrink-0 cursor-pointer rounded border border-border/35 bg-transparent px-2 text-xs outline-none text-muted-foreground transition-colors focus:border-border/50 focus:bg-card focus:ring-1 focus:ring-border/20">
        <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
      </select>
    </>
  );
  const actionControls = actions.onSave ? (
    <>
      <button type="button" onClick={actions.onSave} title={saveDisabled ? "Save is available after valid changes" : "Save"} disabled={saveDisabled}
        className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded text-[10px] font-semibold border-0 transition-colors ${saveDisabled ? `${theme.chip} ${theme.textSecondary} cursor-not-allowed` : theme.buttonSuccessSolid}`}>
        <Check className="h-4 w-4 stroke-current" />
        <span className="hidden sm:inline">{actions.isSaving ? "Saving..." : "Save"}</span>
      </button>
      <button type="button" onClick={actions.onCancel} title="Cancel"
        className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors`}>
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
      <span className="mx-1 h-5 w-px bg-muted shrink-0" />
      <button type="button" onClick={actions.onRefresh} title="Refresh list" disabled={!actions.onRefresh}
        className={toolbarButtonClass}>
        <RefreshCw className="h-4 w-4 stroke-current" />
        <span>Refresh</span>
      </button>
    </>
  );

  return (
    <div className="shrink-0 flex items-center gap-2 border-b border-border/35 bg-muted px-3 h-10 select-none">
      {toolbarVariant === "splitListDetail" ? (
        <>
          <div className="flex h-full min-w-0 items-center gap-2 w-72">
            {searchFilterControls}
          </div>
          <span className="h-5 w-px shrink-0 bg-border/25" />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
            {actionControls}
          </div>
        </>
      ) : (
        <>
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
    <div className="shrink-0 border-t border-border bg-muted flex h-10 items-center justify-between px-4 text-xs text-muted-foreground font-medium">
      <div className="flex items-center gap-2">
        <Database className="h-3.5 w-3.5 stroke-current text-muted-foreground" />
        <span className="text-muted-foreground">{leftParts.join(" · ") || `Production Components${entityContext ? ` / ${entityContext}` : ""}`}</span>
      </div>
      {rightParts.length > 0 && <div className="text-muted-foreground">{rightParts.join(" · ")}</div>}
    </div>
  );
}

function ProductionComponentsShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastSegment = location.pathname.replace(/\/+$/, "").split("/").pop() || "";
  const tab = lastSegment === "components" ? "company" : lastSegment;
  const currentItem = NAV_ITEMS.find((i) => i.key === tab) || NAV_ITEMS[0];
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const { systemMessage, clearSystemMessage } = useToolbar();
  const messageClass = systemMessage?.type === "success"
    ? "border-success/25 bg-success/10 text-foreground"
    : systemMessage?.type === "error"
      ? "border-danger/25 bg-danger/10 text-foreground"
      : "border-border/60 bg-muted text-foreground";
  const messageIconClass = systemMessage?.type === "success"
    ? "text-success"
    : systemMessage?.type === "error"
      ? "text-danger"
      : "text-muted-foreground";

  return (
    <div className="flex flex-col overflow-hidden h-full">
        <div className="relative shrink-0">
          <PageHeader
            icon={<currentItem.Icon className="h-5 w-5 stroke-current" />}
            iconClass={`text-entity-${currentItem.entityClass}`}
            title={getTitle(tab)}
            subtitle={currentItem.subtitle}
          />
          {systemMessage && (
            <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center px-64">
              <button type="button" onClick={clearSystemMessage}
                className={`pointer-events-auto inline-flex max-w-full items-center gap-1.5 truncate rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm ${messageClass}`}
                title={systemMessage.message}>
                <Info className={`h-3.5 w-3.5 shrink-0 stroke-current ${messageIconClass}`} />
                <span className="truncate">{systemMessage.message}</span>
              </button>
            </div>
          )}
        </div>
        <div className="flex min-h-0 flex-1 overflow-hidden p-0 m-0">
          <div className="flex min-h-0 w-6 flex-col shrink-0 overflow-y-auto border-r border-border/60 py-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.Icon;
              const isActiveTab = tab === item.key;
              const isHovered = hoveredKey === item.key;
              const isFocused = focusedKey === item.key;

              let bg = "transparent";
              let color = `color-mix(in srgb, var(${colorVar(item.entityClass)}) 54%, var(--color-muted-foreground))`;
              let opacity = "0.95";
              let transitionDuration = "200ms";
              let fontWeight = 500;
              let strokeWidth = 1.65;

              if (isActiveTab) {
                bg = `color-mix(in srgb, var(${colorVar(item.entityClass)}) 18%, transparent)`;
                color = `color-mix(in srgb, var(${colorVar(item.entityClass)}) 92%, var(--color-foreground))`;
                opacity = "1";
                transitionDuration = "120ms";
                fontWeight = 600;
                strokeWidth = 2;
              } else if (isHovered) {
                bg = `color-mix(in srgb, var(${colorVar(item.entityClass)}) 5%, transparent)`;
                color = `color-mix(in srgb, var(${colorVar(item.entityClass)}) 64%, var(--color-muted-foreground))`;
                opacity = "1";
                transitionDuration = "150ms";
                strokeWidth = 1.8;
              }

              if (isFocused) {
                bg = `color-mix(in srgb, var(${colorVar(item.entityClass)}) 9%, transparent)`;
                color = `color-mix(in srgb, var(${colorVar(item.entityClass)}) 72%, var(--color-muted-foreground))`;
                opacity = "1";
                transitionDuration = "120ms";
              }

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigate(item.to)}
                  onMouseEnter={() => setHoveredKey(item.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onFocus={() => setFocusedKey(item.key)}
                  onBlur={() => setFocusedKey(null)}
                  className="relative flex flex-1 items-center justify-center w-full font-['Segoe_UI',system-ui,sans-serif] select-none focus:outline-none"
                  style={{
                    background: bg,
                    color,
                    opacity,
                    transition: `all ${transitionDuration} ease-out`,
                    fontWeight,
                    minHeight: 46,
                  } as React.CSSProperties}
                  title={`${item.label}${isActiveTab ? " (active)" : ""}`}
                  aria-current={isActiveTab ? "page" : undefined}
                >
                  <div className="flex items-center gap-1.5" style={{ transform: "rotate(-90deg)", transformOrigin: "center", whiteSpace: "nowrap" }}>
                    <span className="flex items-center justify-center w-4 h-4">
                      <Icon className="h-3.5 w-3.5 stroke-current" strokeWidth={strokeWidth} />
                    </span>
                    <span className="text-[10.5px] leading-none tracking-[0.01em]">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="shrink-0 bg-muted" style={{ width: 1 }} />
          <div className="flex flex-col overflow-hidden flex-1 min-w-0">
            <Toolbar />
            <div className="min-h-0 flex-1 overflow-hidden">
              <Outlet />
            </div>
          </div>
        </div>
        <Footer />
    </div>
  );
}

export function ProductionComponentsLayout() {
  return (
    <ToolbarProvider>
      <ProductionComponentsShell />
    </ToolbarProvider>
  );
}
