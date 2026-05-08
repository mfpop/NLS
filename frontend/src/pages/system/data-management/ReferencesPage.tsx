import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import {
  Database, Building2, X, ChevronRight, ChevronDown, Plus, Search, RefreshCw,
  Settings, AlertCircle, Users, Pencil, Trash2, Save, Hash, CheckCircle,
  FileSpreadsheet
} from "lucide-react";
import { theme } from "../../../styles/themeTokens";
import { COMPANY_QUERY, UPDATE_COMPANY_MUTATION } from "@/graphql/companyQueries";
import { REFERENCE_ITEMS_QUERY, CREATE_REFERENCE_ITEM_MUTATION, UPDATE_REFERENCE_ITEM_MUTATION, DEACTIVATE_REFERENCE_ITEM_MUTATION } from "@/graphql/referenceItemQueries";
import { CompanyEditor } from "./components/CompanyEditor";

interface RefItem { id: string; tableType: string; code: string; name: string; description: string; isActive: boolean; sortOrder: number; }
interface DynamicField { key: string; label: string; required?: boolean; type?: "text" | "select"; options?: { label: string; value: string }[]; placeholder?: string; }

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
const GROUP_ICONS: Record<string, typeof Database> = { organization: Building2, manufacturing: Settings, material_flow: Database, lean_quality: AlertCircle, people: Users };

function generateCode(): string { return `R${Math.random().toString(36).slice(2, 8).toUpperCase()}`; }

const BASE_FIELDS: DynamicField[] = [
  { key: "name", label: "Name", required: true },
  { key: "code", label: "Code", required: true },
  { key: "description", label: "Description" },
  { key: "sortOrder", label: "Sort Order" },
  { key: "isActive", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] },
];

const TYPE_PLACEHOLDERS: Record<string, Partial<Record<string, string>>> = {
  production_calendar: { name: "e.g. Standard 5-Day Week", code: "e.g. STD5" },
  shift_pattern: { name: "e.g. Day Shift", code: "e.g. 1SH-D" },
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
  skill_type: { name: "e.g. Machine Operator", code: "e.g. OPER" },
  role: { name: "e.g. Operator", code: "e.g. OP" },
  shift_team: { name: "e.g. Team A (Day)", code: "e.g. A" },
};

const ENTITY_SPECIFIC_FIELDS: Record<string, DynamicField[]> = {
  timezone: [{ key: "utcOffset", label: "UTC Offset", placeholder: "e.g. UTC-5 (EST)" }, { key: "region", label: "Region", placeholder: "e.g. Americas" }],
  language: [{ key: "localeCode", label: "Locale Code", placeholder: "e.g. en-US" }],
  shift_pattern: [{ key: "shiftDuration", label: "Duration (hours)", placeholder: "e.g. 8" }, { key: "startTime", label: "Start Time", placeholder: "e.g. 06:00" }, { key: "endTime", label: "End Time", placeholder: "e.g. 14:00" }],
  operation_code: [{ key: "operationCategory", label: "Category", placeholder: "e.g. Machining" }],
  kanban_type: [{ key: "pullType", label: "Pull Type", placeholder: "e.g. Supermarket" }],
};

