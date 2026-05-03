import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Factory, MoreHorizontal, Eye, Pencil, GitBranch } from "lucide-react";
import {
  Breadcrumbs, SearchBar, FilterBar, EmptyState, StatusBadge, QuickAction,
  ControlTowerLink, BulkCheckbox, StructureShortcuts
} from "./shared";

interface Plant {
  id: string;
  name: string;
  location: string;
  status: "active" | "inactive";
  lines: number;
  departments: number;
  groups: number;
}

const plants: Plant[] = [
  { id: "P001", name: "Main Plant", location: "Building A", status: "active", lines: 3, departments: 4, groups: 8 },
  { id: "P002", name: "Secondary Plant", location: "Building B", status: "active", lines: 2, departments: 3, groups: 5 },
  { id: "P003", name: "Warehouse Plant", location: "Warehouse 1", status: "inactive", lines: 1, departments: 1, groups: 2 },
];

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export function PlantStructurePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = plants.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.location.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  const toggleAll = () => {
    if (allSelected) { setSelected(new Set()); }
    else { setSelected(new Set(filtered.map((p) => p.id))); }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ minHeight: 0 }}>
      {/* Header */}
      <header className="flex shrink-0 items-center gap-4 border-b border-[var(--border-soft)] bg-[var(--surface-1)] px-5 py-3">
        <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">Plant Structure</h1>
          <p className="text-xs text-[var(--text-secondary)]">Configure plants, lines, and resource groups.</p>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-[var(--page-bg)] p-4">
        <Breadcrumbs crumbs={[{ label: "Data Management", to: "/system/data-management" }, { label: "Plant Structure" }]} />
        <StructureShortcuts />

        {/* Toolbar */}
        <div className="mb-3 flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search plants..." />
          <FilterBar tabs={FILTERS} active={filter} onChange={setFilter} />
          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 && (
              <span className="text-xs text-slate-500">{selected.size} selected</span>
            )}
            <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors active:scale-[0.97]">
              + Add Plant
            </button>
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <span className="font-medium">{selected.size} plant(s) selected</span>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Assign to line</button>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Activate</button>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Deactivate</button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-blue-500 hover:text-blue-700 font-medium">
              Clear
            </button>
          </div>
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title={search ? "No plants match your search" : "No plants configured"}
            description="Add your first plant to start modeling your production structure."
            action={{ label: "+ Add Plant", onClick: () => {} }}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((plant) => {
              const isSelected = selected.has(plant.id);
              return (
                <div
                  key={plant.id}
                  className={`group cursor-pointer rounded-xl border bg-white px-3 py-2.5 transition-all hover:border-slate-300 hover:shadow-sm active:scale-[0.99] ${
                    isSelected ? "border-blue-300 ring-1 ring-blue-200" : "border-slate-200"
                  }`}
                  onClick={() => navigate(`/system/data-management/plant/${plant.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/system/data-management/plant/${plant.id}`); }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <BulkCheckbox checked={isSelected} onChange={() => toggleOne(plant.id)} />
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Factory className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{plant.name}</span>
                          <StatusBadge status={plant.status} />
                          <span className="text-[10px] text-slate-400">ID: {plant.id}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                          <span>{plant.location}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>{plant.lines} line(s)</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>{plant.departments} dept(s)</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>{plant.groups} group(s)</span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden items-center gap-1.5 sm:flex" onClick={(e) => e.stopPropagation()}>
                      <QuickAction label="View Structure" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => navigate(`/system/data-management/plant/${plant.id}`)} />
                      <QuickAction label="Edit" icon={<Pencil className="h-3.5 w-3.5" />} />
                      <QuickAction label="Manage Lines" icon={<GitBranch className="h-3.5 w-3.5" />} />
                      <ControlTowerLink plantName={plant.name} />
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 text-slate-400 hover:text-slate-600 transition-colors active:scale-[0.97]"
                        aria-label="More actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>{filtered.length} of {plants.length} plant(s)</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-700"
            />
            Select all
          </label>
        </div>
      </div>
    </div>
  );
}
