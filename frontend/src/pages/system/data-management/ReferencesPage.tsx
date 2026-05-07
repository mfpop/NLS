import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { Database, Building2, X, ChevronRight, ChevronDown, Plus, Search, RefreshCw, Settings, AlertCircle, Users, Pencil, Trash2, Save } from "lucide-react";
import { theme } from "../../../styles/themeTokens";
import { COMPANY_QUERY, UPDATE_COMPANY_MUTATION } from "@/graphql/companyQueries";
import { REFERENCE_ITEMS_QUERY, CREATE_REFERENCE_ITEM_MUTATION, UPDATE_REFERENCE_ITEM_MUTATION, DEACTIVATE_REFERENCE_ITEM_MUTATION } from "@/graphql/referenceItemQueries";
import { CompanyEditor } from "./components/CompanyEditor";

interface RefItem { id: string; tableType: string; code: string; name: string; description: string; isActive: boolean; sortOrder: number; }

interface DynamicField {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "select";
  options?: { label: string; value: string }[];
  placeholder?: string;
}

const GROUP_LABELS: Record<string, string> = {
  organization: "Organization",
  manufacturing: "Manufacturing",
  material_flow: "Material Flow",
  lean_quality: "Lean / Quality",
  people: "People",
};

const TABLE_TYPE_LABELS: Record<string, string> = {
  production_calendar: "Production Calendars", shift_pattern: "Shift Patterns", language: "Languages", timezone: "Timezones",
  manufacturing_type: "Manufacturing Types", work_center_type: "Work Centers", machine_type: "Machine Types", operation_code: "Operation Codes", routing_type: "Routing Types",
  material_category: "Material Categories", inventory_type: "Inventory Types", kanban_type: "Kanban Types", container_type: "Container Types", unit_type: "Unit Types",
  downtime_code: "Downtime Codes", defect_code: "Defect Codes", scrap_reason: "Scrap Reasons", kaizen_category: "Kaizen Categories",
  skill_type: "Skill Types", role: "Roles", shift_team: "Shift Teams",
};

const TABLE_TYPE_SINGULAR: Record<string, string> = {
  production_calendar: "Production Calendar", shift_pattern: "Shift Pattern", language: "Language", timezone: "Timezone",
  manufacturing_type: "Manufacturing Type", work_center_type: "Work Center", machine_type: "Machine Type", operation_code: "Operation Code", routing_type: "Routing Type",
  material_category: "Material Category", inventory_type: "Inventory Type", kanban_type: "Kanban Type", container_type: "Container Type", unit_type: "Unit Type",
  downtime_code: "Downtime Code", defect_code: "Defect Code", scrap_reason: "Scrap Reason", kaizen_category: "Kaizen Category",
  skill_type: "Skill Type", role: "Role", shift_team: "Shift Team",
};

const TYPE_GROUPS: Record<string, string[]> = {
  organization: ["production_calendar", "shift_pattern", "language", "timezone"],
  manufacturing: ["manufacturing_type", "work_center_type", "machine_type", "operation_code", "routing_type"],
  material_flow: ["material_category", "inventory_type", "kanban_type", "container_type", "unit_type"],
  lean_quality: ["downtime_code", "defect_code", "scrap_reason", "kaizen_category"],
  people: ["skill_type", "role", "shift_team"],
};

const GROUP_ORDER = ["organization", "manufacturing", "material_flow", "lean_quality", "people"];

const GROUP_ICONS: Record<string, typeof Database> = {
  organization: Building2, manufacturing: Settings, material_flow: Database, lean_quality: AlertCircle, people: Users,
};

