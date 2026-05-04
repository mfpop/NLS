import { useState, type ReactNode, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ExternalLink, Search, X, AlertTriangle, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { theme } from "../../../styles/themeTokens";

/* •••••• Breadcrumbs •••••• */

interface Crumb { label: string; to?: string; }

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className={`mb-3 flex items-center gap-1.5 text-xs ${theme.textMuted}`} aria-label="Breadcrumb">
      <Link to="/control-tower" className={`${theme.link} transition-colors`}>Home</Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3 stroke-current" />
          {crumb.to ? (<Link to={crumb.to} className={`${theme.link} transition-colors`}>{crumb.label}</Link>) : (<span className={`font-medium ${theme.textSecondary}`}>{crumb.label}</span>)}
        </span>
      ))}
    </nav>
  );
}

/* •••••• Context Bar •••••• */

interface ContextSegment { label: string; to?: string; }

export function ContextBar({ segments }: { segments: ContextSegment[] }) {
  if (segments.length === 0) return null;
  return (
    <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${theme.card} ${theme.textSecondary}`}>
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <ChevronRight className={`h-3 w-3 ${theme.textMuted} stroke-current`} />}
          {seg.to ? (<Link to={seg.to} className={`font-medium ${theme.textPrimary} ${theme.link} transition-colors`}>{seg.label}</Link>) : (<span className={`font-medium ${theme.textPrimary}`}>{seg.label}</span>)}
        </span>
      ))}
    </div>
  );
}

/* •••••• Search Input •••••• */

interface SearchBarProps { value: string; onChange: (value: string) => void; placeholder?: string; }

export function SearchBar({ value, onChange, placeholder = "Search..." }: SearchBarProps) {
  return (
    <div className="relative flex-1 max-w-xs">
      <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${theme.iconSubtle} stroke-current`} />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`w-full rounded-lg border py-2 pl-9 pr-3 text-xs transition-colors ${theme.input} ${theme.focusRing}`} />
      {value && <button type="button" onClick={() => onChange("")} className={`absolute right-2 top-1/2 -translate-y-1/2 ${theme.iconSubtle} ${theme.link}`}><X className="h-4 w-4 stroke-current" /></button>}
    </div>
  );
}

/* •••••• Filter Tabs •••••• */

interface FilterTab { label: string; value: string; }

export function FilterBar<T extends string>({ tabs, active, onChange }: { tabs: FilterTab[]; active: T; onChange: (value: T) => void }) {
  return (
    <div className={`flex items-center gap-1 rounded-lg border p-0.5 ${theme.card}`}>
      {tabs.map((tab) => (
        <button key={tab.value} type="button" onClick={() => onChange(tab.value as T)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${active === tab.value ? theme.tabActive : `${theme.textSecondary} ${theme.link}`}`}>{tab.label}</button>
      ))}
    </div>
  );
}

/* •••••• Empty State •••••• */

interface EmptyStateProps { icon: ReactNode; title: string; description: string; action?: { label: string; onClick: () => void }; }

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center ${theme.card} ${theme.cardHover}`}>
      <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${theme.iconBoxSubtle}`}>{icon}</div>
      <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>{title}</h3>
      <p className={`mt-1 max-w-xs text-xs ${theme.textSecondary}`}>{description}</p>
      {action && <button type="button" onClick={action.onClick} className={`mt-4 rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${theme.buttonSecondary}`}>{action.label}</button>}
    </div>
  );
}

/* •••••• Status Badge •••••• */

export function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
      isActive ? theme.badgeActive : theme.badgeInactive
    }`}>{status}</span>
  );
}

/* •••••• OPERATIONAL: Resource Status Badge •••••• */

export function ResourceStatusBadge({ status }: { status: "Running" | "Idle" | "Down" | "Maintenance" }) {
  const styles: Record<string, string> = {
    Running: theme.badgeActive + " border-emerald-200 dark:border-emerald-500/20",
    Idle: theme.badgeInactive,
    Down: theme.badgeCritical,
    Maintenance: theme.badgeWarning,
  };
  const dot: Record<string, string> = {
    Running: "bg-emerald-500",
    Idle: "bg-slate-400",
    Down: "bg-red-500",
    Maintenance: "bg-amber-500",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[status] ?? styles.Idle}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot[status] ?? dot.Idle}`} />
      {status}
    </span>
  );
}

/* •••••• OPERATIONAL: Load Bar •••••• */

export function LoadBar({ pct, size = "sm" }: { pct: number; size?: "sm" | "md" }) {
  const overload = pct > 100;
  const height = size === "md" ? "h-2" : "h-1.5";
  const color = overload ? "bg-red-500" : pct > 85 ? "bg-amber-500" : "bg-emerald-500";
  const clamped = Math.min(pct, 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-16 ${height} overflow-hidden rounded-full ${theme.loadTrack}`}>
        <div className={`${height} rounded-full ${color} transition-all`} style={{ width: `${clamped}%` }} />
      </div>
      <span className={`text-[10px] font-semibold ${overload ? theme.textCritical : theme.textSecondary}`}>
        {pct.toFixed(0)}%{overload && <span className={`ml-0.5 ${theme.textCritical}`}>!</span>}
      </span>
    </div>
  );
}

