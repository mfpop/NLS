import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useQuery } from "@apollo/client/react";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { PRODUCTION_LINES_QUERY } from "@/graphql/productionLineQueries";
import { useActiveLineId } from "@/stores/activeLineStore";
import type { Plant } from "@/types/plant";
import type { ProductionLine } from "@/types/productionLine";
import { theme } from "@/styles/themeTokens";

export function ActiveLineSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedPlant, setExpandedPlant] = useState("");
  const [activeLineId, setActiveLineId] = useActiveLineId();
  const ref = useRef<HTMLDivElement>(null);

  const { data: plantsData } = useQuery<{ plants: Plant[] }>(PLANTS_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const { data: linesData } = useQuery<{ productionLines: ProductionLine[] | { items: ProductionLine[] } }>(PRODUCTION_LINES_QUERY, {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const dbLines = useMemo(() => {
    const raw = linesData?.productionLines;
    if (Array.isArray(raw)) return raw;
    return raw?.items ?? [];
  }, [linesData]);

  const plants = useMemo(() => {
    const db = plantsData?.plants ?? [];
    return db.map((p) => ({
      id: p.id,
      name: p.name,
      lines: dbLines.filter((l) => l.plantId === p.id),
    }));
  }, [plantsData, dbLines]);

  const activeLine = useMemo(() => dbLines.find((line) => line.id === activeLineId) ?? null, [activeLineId, dbLines]);
  const activePlant = useMemo(() => plants.find((plant) => plant.id === activeLine?.plantId) ?? null, [activeLine?.plantId, plants]);

  const plantsRef = useRef(plants);
  plantsRef.current = plants;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const label = useMemo(() => {
    if (!activeLine) return "All Lines";
    return `${(activePlant?.name || activeLine.plantName || "Plant").slice(0, 16)} / ${activeLine.name.slice(0, 20)}`;
  }, [activeLine, activePlant?.name]);

  const selectPlant = useCallback((id: string) => {
    const p = plantsRef.current.find((x) => x.id === id);
    setActiveLineId(p?.lines[0]?.id ?? null);
    setIsOpen(false);
    setExpandedPlant("");
  }, [setActiveLineId]);

  const selectLine = useCallback((lineId: string) => {
    setActiveLineId(lineId);
    setIsOpen(false);
    setExpandedPlant("");
  }, [setActiveLineId]);

  return (
      <div ref={ref} className={`relative shrink-0 px-3 pt-2 pb-1 ${theme.sectionDivider} ${theme.page}`}>
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full h-10 rounded-md px-2.5 text-[15px] font-medium ${theme.surfaceBg} ${theme.textPrimary} ${theme.interactiveRow} transition-colors`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 stroke-current transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className={`absolute left-3 right-3 top-full mt-1 z-50 ${theme.row} rounded-lg shadow-xl py-1 max-h-[300px] overflow-y-auto`}>
          {plants.map((plant) => (
            <div key={plant.id}>
              <button type="button" onClick={() => selectPlant(plant.id)}
                className={`flex items-center gap-2 w-full px-3 h-8 text-xs transition-colors ${activePlant?.id === plant.id ? "bg-accent bg-accent0/10 text-info font-semibold" : `${theme.textSecondary} ${theme.interactiveRow}`}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${activePlant?.id === plant.id ? "bg-accent0" : theme.dividerDot}`} />
                <span className="truncate flex-1 text-left">{plant.name}</span>
                {activePlant?.id === plant.id && <Check className="h-3 w-3 stroke-current shrink-0" />}
              </button>
              <button type="button" onClick={() => setExpandedPlant(expandedPlant === plant.id ? "" : plant.id)}
                className={`flex items-center gap-1 w-full px-3 h-7 text-[10px] font-medium ${theme.textMuted} hover:text-muted-foreground transition-colors`}
              >
                <ChevronRight className={`h-3 w-3 stroke-current transition-transform ${expandedPlant === plant.id ? "rotate-90" : ""}`} />
                Lines
              </button>
              {expandedPlant === plant.id && plant.lines.map((line) => (
                <button key={line.id} type="button" onClick={() => selectLine(line.id)}
                  className={`flex items-center gap-2 w-full pl-8 pr-3 h-7 text-xs transition-colors ${activeLineId === line.id ? "bg-accent bg-accent0/10 text-info font-semibold" : `${theme.textSecondary} ${theme.interactiveRow}`}`}
                >
                  <span className="truncate text-left">{line.name}</span>
                  {activeLineId === line.id && <Check className="h-3 w-3 stroke-current shrink-0" />}
                </button>
              ))}
              {expandedPlant === plant.id && plant.lines.length === 0 && (
                <div className={`px-8 py-1 text-[11px] ${theme.textMuted}`}>No lines</div>
              )}
            </div>
          ))}
          {plants.length === 0 && (
            <div className={`px-3 py-2 text-[11px] ${theme.textMuted}`}>No production lines</div>
          )}
          <div className={`border-t border-border my-1`} />
          <button type="button" onClick={() => { setActiveLineId(null); setIsOpen(false); }}
            className={`flex items-center gap-2 w-full px-3 h-8 text-xs transition-colors ${!activeLineId ? "bg-accent bg-accent0/10 text-info font-semibold" : `${theme.textSecondary} ${theme.interactiveRow}`}`}
          >
            <span className="truncate flex-1 text-left">All Lines</span>
            {!activeLineId && <Check className="h-3 w-3 stroke-current shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
}
