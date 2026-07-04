import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import {
  History, RefreshCw, Loader2, User, Database, LogIn, Activity,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Download, CalendarDays, FilterX, Eye, EyeOff,
  Search as SearchIcon, Info,
} from "lucide-react";
import { TwoColumnPageTemplate } from "@/components/layout/TwoColumnPageTemplate";
import { ToolbarButton, ToolbarDropdown, ToolbarSelect, ToolbarSeparator } from "@/components/layout/PageToolbar";
import { AUDIT_LOGS_QUERY } from "@/graphql/auditLogQueries";
import { formatDateTime, formatDateFull } from "@/utils/dateFormat";

/* ── Constants ── */

const PAGE_SIZE_OPTIONS = [
  { value: "15", label: "15 per page" },
  { value: "30", label: "30 per page" },
  { value: "50", label: "50 per page" },
  { value: "100", label: "100 per page" },
];

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  USER_ACTIVITY: { label: "User Activity", icon: User, color: "bg-primary/15 text-primary border-primary/20" },
  DATA_CHANGE: { label: "Data Changes", icon: Database, color: "bg-warning/15 text-warning border-warning/20" },
  LOGIN_EVENT: { label: "Login / Access", icon: LogIn, color: "bg-success/15 text-success border-success/20" },
  SYSTEM_EVENT: { label: "System Events", icon: Activity, color: "bg-accent/15 text-accent-foreground border-accent/20" },
};

const FILTER_OPTIONS = [
  { value: "__all__", label: "All Events", icon: History },
  { value: "USER_ACTIVITY", label: "User Activity", icon: User },
  { value: "DATA_CHANGE", label: "Data Changes", icon: Database },
  { value: "LOGIN_EVENT", label: "Login / Access", icon: LogIn },
  { value: "SYSTEM_EVENT", label: "System Events", icon: Activity },
];

const AUTO_REFRESH_INTERVALS = [
  { value: "0", label: "Off" },
  { value: "15", label: "15s" },
  { value: "30", label: "30s" },
  { value: "60", label: "60s" },
];

/* ── Types ── */

interface AuditLogEntry {
  id: string;
  eventType: string;
  userId: string | null;
  username: string;
  action: string;
  description: string;
  entityType: string;
  entityId: string;
  ipAddress: string | null;
  details: string;
  createdAt: string;
}

interface AuditLogsData {
  auditLogs: {
    items: AuditLogEntry[];
    total: number;
    hasMore: boolean;
  };
}

/* ── Helpers ── */

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 10) return "just now";
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    return `${day}d ago`;
  } catch { return ""; }
}

function formatAction(action: string): string {
  return action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-warning/20 text-inherit rounded-sm px-0.5">{part}</mark>
          : part
      )}
    </span>
  );
}

