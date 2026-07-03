import { useState, useEffect, useCallback } from "react";
import { Dumbbell, Plus, RefreshCw, Save, X } from "lucide-react";
import { ResourceDetailView, type ResourceForm } from "./components";
import { useQuery, useMutation } from "@apollo/client/react";
import { useSearchParams } from "react-router-dom";
import { RESOURCES_QUERY } from "@/graphql/manufacturingQueries";
import { UPDATE_RESOURCE } from "@/graphql/dataManagementMutations";
import { useToolbar, useRegisterActions } from "./components/ToolbarContext";
import { EntityWorkspacePage } from "./components/EntityWorkspacePage";
import { PageToolbar, ToolbarSearch, ToolbarButton } from "@/components/layout/PageToolbar";
import { LEFT_COLUMN_WIDTH_CLASS } from "@/components/layout/layoutWidths";
import { RecordListPanel } from "@/components/shared/RecordListPanel";
import { ENTITY_COLORS } from "./config/entityColors";

const col = ENTITY_COLORS.resource;

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
  const { search, setSearch, statusFilter, setStatusFilter, setFooterContent, setToolbarVariant } = useToolbar();
  const registerActions = useRegisterActions();
  const { data, refetch: refetchRes } = useQuery<{ resources: ListResult<Resource> }>(RESOURCES_QUERY);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ResourceForm | null>(null);

  const [updateResource] = useMutation(UPDATE_RESOURCE);

  const resources = listItems(data?.resources);

  useEffect(() => {
    if (!embeddedInFlow || !urlResourceId || resources.length === 0) return;
    const exists = resources.some((resource) => resource.id === urlResourceId);
    if (!exists) return;
    setSelectedId(urlResourceId);
  }, [embeddedInFlow, urlResourceId, resources]);

  const filtered = resources.filter((r) => statusFilter === "all" || r.status === statusFilter)
    .filter((r) => !search || (r.name ?? "").toLowerCase().includes(search.toLowerCase()));
  const sel = selectedId ? resources.find((r) => r.id === selectedId) ?? null : null;

  useEffect(() => {
    if (filtered.length === 0) return;
    if (selectedId && filtered.some((r) => r.id === selectedId)) return;
    setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const hEdit = useCallback(() => { if (sel) { setFormData(null); setIsEditing(true); } }, [sel]);
  const hCancel = useCallback(() => { setIsEditing(false); setFormData(null); }, []);
  const hSave = useCallback(async () => {
    if (!formData || !selectedId) return false;
    try {
      const { data: result } = await updateResource({ variables: { id: selectedId, input: formData } });
      const res = result as any;
      if (res?.updateResource?.errors?.length) {
        return false;
      }
      setIsEditing(false);
      setFormData(null);
      await refetchRes();
      return true;
    } catch {
      return false;
    }
  }, [formData, selectedId, updateResource, refetchRes]);

  const selectResource = useCallback((id: string) => { setSelectedId(id); if (isEditing) setIsEditing(false); }, [isEditing]);

  useEffect(() => {
    setToolbarVariant("splitListDetail");
    if (isEditing) {
      registerActions({ onSave: hSave, onCancel: hCancel, isDirty: false, isSaving: false });
    } else {
      registerActions({ onRefresh: () => refetchRes(), hasSelected: !!sel, onEdit: sel ? hEdit : undefined });
    }
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
        toolbar={
          <PageToolbar
            leftWidthClass={LEFT_COLUMN_WIDTH_CLASS}
            leftSlot={
              <ToolbarSearch
                value={search}
                onChange={setSearch}
                placeholder="Search resources..."
              />
            }
            filters={
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 w-36 rounded-[2px] border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            }
            actions={
              isEditing ? (
                <>
                  <ToolbarButton variant="edit" icon={<Save className="h-4 w-4" />} onClick={hSave}>
                    Save
                  </ToolbarButton>
                  <ToolbarButton variant="danger" icon={<X className="h-4 w-4" />} onClick={hCancel}>
                    Cancel
                  </ToolbarButton>
                </>
              ) : (
                <>
                  <ToolbarButton variant="edit" icon={<Plus className="h-4 w-4" />} onClick={hEdit} disabled={!sel}>
                    Edit
                  </ToolbarButton>
                  <ToolbarButton variant="neutral" icon={<RefreshCw className="h-4 w-4" />} onClick={() => refetchRes()}>
                    Refresh
                  </ToolbarButton>
                </>
              )
            }
          />
        }
        list={
          <RecordListPanel
            title="Resources"
            records={filtered}
            selectedId={selectedId}
            onSelect={selectResource}
            getId={(r) => r.id}
            pageSize={PER_PAGE}
            emptyMessage="No resources"
            selectedBorderClass={col.selectedBorder}
            selectedBgClass={col.selectedBg}
            renderRecord={(r) => {
              const isActive = (r.status || "").toLowerCase() === "active";
              return (
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${col.iconBg}`}>
                    <Dumbbell className={`h-3.5 w-3.5 ${col.iconFg} stroke-current`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                      <span className="min-w-0 truncate text-[14px] font-semibold text-slate-900">{r.name || ""}</span>
                      <span className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} title={r.status || "unknown"} />
                    </div>
                    <div className="mt-0.5 truncate text-[12px] font-medium text-slate-500">{r.resourceGroupName || "Resource group required"}</div>
                  </div>
                </div>
              );
            }}
          />
        }
        detail={<ResourceDetailView resource={sel} editing={isEditing} onSave={setFormData} />}
        footer={null}
    />
  );
}
