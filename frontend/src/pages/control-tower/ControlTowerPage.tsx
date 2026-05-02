import { useQuery } from "@apollo/client/react";
import { Monitor } from "lucide-react";
import { DASHBOARD_QUERY } from "@/graphql/system";
import { useDocumentTitle } from "@/hooks";
import type { DashboardQueryData } from "@/types/dashboard";
import { asPercent } from "@/utils";
import { DomainCard } from "./components/DomainCard";
import { KpiTile } from "./components/KpiTile";

export function ControlTowerPage() {
  const { data, loading, error } = useQuery<DashboardQueryData>(DASHBOARD_QUERY);

  useDocumentTitle("Control Tower - LeanSync");

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-3 p-6 text-[var(--text-secondary)]">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" aria-hidden="true" />
        <span>Loading Control Tower...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-[var(--danger)] bg-[var(--surface-2)] p-4 text-[var(--text-primary)]">
          <p className="font-medium">Unable to reach the GraphQL API. Make sure the backend is running.</p>
          <code className="mt-2 block text-xs">{error?.message}</code>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <Monitor className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Control Tower</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Live operational overview - All Lines</p>
          </div>
        </div>
        <span className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">{data.health}</span>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Key metrics">
        <KpiTile
          label="OEE"
          value={asPercent(data.kpiSnapshot.oee)}
          sub="Overall Equipment Effectiveness"
          status={data.kpiSnapshot.oee >= 0.8 ? "ok" : "warn"}
        />
        <KpiTile
          label="Lead Time"
          value={data.kpiSnapshot.leadTimeMinutes.toFixed(1) + " min"}
          sub="Average cycle lead time"
        />
        <KpiTile
          label="Active Cycles"
          value={data.executionSnapshot.activeCycles}
          sub="In-progress production cycles"
          status={data.executionSnapshot.activeCycles > 0 ? "ok" : "idle"}
        />
        <KpiTile
          label="Open Kaizens"
          value={data.improvementSnapshot.openKaizens}
          sub="Improvement actions open"
          status={data.improvementSnapshot.openKaizens > 0 ? "warn" : "ok"}
        />
        <KpiTile
          label="Bottleneck"
          value={data.kpiSnapshot.bottleneckResourceCode || "None"}
          sub="Current constraint resource"
          status={data.kpiSnapshot.bottleneckResourceCode ? "warn" : "idle"}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Domain snapshots">
        <DomainCard
          title="Manufacturing"
          rows={[
            { label: "Plants", value: data.manufacturingSnapshot.plantCount },
            { label: "Departments", value: data.manufacturingSnapshot.departmentCount },
            { label: "Resources", value: data.manufacturingSnapshot.resourceCount },
          ]}
        />
        <DomainCard
          title="Process"
          rows={[
            { label: "Product Models", value: data.processSnapshot.productModelCount },
            { label: "Process Flows", value: data.processSnapshot.processFlowCount },
            { label: "Active Flows", value: data.processSnapshot.activeFlowCount },
          ]}
        />
        <DomainCard
          title="Execution"
          rows={[
            { label: "Open Work Orders", value: data.executionSnapshot.openWorkOrders },
            { label: "Active Cycles", value: data.executionSnapshot.activeCycles },
            { label: "Downtime 24h", value: data.executionSnapshot.downtimeEventsLast24h },
          ]}
        />
        <DomainCard
          title="Improvement"
          rows={[
            { label: "Open Kaizens", value: data.improvementSnapshot.openKaizens },
            { label: "Gemba Walks week", value: data.improvementSnapshot.gembaWalksThisWeek },
            { label: "Observations week", value: data.improvementSnapshot.observationsThisWeek },
          ]}
        />
      </section>
    </div>
  );
}