function downloadCSV(logs: AuditLogEntry[], filename: string) {
  const headers = ["Type", "Timestamp", "User", "Action", "Description", "Entity Type", "Entity ID", "IP Address", "Details"];
  const rows = logs.map((l) => [
    EVENT_TYPE_CONFIG[l.eventType]?.label || l.eventType,
    formatDateFull(l.createdAt),
    l.username,
    l.action,
    `"${l.description.replace(/"/g, '""')}"`,
    l.entityType || "",
    l.entityId || "",
    l.ipAddress || "",
    `"${(l.details || "{}").replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function parseDetails(details: string): Record<string, unknown> | null {
  try { return JSON.parse(details || "{}"); } catch { return null; }
}

/* ── Skeleton Loader ── */

function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <div className="divide-y divide-border/50">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-3 animate-pulse">
          <div className="w-20 h-5 rounded-full bg-muted/80" />
          <div className="w-28 h-4 rounded bg-muted/80" />
          <div className="w-24 h-4 rounded bg-muted/80" />
          <div className="w-36 h-4 rounded bg-muted/80" />
          <div className="flex-1 h-4 rounded bg-muted/80" />
          <div className="w-20 h-4 rounded bg-muted/80" />
        </div>
      ))}
    </div>
  );
}

/* ── Type Badge ── */

function TypeBadge({ eventType, small = false }: { eventType: string; small?: boolean }) {
  const cfg = EVENT_TYPE_CONFIG[eventType];
  const Icon = cfg?.icon || Info;
  const color = cfg?.color || "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold border whitespace-nowrap ${color} ${small ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]"}`}>
      <Icon className={small ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {cfg?.label || eventType}
    </span>
  );
}

/* ── Expanded Detail Panel ── */

function DetailPanel({ entry, search }: { entry: AuditLogEntry; search: string }) {
  const details = parseDetails(entry.details);
  const detailEntries = details ? Object.entries(details).filter(([, v]) => v !== null && v !== undefined) : [];

  return (
    <div className="border-t border-border/50 bg-muted/70 px-3 py-3 animate-fadeIn">
      <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
        {entry.ipAddress && (
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">IP Address</span>
            <p className="mt-0.5 font-mono text-muted-foreground">{entry.ipAddress}</p>
          </div>
        )}
        {entry.entityType && (
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Entity</span>
            <p className="mt-0.5 text-muted-foreground">
              <span className="rounded bg-muted/60 px-1 py-0.5 text-[10px] font-medium">{entry.entityType}</span>
              {entry.entityId && <span className="ml-1 font-mono text-[10px] text-muted-foreground">#{entry.entityId}</span>}
            </p>
          </div>
        )}
        {entry.userId && (
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">User ID</span>
            <p className="mt-0.5 font-mono text-muted-foreground">#{entry.userId}</p>
          </div>
        )}
      </div>
      <div className="mt-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Full Description</span>
        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
          {search ? highlightText(entry.description, search) : entry.description}
        </p>
      </div>
      {detailEntries.length > 0 && (
        <div className="mt-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Details</span>
          <pre className="mt-0.5 rounded bg-slate-900/5 p-2 text-[10px] font-mono text-muted-foreground overflow-x-auto max-h-28">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ── Active Filter Chips ── */

function FilterChips({
  eventTypeFilter, dateFrom, dateTo, search,
  onClearEventType, onClearDateFrom, onClearDateTo, onClearSearch,
}: {
  eventTypeFilter: string | null;
  dateFrom: string; dateTo: string; search: string;
  onClearEventType: () => void; onClearDateFrom: () => void;
  onClearDateTo: () => void; onClearSearch: () => void;
}) {
  const chips: Array<{ label: string; onClear: () => void }> = [];
  if (eventTypeFilter) chips.push({ label: `Type: ${EVENT_TYPE_CONFIG[eventTypeFilter]?.label || eventTypeFilter}`, onClear: onClearEventType });
  if (dateFrom) chips.push({ label: `From: ${dateFrom}`, onClear: onClearDateFrom });
  if (dateTo) chips.push({ label: `To: ${dateTo}`, onClear: onClearDateTo });
  if (search) chips.push({ label: `Search: "${search}"`, onClear: onClearSearch });

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-muted">
      <FilterX className="h-3 w-3 text-muted-foreground/60 shrink-0" />
      {chips.map((chip, i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded-full bg-background border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {chip.label}
          <button type="button" onClick={chip.onClear} className="text-muted-foreground/60 hover:text-muted-foreground ml-0.5">
            <svg className="h-2.5 w-2.5" viewBox="0 0 15 15" fill="currentColor"><path d="M11.78 4.22a.75.75 0 0 1 0 1.06L8.56 8.5l3.22 3.22a.75.75 0 1 1-1.06 1.06L7.5 9.56l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.44 8.5 3.22 5.28a.75.75 0 0 1 1.06-1.06L7.5 7.44l3.22-3.22a.75.75 0 0 1 1.06 0Z"/></svg>
          </button>
        </span>
      ))}
    </div>
  );
}

/* ── Main Component ── */

export function AuditLogsPage() {
  const [eventTypeFilter, setEventTypeFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(30);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(0);

  const { data, loading, refetch } = useQuery<AuditLogsData>(AUDIT_LOGS_QUERY, {
    variables: {
      eventType: eventTypeFilter || undefined,
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: pageSize,
      offset: page * pageSize,
    },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
    notifyOnNetworkStatusChange: true,
  });

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh <= 0) return;
    const interval = setInterval(() => { refetch(); }, autoRefresh * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  const logs = data?.auditLogs?.items || [];
  const total = data?.auditLogs?.total || 0;
  const hasMore = data?.auditLogs?.hasMore || false;
  const totalPages = Math.ceil(total / pageSize);
  const isRefreshing = loading && logs.length > 0;

  // Compute counts for filter badges
  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of logs) {
      counts[l.eventType] = (counts[l.eventType] || 0) + 1;
    }
    counts.__all__ = logs.length;
    return counts;
  }, [logs]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  const handleFilterChange = (val: string) => {
    setEventTypeFilter(val === "__all__" ? null : val);
    setPage(0);
    setExpandedId(null);
  };

  const handleDateFromChange = (val: string) => {
    setDateFrom(val);
    setPage(0);
  };

  const handleDateToChange = (val: string) => {
    setDateTo(val);
    setPage(0);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => prev === id ? null : id);
  };

  const clearAllFilters = () => {
    setEventTypeFilter(null);
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  };

  const hasActiveFilters = eventTypeFilter || dateFrom || dateTo || search;

  const toolbarFilters = (
    <>
      <ToolbarDropdown
        value={eventTypeFilter || "__all__"}
        onChange={(val) => handleFilterChange(val)}
        options={[
          { value: "__all__", label: "All Events" },
          { value: "USER_ACTIVITY", label: "User Activity" },
          { value: "DATA_CHANGE", label: "Data Changes" },
          { value: "LOGIN_EVENT", label: "Login / Access" },
          { value: "SYSTEM_EVENT", label: "System Events" },
        ]}
        placeholder="All Events"
        width="w-40"
      />              <div className="flex items-center gap-2 text-muted-foreground/60">
        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => handleDateFromChange(e.target.value)}
          className="h-8 w-40 rounded-[2px] border border-border bg-background px-2 text-xs text-muted-foreground outline-none"
          title="From date"
        />
        <span className="text-muted-foreground/30">–</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => handleDateToChange(e.target.value)}
          className="h-8 w-40 rounded-[2px] border border-border bg-background px-2 text-xs text-muted-foreground outline-none"
          title="To date"
        />
      </div>
      <ToolbarSelect
        value={String(pageSize)}
        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
        widthClassName="w-36"
      >
        {PAGE_SIZE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </ToolbarSelect>
    </>
  );

  const toolbarActions = (
    <>
      <ToolbarSelect
        value={String(autoRefresh)}
        onChange={(e) => setAutoRefresh(Number(e.target.value))}
        widthClassName="w-36"
      >
        {AUTO_REFRESH_INTERVALS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </ToolbarSelect>
      <ToolbarButton
        icon={autoRefresh > 0 ? Eye : EyeOff}
        label={autoRefresh > 0 ? `${autoRefresh}s` : "Auto"}
        onClick={() => setAutoRefresh(autoRefresh > 0 ? 0 : 30)}
        variant={autoRefresh > 0 ? "edit" : "neutral"}
        title={autoRefresh > 0 ? "Auto-refresh on" : "Auto-refresh off"}
      />
      <ToolbarSeparator />
      <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} disabled={loading} variant="neutral" />
      <ToolbarButton icon={Download} label="CSV" onClick={() => downloadCSV(logs, `audit-log-${new Date().toISOString().slice(0, 10)}.csv`)} disabled={logs.length === 0} variant="neutral" />
    </>
  );

  return (
    <TwoColumnPageTemplate
      icon={<History />}
      iconClass="bg-accent/15 text-accent-foreground"
      title="Audit Logs"
      subtitle="View system-wide audit logs for user activity, data changes, login events, and system events."
      toolbarProps={{
        searchValue: search,
        onSearchChange: handleSearch,
        searchPlaceholder: "Search logs...",

        filters: toolbarFilters,
        actions: toolbarActions,
      }}
      leftPanelProps={{
        title: "Log Filters",
        records: FILTER_OPTIONS,
        selectedId: eventTypeFilter || "__all__",
        onSelect: (val) => handleFilterChange(val),
        getId: (f) => f.value,
        renderRecord: (f, _selected) => {
          const Icon = f.icon;
          const count = eventCounts[f.value];
          return (
            <div className="flex items-center gap-2 py-0.5">
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-xs text-muted-foreground truncate">{f.label}</span>
              {count !== undefined && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-muted/60 text-[10px] font-semibold text-muted-foreground tabular-nums px-1">
                  {count}
                </span>
              )}
            </div>
          );
        },
        emptyMessage: "No filters",
        pageSize: 100,
        selectedBorderClass: "border-l-violet-600",
        selectedBgClass: "bg-violet-50/40",
      }}
      footerLeft="Audit Logs"
      footerCenter={
        total > 0 ? (
          <>
            <span className="font-semibold text-muted-foreground">{total.toLocaleString()}</span> entries
            &middot; {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} displayed
            {isRefreshing && <Loader2 className="ml-2 h-3 w-3 inline-block animate-spin text-accent-foreground" />}
          </>
        ) : (
          <span className="text-muted-foreground/60">No entries</span>
        )
      }
      footerRight={
        total > 0 ? (
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">
              Page {totalPages > 0 ? page + 1 : 0} / {totalPages || 0}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => { setPage((p) => Math.max(0, p - 1)); setExpandedId(null); }}
                disabled={page === 0}
                className="rounded p-1 text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/80 disabled:pointer-events-none disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => { setPage((p) => p + 1); setExpandedId(null); }}
                disabled={!hasMore}
                className="rounded p-1 text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/80 disabled:pointer-events-none disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </span>
        ) : undefined
      }
    >
      {/* Active filter chips */}
      {hasActiveFilters && (
        <FilterChips
          eventTypeFilter={eventTypeFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          search={search}
          onClearEventType={() => { setEventTypeFilter(null); setPage(0); }}
          onClearDateFrom={() => { setDateFrom(""); setPage(0); }}
          onClearDateTo={() => { setDateTo(""); setPage(0); }}
          onClearSearch={() => { setSearch(""); setPage(0); }}
        />
      )}

      {/* Header */}
      <div className="grid grid-cols-[32px_140px_190px_150px_150px_minmax(360px,1fr)_180px] h-8 shrink-0 items-center border-b border-border bg-muted px-3 text-[11px] uppercase tracking-wide text-muted-foreground select-none">
        <span />
        <span>Type</span>
        <span>Timestamp</span>
        <span>User</span>
        <span>Action</span>
        <span>Description</span>
        <span className="text-right">Entity</span>
      </div>

      {/* Table body */}
      {loading && logs.length === 0 ? (
        <SkeletonRows count={pageSize > 30 ? 8 : 6} />
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-xs text-muted-foreground/60">
          <div className="rounded-full bg-muted p-3">
            {search || hasActiveFilters ? <SearchIcon className="h-5 w-5 text-muted-foreground/30" /> : <History className="h-5 w-5 text-muted-foreground/30" />}
          </div>
          <p className="font-medium text-muted-foreground">
            {search ? "No matching results" : hasActiveFilters ? "No logs match the current filters" : "No audit logs recorded yet"}
          </p>
          <p className="text-muted-foreground/60">
            {search || hasActiveFilters ? "Try adjusting your search or clearing filters." : "System events will appear here as they occur."}
          </p>
          {(search || hasActiveFilters) && (
            <button type="button" onClick={clearAllFilters}
              className="mt-1 inline-flex h-7 items-center gap-1 rounded-sm bg-muted/60 px-2.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/80 transition-colors">
              <FilterX className="h-3 w-3" /> Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div>
          {logs.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <div key={entry.id}>
                <button
                  type="button"
                  onClick={() => toggleExpand(entry.id)}
                  className="grid grid-cols-[32px_140px_190px_150px_150px_minmax(360px,1fr)_180px] w-full items-center px-3 min-h-10 hover:bg-background transition-colors text-left border-b border-border/50"
                >
                  <span className="text-muted-foreground/30 flex items-center h-full">
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </span>
                  <span>
                    <TypeBadge eventType={entry.eventType} small />
                  </span>
                  <span className="flex flex-col justify-center" title={formatDateFull(entry.createdAt)}>
                    <span className="text-sm text-muted-foreground leading-tight">{formatDateTime(entry.createdAt)}</span>
                    <span className="text-[11px] text-muted-foreground leading-tight">{relativeTime(entry.createdAt)}</span>
                  </span>
                  <span className="truncate text-sm font-semibold text-foreground">
                    {search ? highlightText(entry.username, search) : entry.username}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {formatAction(entry.action)}
                  </span>
                  <span className="truncate text-sm text-foreground" title={entry.description}>
                    {search ? highlightText(entry.description, search) : entry.description}
                  </span>
                  <span className="truncate text-xs text-muted-foreground text-right">
                    {entry.entityType || "-"}
                  </span>
                </button>
                {isExpanded && <DetailPanel entry={entry} search={search} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Inline style for fadeIn animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </TwoColumnPageTemplate>
  );
}
