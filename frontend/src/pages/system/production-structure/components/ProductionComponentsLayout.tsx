import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { PageHeader } from "@/pages/shared/PageHeader";
import { Landmark, Factory, TrendingUpDown, Layers, Component, Dumbbell, Database, Info } from "lucide-react";
import { ToolbarProvider, useToolbar, useToolbarActions } from "./ToolbarContext";
import { Toolbar as SharedToolbar, ToolbarSearch, ToolbarSelect, ToolbarCrudActions } from "@/components/shared/Toolbar";

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
  const location = useLocation();
  const lastSegment = location.pathname.replace(/\/+$/, "").split("/").pop() || "";
  const isCompanyPage = lastSegment === "company";
  const { search, setSearch, statusFilter, setStatusFilter } = useToolbar();
  const actions = useToolbarActions();
  const saveDisabled = actions.isSaving || !actions.isDirty || actions.isValid === false;
  const isEditMode = !!actions.onSave;

  const filterChange = (apply: () => void) => {
    if (isEditMode && actions.isDirty) {
      if (!window.confirm("You have unsaved changes. Discard them and update the list filter?")) return;
      actions.onDiscardChanges?.();
    }
    apply();
  };

  return (
    <SharedToolbar
      left={!isCompanyPage ? <ToolbarSearch value={search} onChange={(v) => filterChange(() => setSearch(v))} placeholder="Search" /> : undefined}
      right={
        <>
          {!isCompanyPage && (
            <ToolbarSelect
              value={statusFilter}
              onChange={(v) => filterChange(() => setStatusFilter(v))}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "archived", label: "Archived" },
              ]}
            />
          )}
          <div className="flex-1" />
          <ToolbarCrudActions
            onNew={actions.onAdd}
            onEdit={actions.onEdit}
            onDelete={actions.onDelete}
            onDeletePermanent={actions.onDeletePermanent}
            onRefresh={actions.onRefresh}
            onSave={actions.onSave}
            onCancel={actions.onCancel}
            isEditMode={isEditMode}
            isSaving={actions.isSaving}
            saveDisabled={saveDisabled}
            hideNew={isCompanyPage}
            hideDelete={isCompanyPage}
            canNew={!!actions.onAdd}
            canEdit={!!actions.hasSelected && !!actions.onEdit}
            canDelete={!!actions.hasSelected && !!actions.onDelete}
            canDeletePermanent={!!actions.hasSelected && !!actions.onDeletePermanent}
            canRefresh={!!actions.onRefresh}
          />
        </>
      }
    />
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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
