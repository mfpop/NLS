import React from "react";
import type { DataManagementTreeChild } from "@/hooks/useDataManagementOverview";
import { TreeNodeComponent } from "./TreeNodeComponent";

export interface TreeNavigationProps {
  data: DataManagementTreeChild[];
  selectedKey: string | null;
  expandedSet: Set<string>;
  onToggleNode: (key: string) => void;
  onSelectNode: (key: string | null) => void;
  onContextMenu: (e: React.MouseEvent, key: string, node: DataManagementTreeChild) => void;
  isLoading?: boolean;
}

export function TreeNavigation({
  data,
  selectedKey,
  expandedSet,
  onToggleNode,
  onSelectNode,
  onContextMenu,
  isLoading,
}: TreeNavigationProps) {
  return (
    <div className={`flex flex-col min-h-0 h-full ${isLoading ? "items-center justify-center" : ""}`}>
      {isLoading ? (
        <div className="flex items-center justify-center text-slate-400">
          <span className="text-sm">Loading...</span>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center text-slate-400">
          <span className="text-sm font-medium">No entities found</span>
          <span className="text-xs">Create a company to get started</span>
        </div>
      ) : (
        <div className="px-2 py-2 space-y-0">
          {data.map((node) => {
            const nodeKey = `${node.type}:${node.id}`;
            return (
              <TreeNodeComponent
                key={nodeKey}
                nodeKey={nodeKey}
                node={node}
                depth={0}
                expanded={expandedSet.has(nodeKey)}
                selectedKey={selectedKey}
                onToggle={onToggleNode}
                onSelect={onSelectNode}
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
