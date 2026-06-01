import { memo } from "react";
import { ChevronRight, Landmark, Factory, TrendingUpDown, Layers, Component, Dumbbell } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StructureDocumentStatusBadge } from "./StructureDocumentStatusBadge";
import type { StructureDocumentTreeNodeData } from "@/types/structureDocument";

const typeIcon: Record<string, LucideIcon> = {
  COMPANY: Landmark,
  PLANT: Factory,
  PRODUCTION_LINE: TrendingUpDown,
  DEPARTMENT: Layers,
  RESOURCE_GROUP: Component,
  RESOURCE: Dumbbell,
};

const typeColor: Record<string, string> = {
  COMPANY: "text-entity-company",
  PLANT: "text-entity-plant",
  PRODUCTION_LINE: "text-entity-line",
  DEPARTMENT: "text-entity-department",
  RESOURCE_GROUP: "text-entity-resource-group",
  RESOURCE: "text-entity-resource",
};

const typeLabel: Record<string, string> = {
  COMPANY: "Company",
  PLANT: "Plant",
  PRODUCTION_LINE: "Production Line",
  DEPARTMENT: "Department",
  RESOURCE_GROUP: "Resource Group",
  RESOURCE: "Resource",
};

interface StructureDocumentTreeNodeProps {
  node: StructureDocumentTreeNodeData;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  onSelect: () => void;
}

function nodePropsEqual(prev: StructureDocumentTreeNodeProps, next: StructureDocumentTreeNodeProps) {
  return (
    prev.node.id === next.node.id &&
    prev.node.nodeType === next.node.nodeType &&
    prev.node.name === next.node.name &&
    prev.node.documentStatus === next.node.documentStatus &&
    (prev.node.children?.length ?? 0) === (next.node.children?.length ?? 0) &&
    prev.depth === next.depth &&
    prev.isExpanded === next.isExpanded &&
    prev.isSelected === next.isSelected &&
    prev.hasChildren === next.hasChildren
  );
}

export const StructureDocumentTreeNode = memo(function StructureDocumentTreeNode({
  node,
  depth,
  isExpanded,
  isSelected,
  hasChildren,
  onToggle,
  onSelect,
}: StructureDocumentTreeNodeProps) {
  const Icon = typeIcon[node.nodeType];

  return (
    <div
      className={`group flex items-center gap-1 px-1 py-1 cursor-pointer transition-colors text-[13px] ${
        isSelected ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/60"
      }`}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      onClick={onSelect}
      role="treeitem"
      aria-selected={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`flex items-center justify-center h-4 w-4 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""} ${hasChildren ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-label={isExpanded ? "Collapse" : "Expand"}
        aria-expanded={hasChildren ? isExpanded : undefined}
        role="button"
        tabIndex={-1}
      >
        <ChevronRight className="h-3 w-3 stroke-current" />
      </button>

      {Icon && (
        <Icon className={`h-4 w-4 shrink-0 stroke-current ${typeColor[node.nodeType] || "text-muted-foreground"}`} />
      )}

      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        <span className="truncate text-xs font-semibold text-foreground">{node.name}</span>
        <span className="shrink-0 text-[10px] text-muted-foreground font-medium">{typeLabel[node.nodeType] || node.nodeType}</span>
      </div>

      <StructureDocumentStatusBadge status={node.documentStatus} />
    </div>
  );
}, nodePropsEqual);
