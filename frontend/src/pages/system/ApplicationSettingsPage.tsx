import { useState } from "react";
import { Cog, ChevronDown } from "lucide-react";
import { GraphqlStatusPage } from "@/pages/graphql-status";

type SettingsTab = "overview" | "graphql-status";

export function ApplicationSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("overview");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const tabs: { value: SettingsTab; label: string }[] = [
    { value: "overview", label: "Overview" },
    { value: "graphql-status", label: "GraphQL Status" },
  ];

  const activeTabLabel = tabs.find((t) => t.value === activeTab)?.label || "Overview";
  const chevronClass = "h-4 w-4 transition " + (isDropdownOpen ? "rotate-180" : "rotate-0");

  return (
    <section className="p-6">
      <header className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <Cog className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Application Settings</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Manage storage, backups, security, connections, and system functionality dashboard for the control model.
            </p>
          </div>
          <div className="relative">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-1)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-expanded={isDropdownOpen}
            >
              <span>{activeTabLabel}</span>
              <ChevronDown size={16} className={chevronClass} />
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-1)] p-1 shadow-lg">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.value;
                  const itemClass =
                    "block w-full rounded-md px-3 py-2 text-left text-sm " +
                    (isActive
                      ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]");
                  return (
                    <button
                      key={tab.value}
                      className={itemClass}
                      onClick={() => {
                        setActiveTab(tab.value);
                        setIsDropdownOpen(false);
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mt-4">
        {activeTab === "overview" && (
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-6 text-sm text-[var(--text-secondary)] shadow-sm">
            <p>Application settings overview and configuration options will be displayed here.</p>
          </div>
        )}
        {activeTab === "graphql-status" && <GraphqlStatusPage />}
      </div>
    </section>
  );
}