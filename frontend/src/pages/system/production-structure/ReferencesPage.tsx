import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useParams } from "react-router-dom";
import {
  Database, X, ChevronRight, ChevronDown, ChevronUp, Plus, Search, RefreshCw,
  Trash2, Save, FileSpreadsheet, ChevronsUpDown,
  Lock, Info, Building2,
} from "lucide-react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { useToolbar } from "./components/ToolbarContext";
import { theme } from "../../../styles/themeTokens";
import { COMPANY_QUERY, UPDATE_COMPANY_MUTATION } from "@/graphql/companyQueries";
import { REFERENCE_ITEMS_QUERY, CREATE_REFERENCE_ITEM_MUTATION, UPDATE_REFERENCE_ITEM_MUTATION, DEACTIVATE_REFERENCE_ITEM_MUTATION } from "@/graphql/referenceItemQueries";
import { CompanyEditor, type CompanyFormData } from "./components/CompanyEditor";
import { getTableEntityStyle } from "./config/entityConfig";
import { useActiveLine } from "@/hooks/useActiveLine";

interface RefItem {
  id: string;
  tableType: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  categoryName?: string;
  dataType?: string;
  usageContext?: string;
  usageImpact?: string;
  updatedAt?: string;
  isSystemManaged?: boolean;
  isConfigurable?: boolean;
  username?: string;
  email?: string;
  role?: string;
  department?: string;
  plant?: string;
  shiftTeam?: string;
  [key: string]: string | number | boolean | null | undefined;
}
type MutationErrorResult = { message: string };
type ReferenceItemMutationResponse = {
  createReferenceItem?: { errors?: MutationErrorResult[] };
  updateReferenceItem?: { errors?: MutationErrorResult[] };
  deactivateReferenceItem?: { errors?: MutationErrorResult[] };
};
interface DynamicField { key: string; label: string; required?: boolean; type?: "text" | "select"; options?: { label: string; value: string }[]; placeholder?: string; }
interface CompanyRecord {
  code?: string; name?: string; address?: string; phone?: string; email?: string; website?: string; description?: string;
  legalName?: string; industryType?: string; status?: string; statusId?: string; industryTypeId?: string;
  operatingSince?: string; manufacturingFocus?: string; manufacturingType?: string; productLines?: string;
  leanMethodology?: string; defaultTimezone?: string; defaultTimezoneId?: string; defaultLanguage?: string;
  defaultLanguageId?: string; defaultCalendar?: string; defaultCalendarId?: string; defaultShiftModel?: string;
  defaultShiftModelId?: string; weekStartDay?: string; weekStartDayId?: string; defaultUnits?: string;
  productionCalendar?: string; adminName?: string; adminRole?: string; city?: string; state?: string;
  country?: string; countryId?: string; zipcode?: string;
}

const EMPTY_REFERENCE_COMPANY_FORM: CompanyFormData = {
  name: "", code: "", legalName: "", industryType: "", status: "active", operatingSince: "",
  manufacturingFocus: "", productLines: "", leanMethodology: "", description: "",
  defaultTimezone: "", defaultLanguage: "", defaultCalendar: "", defaultShiftModel: "", weekStartDay: "",
  phone: "", email: "", website: "", adminName: "", adminRole: "",
  address: "", city: "", state: "", country: "", zipcode: "",
  statusId: "", industryTypeId: "", defaultTimezoneId: "", defaultLanguageId: "",
  defaultCalendarId: "", defaultShiftModelId: "", weekStartDayId: "",
  manufacturingType: "", defaultUnits: "", productionCalendar: "",
};

const GROUP_LABELS: Record<string, string> = {
  organization: "Organization",
  manufacturing: "Manufacturing",
  material_flow: "Material Flow",
  lean_quality: "Lean / Quality",
  people: "People",
};

const TABLE_TYPE_LABELS: Record<string, string> = {
  production_calendar: "Production Calendars", shift_pattern: "Shift Patterns", language: "Languages", timezone: "Timezones", industry_type: "Industry Types",
  manufacturing_type: "Manufacturing Types", work_center_type: "Work Centers", machine_type: "Machine Types", operation_code: "Operation Codes", routing_type: "Routing Types",
  material_category: "Material Categories", inventory_type: "Inventory Types", kanban_type: "Kanban Types", container_type: "Container Types", unit_type: "Unit Types",
  downtime_code: "Downtime Reasons", defect_code: "Quality Defect Types", scrap_reason: "Scrap Reasons", kaizen_category: "Lean / Quality Values",
  priority: "Priorities", label_badge: "Labels / Badges", maintenance_type: "Maintenance Types", material_flow_type: "Material Flow Types", process_type: "Process Types",
  skill_type: "Skill Types", role: "Roles", shift_team: "Shift Teams", staff_user: "Staff Users", staff_assignment: "Staff Assignments",
  product_model: "Product Models",
  production_family: "Production Families",
};

const TABLE_TYPE_SINGULAR: Record<string, string> = {
  production_calendar: "Production Calendar", shift_pattern: "Shift Pattern", language: "Language", timezone: "Timezone", industry_type: "Industry Type",
  manufacturing_type: "Manufacturing Type", work_center_type: "Work Center", machine_type: "Machine Type", operation_code: "Operation Code", routing_type: "Routing Type",
  material_category: "Material Category", inventory_type: "Inventory Type", kanban_type: "Kanban Type", container_type: "Container Type", unit_type: "Unit Type",
  downtime_code: "Downtime Reason", defect_code: "Quality Defect Type", scrap_reason: "Scrap Reason", kaizen_category: "Lean / Quality Value",
  priority: "Priority", label_badge: "Label / Badge", maintenance_type: "Maintenance Type", material_flow_type: "Material Flow Type", process_type: "Process Type",
  skill_type: "Skill Type", role: "Role", shift_team: "Shift Team", staff_user: "Staff User", staff_assignment: "Staff Assignment",
  product_model: "Product Model",
  production_family: "Product Family",
};

const TYPE_GROUPS: Record<string, string[]> = {
  organization: ["production_calendar", "shift_pattern", "language", "timezone", "industry_type"],
  manufacturing: ["manufacturing_type", "work_center_type", "machine_type", "operation_code", "routing_type", "product_model", "production_family"],
  material_flow: ["material_category", "inventory_type", "kanban_type", "container_type", "unit_type"],
  lean_quality: ["downtime_code", "defect_code", "scrap_reason", "kaizen_category", "priority", "label_badge", "maintenance_type", "material_flow_type", "process_type"],
  people: ["skill_type", "role", "shift_team", "staff_user", "staff_assignment"],
};

const GROUP_ORDER = ["organization", "manufacturing", "material_flow", "lean_quality", "people"];
const READ_ONLY_TABLE_TYPES = new Set<string>();
const PEOPLE_TABLE_TYPES = new Set(["skill_type", "role", "shift_team", "staff_user", "staff_assignment"]);

