import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { Building2, ChevronRight, Settings, Database, AlertCircle, Users, Plus, ArrowRight, Info } from "lucide-react";
import { theme } from "../../../../styles/themeTokens";
import { REFERENCE_TABLES_LIST_QUERY } from "@/graphql/manufacturingQueries";
import { getTableEntityStyle } from "../config/entityConfig";

const TABLE_NAME_TO_KEY: Record<string, string> = {
  "Production Calendars": "production_calendar",
  "Shift Patterns": "shift_pattern",
  Languages: "language",
  Timezones: "timezone",
  "Industry Types": "industry_type",
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
  "Administrative Departments": "admin_department",
  "Shift Teams": "shift_team",
  "Product Models": "product_model",
  "Production Families": "production_family",
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
  manufacturing: "Types, centers, machines, routes, codes, product models, families",
  material_flow: "Categories, inventory, kanban, containers, units",
  lean_quality: "Downtime, defects, scrap, kaizen categories",
  people: "Skills, roles, departments, shift teams",
};

const GROUP_SHORTCUTS: Record<string, string> = {
  organization: "Configure production calendar & shift patterns",
  manufacturing: "Define manufacturing types & work centers",
  material_flow: "Set material categories & inventory types",
  lean_quality: "Manage downtime codes & defect categories",
  people: "Configure skills, departments & team roles",
};

const CATEGORY_CODE_TO_TABLE_KEY: Record<string, string> = {
  calendar: "production_calendar",
  production_calendar: "production_calendar",
  shift_model: "shift_pattern",
  shift_pattern: "shift_pattern",
  language: "language",
  language_locale: "language",
  timezone: "timezone",
  plant_type: "manufacturing_type",
  manufacturing_type: "manufacturing_type",
  department_type: "work_center_type",
  work_center_type: "work_center_type",
  resource_type: "machine_type",
  machine_type: "machine_type",
  resource_capability: "operation_code",
  operation_code: "operation_code",
  product_line: "routing_type",
  routing_type: "routing_type",
  manufacturing_focus: "material_category",
  material_category: "material_category",
  resource_group_type: "inventory_type",
  inventory_type: "inventory_type",
  lean_methodology: "kanban_type",
  kanban_type: "kanban_type",
  industry_type: "industry_type",
  container_type: "container_type",
  schedule: "unit_type",
  unit_type: "unit_type",
  status: "status",
  downtime_code: "downtime_code",
  defect_code: "defect_code",
  scrap_reason: "scrap_reason",
  kaizen_category: "kaizen_category",
  skill_type: "skill_type",
  role: "role",
  admin_department: "admin_department",
  shift_team: "shift_team",
  product_model: "product_model",
  production_family: "production_family",
};

const TABLE_KEY_TO_GROUP: Record<string, string> = {
  production_calendar: "organization",
  shift_pattern: "organization",
  language: "organization",
  timezone: "organization",
  industry_type: "organization",
  manufacturing_type: "manufacturing",
  work_center_type: "manufacturing",
  machine_type: "manufacturing",
  operation_code: "manufacturing",
  routing_type: "manufacturing",
  material_category: "material_flow",
  inventory_type: "material_flow",
  kanban_type: "material_flow",
  container_type: "material_flow",
  unit_type: "material_flow",
  downtime_code: "lean_quality",
  defect_code: "lean_quality",
  scrap_reason: "lean_quality",
  kaizen_category: "lean_quality",
  skill_type: "people",
  role: "people",
  admin_department: "people",
  shift_team: "people",
  product_model: "manufacturing",
  production_family: "manufacturing",
};

interface ReferenceTableRow {
  id: string;
  name: string;
  entryCount: number;
  group: string;
  tableTypeKey: string;
  categoryCode: string;
}
interface ReferenceTableApiRow {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  totalCount: number;
}

