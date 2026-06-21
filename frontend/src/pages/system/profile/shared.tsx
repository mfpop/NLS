import type { ReactNode } from "react";
import { FileText, Plus } from "lucide-react";
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
  if (field === "role" && !draft.role.trim()) return "Role is required.";
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
  if (!draft.role.trim()) errors.role = "Role is required.";
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
      <button
        type="button"
        onClick={onAction}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-success px-3.5 py-2 text-xs font-semibold text-success-foreground transition hover:bg-success/90 active:scale-[0.97]"
      >
        <Plus className="h-3.5 w-3.5" />
        {action}
      </button>
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
      <div className={`mb-1 text-[10px] font-semibold uppercase tracking-widest ${theme.textMuted}`}>
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

/* ── CSS Classes ────────────────────────────────────────────────── */

export const inputClass =
  `w-full border-0 border-b border-border/70 bg-transparent px-0 py-1.5 text-sm ${theme.textPrimary} transition placeholder:text-muted-foreground hover:border-border focus:border-success focus:outline-none focus:ring-0`;

export const inputErrorClass =
  `w-full border-0 border-b border-danger bg-transparent px-0 py-1.5 text-sm ${theme.textPrimary} transition placeholder:text-muted-foreground hover:border-danger focus:border-danger focus:outline-none focus:ring-0`;

export const editIconButtonClass =
  `inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card ${theme.textMuted} transition-all hover:bg-success/10 hover:text-success focus:outline-none focus:ring-2 focus:ring-success/30`;

export const saveIconButtonClass =
  `inline-flex h-7 w-7 items-center justify-center rounded-md border border-success/20 bg-success/10 text-success transition-all hover:bg-success/20`;

export const dangerIconButtonClass =
  `inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card ${theme.textMuted} transition-all hover:border-danger/30 hover:bg-danger/10 hover:text-danger`;
