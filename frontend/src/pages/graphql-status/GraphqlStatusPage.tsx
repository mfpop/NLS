import { useQuery } from "@apollo/client/react";
import { DASHBOARD_QUERY } from "@/graphql/system";
import type { DashboardQueryData } from "@/types/dashboard";

export function GraphqlStatusPage() {
  const { data, loading, error } = useQuery<DashboardQueryData>(DASHBOARD_QUERY);

  return (
    <section className="p-6">
      <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">GraphQL Status</h1>
        <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
          <p>Loading: {loading ? "yes" : "no"}</p>
          <p>Error: {error ? "yes" : "no"}</p>
          <p>Health: {data?.health ?? "unknown"}</p>
        </div>
      </div>
    </section>
  );
}
