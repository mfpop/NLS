import type { ChangeEvent } from "react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { DEPARTMENTS_QUERY } from "@/graphql/manufacturingQueries";
import { ROLES_QUERY, USER_PROFILES_QUERY } from "@/graphql/administrationQueries";
import {
  Check,
  X,
  ShieldCheck,
  AlertCircle,
  Camera,
  Loader2,
  Save,
  RefreshCw,
  Pencil,
  CircleHelp,
} from "lucide-react";
import { PageToolbar, ToolbarButton } from "@/components/layout/PageToolbar";
import { theme } from "@/styles/themeTokens";
import { useProfile } from "@/hooks/useProfile";
import type { WorkHistoryEntry, EducationEntry } from "@/types/profile";
import { PageGuideModal, type GuideContent } from "@/pages/shared/PageGuideModal";
import { normalizeProfile } from "@/utils/profileNormalizer";
import { PersonalInfoColumn } from "./profile/PersonalInfoColumn";
import { WorkHistoryColumn } from "./profile/WorkHistoryColumn";
import { EducationColumn } from "./profile/EducationColumn";
import {
  type ProfileDraft,
  emptyDraft,
  draftFromProfile,
  initials,
  formatMemberSince,
  formatLastUpdated,
  validateProfile,
} from "./profile/shared";

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

function cloneWork(items: WorkHistoryEntry[]): WorkHistoryEntry[] {
  return items.map((item) => ({ ...item }));
}

function cloneEducation(items: EducationEntry[]): EducationEntry[] {
  return items.map((item) => ({ ...item }));
}

