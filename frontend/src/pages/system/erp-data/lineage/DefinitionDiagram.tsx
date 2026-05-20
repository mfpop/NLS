import { useQuery } from "@apollo/client/react";
import { ERP_RELATIONSHIP_GRAPH } from "@/graphql/lineageQueries";
import { Key, Link2 } from "lucide-react";
import { useEffect, useRef, useState, useLayoutEffect } from "react";

interface NodeItem { id: string; name: string; sourceType: string; active: boolean; }
interface FieldItem { id: string; entityId: string; fieldName: string; primaryKey: boolean; foreignKey: boolean; required: boolean; nexusField: string; dataType: string; }
interface RelItem { id: string; sourceEntity: string; sourceField: string; targetEntity: string; targetField: string; cardinality: string; required: boolean; status: string; }

export function DefinitionDiagram({ 
  scope, selectedTable, selectedField, selectedRel, 
  onSelectTable, onSelectField, onSelectRel 
}: { 
  scope: string; selectedTable: string | null; selectedField: string | null; selectedRel: string | null;
  onSelectTable: (t: string) => void; onSelectField: (f: string) => void; onSelectRel: (r: string) => void;
}) {
  const { data, loading } = useQuery<{ erpRelationshipGraph: { nodes: NodeItem[], fields: FieldItem[], relationships: RelItem[] } }>(
    ERP_RELATIONSHIP_GRAPH, { variables: { scope }, fetchPolicy: "cache-and-network" }
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<any[]>([]);

  useLayoutEffect(() => {
    if (!data || !containerRef.current) return;
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const newLines: any[] = [];

      data.erpRelationshipGraph.relationships.forEach(rel => {
        const srcEl = container.querySelector(`[data-field-id="${rel.sourceEntity}-${rel.sourceField}"]`);
        const tgtEl = container.querySelector(`[data-field-id="${rel.targetEntity}-${rel.targetField}"]`);
        
        if (srcEl && tgtEl) {
          const sRect = srcEl.getBoundingClientRect();
          const tRect = tgtEl.getBoundingClientRect();

          let x1 = sRect.right - cRect.left;
          let y1 = sRect.top + sRect.height / 2 - cRect.top + container.scrollTop;
          let x2 = tRect.left - cRect.left;
          let y2 = tRect.top + tRect.height / 2 - cRect.top + container.scrollTop;

          if (tRect.left < sRect.left) {
            x1 = sRect.left - cRect.left;
            x2 = tRect.right - cRect.left;
          }

          newLines.push({ id: rel.id, rel, x1, y1, x2, y2 });
        }
      });
      setLines(newLines);
    }, 100);
    return () => clearTimeout(timer);
  }, [data, scope]);

  if (loading) return <div className="p-4 text-xs text-muted-foreground">Loading definition graph...</div>;
  const graph = data?.erpRelationshipGraph;
  if (!graph) return null;

  return (
    <div className="relative w-full h-full p-6 overflow-auto bg-[#fafafa] dark:bg-black" ref={containerRef}>
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0" style={{ minWidth: 1000, minHeight: 800 }}>
        {lines.map(line => {
          const isSel = line.id === selectedRel;
          const stroke = isSel ? "#4f46e5" : "#cbd5e1";
          return (
            <g key={line.id} className={isSel ? "z-10" : "z-0"}>
              <path 
                d={`M ${line.x1} ${line.y1} C ${line.x1 + 60} ${line.y1}, ${line.x2 - 60} ${line.y2}, ${line.x2} ${line.y2}`} 
                stroke={stroke} strokeWidth={isSel ? "2.5" : "1.5"} fill="none" 
              />
              {/* Labels 1 -- 1 */}
              <rect x={line.x1 + 8} y={line.y1 - 8} width="12" height="12" fill="var(--card)" rx="2" />
              <text x={line.x1 + 10} y={line.y1 + 2} fontSize="9" fill={stroke} fontWeight="bold">1</text>
              
              <rect x={line.x2 - 18} y={line.y2 - 8} width="12" height="12" fill="var(--card)" rx="2" />
              <text x={line.x2 - 16} y={line.y2 + 2} fontSize="9" fill={stroke} fontWeight="bold">1</text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap gap-8 relative z-10 w-max">
        {graph.nodes.map(node => {
          const isTableSel = selectedTable === node.id || lines.some(l => l.id === selectedRel && (l.rel.sourceEntity === node.id || l.rel.targetEntity === node.id));
          return (
            <div key={node.id} 
              onClick={() => onSelectTable(node.id)} 
              className={`w-56 border rounded-lg bg-card shadow-sm cursor-pointer transition-all ${isTableSel ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-border/50 hover:border-border'}`}
            >
              <div className="bg-muted/20 px-3 py-2 border-b border-border/50 text-xs font-bold flex items-center justify-between">
                <span>{node.name}</span>
                {!node.active && <span className="text-[9px] text-muted-foreground bg-muted px-1 rounded">Inactive</span>}
              </div>
              <div className="p-1.5 space-y-px">
                {graph.fields.filter(f => f.entityId === node.id).map(f => {
                  const isFieldSel = selectedField === f.fieldName || lines.some(l => l.id === selectedRel && ((l.rel.sourceEntity === node.id && l.rel.sourceField === f.fieldName) || (l.rel.targetEntity === node.id && l.rel.targetField === f.fieldName)));
                  return (
                    <div 
                      key={f.id} 
                      data-field-id={`${node.id}-${f.fieldName}`} 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        const matchingRel = lines.find(l => (l.rel.sourceEntity === node.id && l.rel.sourceField === f.fieldName) || (l.rel.targetEntity === node.id && l.rel.targetField === f.fieldName));
                        if (matchingRel) onSelectRel(matchingRel.id);
                        else onSelectField(f.fieldName); 
                      }} 
                      className={`flex items-center gap-1.5 px-2 py-1 text-[11px] rounded transition-colors ${isFieldSel ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200' : 'hover:bg-muted/50'}`}
                    >
                      {f.primaryKey ? <Key className="w-3 h-3 shrink-0 text-amber-500" /> : f.foreignKey ? <Link2 className="w-3 h-3 shrink-0 text-blue-500" /> : <div className="w-3 h-3 shrink-0" />}
                      <span className={`truncate flex-1 ${f.required ? "font-semibold" : ""}`}>{f.fieldName}</span>
                      {f.nexusField && <span className="text-[9px] text-emerald-600 shrink-0">{f.nexusField}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
