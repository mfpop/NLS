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
      <div className="ct-loading">
        <span className="ct-loading__spinner" aria-hidden="true" />
        <span>Loading Control Tower...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="ct-error">
        <p>Unable to reach the GraphQL API. Make sure the backend is running.</p>
        <code>{error?.message}</code>
      </div>
    );
  }

  return (
    <div className="ct-page">
      <header className="ct-page__header">
        <div className="ct-page__heading">
          <div className="ct-page__icon">
            <Monitor className="ct-page__icon-svg" />
          </div>
          <div>
            <h1 className="ct-page__title">Control Tower</h1>
            <p className="ct-page__subtitle">Live operational overview - All Lines</p>
          </div>
        </div>
        <span className="ct-health-badge ct-health-badge--ok">{data.health}</span>
      </header>

      <section className="ct-kpi-strip" aria-label="Key metrics">
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

      <section className="ct-domains" aria-label="Domain snapshots">
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
