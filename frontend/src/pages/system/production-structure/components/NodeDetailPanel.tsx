import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { Database } from "lucide-react";
import type { DataManagementTreeChild } from "@/hooks/useDataManagementOverview";
import { PLANT_QUERY } from "@/graphql/plantQueries";
import { PRODUCTION_LINE_QUERY } from "@/graphql/productionLineQueries";
import { DEPARTMENT_QUERY, RESOURCE_GROUP_QUERY, RESOURCE_QUERY } from "@/graphql/manufacturingQueries";
import { TYPE_TITLES, formatStatusLabel, countEntityTypes, CHILD_TYPE_MAP } from "../config";
import { theme } from "@/styles/themeTokens";
import { DetailSection } from "./DetailSection";
import { EntityDetailForm, fromTreeNode } from "./EntityDetailForm";
import { ResourceGroupForm, DepartmentForm, ResourceForm } from "../entityForms";

export interface NodeDetailPanelProps {
  selectedNode: DataManagementTreeChild | null;
  selectedNodeKey?: string | null;
  selectedPath?: DataManagementTreeChild[];
  contextCounts?: Record<string, number> | null;
  workspaceMode: "view" | "edit" | "create";
  onAddChild?: () => void;
  onSave?: (data: Record<string, string>) => void;
}

export function NodeDetailPanel({
  selectedNode,
  selectedNodeKey,
  selectedPath,
  contextCounts,
  workspaceMode,
  onAddChild,
  onSave,
}: NodeDetailPanelProps) {
  if (!selectedNode) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Database className="h-4 w-4 stroke-current text-muted-foreground" />
        </div>
        <span className="text-sm font-semibold text-muted-foreground">No node selected</span>
        <span className="text-xs text-muted-foreground">Select a node from the production tree</span>
      </div>
    );
  }

  if (workspaceMode === "edit") {
    return <EditContent node={selectedNode} onSave={onSave} />;
  }

  if (workspaceMode === "create") {
    return <CreateContent node={selectedNode} />;
  }

  return <ViewContent node={selectedNode} nodeKey={selectedNodeKey} path={selectedPath} contextCounts={contextCounts} onAddChild={onAddChild} />;
}

function useResolvedNode(node: DataManagementTreeChild): DataManagementTreeChild {
  const { data: plantData } = useQuery<any>(PLANT_QUERY, {
    variables: { id: node.id },
    skip: node.type !== "plant",
    fetchPolicy: "cache-and-network",
  });

  const { data: lineData } = useQuery<any>(PRODUCTION_LINE_QUERY, {
    variables: { id: node.id },
    skip: node.type !== "productionLine" && node.type !== "line",
    fetchPolicy: "cache-and-network",
  });

  const { data: deptData } = useQuery<any>(DEPARTMENT_QUERY, {
    variables: { id: node.id },
    skip: node.type !== "department",
    fetchPolicy: "cache-and-network",
  });

  const { data: rgData } = useQuery<any>(RESOURCE_GROUP_QUERY, {
    variables: { id: node.id },
    skip: node.type !== "resourceGroup" && node.type !== "group",
    fetchPolicy: "cache-and-network",
  });

  const { data: resourceData } = useQuery<any>(RESOURCE_QUERY, {
    variables: { id: node.id },
    skip: node.type !== "resource",
    fetchPolicy: "cache-and-network",
  });

  return useMemo(() => {
    const fetched =
      plantData?.plant ||
      lineData?.productionLine ||
      deptData?.department ||
      rgData?.resourceGroup ||
      resourceData?.resource ||
      null;

    if (!fetched) return node;

    return {
      ...node,
      name: fetched.name || node.name,
      code: fetched.code || node.code,
      status: fetched.status || node.status,
      metadata: {
        ...((node as any).metadata || {}),
        ...fetched,
      },
    } as DataManagementTreeChild;
  }, [node, plantData, lineData, deptData, rgData, resourceData]);
}

/* ── Edit Mode ── */