/* •••••• Primary Action (single visible action) •••••• */

export function PrimaryAction({ onClick }: { onClick?: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors active:scale-[0.97] ${theme.buttonSecondary}`}>Open •••</button>;
}

/* •••••• Secondary Actions Dropdown •••••• */

interface SecondaryAction { label: string; icon?: ReactNode; onClick?: () => void; }

export function ActionsDropdown({ actions }: { actions: SecondaryAction[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors active:scale-[0.97] ${theme.buttonSecondary}`}>•••••••••</button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className={`absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border py-1 shadow-lg ${theme.dropdown}`} onClick={(e) => e.stopPropagation()}>
            {actions.map((a, i) => (
              <button key={i} type="button" onClick={() => { a.onClick?.(); setOpen(false); }} className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors ${theme.textSecondary} ${theme.interactiveRow}`}>{a.icon}{a.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* •••••• Bulk Checkbox •••••• */

export function BulkCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className={`h-4 w-4 cursor-pointer rounded ${theme.checkbox} ${theme.focusRing}`} onClick={(e) => e.stopPropagation()} />;
}

/* •••••• Data Management Sub-Header Navigation •••••• */

const dmNavItems = [
  { label: "Structure",  path: "/system/data-management/structure" },
  { label: "Groups",     path: "/system/data-management/resource-groups" },
  { label: "Resources",  path: "/system/data-management/resources" },
  { label: "Tables",     path: "/system/data-management/references" },
];

export function DataManagementNav({ currentPath }: { currentPath?: string }) {
  const navigate = useNavigate();
  return (
    <nav
      className={`flex shrink-0 items-center gap-1 border-b ${theme.subHeader} px-5 h-10`}
      aria-label="Data Management sections"
    >
      {dmNavItems.map((item) => {
        const isActive = currentPath === item.path ||
          (currentPath && currentPath.startsWith(item.path));
        return (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? theme.navActive
                : `${theme.textSecondary} ${theme.link}`
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

/* •••••• Alert Banner •••••• */

export function AlertBanner({ message, cta, ctaOnClick }: { message: string; cta?: string; ctaOnClick?: () => void }) {
  if (!message) return null;
  return (
    <div className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${theme.errorBanner}`}>
      <AlertTriangle className="h-4 w-4 shrink-0 stroke-current" />
      <span className="flex-1">{message}</span>
      {cta && ctaOnClick && <button type="button" onClick={ctaOnClick} className={`ml-auto rounded-md border px-2 py-1 text-[10px] font-medium transition-colors active:scale-[0.97] ${theme.buttonDanger}`}>{cta} •••</button>}
    </div>
  );
}

/* •••••• Info Banner •••••• */

export function InfoBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${theme.infoBanner}`}>
      <Info className="h-4 w-4 shrink-0 stroke-current" />
      <span>{message}</span>
    </div>
  );
}

/* •••••• Smart Control Tower Link •••••• */

export function SmartControlTowerLink({ plant, line, department, resource }: { plant?: string; line?: string; department?: string; resource?: string }) {
  const navigate = useNavigate();
  const params = new URLSearchParams();
  if (plant) params.set("plant", plant);
  if (line) params.set("line", line);
  if (department) params.set("department", department);
  if (resource) params.set("resource", resource);
  return (
    <button type="button" onClick={() => navigate(`/control-tower?${params.toString()}`)} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors active:scale-[0.97] ${theme.badgeActive}`}>
      <ExternalLink className="h-3 w-3 stroke-current" />
      CT
    </button>
  );
}

