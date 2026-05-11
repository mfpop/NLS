import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { Building2, ChevronRight, Settings, Database, AlertCircle, Users, Plus, ArrowRight, Info } from "lucide-react";
import { theme } from "../../../../styles/themeTokens";
import { REFERENCE_TABLE_QUERY } from "@/graphql/manufacturingQueries";
import { getTableEntityStyle } from "../config/entityConfig";

const TABLE_NAME_TO_KEY: Record<string, string> = {
  "Production Calendars": "production_calendar",
  "Shift Patterns": "shift_pattern",
  Languages: "language",
  Timezones: "timezone",
  "Manufacturing Types": "manufacturing_type",
  "Work Centers": "work_center_type",
  "Machine Types": "machine_type",
  "Operation Codes": "operation_code",
  "Routing Types": "routing_type",
  "Material Categories": "material_category",
  "Inventory Types": "inventory_type",
  "Kanban Types": "kanban_type",
  "Container Types": "container_type",
  "Unit Types": "unit_type",
  "Downtime Codes": "downtime_code",
  "Defect Codes": "defect_code",
  "Scrap Reasons": "scrap_reason",
  "Kaizen Categories": "kaizen_category",
  "Skill Types": "skill_type",
  Roles: "role",
  "Shift Teams": "shift_team",
};

const GROUP_LABELS: Record<string, string> = {
  organization: "Organization",
  manufacturing: "Manufacturing",
  material_flow: "Material Flow",
  lean_quality: "Lean / Quality",
  people: "People",
};

const GROUP_ORDER = ["organization", "manufacturing", "material_flow", "lean_quality", "people"];

const GROUP_ICONS: Record<string, typeof Database> = {
  organization: Building2, manufacturing: Settings, material_flow: Database, lean_quality: AlertCircle, people: Users,
};

const GROUP_DESCRIPTIONS: Record<string, string> = {
  organization: "Calendars, shifts, languages, timezones",
  manufacturing: "Types, centers, machines, routes, codes",
  material_flow: "Categories, inventory, kanban, containers, units",
  lean_quality: "Downtime, defects, scrap, kaizen categories",
  people: "Skills, roles, shift teams",
};

const GROUP_SHORTCUTS: Record<string, string> = {
  organization: "Configure production calendar & shift patterns",
  manufacturing: "Define manufacturing types & work centers",
  material_flow: "Set material categories & inventory types",
  lean_quality: "Manage downtime codes & defect categories",
  people: "Configure skills matrix & team roles",
};

interface ReferenceTableRow { id: string; name: string; entryCount: number; group: string; }

export function ReferenceTablesCard({ onSelectCompany }: { onSelectCompany?: () => void }) {
  const navigate = useNavigate();
  const [openGroup, setOpenGroup] = useState<string | null>("manufacturing");

  const { data } = useQuery<{ referenceTables: ReferenceTableRow[] }>(REFERENCE_TABLE_QUERY, {
    fetchPolicy: "cache-and-network", errorPolicy: "all",
  });

  const grouped = useMemo(() => {
    const map: Record<string, ReferenceTableRow[]> = {};
    for (const g of GROUP_ORDER) map[g] = [];
    for (const t of data?.referenceTables ?? []) {
      const g = t.group || "organization";
      if (map[g]) map[g].push(t); else map[g] = [t];
    }
    return map;
  }, [data]);

  const totalEntries = useMemo(() => {
    return (data?.referenceTables ?? []).reduce((s, t) => s + t.entryCount, 0);
  }, [data]);

  const toggleGroup = (g: string) => setOpenGroup(openGroup === g ? null : g);

  return (
    <div className="rounded border border-slate-200/50 dark:border-slate-800">
      <div className="px-2 py-1 text-[8px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50/40 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span>Configuration References</span>
        <span className={`text-[8px] font-normal ${theme.textMuted}`}>{data?.referenceTables?.length ?? 0} tables · {totalEntries} entries</span>
      </div>
      {GROUP_ORDER.map((g) => {
        const items = grouped[g] || [];
        const Icon = GROUP_ICONS[g];
        const isOpen = openGroup === g;
        return (
          <div key={g} className="border-b border-slate-100/50 dark:border-slate-800/50 last:border-b-0">
            <button type="button" onClick={() => toggleGroup(g)}
              className={`flex items-center justify-between w-full px-2 py-1 text-left transition-colors ${
                isOpen ? "bg-slate-100/50 dark:bg-slate-800/50" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <ChevronRight className={`h-2.5 w-2.5 text-slate-400 stroke-current shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                <Icon className="h-3 w-3 stroke-current shrink-0 text-slate-500" />
                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200">{GROUP_LABELS[g]}</span>
                <span className={`text-[8px] ${theme.textMuted}`}>{items.length + (g === "organization" ? 1 : 0)}</span>
              </div>
              <span className={`text-[8px] ${theme.textMuted} shrink-0`}>{GROUP_DESCRIPTIONS[g]}</span>
            </button>
            <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? "max-h-[2000px]" : "max-h-0"}`}>
              <div className="border-t border-slate-100/50 dark:border-slate-800/50">
                {g === "organization" && (
                  <button type="button" onClick={onSelectCompany}
                    className="flex w-full items-center gap-2 px-2 py-1 transition-colors hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5"
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <Building2 className="h-2.5 w-2.5 stroke-current" />
                    </span>
                    <span className="flex-1 text-left text-[10px] font-medium text-slate-700 dark:text-slate-200">Company</span>
                    <span className={`text-[8px] ${theme.textMuted}`}>Organization Settings</span>
                    <ArrowRight className="h-2.5 w-2.5 text-slate-400 stroke-current" />
                  </button>
                )}
                {items.length > 0 ? (
                  items.map((table) => {
                    const tableTypeKey = TABLE_NAME_TO_KEY[table.name] || table.name;
                    const entityStyle = getTableEntityStyle(tableTypeKey);
                    const EntityIcon = entityStyle.icon;
                    const [entityTextColor, entityBgColor] = entityStyle.color.split(" ");
                    return (
                    <button key={table.id} type="button"
                      onClick={() => navigate(`/system/production-structure/references/${table.id}`)}
                      className="flex w-full items-center gap-2 px-2 py-1 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${entityBgColor}`}>
                        <EntityIcon className={`h-2.5 w-2.5 stroke-current ${entityTextColor}`} />
                      </span>
                      <span className="flex-1 text-left text-[10px] truncate text-slate-600 dark:text-slate-300">{table.name}</span>
                      <span className={`text-[9px] font-medium shrink-0 ${theme.textMuted}`}>{table.entryCount}</span>
                      <ArrowRight className="h-2.5 w-2.5 text-slate-300 dark:text-slate-600 stroke-current" />
                    </button>
                    );
                  })
                ) : (
                  <div className="px-2 py-2 flex items-center gap-2 text-[9px] text-slate-400">
                    <Info className="h-3 w-3 stroke-current shrink-0 text-slate-300" />
                    <span className="flex-1">{GROUP_SHORTCUTS[g]}</span>
                    <button type="button" onClick={() => navigate("/system/production-structure/references")}
                      className="inline-flex items-center gap-0.5 text-emerald-600 hover:text-emerald-500 font-medium"
                    >
                      <Plus className="h-2.5 w-2.5 stroke-current" /> Add
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
