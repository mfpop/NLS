import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  X, Zap, BookOpenText, HelpCircle, Sparkles,
  ListChecks, Lightbulb, AlertTriangle, ExternalLink,
} from "lucide-react";

/* ── Helpers ── */

/** Renders **bold** markers as <strong> */
function BoldText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

/** List item with dot and optional bold text */
function GuideItem({ text }: { text: string }) {
  return (
    <li className="text-xs text-muted-foreground leading-relaxed pl-4 relative">
      <span className="absolute left-0 top-[5px] h-1 w-1 rounded-full bg-border" />
      <BoldText text={text} />
    </li>
  );
}

/* ── Interfaces ── */

export interface GuideContent {
  purpose: string;
  quickStart?: string[];
  whenToUse: string[];
  keyFeatures: string[];
  howToUse: string[];
  tips: string[];
  commonMistakes?: string[];
  relatedPages?: { title: string; path: string }[];
}

/* ── Section identity ── */

type SectionId =
  | "quickStart" | "purpose" | "whenToUse" | "keyFeatures"
  | "howToUse" | "tips" | "commonMistakes" | "relatedPages";

interface SectionDef {
  id: SectionId;
  label: string;
  icon: React.ReactNode;
  present: boolean;
}

/* ── Section icons (reusable for left list + right pane header) ── */

const SECTION_ICONS: Record<SectionId, React.ReactNode> = {
  quickStart: <Zap className="h-4 w-4" />,
  purpose: <BookOpenText className="h-4 w-4" />,
  whenToUse: <HelpCircle className="h-4 w-4" />,
  keyFeatures: <Sparkles className="h-4 w-4" />,
  howToUse: <ListChecks className="h-4 w-4" />,
  tips: <Lightbulb className="h-4 w-4" />,
  commonMistakes: <AlertTriangle className="h-4 w-4" />,
  relatedPages: <ExternalLink className="h-4 w-4" />,
};

/* ── Callout ── */

