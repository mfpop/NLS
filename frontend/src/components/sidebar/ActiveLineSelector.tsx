import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useQuery } from "@apollo/client/react";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { PRODUCTION_LINES_QUERY } from "@/graphql/productionLineQueries";
import { useActiveLineId, useSelectedPlantId } from "@/stores/activeLineStore";
import type { Plant } from "@/types/plant";
import type { ProductionLine } from "@/types/productionLine";

export function ActiveLineSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedPlant, setExpandedPlant] = useState("");
  const [activeLineId, setActiveLineId] = useActiveLineId();
  const [selectedPlantId, setSelectedPlantId] = useSelectedPlantId();
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

  useEffect(() => {
    if (activeLineId && dbLines.length > 0 && !activeLine) {
      setActiveLineId(null);
    }
  }, [activeLineId, dbLines, activeLine, setActiveLineId]);

  const selectedPlant = useMemo(() => plants.find((p) => p.id === selectedPlantId) ?? null, [selectedPlantId, plants]);

  const label = useMemo(() => {
    if (activeLine) return `${(activePlant?.name || activeLine.plantName || "Plant").slice(0, 16)} / ${activeLine.name.slice(0, 20)}`;
    if (selectedPlant) return `${selectedPlant.name.slice(0, 20)} / All Lines`;
    return "All Lines";
  }, [activeLine, activePlant?.name, selectedPlant]);

  const selectPlant = useCallback((id: string) => {
    setSelectedPlantId(id);
    setActiveLineId(null);
    setIsOpen(false);
    setExpandedPlant("");
  }, [setSelectedPlantId, setActiveLineId]);

  const selectLine = useCallback((lineId: string) => {
    const line = dbLines.find((l) => l.id === lineId);
    if (line) setSelectedPlantId(line.plantId);
    setActiveLineId(lineId);
    setIsOpen(false);
    setExpandedPlant("");
  }, [setSelectedPlantId, setActiveLineId, dbLines]);

  return (
      <div ref={ref} className="relative shrink-0 p-0 bg-background border-b border-border-major">
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full h-10 rounded-none px-3 text-[13px] font-medium bg-background text-sidebar-foreground hover:bg-sidebar-hover transition-colors`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 stroke-current transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className={`absolute left-0 right-0 top-full mt-1 z-50 bg-background border border-border rounded-lg shadow-lg ring-1 ring-slate-900/5 py-1 max-h-[300px] overflow-y-auto`}>
          {plants.map((plant) => (
            <div key={plant.id}>
              <button type="button" onClick={() => selectPlant(plant.id)}
                className={`flex items-center gap-2 w-full px-3 h-8 text-xs transition-colors ${activePlant?.id === plant.id ? "bg-success/10 text-success-foreground border-l-2 border-success font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${activePlant?.id === plant.id ? "bg-success/100" : "bg-muted-foreground/40"}`} />
                <span className="truncate flex-1 text-left">{plant.name}</span>
                {activePlant?.id === plant.id && <Check className="h-3 w-3 stroke-current shrink-0 text-success" />}
              </button>
              <button type="button" onClick={() => setExpandedPlant(expandedPlant === plant.id ? "" : plant.id)}
                className={`flex h-8 w-full items-center gap-1 px-3 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors`}
              >
                <ChevronRight className={`h-3 w-3 stroke-current transition-transform ${expandedPlant === plant.id ? "rotate-90" : ""}`} />
                Lines
              </button>
              {expandedPlant === plant.id && plant.lines.map((line) => (
                <button key={line.id} type="button" onClick={() => selectLine(line.id)}
                  className={`flex h-8 w-full items-center gap-2 pl-8 pr-3 text-xs transition-colors ${activeLineId === line.id ? "bg-success/10 text-success-foreground border-l-2 border-success font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  <span className="truncate text-left">{line.name}</span>
                  {activeLineId === line.id && <Check className="h-3 w-3 stroke-current shrink-0 text-success" />}
                </button>
              ))}
              {expandedPlant === plant.id && plant.lines.length === 0 && (
                <div className={`px-8 py-1 text-[11px] text-muted-foreground`}>No lines</div>
              )}
            </div>
          ))}
          {plants.length === 0 && (
            <div className={`px-3 py-2 text-[11px] text-muted-foreground`}>No production lines</div>
          )}
          <div className={`border-t border-border-major my-1`} />
          <button type="button" onClick={() => { setSelectedPlantId(null); setActiveLineId(null); setIsOpen(false); }}
            className={`flex items-center gap-2 w-full px-3 h-8 text-xs transition-colors ${!activeLineId ? "bg-success/10 text-success-foreground border-l-2 border-success font-semibold" : "text-foreground bg-muted hover:bg-success/10 hover:text-success-foreground"}`}
          >
            <span className="truncate flex-1 text-left">All Lines</span>
            {!activeLineId && <Check className="h-3 w-3 stroke-current shrink-0 text-success" />}
          </button>
        </div>
      )}
    </div>
  );
}
