import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useLazyQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
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
  FileText,
  Mail,
  Phone,
  MapPin,
  Globe,
  ShieldCheck,
  AlertCircle,
  Camera,
  Factory,
  Layers,
  Search,
} from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { theme } from "../../styles/themeTokens";
import { useProfile } from "@/hooks/useProfile";
import type { Profile, WorkHistoryEntry, EducationEntry } from "@/types/profile";
import { normalizeProfile } from "@/utils/profileNormalizer";

const USERS_SEARCH_QUERY = gql`
  query UsersSearch($search: String) {
    users(search: $search) {
      id
      name
      role
      email
    }
  }
`;

const SECTIONS = ["Identity", "Contact", "Summary", "Experience", "Education"] as const;

const SECTION_FIELD_MAP: Record<string, string> = {
  firstName: "Identity",
  lastName: "Identity",
  role: "Identity",
  plant: "Identity",
  department: "Identity",
  language: "Identity",
  email: "Contact",
  phone: "Contact",
  location: "Contact",
  about: "Summary",
  workHistory: "Experience",
  education: "Education",
};

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

const COMPLETION_FIELD_DEFS = [
  { key: "name", label: "First & last name", check: (d: ProfileDraft) => d.firstName.trim() && d.lastName.trim() },
  { key: "role", label: "Role", check: (d: ProfileDraft) => d.role.trim() },
  { key: "email", label: "Email", check: (d: ProfileDraft) => d.email.trim() },
  { key: "phone", label: "Phone", check: (d: ProfileDraft) => d.phone.trim() },
  { key: "location", label: "Location", check: (d: ProfileDraft) => d.location.trim() },
  { key: "plant", label: "Plant", check: (d: ProfileDraft) => d.plant.trim() },
  { key: "department", label: "Department", check: (d: ProfileDraft) => d.department.trim() },
  { key: "language", label: "Language", check: (d: ProfileDraft) => d.language.trim() },
  { key: "about", label: "Summary", check: (d: ProfileDraft) => d.about.trim() },
  { key: "workHistory", label: "Work history", check: (_d: ProfileDraft, w: WorkHistoryEntry[]) => w.some((item) => item.role.trim() && item.company.trim()) },
  { key: "education", label: "Education", check: (_d: ProfileDraft, _w: WorkHistoryEntry[], e: EducationEntry[]) => e.some((item) => item.degree.trim() && item.school.trim()) },
];

