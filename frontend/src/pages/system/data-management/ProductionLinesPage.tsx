import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch, Cpu, Pencil, ExternalLink, ClipboardCheck, BookOpen } from "lucide-react";
import {
  Breadcrumbs, ContextBar, SearchBar, FilterBar, EmptyState, StatusBadge,
  BulkCheckbox, PrimaryAction, ActionsDropdown
} from "./shared";

/* ──────────────────────────────────────────
   DATA: Configuration-only domain model
   ────────────────────────────────────────── */

interface ProductionLine {
  id: string;
  name: string;
  status: "active" | "inactive";
  plantName: string;
  models: string[];
  departmentCount: number;
  departments: string[];
  groupCount: number;
  resources: number;
  shiftPattern: string;
  isConstraint?: boolean;
}

const lines: ProductionLine[] = [
  { id: "L001", name: "C2-Cylinder Assembly", status: "active", plantName: "Main Plant", models: ["C2 Cylinder", "STB Valve Body", "Flange Ring"], departmentCount: 4, departments: ["Assembly", "Machining", "Quality Control", "Maintenance"], groupCount: 8, resources: 18, shiftPattern: "2-shift (Morn/Aftn)", isConstraint: true },
  { id: "L002", name: "Line B (STB Units)", status: "active", plantName: "Main Plant", models: ["STB Unit Type A", "STB Unit Type B"], departmentCount: 3, departments: ["Assembly", "Machining", "QC"], groupCount: 5, resources: 12, shiftPattern: "2-shift (Morn/Aftn)" },
  { id: "L003", name: "Line C (Pipes)", status: "active", plantName: "Main Plant", models: ["Pipe Assembly DN40", "Pipe Assembly DN80"], departmentCount: 2, departments: ["Quality Control", "Assembly"], groupCount: 4, resources: 8, shiftPattern: "1-shift (Morning)" },
  { id: "L004", name: "Line A", status: "active", plantName: "Main Plant", models: ["Assembly Base Unit"], departmentCount: 2, departments: ["Assembly", "Logistics"], groupCount: 3, resources: 6, shiftPattern: "2-shift (Morn/Aftn)" },
  { id: "L005", name: "Line B (Shared)", status: "active", plantName: "Secondary Plant", models: ["Forklift Attachment", "Pallet Adapter"], departmentCount: 2, departments: ["Logistics", "Assembly"], groupCount: 3, resources: 6, shiftPattern: "1-shift (Afternoon)" },
  { id: "L006", name: "Line C (Quality)", status: "inactive", plantName: "Secondary Plant", models: ["QC Test Specimen"], departmentCount: 1, departments: ["Quality Control"], groupCount: 2, resources: 4, shiftPattern: "1-shift (Morning)" },
];

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

/* ── CONFIGURATION-ONLY VIEW ── */

export function ProductionLinesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = lines.filter((l) => {
    if (filter !== "all" && l.status !== filter) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.models.some(m => m.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const toggleAll = () => { if (allSelected) setSelected(new Set()); else setSelected(new Set(filtered.map((l) => l.id))); };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ minHeight: 0 }}>
      {/* ── HEADER ── */}
      <header className="flex shrink-0 items-center gap-4 border-b border-(--border-soft) bg-(--surface-1) px-5 py-3">
        <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <GitBranch className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold tracking-tight text-(--text-primary)">Production Lines</h1>
          <p className="text-xs text-(--text-secondary)">Define line structure — plant affiliation, linked departments, resource groups, resources, and models produced.</p>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex-1 overflow-y-auto bg-(--page-bg) p-4">
        <Breadcrumbs crumbs={[{ label: "Data Management", to: "/system/data-management" }, { label: "Production Lines" }]} />
        <ContextBar segments={[{ label: "All Plants" }]} />

        {/* Controls — search + filter + add */}
        <div className="mb-3 flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search lines or models..." />
          <FilterBar tabs={FILTERS} active={filter} onChange={setFilter} />
          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 && <span className="text-xs text-slate-500">{selected.size} selected</span>}
            <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors active:scale-[0.97]">+ Add Line</button>
          </div>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <span className="font-medium">{selected.size} line(s) selected</span>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Assign model</button>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Change shift pattern</button>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Activate</button>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Deactivate</button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-blue-500 hover:text-blue-700 font-medium">Clear</button>
          </div>
        )}

        {/* Line cards */}
        {filtered.length === 0 ? (
          <EmptyState icon={<GitBranch className="h-6 w-6" />} title={search ? "No lines match your search" : "No production lines configured"} description="Add production lines and link them to departments, resource groups, and the models they produce." action={{ label: "+ Add Line", onClick: () => {} }} />
        ) : (
          <div className="space-y-2">
            {filtered.map((line) => {
              const isSelected = selected.has(line.id);
              return (
                <div
                  key={line.id}
                  className={`group cursor-pointer rounded-xl border bg-white px-3 py-2.5 transition-all hover:border-slate-300 hover:shadow-sm active:scale-[0.99] ${isSelected ? "border-blue-300 ring-1 ring-blue-200" : "border-slate-200"}`}
                  onClick={() => navigate(`/system/data-management/production-lines/${line.id}`)}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/system/data-management/production-lines/${line.id}`); }}
                >
                  <div className="flex items-center justify-between">
                    {/* ── LEFT: Configuration data only ── */}
                    <div className="flex items-center gap-3 min-w-0">
                      <BulkCheckbox checked={isSelected} onChange={() => toggleOne(line.id)} />
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                        <GitBranch className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        {/* Row 1: Name + status + optional constraint tag */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{line.name}</span>
                          <StatusBadge status={line.status} />
                          {line.isConstraint && (
                            <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-600">Constraint</span>
                          )}
                        </div>
                        {/* Row 2: Plant + departments (explicit names) */}
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                          <span className="font-medium text-slate-600">{line.plantName}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>Departments: {line.departments.join(", ")}</span>
                        </div>
                        {/* Row 3: Structure counts + models (configuration info) */}
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                          <span>{line.groupCount} group(s)</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>{line.resources} resource(s)</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span className="font-medium text-slate-600">Models: {line.models.join(", ")}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>Shift: {line.shiftPattern}</span>
                        </div>
                      </div>
                    </div>

                    {/* ── RIGHT: Configuration actions ── */}
                    <div className="hidden items-center gap-2 sm:flex" onClick={(e) => e.stopPropagation()}>
                      <PrimaryAction onClick={() => navigate(`/system/data-management/production-lines/${line.id}`)} />
                      <ActionsDropdown actions={[
                        { label: "Edit Line", icon: <Pencil className="h-3 w-3" />, onClick: () => {} },
                        { label: "Assign Departments", icon: <ClipboardCheck className="h-3 w-3" />, onClick: () => {} },
                        { label: "Assign Resource Groups", icon: <BookOpen className="h-3 w-3" />, onClick: () => {} },
                        { label: "Configure Models", icon: <Cpu className="h-3 w-3" />, onClick: () => {} },
                        { label: "View in Control Tower", icon: <ExternalLink className="h-3 w-3" />, onClick: () => navigate(`/control-tower?plant=${encodeURIComponent(line.plantName)}&line=${encodeURIComponent(line.name)}`) },
                      ]} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>{filtered.length} of {lines.length} line(s)</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-3.5 w-3.5 rounded border-slate-300 text-slate-700" />
            Select all
          </label>
        </div>
      </div>
    </div>
  );
}
