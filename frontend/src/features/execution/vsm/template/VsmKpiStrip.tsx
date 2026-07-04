// ── Enhanced KPI summary strip for VSM chart ──
// Features: animated counters, color gradients, sparkline bars, compact responsive design

import { useEffect, useRef, useState } from "react";

interface KpiData {
  leadTime: string;
  vaTime: string;
  vaPercent: number;
  vaPercentLabel: string;
  taktDisplay: string;
  taktStatus: string;
  taktMissingReason: string | null;
  bottleneck: string | null;
  totalWip: number;
  demandRate: string | null;
}

interface Props {
  data: KpiData;
  onDemandEdit?: () => void;
  onTaktEdit?: () => void;
}

/* ── Animated counter ── */
function AnimatedValue({ value, suffix = "" }: { value: string | number; suffix?: string }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (prevRef.current !== value) {
      setAnimating(true);
      const timer = setTimeout(() => {
        setDisplay(value);
        setAnimating(false);
      }, 300);
      prevRef.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <span className={`text-[12px] font-bold tabular-nums transition-all duration-300 ${
      animating ? "text-primary scale-110" : ""
    }`}>
      {display}{suffix}
    </span>
  );
}

/* ── VA % sparkline bar ── */
function VaSparkline({ pct }: { pct: number }) {
  const barColor = pct < 5 ? "bg-danger/100" : pct < 15 ? "bg-warning/100" : pct < 30 ? "bg-warning" : "bg-success/100";
  return (
    <div className="w-12 h-1.5 bg-muted/80 rounded-full overflow-hidden shrink-0">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

/** Chip with subtle background pill, label + value. */
function KpiChip({
  label, value, tone = "default", onClick, title, sparkline,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "good" | "warn" | "bad" | "purple" | "amber";
  onClick?: () => void;
  title?: string;
  sparkline?: React.ReactNode;
}) {
  const toneStyles: Record<string, { wrap: string; label: string; value: string; icon: string }> = {
    default: { wrap: "bg-muted border-border hover:bg-muted", label: "text-muted-foreground", value: "text-foreground", icon: "text-muted-foreground/60" },
    good:    { wrap: "bg-success/10 border-success/20 hover:bg-success/15", label: "text-success", value: "text-success", icon: "text-success" },
    warn:    { wrap: "bg-warning/10 border-warning/20 hover:bg-warning/15", label: "text-warning", value: "text-warning", icon: "text-warning" },
    bad:     { wrap: "bg-danger/10 border-danger/20 hover:bg-danger/15", label: "text-danger", value: "text-danger", icon: "text-danger" },
    purple:  { wrap: "bg-accent/10 border-accent/20 hover:bg-accent/15", label: "text-accent-foreground", value: "text-accent-foreground", icon: "text-accent-foreground" },
    amber:   { wrap: "bg-warning/10 border-warning/20 hover:bg-warning/15", label: "text-warning", value: "text-warning", icon: "text-warning" },
  };
  const s = toneStyles[tone];
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border ${s.wrap} ${
        onClick ? "active:scale-[0.97] transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30" : ""
      } shrink-0`}
    >
      <span className={`text-[10px] font-semibold uppercase tracking-wider ${s.label}`}>
        {label}
      </span>
      <span className={`text-[12px] font-bold tabular-nums ${s.value}`}>
        {value}
      </span>
      {sparkline && <span className="ml-0.5">{sparkline}</span>}
    </Tag>
  );
}

function PrimaryChip({
  label, value, tone = "default", children,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
  children?: React.ReactNode;
}) {
  const toneStyles: Record<string, string> = {
    default: "text-foreground", good: "text-success", warn: "text-warning", bad: "text-danger",
  };
  return (
    <div className="inline-flex items-center gap-2 shrink-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`text-[14px] font-bold tabular-nums ${toneStyles[tone]}`}>{value}</span>
      {children}
    </div>
  );
}

function LegendChip({ type }: { type: "pacemaker" | "bottleneck" }) {
  const styles = {
    pacemaker: "bg-accent/15 text-accent-foreground border-accent/30",
    bottleneck: "bg-warning/10 text-warning border-warning/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0 text-[11px] font-medium rounded-sm border ${styles[type]}`}>
      <span className={`h-2 w-2 rounded-sm ${type === "pacemaker" ? "bg-accent" : "bg-warning"}`} />
      {type === "pacemaker" ? "PM" : "BN"}
    </span>
  );
}

export function VsmKpiStrip({ data, onDemandEdit, onTaktEdit }: Props) {
  const vaPct = data.vaPercent;
  const vaTone: "good" | "warn" | "bad" = vaPct < 5 ? "bad" : vaPct < 20 ? "warn" : "good";
  const taktMissing = data.taktStatus !== "ok";
  const bottleneck = data.bottleneck;

  return (
    <div className="h-auto min-h-[44px] flex items-center flex-wrap gap-y-1 gap-x-2 px-3 py-1.5 bg-background border-b border-border">
      {/* Primary group */}
      <div className="flex items-center gap-3 flex-wrap shrink-0">
        <PrimaryChip label="Lead Time" value={<AnimatedValue value={data.leadTime} />} />
        <PrimaryChip
          label="VA %"
          value={<AnimatedValue value={`${vaPct}%`} />}
          tone={vaTone}
        >
          <VaSparkline pct={vaPct} />
        </PrimaryChip>
        <PrimaryChip
          label="Bottleneck"
          value={bottleneck || "—"}
          tone={bottleneck ? "warn" : "default"}
        >
          {bottleneck && (
            <span className="flex items-center gap-1.5 ml-1">
              <LegendChip type="pacemaker" />
              <LegendChip type="bottleneck" />
            </span>
          )}
        </PrimaryChip>
      </div>

      {/* Vertical divider */}
      <span className="h-6 w-px bg-border shrink-0 mx-1" />

      {/* Secondary group */}
      <div className="flex items-center gap-2 flex-wrap">
        <KpiChip
          label="VA Time"
          value={<AnimatedValue value={data.vaTime} />}
          tone="default"
        />
        <KpiChip
          label="Takt"
          value={taktMissing ? (data.taktMissingReason || "—") : <AnimatedValue value={data.taktDisplay} />}
          tone={taktMissing ? "warn" : "default"}
          onClick={onTaktEdit}
        />
        <KpiChip
          label="WIP"
          value={data.totalWip > 0 ? <AnimatedValue value={`${data.totalWip}`} suffix="u" /> : "—"}
          tone="default"
        />
        <KpiChip
          label="Demand"
          value={data.demandRate || "—"}
          tone={data.demandRate ? "default" : "warn"}
          onClick={onDemandEdit}
        />
      </div>
    </div>
  );
}