function profileCompletionScore(
  draft: ProfileDraft,
  workHistory: WorkHistoryEntry[],
  education: EducationEntry[],
): number {
  const checks = COMPLETION_FIELD_DEFS.map((def) => def.check(draft, workHistory, education));
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
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

function validateField(field: string, draft: ProfileDraft): string | undefined {
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

function removeFieldError(errors: Record<string, string>, field: string): Record<string, string> {
  const nextErrors = { ...errors };
  delete nextErrors[field];
  return nextErrors;
}

function extractPeriodYear(period?: string): number | null {
  if (!period) return null;
  const match = period.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
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
    <div className="rounded-2xl border border-dashed border-border bg-muted px-4 py-6 text-center border-border bg-card">
      <Icon className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
      <p className="mb-3 text-sm text-muted-foreground">{title}</p>
      <button type="button" onClick={onAction} className="inline-flex items-center gap-1.5 rounded-xl bg-success px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-success">
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
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </div>
      {children}
      {error ? <div className="mt-1 text-xs text-danger">{error}</div> : null}
    </label>
  );
}

const inputClass =
  "w-full border-0 border-b-2 border-border bg-transparent px-0 py-1.5 text-sm text-foreground transition placeholder:text-muted-foreground hover:border-border focus:border-success focus:outline-none focus:ring-0 cursor-text border-border text-foreground dark:placeholder:text-muted-foreground dark:hover:border-border";
const inputErrorClass =
  "w-full border-0 border-b-2 border-danger bg-transparent px-0 py-1.5 text-sm text-foreground transition placeholder:text-muted-foreground hover:border-danger focus:border-danger focus:outline-none focus:ring-0 cursor-text border-danger text-foreground";
const mutedValueClass = "text-sm font-medium text-foreground text-muted-foreground";

export function UserProfilePage() {
  const navigate = useNavigate();
  const { profile, loading, error, saveProfile } = useProfile();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [draftInitialized, setDraftInitialized] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const pendingNav = useRef<string | null>(null);
  const navConfirmed = useRef(false);

  const [showCompletionPopover, setShowCompletionPopover] = useState(false);
  const completionPopoverRef = useRef<HTMLDivElement>(null);
  const completionBarRef = useRef<HTMLDivElement>(null);

  const [deptTouched, setDeptTouched] = useState(false);

  const [userSearchText, setUserSearchText] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const userSearchTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; role: string; email: string } | null>(null);

  const identityRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const experienceRef = useRef<HTMLDivElement>(null);
  const educationRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLTextAreaElement>(null);

  const [activeSection, setActiveSection] = useState<string>("Identity");

  const { data: plantsData } = useQuery<{ plants: { id: string; name: string }[] }>(PLANTS_QUERY, { fetchPolicy: "cache-and-network" });
  const { data: deptsData } = useQuery<{ departments: { id: string; name: string }[] }>(DEPARTMENTS_QUERY, { fetchPolicy: "cache-and-network" });
  const plants = plantsData?.plants ?? [];
  const departments = deptsData?.departments ?? [];
  const [workDraft, setWorkDraft] = useState<WorkHistoryEntry[]>([]);
  const [eduDraft, setEduDraft] = useState<EducationEntry[]>([]);

  const [searchUsers, { data: userData, loading: userLoading }] = useLazyQuery<{ users: { id: string; name: string; role: string; email: string }[] }>(USERS_SEARCH_QUERY, {
    fetchPolicy: "network-only",
  });
  const userResults = userData?.users ?? [];

  useEffect(() => {
    setDraft(draftFromProfile(profile));
    setWorkDraft(cloneWork(profile?.workHistory ?? []));
    setEduDraft(cloneEducation(profile?.education ?? []));
    setDraftInitialized(true);
  }, [profile]);

  useEffect(() => {
    if (draftInitialized && !draft.plant && plants.length > 0) {
      setDraft((prev) => ({ ...prev, plant: plants[0].name }));
    }
  }, [draftInitialized, plants]);

  const completion = useMemo(
    () => profileCompletionScore(draft, workDraft, eduDraft),
    [draft, workDraft, eduDraft],
  );

  const isDirty = useMemo(
    () => draftInitialized && (
      JSON.stringify(draft) !== JSON.stringify(draftFromProfile(profile)) ||
      JSON.stringify(workDraft) !== JSON.stringify(profile?.workHistory ?? []) ||
      JSON.stringify(eduDraft) !== JSON.stringify(profile?.education ?? [])
    ),
    [draftInitialized, draft, workDraft, eduDraft, profile],
  );



  const scrollToSection = useCallback((section: string) => {
    const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
      Identity: identityRef,
      Contact: contactRef,
      Summary: summaryRef,
      Experience: experienceRef,
      Education: educationRef,
    };
    const target = refMap[section];
    if (target?.current) {
      target.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setActiveSection(section);
  }, []);

  const scrollToField = useCallback((key: string) => {
    const section = SECTION_FIELD_MAP[key];
    if (section) {
      scrollToSection(section);
      setTimeout(() => {
        const el = document.querySelector(`[data-field="${key}"]`) as HTMLElement;
        if (el && editingSection) el.focus();
      }, 500);
    }
    setShowCompletionPopover(false);
  }, [scrollToSection, editingSection]);

  const handleNavigate = useCallback((to: string) => {
    if (isDirty && !navConfirmed.current) {
      pendingNav.current = to;
      setShowUnsavedModal(true);
      return;
    }
    navConfirmed.current = false;
    navigate(to);
  }, [isDirty, navigate]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let best = activeSection;
        let bestRatio = 0;
        entries.forEach((entry) => {
          const section = entry.target.getAttribute("data-section");
          if (section && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            best = section;
          }
        });
        if (best) setActiveSection(best);
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5] },
    );

    const refs = [
      { ref: identityRef, section: "Identity" },
      { ref: contactRef, section: "Contact" },
      { ref: summaryRef, section: "Summary" },
      { ref: experienceRef, section: "Experience" },
      { ref: educationRef, section: "Education" },
    ];

    refs.forEach(({ ref, section }) => {
      if (ref.current) {
        ref.current.setAttribute("data-section", section);
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const currentIndex = SECTIONS.indexOf(activeSection as (typeof SECTIONS)[number]);
        if (currentIndex === -1) return;
        const nextIndex = e.key === "ArrowRight"
          ? Math.min(currentIndex + 1, SECTIONS.length - 1)
          : Math.max(currentIndex - 1, 0);
        if (nextIndex !== currentIndex) {
          scrollToSection(SECTIONS[nextIndex]);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeSection, scrollToSection]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        completionPopoverRef.current &&
        !completionPopoverRef.current.contains(e.target as Node) &&
        completionBarRef.current &&
        !completionBarRef.current.contains(e.target as Node)
      ) {
        setShowCompletionPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const missingFields = useMemo(() => {
    return COMPLETION_FIELD_DEFS.filter((def) => !def.check(draft, workDraft, eduDraft));
  }, [draft, workDraft, eduDraft]);

  const perFieldWeight = useMemo(
    () => Math.round(100 / COMPLETION_FIELD_DEFS.length),
    [],
  );

  const deptError = useMemo(
    () => (deptTouched && !draft.department.trim() ? "Department is required." : undefined),
    [deptTouched, draft.department],
  );

  const aboutCharCount = draft.about.length;
  const aboutCharColor = aboutCharCount >= 500 ? "text-danger" : aboutCharCount >= 450 ? "text-warning" : "text-muted-foreground";

  const startEditing = (section: string) => {
    setEditingSection(section);
    setSaveError(null);
    setSaveSuccess(null);
    setShowCompletionPopover(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
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
    setDeptTouched(false);
    setDraft(draftFromProfile(profile));
    setWorkDraft(cloneWork(profile?.workHistory ?? []));
    setEduDraft(cloneEducation(profile?.education ?? []));
    const reportsToName = profile?.reportsTo ?? "";
    if (reportsToName) {
      setSelectedUser({ id: "", name: reportsToName, role: "", email: "" });
    } else {
      setSelectedUser(null);
    }
    setUserSearchText("");
  };

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(null);
    setDeptTouched(true);

    const nextErrors = validateProfile(draft, workDraft, eduDraft);
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setSaveError("Save failed — review required fields");
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
      setEditingSection(null);
      setSaveSuccess("Profile saved");
      setSaveError(null);
      setTimeout(() => setSaveSuccess(null), 3000);
      return;
    }

    setFieldErrors(result.errors ?? {});
    setSaveError("Save failed — review required fields");
  };

  const handleUserSearchInput = (text: string) => {
    setUserSearchText(text);
    if (userSearchTimeout.current) clearTimeout(userSearchTimeout.current);
    userSearchTimeout.current = setTimeout(() => {
      searchUsers({ variables: { search: text || undefined } });
    }, 300);
  };

  const handleUserSelect = (user: { id: string; name: string; role: string; email: string }) => {
    setSelectedUser(user);
    setDraft((prev) => ({ ...prev, reportsTo: user.name }));
    setShowUserDropdown(false);
    setUserSearchText("");
  };

  const handleUserClear = () => {
    setSelectedUser(null);
    setDraft((prev) => ({ ...prev, reportsTo: "" }));
    setUserSearchText("");
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>("[data-reports-to-input]");
      input?.focus();
    }, 0);
  };

  const confirmSave = async () => {
    setShowUnsavedModal(false);
    await handleSave();
    if (pendingNav.current) {
      navConfirmed.current = true;
      navigate(pendingNav.current);
      pendingNav.current = null;
    }
  };

  const confirmDiscard = () => {
    setShowUnsavedModal(false);
    cancelEditing();
    if (pendingNav.current) {
      navConfirmed.current = true;
      navigate(pendingNav.current);
      pendingNav.current = null;
    }
  };

  const confirmCancel = () => {
    setShowUnsavedModal(false);
    pendingNav.current = null;
  };

  if (loading) {
    return (
      <div className={`flex h-full items-center justify-center ${theme.page}`}>
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm border-border bg-background text-muted-foreground">
          Loading profile...
        </div>
      </div>
    );
  }

  if (error && !profile) {
    console.error("Profile query error:", error.message);
    return (
      <AppPageLayout title="Profile" subtitle="Manage your personal information and account settings." icon={<User />}>
        <div className="p-4 space-y-3">
          <div className="mx-auto max-w-3xl rounded-3xl border border-danger bg-danger px-5 py-4 text-sm text-danger border-danger bg-danger text-danger">
            We couldn&apos;t load the profile right now.
          </div>
          <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card px-4 py-3 text-xs font-mono text-muted-foreground border-border bg-background text-muted-foreground">
            {error.message}
          </div>
        </div>
      </AppPageLayout>
    );
  }

  const fullName = [draft.firstName, draft.lastName].filter(Boolean).join(" ") || profile?.name || "";
  const avatarInitials = initials(fullName);
  const normalized = normalizeProfile({
    name: fullName,
    role: draft.role,
    summary: draft.about,
    experience: workDraft.map((w) => ({
      role: w.role,
      company: w.company,
      startDate: w.period?.split(" - ")[0] || "",
      endDate: w.period?.split(" - ")[1] || "",
      bullets: w.description ? w.description.split(/[.!\n]+/).filter(Boolean).map((s) => s.trim()) : [],
    })),
    education: eduDraft,
  });
  const highlights = normalized.highlights;
  const score = normalized.score;

  function getHighlightTitle(highlight: string): string {
    if (highlight.includes("experience")) return "Calculated from earliest work history start date";
    const plantMatch = highlight.match(/(\d+)\s+(plants|lines|teams)/i);
    if (plantMatch) return `Assigned to: —`;
    return "";
  }

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`}>
      {/* HEADER: Identity + Global Actions */}
      <header className={`relative flex items-center gap-4 border-b shadow-sm h-16 shrink-0 px-5 ${theme.header}`}>
        <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarClick}>
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt={fullName || "Avatar"}
              className="h-10 w-10 rounded-full bg-muted object-cover"
            />
          ) : avatarError ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-success-foreground text-sm font-bold shadow-sm">
              {avatarInitials}
            </div>
          ) : (
            <img
              src={`https://i.pravatar.cc/150?u=${encodeURIComponent(draft.email || fullName || "user")}`}
              alt={fullName || "Avatar"}
              className="h-10 w-10 rounded-full bg-muted object-cover"
              onError={() => setAvatarError(true)}
            />
          )}
          <div className="absolute inset-0 hidden group-hover:flex items-center justify-center rounded-full bg-background">
            <Camera className="h-4 w-4 text-primary-foreground" />
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
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-lg font-semibold text-foreground truncate leading-tight">{fullName || "Complete your profile"}</div>
            {editingSection && (
              <span className="inline-flex items-center gap-1 rounded-md bg-warning px-2 py-0.5 text-[10px] font-semibold text-warning bg-warning text-warning">Editing</span>
            )}
          </div>
          <div className="text-sm text-muted-foreground truncate leading-tight">{draft.role || "Add your role and details"}</div>
        </div>
        <button type="button" onClick={() => handleNavigate("/control-tower")} className="shrink-0 rounded-lg border border-border bg-card p-2 text-muted-foreground transition hover:border-border hover:text-muted-foreground border-border bg-card text-muted-foreground dark:hover:border-border dark:hover:text-muted-foreground" aria-label="Close profile">
          <X className="h-4 w-4" />
        </button>

        {saveError && !saveSuccess && (
          <div className="absolute left-0 right-0 top-full z-20 flex items-center gap-2 border-b border-danger bg-danger px-5 py-2 text-sm font-medium text-danger border-danger bg-danger text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{saveError}</span>
            <button type="button" onClick={() => setSaveError(null)} className="shrink-0 rounded p-0.5 text-danger hover:text-danger hover:text-danger">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* TOOLBAR: Highlights + Score */}
      <div className="shrink-0 border-b border-border bg-card px-5 py-1.5 border-border bg-background">
        <div className="flex items-center gap-1.5">
          {highlights.map((h, i) => (
            <span key={i} title={getHighlightTitle(h)} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted text-muted-foreground">
              {h}
            </span>
          ))}
          {highlights.length > 0 && <div className="h-3 w-px bg-muted" />}
          <span
            title="Profile quality score: completeness + skill coverage"
            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted text-muted-foreground"
          >
            {score.value}/100
          </span>
          <span
            title="Top 30% of operator profiles in this plant"
            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted text-muted-foreground"
          >
            {score.label}
          </span>
        </div>
      </div>

      <div className={`flex-1 overflow-hidden transition-colors ${editingSection ? "bg-muted bg-card" : ""}`}>
        <div className="flex flex-col h-full">

          <div className="grid xl:grid-cols-[2fr_1.75fr_1.25fr] flex-1 min-h-0">
            {/* Column 1 — Personal Information + Professional Summary */}
            <div className="flex flex-col min-h-0 overflow-hidden">
              <section className="flex flex-col flex-1 overflow-auto border border-border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between shrink-0">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Personal information</h3>
                    <p className="text-sm text-muted-foreground">Core identity and contact details used across the workspace.</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {editingSection === "profile" ? (
                      <>
                        <button type="button" onClick={handleSave} title="Confirm this section" className="rounded-lg border border-success bg-success p-1.5 text-success transition hover:bg-success border-success bg-success text-success">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={cancelEditing} className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition hover:border-danger hover:text-danger border-border bg-card hover:border-danger hover:text-danger">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => startEditing("profile")} className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition hover:border-success hover:text-success border-border bg-card hover:border-success dark:hover:text-success">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div ref={identityRef} className="grid md:grid-cols-2 gap-4">
                  <FieldShell label="First name" error={fieldErrors.firstName}>
                    {editingSection === "profile" ? (
                      <input data-field="firstName" value={draft.firstName} onChange={(e) => setDraft((prev) => ({ ...prev, firstName: e.target.value }))} className={fieldErrors.firstName ? inputErrorClass : inputClass} placeholder="First name" />
                    ) : (
                      <div className={mutedValueClass}>{draft.firstName || ""}</div>
                    )}
                  </FieldShell>

                  <FieldShell label="Last name" error={fieldErrors.lastName}>
                    {editingSection === "profile" ? (
                      <input data-field="lastName" value={draft.lastName} onChange={(e) => setDraft((prev) => ({ ...prev, lastName: e.target.value }))} className={fieldErrors.lastName ? inputErrorClass : inputClass} placeholder="Last name" />
                    ) : (
                      <div className={mutedValueClass}>{draft.lastName || ""}</div>
                    )}
                  </FieldShell>

                  <FieldShell label="Role" error={fieldErrors.role}>
                    {editingSection === "profile" ? (
                      <input data-field="role" value={draft.role} onChange={(e) => setDraft((prev) => ({ ...prev, role: e.target.value }))} className={inputClass} placeholder="Role or title" />
                    ) : (
                      <div className={mutedValueClass}>{draft.role || ""}</div>
                    )}
                  </FieldShell>

                  <FieldShell label="Reports to">
                    {editingSection === "profile" ? (
                      <div className="relative" ref={userDropdownRef}>
                        <div className="flex items-start gap-2">
                          <User className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          {selectedUser ? (
                            <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-sm border-border bg-muted">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success text-[9px] font-bold text-success bg-success text-success">
                                {initials(selectedUser.name)}
                              </span>
                              <span className="text-foreground text-muted-foreground">{selectedUser.name}</span>
                              {selectedUser.role && <span className="text-[11px] text-muted-foreground">({selectedUser.role})</span>}
                              <button type="button" onClick={handleUserClear} className="ml-1 rounded p-0.5 text-muted-foreground hover:text-danger">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative flex-1">
                              <Search className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                              <input
                                data-reports-to-input
                                type="text"
                                value={userSearchText}
                                onChange={(e) => {
                                  handleUserSearchInput(e.target.value);
                                  setShowUserDropdown(true);
                                }}
                                onFocus={() => setShowUserDropdown(true)}
                                className="w-full border-0 border-b-2 border-border bg-transparent pl-5 pr-0 py-1.5 text-sm text-foreground transition placeholder:text-muted-foreground hover:border-border focus:border-success focus:outline-none focus:ring-0 border-border text-foreground dark:placeholder:text-muted-foreground dark:hover:border-border"
                                placeholder="Search by name or role..."
                              />
                            </div>
                          )}
                        </div>
                        {showUserDropdown && !selectedUser && (
                          <div className="absolute left-7 right-0 top-full z-30 mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-card shadow-lg border-border bg-card">
                            {userLoading ? (
                              <div className="px-3 py-2 text-xs text-muted-foreground">Searching...</div>
                            ) : userResults.length > 0 ? (
                              userResults.map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => handleUserSelect(u)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-muted dark:hover:bg-muted"
                                >
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success text-[10px] font-bold text-success bg-success text-success">
                                    {initials(u.name)}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="text-foreground text-muted-foreground truncate">{u.name}</div>
                                    {u.role && <div className="text-[11px] text-muted-foreground truncate">{u.role}</div>}
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-xs text-muted-foreground">No users found</div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-foreground text-muted-foreground">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {draft.reportsTo || ""}
                      </div>
                    )}
                  </FieldShell>

                  <FieldShell label="Plant">
                    {editingSection === "profile" ? (
                      <select data-field="plant" value={draft.plant} onChange={(e) => setDraft((prev) => ({ ...prev, plant: e.target.value }))} className={inputClass}>
                        <option value="">Select plant...</option>
                        {plants.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-foreground text-muted-foreground">
                        <Factory className="h-4 w-4 text-muted-foreground" />
                        {draft.plant || ""}
                      </div>
                    )}
                  </FieldShell>

                  <FieldShell label="Department" error={deptError} required>
                    {editingSection === "profile" ? (
                      <select
                        data-field="department"
                        value={draft.department}
                        onChange={(e) => setDraft((prev) => ({ ...prev, department: e.target.value }))}
                        onBlur={() => setDeptTouched(true)}
                        className={deptError ? inputErrorClass : inputClass}
                      >
                        <option value="">Select department...</option>
                        {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-foreground text-muted-foreground">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        {draft.department || ""}
                      </div>
                    )}
                  </FieldShell>

                  <FieldShell label="Languages" className="md:col-span-2">
                    {editingSection === "profile" ? (
                      <div className="flex items-start gap-2">
                        <Globe className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <input data-field="language" value={draft.language} onChange={(e) => setDraft((prev) => ({ ...prev, language: e.target.value }))} className={inputClass} placeholder="English, Romanian" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-foreground text-muted-foreground">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        {draft.language || ""}
                      </div>
                    )}
                  </FieldShell>
                </div>

                <div ref={contactRef} className="grid md:grid-cols-2 gap-4 mt-4">
                  <FieldShell label="Email" error={fieldErrors.email}>
                    {editingSection === "profile" ? (
                      <div className="flex items-start gap-2">
                        <Mail className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <input data-field="email" value={draft.email} onChange={(e) => {
                          setDraft((prev) => ({ ...prev, email: e.target.value }));
                          setFieldErrors((prev) => {
                            const err = validateField("email", { ...draft, email: e.target.value });
                            return err ? { ...prev, email: err } : removeFieldError(prev, "email");
                          });
                        }} className={`${fieldErrors.email ? inputErrorClass : inputClass}`} placeholder="name@company.com" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-foreground text-muted-foreground">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {draft.email || ""}
                      </div>
                    )}
                  </FieldShell>

                  <FieldShell label="Phone" error={fieldErrors.phone}>
                    {editingSection === "profile" ? (
                      <div className="flex items-start gap-2">
                        <Phone className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <input data-field="phone" value={draft.phone} onChange={(e) => {
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
                            setFieldErrors((prev) => removeFieldError(prev, "phone"));
                          }
                        }} className={`${fieldErrors.phone ? inputErrorClass : inputClass}`} placeholder="+1 (555) 123-4567" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-foreground text-muted-foreground">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {draft.phone || ""}
                      </div>
                    )}
                  </FieldShell>

                  <FieldShell label="Full address" className="md:col-span-2">
                    {editingSection === "profile" ? (
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <input data-field="location" value={draft.location} onChange={(e) => setDraft((prev) => ({ ...prev, location: e.target.value }))} className={inputClass} placeholder="123 Main St, Detroit, MI 48201" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-foreground text-muted-foreground">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {draft.location || ""}
                      </div>
                    )}
                  </FieldShell>
                </div>

                <div ref={summaryRef} className="flex-1 flex flex-col min-h-0 mt-4">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">About</div>
                  {editingSection === "profile" ? (
                    <div className="relative flex-1 flex flex-col">
                      <textarea
                        ref={aboutRef}
                        data-field="about"
                        value={draft.about}
                        onChange={(e) => setDraft((prev) => ({ ...prev, about: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-success focus:outline-none focus:ring-2 focus:ring-ring border-border bg-background text-foreground"
                        placeholder="Summarize your role, expertise, and manufacturing focus (plain text, max 500 characters)"
                        maxLength={500}
                        style={{ minHeight: "80px", resize: "vertical" }}
                      />
                      <div className={`mt-1 self-end text-xs ${aboutCharColor}`}>
                        {aboutCharCount} / 500
                      </div>
                    </div>
                  ) : draft.about ? (
                    <div className="flex-1">
                      <ul className="space-y-2">
                        {normalized.summary.map((b, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm leading-5 text-foreground text-muted-foreground">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <EmptyBlock icon={FileText} title="No summary added yet." action="Add Summary" onAction={() => startEditing("profile")} />
                  )}
                  {fieldErrors.about && <div className="mt-1 text-xs text-danger">{fieldErrors.about}</div>}
                </div>
              </section>
            </div>

            {/* Column 2 — Work History */}
            <div ref={experienceRef} className="flex flex-col min-h-0 overflow-hidden">
              <section className="flex-1 overflow-auto border border-border bg-card p-4 shadow-sm border-border bg-background">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Work history</h3>
                    <p className="text-sm text-muted-foreground">Capture roles, companies, and measurable impact.</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {editingSection === "work" ? (
                      <>
                        <button type="button" onClick={handleSave} title="Confirm this section" className="rounded-lg border border-success bg-success p-1.5 text-success transition hover:bg-success border-success bg-success text-success">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setWorkDraft((prev) => [{ id: `w${Date.now()}`, role: "", company: "", period: "", description: "" }, ...prev])} className="rounded-lg border border-success bg-success p-1.5 text-success transition hover:bg-success border-success bg-success text-success">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={cancelEditing} className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition hover:border-danger hover:text-danger border-border bg-card hover:border-danger hover:text-danger">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => startEditing("work")} className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition hover:border-success hover:text-success border-border bg-card hover:border-success dark:hover:text-success">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {workDraft.length > 0 ? (
                  <div className="space-y-4">
                    {[...workDraft].sort((a, b) => {
                      const yearA = extractPeriodYear(a.period);
                      const yearB = extractPeriodYear(b.period);
                      if (!yearA) return -1;
                      if (!yearB) return 1;
                      return yearB - yearA;
                    }).map((job, index) => (
                      <div
                        key={job.id}
                        className={`rounded-xl border transition-shadow ${
                          editingSection === "work"
                            ? "border-info bg-accent shadow-sm border-info bg-accent"
                            : "border-border bg-card border-border bg-card"
                        }`}
                      >
                        {/* Card header */}
                        <div className="flex items-center justify-between px-4 pt-3 pb-1">
                          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            <Briefcase className="h-3.5 w-3.5" />
                            {editingSection === "work" ? "Editing" : "Experience"} {index + 1}
                          </div>
                          {editingSection === "work" && (
                            <button
                              type="button"
                              title="Remove this experience"
                              onClick={() => setWorkDraft((prev) => prev.filter((item) => item.id !== job.id))}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-danger transition hover:bg-danger text-danger hover:bg-danger"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove
                            </button>
                          )}
                        </div>

                        {editingSection === "work" ? (
                          <div className="px-4 pb-4 pt-1 space-y-3">
                            {/* Row 1: Role + Company */}
                            <div className="grid gap-3 sm:grid-cols-2">
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
                            </div>

                            {/* Row 2: Period */}
                            <div className="sm:w-64">
                              <FieldShell label="Period">
                                <input
                                  value={job.period}
                                  onChange={(e) => setWorkDraft((prev) => prev.map((item) => (item.id === job.id ? { ...item, period: e.target.value } : item)))}
                                  className={inputClass}
                                  placeholder="2023 - Present"
                                />
                              </FieldShell>
                            </div>

                            {/* Row 3: Impact statement — dominant */}
                            <div>
                              <FieldShell label="Impact statement">
                                <textarea
                                  value={job.description}
                                  onChange={(e) => setWorkDraft((prev) => prev.map((item) => (item.id === job.id ? { ...item, description: e.target.value } : item)))}
                                  className="w-full rounded-lg border border-border bg-accent p-3 text-sm text-foreground transition placeholder:text-muted-foreground focus:border-info focus:outline-none focus:ring-2 focus:ring-ring border-border bg-accent text-foreground dark:placeholder:text-muted-foreground"
                                  rows={4}
                                  placeholder="Describe results, process improvements, or business impact."
                                />
                              </FieldShell>
                            </div>
                          </div>
                        ) : (
                          <div className="px-4 pb-4 pt-1">
                            <div className="text-[15px] font-semibold text-foreground">{job.role}</div>
                            <div className="text-sm text-muted-foreground">
                              {job.company}
                              {job.period ? <span className="ml-2 text-xs text-muted-foreground">({job.period})</span> : null}
                            </div>
                            {normalized.roles[index]?.bullets?.length ? (
                              <ul className="mt-2 space-y-1">
                                {normalized.roles[index].bullets.map((point, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted" />
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
            <div ref={educationRef} className="flex flex-col min-h-0 overflow-hidden">
              <section className="flex-1 overflow-auto border border-border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Education</h3>
                    <p className="text-sm text-muted-foreground">Show formal training relevant to operations and manufacturing leadership.</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {editingSection === "edu" ? (
                      <>
                        <button type="button" onClick={handleSave} title="Confirm this section" className="rounded-lg border border-success bg-success p-1.5 text-success transition hover:bg-success border-success bg-success text-success">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setEduDraft((prev) => [{ id: `e${Date.now()}`, degree: "", school: "", period: "" }, ...prev])} className="rounded-lg border border-success bg-success p-1.5 text-success transition hover:bg-success border-success bg-success text-success">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={cancelEditing} className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition hover:border-danger hover:text-danger border-border bg-card hover:border-danger hover:text-danger">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => startEditing("edu")} className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition hover:border-success hover:text-success border-border bg-card hover:border-success dark:hover:text-success">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {eduDraft.length > 0 ? (
                  <div className="space-y-4">
                    {[...eduDraft].sort((a, b) => {
                      const yearA = extractPeriodYear(a.period);
                      const yearB = extractPeriodYear(b.period);
                      if (!yearA) return -1;
                      if (!yearB) return 1;
                      return yearB - yearA;
                    }).map((edu, index) => (
                      <div
                        key={edu.id}
                        className={`rounded-xl border transition-shadow ${
                          editingSection === "edu"
                            ? "border-info bg-accent shadow-sm border-info bg-accent"
                            : "border-border bg-card border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between px-4 pt-3 pb-1">
                          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            <BookOpen className="h-3.5 w-3.5" />
                            {editingSection === "edu" ? "Editing" : "Education"} {index + 1}
                          </div>
                          {editingSection === "edu" && (
                            <button
                              type="button"
                              title="Remove this education"
                              onClick={() => setEduDraft((prev) => prev.filter((item) => item.id !== edu.id))}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-danger transition hover:bg-danger text-danger hover:bg-danger"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove
                            </button>
                          )}
                        </div>
                        {editingSection === "edu" ? (
                          <div className="px-4 pb-4 pt-1 space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
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
                            </div>
                            <div className="sm:w-64">
                              <FieldShell label="Period">
                                <input
                                  value={edu.period}
                                  onChange={(e) => setEduDraft((prev) => prev.map((item) => (item.id === edu.id ? { ...item, period: e.target.value } : item)))}
                                  className={inputClass}
                                  placeholder="2015 - 2017"
                                />
                              </FieldShell>
                            </div>
                          </div>
                        ) : (
                          <div className="px-4 pb-4 pt-1">
                            <div className="text-[15px] font-semibold text-foreground">{edu.degree}</div>
                            <div className="text-sm text-muted-foreground">
                              {edu.school}
                              {edu.period ? <span className="ml-2 text-xs text-muted-foreground">({edu.period})</span> : null}
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
      <footer className="h-14 shrink-0 border-t border-border bg-muted px-5 py-3">
        <div className="flex items-center justify-between gap-4 h-full">
          <div className="flex items-center gap-2" ref={completionBarRef}>
            <span className="text-xs text-muted-foreground">Completion</span>
            <button
              type="button"
              onClick={() => setShowCompletionPopover((prev) => !prev)}
              className="flex items-center gap-2 group"
            >
              <div className="w-24 cursor-pointer">
                <div className="h-1 rounded-full bg-muted">
                  <div className="h-1 rounded-full bg-info transition-all duration-500 ease-out" style={{ width: `${completion}%` }} />
                </div>
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground dark:group-hover:text-muted-foreground">{completion}%</span>
            </button>
          </div>
          <div className="flex flex-col items-end gap-0.5 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold uppercase tracking-[0.18em] text-muted-foreground">From</span>
              <span className="font-medium text-muted-foreground">{formatMemberSince(profile?.createdAt ?? "")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold uppercase tracking-[0.18em] text-muted-foreground">Updated</span>
              <span className="font-medium text-muted-foreground">{formatLastUpdated(profile?.updatedAt ?? "")}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Completion popover */}
      {showCompletionPopover && (
        <div
          ref={completionPopoverRef}
          className="fixed bottom-16 right-8 z-50 w-64 rounded-xl border border-border bg-card p-3 shadow-xl border-border bg-card"
        >
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Missing fields
          </div>
          {missingFields.length > 0 ? (
            <div className="space-y-1">
              {missingFields.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  onClick={() => scrollToField(field.key)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted text-muted-foreground dark:hover:bg-muted"
                >
                  <span className="text-muted-foreground">●</span>
                  <span className="flex-1 text-left">{field.label}</span>
                  <span className="font-medium text-muted-foreground">{perFieldWeight}%</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-success">All fields complete!</div>
          )}
        </div>
      )}

      {/* Unsaved changes modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-background" onClick={confirmCancel} />
          <div className="relative bg-card rounded-xl shadow-2xl border border-border p-5 w-[380px] max-w-[90vw]">
            <h3 className="text-sm font-bold text-foreground mb-2">Unsaved changes</h3>
            <p className="text-xs text-muted-foreground mb-4">Your profile changes will be lost.</p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={confirmSave}
                className="rounded-lg bg-success text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-success transition-colors"
              >
                Save profile
              </button>
              <button
                type="button"
                onClick={confirmDiscard}
                className="rounded-lg border border-border bg-card text-foreground px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors border-border bg-muted text-muted-foreground dark:hover:bg-muted"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                className="rounded-lg bg-card text-muted-foreground px-3 py-1.5 text-xs font-medium hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {saveSuccess && !saveError && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-success px-4 py-2.5 text-xs font-medium text-primary-foreground shadow-lg transition-opacity duration-300">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          {saveSuccess}
        </div>
      )}
    </div>
  );
}