const COMPLETION_FIELD_DEFS = [
  { key: "name", label: "First & last name", check: (d: ProfileDraft) => d.firstName.trim() && d.lastName.trim() },
  { key: "role", label: "Position", check: (d: ProfileDraft) => d.role.trim() },
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

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export function UserProfilePage() {
  const navigate = useNavigate();
  const { profile, loading, error, saving, saveProfile } = useProfile();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [guideOpen, setGuideOpen] = useState(false);
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

  const identityRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const experienceRef = useRef<HTMLDivElement>(null);
  const educationRef = useRef<HTMLDivElement>(null);

  const [activeSection, setActiveSection] = useState<string>("Identity");

  const { data: plantsData } = useQuery<{ plants: { id: string; name: string }[] }>(PLANTS_QUERY, { fetchPolicy: "cache-and-network" });
  const { data: deptsData } = useQuery<{ departments: { id: string; name: string }[] }>(DEPARTMENTS_QUERY, { fetchPolicy: "cache-and-network" });
  const { data: rolesData } = useQuery<{ roles: { id: string; code: string; name: string }[] }>(ROLES_QUERY, {
    variables: { isActive: true },
    fetchPolicy: "cache-and-network",
  });
  const profileUserId = profile?.user;
  const { data: adminProfilesData } = useQuery<{ userProfiles: { id: string }[] }>(USER_PROFILES_QUERY, {
    variables: { userId: profileUserId, isActive: true },
    skip: !profileUserId,
    fetchPolicy: "cache-and-network",
  });
  const adminProfileId = adminProfilesData?.userProfiles?.[0]?.id ?? null;
  const plants = plantsData?.plants ?? [];
  const departments = deptsData?.departments ?? [];
  const roles = rolesData?.roles ?? [];
  const [workDraft, setWorkDraft] = useState<WorkHistoryEntry[]>([]);
  const [eduDraft, setEduDraft] = useState<EducationEntry[]>([]);

  /* ── Initialize draft from profile ─────────────────────────────── */
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

  /* ── Completion score ──────────────────────────────────────────── */
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

  /* ── Scroll to section ─────────────────────────────────────────── */
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

  /* ── Navigation guard ──────────────────────────────────────────── */
  const handleNavigate = useCallback((to: string) => {
    if (isDirty && !navConfirmed.current) {
      pendingNav.current = to;
      setShowUnsavedModal(true);
      return;
    }
    navConfirmed.current = false;
    navigate(to);
  }, [isDirty, navigate]);

  /* ── IntersectionObserver for active section ───────────────────── */
  useEffect(() => {
    const refs = [
      { ref: identityRef, section: "Identity" },
      { ref: contactRef, section: "Contact" },
      { ref: summaryRef, section: "Summary" },
      { ref: experienceRef, section: "Experience" },
      { ref: educationRef, section: "Education" },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        let best = "";
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

    refs.forEach(({ ref, section }) => {
      if (ref.current) {
        ref.current.setAttribute("data-section", section);
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
  }, [draftInitialized]);

  /* ── Arrow key navigation ──────────────────────────────────────── */
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

  /* ── Click-outside: completion popover ─────────────────────────── */
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

  /* ── Derived values ────────────────────────────────────────────── */
  const missingFields = useMemo(() => {
    return COMPLETION_FIELD_DEFS.filter((def) => !def.check(draft, workDraft, eduDraft));
  }, [draft, workDraft, eduDraft]);

  const perFieldWeight = useMemo(
    () => Math.round(100 / COMPLETION_FIELD_DEFS.length),
    [],
  );

  const aboutCharCount = draft.about.length;
  const aboutCharColor = aboutCharCount >= 500 ? theme.textCritical : aboutCharCount >= 450 ? theme.textWarning : theme.textMuted;

  const hasErrorCount = Object.keys(fieldErrors).length;

  /* ── Editing actions ───────────────────────────────────────────── */
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

  /* ── Ctrl+S save shortcut ──────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (editingSection) handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editingSection, handleSave]);

  /* ── Loading state ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className={`flex h-full items-center justify-center ${theme.page}`}>
        <div className={`flex items-center gap-2 rounded-md border border-border bg-card px-5 py-3 text-sm ${theme.textSecondary} shadow-sm`}>
          <Loader2 className={`h-4 w-4 animate-spin ${theme.textSuccess}`} />
          Loading profile...
        </div>
      </div>
    );
  }

  /* ── Error state ───────────────────────────────────────────────── */
  if (error && !profile) {
    console.error("Profile query error:", error.message);
    return (
      <div className={`flex h-full flex-col items-center justify-center ${theme.page} p-8`}>
        <div className="w-full max-w-md space-y-4">
          <div className={`flex items-center gap-3 rounded-lg border border-danger/20 bg-danger/10 px-5 py-4`}>
            <AlertCircle className={`h-5 w-5 shrink-0 ${theme.textCritical}`} />
            <div>
              <p className={`text-sm font-medium ${theme.textCritical}`}>Couldn&apos;t load profile</p>
              <p className={`mt-1 text-xs ${theme.textCritical} opacity-80`}>{error.message}</p>
            </div>
          </div>
          <ToolbarButton
            icon={RefreshCw}
            label="Retry"
            onClick={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  /* ── Derived display values ────────────────────────────────────── */
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
      bullets: w.description ? w.description.split(/[.!\\n]+/).filter(Boolean).map((s) => s.trim()) : [],
    })),
    education: eduDraft,
  });
  const highlights = normalized.highlights;
  const score = normalized.score;

  function getHighlightTitle(highlight: string): string {
    if (highlight.includes("experience")) return "Calculated from earliest work history start date";
    const plantMatch = highlight.match(/(\d+)\s+(plants|lines|teams)/i);
    if (plantMatch) return "Assigned to: —";
    return "";
  }

  /* ════════════════════════════════════════════════════════════════ */
  /*  RENDER                                                         */
  /* ════════════════════════════════════════════════════════════════ */

  const PROFILE_GUIDE: GuideContent = {
    purpose:
      "Complete profile page with **Personal Info**, **Work History**, and **Education** columns — your profile is visible across LeanSynk for collaboration, task assignment, and identification.",
    quickStart: [
      "Click **Personal Info**, **Work History**, or **Education** in the toolbar to start editing that section.",
      "Fill in fields and click **Save** (or press **Ctrl+S**) to persist changes, or **Cancel** to discard.",
      "Hover over your **avatar** and click the camera icon to upload a profile photo.",
      "Use **Arrow Left/Right** keyboard keys to scroll between the 5 profile sections.",
    ],
    whenToUse: [
      "**First setup** — complete your profile so teammates can identify and find you.",
      "**Update role/contact** — keep your position, email, phone, plant, and department current.",
      "**Add work history** — document your experience with company, role, dates, and descriptions.",
      "**Add education** — record degrees, schools, and graduation periods.",
      "**Profile review** — check your completeness score and fill missing fields from the footer popover.",
    ],
    keyFeatures: [
      "**3-column layout** — Personal Info (left), Work History (center), Education (right) displayed side-by-side.",
      "**Header badges** — highlights, profile quality score (0–100), and rating label displayed under your name.",
      "**Completeness score** — footer bar with percentage and clickable popover listing missing fields.",
      "**Sectioned editing** — edit Personal Info, Work History, or Education independently with inline save/cancel.",
      "**Avatar upload** — hover over your photo and click the camera overlay to upload a new image.",
      "**Field validation** — required fields show inline errors; error count displayed in the toolbar.",
      "**Unsaved changes guard** — navigating away with unsaved edits prompts Save, Discard, or Cancel.",
      "**Keyboard shortcuts** — **Ctrl+S** to save, **Arrow Left/Right** to navigate between sections.",
    ],
    howToUse: [
      "Click **Personal Info** toolbar button to edit name, role, email, phone, location, plant, and department.",
      "Click **Work History** to add or edit roles with company, dates, and description bullets.",
      "Click **Education** to add or edit degrees, schools, and graduation periods.",
      "Click **Save** or press **Ctrl+S** to apply changes; click **Cancel** to discard edits.",
      "Hover over your **avatar** and click the camera icon to upload a new profile photo.",
      "Click the **completion %** in the footer to see which fields are missing and jump directly to them.",
      "Use **Arrow Left/Right** to scroll between sections (Identity, Contact, Summary, Experience, Education).",
    ],
    tips: [
      "A higher **completeness score** helps teammates find and recognize you in the organization.",
      "Add a **profile photo** so your face appears in chats, approvals, and team views.",
      "Keep your **role** and **department** current for accurate task routing and reporting.",
      "Use **Ctrl+S** to save without reaching for the Save button.",
      "The **profile quality score** (header badges) gives you a quick rating from your profile data.",
    ],
    commonMistakes: [
      "Don't leave **required fields** empty — the toolbar shows an error count; you must fix these to save.",
      "Clicking **Cancel** discards ALL unsaved changes in the currently editing section.",
      "Navigating away while editing triggers the **unsaved changes** modal — choose Save or Discard.",
      "Uploaded profile photos are **previewed locally only** — they are not yet persisted to the server.",
    ],
    relatedPages: [
      { title: "**Preferences** — customize app appearance, notifications, and defaults", path: "/system/preferences" },
    ],
  };

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`}>
      {/* ── HEADER ────────────────────────────────────────────────── */}
      <header className={`relative flex items-center gap-4 border-b border-border-major ${theme.header} h-16 shrink-0 px-5`}>
        {/* Avatar */}
        <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarClick}>
          {avatarPreview ? (
            <img src={avatarPreview} alt={fullName || "Avatar"} className="h-10 w-10 rounded-full bg-muted object-cover" />
          ) : avatarError ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-success-foreground text-sm font-bold">
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
          <div className="absolute inset-0 hidden group-hover:flex items-center justify-center rounded-full bg-black/40 transition-opacity">
            <Camera className="h-4 w-4 text-white" />
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>

        {/* Name + role */}
        <div className="min-w-0 flex-1 leading-tight">
          <div className={`text-lg font-semibold ${theme.textPrimary} leading-tight`}>{fullName || "Complete your profile"}</div>
          <div className={`text-sm ${theme.textMuted} leading-tight`}>{draft.role || "Add your position and details"}</div>
        </div>

        {/* Badges — highlights, score, rating */}
        <div className="flex items-center gap-1.5 overflow-hidden shrink-0">
          {highlights.map((h, i) => (
            <span key={i} title={getHighlightTitle(h)} className={`inline-flex h-6 shrink-0 items-center gap-1 rounded border border-border bg-muted/40 px-2 text-[11px] font-medium ${theme.textSecondary}`}>
              {h}
            </span>
          ))}
          {highlights.length > 0 && <div className={`h-5 w-px shrink-0 ${theme.dividerDot}`} />}
          <span title="Profile quality score" className={`inline-flex h-6 shrink-0 items-center gap-1 rounded border border-border bg-muted/40 px-2 text-[11px] font-semibold ${theme.textPrimary}`}>
            {score.value}/100
          </span>
          <span title="Profile completeness rating" className={`inline-flex h-6 shrink-0 items-center gap-1 rounded border border-border bg-muted/40 px-2 text-[11px] font-medium ${theme.textSecondary}`}>
            {score.label}
          </span>
        </div>

        {/* Help button */}
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          title="Page Guide"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground transition-colors"
        >
          <CircleHelp className="h-4 w-4 stroke-current" />
        </button>

        {/* Save error banner */}
        {saveError && !saveSuccess && (
          <div className={`absolute left-0 right-0 top-full z-20 flex items-center gap-2 border-b border-danger/20 bg-danger/10 px-5 py-2 text-sm font-medium text-danger`}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{saveError}</span>
            <button type="button" onClick={() => setSaveError(null)} className="shrink-0 rounded p-0.5 text-danger/60 hover:text-danger">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* ── TOOLBAR ────────────────────────────────────────────────── */}
      <PageToolbar
        leftWidthClass="w-[20%]"
        leftSlot={
          !editingSection ? undefined : (
            <div className="flex items-center gap-2 px-1">
              <span className={`inline-flex items-center gap-1.5 rounded bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning`}>Editing</span>
              <span className={`text-xs font-medium ${theme.textPrimary}`}>
                {editingSection === "profile" ? "Personal Information" : editingSection === "work" ? "Work History" : "Education"}
              </span>
            </div>
          )
        }
        actions={
          editingSection ? (
            <div className="flex items-center gap-1.5">
              {hasErrorCount > 0 && (
                <span className={`text-xs ${theme.textCritical} font-medium`}>{hasErrorCount} error{hasErrorCount > 1 ? "s" : ""}</span>
              )}
              <ToolbarButton icon={Save} label={saving ? "Saving..." : "Save"} onClick={handleSave} disabled={saving} variant="edit" />
              <ToolbarButton icon={X} label="Cancel" onClick={cancelEditing} variant="danger" />
              <span className={`text-[10px] ${theme.textMuted} hidden sm:inline`}>Ctrl+S</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <ToolbarButton icon={Pencil} label="Personal Info" onClick={() => startEditing("profile")} variant="edit" />
              <ToolbarButton icon={Pencil} label="Work History" onClick={() => startEditing("work")} variant="edit" />
              <ToolbarButton icon={Pencil} label="Education" onClick={() => startEditing("edu")} variant="edit" />
              <ToolbarButton icon={X} label="Close" onClick={() => handleNavigate("/control-tower")} />
            </div>
          )
        }
      />

      {/* ── MAIN CONTENT: 3-column workspace layout ───────────────── */}
      <div className="flex-1 overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="grid gap-0 p-0 lg:grid-cols-[2fr_1.7fr_1.3fr] flex-1 min-h-0">

            {/* ═══ Column 1 — Personal Information ════════════════════ */}
            <PersonalInfoColumn
              draft={draft}
              setDraft={setDraft}
              editingSection={editingSection}
              startEditing={startEditing}
              fieldErrors={fieldErrors}
              setFieldErrors={setFieldErrors}
              plants={plants}
              departments={departments}
              roles={roles}
              setDeptTouched={setDeptTouched}
              identityRef={identityRef}
              contactRef={contactRef}
              summaryRef={summaryRef}
              aboutCharCount={aboutCharCount}
              aboutCharColor={aboutCharColor}
              deptError={deptTouched && !draft.department.trim() ? "Department is required." : undefined}
              adminProfileId={adminProfileId}
            />

            {/* ═══ Column 2 — Work History ═══════════════════════════ */}
            <WorkHistoryColumn
              workDraft={workDraft}
              setWorkDraft={setWorkDraft}
              editingSection={editingSection}
              startEditing={startEditing}
              fieldErrors={fieldErrors}
              experienceRef={experienceRef}
              normalized={normalized}
            />

            {/* ═══ Column 3 — Education ══════════════════════════════ */}
            <EducationColumn
              adminProfileId={adminProfileId}
              eduDraft={eduDraft}
              setEduDraft={setEduDraft}
              editingSection={editingSection}
              startEditing={startEditing}
              fieldErrors={fieldErrors}
              educationRef={educationRef}
            />

          </div>
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className={`h-10 shrink-0 border-t border-border-major ${theme.header} px-4 py-1`}>
        <div className="flex items-center justify-between gap-4 h-full">
          <div className="flex items-center gap-2" ref={completionBarRef}>
            <span className={`text-xs ${theme.textMuted}`}>Completion</span>
            <button type="button" onClick={() => setShowCompletionPopover((prev) => !prev)} className="flex items-center gap-2 group">
              <div className="w-28 cursor-pointer">
                <div className={`h-2 rounded-full ${theme.loadTrack}`}>
                  <div className={`h-2 rounded-full bg-success transition-all duration-500 ease-out`} style={{ width: `${completion}%` }} />
                </div>
              </div>
              <span className={`text-xs font-semibold ${theme.textPrimary}`}>{completion}%</span>
            </button>
          </div>
          <div className="flex flex-col items-end gap-0.5 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className={`font-semibold uppercase tracking-[0.18em] ${theme.textMuted}`}>From</span>
              <span className={`font-medium ${theme.textSecondary}`}>{formatMemberSince(profile?.createdAt ?? "")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`font-semibold uppercase tracking-[0.18em] ${theme.textMuted}`}>Updated</span>
              <span className={`font-medium ${theme.textSecondary}`}>{formatLastUpdated(profile?.updatedAt ?? "")}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Completion popover ─────────────────────────────────────── */}
      {showCompletionPopover && (
        <div ref={completionPopoverRef} className={`fixed bottom-16 right-8 z-50 w-64 rounded-lg border border-border ${theme.dropdown} p-3 shadow-lg`}>
          <div className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${theme.textMuted}`}>Missing fields</div>
          {missingFields.length > 0 ? (
            <div className="space-y-1">
              {missingFields.map((field) => (
                <button key={field.key} type="button" onClick={() => scrollToField(field.key)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs ${theme.textSecondary} transition ${theme.interactiveRow}`}>
                  <span className={theme.textMuted}>●</span>
                  <span className="flex-1 text-left">{field.label}</span>
                  <span className={`font-medium ${theme.textMuted}`}>{perFieldWeight}%</span>
                </button>
              ))}
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 text-xs ${theme.textSuccess} font-medium`}>
              <Check className="h-3.5 w-3.5" /> All fields complete!
            </div>
          )}
        </div>
      )}

      {/* ── Unsaved changes modal ──────────────────────────────────── */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30" onClick={confirmCancel} />
          <div className={`relative ${theme.modal} p-5 w-[380px] max-w-[90vw]`}>
            <div className="text-sm font-bold text-foreground mb-1">Unsaved changes</div>
            <p className={`text-xs ${theme.textMuted} mb-4`}>You have unsaved edits. What would you like to do?</p>
            <div className="flex items-center justify-end gap-2">
              <ToolbarButton
                icon={Check}
                label={saving ? "Saving..." : "Save & continue"}
                onClick={confirmSave}
                disabled={saving}
                variant="success"
              />
              <ToolbarButton
                icon={X}
                label="Discard"
                onClick={confirmDiscard}
                variant="destructive"
              />
              <ToolbarButton
                icon={X}
                label="Cancel"
                onClick={confirmCancel}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────────── */}
      {saveSuccess && !saveError && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-success px-4 py-2.5 text-xs font-medium text-success-foreground shadow-lg transition-opacity duration-300">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          {saveSuccess}
        </div>
      )}

      {/* ── Page Guide Modal ── */}
      <PageGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} content={PROFILE_GUIDE} pageTitle="My Profile" />
    </div>
  );
}
