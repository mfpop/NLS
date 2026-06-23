import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { useLocation } from "react-router-dom";
import {
  History, RefreshCw, Search, X, Loader2, User, Database, LogIn, Activity,
  ChevronLeft, ChevronRight, Info,
} from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { AUDIT_LOGS_QUERY } from "@/graphql/auditLogQueries";

const PAGE_SIZE = 30;

const EVENT_TYPE_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  USER_ACTIVITY: { label: "User Activity", icon: User },
  DATA_CHANGE: { label: "Data Changes", icon: Database },
  LOGIN_EVENT: { label: "Login / Access Events", icon: LogIn },
  SYSTEM_EVENT: { label: "System Events", icon: Activity },
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  USER_ACTIVITY: "bg-blue-100 text-blue-700 border-blue-200",
  DATA_CHANGE: "bg-amber-100 text-amber-700 border-amber-200",
  LOGIN_EVENT: "bg-emerald-100 text-emerald-700 border-emerald-200",
  SYSTEM_EVENT: "bg-purple-100 text-purple-700 border-purple-200",
};

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

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function formatDateFull(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch { return iso; }
}

export function AuditLogsPage() {
  const location = useLocation();
  const path = location.pathname;

  // Determine event type filter from URL
  const activeFilter = (() => {
    if (path.includes("/user-activity")) return "USER_ACTIVITY";
    if (path.includes("/data-changes")) return "DATA_CHANGE";
    if (path.includes("/login-events")) return "LOGIN_EVENT";
    if (path.includes("/system-events")) return "SYSTEM_EVENT";
    return null;
  })();

  const pageTitle = activeFilter
    ? `${EVENT_TYPE_LABELS[activeFilter]?.label || ""} Audit Logs`
    : "Audit Logs";
  const pageSubtitle = activeFilter
    ? `Viewing ${EVENT_TYPE_LABELS[activeFilter]?.label?.toLowerCase() || ""} audit trail.`
    : "View system-wide audit logs for user activity, data changes, login events, and system events.";

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  // Reset page when filter changes
  useEffect(() => { setPage(0); }, [activeFilter]);

  const { data, loading, refetch } = useQuery<AuditLogsData>(AUDIT_LOGS_QUERY, {
    variables: {
      eventType: activeFilter || undefined,
      search: search || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const logs = data?.auditLogs?.items || [];
  const total = data?.auditLogs?.total || 0;
  const hasMore = data?.auditLogs?.hasMore || false;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  const btnClass = "inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50";

  return (
    <AppPageLayout
      icon={<History />}
      iconClass="bg-purple-100 text-purple-600"
      title={pageTitle}
      subtitle={pageSubtitle}
      toolbar={
        <div className="flex h-full w-full items-center gap-2 px-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search logs..."
              className="h-8 w-full rounded border border-slate-300 bg-white pl-8 pr-8 text-xs text-slate-800 outline-none focus:border-sky-500"
            />
            {search && (
              <button onClick={() => handleSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button type="button" onClick={() => refetch()} disabled={loading} className={btnClass}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      }
    >
      <div className="flex h-full flex-col overflow-hidden p-2">
        {/* Table header */}
        <div className="flex h-9 shrink-0 items-center border-b border-slate-200 bg-slate-50 rounded-t-lg px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          <span className="w-20 shrink-0">Type</span>
          <span className="w-28 shrink-0">Timestamp</span>
          <span className="w-24 shrink-0">User</span>
          <span className="w-32 shrink-0">Action</span>
          <span className="min-w-0 flex-1">Description</span>
          <span className="w-20 shrink-0 text-right">Entity</span>
        </div>

        {/* Table body */}
        <div className="flex-1 overflow-y-auto bg-white rounded-b-lg border-x border-b border-slate-200">
          {loading && logs.length === 0 ? (
            <div className="flex h-32 items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-32 items-center justify-center gap-2 text-xs text-slate-400">
              <Info className="h-4 w-4" />
              {search ? "No audit logs match your search." : "No audit logs recorded yet."}
            </div>
          ) : (
            logs.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 text-xs hover:bg-slate-50 transition-colors last:border-b-0"
              >
                <span className={`inline-flex w-20 shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold border ${EVENT_TYPE_COLORS[entry.eventType] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                  {entry.eventType === "USER_ACTIVITY" ? <User className="h-2.5 w-2.5" /> :
                   entry.eventType === "DATA_CHANGE" ? <Database className="h-2.5 w-2.5" /> :
                   entry.eventType === "LOGIN_EVENT" ? <LogIn className="h-2.5 w-2.5" /> :
                   entry.eventType === "SYSTEM_EVENT" ? <Activity className="h-2.5 w-2.5" /> : null}
                  {EVENT_TYPE_LABELS[entry.eventType]?.label || entry.eventType}
                </span>
                <span className="w-28 shrink-0 text-[10px] text-slate-500" title={formatDateFull(entry.createdAt)}>
                  {formatDateTime(entry.createdAt)}
                </span>
                <span className="w-24 shrink-0 truncate font-medium text-slate-700">
                  {entry.username}
                </span>
                <span className="w-32 shrink-0 truncate font-mono text-[10px] text-slate-500">
                  {entry.action}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-600" title={entry.description}>
                  {entry.description}
                </span>
                <span className="w-20 shrink-0 truncate text-right text-[10px] text-slate-400">
                  {entry.entityType || "-"}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Pagination footer */}
        <div className="flex h-9 shrink-0 items-center justify-between rounded-b-lg border-x border-b border-slate-200 bg-slate-50 px-3 text-[10px] text-slate-500">
          <span>
            {total > 0 ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total} entries` : "No entries"}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">
              Page {totalPages > 0 ? page + 1 : 0} of {totalPages || 0}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
