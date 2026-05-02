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
  const chevronClass = isDropdownOpen ? "app-settings__dropdown-chevron app-settings__dropdown-chevron--open" : "app-settings__dropdown-chevron";

  return (
    <section className="module-page">
      <header className="module-page__header">
        <div className="module-page__icon">
          <Cog className="module-page__icon-svg" />
        </div>
        <div>
          <h1 className="module-page__title">Application Settings</h1>
          <p className="module-page__description">
            Manage storage, backups, security, connections, and system functionality dashboard for the control model.
          </p>
        </div>
        <div className="app-settings__dropdown">
          <button
            className="app-settings__dropdown-trigger"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
          >
            <span>{activeTabLabel}</span>
            <ChevronDown size={16} className={chevronClass} />
          </button>
          {isDropdownOpen && (
            <div className="app-settings__dropdown-menu">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.value;
                const itemClass = isActive ? "app-settings__dropdown-item app-settings__dropdown-item--active" : "app-settings__dropdown-item";
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
      </header>

      <div className="app-settings__content">
        {activeTab === "overview" && (
          <div className="app-settings__overview">
            <p>Application settings overview and configuration options will be displayed here.</p>
          </div>
        )}
        {activeTab === "graphql-status" && <GraphqlStatusPage />}
      </div>
    </section>
  );
}