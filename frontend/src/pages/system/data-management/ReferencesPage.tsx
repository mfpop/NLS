import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { Database, X } from "lucide-react";
import { DataCard, Pagination } from "./components";
import { Toolbar } from "./components/Toolbar";
import type { FilterOption } from "./components/Toolbar";
import { UnifiedModal } from "./components/UnifiedModal";
import type { ModalField } from "./components/UnifiedModal";
import { ConfirmDialog } from "./shared";
import { theme } from "../../../styles/themeTokens";
import { REFERENCE_TABLES_QUERY } from "@/graphql/manufacturingQueries";
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

function formatDate(value: string) {
  if (!value) return "unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

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
  const { containerRef, cardRef, perPage } = usePageSize(56, 8, 1);

  const { data, loading, error } = useQuery<ReferenceTablesQueryData>(REFERENCE_TABLES_QUERY, {
    variables: { search: search || undefined, status: statusFilter !== "all" ? statusFilter : undefined },
    fetchPolicy: "cache-and-network", errorPolicy: "all",
  });

  const tables = useMemo(() => data?.referenceTables ?? [], [data?.referenceTables]);

  const paginatedTables = tables.slice((page - 1) * perPage, page * perPage);
  useEffect(() => { setPage(1); }, [search, statusFilter, perPage]);

  const openEdit = (table: ReferenceTableNode) => {
    setEditingTable(table); setSaveError(null);
    setForm({ name: table.name, description: table.description || "", status: table.status });
    setModalOpen(true);
  };

  const handleSave = async () => { setModalOpen(false); };

  const handleDelete = async () => {
    if (!tableToDelete) return;
    setConfirmOpen(false); setTableToDelete(null); setModalOpen(false);
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
        <button type="button" onClick={() => navigate("/system/data-management")}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800">
          <X className="h-4 w-4 stroke-current" />Close
        </button>
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
        ) : tables.length === 0 ? (
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
          <div className="flex flex-col gap-2">
            {paginatedTables.map((table, idx) => (
              <div key={table.id} ref={idx === 0 ? cardRef : undefined}>
                <DataCard
                  icon={<Database className="h-5 w-5 stroke-current text-sky-600" />}
                  iconBg="bg-sky-100 dark:bg-sky-500/10"
                  name={table.name}
                  status={table.status}
                  parentContext={table.description || "No description"}
                  metrics={[
                    { label: "Entries", value: table.entryCount },
                    { label: "Updated", value: formatDate(table.updatedAt) },
                  ]}
                  readiness={[
                    { label: "Configured", ready: !!table.name },
                    { label: "Has data", ready: table.entryCount > 0 },
                  ]}
                  onEdit={() => openEdit(table)}
                  onOpen={() => navigate(`/system/data-management/references/${table.id}`)}
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-3">
          <Pagination page={page} total={tables.length} perPage={perPage} onChange={setPage} />
        </div>
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
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setTableToDelete(null); }}
        title="Delete reference table?"
        message="This action cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  );
}
