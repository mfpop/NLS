import type { ReactNode } from "react";
import { FileText, Plus } from "lucide-react";
import { ToolbarButton } from "@/components/layout/PageToolbar";
import { theme } from "@/styles/themeTokens";
import type { Profile, WorkHistoryEntry, EducationEntry } from "@/types/profile";

/* ── Types ──────────────────────────────────────────────────────── */

export type ProfileDraft = {
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  plant: string;
  department: string;
  reportsTo: string;
  language: string;
  about: string;
};

export const emptyDraft: ProfileDraft = {
  firstName: "",
  lastName: "",
  role: "",
  email: "",
  phone: "",
  location: "",
  plant: "",
  department: "",
  reportsTo: "",
  language: "",
  about: "",
};

export function draftFromProfile(profile: Profile | null): ProfileDraft {
  if (!profile) return emptyDraft;
  const parts = (profile.name ?? "").trim().split(/\s+/);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ") || "",
    role: profile.role ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    location: profile.location ?? "",
    plant: profile.plant ?? "",
    department: profile.department ?? "",
    reportsTo: profile.reportsTo ?? "",
    language: profile.language ?? "",
    about: profile.about ?? "",
  };
}

/* ── Utility functions ──────────────────────────────────────────── */

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "LP";
}

export function formatMemberSince(value: string): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function formatLastUpdated(value: string): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function extractPeriodYear(period?: string): number | null {
  if (!period) return null;
  const match = period.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

export function validateField(field: string, draft: ProfileDraft): string | undefined {
  if (field === "firstName" && !draft.firstName.trim()) return "First name is required.";
  if (field === "lastName" && !draft.lastName.trim()) return "Last name is required.";
  if (field === "role" && !draft.role.trim()) return "Position is required.";
  if (field === "email") {
    if (!draft.email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(draft.email.trim())) return "Enter a valid email address.";
  }
  if (field === "phone" && draft.phone.trim() && !/^\+1\s\(\d{3}\)\s\d{3}-\d{4}$/.test(draft.phone.trim())) {
    return "Use format +1 (555) 123-4567";
  }
  if (field === "department" && !draft.department.trim()) return "Department is required.";
  return undefined;
}

export function removeFieldError(errors: Record<string, string>, field: string): Record<string, string> {
  const nextErrors = { ...errors };
  delete nextErrors[field];
  return nextErrors;
}

export function validateProfile(
  draft: ProfileDraft,
  workHistory: WorkHistoryEntry[],
  education: EducationEntry[],
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!draft.firstName.trim()) errors.firstName = "First name is required.";
  if (!draft.lastName.trim()) errors.lastName = "Last name is required.";
  if (!draft.role.trim()) errors.role = "Position is required.";
  if (!draft.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(draft.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (draft.phone.trim() && !/^\+1\s\(\d{3}\)\s\d{3}-\d{4}$/.test(draft.phone.trim())) {
    errors.phone = "Use format +1 (555) 123-4567";
  }
  if (draft.about.length > 500) errors.about = "Summary must be 500 characters or fewer.";

  workHistory.forEach((item, index) => {
    const hasAnyValue = Boolean(item.role.trim() || item.company.trim() || item.period.trim() || item.description.trim());
    if (!hasAnyValue) return;
    if (!item.role.trim()) errors[`work-${index}-role`] = "Role is required for each work entry.";
    if (!item.company.trim()) errors[`work-${index}-company`] = "Company is required for each work entry.";
  });

  education.forEach((item, index) => {
    const hasAnyValue = Boolean(item.degree.trim() || item.school.trim() || item.period.trim());
    if (!hasAnyValue) return;
    if (!item.degree.trim()) errors[`edu-${index}-degree`] = "Degree is required for each education entry.";
    if (!item.school.trim()) errors[`edu-${index}-school`] = "School is required for each education entry.";
  });

  return errors;
}

/* ── UI Components ──────────────────────────────────────────────── */

/* ── Profile Section Header ───────────────────────────────────── */

export function ProfileSectionHeader({
  icon: Icon,
  iconColor,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="flex items-start gap-3 border-b border-slate-200 px-4 py-3">
      <div className="w-5 shrink-0 flex justify-center pt-0.5">
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <h2 className="text-sm font-semibold leading-5 text-left">{title}</h2>
        <p className="text-xs leading-4 text-slate-500 text-left">{subtitle}</p>
      </div>
    </header>
  );
}

export function EmptyBlock({
  icon: Icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: typeof FileText;
  title: string;
  description?: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${theme.entityIconBg} mb-3`}>
        <Icon className={`h-5 w-5 ${theme.icon}`} />
      </div>
      <p className={`text-sm font-medium ${theme.textPrimary}`}>{title}</p>
      {description && <p className={`mt-1 text-xs ${theme.textMuted}`}>{description}</p>}
      <ToolbarButton icon={Plus} label={action} onClick={onAction} variant="success" />
    </div>
  );
}

export function FieldShell({
  label,
  error,
  className,
  required,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={className || "block"}>
      <div className={`mb-1 text-[11px] font-medium uppercase tracking-wide ${theme.textMuted}`}>
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </div>
      {children}
      {error ? <div className={`mt-1 text-xs ${theme.textCritical}`}>{error}</div> : null}
    </label>
  );
}

export function ReadOnlyField({ children }: { children: ReactNode }) {
  return <span className={`text-sm ${theme.textPrimary}`}>{children}</span>;
}

export function MissingValue({ label = "Not provided" }: { label?: string }) {
  return <span className={`text-sm ${theme.textMuted} italic`}>{label}</span>;
}

/* ── Read-Only Access Rows ──────────────────────────────────────── */

export function ProfileReadOnlyAccessRows({
  roles,
  accessLevel,
  status,
  loading,
  canEditAccess,
}: {
  roles: { id: string; roleName: string; roleCode: string; accessLevel: string; isActive: boolean }[];
  accessLevel: string;
  status: string;
  loading: boolean;
  canEditAccess: boolean;
}) {
  const activeRoles = roles.filter((r) => r.isActive);

  if (loading) {
    return (
      <div className="space-y-3 px-4 py-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 w-24 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-3">
      {/* Roles */}
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1">Roles</div>
        {activeRoles.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {activeRoles.map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 shadow-sm"
              >
                {r.roleName}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm text-slate-400 italic">No roles assigned</span>
        )}
      </div>

      {/* Access Level */}
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1">Access Level</div>
        {accessLevel ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />
            {accessLevel}
          </span>
        ) : (
          <span className="text-sm text-slate-400 italic">—</span>
        )}
      </div>

      {/* Status */}
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1">Status</div>
        {status ? (
          <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${status === "Active" ? "text-emerald-700" : "text-slate-400"}`}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${status === "Active" ? "bg-emerald-500" : "bg-slate-300"}`} />
            {status}
          </span>
        ) : (
          <span className="text-sm text-slate-400 italic">—</span>
        )}
      </div>

      {/* Read-only helper text */}
      <p className="text-[10px] text-slate-400 italic pt-1 leading-relaxed">
        {canEditAccess
          ? "Role assignments and access levels can be changed in System &gt; Users &amp; Access."
          : "Requires admin rights to view or modify detailed permissions."}
      </p>
    </div>
  );
}

/* ── CSS Classes ────────────────────────────────────────────────── */

export const inputClass =
  `w-full border-0 border-b border-slate-200 bg-transparent px-0 py-1.5 text-sm ${theme.textPrimary} transition placeholder:text-muted-foreground hover:border-border-major focus:border-success focus:outline-none focus:ring-0`;

export const inputErrorClass =
  `w-full border-0 border-b border-danger bg-transparent px-0 py-1.5 text-sm ${theme.textPrimary} transition placeholder:text-muted-foreground hover:border-danger focus:border-danger focus:outline-none focus:ring-0`;