// Scope declarations for reference table types
// GLOBAL  — unaffected by Plant/Line selector
// PLANT   — filtered by activePlantId (staff_user/staff_assignment via relations)
// LINE    — reserved for future line-scoped references
type TableScope = "GLOBAL" | "PLANT" | "LINE";
const TABLE_SCOPE: Record<string, TableScope> = {
  production_calendar: "GLOBAL", shift_pattern: "GLOBAL", language: "GLOBAL", timezone: "GLOBAL", industry_type: "GLOBAL",
  manufacturing_type: "GLOBAL", work_center_type: "GLOBAL", machine_type: "GLOBAL", operation_code: "GLOBAL", routing_type: "GLOBAL",
  product_model: "GLOBAL", production_family: "GLOBAL",
  material_category: "GLOBAL", inventory_type: "GLOBAL", kanban_type: "GLOBAL", container_type: "GLOBAL", unit_type: "GLOBAL",
  downtime_code: "GLOBAL", defect_code: "GLOBAL", scrap_reason: "GLOBAL", kaizen_category: "GLOBAL", priority: "GLOBAL",
  label_badge: "GLOBAL", maintenance_type: "GLOBAL", material_flow_type: "GLOBAL", process_type: "GLOBAL",
  skill_type: "GLOBAL", role: "GLOBAL",
  shift_team: "PLANT",
  staff_user: "PLANT",
  staff_assignment: "PLANT",
};
function getTableScope(tableType: string): TableScope {
  return TABLE_SCOPE[tableType] ?? "GLOBAL";
}
function scopeLabel(scope: TableScope, plantName?: string, lineName?: string): string {
  if (scope === "GLOBAL") return "Global reference";
  if (scope === "PLANT") return plantName ? `Plant: ${plantName}` : "Plant: (select a plant)";
  if (scope === "LINE") return lineName ? `Line: ${lineName}` : "Line: (select a line)";
  return "";
}

function generateCode(): string { return `R${Math.random().toString(36).slice(2, 8).toUpperCase()}`; }

const BASE_FIELDS: DynamicField[] = [
  { key: "name", label: "Name", required: true },
  { key: "code", label: "Code", required: true },
  { key: "description", label: "Description", required: true },
  { key: "usageContext", label: "Usage Context", required: true },
  { key: "sortOrder", label: "Sort Order" },
  { key: "isActive", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] },
];

const TYPE_PLACEHOLDERS: Record<string, Partial<Record<string, string>>> = {
  production_calendar: { name: "e.g. Standard 5-Day Week", code: "e.g. STD5" },
  shift_pattern: { name: "e.g. Day Shift (06:00-14:00)", code: "e.g. 1SH-D" },
  language: { name: "e.g. English", code: "e.g. en" },
  timezone: { name: "e.g. Eastern Standard Time", code: "e.g. EST" },
  manufacturing_type: { name: "e.g. Discrete Manufacturing", code: "e.g. DISC" },
  work_center_type: { name: "e.g. Manual Workstation", code: "e.g. MANUAL" },
  machine_type: { name: "e.g. CNC Machine", code: "e.g. CNC" },
  operation_code: { name: "e.g. Cutting Operation", code: "e.g. CUT" },
  routing_type: { name: "e.g. Direct Route", code: "e.g. DIRECT" },
  material_category: { name: "e.g. Raw Material", code: "e.g. RAW" },
  inventory_type: { name: "e.g. Raw Material Stock", code: "e.g. RAW" },
  kanban_type: { name: "e.g. Production Kanban", code: "e.g. PROD" },
  container_type: { name: "e.g. Tote Box", code: "e.g. TOTE" },
  unit_type: { name: "e.g. Piece", code: "e.g. PC" },
  downtime_code: { name: "e.g. Setup / Changeover", code: "e.g. SETUP" },
  defect_code: { name: "e.g. Dimension Out of Spec", code: "e.g. DIM" },
  scrap_reason: { name: "e.g. Material Defect", code: "e.g. MATL" },
  kaizen_category: { name: "e.g. Safety Improvement", code: "e.g. SAFETY" },
  priority: { name: "e.g. Critical", code: "e.g. CRITICAL" },
  label_badge: { name: "e.g. At Risk", code: "e.g. AT_RISK" },
  maintenance_type: { name: "e.g. Preventive Maintenance", code: "e.g. PM" },
  material_flow_type: { name: "e.g. Kanban", code: "e.g. KANBAN" },
  process_type: { name: "e.g. Welding", code: "e.g. WELD" },
  skill_type: { name: "e.g. Machine Operator", code: "e.g. OPER" },
  role: { name: "e.g. Operator", code: "e.g. OP" },
  shift_team: { name: "e.g. Team A (Day)", code: "e.g. A" },
  staff_user: { name: "Backend user display name", code: "Backend username" },
  staff_assignment: { name: "Assigned staff member", code: "Backend username" },
  product_model: { name: "e.g. Cylinder Assembly Type A", code: "e.g. CYL-A" },
  production_family: { name: "e.g. Engine Family", code: "e.g. ENGINE" },
};

const ENTITY_SPECIFIC_FIELDS: Record<string, DynamicField[]> = {
  staff_user: [{ key: "email", label: "Email", placeholder: "e.g. operator@plant.com" }],
  staff_assignment: [
    { key: "email", label: "Email", placeholder: "e.g. operator@plant.com" },
    { key: "role", label: "Role", required: true, type: "select", options: [
      { label: "Database Admin", value: "db_admin" },
      { label: "Application Owner", value: "app_owner" },
      { label: "Department Manager", value: "dept_manager" },
      { label: "Supervisor", value: "supervisor" },
      { label: "Guest", value: "guest" },
    ]},
    { key: "department", label: "Department", placeholder: "e.g. Assembly" },
    { key: "plant", label: "Plant", placeholder: "e.g. Tijuana Plant" },
  ],
  timezone: [{ key: "utcOffset", label: "UTC Offset", placeholder: "e.g. UTC-5 (EST)" }, { key: "region", label: "Region", placeholder: "e.g. Americas" }],
  language: [{ key: "localeCode", label: "Locale Code", placeholder: "e.g. en-US" }],
  shift_pattern: [
    { key: "shiftType", label: "Shift Type", type: "select", options: [
      { label: "Day (06:00-14:00)", value: "day" },
      { label: "Afternoon (14:00-22:00)", value: "afternoon" },
      { label: "Night (22:00-06:00)", value: "night" },
      { label: "Split", value: "split" },
      { label: "Rotating", value: "rotating" },
    ]},
    { key: "startTime", label: "Start Time", placeholder: "e.g. 06:00" },
    { key: "endTime", label: "End Time", placeholder: "e.g. 14:00" },
    { key: "breakStart", label: "Break Start", placeholder: "e.g. 12:00" },
    { key: "breakEnd", label: "Break End", placeholder: "e.g. 12:30" },
    { key: "gracePeriod", label: "Grace Period (min)", placeholder: "e.g. 5" },
    { key: "overtimeRule", label: "Overtime Rule", placeholder: "e.g. Max 2h/day, 1.5x rate" },
  ],
  operation_code: [{ key: "operationCategory", label: "Category", placeholder: "e.g. Machining" }],
  kanban_type: [{ key: "pullType", label: "Pull Type", placeholder: "e.g. Supermarket" }],
};

function getFieldsForType(tableType: string): DynamicField[] {
  if (tableType === "staff_user") {
    return [
      { key: "name", label: "Name", required: true },
      { key: "email", label: "Email", placeholder: "e.g. operator@plant.com" },
      { key: "isActive", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] },
    ];
  }
  if (tableType === "staff_assignment") {
    return [
      { key: "name", label: "Name", required: true },
      ...(ENTITY_SPECIFIC_FIELDS.staff_assignment ?? []),
      { key: "isActive", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] },
    ];
  }
  const specific = ENTITY_SPECIFIC_FIELDS[tableType] ?? [];
  const ph = TYPE_PLACEHOLDERS[tableType] ?? {};
  const fields = [...BASE_FIELDS.slice(0, 3), ...specific, ...BASE_FIELDS.slice(3)];
  return fields.map((f) => ({ ...f, ...(ph[f.key] ? { placeholder: ph[f.key] } : {}) }));
}

function getEntityLabel(tableType: string): string { return TABLE_TYPE_SINGULAR[tableType] || tableType; }

function validateForm(fields: DynamicField[], values: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) { if (f.required && !values[f.key]?.trim()) errors[f.key] = `${f.label} is required`; }
  return errors;
}

