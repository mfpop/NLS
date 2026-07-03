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
      animating ? "text-indigo-600 scale-110" : ""
    }`}>
      {display}{suffix}
    </span>
  );
}

/* ── VA % sparkline bar ── */
function VaSparkline({ pct }: { pct: number }) {
  const barColor = pct < 5 ? "bg-red-500" : pct < 15 ? "bg-amber-500" : pct < 30 ? "bg-yellow-500" : "bg-emerald-500";
  return (
    <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden shrink-0">
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
    default: { wrap: "bg-slate-50 border-slate-200 hover:bg-slate-100", label: "text-slate-500", value: "text-slate-800", icon: "text-slate-400" },
    good:    { wrap: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100", label: "text-emerald-700", value: "text-emerald-800", icon: "text-emerald-500" },
    warn:    { wrap: "bg-amber-50 border-amber-200 hover:bg-amber-100", label: "text-amber-700", value: "text-amber-800", icon: "text-amber-500" },
    bad:     { wrap: "bg-red-50 border-red-200 hover:bg-red-100", label: "text-red-700", value: "text-red-800", icon: "text-red-500" },
    purple:  { wrap: "bg-purple-50 border-purple-200 hover:bg-purple-100", label: "text-purple-700", value: "text-purple-800", icon: "text-purple-500" },
    amber:   { wrap: "bg-orange-50 border-orange-200 hover:bg-orange-100", label: "text-orange-700", value: "text-orange-800", icon: "text-orange-500" },
  };
  const s = toneStyles[tone];
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border ${s.wrap} ${
        onClick ? "active:scale-[0.97] transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300/50" : ""
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

export function VsmKpiStrip({ data, onDemandEdit, onTaktEdit }: Props) {
  const vaPct = data.vaPercent;
  const vaTone: "good" | "warn" | "bad" = vaPct < 5 ? "bad" : vaPct < 20 ? "warn" : "good";
  const taktMissing = data.taktStatus !== "ok";
  const bottleneck = data.bottleneck;

  return (
    <div className="h-12 flex items-center gap-2 px-3 bg-white border-b border-slate-200 overflow-x-auto scrollbar-none">
      <KpiChip
        label="Lead Time"
        value={<AnimatedValue value={data.leadTime} />}
        tone="default"
      />
      <KpiChip
        label="VA Time"
        value={<AnimatedValue value={data.vaTime} />}
        tone="default"
      />
      <KpiChip
        label="VA %"
        value={<AnimatedValue value={`${vaPct}%`} />}
        tone={vaTone}
        sparkline={<VaSparkline pct={vaPct} />}
      />
      <KpiChip
        label="Takt"
        value={taktMissing ? (data.taktMissingReason || "—") : <AnimatedValue value={data.taktDisplay} />}
        tone={taktMissing ? "warn" : "default"}
        onClick={onTaktEdit}
      />
      <KpiChip
        label="Bottleneck"
        value={bottleneck || "—"}
        tone={bottleneck ? "amber" : "default"}
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
  );
}
