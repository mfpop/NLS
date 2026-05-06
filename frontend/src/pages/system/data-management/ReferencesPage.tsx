import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { Database, Factory, X, ExternalLink, Save } from "lucide-react";
import { Pagination } from "./components";
import { Toolbar } from "./components/Toolbar";
import type { FilterOption } from "./components/Toolbar";
import { UnifiedModal } from "./components/UnifiedModal";
import type { ModalField } from "./components/UnifiedModal";
import { ConfirmDialog } from "./shared";
import { theme } from "../../../styles/themeTokens";
import {
  REFERENCE_TABLES_QUERY,
  CREATE_REFERENCE_TABLE_MUTATION,
  UPDATE_REFERENCE_TABLE_MUTATION,
  DELETE_REFERENCE_TABLE_MUTATION,
} from "@/graphql/manufacturingQueries";
import { COMPANY_QUERY, UPDATE_COMPANY_MUTATION } from "@/graphql/companyQueries";
import { CompanyEditor } from "./components/CompanyEditor";
import { usePageSize } from "@/hooks/usePageSize";

interface ReferenceTableNode {
  id: string; name: string; entryCount: number; updatedAt: string;
  status: "active" | "inactive"; description: string;
}

interface ReferenceTablesQueryData { referenceTables: ReferenceTableNode[]; }