/* •••••• CRUD Modal •••••• */

interface CrudModalField {
  key: string;
  label: string;
  type?: "text" | "select" | "textarea";
  options?: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
}

export function CrudModal({ open, onClose, title, fields, values, onChange, onSave, onDelete }: {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: CrudModalField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSave: () => void;
  onDelete?: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div className={`fixed inset-0 z-30 ${theme.overlay}`} onClick={onClose} />
      <div className={`fixed left-1/2 top-1/2 z-40 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border shadow-xl ${theme.modal}`}>
        <div className={`flex items-center justify-between border-b px-4 py-3 ${theme.subHeader}`}>
          <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>{title}</h3>
          <button type="button" onClick={onClose} className={`${theme.textMuted} ${theme.link} text-xs font-medium`}>•••</button>
        </div>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); onSave(); }} className="p-4 space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className={`mb-1 block text-xs font-medium ${theme.textSecondary}`}>{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</label>
              {f.type === "select" && f.options ? (
                <select value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-xs ${theme.input} ${theme.focusRing}`}>
                  <option value="">Select...</option>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <textarea value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} placeholder={f.placeholder} className={`min-h-[60px] w-full rounded-lg border px-3 py-2 text-xs ${theme.input} ${theme.focusRing}`} />
              ) : (
                <input type="text" value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} placeholder={f.placeholder} className={`w-full rounded-lg border px-3 py-2 text-xs ${theme.input} ${theme.focusRing}`} />
              )}
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            <div>
              {onDelete && (
                <button type="button" onClick={onDelete} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${theme.buttonDanger}`}>Delete</button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${theme.buttonSecondary}`}>Cancel</button>
              <button type="submit" className={`rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-colors ${theme.buttonPrimary}`}>Save</button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

/* •••••• Confirm Dialog •••••• */

export function ConfirmDialog({ open, onClose, title, message, onConfirm, confirmLabel = "Delete", danger = true }: {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <>
      <div className={`fixed inset-0 z-30 ${theme.overlay}`} onClick={onClose} />
      <div className={`fixed left-1/2 top-1/2 z-40 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border shadow-xl p-4 ${theme.modal}`}>
        <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>{title}</h3>
        <p className={`mt-2 text-xs ${theme.textSecondary}`}>{message}</p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${theme.buttonSecondary}`}>Cancel</button>
          <button type="button" onClick={() => { onConfirm(); onClose(); }} className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors ${danger ? theme.buttonDangerSolid : theme.buttonPrimary}`}>{confirmLabel}</button>
        </div>
      </div>
    </>
  );
}

/* •••••• Global Search •••••• */

interface GlobalSearchResult { type: "Plant" | "Department" | "Group" | "Resource" | "Table"; label: string; subtitle: string; to: string; }

export function GlobalSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const allResults: GlobalSearchResult[] = [
    { type: "Plant", label: "Main Plant", subtitle: "Building A · 3 lines · 72% load", to: "/system/data-management/plant/P001" },
    { type: "Plant", label: "Secondary Plant", subtitle: "Building B · 2 lines · 45% load", to: "/system/data-management/plant/P002" },
    { type: "Plant", label: "Warehouse Plant", subtitle: "Warehouse 1 · 1 line (inactive)", to: "/system/data-management/plant/P003" },
    { type: "Department", label: "Assembly", subtitle: "Main Plant · 14 resources · 78% util", to: "/system/data-management/departments/D001" },
    { type: "Department", label: "Machining", subtitle: "Main Plant · 10 resources · 92% util", to: "/system/data-management/departments/D002" },
    { type: "Department", label: "Quality Control", subtitle: "Main Plant · 8 resources · 55% util", to: "/system/data-management/departments/D003" },
    { type: "Group", label: "Line Operators", subtitle: "Assembly · 28 members · 12 resources", to: "/system/data-management/resource-groups/RG001" },
    { type: "Group", label: "Setup Technicians", subtitle: "Machining · 12 members · 6 resources", to: "/system/data-management/resource-groups/RG002" },
    { type: "Group", label: "Quality Inspectors", subtitle: "QC · 8 members · 5 resources", to: "/system/data-management/resource-groups/RG003" },
    { type: "Resource", label: "Welding Station 2", subtitle: "Workstation · WS-002 · Running", to: "/system/data-management/resources/RES-WELD-02" },
    { type: "Resource", label: "CNC Mill 1", subtitle: "Machine · CNC-MILL-01 · Running", to: "/system/data-management/resources/RES-CNC-01" },
    { type: "Resource", label: "QC Gate 1", subtitle: "Inspection Station · QC-GATE-01 · Idle", to: "/system/data-management/resources/RES-QC-01" },
    { type: "Resource", label: "Forklift 3", subtitle: "Material Handling · FORKLIFT-03 · Running", to: "/system/data-management/resources/RES-FORK-03" },
    { type: "Resource", label: "CNC Lathe 1", subtitle: "Machine · CNC-LATHE-01 · Down", to: "/system/data-management/resources/RES-LATHE-01" },
    { type: "Table", label: "Shift Patterns", subtitle: "3 entries", to: "/system/data-management/references/T001" },
    { type: "Table", label: "Machine Types", subtitle: "12 entries", to: "/system/data-management/references/T002" },
    { type: "Table", label: "Material Categories", subtitle: "24 entries", to: "/system/data-management/references/T003" },
    { type: "Table", label: "Work Centers", subtitle: "15 entries", to: "/system/data-management/references/T004" },
    { type: "Table", label: "Operation Codes", subtitle: "42 entries", to: "/system/data-management/references/T005" },
    { type: "Table", label: "Holiday Calendar", subtitle: "14 entries", to: "/system/data-management/references/T006" },
  ];
  const results = query.trim() ? allResults.filter((r) => r.label.toLowerCase().includes(query.toLowerCase()) || r.subtitle.toLowerCase().includes(query.toLowerCase())) : [];
  if (!open) return null;
  return (
    <>
      <div className={`fixed inset-0 z-30 ${theme.overlay}`} onClick={onClose} />
      <div className={`fixed left-1/2 top-24 z-40 w-full max-w-lg -translate-x-1/2 rounded-xl border shadow-xl ${theme.modal}`}>
        <div className={`flex items-center gap-3 border-b px-4 py-3 ${theme.subHeader}`}>
          <Search className={`h-4 w-4 ${theme.iconSubtle} stroke-current`} />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search plants, groups, resources, tables..." className={`flex-1 bg-transparent text-sm ${theme.textPrimary} ${theme.focusRing}`} autoFocus />
          {query && <button type="button" onClick={() => setQuery("")} className={`${theme.iconSubtle} ${theme.link}`}><X className="h-4 w-4 stroke-current" /></button>}
          <button type="button" onClick={onClose} className={`text-xs font-medium ${theme.textMuted} ${theme.link}`}>ESC</button>
        </div>
        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto p-2">
            {results.map((r, i) => (
              <button key={i} type="button" onClick={() => { navigate(r.to); onClose(); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${theme.interactiveRow}`}>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${r.type === "Plant" ? theme.typePlant : r.type === "Department" ? theme.typeDepartment : r.type === "Group" ? theme.typeGroup : r.type === "Resource" ? theme.typeResource : theme.typeTable}`}>{r.type}</span>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium ${theme.textPrimary}`}>{r.label}</div>
                  <div className={`text-xs ${theme.textMuted}`}>{r.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {query && results.length === 0 && <div className={`px-4 py-8 text-center text-sm ${theme.textMuted}`}>No results found for &ldquo;{query}&rdquo;</div>}
        {!query && <div className={`px-4 py-8 text-center text-sm ${theme.textMuted}`}>Start typing to search across plants, departments, resource groups, resources, and reference tables.</div>}
      </div>
    </>
  );
}
