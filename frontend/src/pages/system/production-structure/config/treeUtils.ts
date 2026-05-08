import type { DataManagementTreeChild } from "@/hooks/useDataManagementOverview";

export function findNodeByKey(
  nodes: DataManagementTreeChild[],
  targetKey: string,
  parentKey = ""
): DataManagementTreeChild | null {
  for (const n of nodes) {
    const nodeKey = parentKey ? `${parentKey}/${n.type}:${n.id}` : `${n.type}:${n.id}`;
    if (nodeKey === targetKey) return n;
    if (n.children) {
      const found = findNodeByKey(n.children, targetKey, nodeKey);
      if (found) return found;
    }
  }
  return null;
}

export function findNodePathByKey(
  nodes: DataManagementTreeChild[],
  targetKey: string,
  path: DataManagementTreeChild[] = [],
  parentKey = ""
): DataManagementTreeChild[] | null {
  for (const n of nodes) {
    const nodeKey = parentKey ? `${parentKey}/${n.type}:${n.id}` : `${n.type}:${n.id}`;
    const nextPath = [...path, n];
    if (nodeKey === targetKey) return nextPath;
    if (n.children) {
      const found = findNodePathByKey(n.children, targetKey, nextPath, nodeKey);
      if (found) return found;
    }
  }
  return null;
}

export function formatStatusLabel(status?: string | null): string {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function countActiveInactive(node: DataManagementTreeChild | null): {
  active: number;
  inactive: number;
  total: number;
} {
  if (!node?.children) return { active: 0, inactive: 0, total: 0 };
  let active = 0;
  let inactive = 0;

  const walk = (n: DataManagementTreeChild) => {
    if (n.status === "active") active++;
    else inactive++;
    n.children?.forEach(walk);
  };

  node.children.forEach(walk);
  return { active, inactive, total: active + inactive };
}

export function countEntityTypes(node: DataManagementTreeChild | null): Record<string, number> {
  if (!node) return {};
  const counts: Record<string, number> = {};

  const walk = (n: DataManagementTreeChild) => {
    const t = n.type;
    counts[t] = (counts[t] || 0) + 1;
    n.children?.forEach(walk);
  };

  walk(node);
  return counts;
}
