import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Landmark, Factory, TrendingUpDown, Layers, Component, Dumbbell, Loader2, Search } from "lucide-react";
import { StructureDocumentTreeNode } from "./StructureDocumentTreeNode";
import type { StructureDocumentTreeNodeData } from "@/types/structureDocument";

interface StructureDocumentTreeProps {
  treeData: StructureDocumentTreeNodeData[];
  selectedNodeId: string | null;
  onSelectNode: (node: StructureDocumentTreeNodeData | null) => void;
  loading: boolean;
  error?: string | null;
  searchQuery: string;
}

function collectAllIds(nodes: StructureDocumentTreeNodeData[]): Set<string> {
  const ids = new Set<string>();
  for (const node of nodes) {
    ids.add(`${node.nodeType}-${node.id}`);
    if (node.children?.length > 0) {
      const childIds = collectAllIds(node.children);
      childIds.forEach((id) => ids.add(id));
    }
  }
  return ids;
}

function flattenTree(nodes: StructureDocumentTreeNodeData[], expandedSet: Set<string>, depth = 0): Array<{ node: StructureDocumentTreeNodeData; depth: number }> {
  const result: Array<{ node: StructureDocumentTreeNodeData; depth: number }> = [];
  for (const node of nodes) {
    result.push({ node, depth });
    if (expandedSet.has(`${node.nodeType}-${node.id}`) && (node.children?.length ?? 0) > 0) {
      result.push(...flattenTree(node.children ?? [], expandedSet, depth + 1));
    }
  }
  return result;
}

function nodeMatchesQuery(node: StructureDocumentTreeNodeData, query: string): boolean {
  const q = query.toLowerCase();
  return node.name.toLowerCase().includes(q);
}

function anyDescendantMatches(node: StructureDocumentTreeNodeData, query: string): boolean {
  return (node.children ?? []).some(
    (child) => nodeMatchesQuery(child, query) || anyDescendantMatches(child, query)
  );
}

function filterTreeForSearch(nodes: StructureDocumentTreeNodeData[], query: string): StructureDocumentTreeNodeData[] {
  return nodes
    .filter((node) => {
      if (nodeMatchesQuery(node, query)) return true;
      if (anyDescendantMatches(node, query)) return true;
      return false;
    })
    .map((node) => ({
      ...node,
      children: (node.children?.length ?? 0) > 0 ? filterTreeForSearch(node.children ?? [], query) : (node.children ?? []),
    }));
}

export function StructureDocumentTree({ treeData, selectedNodeId, onSelectNode, loading, error, searchQuery }: StructureDocumentTreeProps) {
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (treeData.length > 0 && !hasInitialized.current) {
      // Expand only root-level nodes (companies) so the tree loads showing plants
      const ids = new Set<string>();
      for (const node of treeData) {
        ids.add(`${node.nodeType}-${node.id}`);
      }
      setExpandedSet(ids);
      hasInitialized.current = true;
    }
  }, [treeData]);

  const handleToggle = useCallback((nodeType: string, nodeId: string) => {
    const key = `${nodeType}-${nodeId}`;
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (nodeId: string, nodeType: string) => {
      const findNode = (nodes: StructureDocumentTreeNodeData[]): StructureDocumentTreeNodeData | null => {
        for (const n of nodes) {
          if (n.id === nodeId && n.nodeType === nodeType) return n;
          if (n.children && n.children.length > 0) {
            const found = findNode(n.children);
            if (found) return found;
          }
        }
        return null;
      };
      const node = findNode(treeData);
      onSelectNode(node);
    },
    [treeData, onSelectNode]
  );

  const displayData = useMemo(() => {
    if (!searchQuery) return treeData;
    return filterTreeForSearch(treeData, searchQuery);
  }, [treeData, searchQuery]);

  const flatNodes = useMemo(() => {
    const expanded = searchQuery ? collectAllIds(displayData) : expandedSet;
    return flattenTree(displayData, expanded);
  }, [displayData, expandedSet, searchQuery]);

  const renderKey = (node: StructureDocumentTreeNodeData) => `${node.nodeType}-${node.id}`;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden border-r border-border min-w-0">
      {/* Tree Body */}
      <div className="flex-1 min-h-0 overflow-y-auto" role="tree">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin stroke-current" />
          </div>
        )}
        {error && (
          <div className="p-2 text-[10px] text-danger font-medium">{error}</div>
        )}
        {!loading && !error && flatNodes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center px-2">
            <Search className="h-6 w-6 text-muted-foreground/30 stroke-current mb-2" />
            <p className="text-[10px] text-muted-foreground font-medium">No matching structure nodes.</p>
          </div>
        )}
        {!loading &&
          !error &&
          flatNodes.map(({ node, depth }) => (
            <StructureDocumentTreeNode
              key={renderKey(node)}
              node={node}
              depth={depth}
              isExpanded={expandedSet.has(renderKey(node))}
              isSelected={selectedNodeId === node.id}
              hasChildren={(node.children?.length ?? 0) > 0}
              onToggle={() => handleToggle(node.nodeType, node.id)}
              onSelect={() => handleSelect(node.id, node.nodeType)}
            />
          ))}
      </div>

      {/* Legend Footer */}
      <div className="shrink-0 border-t border-border bg-muted flex items-center gap-2 px-2 text-[9px] text-muted-foreground font-medium h-8">
        <span className="flex items-center gap-0.5">
          <Landmark className="h-2.5 w-2.5 text-entity-company stroke-current" /> Company
        </span>
        <span className="flex items-center gap-0.5">
          <Factory className="h-2.5 w-2.5 text-entity-plant stroke-current" /> Plant
        </span>
        <span className="flex items-center gap-0.5">
          <TrendingUpDown className="h-2.5 w-2.5 text-entity-line stroke-current" /> Line
        </span>
        <span className="flex items-center gap-0.5">
          <Layers className="h-2.5 w-2.5 text-entity-department stroke-current" /> Dept
        </span>
        <span className="flex items-center gap-0.5">
          <Component className="h-2.5 w-2.5 text-entity-resource-group stroke-current" /> RG
        </span>
        <span className="flex items-center gap-0.5">
          <Dumbbell className="h-2.5 w-2.5 text-entity-resource stroke-current" /> Resource
        </span>
      </div>
    </div>
  );
}