const STATUS_OPTIONS: FilterOption[] = [
  { label: "All", value: "all" }, { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" }, { label: "Not Ready", value: "not_ready" },
];

const MODAL_FIELDS: ModalField[] = [
  { key: "name", label: "Table Name", required: true, placeholder: "e.g. Part Categories" },
  { key: "description", label: "Description", placeholder: "e.g. Lookup table for part classification" },
  { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
];

export function ReferencesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<ReferenceTableNode | null>(null);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { containerRef, cardRef, perPage } = usePageSize(48, 8, 1);

  const { data, loading, error } = useQuery<ReferenceTablesQueryData>(REFERENCE_TABLES_QUERY, {
    variables: { search: search || undefined, status: statusFilter !== "all" ? statusFilter : undefined },
    fetchPolicy: "cache-and-network", errorPolicy: "all",
  });
  const [createTable] = useMutation(CREATE_REFERENCE_TABLE_MUTATION);
  const [updateTable] = useMutation(UPDATE_REFERENCE_TABLE_MUTATION);
  const [deleteTable] = useMutation(DELETE_REFERENCE_TABLE_MUTATION);
  const [saving, setSaving] = useState(false);

  const { data: companyData } = useQuery<{ company: { id: string; code: string; name: string; address: string; phone: string; email: string; website: string; description: string; industryType: string; manufacturingType: string; defaultTimezone: string; defaultUnits: string; defaultShiftModel: string; productionCalendar: string; defaultLanguage: string; leanMethodology: string } }>(COMPANY_QUERY, {
    fetchPolicy: "cache-and-network", errorPolicy: "all",
  });
  const [updateCompany] = useMutation(UPDATE_COMPANY_MUTATION);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState<Record<string, string>>({});
  const company = companyData?.company;

  const tables = useMemo(() => data?.referenceTables ?? [], [data?.referenceTables]);

  const paginatedTables = tables.slice((page - 1) * perPage, page * perPage);
  useEffect(() => { setPage(1); }, [search, statusFilter, perPage]);

  const openEdit = (table: ReferenceTableNode) => {
    setEditingTable(table); setSaveError(null);
    setForm({ name: table.name, description: table.description || "", status: table.status });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingTable) {
        await updateTable({ variables: { id: editingTable.id, input: form } });
      } else {
        await createTable({ variables: { input: form } });
      }
      setModalOpen(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!tableToDelete) return;
    try {
      await deleteTable({ variables: { id: tableToDelete } });
      setConfirmOpen(false);
      setTableToDelete(null);
      setModalOpen(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleAdd = () => {
    setEditingTable(null); setSaveError(null);
    setForm({ name: "", description: "", status: "active" });
    setModalOpen(true);
  };

  const openCompany = () => {
    if (company) {
      setCompanyForm({
        code: company.code, name: company.name, address: company.address || "",
        phone: company.phone || "", email: company.email || "",
        website: company.website || "", description: company.description || "",
        industryType: company.industryType || "", manufacturingType: company.manufacturingType || "",
        defaultTimezone: company.defaultTimezone || "", defaultUnits: company.defaultUnits || "",
        defaultShiftModel: company.defaultShiftModel || "", productionCalendar: company.productionCalendar || "",
        defaultLanguage: company.defaultLanguage || "", leanMethodology: company.leanMethodology || "",
      });
    }
    setCompanyOpen(true);
  };

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      <header className={`flex shrink-0 items-center justify-between border-b px-6 ${theme.header}`} style={{ height: "64px" }}>
        <div className="flex items-center gap-3">
          <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
            <Database className="h-5 w-5 stroke-current" />
          </div>
          <div>
            <h1 className={`text-base font-semibold tracking-tight ${theme.textPrimary}`}>Reference Tables</h1>
            <p className={`text-xs ${theme.textSecondary}`}>Lookup tables and configuration data loaded from the database.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleAdd}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors">
            Add Table
          </button>
          <button type="button" onClick={() => navigate("/system/data-management")}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800">
            <X className="h-4 w-4 stroke-current" />Close
          </button>
        </div>
      </header>

      <Toolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tables..."
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={STATUS_OPTIONS}
      />

      <div ref={containerRef} className={`flex-1 ${theme.page} p-4`}>
        {loading && !data ? (
          <div className={`py-16 text-center text-sm ${theme.textMuted}`}>Loading reference tables...</div>
        ) : error && !data?.referenceTables ? (
          <div className={`py-16 text-center text-sm ${theme.textCritical}`}>Unable to load reference tables from the database.</div>
        ) : (
          <div className="flex flex-col gap-2">
            <div
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${theme.card}`}
              onClick={openCompany}
              role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") openCompany(); }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Factory className="h-4 w-4 stroke-current" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${theme.textPrimary}`}>Company</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${theme.codeBadge}`}>ORG</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${theme.badgeActive}`}>active</span>
                </div>
                <div className={`text-xs ${theme.textSecondary}`}>Organization-level settings and configuration</div>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-300 stroke-current shrink-0" />
            </div>

            {tables.length === 0 ? (
              <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center ${theme.card}`}>
                <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${theme.iconBoxSubtle}`}>
                  <Database className="h-6 w-6 stroke-current" />
                </div>
                <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>
                  {search ? "No tables match your search" : "No reference tables found"}
                </h3>
                <p className={`mt-1 max-w-xs text-xs ${theme.textSecondary}`}>Create reference tables in the backend data source to see them here.</p>
              </div>
            ) : (
              paginatedTables.map((table, idx) => (
                <div key={table.id} ref={idx === 0 ? cardRef : undefined}>
                  <div
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${theme.card}`}
                    onClick={() => openEdit(table)}
                    role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") openEdit(table); }}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                      <Database className="h-4 w-4 stroke-current" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${theme.textPrimary}`}>{table.name}</span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${table.status === "active" ? theme.badgeActive : theme.badgeInactive}`}>{table.status}</span>
                      </div>
                      <div className={`text-xs ${theme.textSecondary}`}>{table.description || "No description"}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${theme.textPrimary}`}>{table.entryCount}</div>
                        <div className={`text-[10px] ${theme.textMuted}`}>entries</div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-300 stroke-current" />
                    </div>
                  </div>
                </div>
              ))
            )}

            {tables.length > 0 && (
              <div className="mt-3">
                <Pagination page={page} total={tables.length} perPage={perPage} onChange={setPage} />
              </div>
            )}
          </div>
        )}
      </div>

      <UnifiedModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTable ? "Edit Reference Table" : "Add Reference Table"}
        fields={MODAL_FIELDS}
        values={form}
        onChange={(k, v) => { setForm((prev) => ({ ...prev, [k]: v })); setSaveError(null); }}
        onSave={handleSave}
        onDelete={editingTable ? () => { setTableToDelete(editingTable.id); setConfirmOpen(true); } : undefined}
        summary={saveError ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">{saveError}</div> : undefined}
        saving={saving}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setTableToDelete(null); }}
        title="Delete reference table?"
        message="This action cannot be undone."
        onConfirm={handleDelete}
      />

      {/* Company Editor Modal */}
      {companyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCompanyOpen(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <CompanyEditor form={companyForm as any} onChange={(k, v) => setCompanyForm((p) => ({ ...p, [k]: v }))}
              onSave={async () => { await updateCompany({ variables: { input: companyForm } }); setCompanyOpen(false); }}
              onClose={() => setCompanyOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
