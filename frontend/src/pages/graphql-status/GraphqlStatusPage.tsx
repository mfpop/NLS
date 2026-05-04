import { useQuery } from "@apollo/client/react";
import { DASHBOARD_QUERY } from "@/graphql/system";
import type { DashboardQueryData } from "@/types/dashboard";
import { theme } from "../../styles/themeTokens";

export function GraphqlStatusPage() {
  const { data, loading, error } = useQuery<DashboardQueryData>(DASHBOARD_QUERY);

  return (
    <section className="p-0 m-0 space-y-6">
      <header className={`border shadow-sm h-16 flex items-center ${theme.header}`}>
        <h1 className={`text-2xl font-semibold ${theme.textPrimary}`}>GraphQL Status</h1>
      </header>
      <div className={`border p-6 shadow-sm ${theme.card}`}>
        <div className={`space-y-2 text-sm ${theme.textSecondary}`}>
          <p>Loading: {loading ? "yes" : "no"}</p>
          <p>Error: {error ? "yes" : "no"}</p>
          <p>Health: {data?.health ?? "unknown"}</p>
        </div>
      </div>
    </section>
  );
}

