import { useState, useMemo, useEffect, type ComponentType } from "react";
import { usePageSize } from "@/hooks/usePageSize";
import { useNavigate, useParams } from "react-router-dom";
import { TrendingUpDown, ChevronLeft, X, Factory, Building2, AlertTriangle, Trash2, FileText, Clock, Layers, Component, Dumbbell } from "lucide-react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { DataCard, Pagination } from "./components";
import { Toolbar } from "./components/Toolbar";
import type { FilterOption } from "./components/Toolbar";
import { UnifiedModal } from "./components/UnifiedModal";
import type { ModalField } from "./components/UnifiedModal";
import { LineSummary } from "./components/SummaryBlock";
import { ConfirmDialog } from "./shared";
import { theme } from "../../../styles/themeTokens";
import { useProductionLines, EMPTY_LINE_FORM } from "@/hooks/useProductionLines";
import { getEntityIconProps, saveEntityConfig } from "./entityDisplay";
import type { ProductionLine } from "@/types/productionLine";

const STATUS_OPTIONS: FilterOption[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Not Ready", value: "not_ready" },
];

const SHIFT_OPTIONS = [
  { label: "1-shift (Morning)", value: "1-shift (Morning)" },
  { label: "1-shift (Afternoon)", value: "1-shift (Afternoon)" },
  { label: "2-shift (Morn/Aftn)", value: "2-shift (Morn/Aftn)" },
  { label: "3-shift (Morn/Aftn/Night)", value: "3-shift (Morn/Aftn/Night)" },
  { label: "Flexible", value: "Flexible" },
];


