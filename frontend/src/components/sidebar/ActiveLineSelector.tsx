import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useQuery } from "@apollo/client/react";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { PRODUCTION_LINES_QUERY } from "@/graphql/productionLineQueries";
import { PLANTS_FALLBACK } from "./navigationConfig";
import type { Plant } from "@/types/plant";
import type { ProductionLine } from "@/types/productionLine";

export function ActiveLineSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState("");
  const [selectedLine, setSelectedLine] = useState("All Lines");
  const [expandedPlant, setExpandedPlant] = useState("");
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
    const db = plantsData?.plants;
    const lns = dbLines;
    if (db?.length && lns) {
      return db.map((p) => ({ name: p.name, lines: lns.filter((l) => l.plantId === p.id).map((l) => l.name) }));
    }
    return PLANTS_FALLBACK;
  }, [plantsData, dbLines]);

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
    if (!selectedPlant) return "All Lines";
    const p = plantsRef.current.find((x) => x.name === selectedPlant);
    return p ? `${p.name.slice(0, 16)} / ${selectedLine.slice(0, 20)}` : selectedLine;
  }, [selectedPlant, selectedLine, plants]);

  const selectPlant = useCallback((name: string) => {
    const p = plantsRef.current.find((x) => x.name === name);
    setSelectedPlant(name);
    setSelectedLine(p?.lines[0] || "All Lines");
    setIsOpen(false);
    setExpandedPlant("");
  }, []);

  const selectLine = useCallback((plantName: string, line: string) => {
    setSelectedPlant(plantName);
    setSelectedLine(line);
    setIsOpen(false);
    setExpandedPlant("");
  }, []);

  return (
    <div ref={ref} className="relative shrink-0 px-3 pt-2 pb-1 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full h-10 rounded-md px-2.5 text-[15px] font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 stroke-current transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 max-h-[300px] overflow-y-auto">
          {plants.map((plant) => (
            <div key={plant.name}>
              <button type="button" onClick={() => selectPlant(plant.name)}
                className={`flex items-center gap-2 w-full px-3 h-8 text-xs transition-colors ${selectedPlant === plant.name ? "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 font-semibold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${selectedPlant === plant.name ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                <span className="truncate flex-1 text-left">{plant.name}</span>
                {selectedPlant === plant.name && <Check className="h-3 w-3 stroke-current shrink-0" />}
              </button>
              <button type="button" onClick={() => setExpandedPlant(expandedPlant === plant.name ? "" : plant.name)}
                className="flex items-center gap-1 w-full px-3 h-7 text-[10px] font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <ChevronRight className={`h-3 w-3 stroke-current transition-transform ${expandedPlant === plant.name ? "rotate-90" : ""}`} />
                Lines
              </button>
              {expandedPlant === plant.name && plant.lines.map((line) => (
                <button key={line} type="button" onClick={() => selectLine(plant.name, line)}
                  className={`flex items-center gap-2 w-full pl-8 pr-3 h-7 text-xs transition-colors ${selectedPlant === plant.name && selectedLine === line ? "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 font-semibold" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}
                >
                  <span className="truncate text-left">{line}</span>
                  {selectedPlant === plant.name && selectedLine === line && <Check className="h-3 w-3 stroke-current shrink-0" />}
                </button>
              ))}
              {expandedPlant === plant.name && plant.lines.length === 0 && (
                <div className="px-8 py-1 text-[11px] text-slate-400 dark:text-slate-500">No lines</div>
              )}
            </div>
          ))}
          <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
          <button type="button" onClick={() => { setSelectedPlant(""); setSelectedLine("All Lines"); setIsOpen(false); }}
            className={`flex items-center gap-2 w-full px-3 h-8 text-xs transition-colors ${selectedLine === "All Lines" && !selectedPlant ? "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 font-semibold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}
          >
            <span className="truncate flex-1 text-left">All Lines</span>
            {selectedLine === "All Lines" && !selectedPlant && <Check className="h-3 w-3 stroke-current shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
}
