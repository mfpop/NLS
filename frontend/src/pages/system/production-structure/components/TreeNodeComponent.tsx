import React from "react";
import { ChevronDown } from "lucide-react";
import type { DataManagementTreeChild } from "@/hooks/useDataManagementOverview";
import { ENTITY_CONFIG } from "../config";
import { theme } from "../../../../styles/themeTokens";

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

export function TreeNodeComponent({
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
  const Icon = cfg.icon;
  const indentPx = isRoot ? 4 : 12 + (depth - 1) * 12;
  const countLabel = node.type === "plant"
    ? `${node.childCount ?? 0} line${node.childCount === 1 ? "" : "s"}`
    : node.type === "productionLine" || node.type === "line"
      ? `${node.childCount ?? 0} dept${node.childCount === 1 ? "" : "s"}`
      : node.type === "department"
        ? `${node.childCount ?? 0} RG`
        : node.type === "resourceGroup" || node.type === "group"
          ? `${node.childCount ?? 0} res`
          : node.type === "resource"
            ? node.status
            : (node.childCount ?? 0) > 0 ? String(node.childCount) : "";

  return (
    <div>
      <div
        className={`flex h-8 min-h-8 cursor-pointer select-none items-center gap-1.5 rounded border-l-2 px-2 text-[13px] leading-5 outline-none transition-colors ${
          isSelected
            ? "border-l-selection-border bg-table-selected text-sidebar-active-foreground"
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
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${cfg.color}`}>
          <Icon className="h-3 w-3 stroke-current" />
        </span>
        <div className="min-w-0 flex-1 flex items-center gap-1.5">
          <span
            className={`truncate text-[13px] font-medium leading-5 ${
              isSelected
                ? "text-sidebar-active-foreground"
                : theme.textPrimary
            }`}
          >
            {node.name}
          </span>
          {node.code && (
            <span className={`rounded px-1.5 py-px text-[10px] font-mono font-semibold tracking-tight ${theme.codeBadge}`}>
              {node.code}
            </span>
          )}
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-card ${
              node.status === "active" ? "bg-status-active" : "bg-status-inactive"
            }`}
          />
          {countLabel && (
            <span className={`ml-auto shrink-0 text-[10px] font-medium ${theme.textSecondary}`}>{countLabel}</span>
          )}
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
}