export function ReferenceTablesCard({ onSelectCompany }: { onSelectCompany?: () => void }) {
  const navigate = useNavigate();
  const [openGroup, setOpenGroup] = useState<string | null>("manufacturing");

  const { data } = useQuery<{ referenceTablesList: ReferenceTableApiRow[] }>(REFERENCE_TABLES_LIST_QUERY, {
    fetchPolicy: "cache-and-network", errorPolicy: "all",
  });

  const referenceTables = useMemo<ReferenceTableRow[]>(() => {
    return (data?.referenceTablesList ?? []).map((table) => {
      const byName = TABLE_NAME_TO_KEY[table.categoryName];
      const tableKey = byName || CATEGORY_CODE_TO_TABLE_KEY[table.categoryCode] || table.categoryCode;
      const group = TABLE_KEY_TO_GROUP[tableKey] || "organization";
      return {
        id: table.categoryId,
        name: table.categoryName,
        entryCount: table.totalCount,
        group,
        tableTypeKey: tableKey,
        categoryCode: table.categoryCode,
      };
    });
  }, [data]);

  const grouped = useMemo(() => {
    const map: Record<string, ReferenceTableRow[]> = {};
    for (const g of GROUP_ORDER) map[g] = [];
    for (const t of referenceTables) {
      const g = t.group || "organization";
      if (map[g]) map[g].push(t); else map[g] = [t];
    }
    return map;
  }, [referenceTables]);

  const totalEntries = useMemo(() => {
    return referenceTables.reduce((s, t) => s + t.entryCount, 0);
  }, [referenceTables]);

  const toggleGroup = (g: string) => setOpenGroup(openGroup === g ? null : g);

  return (
    <div className="rounded border border-border">
      <div className="px-2 py-1 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted border-b border-border flex items-center justify-between">
        <span>Configuration References</span>
        <span className={`text-[8px] font-normal ${theme.textMuted}`}>{referenceTables.length} tables · {totalEntries} entries</span>
      </div>
      {GROUP_ORDER.map((g) => {
        const items = grouped[g] || [];
        const Icon = GROUP_ICONS[g];
        const isOpen = openGroup === g;
        return (
          <div key={g} className="border-b border-border last:border-b-0">
            <button type="button" onClick={() => toggleGroup(g)}
              className={`flex items-center justify-between w-full px-2 py-1 text-left transition-colors ${
                isOpen ? "bg-muted" : "hover:bg-muted hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <ChevronRight className={`h-2.5 w-2.5 text-muted-foreground stroke-current shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                <Icon className="h-3 w-3 stroke-current shrink-0 text-muted-foreground" />
                <span className="text-[10px] font-semibold text-muted-foreground">{GROUP_LABELS[g]}</span>
                <span className={`text-[8px] ${theme.textMuted}`}>{items.length + (g === "organization" ? 1 : 0)}</span>
              </div>
              <span className={`text-[8px] ${theme.textMuted} shrink-0`}>{GROUP_DESCRIPTIONS[g]}</span>
            </button>
            <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? "max-h-500" : "max-h-0"}`}>
              <div className="border-t border-border">
                {g === "organization" && (
                  <button type="button" onClick={onSelectCompany}
                    className="flex w-full items-center gap-2 px-2 py-1 transition-colors hover:bg-info hover:bg-info"
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-success text-success bg-success text-success">
                      <Building2 className="h-2.5 w-2.5 stroke-current" />
                    </span>
                    <span className="flex-1 text-left text-[10px] font-medium text-muted-foreground">Company</span>
                    <span className={`text-[8px] ${theme.textMuted}`}>Organization Settings</span>
                    <ArrowRight className="h-2.5 w-2.5 text-muted-foreground stroke-current" />
                  </button>
                )}
                {items.length > 0 ? (
                  items.map((table) => {
                    const entityStyle = getTableEntityStyle(table.tableTypeKey);
                    const EntityIcon = entityStyle.icon;
                    const [entityTextColor, entityBgColor] = entityStyle.color.split(" ");
                    const nextTableType = table.tableTypeKey;
                    return (
                    <button key={table.id} type="button"
                      onClick={() => {
                        navigate(`/system/reference-tables/${nextTableType}`);
                      }}
                      className="flex w-full items-center gap-2 px-2 py-1 transition-colors hover:bg-muted hover:bg-muted"
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${entityBgColor}`}>
                        <EntityIcon className={`h-2.5 w-2.5 stroke-current ${entityTextColor}`} />
                      </span>
                      <span className="flex-1 text-left text-[10px] truncate text-muted-foreground">{table.name}</span>
                      <span className={`text-[9px] font-medium shrink-0 ${theme.textMuted}`}>{table.entryCount}</span>
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground stroke-current" />
                    </button>
                    );
                  })
                ) : (
                  <div className="px-2 py-2 flex items-center gap-2 text-[9px] text-muted-foreground">
                    <Info className="h-3 w-3 stroke-current shrink-0 text-muted-foreground" />
                    <span className="flex-1">{GROUP_SHORTCUTS[g]}</span>
                    <button type="button" onClick={() => navigate("/system/production-structure/references")}
                      className="inline-flex items-center gap-0.5 text-success hover:text-success font-medium"
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
