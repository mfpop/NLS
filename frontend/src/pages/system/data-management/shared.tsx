import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ExternalLink, Search, X } from "lucide-react";
import { Link } from "react-router-dom";

/* ── Breadcrumbs ── */

interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-3" aria-label="Breadcrumb">
      <Link to="/control-tower" className="hover:text-slate-600 transition-colors">
        Home
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3" />
          {crumb.to ? (
            <Link to={crumb.to} className="hover:text-slate-600 transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-slate-600 font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ── Context Bar (Plant > Line > Group) ── */

interface ContextSegment {
  label: string;
  to?: string;
}

export function ContextBar({ segments }: { segments: ContextSegment[] }) {
  if (segments.length === 0) return null;
  return (
    <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300" />}
          {seg.to ? (
            <Link to={seg.to} className="font-medium text-slate-700 hover:text-slate-900 transition-colors">
              {seg.label}
            </Link>
          ) : (
            <span className="font-medium text-slate-900">{seg.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

/* ── Search Input ── */

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search..." }: SearchBarProps) {
  return (
    <div className="relative flex-1 max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ── Filter Tabs ── */

interface FilterTab {
  label: string;
  value: string;
}

export function FilterBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: FilterTab[];
  active: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value as T)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            active === tab.value
              ? "bg-slate-800 text-white"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* ── Empty State ── */

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-slate-500">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/* ── Status Badge ── */

export function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {status}
    </span>
  );
}

/* ── Quick Action Buttons ── */

export function QuickAction({ label, onClick, icon }: { label: string; onClick?: () => void; icon?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 transition-colors active:scale-[0.97]"
    >
      {icon}
      {label}
    </button>
  );
}

/* ── Shortcut to Control Tower ── */

export function ControlTowerLink({ plantName }: { plantName: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/control-tower?plant=${encodeURIComponent(plantName)}`)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors active:scale-[0.97]"
    >
      <ExternalLink className="h-3.5 w-3.5" />
      View in Control Tower
    </button>
  );
}

/* ── Checkbox for bulk select ── */

export function BulkCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-300 cursor-pointer"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

/* ── Structure Shortcuts bar ── */

export function StructureShortcuts() {
  const navigate = useNavigate();
  return (
    <div className="mb-3 flex items-center gap-2 text-xs">
      <span className="text-slate-400 font-medium">Quick access:</span>
      <button
        type="button"
        onClick={() => navigate("/system/data-management/structure")}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-50 transition-colors active:scale-[0.97]"
      >
        View full structure
      </button>
      <button
        type="button"
        onClick={() => navigate("/system/data-management/resource-groups")}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-50 transition-colors active:scale-[0.97]"
      >
        Jump to groups
      </button>
      <button
        type="button"
        onClick={() => navigate("/system/data-management/references")}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-50 transition-colors active:scale-[0.97]"
      >
        Jump to tables
      </button>
    </div>
  );
}

/* ── Global Cross-Entity Search (for DataManagementPage) ── */

interface GlobalSearchResult {
  type: "Plant" | "Department" | "Group" | "Table";
  label: string;
  subtitle: string;
  to: string;
}

export function GlobalSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const allResults: GlobalSearchResult[] = [
    { type: "Plant", label: "Main Plant", subtitle: "Building A · 3 lines", to: "/system/data-management/plant/P001" },
    { type: "Plant", label: "Secondary Plant", subtitle: "Building B · 2 lines", to: "/system/data-management/plant/P002" },
    { type: "Plant", label: "Warehouse Plant", subtitle: "Warehouse 1 · 1 line", to: "/system/data-management/plant/P003" },
    { type: "Department", label: "Assembly", subtitle: "Main Plant · John Smith", to: "/system/data-management/departments/D001" },
    { type: "Department", label: "Machining", subtitle: "Main Plant · Sarah Chen", to: "/system/data-management/departments/D002" },
    { type: "Department", label: "Quality Control", subtitle: "Main Plant · Mike Brown", to: "/system/data-management/departments/D003" },
    { type: "Group", label: "Line Operators", subtitle: "Production · Tom Wilson", to: "/system/data-management/resource-groups/RG001" },
    { type: "Group", label: "Setup Technicians", subtitle: "Support · Lisa Park", to: "/system/data-management/resource-groups/RG002" },
    { type: "Group", label: "Quality Inspectors", subtitle: "Quality · James Lee", to: "/system/data-management/resource-groups/RG003" },
    { type: "Table", label: "Shift Patterns", subtitle: "3 entries", to: "/system/data-management/references/T001" },
    { type: "Table", label: "Machine Types", subtitle: "12 entries", to: "/system/data-management/references/T002" },
    { type: "Table", label: "Material Categories", subtitle: "24 entries", to: "/system/data-management/references/T003" },
    { type: "Table", label: "Work Centers", subtitle: "15 entries", to: "/system/data-management/references/T004" },
    { type: "Table", label: "Operation Codes", subtitle: "42 entries", to: "/system/data-management/references/T005" },
    { type: "Table", label: "Holiday Calendar", subtitle: "14 entries", to: "/system/data-management/references/T006" },
  ];

  const results = query.trim()
    ? allResults.filter((r) =>
        r.label.toLowerCase().includes(query.toLowerCase()) ||
        r.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div className="fixed left-1/2 top-24 z-40 w-full max-w-lg -translate-x-1/2 rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plants, groups, tables..."
            className="flex-1 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
            autoFocus
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 font-medium">
            ESC
          </button>
        </div>
        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto p-2">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { navigate(r.to); onClose(); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
              >
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  r.type === "Plant" ? "bg-blue-100 text-blue-700" :
                  r.type === "Department" ? "bg-indigo-100 text-indigo-700" :
                  r.type === "Group" ? "bg-violet-100 text-violet-700" :
                  "bg-sky-100 text-sky-700"
                }`}>
                  {r.type}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900">{r.label}</div>
                  <div className="text-xs text-slate-400">{r.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {query && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-400">No results found for &ldquo;{query}&rdquo;</div>
        )}
        {!query && (
          <div className="px-4 py-8 text-center text-sm text-slate-400">Start typing to search across plants, departments, resource groups, and reference tables.</div>
        )}
      </div>
    </>
  );
}

