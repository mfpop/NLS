import { useQuery } from "@apollo/client/react";
import { SYSTEM_HEALTH_QUERY } from "@/graphql/system";
import { theme } from "../../styles/themeTokens";

interface SystemHealthData {
  systemHealth: {
    graphqlStatus: string;
    databaseStatus: string;
    serverTime: string;
    version: string;
  };
}

export function GraphqlStatusPage() {
  const { data, loading, error } = useQuery<SystemHealthData>(SYSTEM_HEALTH_QUERY);

  if (loading) {
    return (
      <section className="p-0 m-0 space-y-6">
        <header className={`border shadow-sm h-16 flex items-center ${theme.header}`}>
          <h1 className={`text-2xl font-semibold ${theme.textPrimary}`}>GraphQL Status</h1>
        </header>
        <div className={`border p-6 shadow-sm ${theme.card}`}>
          <p className={`text-sm ${theme.textSecondary}`}>Loading...</p>
        </div>
      </section>
    );
  }

  if (error) {
    console.error("GraphQL Status error:", error);
    return (
      <section className="p-0 m-0 space-y-6">
        <header className={`border shadow-sm h-16 flex items-center ${theme.header}`}>
          <h1 className={`text-2xl font-semibold ${theme.textPrimary}`}>GraphQL Status</h1>
        </header>
        <div className={`border p-6 shadow-sm ${theme.card}`}>
          <p className="text-sm text-danger">ERROR</p>
          <p className={`text-xs mt-1 ${theme.textMuted}`}>{error.message}</p>
        </div>
      </section>
    );
  }

  const health = data?.systemHealth;
  const graphqlOk = health?.graphqlStatus === "OK";

  return (
    <section className="p-0 m-0 space-y-6">
      <header className={`border shadow-sm h-16 flex items-center ${theme.header}`}>
        <h1 className={`text-2xl font-semibold ${theme.textPrimary}`}>GraphQL Status</h1>
      </header>
      <div className={`border p-6 shadow-sm ${theme.card}`}>
        <div className="space-y-2 text-sm">
          <p>GraphQL Status: <span className={graphqlOk ? "text-success font-semibold" : "text-danger font-semibold"}>{graphqlOk ? "OK" : "ERROR"}</span></p>
          <p>Database Status: <span className={health?.databaseStatus === "OK" ? "text-success font-semibold" : "text-danger font-semibold"}>{health?.databaseStatus ?? "unknown"}</span></p>
          <p>Server Time: <span className={theme.textSecondary}>{health?.serverTime ?? "unknown"}</span></p>
          <p>Version: <span className={theme.textSecondary}>{health?.version ?? "unknown"}</span></p>
        </div>
      </div>
    </section>
  );
}
