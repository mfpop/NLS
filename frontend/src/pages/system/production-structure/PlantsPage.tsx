import React, { useState, useEffect, useRef, useCallback } from "react";
import { Factory, GripVertical } from "lucide-react";
import { Pagination, PlantDetailView } from "./components";
import { UnifiedModal } from "./components/UnifiedModal";
import { PlantSummary } from "./components/SummaryBlock";
import { ConfirmDialog } from "./shared";
import { theme } from "../../../styles/themeTokens";
import { usePlants, EMPTY_FORM, TIMEZONE_OPTIONS } from "@/hooks/usePlants";
import type { Plant } from "@/types/plant";
import { getEntityIconProps, saveEntityConfig } from "./entityDisplay";

const PER_PAGE = 10;

export function PlantsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [plantToDelete, setPlantToDelete] = useState<Plant | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [detailPct, setDetailPct] = useState(85);
  const detailContainerRef = useRef<HTMLDivElement>(null);

  const { plants, loading, saveLoading, savePlant, archivePlant, refetch } = usePlants();

  const handleDetailDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = detailContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => { const pct = ((ev.clientX - rect.left) / rect.width) * 100; setDetailPct(Math.min(Math.max(100 - pct, 15), 85)); };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  }, []);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const filtered = plants.filter((p) => statusFilter === "all" || p.status === statusFilter)
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const selectedPlant = selectedId ? plants.find((p) => p.id === selectedId) : null;

  const openAdd = () => {
    setEditingId(null); setSaveError(null);
    setForm({ entityIcon: "plant", name: "", code: "", status: "active", building: "", address: "", city: "", state: "", country: "", zipcode: "", timezone: "", latitude: "", longitude: "", plantType: "", operatingSince: "", managerName: "", managerEmail: "", managerPhone: "", defaultCalendar: "", defaultShiftModel: "", weekStartDay: "", defaultSchedule: "", manufacturingFocus: "", description: "" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaveError(null);
    if (editingId && form.entityIcon) saveEntityConfig("plant", editingId, form.entityIcon);
    const result = await savePlant({ ...EMPTY_FORM, ...form, status: (form.status || "active") as "active" | "inactive" }, editingId);
    if (result.ok) setModalOpen(false); else { const msgs = result.errors ? Object.values(result.errors).join("; ") : "Failed to save plant."; setSaveError(msgs); }
  };

  const handleDelete = async () => {
    if (!plantToDelete) return;
    const result = await archivePlant(plantToDelete.id);
    if (result.inUse) alert(result.message);
    setConfirmOpen(false); setPlantToDelete(null); setModalOpen(false);
    if (selectedId === plantToDelete.id) setSelectedId(null);
  };

  const editingPlant = editingId ? plants.find((p) => p.id === editingId) : null;

  return (
    <React.Fragment>
        <div className="flex items-center gap-3 px-3 py-1 h-9 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 font-sans font-semibold text-gray-700 dark:text-gray-300 select-none">
  <button type="button" onClick={openAdd} className="flex items-center gap-1 px-3 py-1 rounded hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400">
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    New
  </button>
  <button type="button" disabled={!selectedPlant} onClick={() => selectedPlant && setEditingId(selectedPlant.id)} className="flex items-center gap-1 px-3 py-1 rounded hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:pointer-events-none disabled:opacity-50">
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 12H9m6 0l-3 3m3-3l-3-3"/></svg>
    Edit
  </button>
  <button type="button" disabled={!selectedPlant} onClick={() => setPlantToDelete(selectedPlant!)} className="flex items-center gap-1 px-3 py-1 rounded hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:pointer-events-none disabled:opacity-50">
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
    Delete
  </button>
  <button type="button" onClick={() => refetch()} className="flex items-center gap-1 px-3 py-1 rounded hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400">
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><polyline points="20 17 14 11 20 5"/></svg>
    Refresh
  </button>

  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ml-auto cursor-pointer rounded border border-gray-300 bg-white py-1 px-2 text-sm text-gray-800 hover:border-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-gray-500">
    <option value="all">All</option>
    <option value="active">Active</option>
    <option value="inactive">Inactive</option>
  </select>
  <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="ml-2 w-48 rounded border border-gray-300 bg-white py-1 px-2 text-sm text-gray-800 placeholder-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus-visible:outline-gray-400" />
</div>
        <div ref={detailContainerRef} className="flex flex-1 overflow-hidden p-0 m-0">
          <div className="flex flex-col overflow-hidden p-0 m-0" style={{ flex: `${100 - detailPct}%`, minWidth: 0 }}>
            <div className="flex-1 overflow-y-auto p-2 m-0 bg-white dark:bg-slate-900">
              {loading && plants.length === 0 ? (
                <div className={`py-12 text-center text-sm ${theme.textMuted}`}>Loading plants...</div>
              ) : filtered.length === 0 ? (
                <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-12 text-center ${theme.card}`}>
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${theme.iconBoxSubtle}`}><Factory className="h-5 w-5 stroke-current" /></div>
                  <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>{search ? "No plants match your search" : "No plants configured"}</h3>
                  <p className={`mt-1 max-w-xs text-xs ${theme.textSecondary}`}>Add your first plant to start modeling your production structure.</p>
                </div>
              ) : (
                <div className="space-y-px">{paginated.map((plant) => {
                  const { textColor, bgColor } = getEntityIconProps("plant", plant.id);
                  return (
                    <div key={plant.id}
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer select-none transition-colors ${selectedId === plant.id ? "bg-teal-100/60 dark:bg-teal-900/30" : "hover:bg-teal-50/40 dark:hover:bg-slate-800/40"}`}
                      onClick={() => setSelectedId(plant.id)}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${bgColor || "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
                        <Factory className={`h-5 w-5 stroke-current ${textColor}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[13px] font-medium ${theme.textPrimary}`}>{plant.name}</span>
                          {plant.code && <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${theme.codeBadge}`}>{plant.code}</span>}
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${plant.status === "active" ? "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" : "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"}`}>
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${plant.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />{plant.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}</div>
              )}
              <div className="mt-3"><Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} /></div>
            </div>
          </div>
          <div onMouseDown={handleDetailDividerDown} className="flex shrink-0 cursor-col-resize items-center justify-center bg-slate-200/60 hover:bg-slate-300/60 dark:bg-slate-700/60 dark:hover:bg-slate-600/30 transition-colors" style={{ width: 4 }}>
            <GripVertical className="h-3 w-3 text-slate-400 dark:text-slate-500 pointer-events-none" />
          </div>
          <div className="flex flex-col overflow-hidden p-0 m-0" style={{ flexBasis: `${detailPct}%`, minWidth: 0 }}>
            {selectedPlant ? (
              <PlantDetailView plantId={selectedPlant.id} />
            ) : (
              <div className="flex flex-1 items-center justify-center bg-white dark:bg-slate-900">
                <div className="text-center"><p className={`text-xs ${theme.textMuted}`}>Select a plant to view details</p></div>
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0 flex items-center border-t border-slate-200 bg-slate-50/80 px-3 py-1 dark:border-slate-700 dark:bg-slate-800/80 font-['Segoe_UI',system-ui,sans-serif]">
          <span className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
        </div>

      <UnifiedModal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Plant" : "Add Plant"} fields={[
        { key: "entityIcon", label: "Production Structure", type: "entityicon" },
        { key: "name", label: "Plant Name", required: true, placeholder: "e.g. Main Plant" },
        { key: "building", label: "Location / Building", placeholder: "e.g. Building A" },
        { key: "city", label: "City", placeholder: "e.g. Santa Fe Springs" },
        { key: "state", label: "State", placeholder: "e.g. CA" },
        { key: "country", label: "Country", placeholder: "e.g. USA" },
        { key: "timezone", label: "Timezone", type: "select", required: true, placeholder: "Select timezone", options: TIMEZONE_OPTIONS },
        { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
      ]} values={form} onChange={(k, v) => { setForm((prev) => ({ ...prev, [k]: v })); setSaveError(null); }} onSave={handleSave}
        onDelete={editingId ? () => { setPlantToDelete(plants.find((p) => p.id === editingId) ?? null); setConfirmOpen(true); } : undefined}
        saving={saveLoading} summary={<>{saveError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">{saveError}</div>}<PlantSummary lines={editingPlant?.lineCount ?? 0} departments={editingPlant?.departmentCount ?? 0} groups={editingPlant?.groupCount ?? 0} resources={editingPlant?.resourceCount ?? 0} /></>}
      />
      <ConfirmDialog open={confirmOpen} onClose={() => { setConfirmOpen(false); setPlantToDelete(null); }} title={`Delete plant ${plantToDelete?.name ?? ""}?`} message="This action cannot be undone." onConfirm={handleDelete} />
    </React.Fragment>
  );
}