function isWorkflowManagedTable(tableType: string | null | undefined): boolean {
  return !!tableType && READ_ONLY_TABLE_TYPES.has(tableType);
}

function isPeopleTable(tableType: string | null | undefined): boolean {
  return !!tableType && PEOPLE_TABLE_TYPES.has(tableType);
}

function statusBadgeClass(isActive: boolean): string {
  return isActive ? theme.badgeActive : theme.badgeInactive;
}

function formatDate(value?: string): string {
  return value ? value.slice(0, 10) : "";
}

function codeExistsInTable(items: RefItem[], tableType: string, code: string, currentId?: string): boolean {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return false;
  return items.some((item) => item.tableType === tableType && item.id !== currentId && item.code.toLowerCase() === normalized);
}

function belongsToSelectedTable(item: RefItem, tableType: string | null): boolean {
  if (!tableType || item.tableType !== tableType) return false;
  if (tableType === "staff_user") return item.id.startsWith("user:");
  if (tableType === "staff_assignment") return item.id.startsWith("user_role:");
  if (tableType === "shift_team" || tableType === "skill_type" || tableType === "role") {
    return item.id.startsWith(`${tableType}:`) || item.tableType === tableType;
  }
  return true;
}

function buildItemForm(item: RefItem): Record<string, string> {
  const form: Record<string, string> = {
    tableType: item.tableType,
    name: item.name,
    code: item.code,
    description: item.description || "",
    usageContext: item.usageContext || "",
    sortOrder: String(item.sortOrder),
    isActive: item.isActive ? "true" : "false",
    email: item.email || "",
    role: item.role || "",
    department: item.department || "",
    plant: item.plant || "",
  };
  for (const field of ENTITY_SPECIFIC_FIELDS[item.tableType] || []) {
    form[field.key] = item[field.key]?.toString() ?? "";
  }
  return form;
}

const COMPANY_REQUIRED_KEYS: Array<keyof CompanyFormData> = ["name", "code", "industryType", "manufacturingType", "defaultTimezone", "defaultUnits", "defaultShiftModel"];

const buildCompanyInput = (form: CompanyFormData) => ({
  code: form.code || null, name: form.name || null, description: form.description || null,
  status: form.status || null, statusId: form.statusId || null, address: form.address || null,
  city: form.city || null, state: form.state || null, country: form.country || null,
  phone: form.phone || null, email: form.email || null, website: form.website || null,
  defaultTimezone: form.defaultTimezone || null, defaultTimezoneId: form.defaultTimezoneId || null,
});

