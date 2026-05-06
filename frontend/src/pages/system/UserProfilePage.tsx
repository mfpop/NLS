import type { ReactNode } from "react";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { DEPARTMENTS_QUERY } from "@/graphql/manufacturingQueries";
import {
  User,
  Briefcase,
  BookOpen,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  Quote,
  FileText,
  Mail,
  Phone,
  MapPin,
  Globe,
  Clock3,
  ShieldCheck,
  AlertCircle,
  Save,
  Camera,
  Factory,
  Layers,
} from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";
import { theme } from "../../styles/themeTokens";
import { useProfile } from "@/hooks/useProfile";
import type { Profile, WorkHistoryEntry, EducationEntry } from "@/types/profile";
import { normalizeProfile } from "@/utils/profileNormalizer";

type ProfileDraft = {
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

const emptyDraft: ProfileDraft = {
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

function draftFromProfile(profile: Profile | null): ProfileDraft {
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

function cloneWork(items: WorkHistoryEntry[]): WorkHistoryEntry[] {
  return items.map((item) => ({ ...item }));
}

function cloneEducation(items: EducationEntry[]): EducationEntry[] {
  return items.map((item) => ({ ...item }));
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "LP";
}

function formatMemberSince(value: string): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatLastUpdated(value: string): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function profileCompletionScore(
  draft: ProfileDraft,
  workHistory: WorkHistoryEntry[],
  education: EducationEntry[],
): number {
  const checks = [
    draft.firstName.trim() && draft.lastName.trim(),
    draft.role.trim(),
    draft.email.trim(),
    draft.phone.trim(),
    draft.location.trim(),
    draft.language.trim(),
    draft.about.trim(),
    workHistory.some((item) => item.role.trim() && item.company.trim()),
    education.some((item) => item.degree.trim() && item.school.trim()),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function getProfileChecks(
  draft: ProfileDraft,
  workHistory: WorkHistoryEntry[],
  education: EducationEntry[],
) {
  return [
    { label: "Identity", done: Boolean(draft.firstName.trim() && draft.lastName.trim() && draft.role.trim()) },
    { label: "Contact", done: Boolean(draft.email.trim() && draft.phone.trim()) },
    { label: "Location", done: Boolean(draft.location.trim()) },
    { label: "Summary", done: Boolean(draft.about.trim()) },
    { label: "Experience", done: workHistory.some((item) => item.role.trim() && item.company.trim()) },
    { label: "Education", done: education.some((item) => item.degree.trim() && item.school.trim()) },
  ];
}

function validateProfile(
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

function validateField(field: string, draft: ProfileDraft, workDraft: WorkHistoryEntry[], eduDraft: EducationEntry[]): string | undefined {
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
  return undefined;
}

function EmptyBlock({
  icon: Icon,
  title,
  action,
  onAction,
}: {
  icon: typeof FileText;
  title: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <Icon className="mx-auto mb-2 h-5 w-5 text-slate-400" />
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <button type="button" onClick={onAction} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500">
        <Plus className="h-3.5 w-3.5" />
        {action}
      </button>
    </div>
  );
}

function FieldShell({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={className || "block"}>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      {children}
      {error ? <div className="mt-1 text-xs text-rose-500">{error}</div> : null}
    </label>
  );
}

const inputClass =
  "w-full border-0 border-b-2 border-slate-300 bg-transparent px-0 py-1.5 text-sm text-slate-900 transition placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-0 cursor-text dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-500";
const inputErrorClass =
  "w-full border-0 border-b-2 border-rose-400 bg-transparent px-0 py-1.5 text-sm text-slate-900 transition placeholder:text-slate-400 hover:border-rose-500 focus:border-rose-500 focus:outline-none focus:ring-0 cursor-text dark:border-rose-600 dark:text-slate-100";
const mutedValueClass = "text-sm font-medium text-slate-800 dark:text-slate-200";
const secondaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-all duration-150 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900";
const primaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-all duration-150 hover:bg-[#00A86B] hover:shadow-lg hover:shadow-emerald-500/25 active:bg-[#007A50] active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-60";

export function UserProfilePage() {
  const navigate = useNavigate();
  const { profile, loading, error, saving, saveProfile } = useProfile();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [draftInitialized, setDraftInitialized] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: plantsData } = useQuery<{ plants: { id: string; name: string }[] }>(PLANTS_QUERY, { fetchPolicy: "cache-and-network" });
  const { data: deptsData } = useQuery<{ departments: { id: string; name: string }[] }>(DEPARTMENTS_QUERY, { fetchPolicy: "cache-and-network" });
  const plants = plantsData?.plants ?? [];
  const departments = deptsData?.departments ?? [];
  const [workDraft, setWorkDraft] = useState<WorkHistoryEntry[]>([]);
  const [eduDraft, setEduDraft] = useState<EducationEntry[]>([]);

  useEffect(() => {
    setDraft(draftFromProfile(profile));
    setWorkDraft(cloneWork(profile?.workHistory ?? []));
    setEduDraft(cloneEducation(profile?.education ?? []));
    setDraftInitialized(true);
  }, [profile]);

  const completion = profileCompletionScore(draft, workDraft, eduDraft);
  const checks = getProfileChecks(draft, workDraft, eduDraft);
  const dirty = draftInitialized && (
    JSON.stringify(draft) !== JSON.stringify(draftFromProfile(profile)) ||
    JSON.stringify(workDraft) !== JSON.stringify(profile?.workHistory ?? []) ||
    JSON.stringify(eduDraft) !== JSON.stringify(profile?.education ?? [])
  );

  const startEditing = (section: string) => {
    setEditingSection(section);
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target?.result as string);
      setAvatarError(false);
    };
    reader.readAsDataURL(file);
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setSaveError(null);
    setSaveSuccess(null);
    setFieldErrors({});
    setDraft(draftFromProfile(profile));
    setWorkDraft(cloneWork(profile?.workHistory ?? []));
    setEduDraft(cloneEducation(profile?.education ?? []));
  };

  useEffect(() => {
    if (saveError || saveSuccess) {
      const timer = setTimeout(() => {
        setSaveError(null);
        setSaveSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveError, saveSuccess]);

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(null);
    console.debug("[Profile Save] Starting save with payload:", {
      name: [draft.firstName.trim(), draft.lastName.trim()].filter(Boolean).join(" "),
      role: draft.role.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim() || undefined,
      location: draft.location.trim() || undefined,
      plant: draft.plant || undefined,
      department: draft.department || undefined,
      reportsTo: draft.reportsTo.trim() || undefined,
      language: draft.language.trim() || undefined,
      workHistoryCount: workDraft.filter((w) => w.role || w.company).length,
      educationCount: eduDraft.filter((e) => e.degree || e.school).length,
    });

    const nextErrors = validateProfile(draft, workDraft, eduDraft);
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setSaveError("Review the highlighted fields before saving.");
      return;
    }

    setFieldErrors({});
    const result = await saveProfile({
      name: [draft.firstName.trim(), draft.lastName.trim()].filter(Boolean).join(" "),
      role: draft.role.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim() || undefined,
      location: draft.location.trim() || undefined,
      plant: draft.plant || undefined,
      department: draft.department || undefined,
      reportsTo: draft.reportsTo.trim() || undefined,
      language: draft.language.trim() || undefined,
      about: draft.about.trim() || undefined,
      workHistory: workDraft
        .filter((item) => item.role.trim() || item.company.trim() || item.period.trim() || item.description.trim())
        .map((item) => ({
          id: item.id,
          role: item.role.trim(),
          company: item.company.trim(),
          period: item.period.trim(),
          description: item.description.trim(),
        })),
      education: eduDraft
        .filter((item) => item.degree.trim() || item.school.trim() || item.period.trim())
        .map((item) => ({
          id: item.id,
          degree: item.degree.trim(),
          school: item.school.trim(),
          period: item.period.trim(),
        })),
    });

    if (result.ok) {
      console.debug("[Profile Save] Success");
      setEditingSection(null);
      setSaveSuccess("Profile saved successfully.");
      return;
    }

    console.debug("[Profile Save] Validation errors:", result.errors);
    setFieldErrors(result.errors ?? {});
    setSaveError(Object.values(result.errors ?? {}).join(" ") || "Failed to save profile.");
  };

  if (loading) {
    return (
      <div className={`flex h-full items-center justify-center ${theme.page}`}>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
          Loading profile...
        </div>
      </div>
    );
  }

  if (error && !profile) {
    console.error("Profile query error:", error.message, error.graphQLErrors, error.networkError);
    return (
      <div className={`flex h-full flex-col ${theme.page}`}>
        <ModulePage title="Profile" description="Manage your personal information and account settings." icon={<User className="h-5 w-5" />} />
        <div className="p-4 space-y-3">
          <div className="mx-auto max-w-3xl rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            We couldn&apos;t load the profile right now.
          </div>
          <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-mono text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
            {error.message}
            {error.graphQLErrors?.map((e, i) => (
              <div key={i} className="mt-1 text-rose-500">{e.message}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const fullName = [draft.firstName, draft.lastName].filter(Boolean).join(" ") || profile?.name || "";
  const avatarInitials = initials(fullName);
  const normalized = normalizeProfile({
    name: fullName,
    role: draft.role,
    summary: draft.about,
    experience: workDraft.map(w => ({
      role: w.role,
      company: w.company,
      startDate: w.period?.split(" - ")[0] || "",
      endDate: w.period?.split(" - ")[1] || "",
      bullets: w.description ? w.description.split(/[.!\n]+/).filter(Boolean).map(s => s.trim()) : [],
    })),
    education: eduDraft,
  });
  const highlights = normalized.highlights;
  const score = normalized.score;

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`}>
      {/* HEADER: Identity + Action */}
      <header className={`relative flex items-center gap-4 border-b shadow-sm h-16 shrink-0 px-5 ${theme.header}`}>
        <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarClick}>
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt={fullName || "Avatar"}
              className="h-10 w-10 rounded-full bg-slate-200 object-cover"
            />
          ) : avatarError ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-sm font-bold text-white shadow-sm">
              {avatarInitials}
            </div>
          ) : (
            <img
              src={`https://i.pravatar.cc/150?u=${encodeURIComponent(draft.email || fullName || "user")}`}
              alt={fullName || "Avatar"}
              className="h-10 w-10 rounded-full bg-slate-200 object-cover"
              onError={() => setAvatarError(true)}
            />
          )}
          <div className="absolute inset-0 hidden group-hover:flex items-center justify-center rounded-full bg-black/30">
            <Camera className="h-4 w-4 text-white" />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">{fullName || "Complete your profile"}</div>
            {editingSection && <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">Editing</span>}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400 truncate leading-tight">{draft.role || "Add your role and details"}</div>
        </div>
        <button type="button" onClick={() => navigate("/control-tower")} className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-slate-300 hover:text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500 dark:hover:border-slate-600 dark:hover:text-slate-300" aria-label="Close profile">
          <X className="h-4 w-4" />
        </button>

        {(saveError || saveSuccess) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`flex items-center gap-2 rounded-xl px-4 py-1.5 text-sm font-medium shadow-lg ${
              saveError
                ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/60"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/60"
            }`}>
              {saveError ? <AlertCircle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              {saveError || saveSuccess}
            </div>
          </div>
        )}
      </header>


      {/* TOOLBAR: Highlights + Score */}
      <div className="shrink-0 border-b border-slate-100 bg-white px-5 py-1.5 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-1.5">
          {highlights.map((h, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {h}
            </span>
          ))}
          {highlights.length > 0 && <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />}
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {score.value}/100
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {score.label}
          </span>
        </div>
      </div>

      <div className={`flex-1 overflow-hidden transition-colors ${editingSection ? "bg-slate-50/50 dark:bg-slate-900/50" : ""}`}>
        <div className="flex flex-col h-full">

          <div className="grid xl:grid-cols-[2fr_1.75fr_1.25fr] flex-1 min-h-0">
            {/* Column 1 — Personal Information + Professional Summary */}
            <div className="flex flex-col min-h-0 overflow-hidden">
              <section className="flex flex-col flex-1 overflow-auto border border-slate-200/40 bg-[#F8F9FA] p-4 shadow-sm dark:border-slate-700/40 dark:bg-slate-900">
                <div className="mb-3 flex items-start justify-between shrink-0">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Personal information</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Core identity and contact details used across the workspace.</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {editingSection === "profile" ? (
                      <>
                        <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-600 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                          {saving ? <Save className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button type="button" onClick={cancelEditing} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition hover:border-rose-200 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-rose-800 dark:hover:text-rose-400">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => startEditing("profile")} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition hover:border-emerald-200 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-800 dark:hover:text-emerald-400">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <FieldShell label="First name" error={fieldErrors.firstName}>
                    {editingSection === "profile" ? (
                        <input value={draft.firstName} onChange={(e) => setDraft((prev) => ({ ...prev, firstName: e.target.value }))} className={fieldErrors.firstName ? inputErrorClass : inputClass} placeholder="First name" />
                      ) : (
                        <div className={mutedValueClass}>{draft.firstName || ""}</div>
                      )}
                    </FieldShell>

                    <FieldShell label="Last name" error={fieldErrors.lastName}>
                      {editingSection === "profile" ? (
                        <input value={draft.lastName} onChange={(e) => setDraft((prev) => ({ ...prev, lastName: e.target.value }))} className={fieldErrors.lastName ? inputErrorClass : inputClass} placeholder="Last name" />
                      ) : (
                        <div className={mutedValueClass}>{draft.lastName || ""}</div>
                      )}
                    </FieldShell>

                    <FieldShell label="Email" error={fieldErrors.email}>
                      {editingSection === "profile" ? (
                      <div className="flex items-start gap-2">
                        <Mail className="mt-2.5 h-4 w-4 shrink-0 text-slate-400" />
                        <input value={draft.email} onChange={(e) => {
                          setDraft((prev) => ({ ...prev, email: e.target.value }));
                          setFieldErrors((prev) => {
                            const err = validateField("email", { ...draft, email: e.target.value }, workDraft, eduDraft);
                            return err ? { ...prev, email: err } : { ...prev, email: undefined };
                          });
                        }} className={`${fieldErrors.email ? inputErrorClass : inputClass}`} placeholder="name@company.com" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <Mail className="h-4 w-4 text-slate-400" />
                        {draft.email || ""}
                      </div>
                    )}
                  </FieldShell>

                  <FieldShell label="Phone" error={fieldErrors.phone}>
                    {editingSection === "profile" ? (
                      <div className="flex items-start gap-2">
                        <Phone className="mt-2.5 h-4 w-4 shrink-0 text-slate-400" />
                        <input value={draft.phone} onChange={(e) => {
                          const raw = e.target.value.replace(/[^\d]/g, "").slice(0, 11);
                          let formatted = "";
                          if (raw.length > 0) formatted = "+1";
                          if (raw.length > 1) formatted += " (" + raw.slice(1, Math.min(4, raw.length));
                          if (raw.length > 1) formatted += raw.length > 4 ? ") " + raw.slice(4, Math.min(7, raw.length)) : "";
                          if (raw.length > 7) formatted += "-" + raw.slice(7, 11);
                          setDraft((prev) => ({ ...prev, phone: formatted }));
                          if (formatted && !/^\+1\s\(\d{3}\)\s\d{3}-\d{4}$/.test(formatted)) {
                            setFieldErrors((prev) => ({ ...prev, phone: "Use format +1 (555) 123-4567" }));
                          } else {
                            setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                          }
                        }} className={`${fieldErrors.phone ? inputErrorClass : inputClass}`} placeholder="+1 (555) 123-4567" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <Phone className="h-4 w-4 text-slate-400" />
                        {draft.phone || ""}
                      </div>
                    )}
                  </FieldShell>

                  <FieldShell label="Full address" className="md:col-span-2">
                    {editingSection === "profile" ? (
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-2.5 h-4 w-4 shrink-0 text-slate-400" />
                        <input value={draft.location} onChange={(e) => setDraft((prev) => ({ ...prev, location: e.target.value }))} className={inputClass} placeholder="123 Main St, Detroit, MI 48201" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {draft.location || ""}
                      </div>
                    )}
                  </FieldShell>

                  <FieldShell label="Role" error={fieldErrors.role}>
                    {editingSection === "profile" ? (
                        <input value={draft.role} onChange={(e) => setDraft((prev) => ({ ...prev, role: e.target.value }))} className={inputClass} placeholder="Role or title" />
                      ) : (
                        <div className={mutedValueClass}>{draft.role || ""}</div>
                      )}
                  </FieldShell>

                  <FieldShell label="Reports to">
                    {editingSection === "profile" ? (
                      <div className="flex items-start gap-2">
                        <User className="mt-2.5 h-4 w-4 shrink-0 text-slate-400" />
                        <input value={draft.reportsTo} onChange={(e) => setDraft((prev) => ({ ...prev, reportsTo: e.target.value }))} className={inputClass} placeholder="VP of Operations" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <User className="h-4 w-4 text-slate-400" />
                        {draft.reportsTo || ""}
                      </div>
                    )}
                  </FieldShell>

                  <FieldShell label="Plant">
                    {editingSection === "profile" ? (
                        <select value={draft.plant} onChange={(e) => setDraft((prev) => ({ ...prev, plant: e.target.value }))} className={inputClass}>
                          <option value="">Select plant...</option>
                          {plants.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <Factory className="h-4 w-4 text-slate-400" />
                        {draft.plant || ""}
                        </div>
                      )}
                  </FieldShell>

                  <FieldShell label="Department">
                    {editingSection === "profile" ? (
                        <select value={draft.department} onChange={(e) => setDraft((prev) => ({ ...prev, department: e.target.value }))} className={inputClass}>
                          <option value="">Select department...</option>
                          {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <Layers className="h-4 w-4 text-slate-400" />
                        {draft.department || ""}
                        </div>
                      )}
                  </FieldShell>

                  <FieldShell label="Languages" className="md:col-span-2">
                    {editingSection === "profile" ? (
                      <div className="flex items-start gap-2">
                        <Globe className="mt-2.5 h-4 w-4 shrink-0 text-slate-400" />
                        <input value={draft.language} onChange={(e) => setDraft((prev) => ({ ...prev, language: e.target.value }))} className={inputClass} placeholder="English, Romanian" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <Globe className="h-4 w-4 text-slate-400" />
                        {draft.language || ""}
                      </div>
                    )}
                  </FieldShell>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">About</div>
                  {editingSection === "profile" ? (
                    <textarea
                      value={draft.about}
                      onChange={(e) => setDraft((prev) => ({ ...prev, about: e.target.value }))}
                      className="w-full flex-1 resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="Summarize your leadership scope, manufacturing experience, and outcomes."
                      maxLength={500}
                    />
                  ) : draft.about ? (
                      <div className="flex-1">
                        <ul className="space-y-2">
                        {normalized.summary.map((b, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm leading-5 text-slate-700 dark:text-slate-300">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500" />
                            {b}
                          </li>
                        ))}
                      </ul>
                      </div>
                    ) : (
                      <EmptyBlock icon={FileText} title="No summary added yet." action="Add Summary" onAction={() => startEditing("profile")} />
                    )}
                  {fieldErrors.about && <div className="mt-1 text-xs text-rose-500">{fieldErrors.about}</div>}
                </div>
              </section>
            </div>
            {/* Column 2 — Work History */}
            <div className="flex flex-col min-h-0 overflow-hidden">
              <section className="flex-1 overflow-auto border border-slate-200/40 bg-white p-4 shadow-sm dark:border-slate-700/40 dark:bg-slate-950">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Work history</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Capture roles, companies, and measurable impact.</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {editingSection === "work" ? (
                      <>
                        <button type="button" onClick={() => setWorkDraft((prev) => [{ id: `w${Date.now()}`, role: "", company: "", period: "", description: "" }, ...prev])} className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-600 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-600 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                          {saving ? <Save className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button type="button" onClick={cancelEditing} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition hover:border-rose-200 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-rose-800 dark:hover:text-rose-400">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => startEditing("work")} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition hover:border-emerald-200 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-800 dark:hover:text-emerald-400">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {workDraft.length > 0 ? (
                  <div className="space-y-3">
                    {[...workDraft].sort((a, b) => {
                      const yearA = parseInt(a.period?.match(/\b(19|20)\d{2}\b/)?.[0]);
                      const yearB = parseInt(b.period?.match(/\b(19|20)\d{2}\b/)?.[0]);
                      if (!yearA) return -1;
                      if (!yearB) return 1;
                      return yearB - yearA;
                    }).map((job, index) => (
                      <div key={job.id} className="rounded-xl border border-slate-200/40 p-3 transition cursor-pointer hover:border-slate-300 hover:shadow-sm dark:border-slate-700/40 dark:hover:border-slate-600 dark:hover:bg-slate-800/30">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                            <Briefcase className="h-3.5 w-3.5" />
                            Experience {index + 1}
                          </div>
                          {editingSection !== "work" && (
                            <button type="button" onClick={() => startEditing("work")} className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                              <Pencil className="h-3 w-3" />
                              Edit
                            </button>
                          )}
                        </div>
                        {editingSection === "work" ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            <FieldShell label="Role" error={fieldErrors[`work-${index}-role`]}>
                              <input
                                value={job.role}
                                onChange={(e) => setWorkDraft((prev) => prev.map((item) => (item.id === job.id ? { ...item, role: e.target.value } : item)))}
                                className={inputClass}
                                placeholder="Plant manager"
                              />
                            </FieldShell>
                            <FieldShell label="Company" error={fieldErrors[`work-${index}-company`]}>
                              <input
                                value={job.company}
                                onChange={(e) => setWorkDraft((prev) => prev.map((item) => (item.id === job.id ? { ...item, company: e.target.value } : item)))}
                                className={inputClass}
                                placeholder="Company name"
                              />
                            </FieldShell>
                            <FieldShell label="Period">
                              <input
                                value={job.period}
                                onChange={(e) => setWorkDraft((prev) => prev.map((item) => (item.id === job.id ? { ...item, period: e.target.value } : item)))}
                                className={inputClass}
                                placeholder="2023 - Present"
                              />
                            </FieldShell>
                            <div className="flex items-end justify-end">
                              <button
                                type="button"
                                onClick={() => setWorkDraft((prev) => prev.filter((item) => item.id !== job.id))}
                                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <FieldShell label="Impact statement">
                              <textarea
                                value={job.description}
                                onChange={(e) => setWorkDraft((prev) => prev.map((item) => (item.id === job.id ? { ...item, description: e.target.value } : item)))}
                                className={`${inputClass} min-h-[100px] md:col-span-2`}
                                placeholder="Describe results, process improvements, or business impact."
                              />
                            </FieldShell>
                          </div>
                        ) : (
                          <div>
                            <div className="text-base font-medium text-slate-800 dark:text-slate-100">{job.role}</div>
                            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {job.company}
                              {job.period ? ` · ${job.period}` : ""}
                            </div>
                            {normalized.roles[index]?.bullets?.length ? (
                              <ul className="mt-2 space-y-1">
                                {normalized.roles[index].bullets.map((point, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500" />
                                    {point}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyBlock icon={Briefcase} title="No work experience added yet." action="Add Experience" onAction={() => startEditing("work")} />
                )}
              </section>
            </div>
            {/* Column 3 — Education */}
            <div className="flex flex-col min-h-0 overflow-hidden">
              <section className="flex-1 overflow-auto border border-slate-200/40 bg-[#F3F6F4] p-4 shadow-sm dark:border-slate-700/40 dark:bg-slate-900">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Education</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Show formal training relevant to operations and manufacturing leadership.</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {editingSection === "edu" ? (
                      <>
                        <button type="button" onClick={() => setEduDraft((prev) => [{ id: `e${Date.now()}`, degree: "", school: "", period: "" }, ...prev])} className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-600 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-600 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                          {saving ? <Save className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button type="button" onClick={cancelEditing} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition hover:border-rose-200 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-rose-800 dark:hover:text-rose-400">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => startEditing("edu")} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition hover:border-emerald-200 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-800 dark:hover:text-emerald-400">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {eduDraft.length > 0 ? (
                  <div className="space-y-3">
                    {[...eduDraft].sort((a, b) => {
                      const yearA = parseInt(a.period?.match(/\b(19|20)\d{2}\b/)?.[0]);
                      const yearB = parseInt(b.period?.match(/\b(19|20)\d{2}\b/)?.[0]);
                      if (!yearA) return -1;
                      if (!yearB) return 1;
                      return yearB - yearA;
                    }).map((edu, index) => (
                      <div key={edu.id} className="rounded-xl border border-slate-200/40 p-3 dark:border-slate-700/40">
                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                          <BookOpen className="h-3.5 w-3.5" />
                          Education {index + 1}
                        </div>
                        {editingSection === "edu" ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            <FieldShell label="Degree" error={fieldErrors[`edu-${index}-degree`]}>
                              <input
                                value={edu.degree}
                                onChange={(e) => setEduDraft((prev) => prev.map((item) => (item.id === edu.id ? { ...item, degree: e.target.value } : item)))}
                                className={inputClass}
                                placeholder="M.Sc. Industrial Engineering"
                              />
                            </FieldShell>
                            <FieldShell label="School" error={fieldErrors[`edu-${index}-school`]}>
                              <input
                                value={edu.school}
                                onChange={(e) => setEduDraft((prev) => prev.map((item) => (item.id === edu.id ? { ...item, school: e.target.value } : item)))}
                                className={inputClass}
                                placeholder="University name"
                              />
                            </FieldShell>
                            <FieldShell label="Period">
                              <input
                                value={edu.period}
                                onChange={(e) => setEduDraft((prev) => prev.map((item) => (item.id === edu.id ? { ...item, period: e.target.value } : item)))}
                                className={inputClass}
                                placeholder="2015 - 2017"
                              />
                            </FieldShell>
                            <div className="flex items-end justify-end">
                              <button
                                type="button"
                                onClick={() => setEduDraft((prev) => prev.filter((item) => item.id !== edu.id))}
                                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-base font-medium text-slate-800 dark:text-slate-100">{edu.degree}</div>
                            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {edu.school}
                              {edu.period ? ` · ${edu.period}` : ""}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyBlock icon={BookOpen} title="No education added yet." action="Add Education" onAction={() => startEditing("edu")} />
                )}
              </section>
            </div>

          </div>
        </div>
      </div>

      {/* FOOTER: Section progress + Completion bar + dates */}
      <footer className="shrink-0 border-t border-slate-200/40 bg-white px-5 py-3 dark:border-slate-700/40 dark:bg-slate-950" style={{ height: "3.75rem" }}>
        <div className="flex items-center justify-between gap-4 h-full">
          <div className="flex items-center gap-3 text-[11px]">
            {(["Identity", "Contact", "Summary", "Experience", "Education"] as const).map((section) => {
              const done = section === "Identity" ? Boolean(draft.firstName && draft.lastName && draft.role)
                : section === "Contact" ? Boolean(draft.email && draft.phone)
                : section === "Summary" ? Boolean(draft.about)
                : section === "Experience" ? workDraft.some((w) => w.role && w.company)
                : eduDraft.some((e) => e.degree && e.school);
              return (
                <span key={section} className={`flex items-center gap-1 font-medium ${
                  done ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"
                }`}>
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${done ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                  {section}
                </span>
              );
            })}
          </div>
          <div className="flex items-center justify-center flex-1 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Completion</span>
              <div className="w-24">
                <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500 ease-out" style={{ width: `${completion}%` }} />
                </div>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{completion}%</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-0.5 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">From</span>
              <span className="font-medium text-slate-600 dark:text-slate-300">{formatMemberSince(profile?.createdAt ?? "")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Updated</span>
              <span className="font-medium text-slate-600 dark:text-slate-300">{formatLastUpdated(profile?.updatedAt ?? "")}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
