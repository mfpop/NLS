import { useQuery } from "@apollo/client/react";
import { DASHBOARD_QUERY } from "@/graphql/system";
import type { DashboardQueryData } from "@/types/dashboard";

export function GraphqlStatusPage() {
  const { data, loading, error } = useQuery<DashboardQueryData>(DASHBOARD_QUERY);

  return (
    <section>
      <h1>GraphQL Status</h1>
      <p>Loading: {loading ? "yes" : "no"}</p>
      <p>Error: {error ? "yes" : "no"}</p>
      <p>Health: {data?.health ?? "unknown"}</p>
    </section>
  );
}
