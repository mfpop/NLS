import { useState, type ReactNode, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ExternalLink, MoreHorizontal, Search, X, AlertTriangle, Info } from "lucide-react";
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

/* •••••• Bulk Checkbox •••••• */

export function BulkCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className={`h-4 w-4 cursor-pointer rounded ${theme.checkbox} ${theme.focusRing}`} onClick={(e) => e.stopPropagation()} />;
}

/* •••••• Production Structure Sub-Header Navigation •••••• */

const dmNavItems = [
  { label: "Plants",          path: "/system/production-structure/plant" },
  { label: "Lines",           path: "/system/production-structure/production-lines" },
  { label: "Departments",     path: "/system/production-structure/departments" },
  { label: "Resource Groups",          path: "/system/production-structure/resource-groups" },
  { label: "Resources",       path: "/system/production-structure/resources" },
  { label: "Structure",       path: "/system/production-structure/structure" },
  { label: "Tables",          path: "/system/reference-tables" },
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
      {cta && ctaOnClick && <button type="button" onClick={ctaOnClick} className={`ml-auto rounded-md border px-2 py-1 text-[10px] font-medium transition-colors active:scale-[0.97] ${theme.buttonDanger}`}>{cta}</button>}
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

/* •••••• Primary Action (single visible action) [Legacy] •••••• */

export function PrimaryAction({ onClick }: { onClick?: () => void }) {
  return <button type="button" onClick={onClick}
    className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition-all duration-150 ease-in-out active:scale-[0.97]">Details</button>;
}

/* •••••• Secondary Actions Dropdown [Legacy] •••••• */

interface SecondaryAction { label: string; icon?: ReactNode; onClick?: () => void; danger?: boolean; }

export function ActionsDropdown({ actions, buttonClass }: { actions: SecondaryAction[]; buttonClass?: string }) {
  const [open, setOpen] = useState(false);
  const renderedItems: ReactNode[] = [];
  actions.forEach((a, i) => {
    if (i > 0 && !a.danger && actions[i - 1].danger) {
      renderedItems.push(<div key={`sep-${i}`} className="my-1 border-t border-slate-100" />);
    }
    renderedItems.push(
      <button key={i} type="button"
        onClick={() => { a.onClick?.(); setOpen(false); }}
        className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm whitespace-nowrap rounded-md transition-all duration-150 ease-in-out ${
          a.danger ? "text-red-500 hover:bg-red-50" : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        {a.icon && <span className={`w-4 h-4 shrink-0 ${a.danger ? "text-red-400" : "text-slate-500"}`}>{a.icon}</span>}
        {a.label}
      </button>
    );
  });
  return (
    <div className="relative">
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={buttonClass ?? "w-9 h-9 rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 transition-all duration-150 ease-in-out inline-flex items-center justify-center"}>
        <MoreHorizontal className="w-4 h-4 stroke-current" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-[240px] bg-white border border-slate-200 rounded-xl shadow-lg p-1" onClick={(e) => e.stopPropagation()}>
            {renderedItems}
          </div>
        </>
      )}
    </div>
  );
}

/* •••••• CRUD Modal [Legacy] •••••• */

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
      <div className="fixed inset-0 z-30 bg-slate-950/40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-40 w-[480px] -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl border border-slate-100 p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-all duration-150 ease-in-out">
            <X className="h-4 w-4 stroke-current" />
          </button>
        </div>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); onSave(); }} className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-sm text-slate-500">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</label>
              {f.type === "select" && f.options ? (
                <div className="relative">
                  <select value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all duration-150 ease-in-out cursor-pointer">
                    <option value="">Select...</option>
                    {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : f.type === "textarea" ? (
                <textarea value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} placeholder={f.placeholder}
                  className="min-h-[60px] w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all duration-150 ease-in-out" />
              ) : (
                <input type="text" value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} placeholder={f.placeholder}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all duration-150 ease-in-out" />
              )}
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            <div>
              {onDelete && (
                <button type="button" onClick={onDelete} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-all duration-150 ease-in-out">Delete</button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all duration-150 ease-in-out">Cancel</button>
              <button type="submit" className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-all duration-150 ease-in-out shadow-sm">Save</button>
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
      <div className="fixed inset-0 z-30 bg-slate-950/40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-40 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl border border-slate-100 p-5 shadow-md">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-xs text-slate-500">{message}</p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all duration-150 ease-in-out">Cancel</button>
          <button type="button" onClick={() => { onConfirm(); onClose(); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-all duration-150 ease-in-out ${
              danger ? "bg-red-600 hover:bg-red-500" : "bg-emerald-500 hover:bg-emerald-600"
            }`}>{confirmLabel}</button>
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
  const allResults: GlobalSearchResult[] = [];
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