function ItemsList({ items, selectedType, tableSearch, onEdit }: {
  items: RefItem[]; selectedType: string | null; tableSearch: string;
  onEdit: (item: RefItem) => void;
}) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const typeItems = useMemo(() => items.filter((i) => belongsToSelectedTable(i, selectedType)), [items, selectedType]);
  const workflowManaged = isWorkflowManagedTable(selectedType);
  const isStaffUsers = selectedType === "staff_user";
  const isStaffAssignments = selectedType === "staff_assignment";
  const gridCols = isStaffAssignments
    ? "grid-cols-[220px_170px_190px_190px_160px_110px]"
    : isStaffUsers
      ? "grid-cols-[240px_180px_190px_190px_110px]"
      : "grid-cols-[220px_minmax(260px,1fr)_minmax(240px,1fr)_120px_220px_100px]";

  const visible = useMemo(() => {
    let result = typeItems;
    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      result = result.filter((i) => (
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        (i.description || "").toLowerCase().includes(q) ||
        (i.usageContext || "").toLowerCase().includes(q) ||
        (i.usageImpact || "").toLowerCase().includes(q) ||
        (i.categoryName || "").toLowerCase().includes(q) ||
        (i.dataType || "").toLowerCase().includes(q) ||
        (i.username || "").toLowerCase().includes(q) ||
        (i.role || "").toLowerCase().includes(q) ||
        (i.department || "").toLowerCase().includes(q) ||
        (i.plant || "").toLowerCase().includes(q) ||
        (i.shiftTeam || "").toLowerCase().includes(q)
      ));
    }
    if (sortConfig) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortConfig.key === "code") cmp = a.code.localeCompare(b.code);
        else if (sortConfig.key === "name") cmp = a.name.localeCompare(b.name);
        else if (sortConfig.key === "description") cmp = (a.description || "").localeCompare(b.description || "");
        else if (sortConfig.key === "status") cmp = Number(b.isActive) - Number(a.isActive);
        else if (sortConfig.key === "role") cmp = (a.role || "").localeCompare(b.role || "");
        else if (sortConfig.key === "department") cmp = (a.department || "").localeCompare(b.department || "");
        else if (sortConfig.key === "plant") cmp = (a.plant || "").localeCompare(b.plant || "");
        else if (sortConfig.key === "shiftTeam") cmp = (a.shiftTeam || "").localeCompare(b.shiftTeam || "");
        return sortConfig.direction === "desc" ? -cmp : cmp;
      });
    }
    return result;
  }, [typeItems, tableSearch, sortConfig]);

  const cycleSort = (key: string) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortConfig?.key === col) {
      return sortConfig.direction === "asc"
        ? <ChevronUp className="h-3 w-3 stroke-current text-muted-foreground shrink-0" />
        : <ChevronDown className="h-3 w-3 stroke-current text-muted-foreground shrink-0" />;
    }
    return <ChevronsUpDown className="h-3 w-3 stroke-current text-muted-foreground shrink-0" />;
  };

  const Th = ({ col, label, className = "" }: { col: string; label: string; className?: string }) => (
    <button type="button" onClick={() => cycleSort(col)}
      className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-muted-foreground hover:text-muted-foreground transition-colors ${className}`}>
      <span>{label}</span>
      <SortIcon col={col} />
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col min-h-0">
        <div className={`shrink-0 grid ${gridCols} gap-0 px-3 py-1.5 border-b border-border bg-muted`}>
          {isStaffAssignments ? (
            <>
              <Th col="name" label="Staff" />
              <Th col="role" label="Role" />
              <Th col="department" label="Department" />
              <Th col="plant" label="Plant" />
              <Th col="shiftTeam" label="Shift Team" />
              <Th col="status" label="Status" />
            </>
          ) : isStaffUsers ? (
            <>
              <Th col="name" label="Name" />
              <Th col="role" label="Role" />
              <Th col="department" label="Department" />
              <Th col="plant" label="Plant" />
              <Th col="status" label="Status" />
            </>
          ) : (
            <>
              <Th col="name" label="Name" />
              <Th col="description" label="Description" />
              <Th col="usageContext" label="Usage Context" />
              <Th col="status" label="Status" />
              <Th col="impact" label="Used By" />
              <Th col="code" label="Code" />
            </>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-xs text-muted-foreground">
              <Database className="h-8 w-8 stroke-current text-muted-foreground mb-2" />
              <span className="text-sm font-medium text-muted-foreground">
                {typeItems.length === 0 ? "No records yet" : "No matching records"}
              </span>
            </div>
          ) : (
            <div>
              {visible.map((item) => (
                <div key={item.id} onClick={() => { if (!workflowManaged) onEdit(item); }}
                  className={`grid ${gridCols} gap-0 px-3 transition-colors ${workflowManaged ? "cursor-default" : "cursor-pointer"} hover:bg-muted hover:bg-muted min-h-0`} style={{ height: "44px" }}>
                  {isStaffAssignments ? (
                    <>
                      <span className="flex items-center text-xs font-semibold truncate text-muted-foreground pr-2" title={item.name}>{item.name}</span>
                      <span className={`flex items-center truncate pr-2 text-[10px] ${theme.textSecondary}`} title={item.role || ""}>{item.role || "-"}</span>
                      <span className={`flex items-center truncate pr-2 text-[10px] ${theme.textSecondary}`} title={item.department || ""}>{item.department || "Unassigned"}</span>
                      <span className={`flex items-center truncate pr-2 text-[10px] ${theme.textSecondary}`} title={item.plant || ""}>{item.plant || "Unassigned"}</span>
                      <span className={`flex items-center truncate pr-2 text-[10px] ${theme.textSecondary}`} title={item.shiftTeam || ""}>{item.shiftTeam || "Not assigned"}</span>
                    </>
                  ) : isStaffUsers ? (
                    <>
                      <span className="flex min-w-0 flex-col justify-center pr-2">
                        <span className="truncate text-xs font-semibold text-muted-foreground" title={item.name}>{item.name}</span>
                        <span className={`truncate text-[9px] font-mono ${theme.textMuted}`} title={item.username || item.code}>{item.username || item.code}</span>
                      </span>
                      <span className={`flex items-center truncate pr-2 text-[10px] ${theme.textSecondary}`} title={item.role || ""}>{item.role || "-"}</span>
                      <span className={`flex items-center truncate pr-2 text-[10px] ${theme.textSecondary}`} title={item.department || ""}>{item.department || "Unassigned"}</span>
                      <span className={`flex items-center truncate pr-2 text-[10px] ${theme.textSecondary}`} title={item.plant || ""}>{item.plant || "Unassigned"}</span>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center text-xs font-semibold truncate text-muted-foreground pr-2" title={item.name}>{item.name}</span>
                      <span className="flex items-center text-[10px] truncate text-muted-foreground leading-tight text-left pr-2">
                        {item.description}
                      </span>
                      <span className={`flex items-center truncate pr-2 text-[10px] ${theme.textSecondary}`} title={item.usageContext || ""}>{item.usageContext}</span>
                    </>
                  )}
                  <span className="flex items-center">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${statusBadgeClass(item.isActive)}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${item.isActive ? 'bg-success' : 'bg-muted'}`} />
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </span>
                  {!isStaffUsers && !isStaffAssignments && (
                    <>
                      <span className={`flex items-center truncate pr-2 text-[10px] ${theme.textSecondary}`} title={item.usageImpact || ""}>{item.usageImpact}</span>
                      <span className="flex items-center overflow-hidden pr-2">
                        <span className="inline-flex max-w-full items-center truncate rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none tracking-wide text-muted-foreground border-border bg-muted text-muted-foreground" title={item.code}>
                          {item.code}
                        </span>
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExplorerBrowser({ openGroup, toggleGroup, groupedFiltered, openCompany, selectedType, selectType, itemsLoading, itemsData }: {
  openGroup: string | null; toggleGroup: (g: string) => void;
  groupedFiltered: Record<string, RefItem[]>; openCompany: () => void;
  selectedType: string | null; selectType: (tt: string) => void;
  itemsLoading: boolean; itemsData?: { referenceItems: RefItem[] };
}) {
  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex-1 overflow-y-auto">
        {itemsLoading && !itemsData ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin stroke-current" /> Loading...</div>
        ) : (
          <div>
            {GROUP_ORDER.map((g) => {
              const items = groupedFiltered[g] || [];
              const uniqueTypes = [...new Set([...TYPE_GROUPS[g], ...items.map((i) => i.tableType)])];
              const isOpen = openGroup === g;
              return (
                <div key={g}>
                  <button type="button" onClick={() => toggleGroup(g)}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 transition-colors text-left hover:bg-muted hover:bg-muted"
                    style={{ height: "34px" }}>
                    <ChevronRight className={`h-3 w-3 text-muted-foreground stroke-current shrink-0 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`} />
                    <span className="min-w-0 flex-1 text-[11px] font-medium text-muted-foreground">{GROUP_LABELS[g]}</span>
                    <span className="text-[9px] text-muted-foreground font-mono shrink-0">{uniqueTypes.length}</span>
                  </button>
                  <div className={`overflow-hidden transition-all duration-150 ease-in-out ${isOpen ? "" : "max-h-0"}`}>
                    {g === "organization" && (
                      <button type="button" onClick={openCompany}
                        className={`flex w-full cursor-pointer items-center gap-2 px-3 transition-colors border-l-3 ${
                          selectedType === "__company__"
                            ? "bg-success border-success"
                            : "hover:bg-muted hover:bg-muted border-transparent"
                        }`}
                        style={{ paddingLeft: "36px", height: "30px" }}>
                        <span className="flex-1 text-left text-[11px] font-medium text-muted-foreground">Company</span>
                        <span className="text-[9px] text-muted-foreground">setup</span>
                      </button>
                    )}
                    {uniqueTypes.map((tt) => {
                      const typeItems = items.filter((i) => i.tableType === tt);
                      const label = TABLE_TYPE_LABELS[tt] || tt;
                      const isSelected = selectedType === tt;
                      const entityStyle = getTableEntityStyle(tt);
                      const EntityIcon = entityStyle.icon;
                      const [entityTextColor, entityBgColor] = entityStyle.color.split(" ");
                      const workflowManaged = isWorkflowManagedTable(tt);
                      const hasUsage = typeItems.some((item) => item.usageImpact);
                      return (
                        <button key={tt} type="button" onClick={() => selectType(tt)}
                          className={`flex w-full cursor-pointer items-center gap-2 px-3 transition-colors border-l-3 ${
                            isSelected
                              ? "bg-muted border-success"
                              : "hover:bg-muted hover:bg-muted border-transparent"
                          }`}
                          style={{ paddingLeft: "36px", height: "30px" }}>
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${entityBgColor}`}>
                            <EntityIcon className={`h-2.5 w-2.5 stroke-current ${entityTextColor}`} />
                          </span>
                          <span className={`flex-1 text-left text-[11px] truncate ${isSelected ? "font-semibold text-muted-foreground" : "font-medium text-muted-foreground"}`}>{label}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {workflowManaged && <Lock className="h-2.5 w-2.5 stroke-current text-info" aria-label="Managed by workflow" />}
                            {!workflowManaged && hasUsage && <Info className="h-2.5 w-2.5 stroke-current text-warning" aria-label="Used by production data" />}
                            <span className="text-[9px] text-muted-foreground font-mono">{typeItems.length}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function ReferencesPage({ standalone = true }: { standalone?: boolean }) {
  const { showSystemMessage } = useToolbar();
  const [search, setSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [openGroup, setOpenGroup] = useState<string | null>("organization");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const { tableId } = useParams<{ tableId: string }>();

  useEffect(() => {
    if (tableId && TABLE_TYPE_LABELS[tableId]) {
      setSelectedType(tableId);
      const group = Object.entries(TYPE_GROUPS).find(([, types]) => types.includes(tableId))?.[0];
      if (group) setOpenGroup(group);
    }
  }, [tableId]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [companyForm, setCompanyForm] = useState<CompanyFormData>({ ...EMPTY_REFERENCE_COMPANY_FORM });
  const [companySaving, setCompanySaving] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companyErrorDismissed, setCompanyErrorDismissed] = useState(false);
  const [companyTouched, setCompanyTouched] = useState<Record<string, boolean>>({});
  const [editingItem, setEditingItem] = useState<RefItem | null>(null);
  const [companyEditMode, setCompanyEditMode] = useState(false);
  const [itemForm, setItemForm] = useState<Record<string, string>>({});
  const [itemSaving, setItemSaving] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [itemErrorDismissed, setItemErrorDismissed] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<RefItem | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const { productionLineId, activeLine } = useActiveLine();
  const activePlantId = activeLine?.plantId ?? null;
  const activePlantName = activeLine?.plantName ?? null;
  const activeLineName = activeLine?.name ?? null;

  const queryVars = useMemo(() => ({
    tableType: null,
    plantId: activePlantId,
    productionLineId: productionLineId,
  }), [activePlantId, productionLineId]);

  const showToast = useCallback((message: string) => {
    showSystemMessage(message, "success");
  }, [showSystemMessage]);

  const { data: itemsData, loading: itemsLoading, refetch: refetchItems } = useQuery<{ referenceItems: RefItem[] }>(REFERENCE_ITEMS_QUERY, {
    variables: queryVars, fetchPolicy: "cache-and-network", errorPolicy: "all",
  });
  const { data: companyData } = useQuery<{ company: CompanyRecord | null }>(COMPANY_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const [updateCompany] = useMutation(UPDATE_COMPANY_MUTATION, { refetchQueries: [COMPANY_QUERY] });
  const [createItem] = useMutation(CREATE_REFERENCE_ITEM_MUTATION, { refetchQueries: [REFERENCE_ITEMS_QUERY] });
  const [updateItem] = useMutation(UPDATE_REFERENCE_ITEM_MUTATION, { refetchQueries: [REFERENCE_ITEMS_QUERY] });
  const [deactivateItem] = useMutation(DEACTIVATE_REFERENCE_ITEM_MUTATION, { refetchQueries: [REFERENCE_ITEMS_QUERY] });
  const company = companyData?.company;
  const allItems = itemsData?.referenceItems ?? [];
  const selectedRecord = useMemo(() => {
    if (!selectedRecordId) return null;
    return allItems.find((item) => item.id === selectedRecordId) || null;
  }, [allItems, selectedRecordId]);

  const currentTableType = editingItem?.tableType || itemForm.tableType || selectedType || "";
  const selectedReadOnly = selectedType ? READ_ONLY_TABLE_TYPES.has(selectedType) : false;
  const activeFields = useMemo(() => getFieldsForType(currentTableType), [currentTableType]);
  const fieldErrors = useMemo(() => validateForm(activeFields, itemForm), [activeFields, itemForm]);
  const codeDuplicate = useMemo(() => {
    if (!currentTableType || !itemForm.code) return false;
    return codeExistsInTable(allItems, currentTableType, itemForm.code, editingItem?.id);
  }, [allItems, currentTableType, itemForm.code, editingItem?.id]);
  const isFormValid = useMemo(() => Object.keys(fieldErrors).length === 0 && !codeDuplicate, [fieldErrors, codeDuplicate]);

  const allItemsFiltered = useMemo(() => {
    if (!search) return allItems;
    const q = search.toLowerCase();
    const matchedGroups = GROUP_ORDER.filter(g => GROUP_LABELS[g].toLowerCase().includes(q));
    return allItems.filter((i) => {
      const ig = Object.entries(TYPE_GROUPS).find(([, types]) => types.includes(i.tableType))?.[0];
      if (ig && matchedGroups.includes(ig)) return true;
      return i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || (TABLE_TYPE_LABELS[i.tableType] || "").toLowerCase().includes(q);
    });
  }, [allItems, search]);

  const groupedFiltered = useMemo(() => {
    const map: Record<string, RefItem[]> = {};
    for (const g of GROUP_ORDER) map[g] = [];
    for (const item of allItemsFiltered) {
      for (const [g, types] of Object.entries(TYPE_GROUPS)) { if (types.includes(item.tableType)) { map[g].push(item); break; } }
    }
    return map;
  }, [allItemsFiltered]);

  const totalItems = useMemo(() => allItems.length, [allItems]);
  const totalTypes = useMemo(() => new Set(allItems.map(i => i.tableType)).size, [allItems]);

  const isItemDirty = useMemo(() => {
    if (editingItem) {
      const baseMatch = itemForm.name === editingItem.name && itemForm.code === editingItem.code && itemForm.description === (editingItem.description || "") && itemForm.sortOrder === String(editingItem.sortOrder) && itemForm.isActive === (editingItem.isActive ? "true" : "false");
      if (!baseMatch) return true;
      const specific = ENTITY_SPECIFIC_FIELDS[editingItem.tableType] || [];
      return specific.some((f) => (itemForm[f.key] ?? "") !== (editingItem[f.key]?.toString() ?? ""));
    }
    if (itemForm.tableType && itemForm.name !== undefined) return itemForm.name !== "" || itemForm.code !== "";
    return false;
  }, [editingItem, itemForm]);

  const toggleGroup = (g: string) => setOpenGroup(openGroup === g ? null : g);

  const selectType = (tt: string) => {
    setCompanyEditMode(false);
    setEditingItem(null);
    setSelectedRecordId(null);
    setItemForm({});
    setSelectedType(tt);
  };

  const openCompany = () => {
    setSelectedType(null);
    setEditingItem(null);
    setSelectedRecordId(null);
    setItemForm({});
    setItemError(null);
    setItemErrorDismissed(false);
    if (company) setCompanyForm({
      ...EMPTY_REFERENCE_COMPANY_FORM,
      code: company.code || "", name: company.name || "", address: company.address || "",
      phone: company.phone || "", email: company.email || "",
      website: company.website || "", description: company.description || "",
      legalName: company.legalName || "", industryType: company.industryType || "",
      status: company.status || "active", statusId: company.statusId || "",
      industryTypeId: company.industryTypeId || "",
      operatingSince: company.operatingSince || "",
      productLines: company.productLines || "",
      leanMethodology: company.leanMethodology || "",
      defaultTimezone: company.defaultTimezone || "",
      defaultTimezoneId: company.defaultTimezoneId || "",
      defaultLanguage: company.defaultLanguage || "",
      defaultLanguageId: company.defaultLanguageId || "",
      defaultCalendar: company.defaultCalendar || "",
      defaultCalendarId: company.defaultCalendarId || "",
      defaultShiftModel: company.defaultShiftModel || "",
      defaultShiftModelId: company.defaultShiftModelId || "",
      weekStartDay: company.weekStartDay || "",
      weekStartDayId: company.weekStartDayId || "",
      adminName: company.adminName || "", adminRole: company.adminRole || "",
      city: company.city || "", state: company.state || "",
      country: company.country || "",
      zipcode: company.zipcode || "",
    });
    setCompanyError(null);
    setCompanyErrorDismissed(false);
    setCompanyTouched({});
    setCompanyEditMode(true);
  };

  useEffect(() => {
    if (!companyEditMode || !company) return;
    setCompanyForm({
      ...EMPTY_REFERENCE_COMPANY_FORM,
      code: company.code || "", name: company.name || "", address: company.address || "",
      phone: company.phone || "", email: company.email || "",
      website: company.website || "", description: company.description || "",
      legalName: company.legalName || "", industryType: company.industryType || "",
      status: company.status || "active", statusId: company.statusId || "",
      industryTypeId: company.industryTypeId || "",
      operatingSince: company.operatingSince || "",
      productLines: company.productLines || "",
      leanMethodology: company.leanMethodology || "",
      defaultTimezone: company.defaultTimezone || "",
      defaultTimezoneId: company.defaultTimezoneId || "",
      defaultLanguage: company.defaultLanguage || "",
      defaultLanguageId: company.defaultLanguageId || "",
      defaultCalendar: company.defaultCalendar || "",
      defaultCalendarId: company.defaultCalendarId || "",
      defaultShiftModel: company.defaultShiftModel || "",
      defaultShiftModelId: company.defaultShiftModelId || "",
      weekStartDay: company.weekStartDay || "",
      weekStartDayId: company.weekStartDayId || "",
      adminName: company.adminName || "", adminRole: company.adminRole || "",
      city: company.city || "", state: company.state || "",
      country: company.country || "",
      zipcode: company.zipcode || "",
    });
  }, [companyEditMode, company]);

  const openAddItem = (tableType: string) => {
    if (READ_ONLY_TABLE_TYPES.has(tableType)) return;
    setCompanyEditMode(false);
    setEditingItem(null);
    setSelectedRecordId(null);
    setItemForm({ tableType, name: "", code: generateCode(), description: "", usageContext: "", sortOrder: "0", isActive: "true" });
    setItemError(null);
    setItemErrorDismissed(false);
    setShowUnsavedModal(false);
    setSelectedType(tableType);
  };

  const openEditItem = (item: RefItem) => {
    if (READ_ONLY_TABLE_TYPES.has(item.tableType)) return;
    setCompanyEditMode(false);
    setEditingItem(item);
    setSelectedRecordId(item.id);
    setSelectedType(item.tableType);
    setItemForm(buildItemForm(item));
    setItemError(null);
    setItemErrorDismissed(false);
    setShowUnsavedModal(false);
  };

  const closePanel = useCallback(() => {
    setCompanyEditMode(false);
    setEditingItem(null);
    setSelectedRecordId(null);
    setItemForm({});
    setItemError(null);
    setItemErrorDismissed(false);
    setShowUnsavedModal(false);
    setConfirmDelete(null);
  }, []);

  const tryClosePanel = useCallback(() => {
    const formChanged = editingItem ? isItemDirty : itemForm.name !== "" || itemForm.code !== "";
    if (formChanged && !showUnsavedModal) { setShowUnsavedModal(true); return; }
    closePanel();
  }, [editingItem, itemForm, showUnsavedModal, isItemDirty]);

  useEffect(() => {
    if (!editingItem || !selectedRecordId) return;
    if (!selectedRecord) {
      closePanel();
      return;
    }
    if (selectedRecord.tableType !== editingItem.tableType) return;
    setEditingItem(selectedRecord);
    if (!isItemDirty) setItemForm(buildItemForm(selectedRecord));
  }, [selectedRecord, selectedRecordId, editingItem, isItemDirty, closePanel]);

  const handleItemSave = useCallback(async () => {
    if (!isFormValid) return;
    setItemSaving(true); setItemError(null); setItemErrorDismissed(false);
    try {
      const input: Record<string, unknown> = {
        tableType: itemForm.tableType, code: itemForm.code, name: itemForm.name,
        description: itemForm.description || "", usageContext: itemForm.usageContext || "",
        sortOrder: parseInt(itemForm.sortOrder) || 0, isActive: itemForm.isActive === "true",
        email: itemForm.email || "", role: itemForm.role || "", department: itemForm.department || "", plant: itemForm.plant || "",
      };
      ENTITY_SPECIFIC_FIELDS[currentTableType]?.forEach(f => { if (itemForm[f.key]) input[f.key] = itemForm[f.key]; });
      const response = editingItem
        ? await updateItem({ variables: { id: editingItem.id, input } })
        : await createItem({ variables: { input } });
      const responseData = response.data as ReferenceItemMutationResponse | undefined;
      const errors = editingItem ? responseData?.updateReferenceItem?.errors : responseData?.createReferenceItem?.errors;
      if (errors?.length) {
        setItemError(errors.map((error: { message: string }) => error.message).join(", "));
        setItemSaving(false);
        return;
      }
      closePanel(); showToast("Record saved");
    } catch (e) { setItemError(e instanceof Error ? e.message : "Save failed"); }
    setItemSaving(false);
  }, [isFormValid, itemForm, currentTableType, editingItem, updateItem, createItem, closePanel, showToast]);

  const handleModalSave = useCallback(async () => { setShowUnsavedModal(false); await handleItemSave(); }, [handleItemSave]);
  const handleModalDiscard = useCallback(() => { setShowUnsavedModal(false); closePanel(); }, [closePanel]);
  const handleModalCancel = useCallback(() => { setShowUnsavedModal(false); }, []);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setItemSaving(true); setItemError(null); setItemErrorDismissed(false);
    try {
      const response = await deactivateItem({ variables: { id: confirmDelete.id } });
      const responseData = response.data as ReferenceItemMutationResponse | undefined;
      const errors = responseData?.deactivateReferenceItem?.errors;
      if (errors?.length) {
        setItemError(errors.map((error: { message: string }) => error.message).join(", "));
        setItemSaving(false);
        setConfirmDelete(null);
        return;
      }
      closePanel(); showToast("Record deactivated"); await refetchItems();
    } catch (e) { setItemError(e instanceof Error ? e.message : "Delete failed"); }
    setItemSaving(false); setConfirmDelete(null);
  };

  const handleFieldChange = (key: string, value: string) => {
    setItemForm((p) => ({ ...p, [key]: value }));
    if (showUnsavedModal) setShowUnsavedModal(false);
  };

  const closeCompanyEdit = () => { setCompanyEditMode(false); setCompanyError(null); setCompanyErrorDismissed(false); };

  const handleCompanySave = useCallback(async () => {
    const newTouched: Record<string, boolean> = {};
    COMPANY_REQUIRED_KEYS.forEach((k) => { newTouched[k] = true; });
    setCompanyTouched((prev) => ({ ...prev, ...newTouched }));
    const emptyRequired = COMPANY_REQUIRED_KEYS.filter((k) => !companyForm[k]?.trim());
    if (emptyRequired.length > 0) {
      const el = document.getElementById(`company-field-${emptyRequired[0]}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus(); return;
    }
    setCompanySaving(true); setCompanyError(null); setCompanyErrorDismissed(false);
    try {
      await updateCompany({ variables: { input: buildCompanyInput(companyForm) } });
      setCompanyEditMode(false);
      showToast("Record saved");
    } catch (e) { setCompanyError(e instanceof Error ? e.message : "Save failed"); }
    setCompanySaving(false);
  }, [companyForm, updateCompany, showToast]);

  const saveCompanyHandlerRef = useRef(handleCompanySave);
  saveCompanyHandlerRef.current = handleCompanySave;
  const saveItemHandlerRef = useRef(handleItemSave);
  saveItemHandlerRef.current = handleItemSave;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (companyEditMode) saveCompanyHandlerRef.current();
        else if (editingItem || (itemForm.tableType && itemForm.name !== undefined)) saveItemHandlerRef.current();
      }
    }
    document.addEventListener("keydown", handleKeyDown); return () => document.removeEventListener("keydown", handleKeyDown);
  }, [companyEditMode, editingItem, itemForm]);

  const selectedTypeItems: RefItem[] = useMemo(() => {
    if (!selectedType) return [];
    return allItems.filter((i) => belongsToSelectedTable(i, selectedType));
  }, [allItems, selectedType]);
  const selectedGroupLabel = useMemo(() => {
    if (!selectedType) return "";
    const group = Object.entries(TYPE_GROUPS).find(([, types]) => types.includes(selectedType))?.[0];
    return group ? GROUP_LABELS[group] : "";
  }, [selectedType]);
  const selectedDataType = selectedReadOnly ? "Managed by workflow" : selectedTypeItems[0]?.dataType || "Configurable";
  const selectedUsageContext = selectedTypeItems[0]?.usageContext || "";
  const selectedUpdatedDates = selectedTypeItems.map((item) => item.updatedAt || "").filter(Boolean).sort();
  const selectedUpdatedAt = selectedUpdatedDates[selectedUpdatedDates.length - 1] || "";
  const selectedTablePurpose = selectedType === "skill_type"
    ? "Reusable skills/certifications used by resources, staff and training."
    : selectedType === "role"
      ? "Permissions and responsibilities that feed ownership, approvals and manager/supervisor selections."
      : selectedType === "shift_team"
        ? "Production crews used by schedules, execution and staff assignments."
        : selectedType === "staff_user"
          ? "Staff/user records sourced from the backend user workflow."
          : selectedType === "staff_assignment"
            ? "Relationship between staff, role, plant and department that feeds staffing and ownership readiness."
            : "";
  const itemEditorOpen = Boolean(editingItem || (itemForm.tableType && itemForm.name !== undefined));
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      {standalone && (
        <PageHeader
          icon={<FileSpreadsheet className="h-5 w-5 stroke-current" />}
          iconClass={theme.iconBoxEmerald}
          title="Reference Tables"
          subtitle={`Administrative master-data catalog · ${totalTypes} tables, ${totalItems} records`}
        />
      )}

      {/* ── Toolbar ── */}
      {standalone && (
        <div className="shrink-0 flex items-center gap-3 border-b border-border bg-card bg-muted h-10 px-4">
          <div className="relative" style={{ width: 200 }}>
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground stroke-current pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search catalog..."
              className="h-7 w-full rounded border border-border bg-card pl-7 pr-2 text-[11px] outline-none text-muted-foreground placeholder:text-muted-foreground transition-colors focus:border-info border-border bg-muted text-muted-foreground dark:focus:border-info" />
          </div>
          {selectedType && !companyEditMode && !itemEditorOpen && (
            <>
              <span className="h-5 w-px bg-muted shrink-0" />
              <div className="relative" style={{ width: 200 }}>
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground stroke-current pointer-events-none" />
                <input type="text" value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} placeholder="Search records..."
                  className="h-7 w-full rounded border border-border bg-card pl-7 pr-2 text-[11px] outline-none text-muted-foreground placeholder:text-muted-foreground transition-colors focus:border-info border-border bg-muted text-muted-foreground dark:focus:border-info" />
              </div>
              <span className="h-5 w-px bg-muted shrink-0" />
              <span className="text-[11px] text-muted-foreground">Reference Tables</span>
              <ChevronRight className="h-3 w-3 stroke-current text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">{selectedGroupLabel}</span>
              <ChevronRight className="h-3 w-3 stroke-current text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground truncate">{TABLE_TYPE_LABELS[selectedType] || selectedType}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{selectedTypeItems.length}</span>
            </>
          )}
          {selectedType && !companyEditMode && itemEditorOpen && (
            <>
              <span className="h-5 w-px bg-muted shrink-0" />
              <span className="text-[11px] text-muted-foreground">Reference Tables</span>
              <ChevronRight className="h-3 w-3 stroke-current text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">{selectedGroupLabel}</span>
              <ChevronRight className="h-3 w-3 stroke-current text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground truncate">{TABLE_TYPE_LABELS[selectedType] || selectedType}</span>
              <ChevronRight className="h-3 w-3 stroke-current text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground truncate">
                {editingItem ? `Edit ${editingItem.name}` : `Add ${getEntityLabel(currentTableType)}`}
              </span>
              {isItemDirty && <span className="text-[10px] text-warning font-medium">unsaved</span>}
            </>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            {itemEditorOpen ? (
              <>
                {editingItem && (
                  <button type="button" onClick={() => setConfirmDelete(editingItem)} disabled={itemSaving}
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded text-[11px] font-medium text-danger hover:bg-danger hover:bg-danger transition-colors disabled:pointer-events-none disabled:opacity-40">
                    <Trash2 className="h-3.5 w-3.5 stroke-current" />
                    <span>Delete</span>
                  </button>
                )}
                <button type="submit" form="item-form" disabled={itemSaving || !isFormValid}
                  className="h-7 px-3 rounded text-[11px] font-semibold inline-flex items-center gap-1.5 bg-muted text-primary-foreground hover:bg-muted hover:bg-muted disabled:opacity-40 transition-colors">
                  {itemSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-current" /> : <Save className="h-3.5 w-3.5 stroke-current" />}
                  <span>Save</span>
                </button>
                <button type="button" onClick={tryClosePanel}
                  className="h-7 px-2.5 rounded text-[11px] font-medium inline-flex items-center gap-1 text-muted-foreground hover:bg-muted text-muted-foreground hover:bg-muted transition-colors">
                  <X className="h-3.5 w-3.5 stroke-current" />
                  <span>Cancel</span>
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => selectedType && openAddItem(selectedType)} disabled={!selectedType || selectedReadOnly} title={selectedReadOnly ? "Managed by workflow. Open the source workflow to add records." : "Add Record"}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded text-[11px] font-medium text-muted-foreground hover:bg-muted text-muted-foreground hover:bg-muted transition-colors disabled:pointer-events-none disabled:text-muted-foreground disabled:bg-transparent dark:disabled:text-muted-foreground">
                  <Plus className="h-3.5 w-3.5 stroke-current" />
                  <span>Add Record</span>
                </button>
                <button type="button" onClick={() => refetchItems()} disabled={itemsLoading}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded text-[11px] font-medium text-muted-foreground hover:bg-muted text-muted-foreground hover:bg-muted transition-colors disabled:pointer-events-none disabled:text-muted-foreground disabled:bg-transparent dark:disabled:text-muted-foreground">
                  <RefreshCw className={`h-3.5 w-3.5 stroke-current ${itemsLoading ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Content: 20/80 ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* LEFT: Catalog (20%) */}
        <div className="flex flex-col shrink-0 border-r border-border" style={{ width: "20%", minWidth: 200, maxWidth: 300 }}>
          <ExplorerBrowser
            openGroup={openGroup} toggleGroup={toggleGroup}
            groupedFiltered={groupedFiltered}
            openCompany={openCompany}
            selectedType={selectedType} selectType={selectType}
            itemsLoading={itemsLoading} itemsData={itemsData}
          />
        </div>

        {/* RIGHT: Details (80%) */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {companyEditMode ? (
            <div className="flex h-full flex-col">
              <div className="shrink-0 flex items-center justify-between border-b border-border px-3" style={{ height: "40px" }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] text-muted-foreground">Reference Tables</span>
                  <ChevronRight className="h-3 w-3 stroke-current text-muted-foreground" />
                  <span className="text-sm font-semibold text-muted-foreground">Company</span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={handleCompanySave} disabled={companySaving}
                    className="h-7 px-3 rounded text-[11px] font-semibold inline-flex items-center gap-1.5 bg-muted text-primary-foreground hover:bg-muted hover:bg-muted disabled:opacity-40 transition-colors">
                    {companySaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-current" /> : <Save className="h-3.5 w-3.5 stroke-current" />} Save
                  </button>
                  <button type="button" onClick={closeCompanyEdit}
                    className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-muted-foreground hover:bg-muted hover:bg-muted transition-colors">
                    <X className="h-3.5 w-3.5 stroke-current" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <CompanyEditor form={companyForm} onChange={(k, v) => setCompanyForm((p) => ({ ...p, [k]: v }))} compact
                  touchedFields={companyTouched} setTouched={setCompanyTouched} />
                {companyError && !companyErrorDismissed && (
                  <div className="mt-2 rounded border border-danger bg-danger px-2 py-1 text-[10px] text-danger border-danger bg-danger text-danger flex items-center justify-between">
                    <span>Save failed</span>
                    <button type="button" onClick={() => setCompanyErrorDismissed(true)} className="text-danger hover:text-danger ml-2"><X className="h-3 w-3 stroke-current" /></button>
                  </div>
                )}
              </div>
            </div>
          ) : editingItem || (itemForm.tableType && itemForm.name !== undefined) ? (
            <div className="flex h-full flex-col">
              <form id="item-form" onSubmit={(e) => { e.preventDefault(); handleItemSave(); }} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 max-w-xl">
                {currentTableType === "shift_pattern" && (
                  <div className="rounded border border-warning/25 bg-warning/10 px-2.5 py-2 text-[10px] leading-4 text-warning">
                    Shift times are saved as reference attributes only. Authoritative schedule duration, break duration, and capacity availability must be resolved by schedule/domain services.
                  </div>
                )}
                {activeFields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">
                      {f.label}{f.required && <span className="ml-0.5 text-danger">*</span>}
                    </label>
                    {f.type === "select" && f.options ? (
                      <div className="relative">
                        <select value={itemForm[f.key] ?? ""} onChange={(e) => handleFieldChange(f.key, e.target.value)}
                          className={`w-full h-8 rounded border px-2.5 text-[11px] appearance-none cursor-pointer transition-colors outline-none ${fieldErrors[f.key] ? "border-danger" : "border-border"} bg-card bg-muted text-muted-foreground`}>
                          {f.options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground stroke-current" />
                        {fieldErrors[f.key] && <p className="text-[9px] text-danger mt-0.5">{fieldErrors[f.key]}</p>}
                      </div>
                    ) : (
                      <div>
                        <input type="text" value={itemForm[f.key] ?? ""} onChange={(e) => handleFieldChange(f.key, e.target.value)} placeholder={f.placeholder}
                          className={`w-full h-8 rounded border px-2.5 text-[11px] transition-colors outline-none ${fieldErrors[f.key] ? "border-danger" : "border-border"} bg-card bg-muted text-muted-foreground placeholder:text-muted-foreground`} />
                        {fieldErrors[f.key] && <p className="text-[9px] text-danger mt-0.5">{fieldErrors[f.key]}</p>}
                        {f.key === "code" && codeDuplicate && <p className="text-[9px] text-danger mt-0.5">Code must be unique inside this table</p>}
                      </div>
                    )}
                  </div>
                ))}
                {itemError && !itemErrorDismissed && (
                  <div className="rounded border border-danger bg-danger px-2 py-1 text-[10px] text-danger border-danger bg-danger text-danger flex items-center justify-between">
                    <span>{itemError}</span>
                    <button type="button" onClick={() => setItemErrorDismissed(true)} className="text-danger hover:text-danger ml-2"><X className="h-3 w-3 stroke-current" /></button>
                  </div>
                )}
              </form>
            </div>
          ) : selectedType ? (
            <div className="flex h-full flex-col">
              <div className={`shrink-0 border-b px-3 py-2 ${theme.header}`}>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className={`text-sm font-semibold ${theme.textPrimary}`}>{TABLE_TYPE_LABELS[selectedType] || selectedType}</h2>
                  <span className={`text-[11px] ${theme.textMuted}`}>{selectedTypeItems.length} record{selectedTypeItems.length !== 1 ? "s" : ""}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${theme.chip}`}>{selectedGroupLabel}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${selectedReadOnly ? theme.infoBanner : theme.badgeActive}`}>
                    {selectedDataType}
                  </span>
                  {isPeopleTable(selectedType) && selectedTablePurpose && (
                    <span className={`min-w-0 truncate text-[11px] ${theme.textSecondary}`} title={selectedTablePurpose}>{selectedTablePurpose}</span>
                  )}
                  {!isPeopleTable(selectedType) && (
                    <span className={`min-w-0 truncate text-[11px] ${theme.textSecondary}`} title={selectedUsageContext}>{selectedUsageContext}</span>
                  )}
                  <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${theme.chip}`}>
                    {getTableScope(selectedType) === "GLOBAL" ? <Database className="h-3 w-3 stroke-current" /> : <Building2 className="h-3 w-3 stroke-current" />}
                    {scopeLabel(getTableScope(selectedType), activePlantName || undefined, activeLineName || undefined)}
                  </span>
                  {selectedUpdatedAt && <span className={`ml-auto text-[10px] ${theme.textMuted}`}>Updated {formatDate(selectedUpdatedAt)}</span>}
                </div>
              </div>
              {selectedReadOnly && (
                <div className={`mx-3 mt-2 flex shrink-0 items-center justify-between gap-2 rounded px-3 py-1.5 text-[10px] ${theme.infoBanner}`}>
                  <div className="flex min-w-0 items-center gap-2">
                    <Info className="h-3.5 w-3.5 shrink-0 stroke-current" />
                    <span className="truncate">
                      {selectedType === "staff_assignment"
                        ? "Staff assignments are managed from the assignment workflow. Direct edits are disabled to protect ownership and staffing counts."
                        : "Staff users are managed from the Staff/User workflow. Direct Add/Edit/Delete is disabled here."}
                    </span>
                  </div>
                </div>
              )}
              {getTableScope(selectedType) === "PLANT" && !activePlantId && (
                <div className={`mx-3 mt-2 flex shrink-0 items-center justify-between gap-2 rounded px-3 py-1.5 text-[10px] ${theme.warningBanner}`}>
                  <div className="flex min-w-0 items-center gap-2">
                    <Info className="h-3.5 w-3.5 shrink-0 stroke-current" />
                    <span className="truncate">Select a production line to view plant-scoped records for this table.</span>
                  </div>
                </div>
              )}
              <div className="flex-1 min-h-0">
                {getTableScope(selectedType) === "PLANT" && !activePlantId ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center px-4">
                      <Building2 className="h-10 w-10 stroke-current text-muted-foreground mx-auto mb-3" />
                      <p className="text-xs text-muted-foreground max-w-60 mx-auto leading-relaxed">Select a production line from the sidebar to view plant-scoped reference records.</p>
                    </div>
                  </div>
                ) : (
                  <ItemsList items={allItems} selectedType={selectedType} tableSearch={tableSearch} onEdit={openEditItem} />
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-4">
                <FileSpreadsheet className="h-10 w-10 stroke-current text-muted-foreground mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Reference Tables</h3>
                <p className="text-xs text-muted-foreground max-w-60 mx-auto leading-relaxed">
                  Select a table from the sidebar to browse and manage reference data.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      {standalone && selectedType && !companyEditMode && !editingItem && !(itemForm.tableType && itemForm.name !== undefined) && (
        <div className="shrink-0 border-t border-border bg-muted flex h-14 items-center px-5 text-[11px] text-muted-foreground font-medium">
          <span>{selectedTypeItems.length} record{selectedTypeItems.length !== 1 ? "s" : ""} in {TABLE_TYPE_LABELS[selectedType] || selectedType}</span>
        </div>
      )}

      {/* Unsaved changes modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-background" onClick={handleModalCancel} />
          <div className="relative bg-card bg-muted rounded-xl shadow-2xl border border-border p-5 w-90 max-w-[90vw]">
            <h3 className="text-sm font-bold text-muted-foreground mb-2">Unsaved changes</h3>
            <p className="text-[10px] text-muted-foreground mb-4">You have unsaved changes that will be lost.</p>
            <div className="flex items-center justify-end gap-1">
              <button type="button" onClick={handleModalSave} className="rounded px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted text-muted-foreground hover:bg-muted transition-colors">Save</button>
              <button type="button" onClick={handleModalDiscard} className="rounded px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted text-muted-foreground hover:bg-muted transition-colors">Discard</button>
              <button type="button" onClick={handleModalCancel} className="rounded px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-muted-foreground transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-background" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-card bg-muted rounded-xl shadow-2xl border border-border p-5 w-90 max-w-[90vw]">
            <h3 className="text-sm font-bold text-muted-foreground mb-2">Delete {confirmDelete.name}?</h3>
            <p className="text-[10px] text-muted-foreground mb-4">
              This record will be deactivated instead of removed. {confirmDelete.usageImpact}.
            </p>
            <div className="flex items-center justify-end gap-1">
              <button type="button" onClick={handleDelete} disabled={itemSaving}
                className="rounded px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger text-danger hover:bg-danger transition-colors disabled:opacity-40">
                {itemSaving ? "Deactivating..." : "Deactivate"}
              </button>
              <button type="button" onClick={() => setConfirmDelete(null)}
                className="rounded px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