function generateCode(): string {
  return `R${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

const BASE_FIELDS: DynamicField[] = [
  { key: "name", label: "Name", required: true },
  { key: "code", label: "Code", required: true },
  { key: "description", label: "Description" },
  { key: "sortOrder", label: "Sort Order" },
  { key: "isActive", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] },
];

const TYPE_PLACEHOLDERS: Record<string, Partial<Record<string, string>>> = {
  production_calendar: { name: "e.g. Standard 5-Day Week", code: "e.g. STD5", description: "e.g. Monday to Friday, 8-hour work days", sortOrder: "e.g. 10" },
  shift_pattern: { name: "e.g. Day Shift", code: "e.g. 1SH-D", description: "e.g. Single 8-hour day shift", sortOrder: "e.g. 10" },
  language: { name: "e.g. English", code: "e.g. en", description: "e.g. English language for interfaces", sortOrder: "e.g. 10" },
  timezone: { name: "e.g. Eastern Standard Time", code: "e.g. EST", description: "e.g. US Eastern timezone", sortOrder: "e.g. 10" },
  manufacturing_type: { name: "e.g. Discrete Manufacturing", code: "e.g. DISC", description: "e.g. Individual unit production", sortOrder: "e.g. 10" },
  work_center_type: { name: "e.g. Manual Workstation", code: "e.g. MANUAL", description: "e.g. Operator-based manual work", sortOrder: "e.g. 10" },
  machine_type: { name: "e.g. CNC Machine", code: "e.g. CNC", description: "e.g. Computer Numerical Control machine", sortOrder: "e.g. 10" },
  operation_code: { name: "e.g. Cutting Operation", code: "e.g. CUT", description: "e.g. Material cutting operation", sortOrder: "e.g. 10" },
  routing_type: { name: "e.g. Direct Route", code: "e.g. DIRECT", description: "e.g. Linear material flow without branches", sortOrder: "e.g. 10" },
  material_category: { name: "e.g. Raw Material", code: "e.g. RAW", description: "e.g. Unprocessed raw materials", sortOrder: "e.g. 10" },
  inventory_type: { name: "e.g. Raw Material Stock", code: "e.g. RAW", description: "e.g. Unprocessed material inventory", sortOrder: "e.g. 10" },
  kanban_type: { name: "e.g. Production Kanban", code: "e.g. PROD", description: "e.g. Authorizes production of parts", sortOrder: "e.g. 10" },
  container_type: { name: "e.g. Tote Box", code: "e.g. TOTE", description: "e.g. Standard plastic tote for parts", sortOrder: "e.g. 10" },
  unit_type: { name: "e.g. Piece", code: "e.g. PC", description: "e.g. Individual unit count", sortOrder: "e.g. 10" },
  downtime_code: { name: "e.g. Setup / Changeover", code: "e.g. SETUP", description: "e.g. Time spent changing between production runs", sortOrder: "e.g. 10" },
  defect_code: { name: "e.g. Dimension Out of Spec", code: "e.g. DIM", description: "e.g. Part dimension outside tolerance limits", sortOrder: "e.g. 10" },
  scrap_reason: { name: "e.g. Material Defect", code: "e.g. MATL", description: "e.g. Raw material defect discovered during processing", sortOrder: "e.g. 10" },
  kaizen_category: { name: "e.g. Safety Improvement", code: "e.g. SAFETY", description: "e.g. Improvement targeting employee safety", sortOrder: "e.g. 10" },
  skill_type: { name: "e.g. Machine Operator", code: "e.g. OPER", description: "e.g. Qualified machine operator", sortOrder: "e.g. 10" },
  role: { name: "e.g. Operator", code: "e.g. OP", description: "e.g. Line operator performing production work", sortOrder: "e.g. 10" },
  shift_team: { name: "e.g. Team A (Day)", code: "e.g. A", description: "e.g. Day shift primary team", sortOrder: "e.g. 10" },
};

const ENTITY_SPECIFIC_FIELDS: Record<string, DynamicField[]> = {
  timezone: [
    { key: "utcOffset", label: "UTC Offset", placeholder: "e.g. UTC-5 (EST), UTC+1 (CET), UTC+8 (CST China)" },
    { key: "region", label: "Region", placeholder: "e.g. Americas, Europe, Asia Pacific, Middle East" },
  ],
  language: [
    { key: "localeCode", label: "Locale Code", placeholder: "e.g. en-US, en-GB, es-MX, fr-CA, zh-CN" },
  ],
  shift_pattern: [
    { key: "shiftDuration", label: "Shift Duration (hours)", placeholder: "e.g. 8 (standard), 10 (compressed), 12 (extended)" },
    { key: "startTime", label: "Start Time", placeholder: "e.g. 06:00 (day), 14:00 (afternoon), 22:00 (night)" },
    { key: "endTime", label: "End Time", placeholder: "e.g. 14:00 (day), 22:00 (afternoon), 06:00 (night)" },
  ],
  operation_code: [
    { key: "operationCategory", label: "Operation Category", placeholder: "e.g. Machining, Assembly, Quality, Logistics, Finishing" },
  ],
  kanban_type: [
    { key: "pullType", label: "Pull Type", placeholder: "e.g. Supermarket, Sequential, Batch, Supplier, Emergency" },
  ],
};

function getFieldsForType(tableType: string): DynamicField[] {
  const specific = ENTITY_SPECIFIC_FIELDS[tableType] ?? [];
  const ph = TYPE_PLACEHOLDERS[tableType] ?? {};
  const fields = [...BASE_FIELDS.slice(0, 3), ...specific, ...BASE_FIELDS.slice(3)];
  return fields.map((f) => ({
    ...f,
    ...(ph[f.key] ? { placeholder: ph[f.key] } : {}),
  }));
}

function getEntityLabel(tableType: string): string {
  return TABLE_TYPE_SINGULAR[tableType] || tableType;
}

function validateForm(fields: DynamicField[], values: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    if (f.required && !values[f.key]?.trim()) {
      errors[f.key] = `${f.label} is required`;
    }
  }
  return errors;
}

export function ReferencesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [openGroup, setOpenGroup] = useState<string | null>("organization");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
  const [companyForm, setCompanyForm] = useState<Record<string, string>>({});
  const [companySaving, setCompanySaving] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<RefItem | null>(null);
  const [companyEditMode, setCompanyEditMode] = useState(false);
  const [itemForm, setItemForm] = useState<Record<string, string>>({});
  const [itemSaving, setItemSaving] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [showConfirmClosePanel, setShowConfirmClosePanel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: itemsData, loading: itemsLoading } = useQuery<{ referenceItems: RefItem[] }>(REFERENCE_ITEMS_QUERY, {
    variables: { tableType: null },
    fetchPolicy: "cache-and-network", errorPolicy: "all",
  });

  const { data: companyData } = useQuery<{ company: { id: string; code: string; name: string; address: string; phone: string; email: string; website: string; description: string; industryType: string; manufacturingType: string; defaultTimezone: string; defaultUnits: string; defaultShiftModel: string; productionCalendar: string; defaultLanguage: string; leanMethodology: string } }>(COMPANY_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const [updateCompany] = useMutation(UPDATE_COMPANY_MUTATION, { refetchQueries: [COMPANY_QUERY] });
  const [createItem] = useMutation(CREATE_REFERENCE_ITEM_MUTATION, { refetchQueries: [REFERENCE_ITEMS_QUERY] });
  const [updateItem] = useMutation(UPDATE_REFERENCE_ITEM_MUTATION, { refetchQueries: [REFERENCE_ITEMS_QUERY] });
  const [deactivateItem] = useMutation(DEACTIVATE_REFERENCE_ITEM_MUTATION, { refetchQueries: [REFERENCE_ITEMS_QUERY] });
  const company = companyData?.company;
  const allItems = itemsData?.referenceItems ?? [];

  const currentTableType = editingItem?.tableType || itemForm.tableType || "";

  const activeFields = useMemo(() => getFieldsForType(currentTableType), [currentTableType]);

  const fieldErrors = useMemo(() => validateForm(activeFields, itemForm), [activeFields, itemForm]);

  const isFormValid = useMemo(() => Object.keys(fieldErrors).length === 0, [fieldErrors]);

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
      for (const [g, types] of Object.entries(TYPE_GROUPS)) {
        if (types.includes(item.tableType)) { map[g].push(item); break; }
      }
    }
    return map;
  }, [allItemsFiltered]);

  const totalItems = useMemo(() => allItems.length, [allItems]);
  const totalTypes = useMemo(() => {
    const types = new Set(allItems.map(i => i.tableType));
    return types.size;
  }, [allItems]);
  const totalGroups = GROUP_ORDER.length;

  const toggleGroup = (g: string) => setOpenGroup(openGroup === g ? null : g);

  const openCompany = () => {
    setEditingItem(null);
    setItemForm({});
    setItemError(null);
    if (company) setCompanyForm({
      code: company.code, name: company.name, address: company.address || "",
      phone: company.phone || "", email: company.email || "",
      website: company.website || "", description: company.description || "",
      industryType: company.industryType || "", manufacturingType: company.manufacturingType || "",
      defaultTimezone: company.defaultTimezone || "", defaultUnits: company.defaultUnits || "",
      defaultShiftModel: company.defaultShiftModel || "", productionCalendar: company.productionCalendar || "",
      defaultLanguage: company.defaultLanguage || "", leanMethodology: company.leanMethodology || "",
    });
    setCompanyError(null);
    setCompanyEditMode(true);
  };

  const toggleType = (tt: string) => setExpandedType(expandedType === tt ? null : tt);

  const openAddItem = (tableType: string) => {
    setCompanyEditMode(false);
    setEditingItem(null);
    setItemForm({ tableType, name: "", code: generateCode(), description: "", sortOrder: "0", isActive: "true" });
    setItemError(null);
    setShowConfirmClosePanel(false);
  };

  const openEditItem = (item: RefItem) => {
    setCompanyEditMode(false);
    setEditingItem(item);
    const base: Record<string, string> = {
      tableType: item.tableType,
      name: item.name,
      code: item.code,
      description: item.description || "",
      sortOrder: String(item.sortOrder),
      isActive: item.isActive ? "true" : "false",
    };
    setItemForm(base);
    setItemError(null);
    setShowConfirmClosePanel(false);
  };

  const closePanel = () => {
    setCompanyEditMode(false);
    setEditingItem(null);
    setItemForm({});
    setItemError(null);
    setShowConfirmClosePanel(false);
  };

  const tryClosePanel = useCallback(() => {
    const formChanged = editingItem
      ? itemForm.name !== editingItem.name ||
        itemForm.code !== editingItem.code ||
        itemForm.description !== (editingItem.description || "") ||
        itemForm.sortOrder !== String(editingItem.sortOrder) ||
        itemForm.isActive !== (editingItem.isActive ? "true" : "false")
      : itemForm.name !== "" || itemForm.code !== "";
    if (formChanged && !showConfirmClosePanel) {
      setShowConfirmClosePanel(true);
      return;
    }
    closePanel();
  }, [editingItem, itemForm, showConfirmClosePanel]);

  const handleItemSave = async () => {
    if (!isFormValid) return;
    setItemSaving(true);
    setItemError(null);
    try {
      const input: Record<string, unknown> = {
        tableType: itemForm.tableType,
        code: itemForm.code,
        name: itemForm.name,
        description: itemForm.description || "",
        sortOrder: parseInt(itemForm.sortOrder) || 0,
        isActive: itemForm.isActive === "true",
      };
      ENTITY_SPECIFIC_FIELDS[currentTableType]?.forEach(f => {
        if (itemForm[f.key]) input[f.key] = itemForm[f.key];
      });
      if (editingItem) {
        await updateItem({ variables: { id: editingItem.id, input } });
      } else {
        await createItem({ variables: { input } });
      }
      closePanel();
    } catch (e) {
      setItemError(e instanceof Error ? e.message : "Save failed");
    }
    setItemSaving(false);
  };

  const handleDelete = async () => {
    if (!editingItem) return;
    setItemSaving(true);
    setItemError(null);
    try {
      await deactivateItem({ variables: { id: editingItem.id } });
      closePanel();
    } catch (e) {
      setItemError(e instanceof Error ? e.message : "Delete failed");
    }
    setItemSaving(false);
    setConfirmDelete(false);
  };

  const requestDelete = () => setConfirmDelete(true);
  const cancelDelete = () => setConfirmDelete(false);

  const panelTitle = editingItem
    ? `Edit ${editingItem.name}`
    : `Add ${getEntityLabel(currentTableType)}`;

  const handleFieldChange = (key: string, value: string) => {
    setItemForm((p) => ({ ...p, [key]: value }));
    if (showConfirmClosePanel) setShowConfirmClosePanel(false);
  };

  const breadcrumbGroupLabel = openGroup ? GROUP_LABELS[openGroup] : null;
  const breadcrumbTypeLabel = expandedType ? TABLE_TYPE_LABELS[expandedType] : null;
  const breadcrumbEditLabel = companyEditMode ? "Company" : editingItem?.name ?? null;

  const navigateBreadcrumb = (level: "root" | "group" | "type") => {
    if (level === "root") {
      setOpenGroup(null);
      setExpandedType(null);
      setEditingItem(null);
      setCompanyEditMode(false);
      setItemForm({});
      setItemError(null);
    } else if (level === "group") {
      setExpandedType(null);
      setEditingItem(null);
      setCompanyEditMode(false);
      setItemForm({});
      setItemError(null);
    } else {
      setEditingItem(null);
      setCompanyEditMode(false);
      setItemForm({});
      setItemError(null);
    }
  };

  const closeCompanyEdit = () => {
    setCompanyEditMode(false);
    setCompanyError(null);
  };

  const handleCompanySave = async () => {
    setCompanySaving(true);
    setCompanyError(null);
    try {
      await updateCompany({ variables: { input: companyForm } });
      setCompanyEditMode(false);
    } catch (e) {
      setCompanyError(e instanceof Error ? e.message : "Save failed");
    }
    setCompanySaving(false);
  };

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      <header className={`flex shrink-0 items-center justify-between gap-2 border-b px-5 py-3 ${theme.header}`}>
        <div className="flex items-center gap-2.5">
          <div className={`inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg ${theme.iconBoxEmerald}`}>
            <Database className="h-5 w-5 stroke-current" />
          </div>
          <div>
            <h1 className={`text-base font-bold tracking-tight ${theme.textPrimary}`}>Reference Tables</h1>
            <p className={`text-[11px] leading-tight ${theme.textSecondary}`}>Operational manufacturing support data for Lean execution and production management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 stroke-current pointer-events-none" />
            <input ref={searchRef} type="text" value={search} onChange={(e) => { setSearch(e.target.value); }} placeholder="Search names, codes, groups..."
              className="h-8 w-[200px] rounded-lg border border-slate-200 pl-8 pr-12 text-[10px] bg-white dark:bg-slate-900 dark:border-slate-700 transition-colors hover:border-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/50 outline-none" />
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500">
              <span className="text-[10px]">{navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}</span>K
            </kbd>
          </div>
          <button type="button" onClick={() => navigate("/system/data-management")}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800"
            title="Close">
            <X className="h-4 w-4 stroke-current" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-4">
        {/* ── Breadcrumb ── */}
        {(breadcrumbGroupLabel || breadcrumbTypeLabel || breadcrumbEditLabel) && (
          <div className="flex items-center gap-1.5 px-0.5 pb-2 text-[11px] shrink-0">
            <button type="button" onClick={() => navigateBreadcrumb("root")}
              className="font-medium text-sky-600 hover:text-sky-500 transition-colors">Reference Tables</button>
            {breadcrumbGroupLabel && (
              <span className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 text-slate-400 stroke-current" />
                <button type="button" onClick={() => navigateBreadcrumb("group")}
                  className={`transition-colors ${breadcrumbTypeLabel || breadcrumbEditLabel ? "text-slate-500 hover:text-slate-700" : "text-slate-900 font-medium"}`}>{breadcrumbGroupLabel}</button>
              </span>
            )}
            {breadcrumbTypeLabel && (
              <span className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 text-slate-400 stroke-current" />
                <button type="button" onClick={() => navigateBreadcrumb("type")}
                  className={`transition-colors ${breadcrumbEditLabel ? "text-slate-500 hover:text-slate-700" : "text-slate-900 font-medium"}`}>{breadcrumbTypeLabel}</button>
              </span>
            )}
            {breadcrumbEditLabel && (
              <span className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 text-slate-400 stroke-current" />
                <span className="text-slate-900 font-medium">{breadcrumbEditLabel}</span>
              </span>
            )}
          </div>
        )}
        <div className="grid grid-cols-[13fr_7fr] gap-4 min-h-0 h-full">
          {/* ── Left: Accordion Panel ── */}
          <div className="overflow-y-auto min-w-0">
            {itemsLoading && !itemsData ? (
              <div className={`py-16 text-center text-sm ${theme.textMuted}`}><RefreshCw className="h-4 w-4 animate-spin inline mr-2 stroke-current" />Loading reference data...</div>
            ) : (
              <div className="space-y-1">
                {GROUP_ORDER.map((g) => {
                  const items = groupedFiltered[g] || [];
                  const uniqueTypes = [...new Set(items.map((i) => i.tableType))];
                  const Icon = GROUP_ICONS[g];
                  const isOpen = openGroup === g;
                  const hasMatch = !!search && items.length > 0;

                return (
                  <div key={g} className={`rounded-xl border overflow-hidden transition-shadow ${isOpen ? "shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700/50" : ""} ${theme.card}`}>
                    <button type="button" onClick={() => toggleGroup(g)}
                      className={`flex items-center justify-between w-full px-3 py-1.5 text-left transition-colors ${isOpen ? "bg-slate-100 dark:bg-slate-800/80" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronRight className={`h-3.5 w-3.5 text-slate-400 stroke-current shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                        <Icon className={`h-4 w-4 stroke-current shrink-0 ${hasMatch ? "text-sky-500" : "text-slate-500"}`} />
                        <span className={`text-sm font-semibold ${hasMatch ? `${theme.textPrimary}` : theme.textPrimary}`}>
                          {GROUP_LABELS[g]}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          uniqueTypes.length >= 5
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
                        }`}>{uniqueTypes.length} type{uniqueTypes.length !== 1 ? "s" : ""}</span>
                      </div>
                    </button>
                    <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? "max-h-[2000px]" : "max-h-0"}`}>
                      <div className="border-t border-slate-100 dark:border-slate-800">
                        {g === "organization" && (
                          <div className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 border-b border-slate-50 dark:border-slate-800/50"
                            onClick={openCompany} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") openCompany(); }}
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                              <Building2 className="h-3.5 w-3.5 stroke-current" />
                            </span>
                            <div className="flex-1 text-left">
                              <span className={`text-xs font-medium ${theme.textPrimary}`}>Company</span>
                              <span className={`text-[10px] ml-1.5 ${theme.textMuted}`}>Organization Settings</span>
                            </div>
                          </div>
                        )}
                        {uniqueTypes.length === 0 && !search && (
                          <div className="px-4 py-4 text-center">
                            <Database className="h-5 w-5 text-slate-300 mx-auto mb-1 stroke-current" />
                            <p className={`text-xs ${theme.textMuted}`}>No reference types configured in this group.</p>
                          </div>
                        )}
                        {uniqueTypes.map((tt) => {
                          const typeItems = items.filter((i) => i.tableType === tt);
                          const totalCount = typeItems.length;
                          const label = TABLE_TYPE_LABELS[tt] || tt;
                          const isExpanded = expandedType === tt;
                          return (
                            <div key={tt}>
                              <div className="flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 border-b border-slate-50 dark:border-slate-800/50"
                                onClick={() => toggleType(tt)}
                                role="button" tabIndex={0}
                              >
                                {isExpanded
                                  ? <ChevronDown className="h-3 w-3 text-slate-400 stroke-current shrink-0" />
                                  : <ChevronRight className="h-3 w-3 text-slate-400 stroke-current shrink-0" />
                                }
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                                  <Database className="h-3 w-3 stroke-current" />
                                </span>
                                <span className="flex-1 text-left">
                                  <span className={`text-[13px] font-medium ${theme.textPrimary}`}>{label}</span>
                                  {totalCount === 0 && <span className={`ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${theme.buttonWarningSoft}`}>Setup Required</span>}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {totalCount > 0 && (
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                      totalCount >= 20
                                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                        : totalCount >= 10
                                        ? "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
                                        : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                                    }`}>{totalCount} records</span>
                                  )}
                                  <button type="button" onClick={(e) => { e.stopPropagation(); openAddItem(tt); }}
                                    className="h-5 w-5 flex items-center justify-center rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                    title={`Add ${getEntityLabel(tt)}`}
                                  >
                                    <Plus className="h-3 w-3 stroke-current" />
                                  </button>
                                </div>
                              </div>
                              {isExpanded && totalCount > 0 && (
                                <div className="border-b border-slate-50 dark:border-slate-800/50">
                                  {typeItems.map((item) => {
                                    const isSelected = editingItem?.id === item.id;
                                    return (
                                      <div key={item.id}
                                        className={`flex items-center gap-2 px-3 py-1.5 pl-8 transition-colors ${
                                          isSelected
                                            ? "bg-sky-100 dark:bg-sky-500/20"
                                            : "hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                                        }`}
                                      >
                                        <div className="flex-1 flex items-center gap-2 min-w-0">
                                          <span className={`text-[13px] font-mono font-medium text-slate-500 dark:text-slate-400 shrink-0`}>{item.code}</span>
                                          <span className={`text-[13px] ${theme.textPrimary} truncate`}>{item.name}</span>
                                          {item.description && (
                                            <span className={`text-[11px] ${theme.textMuted} truncate hidden sm:inline`}>{item.description}</span>
                                          )}
                                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                            item.isActive
                                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                          }`}>
                                            {item.isActive ? "Active" : "Inactive"}
                                          </span>
                                        </div>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); openEditItem(item); }}
                                          className={`inline-flex items-center justify-center rounded-md border w-6 h-6 text-[9px] font-medium transition-colors ${
                                            isSelected
                                              ? "bg-sky-600 text-white border-sky-600 hover:bg-sky-500"
                                              : "border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800"
                                          }`}
                                          title={`Open ${item.name}`}
                                        >
                                          <Pencil className="h-3 w-3 stroke-current" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {isExpanded && totalCount === 0 && (
                                <div className="px-4 py-2 pl-8 border-b border-slate-50 dark:border-slate-800/50">
                                  <p className={`text-[10px] ${theme.textMuted}`}>No items yet. Click + to add one.</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right: Edit Panel ── */}
        <div className={`overflow-y-auto rounded-xl ${theme.subHeader}`}>
          {companyEditMode ? (
            <div className="flex h-full flex-col">
              <div className={`${theme.subHeader} flex items-center justify-between border-b px-4 h-12 bg-teal-200 dark:bg-teal-800/60`}>
                <h2 className={`text-xs font-semibold ${theme.textPrimary}`}>Company</h2>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={handleCompanySave} disabled={companySaving}
                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                    title="Save">
                    {companySaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-current" /> : <Save className="h-3.5 w-3.5 stroke-current" />}
                  </button>
                  <button type="button" onClick={closeCompanyEdit}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors dark:hover:text-slate-300 dark:hover:bg-slate-800"
                    title="Cancel">
                    <X className="h-3.5 w-3.5 stroke-current" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <CompanyEditor form={companyForm as any}
                  onChange={(k, v) => setCompanyForm((p) => ({ ...p, [k]: v }))}
                  compact />
                {companyError && (
                  <div className="mx-4 mb-3 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                    {companyError}
                  </div>
                )}
              </div>
            </div>
          ) : editingItem || (itemForm.tableType && itemForm.name !== undefined) ? (
            <div className="flex h-full flex-col">
              <div className={`${theme.subHeader} flex items-center justify-between border-b px-4 h-12 bg-teal-200 dark:bg-teal-800/60`}>
                <h2 className={`text-xs font-semibold ${theme.textPrimary}`}>{panelTitle}</h2>
                <div className="flex items-center gap-1">
                  {editingItem && (
                    <button type="button" onClick={requestDelete} disabled={itemSaving}
                      className="h-7 w-7 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors dark:hover:bg-red-500/10 disabled:opacity-50"
                      title="Delete">
                      <Trash2 className="h-3.5 w-3.5 stroke-current" />
                    </button>
                  )}
                  <button type="submit" form="item-form" disabled={itemSaving || !isFormValid}
                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 transition-colors"
                    title="Save">
                    {itemSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-current" /> : <Save className="h-3.5 w-3.5 stroke-current" />}
                  </button>
                  <button type="button" onClick={tryClosePanel}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors dark:hover:text-slate-300 dark:hover:bg-slate-800"
                    title="Cancel">
                    <X className="h-3.5 w-3.5 stroke-current" />
                  </button>
                </div>
              </div>

              <form id="item-form" onSubmit={(e) => { e.preventDefault(); handleItemSave(); }} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                  {activeFields.map((f) => (
                    <div key={f.key}>
                      <label className="mb-0.5 block text-[10px] font-medium text-gray-500 dark:text-slate-400">
                        {f.label}
                        {f.required && <span className="ml-0.5 text-red-500">*</span>}
                      </label>
                      {f.type === "select" && f.options ? (
                        <div className="relative">
                          <select value={itemForm[f.key] ?? ""}
                            onChange={(e) => handleFieldChange(f.key, e.target.value)}
                            className={`w-full h-8 rounded-lg border px-2.5 pr-7 text-[10px] appearance-none cursor-pointer transition-colors ${
                              fieldErrors[f.key]
                                ? "border-red-300 focus:ring-red-200"
                                : `${theme.input} ${theme.focusRing}`
                            }`}
                          >
                            {f.options.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 dark:text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                          </svg>
                          {fieldErrors[f.key] && <p className="mt-0.5 text-[9px] text-red-500">{fieldErrors[f.key]}</p>}
                        </div>
                      ) : (
                        <div>
                          <input type="text" value={itemForm[f.key] ?? ""}
                            onChange={(e) => handleFieldChange(f.key, e.target.value)}
                            placeholder={f.placeholder}
                            className={`w-full h-8 rounded-lg border px-2.5 text-[10px] transition-colors ${
                              fieldErrors[f.key]
                                ? "border-red-300 focus:ring-red-200"
                                : `${theme.input} ${theme.focusRing}`
                            }`} />
                          {fieldErrors[f.key] && <p className="mt-0.5 text-[9px] text-red-500">{fieldErrors[f.key]}</p>}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Delete confirmation */}
                  {confirmDelete && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[10px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                      <p className="font-medium mb-1.5">Delete this item?</p>
                      <p className="mb-2 text-red-500 dark:text-red-400">This will deactivate <strong>{itemForm.name}</strong>. This action cannot be undone.</p>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={handleDelete} disabled={itemSaving}
                          className="rounded-md bg-red-600 px-2.5 py-1 text-[9px] font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50">
                          {itemSaving ? "Deleting..." : "Delete"}
                        </button>
                        <button type="button" onClick={cancelDelete}
                          className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-[9px] font-medium text-red-700 hover:bg-red-100 transition-colors dark:border-red-500/30 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-500/20">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Confirm close warning */}
                  {showConfirmClosePanel && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                      You have unsaved changes.
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <button type="button" onClick={() => setShowConfirmClosePanel(false)}
                          className="rounded-md border border-amber-200 bg-white px-2 py-1 text-[9px] font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-amber-500/20 transition-colors">
                          Keep editing
                        </button>
                        <button type="button" onClick={closePanel}
                          className="rounded-md bg-amber-600 px-2 py-1 text-[9px] font-medium text-white hover:bg-amber-500 transition-colors">
                          Discard
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Error message */}
                  {itemError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                      {itemError}
                    </div>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-4">
              <div className="text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 dark:bg-sky-500/10 mb-5">
                  <Database className="h-7 w-7 text-sky-400 dark:text-sky-500 stroke-current" />
                </div>
                <h3 className={`text-sm font-bold ${theme.textPrimary} mb-2`}>Reference Table Editor</h3>
                <p className={`text-[11px] ${theme.textMuted} max-w-[200px] mx-auto leading-relaxed mb-6`}>
                  Select or create a reference table configuration.
                </p>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <span className={`block text-lg font-bold ${theme.textPrimary}`}>{totalGroups}</span>
                    <span className={`text-[9px] font-medium ${theme.textMuted}`}>Groups</span>
                  </div>
                  <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                  <div className="text-center">
                    <span className={`block text-lg font-bold ${theme.textPrimary}`}>{totalTypes}</span>
                    <span className={`text-[9px] font-medium ${theme.textMuted}`}>Tables</span>
                  </div>
                  <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                  <div className="text-center">
                    <span className={`block text-lg font-bold ${theme.textPrimary}`}>{totalItems}</span>
                    <span className={`text-[9px] font-medium ${theme.textMuted}`}>Records</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}