function getFieldsForType(tableType: string): DynamicField[] {
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

const COMPANY_REQUIRED_KEYS = ["name", "code", "industryType", "manufacturingType", "defaultTimezone", "defaultUnits", "defaultShiftModel"];

function ItemsList({ items, selectedType, onEdit, onAdd }: { items: RefItem[]; selectedType: string | null; onEdit: (item: RefItem) => void; onAdd: (tt: string) => void }) {
  const filtered: RefItem[] = [];
  for (const item of items) { if (item.tableType === selectedType) filtered.push(item); }
  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-[10px] text-slate-400">
        <Database className="h-6 w-6 stroke-current text-slate-300" />
        <span className="text-xs font-medium text-slate-400">No records yet</span>
        <button type="button" onClick={() => onAdd(selectedType!)}
          className="inline-flex items-center gap-1 rounded bg-emerald-600 text-white px-2.5 py-1 text-[10px] font-medium hover:bg-emerald-500 transition-colors"
        >
          <Plus className="h-3 w-3 stroke-current" /> Add {getEntityLabel(selectedType!)}
        </button>
      </div>
    );
  }
  const rows: React.ReactNode[] = [];
  for (let idx = 0; idx < filtered.length; idx++) {
    const item = filtered[idx];
    rows.push(
      <div key={item.id}
        className="flex items-center gap-2 px-2 py-1.5 rounded transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
        onClick={() => onEdit(item)}
      >
        <span className="text-[10px] font-mono font-medium text-slate-400 w-14 shrink-0">{item.code}</span>
        <span className="flex-1 text-[11px] font-medium text-slate-800 dark:text-slate-100 truncate">{item.name}</span>
        {item.description && <span className="text-[9px] text-slate-400 truncate max-w-[120px] hidden sm:inline">{item.description}</span>}
        <span className={'inline-flex items-center rounded px-1.5 py-0.5 text-[8px] font-medium ' + (item.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800')}>{item.isActive ? 'Active' : 'Inactive'}</span>
        <Pencil className="h-3 w-3 text-slate-300 shrink-0 stroke-current" />
      </div>
    );
  }
  return <div className="space-y-0.5">{rows}</div>;
}

function ExplorerBrowser({ search, setSearch, openGroup, toggleGroup, groupedFiltered, openCompany, selectedType, selectType, openAddItem, itemsLoading, itemsData }: {
  search: string; setSearch: (v: string) => void; openGroup: string | null; toggleGroup: (g: string) => void;
  groupedFiltered: Record<string, RefItem[]>; openCompany: () => void;
  selectedType: string | null; selectType: (tt: string) => void; openAddItem: (tt: string) => void;
  itemsLoading: boolean; itemsData: any;
}) {
  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="shrink-0 px-2.5 py-2 border-b border-slate-100 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 stroke-current pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tables..."
            className="w-full h-7 rounded border border-slate-200 dark:border-slate-700 pl-7 pr-2 text-[10px] bg-white dark:bg-slate-900 outline-none focus:border-sky-400 transition-colors" />
          {search && <button type="button" onClick={() => setSearch("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-2.5 w-2.5 stroke-current" /></button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {itemsLoading && !itemsData ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[10px] text-slate-400"><RefreshCw className="h-3 w-3 animate-spin stroke-current" /> Loading...</div>
        ) : (
          <div className="py-1">
            {GROUP_ORDER.map((g) => {
              const items = groupedFiltered[g] || [];
              const uniqueTypes = [...new Set(items.map((i) => i.tableType))];
              const Icon = GROUP_ICONS[g];
              const isOpen = openGroup === g;
              return (
                <div key={g}>
                  <button type="button" onClick={() => toggleGroup(g)}
                    className={`flex items-center justify-between w-full px-2.5 py-1 text-left transition-colors ${isOpen ? "bg-slate-50/80 dark:bg-slate-800/60" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ChevronRight className={`h-2.5 w-2.5 text-slate-400 stroke-current shrink-0 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`} />
                      <Icon className="h-3.5 w-3.5 stroke-current shrink-0 text-slate-500" />
                      <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">{GROUP_LABELS[g]}</span>
                      <span className="text-[9px] text-slate-400">{uniqueTypes.length}</span>
                    </div>
                  </button>
                  <div className={`overflow-hidden transition-all duration-150 ease-in-out ${isOpen ? "max-h-[5000px]" : "max-h-0"}`}>
                    <div>
                      {g === "organization" && (
                        <button type="button" onClick={openCompany}
                          className={`flex w-full items-center gap-2 px-2.5 py-1 transition-colors hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 ${selectedType === "__company__" ? "bg-indigo-50/40 dark:bg-indigo-500/10" : ""}`}
                        >
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                            <Building2 className="h-2.5 w-2.5 stroke-current" />
                          </span>
                          <span className="flex-1 text-left text-[10px] font-medium text-slate-700 dark:text-slate-200">Company</span>
                          <span className="text-[8px] text-slate-400">setup</span>
                        </button>
                      )}
                      {uniqueTypes.map((tt) => {
                        const typeItems = items.filter((i) => i.tableType === tt);
                        const label = TABLE_TYPE_LABELS[tt] || tt;
                        const isSelected = selectedType === tt;
                        return (
                          <button key={tt} type="button" onClick={() => selectType(tt)}
                            className={`flex w-full items-center gap-2 px-2.5 py-1 transition-colors ${
                              isSelected
                                ? "bg-sky-50/60 dark:bg-sky-500/10 border-l-2 border-l-sky-400"
                                : "border-l-2 border-l-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                            }`}
                          >
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                              <Database className="h-2.5 w-2.5 stroke-current" />
                            </span>
                            <span className="flex-1 text-left text-[10px] font-medium truncate text-slate-700 dark:text-slate-200">{label}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {typeItems.length === 0 && <span className="text-[8px] text-amber-500 font-medium">setup</span>}
                              {typeItems.length > 0 && <span className="text-[9px] text-slate-400">{typeItems.length}</span>}
                              <button type="button" onClick={(e) => { e.stopPropagation(); openAddItem(tt); }}
                                className="h-4 w-4 flex items-center justify-center rounded text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              >
                                <Plus className="h-2.5 w-2.5 stroke-current" />
                              </button>
                            </div>
                          </button>
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
    </div>
  );
}

export function ReferencesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [openGroup, setOpenGroup] = useState<string | null>("organization");
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [companyForm, setCompanyForm] = useState<Record<string, string>>({});
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000);
  }, []);

  const { data: itemsData, loading: itemsLoading } = useQuery<{ referenceItems: RefItem[] }>(REFERENCE_ITEMS_QUERY, {
    variables: { tableType: null }, fetchPolicy: "cache-and-network", errorPolicy: "all",
  });
  const { data: companyData } = useQuery<{ company: any }>(COMPANY_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const [updateCompany] = useMutation(UPDATE_COMPANY_MUTATION, { refetchQueries: [COMPANY_QUERY] });
  const [createItem] = useMutation(CREATE_REFERENCE_ITEM_MUTATION, { refetchQueries: [REFERENCE_ITEMS_QUERY] });
  const [updateItem] = useMutation(UPDATE_REFERENCE_ITEM_MUTATION, { refetchQueries: [REFERENCE_ITEMS_QUERY] });
  const [deactivateItem] = useMutation(DEACTIVATE_REFERENCE_ITEM_MUTATION, { refetchQueries: [REFERENCE_ITEMS_QUERY] });
  const company = companyData?.company;
  const allItems = itemsData?.referenceItems ?? [];

  const currentTableType = editingItem?.tableType || itemForm.tableType || selectedType || "";
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
      return specific.some((f) => (itemForm[f.key] ?? "") !== ((editingItem as any)[f.key]?.toString() ?? ""));
    }
    if (itemForm.tableType && itemForm.name !== undefined) return itemForm.name !== "" || itemForm.code !== "";
    return false;
  }, [editingItem, itemForm]);

  const toggleGroup = (g: string) => setOpenGroup(openGroup === g ? null : g);

  const selectType = (tt: string) => {
    setCompanyEditMode(false);
    setEditingItem(null);
    setItemForm({});
    setSelectedType(tt);
  };

  const openCompany = () => {
    setSelectedType(null);
    setEditingItem(null);
    setItemForm({});
    setItemError(null);
    setItemErrorDismissed(false);
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
    setCompanyErrorDismissed(false);
    setCompanyTouched({});
    setCompanyEditMode(true);
  };

  const openAddItem = (tableType: string) => {
    setCompanyEditMode(false);
    setEditingItem(null);
    setItemForm({ tableType, name: "", code: generateCode(), description: "", sortOrder: "0", isActive: "true" });
    setItemError(null);
    setItemErrorDismissed(false);
    setShowUnsavedModal(false);
    setSelectedType(tableType);
  };

  const openEditItem = (item: RefItem) => {
    setCompanyEditMode(false);
    setEditingItem(item);
    setItemForm({
      tableType: item.tableType, name: item.name, code: item.code, description: item.description || "",
      sortOrder: String(item.sortOrder), isActive: item.isActive ? "true" : "false",
    });
    setItemError(null);
    setItemErrorDismissed(false);
    setShowUnsavedModal(false);
  };

  const closePanel = useCallback(() => {
    setCompanyEditMode(false);
    setEditingItem(null);
    setItemForm({});
    setItemError(null);
    setItemErrorDismissed(false);
    setShowUnsavedModal(false);
    setConfirmDelete(false);
  }, []);

  const tryClosePanel = useCallback(() => {
    const formChanged = editingItem
      ? isItemDirty : itemForm.name !== "" || itemForm.code !== "";
    if (formChanged && !showUnsavedModal) { setShowUnsavedModal(true); return; }
    closePanel();
  }, [editingItem, itemForm, showUnsavedModal, isItemDirty]);

  const handleItemSave = useCallback(async () => {
    if (!isFormValid) return;
    setItemSaving(true); setItemError(null); setItemErrorDismissed(false);
    try {
      const input: Record<string, unknown> = {
        tableType: itemForm.tableType, code: itemForm.code, name: itemForm.name,
        description: itemForm.description || "", sortOrder: parseInt(itemForm.sortOrder) || 0, isActive: itemForm.isActive === "true",
      };
      ENTITY_SPECIFIC_FIELDS[currentTableType]?.forEach(f => { if (itemForm[f.key]) input[f.key] = itemForm[f.key]; });
      if (editingItem) await updateItem({ variables: { id: editingItem.id, input } });
      else await createItem({ variables: { input } });
      closePanel(); showToast("Record saved");
    } catch (e) { setItemError(e instanceof Error ? e.message : "Save failed"); }
    setItemSaving(false);
  }, [isFormValid, itemForm, currentTableType, editingItem, updateItem, createItem, closePanel, showToast]);

  const handleModalSave = useCallback(async () => { setShowUnsavedModal(false); await handleItemSave(); }, [handleItemSave]);
  const handleModalDiscard = useCallback(() => { setShowUnsavedModal(false); closePanel(); }, [closePanel]);
  const handleModalCancel = useCallback(() => { setShowUnsavedModal(false); }, []);

  const handleDelete = async () => {
    if (!editingItem) return;
    setItemSaving(true); setItemError(null); setItemErrorDismissed(false);
    try { await deactivateItem({ variables: { id: editingItem.id } }); closePanel(); }
    catch (e) { setItemError(e instanceof Error ? e.message : "Delete failed"); }
    setItemSaving(false); setConfirmDelete(false);
  };

  const requestDelete = () => setConfirmDelete(true);
  const cancelDelete = () => setConfirmDelete(false);

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
    try { await updateCompany({ variables: { input: companyForm } }); setCompanyEditMode(false); showToast("Record saved"); }
    catch (e) { setCompanyError(e instanceof Error ? e.message : "Save failed"); }
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
    const result: RefItem[] = [];
    for (const i of allItems) { if (i.tableType === selectedType) result.push(i); }
    return result;
  }, [allItems, selectedType]);
  const selectedTypeActive = selectedTypeItems.filter(i => i.isActive).length;
  const selectedTypeInactive = selectedTypeItems.filter(i => !i.isActive).length;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      {/* ── Header ── */}
      <header className={`flex shrink-0 items-center justify-between gap-4 border-b px-5 h-16 ${theme.header}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg ${theme.iconBoxEmerald}`}>
            <FileSpreadsheet className="h-4 w-4 stroke-current" />
          </div>
          <div className="min-w-0">
            <h1 className={`text-sm font-bold tracking-tight ${theme.textPrimary}`}>Reference Tables</h1>
            <p className="text-[9px] text-slate-500 dark:text-slate-400">Administrative master-data catalog</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => navigate("/system/data-management")}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" aria-label="Close"
          >
            <X className="h-3.5 w-3.5 stroke-current" />
          </button>
        </div>
      </header>

      {/* ── Explorer Workspace ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* ═══ LEFT: Browser ═══ */}
        <div className="flex flex-col min-h-0 border-r border-slate-200/50 dark:border-slate-800 w-[280px] min-w-[240px] shrink-0">
          <ExplorerBrowser
            search={search} setSearch={setSearch}
            openGroup={openGroup} toggleGroup={toggleGroup}
            groupedFiltered={groupedFiltered}
            openCompany={openCompany}
            selectedType={selectedType} selectType={selectType}
            openAddItem={openAddItem}
            itemsLoading={itemsLoading} itemsData={itemsData}
          />
        </div>

        {/* ═══ RIGHT: Preview Workspace ═══ */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {companyEditMode ? (
            <div className="flex h-full flex-col">
              <div className={`flex items-center justify-between gap-2 border-b border-slate-200/50 dark:border-slate-800 px-3 py-2 shrink-0 ${theme.subHeader}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    <Building2 className="h-3 w-3 stroke-current" />
                  </span>
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">Company</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={handleCompanySave} disabled={companySaving}
                    className="h-6 px-2.5 rounded text-[9px] font-semibold inline-flex items-center gap-1 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                  >
                    {companySaving ? <RefreshCw className="h-2.5 w-2.5 animate-spin stroke-current" /> : <Save className="h-2.5 w-2.5 stroke-current" />} Save
                  </button>
                  <button type="button" onClick={closeCompanyEdit}
                    className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="h-3 w-3 stroke-current" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <CompanyEditor form={companyForm as any} onChange={(k, v) => setCompanyForm((p) => ({ ...p, [k]: v }))} compact
                  touchedFields={companyTouched} setTouched={setCompanyTouched} />
                {companyError && !companyErrorDismissed && (
                  <div className="mx-3 mb-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 flex items-center justify-between">
                    <span>Save failed</span>
                    <button type="button" onClick={() => setCompanyErrorDismissed(true)} className="text-red-400 hover:text-red-600 ml-2"><X className="h-3 w-3 stroke-current" /></button>
                  </div>
                )}
              </div>
            </div>
          ) : editingItem || (itemForm.tableType && itemForm.name !== undefined) ? (
            <div className="flex h-full flex-col">
              <div className={`flex items-center justify-between gap-2 border-b border-slate-200/50 dark:border-slate-800 px-3 py-2 shrink-0 ${theme.subHeader}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                    <Database className="h-3 w-3 stroke-current" />
                  </span>
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {editingItem ? `Edit ${editingItem.name}` : `Add ${getEntityLabel(currentTableType)}`}
                  </span>
                  {isItemDirty && <span className="text-[9px] text-amber-600 shrink-0">● Unsaved</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  {editingItem && (
                    <button type="button" onClick={requestDelete} disabled={itemSaving}
                      className="h-6 w-6 flex items-center justify-center rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50 transition-colors" title="Delete">
                      <Trash2 className="h-3 w-3 stroke-current" />
                    </button>
                  )}
                  <button type="submit" form="item-form" disabled={itemSaving || !isFormValid}
                    className="h-6 px-2.5 rounded text-[9px] font-semibold inline-flex items-center gap-1 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                  >
                    {itemSaving ? <RefreshCw className="h-2.5 w-2.5 animate-spin stroke-current" /> : <Save className="h-2.5 w-2.5 stroke-current" />} Save
                  </button>
                  <button type="button" onClick={tryClosePanel}
                    className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="h-3 w-3 stroke-current" />
                  </button>
                </div>
              </div>
              <form id="item-form" onSubmit={(e) => { e.preventDefault(); handleItemSave(); }} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
                {activeFields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-[9px] font-medium text-slate-400 mb-px">
                      {f.label}{f.required && <span className="ml-0.5 text-red-500">*</span>}
                    </label>
                    {f.type === "select" && f.options ? (
                      <div className="relative">
                        <select value={itemForm[f.key] ?? ""} onChange={(e) => handleFieldChange(f.key, e.target.value)}
                          className={`w-full h-7 rounded border px-2 text-[10px] appearance-none cursor-pointer transition-colors ${fieldErrors[f.key] ? "border-red-300" : `${theme.input}`}`}
                        >
                          {f.options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 stroke-current" />
                        {fieldErrors[f.key] && <p className="text-[8px] text-red-500">{fieldErrors[f.key]}</p>}
                      </div>
                    ) : (
                      <div>
                        <input type="text" value={itemForm[f.key] ?? ""} onChange={(e) => handleFieldChange(f.key, e.target.value)} placeholder={f.placeholder}
                          className={`w-full h-7 rounded border px-2 text-[10px] transition-colors ${fieldErrors[f.key] ? "border-red-300" : `${theme.input}`}`} />
                        {fieldErrors[f.key] && <p className="text-[8px] text-red-500">{fieldErrors[f.key]}</p>}
                      </div>
                    )}
                  </div>
                ))}
                {confirmDelete && (
                  <div className="rounded border border-red-200 bg-red-50 px-2.5 py-2 text-[10px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    <p className="font-medium mb-1">Delete <strong>{itemForm.name}</strong>?</p>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={handleDelete} disabled={itemSaving}
                        className="rounded bg-red-600 px-2 py-1 text-[9px] font-medium text-white hover:bg-red-500 disabled:opacity-50">
                        {itemSaving ? "Deleting..." : "Delete"}
                      </button>
                      <button type="button" onClick={cancelDelete}
                        className="rounded border border-red-200 bg-white px-2 py-1 text-[9px] font-medium text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-500/20">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {itemError && !itemErrorDismissed && (
                  <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 flex items-center justify-between">
                    <span>Save failed</span>
                    <button type="button" onClick={() => setItemErrorDismissed(true)} className="text-red-400 hover:text-red-600 ml-2"><X className="h-3 w-3 stroke-current" /></button>
                  </div>
                )}
              </form>
            </div>
          ) : selectedType ? (
            <div className="flex h-full flex-col">
              <div className={`flex items-center justify-between gap-2 border-b border-slate-200/50 dark:border-slate-800 px-3 py-2 shrink-0 ${theme.subHeader}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                    <Database className="h-3 w-3 stroke-current" />
                  </span>
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">{TABLE_TYPE_LABELS[selectedType] || selectedType}</span>
                  <span className="text-[9px] text-slate-400">{selectedTypeItems.length} records</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => openAddItem(selectedType)}
                    className="h-6 px-2 rounded text-[9px] font-semibold inline-flex items-center gap-1 bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                  >
                    <Plus className="h-2.5 w-2.5 stroke-current" /> Add
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2">
                <ItemsList items={allItems} selectedType={selectedType} onEdit={openEditItem} onAdd={openAddItem} />
              </div>
              <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 px-3 py-1.5 flex items-center gap-3 text-[8px] text-slate-400">
                <span className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 stroke-current" /> {selectedTypeActive} active</span>
                <span className="flex items-center gap-1"><X className="h-2.5 w-2.5 stroke-current" /> {selectedTypeInactive} inactive</span>
                <span className="flex items-center gap-1"><Hash className="h-2.5 w-2.5 stroke-current" /> {selectedTypeItems.reduce((s, i) => s + i.sortOrder, 0)} total sort</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 dark:bg-sky-500/10 mb-3">
                  <FileSpreadsheet className="h-6 w-6 text-sky-400 dark:text-sky-500 stroke-current" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Reference Tables Explorer</h3>
                <p className="text-[10px] text-slate-400 max-w-[220px] mx-auto leading-relaxed mb-4">
                  Select a table from the browser to preview and manage its records.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center"><span className="block text-lg font-bold text-slate-800 dark:text-slate-100">{GROUP_ORDER.length}</span><span className="text-[8px] text-slate-400">Groups</span></div>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                  <div className="text-center"><span className="block text-lg font-bold text-slate-800 dark:text-slate-100">{totalTypes}</span><span className="text-[8px] text-slate-400">Tables</span></div>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                  <div className="text-center"><span className="block text-lg font-bold text-slate-800 dark:text-slate-100">{totalItems}</span><span className="text-[8px] text-slate-400">Records</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Unsaved changes modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={handleModalCancel} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 w-[360px] max-w-[90vw]">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Unsaved changes</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-4">You have unsaved changes that will be lost.</p>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={handleModalSave} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-[10px] font-medium hover:bg-emerald-500 transition-colors">Save</button>
              <button type="button" onClick={handleModalDiscard} className="rounded-lg border border-slate-200 bg-white text-slate-700 px-3 py-1.5 text-[10px] font-medium hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">Discard</button>
              <button type="button" onClick={handleModalCancel} className="rounded-lg bg-white text-slate-500 px-3 py-1.5 text-[10px] font-medium hover:text-slate-700 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.visible && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white px-3 py-2 rounded-lg shadow-lg text-[10px] font-medium flex items-center gap-2">
          <Save className="h-3 w-3 stroke-current shrink-0" />
          {toast.message}
        </div>
      )}
    </div>
  );
}
