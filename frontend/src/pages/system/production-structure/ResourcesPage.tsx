import { useState, useEffect, useCallback } from "react";
import { Dumbbell, Search } from "lucide-react";
import { Pagination, EntityListItem, ResourceDetailView } from "./components";
import { useQuery } from "@apollo/client/react";
import { useSearchParams } from "react-router-dom";
import { RESOURCES_QUERY } from "@/graphql/manufacturingQueries";
import { useToolbar, useRegisterActions } from "./components/ToolbarContext";
import { EntityWorkspacePage } from "./components/EntityWorkspacePage";

const PER_PAGE = 10;

type ListResult<T> = T[] | { items?: T[] };

interface Resource {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  status?: string;
  statusId?: string;
  resourceGroupId?: string;
  resourceGroupName?: string;
  resourceTypeId?: string;
  utilization?: number | null;
  opStatus?: string;
  lastActivity?: string;
  shiftPattern?: string;
  defaultCalendar?: string;
  timezone?: string;
  capacityBasis?: string;
  uom?: string;
  standardCapacity?: string;
  cycleTime?: string;
  bottleneck?: string;
  isConstraint?: string;
  assetNumber?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  maintenanceRequired?: string;
  createdAt?: string;
  updatedAt?: string;
}

function listItems<T>(value: ListResult<T> | null | undefined): T[] {
  return Array.isArray(value) ? value : (value?.items ?? []);
}

export function ResourcesPage({ embeddedInFlow = false }: { embeddedInFlow?: boolean } = {}) {
  const [searchParams] = useSearchParams();
  const urlResourceId = searchParams.get("resourceId");
  const { search, statusFilter, setFooterContent, setToolbarVariant } = useToolbar();
  const registerActions = useRegisterActions();
  const { data, loading, refetch: refetchRes } = useQuery<{ resources: ListResult<Resource> }>(RESOURCES_QUERY);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const resources = listItems(data?.resources);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  useEffect(() => {
    if (!embeddedInFlow || !urlResourceId || resources.length === 0) return;
    const exists = resources.some((resource) => resource.id === urlResourceId);
    if (!exists) return;
    setSelectedId(urlResourceId);
  }, [embeddedInFlow, urlResourceId, resources]);

  const filtered = resources.filter((r) => statusFilter === "all" || r.status === statusFilter)
    .filter((r) => !search || (r.name ?? "").toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const sel = selectedId ? resources.find((r) => r.id === selectedId) ?? null : null;

  useEffect(() => {
    if (paginated.length === 0) return;
    if (selectedId && paginated.some((r) => r.id === selectedId)) return;
    setSelectedId(paginated[0].id);
  }, [paginated, selectedId]);

  const selectResource = useCallback((id: string) => setSelectedId(id), []);

  useEffect(() => {
    setToolbarVariant("splitListDetail");
    registerActions({ onRefresh: () => refetchRes(), hasSelected: !!sel });
    const footerParts = [`${filtered.length} res${filtered.length !== 1 ? "s" : ""}`];
    if (sel) {
      const fmt = (d: string | null | undefined) => {
        if (!d) return "—";
        try { return new Date(d).toLocaleDateString(); } catch { return d; }
      };
      footerParts.push(`Created ${fmt(sel.createdAt)}`);
      footerParts.push(`Updated ${fmt(sel.updatedAt)}`);
    }
    setFooterContent(footerParts.join(" · "));
  }, [sel, filtered.length, registerActions, refetchRes, setFooterContent, setToolbarVariant]);

  return (
    <EntityWorkspacePage
        hideList={embeddedInFlow}
        toolbar={null}
        list={
          <>
            <div className="flex shrink-0 items-center border-b border-border bg-muted p-3">
              <Search className="h-3 w-3 text-muted-foreground stroke-current mr-2 shrink-0" />
              <span className="text-[11px] font-medium text-muted-foreground">Resources</span>
              <span className="ml-auto font-mono text-[9px] text-muted-foreground">{filtered.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto bg-card pl-2 bg-muted">
              {loading && resources.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground"><div className="h-2 w-2 rounded-full bg-info animate-bounce mr-2" />Loading...</div>
              ) : paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <Dumbbell className="h-4 w-4 text-muted-foreground mb-1.5 stroke-current" />
                  <p className="text-xs text-muted-foreground">No resources</p>
                </div>
              ) : (
                <div>
                  {paginated.map((res) => (
                    <EntityListItem key={res.id}
                      name={res.name || ""} code={res.code}
                      meta={res.resourceGroupName || "Resource group required"}
                      icon={<Dumbbell className="h-3.5 w-3.5 stroke-current" />}
                      selected={selectedId === res.id}
                      status={res.status}
                      onClick={() => selectResource(res.id)}
                      entityType="resource"
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 flex h-7 items-center border-t border-border bg-muted px-3">
              <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
            </div>
          </>
        }
        detail={<ResourceDetailView resource={sel} />}
        footer={null}
    />
  );
}
