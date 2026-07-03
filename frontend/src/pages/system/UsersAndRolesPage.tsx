import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { LEFT_COLUMN_WIDTH_CLASS } from "@/components/layout/layoutWidths";
import { UsersTab } from "./users-and-access/UsersTab";
import { RolesTab } from "./users-and-access/RolesTab";
import { AccessGroupsTab } from "./users-and-access/AccessGroupsTab";
import { ToolbarContext, type ToolbarConfig } from "./users-and-access/toolbarContext";

export function UsersAndRolesPage() {
  const location = useLocation();
  const [toolbarConfig, setToolbarConfig] = useState<ToolbarConfig | null>(null);
  const [footer, setFooter] = useState<ReactNode>(null);

  const activeTab = location.pathname.endsWith("/roles") ? "roles"
    : location.pathname.endsWith("/access-groups") ? "access-groups"
    : "users";

  return (
    <ToolbarContext.Provider value={{ setToolbar: setToolbarConfig, setFooter }}>
      <AppPageLayout
        icon={<ShieldCheck />}
        iconClass="bg-blue-100 text-blue-600"
        title="Users & Access"
        subtitle="Manage user profiles, roles, permissions, and organizational access."
        toolbar={
          toolbarConfig ? (
            <PageToolbar
              searchValue={toolbarConfig.searchValue}
              onSearchChange={toolbarConfig.onSearchChange}
              searchPlaceholder={toolbarConfig.searchPlaceholder}
              leftWidthClass={toolbarConfig.leftWidthClass ?? LEFT_COLUMN_WIDTH_CLASS}
              leftSlot={toolbarConfig.leftSlot}
              filters={toolbarConfig.filters}
              actions={toolbarConfig.actions}
            />
          ) : undefined
        }
        footer={footer}
      >
        {activeTab === "users" ? <UsersTab /> : activeTab === "roles" ? <RolesTab /> : <AccessGroupsTab />}
      </AppPageLayout>
    </ToolbarContext.Provider>
  );
}