export function ProductionLinesPage() {
  const navigate = useNavigate();
  const {
    lines, loading, search, setSearch,
    statusFilter, setStatusFilter, saveLine, deleteLine, plants,
  } = useProductionLines();

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lineToDelete, setLineToDelete] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_LINE_FORM>({ ...EMPTY_LINE_FORM });
  const [plantFilter, setPlantFilter] = useState("all");
  const [page, setPage] = useState(1);
  const { containerRef, cardRef, perPage } = usePageSize(56, 8, 1);

  useEffect(() => { setPage(1); }, [search, statusFilter, plantFilter, perPage]);

  const plantOptions = useMemo<FilterOption[]>(() => (
    [{ label: "All Plants", value: "all" }].concat(
      (plants || []).map((p: { id: string; name: string }) => ({ label: p.name, value: p.id }))
    )
  ), [plants]);

  const plantModalOptions = useMemo(() =>
    (plants || []).map((p: { id: string; name: string }) => ({ label: p.name, value: p.id })),
  [plants]);

  const modalFields = useMemo<ModalField[]>(() => [
    { key: "entityIcon", label: "Icon & Color", type: "entityicon" },
    { key: "name", label: "Line Name", required: true, placeholder: "e.g. C2-Cylinder Assembly" },
    { key: "code", label: "Line Code", required: true, placeholder: "e.g. L-CYL" },
    { key: "plantId", label: "Plant", required: true, type: "select", options: plantModalOptions },
    { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
    { key: "shiftPattern", label: "Shift Pattern", type: "select", options: SHIFT_OPTIONS },
    { key: "isConstraintStr", label: "Bottleneck / Constraint", type: "select", options: [{ label: "No", value: "false" }, { label: "Yes", value: "true" }] },
  ], [plantModalOptions]);

  const filtered = useMemo(() => {
    if (plantFilter === "all") return lines;
    return lines.filter((l) => l.plantId === plantFilter);
  }, [lines, plantFilter]);
  const paginatedFiltered = filtered.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_LINE_FORM, plantId: plantModalOptions.length > 0 ? plantModalOptions[0].value : "", entityIcon: "productionLine" });
    setModalOpen(true);
  };

  const openEdit = (line: ProductionLine) => {
    setEditingId(line.id);
    setForm({
      entityIcon: "productionLine",
      name: line.name,
      code: line.code || "",
      plantId: line.plantId || "",
      status: line.status,
      modelsProduced: line.modelsProduced.join(", "),
      shiftPattern: line.shiftPattern,
      isConstraint: line.isConstraint,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (editingId && form.entityIcon) {
      saveEntityConfig("productionLine", editingId, form.entityIcon);
    }
    const result = await saveLine(form, editingId);
    if (result.ok) {
      setModalOpen(false);
    }
  };

  const handleDelete = async () => {
    if (lineToDelete) {
      await deleteLine(lineToDelete);
      setLineToDelete(null);
      setConfirmOpen(false);
    }
  };

  const currentLine = editingId ? lines.find((l) => l.id === editingId) : undefined;

  const modalValues = useMemo<Record<string, string>>(() => ({
    name: form.name,
    code: form.code,
    plantId: form.plantId,
    status: form.status,
    shiftPattern: form.shiftPattern,
    isConstraintStr: form.isConstraint ? "true" : "false",
  }), [form]);

  const handleModalChange = (key: string, value: string) => {
    if (key === "isConstraintStr") {
      setForm((prev) => ({ ...prev, isConstraint: value === "true" }));
    } else {
      setForm((prev) => ({ ...prev, [key]: value }));
    }
  };

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      <PageHeader
        icon={<TrendingUpDown className="h-5 w-5 stroke-current" />}
        iconClass="bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
        title="Production Lines"
        subtitle="Define line structure — plant affiliation, shift patterns, and models produced."
      >
        <button type="button" onClick={() => navigate("/system/production-structure")}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 transition-colors dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/60"
        >
          <X className="h-4 w-4 stroke-current" />
          Close
        </button>
      </PageHeader>

      <Toolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search lines or models..."
        parentFilter={{ value: plantFilter, onChange: setPlantFilter, options: plantOptions }}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={STATUS_OPTIONS}
        onAdd={openAdd}
        addLabel="Add Line"
      />

      {/* Content area: flex column, fills remaining space, NO overflow so all cards are visible */}
      <div ref={containerRef} className={`flex flex-1 flex-col overflow-hidden ${theme.page} px-4 pt-3 pb-2`} style={{ minHeight: 0 }}>
        {loading && filtered.length === 0 ? (
          <div className={`py-16 text-center text-sm ${theme.textMuted}`}>Loading production lines...</div>
        ) : filtered.length === 0 ? (
          <div className={`flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center ${theme.card}`}>
            <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${theme.iconBoxSubtle}`}>
              <TrendingUpDown className="h-6 w-6 stroke-current" />
            </div>
            <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>
              {search ? "No lines match your search" : "No production lines configured"}
            </h3>
            <p className={`mt-1 max-w-xs text-xs ${theme.textSecondary}`}>Add production lines and link them to plants, shift patterns, and models.</p>
            {!search && (
              <button type="button" onClick={openAdd} className={`mt-4 rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${theme.buttonSecondary}`}>
                Add Line
              </button>
            )}
          </div>
        ) : (
          /* Cards grid — gap-2 ≈ 8px, no overflow */
          <div className="flex flex-col gap-2">
            {paginatedFiltered.map((line, idx) => {
              const { Icon, textColor } = getEntityIconProps("productionLine", line.id);
              return (
              /* Attach cardRef to the first card so usePageSize can measure real height */
              <div key={line.id} ref={idx === 0 ? cardRef : undefined}>
                <DataCard
                icon={<Icon className={`h-5 w-5 stroke-current ${textColor}`} />}
                iconBg="bg-transparent"
                name={line.name}
                code={line.code}
                status={line.status}
                parentContext={line.plantName}
                primaryMetrics={[
                  ...(line.modelsProduced.length > 0 ? [{ label: "Models", value: line.modelsProduced.join(", ") }] : [{ label: "Models", value: "None" }]),
                ]}
                metrics={[
                  { label: "Departments", value: line.departmentCount },
                  { label: "Resource Groups", value: line.groupCount },
                  { label: "Resources", value: line.resourceCount },
                  ...(line.shiftPattern ? [{ label: "Shift", value: line.shiftPattern }] : []),
                ]}
                readiness={[
                  { label: "Departments", ready: line.departmentCount > 0 },
                  { label: "Resources", ready: line.resourceCount > 0 },
                  { label: "Models", ready: line.modelsProduced.length > 0 },
                ]}
                onEdit={() => openEdit(line)}
                onStructure={() => navigate(`/system/production-structure/structure?line=${encodeURIComponent(line.name)}`)}
                onOpen={() => navigate(`/system/production-structure/production-lines/${line.id}`)}
              />
              </div>
              );
            })}
          </div>
        )}

        {/* Pagination — pinned at bottom of the content area */}
        <div className="mt-auto pt-2 shrink-0">
          <Pagination page={page} total={filtered.length} perPage={perPage} onChange={setPage} />
        </div>
      </div>

      <UnifiedModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Production Line" : "Add Production Line"}
        fields={modalFields}
        values={modalValues}
        onChange={handleModalChange}
        onSave={handleSave}
        onDelete={editingId ? () => { setLineToDelete(editingId); setConfirmOpen(true); } : undefined}
        summary={
          <LineSummary
            departments={currentLine?.departmentCount ?? 0}
            groups={currentLine?.groupCount ?? 0}
            resources={currentLine?.resourceCount ?? 0}
            models={currentLine?.modelsProduced?.length ?? 0}
          />
        }
        onConfigureStructure={
          editingId
            ? () => { const l = lines.find((ln) => ln.id === editingId); navigate(`/system/production-structure/structure?line=${encodeURIComponent(l?.name ?? "")}`); }
            : undefined
        }
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setLineToDelete(null); }}
        title="Delete Production Line"
        message={`Are you sure you want to delete "${currentLine?.name ?? lineToDelete}"? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export function ProductionLineDetailPage() {
  const navigate = useNavigate();
  const { lineId } = useParams<{ lineId: string }>();
  const { lines, deleteLine } = useProductionLines();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const line = lines.find((l) => l.id === lineId);

  if (!line) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-slate-100" style={{ minHeight: 0 }}>
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-6">
          <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <TrendingUpDown className="h-5 w-5 stroke-current" />
          </div>
          <h1 className="text-sm font-semibold text-slate-900">Production Line Not Found</h1>
        </header>
        <div className="flex-1 flex items-center justify-center text-xs text-slate-500">Line "{lineId}" does not exist.</div>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteLine(line.id);
    navigate("/system/production-structure/production-lines");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-100" style={{ minHeight: 0 }}>
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6" style={{ height: "56px" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/system/production-structure/production-lines")}
            className="rounded-lg p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4 stroke-current" />
          </button>
          <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <TrendingUpDown className="h-5 w-5 stroke-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-slate-900">{line.name}</h1>
              {line.status === "active" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                  Inactive
                </span>
              )}
              {line.isConstraint && (
                <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-600">Constraint</span>
              )}
            </div>
            <p className="text-xs text-slate-500">ID: {line.id} &middot; {line.plantName}</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/system/production-structure/production-lines")}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="h-4 w-4" />
          Close
        </button>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-100 px-6 py-5">
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">General Information</h2>
            <div className="space-y-3">
              <Field icon={Building2} label="Plant" value={line.plantName} />
              <Field icon={Clock} label="Shift Pattern" value={line.shiftPattern || "Not set"} />
              <Field icon={AlertTriangle} label="Constraint / Bottleneck" value={line.isConstraint ? "Yes - this line is a bottleneck" : "No"} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Summary Counters</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Departments" value={line.departmentCount} icon={Layers} />
              <StatCard label="Resource Groups" value={line.groupCount} icon={Component} />
              <StatCard label="Resources" value={line.resourceCount} icon={Dumbbell} />
              <StatCard label="Models" value={line.modelsProduced.length} icon={FileText} />
            </div>
          </div>
        </div>

        {line.modelsProduced.length > 0 && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <FileText className="h-3.5 w-3.5" />
              Models Produced
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {line.modelsProduced.map((model, i) => (
                <span key={i} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700">
                  {model}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Actions</h2>
          <div className="flex flex-wrap gap-2">
            <ActionBtn icon={Factory} label="View Plant" onClick={() => line.plantId && navigate(`/system/production-structure/plant/${line.plantId}`)} />
            <ActionBtn icon={Layers} label="View Departments" onClick={() => navigate("/system/production-structure/departments")} />
            <ActionBtn icon={Component} label="View Resource Groups" onClick={() => navigate("/system/production-structure/resource-groups")} />
            <ActionBtn icon={Dumbbell} label="View Resources" onClick={() => navigate("/system/production-structure/resources")} />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50/50 px-4 py-3">
          <div>
            <p className="text-xs font-medium text-red-600">Delete this production line</p>
            <p className="text-[11px] text-red-500">This action cannot be undone.</p>
          </div>
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-500 transition-colors active:scale-[0.97]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete Production Line"
        message={`Are you sure you want to delete "${line.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-slate-500">{label}</div>
        <div className="text-sm text-slate-900">{value || <span className="italic text-slate-400">Not set</span>}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-left">
      <div className="flex items-center justify-between">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-base font-bold text-slate-900">{value}</span>
      </div>
      <div className="mt-1 text-[10px] text-slate-500">{label}</div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick }: { icon: ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors active:scale-[0.97]">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {label}
    </button>
  );
}
