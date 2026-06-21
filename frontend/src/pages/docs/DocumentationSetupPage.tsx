import { useState } from "react";
import {
  Settings,
  FileText,
  Layers,
  Shield,
  Clock,
  Copy,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { theme } from "@/styles/themeTokens";

interface SetupRow {
  label: string;
  description: string;
  status: "not-configured" | "requires-setup";
}

interface SetupSection {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof FileText;
  rows: SetupRow[];
}

const SECTIONS: SetupSection[] = [
  {
    id: "document-types",
    title: "Document Types",
    subtitle: "Define which document categories are active in the workspace.",
    icon: FileText,
    rows: [
      { label: "Standard Operating Procedures", description: "Core process documentation for recurring operations.", status: "not-configured" },
      { label: "Work Instructions", description: "Step-by-step task-level guidance for operators.", status: "not-configured" },
      { label: "Quality Documents", description: "Inspection criteria, control plans, and audit templates.", status: "not-configured" },
      { label: "Safety Procedures", description: "Hazard assessments, lockout/tagout, and emergency protocols.", status: "not-configured" },
    ],
  },
  {
    id: "target-structure",
    title: "Target Structure",
    subtitle: "Map documentation to production structure levels.",
    icon: Layers,
    rows: [
      { label: "Plant-level documents", description: "Documents that apply across the entire plant.", status: "not-configured" },
      { label: "Production line documents", description: "Documents scoped to a specific production line.", status: "not-configured" },
      { label: "Department documents", description: "Documents scoped to a functional department.", status: "not-configured" },
      { label: "Resource group documents", description: "Documents scoped to a resource group or work cell.", status: "not-configured" },
    ],
  },
  {
    id: "access-ownership",
    title: "Access & Ownership",
    subtitle: "Control who can view, edit, and approve documents.",
    icon: Shield,
    rows: [
      { label: "Document owner roles", description: "Assign ownership by role (e.g., Department Lead, Quality Manager).", status: "requires-setup" },
      { label: "Viewer permissions", description: "Define who can read published documents.", status: "requires-setup" },
      { label: "Editor permissions", description: "Define who can create and modify draft documents.", status: "requires-setup" },
    ],
  },
  {
    id: "review-rules",
    title: "Review Rules",
    subtitle: "Set review cycles, expiry alerts, and re-approval triggers.",
    icon: Clock,
    rows: [
      { label: "Review cycle defaults", description: "Default interval between scheduled reviews (e.g., 12 months).", status: "not-configured" },
      { label: "Expiry notifications", description: "Alert document owners before a document expires.", status: "not-configured" },
      { label: "Re-approval triggers", description: "Require re-approval when linked process changes.", status: "not-configured" },
    ],
  },
  {
    id: "controlled-copies",
    title: "Controlled Copies",
    subtitle: "Manage printed and distributed copies of controlled documents.",
    icon: Copy,
    rows: [
      { label: "Print tracking", description: "Log when controlled copies are printed.", status: "not-configured" },
      { label: "Distribution register", description: "Track who holds which copy and revision.", status: "not-configured" },
      { label: "Obsolescence handling", description: "Protocol for recalling outdated printed copies.", status: "not-configured" },
    ],
  },
];

function StatusBadge({ status }: { status: SetupRow["status"] }) {
  if (status === "requires-setup") {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold ${theme.textWarning}`}>
        Requires setup
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold ${theme.textMuted}`}>
      Not configured
    </span>
  );
}

function SectionPanel({ section }: { section: SetupSection }) {
  return (
    <div>
      <div className="pb-3 mb-3 border-b border-border/70">
        <h2 className={`text-sm font-semibold ${theme.textPrimary}`}>{section.title}</h2>
        <p className={`text-xs ${theme.textMuted} mt-0.5`}>{section.subtitle}</p>
      </div>
      <div className={`divide-y divide-border/40`}>
        {section.rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2.5">
            <div className="min-w-0 flex-1 mr-4">
              <div className={`text-sm font-medium ${theme.textPrimary}`}>{row.label}</div>
              <div className={`text-xs ${theme.textMuted} mt-0.5`}>{row.description}</div>
            </div>
            <StatusBadge status={row.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DocumentationSetupPage() {
  const [activeCategory, setActiveCategory] = useState(SECTIONS[0].id);
  const activeSection = SECTIONS.find((s) => s.id === activeCategory) ?? SECTIONS[0];

  return (
    <div className={`flex flex-col h-full overflow-hidden ${theme.page}`}>
      <PageHeader
        icon={<Settings className="h-5 w-5 stroke-current" />}
        iconClass={theme.iconBoxBrand}
        title="Documentation Setup"
        subtitle="Configure documentation workspace, standards access, and controlled document setup."
      />

      {/* ── BODY: two-column layout (20/80) ── */}
      <div className="flex flex-1 min-h-0">
        {/* Left column — Section nav (20%) */}
        <nav className="w-[20%] shrink-0 border-r border-border overflow-y-auto">
          <div className="py-2">
            {SECTIONS.map((section) => {
              const active = activeCategory === section.id;
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveCategory(section.id)}
                  className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
                    active
                      ? "bg-success/10 border-l-2 border-success"
                      : `${theme.interactiveRow} border-l-2 border-transparent`
                  }`}
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                    active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium leading-tight ${
                      active ? "text-success" : `${theme.textSecondary}`
                    }`}>
                      {section.title}
                    </div>
                    <div className={`text-[10px] ${theme.textMuted} leading-tight mt-px truncate`}>{section.subtitle}</div>
                  </div>
                  <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${
                    active ? "text-success" : "text-muted-foreground/40"
                  }`} />
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right column — Setup panel (80%) */}
        <div className="w-[80%] min-w-0 overflow-y-auto p-5">
          <div className="mx-auto max-w-3xl space-y-5">
            <SectionPanel section={activeSection} />

            <div className={`border-t border-border/40 px-4 pt-6 text-center`}>
              <p className={`text-xs ${theme.textMuted}`}>
                Additional configuration options will appear here once the documentation backend is connected.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className={`h-10 shrink-0 border-t border-border px-5 flex items-center justify-between`}>
        <span className={`text-[11px] ${theme.textMuted}`}>
          {SECTIONS.length} configuration sections · {SECTIONS.reduce((sum, s) => sum + s.rows.filter((r) => r.status !== "not-configured").length, 0)} items require setup
        </span>
      </footer>
    </div>
  );
}