function EditContent({ node, onSave }: { node: DataManagementTreeChild; onSave?: (data: Record<string, string>) => void }) {
  const closeForm = () => onSave?.({});

  if (node.type === "resourceGroup" || node.type === "group") {
    return (
      <ResourceGroupForm
        groupId={node.id}
        onClose={closeForm}
        onSaved={closeForm}
      />
    );
  }

  if (node.type === "department") {
    return (
      <DepartmentForm
        departmentId={node.id}
        onClose={closeForm}
        onSaved={closeForm}
      />
    );
  }

  if (node.type === "resource") {
    return (
      <ResourceForm
        resourceId={node.id}
        onClose={closeForm}
        onSaved={closeForm}
      />
    );
  }

  const title = TYPE_TITLES[node.type] || node.type;
  const statusLabel = formatStatusLabel(node.status);
  return (
    <div>
      <div className="flex items-center gap-2 border-b border-warning bg-warning px-3 py-1.5 text-xs text-warning">
        Editing {title}
      </div>
      <DetailSection title={`${title} Fields`} bodyClass="px-0 py-0">
        <div className="space-y-2">
          <Field label="Name" defaultValue={node.name} />
          <Field label="Code" defaultValue={node.code || ""} />
          <Field label="Status" defaultValue={statusLabel} />
        </div>
      </DetailSection>
    </div>
  );
}

/* ── View Mode ── */

function ViewContent({
  node,
  nodeKey,
  path,
  contextCounts,
  onAddChild,
}: {
  node: DataManagementTreeChild;
  nodeKey?: string | null;
  path?: DataManagementTreeChild[];
  contextCounts?: Record<string, number> | null;
  onAddChild?: () => void;
}) {
  const hierarchyMix = useMemo(() => {
    if (contextCounts) return contextCounts;
    const counts = countEntityTypes(node);
    return {
      plants: counts.plant || 0,
      lines: counts.productionLine || counts.line || 0,
      departments: counts.department || 0,
      groups: counts.resourceGroup || counts.group || 0,
      resources: counts.resource || 0,
    };
  }, [node, contextCounts]);
  const depth = nodeKey ? nodeKey.split("/").length : 0;
  const parentNode = path && path.length > 1 ? path[path.length - 2] : null;
  const pathLabels = path ? path.map((n) => n.name).join("  \u203a  ") : "";

  const resolvedNode = useResolvedNode(node);

  const normalized = fromTreeNode(resolvedNode);
  const childType = CHILD_TYPE_MAP[resolvedNode.type] || undefined;

  return (
    <div>
      {resolvedNode.type !== "company" && (
        <EntityDetailForm
          entityType={resolvedNode.type}
          entity={normalized}
          extras={{
            parentName: parentNode?.name,
            depth,
            pathLabels,
            children: resolvedNode.children,
            hierarchyMix,
            childType,
            onAddChild,
          }}
        />
      )}
    </div>
  );
}

/* ── Create Mode ── */

function CreateContent({ node }: { node: DataManagementTreeChild }) {
  const childType = TYPE_TITLES[CHILD_TYPE_MAP[node.type]] || CHILD_TYPE_MAP[node.type] || "Child";
  const parentTitle = TYPE_TITLES[node.type] || node.type;

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-info bg-info px-3 py-1.5 text-xs text-info">
        Creating new {childType} under {node.name}
      </div>
      <DetailSection title={`New ${childType}`} bodyClass="px-0 py-0">
        <div className="space-y-2">
          <Field label="Name" defaultValue="" placeholder={`Enter ${childType} name`} />
          <Field label="Code" defaultValue="" placeholder={`Enter ${childType} code`} />
        </div>
      </DetailSection>
      <DetailSection title="Parent Context" bodyClass="px-0 py-0">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[15px]">
          <div><span className="text-[11px] text-muted-foreground block leading-tight">Parent</span><div className="font-medium text-muted-foreground">{node.name}</div></div>
          <div><span className="text-[11px] text-muted-foreground block leading-tight">Type</span><div className="font-medium text-muted-foreground">{parentTitle}</div></div>
          {node.code && <div><span className="text-[11px] text-muted-foreground block leading-tight">Code</span><div className="font-mono font-medium text-muted-foreground">{node.code}</div></div>}
        </div>
      </DetailSection>
    </div>
  );
}

/* ── Sub-components ── */

function Field({ label, defaultValue, placeholder }: { label: string; defaultValue: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-muted-foreground mb-0.5">{label}</label>
      <input
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder || label}
        className={`w-full h-7 rounded border px-2 text-[14px] outline-none transition-colors ${theme.input} ${theme.focusRing}`}
      />
    </div>
  );
}
