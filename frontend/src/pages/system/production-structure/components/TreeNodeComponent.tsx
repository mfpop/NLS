import React from "react";
import { ChevronDown } from "lucide-react";
import type { DataManagementTreeChild } from "@/hooks/useDataManagementOverview";
import { ENTITY_CONFIG } from "../config";
import { theme } from "../../../../styles/themeTokens";

const TREE_ENTITY_TONE: Record<string, { icon: string; selected: string; accent: string }> = {
  company: { icon: "text-entity-company/85 bg-entity-company-bg/70", selected: "bg-entity-company/10", accent: "border-l-entity-company" },
  plant: { icon: "text-entity-plant/85 bg-entity-plant-bg/70", selected: "bg-entity-plant/10", accent: "border-l-entity-plant" },
  productionLine: { icon: "text-entity-line/85 bg-entity-line-bg/70", selected: "bg-entity-line/10", accent: "border-l-entity-line" },
  line: { icon: "text-entity-line/85 bg-entity-line-bg/70", selected: "bg-entity-line/10", accent: "border-l-entity-line" },
  lineGroup: { icon: "text-entity-line/85 bg-entity-line-bg/70", selected: "bg-entity-line/10", accent: "border-l-entity-line" },
  department: { icon: "text-entity-department/85 bg-entity-department-bg/70", selected: "bg-entity-department/10", accent: "border-l-entity-department" },
  resourceGroup: { icon: "text-entity-resource-group/85 bg-entity-resource-group-bg/70", selected: "bg-entity-resource-group/10", accent: "border-l-entity-resource-group" },
  group: { icon: "text-entity-resource-group/85 bg-entity-resource-group-bg/70", selected: "bg-entity-resource-group/10", accent: "border-l-entity-resource-group" },
  resource: { icon: "text-entity-resource/85 bg-entity-resource-bg/70", selected: "bg-entity-resource/10", accent: "border-l-entity-resource" },
  warehouse: { icon: "text-entity-warehouse/85 bg-entity-warehouse-bg/70", selected: "bg-entity-warehouse/10", accent: "border-l-entity-warehouse" },
};

function statusBulletClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "active" || normalized === "running" || normalized === "online") return "bg-success";
  if (normalized === "inactive" || normalized === "idle") return "bg-muted-foreground/45";
  if (normalized === "down" || normalized === "blocked" || normalized === "error") return "bg-danger";
  if (normalized === "maintenance" || normalized === "warning") return "bg-warning";
  return "bg-muted-foreground/35";
}

export interface TreeNodeProps {
  node: DataManagementTreeChild;
  nodeKey: string;
  depth: number;
  expanded: boolean;
  selectedKey: string | null;
  onToggle: (key: string) => void;
  onSelect: (key: string | null) => void;
  expandedSet: Set<string>;
  onContextMenu: (e: React.MouseEvent, key: string, node: DataManagementTreeChild) => void;
}

export const TreeNodeComponent = React.memo(function TreeNodeComponent({
  node,
  nodeKey,
  depth,
  expanded,
  selectedKey,
  onToggle,
  onSelect,
  expandedSet,
  onContextMenu,
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedKey === nodeKey;
  const isRoot = depth === 0;
  const cfg = ENTITY_CONFIG[node.type] || ENTITY_CONFIG.resource;
  const tone = TREE_ENTITY_TONE[node.type] || TREE_ENTITY_TONE.resource;
  const Icon = cfg.icon;
  const indentPx = isRoot ? 6 : 16 + (depth - 1) * 14;
  const statusLabel = node.type === "resource" ? node.status : "";
  const showDepartmentMeta = (node.type === "resourceGroup" || node.type === "group") && !!node.departmentName;

  return (
    <div>
      <div
        className={`flex min-h-7 cursor-pointer select-none items-center gap-1.5 rounded-md border-l-[3px] px-2 pr-2.5 py-1 text-[12px] leading-5 outline-none transition-colors ${
          isSelected
            ? `${tone.selected} ${tone.accent} text-foreground`
            : `${theme.interactiveRow} border-l-transparent text-foreground`
        }`}
        style={{ paddingLeft: `${indentPx}px` }}
        onClick={() => {
          onSelect(isSelected ? null : nodeKey);
          if (hasChildren) onToggle(nodeKey);
        }}
        onContextMenu={(e) => onContextMenu(e, nodeKey, node)}
        role="treeitem"
        tabIndex={0}
        aria-expanded={hasChildren ? expanded : undefined}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSelect(isSelected ? null : nodeKey);
            if (hasChildren) onToggle(nodeKey);
          }
        }}
      >
        <span className="w-4 shrink-0 flex items-center justify-center">
          {hasChildren ? (
            <ChevronDown
              className={`h-3.5 w-3.5 ${theme.icon} stroke-current transition-transform duration-200 ${
                expanded ? "" : "-rotate-90"
              }`}
            />
          ) : (
            <span className="w-3" />
          )}
        </span>
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${tone.icon}`}>
          <Icon className="h-3 w-3 stroke-current" />
        </span>
        <div className="grid min-w-0 flex-1 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
          <div className="min-w-0">
            <span
              className={`min-w-0 truncate text-[12px] leading-5 ${
                isSelected
                  ? "font-semibold text-foreground"
                  : `font-medium ${theme.textPrimary}`
              }`}
              title={node.name}
            >
              {node.name}
            </span>
            {showDepartmentMeta && (
              <div className={`min-w-0 truncate text-[10px] leading-4 ${theme.textMuted}`} title={`Dept: ${node.departmentName || ""}`}>
                Dept: {node.departmentName}
              </div>
            )}
          </div>
          <div className="flex min-w-10.5 justify-end">
            {statusLabel && (
              <span className={`h-2 w-2 rounded-full ${statusBulletClass(node.status)}`} title={statusLabel} aria-label={`Status: ${statusLabel}`} />
            )}
          </div>
        </div>
      </div>
      {hasChildren && (
        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            expanded ? "opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          {expanded &&
            node.children!.map((child) => {
              const childKey = `${nodeKey}/${child.type}:${child.id}`;
              return (
                <TreeNodeComponent
                  key={childKey}
                  nodeKey={childKey}
                  node={child}
                  depth={depth + 1}
                  expanded={expandedSet.has(childKey)}
                  selectedKey={selectedKey}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  expandedSet={expandedSet}
                  onContextMenu={onContextMenu}
                />
              );
            })}
        </div>
      )}
    </div>
  );
});
