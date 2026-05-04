import { useState } from "react";
import { Cog, ChevronDown } from "lucide-react";
import { GraphqlStatusPage } from "@/pages/graphql-status";
import { theme } from "../../styles/themeTokens";

type SettingsTab = "overview" | "graphql-status";

export function ApplicationSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("overview");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const tabs: { value: SettingsTab; label: string }[] = [
    { value: "overview", label: "Overview" },
    { value: "graphql-status", label: "GraphQL Status" },
  ];

  const activeTabLabel = tabs.find((t) => t.value === activeTab)?.label || "Overview";

  return (
    <section className="p-0 m-0">
      <header className={`flex items-center justify-between border shadow-sm h-16 ${theme.header}`}>
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className={`inline-flex h-12 w-12 flex-none items-center justify-center rounded-lg ${theme.iconBoxEmerald}`}>
            <Cog className="h-5 w-5 stroke-current" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className={`text-2xl font-semibold tracking-tight ${theme.textPrimary}`}>Application Settings</h1>
            <p className={`mt-1 text-sm ${theme.textSecondary}`}>
              Manage storage, backups, security, connections, and system functionality dashboard for the control model.
            </p>
          </div>
        </div>
        <div className="relative flex-none">
          <button
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${theme.buttonSecondary}`}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
          >
            <span className="truncate max-w-28">{activeTabLabel}</span>
            <ChevronDown size={15} className={"stroke-current transition " + (isDropdownOpen ? "rotate-180" : "rotate-0")} />
          </button>
          {isDropdownOpen && (
            <div className={`absolute right-0 z-10 mt-1 w-44 rounded-lg border p-1 shadow-lg ${theme.dropdown}`}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    className={
                      "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm " +
                      (isActive
                        ? `font-medium ${theme.iconBoxEmerald}`
                        : `${theme.textSecondary} ${theme.interactiveRow}`)
                    }
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
      </header>

      <div className="mt-4">
        {activeTab === "overview" && (
          <div className={`rounded-xl border p-6 text-sm shadow-sm ${theme.card} ${theme.textSecondary}`}>
            <p>Application settings overview and configuration options will be displayed here.</p>
          </div>
        )}
        {activeTab === "graphql-status" && <GraphqlStatusPage />}
      </div>
    </section>
  );
}