function Callout({ variant, children }: { variant: "tip" | "warning"; children: React.ReactNode }) {
  const base = "flex items-start gap-3 px-3 py-2.5 min-h-[44px] rounded-md text-xs transition-all duration-150";
  const styles = {
    tip: `${base} border border-emerald-400/25 bg-emerald-500/[0.04] text-emerald-700 dark:text-emerald-300`,
    warning: `${base} border border-amber-400/25 bg-amber-500/[0.04] text-amber-700 dark:text-amber-300`,
  };
  const icons = {
    tip: <Lightbulb className="h-6 w-6 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />,
  };

  return (
    <div className={styles[variant]}>
      {icons[variant]}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* ── Props ── */

interface PageGuideModalProps {
  open: boolean;
  onClose: () => void;
  content: GuideContent;
  pageTitle: string;
}

/* ── Component ── */

export function PageGuideModal({ open, onClose, content, pageTitle }: PageGuideModalProps) {
  const [selectedSection, setSelectedSection] = useState<SectionId>("quickStart");

  /* ── Build section list ── */
  const sections: SectionDef[] = [
    { id: "quickStart", label: "Quick Start", icon: SECTION_ICONS.quickStart, present: !!content.quickStart?.length },
    { id: "purpose", label: "Purpose", icon: SECTION_ICONS.purpose, present: !!content.purpose },
    { id: "whenToUse", label: "When To Use", icon: SECTION_ICONS.whenToUse, present: !!content.whenToUse.length },
    { id: "keyFeatures", label: "Key Features", icon: SECTION_ICONS.keyFeatures, present: !!content.keyFeatures.length },
    { id: "howToUse", label: "How To Use", icon: SECTION_ICONS.howToUse, present: !!content.howToUse.length },
    { id: "tips", label: "Tips", icon: SECTION_ICONS.tips, present: !!content.tips.length },
    { id: "commonMistakes", label: "Common Mistakes", icon: SECTION_ICONS.commonMistakes, present: !!content.commonMistakes?.length },
    { id: "relatedPages", label: "Related Pages", icon: SECTION_ICONS.relatedPages, present: !!content.relatedPages?.length },
  ].filter((s): s is SectionDef => s.present);

  /* ── Reset selected section on open ── */
  useEffect(() => {
    if (open) setSelectedSection("quickStart");
  }, [open]);

  /* ── Esc to close ── */
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  /* ── Focus selected button when it changes ── */
  useEffect(() => {
    if (!open) return;
    const btn = document.querySelector<HTMLButtonElement>(`[data-section-id="${selectedSection}"]`);
    btn?.focus();
  }, [selectedSection, open]);

  /* ── Keyboard navigation ── */
  function handleListKeyDown(e: React.KeyboardEvent, idx: number) {
    const buttons = (e.currentTarget.parentElement?.parentElement?.querySelectorAll("button") ?? []) as NodeListOf<HTMLButtonElement>;
    if (buttons.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (idx + 1) % sections.length;
      setSelectedSection(sections[next].id);
      buttons[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (idx - 1 + sections.length) % sections.length;
      setSelectedSection(sections[prev].id);
      buttons[prev]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedSection(sections[idx].id);
    }
  }

  if (!open) return null;

  /* ── Render content for the selected section ── */
  function renderContent(id: SectionId) {
    switch (id) {
      case "quickStart":
        return (
          <div className="space-y-2">
            {content.quickStart?.map((item, i) => (
              <Callout key={i} variant="tip"><BoldText text={item} /></Callout>
            ))}
          </div>
        );
      case "purpose":
        return <p className="text-sm text-muted-foreground leading-relaxed"><BoldText text={content.purpose} /></p>;
      case "whenToUse":
        return <ul className="space-y-1">{content.whenToUse.map((item, i) => <GuideItem key={i} text={item} />)}</ul>;
      case "keyFeatures":
        return <ul className="space-y-1">{content.keyFeatures.map((item, i) => <GuideItem key={i} text={item} />)}</ul>;
      case "howToUse":
        return <ul className="space-y-1">{content.howToUse.map((item, i) => <GuideItem key={i} text={item} />)}</ul>;
      case "tips":
        return (
          <div className="space-y-2">
            {content.tips.map((item, i) => (
              <Callout key={i} variant="tip"><BoldText text={item} /></Callout>
            ))}
          </div>
        );
      case "commonMistakes":
        return (
          <div className="space-y-2">
            {content.commonMistakes?.map((item, i) => (
              <Callout key={i} variant="warning"><BoldText text={item} /></Callout>
            ))}
          </div>
        );
      case "relatedPages":
        return (
          <ul className="space-y-1">
            {content.relatedPages?.map((page, i) => (
              <li key={i}>
                {page.path ? (
                  <Link to={page.path} onClick={onClose} className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors"><BoldText text={page.title} /></Link>
                ) : (
                  <span className="text-xs text-muted-foreground"><BoldText text={page.title} /></span>
                )}
              </li>
            ))}
          </ul>
        );
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Page guide for ${pageTitle}`}
        className="fixed left-1/2 top-1/2 z-40 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 bg-card rounded-2xl border border-border/30 shadow-2xl flex flex-col max-h-[85vh]"
      >
        {/* ── Header: 3-column layout ── */}
        <header className="sticky top-0 z-10 flex h-16 items-center border-b border-border/30 bg-card px-5 rounded-t-2xl shrink-0">
          {/* LEFT: guide icon */}
          <div className="flex w-12 shrink-0 items-center justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <HelpCircle className="h-4 w-4 text-primary stroke-current" />
            </div>
          </div>

          {/* CENTER: title + subtitle (same x-position) */}
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h2 className="text-base font-semibold text-foreground leading-tight text-start">Page Guide</h2>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5 text-start">{pageTitle}</p>
          </div>

          {/* RIGHT: red close button */}
          <div className="flex w-12 shrink-0 items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close guide"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:shadow-sm active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
            >
              <X className="h-5 w-5 stroke-current" />
            </button>
          </div>
        </header>

        {/* ── Body: master-detail layout ── */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* LEFT: section list (fixed, no scroll) */}
          <nav className="shrink-0 w-56 border-r border-border/50 py-3" aria-label="Guide sections">
            <ul role="listbox" aria-label="Guide sections" className="space-y-0.5 px-2">
              {sections.map((s, i) => (
                <li key={s.id} role="option" aria-selected={selectedSection === s.id}>
                  <button
                    type="button"
                    data-section-id={s.id}
                    onClick={() => setSelectedSection(s.id)}
                    onKeyDown={(e) => handleListKeyDown(e, i)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      selectedSection === s.id
                        ? "bg-primary/15 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span className="shrink-0 text-current">{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* RIGHT: details pane (scrollable) */}
          <div className="flex-1 min-w-0 overflow-y-auto px-5 py-4">
            {/* Section header */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/30">
              <span className="text-primary shrink-0">{SECTION_ICONS[selectedSection]}</span>
              <h3 className="text-sm font-semibold text-foreground">
                {sections.find((s) => s.id === selectedSection)?.label}
              </h3>
            </div>
            {/* Section content */}
            {renderContent(selectedSection)}
          </div>
        </div>
      </div>
    </>
  );
}
