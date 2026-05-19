import { useMemo, useState, useCallback, useRef } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  AlertTriangle,
  Box,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Funnel,
  GitBranch,
  GitCompare,
  Layers,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { EntityWorkspacePage } from "@/pages/system/production-structure/components/EntityWorkspacePage";
import { theme } from "@/styles/themeTokens";
import {
  PRODUCT_FAMILIES_QUERY,
  PRODUCT_MODELS_QUERY,
  PRODUCT_VARIANTS_QUERY,
  PART_NUMBERS_QUERY,
  BOMS_QUERY,
  ROUTING_ASSIGNMENTS_QUERY,
} from "@/graphql/productIdentityQueries";
import {
  CREATE_PRODUCT_FAMILY,
  UPDATE_PRODUCT_FAMILY,
  ARCHIVE_PRODUCT_FAMILY,
  CREATE_PRODUCT_MODEL,
  UPDATE_PRODUCT_MODEL,
  ARCHIVE_PRODUCT_MODEL,
  CREATE_PRODUCT_VARIANT,
  UPDATE_PRODUCT_VARIANT,
  ARCHIVE_PRODUCT_VARIANT,
  CREATE_PART_NUMBER,
  UPDATE_PART_NUMBER,
  ARCHIVE_PART_NUMBER,
  CREATE_BOM,
  UPDATE_BOM,
  ARCHIVE_BOM,
} from "@/graphql/productIdentityMutations";
import type { ProductFamily, ProductModel, ProductVariant, PartNumber, BOM, RoutingAssignment } from "@/types/productIdentity";

type Tab = "families" | "models" | "variants" | "parts" | "boms" | "routing";
type Mode = "view" | "create" | "edit";
type ProductEntity = ProductFamily | ProductModel | ProductVariant | PartNumber | BOM | RoutingAssignment;
type EntityType = "family" | "model" | "variant" | "part" | "bom" | "routing";
type ProductDraft = Record<string, string | boolean | null | undefined>;

const PER_PAGE = 15;
const DEFAULT_LIST_WIDTH = 280;
const COMMAND_BAR_X_PADDING = 12;
const PMD_CARD = "border border-border/20 bg-card shadow-md shadow-foreground/10";
const PMD_FIELD = "border border-border/20 bg-transparent text-muted-foreground outline-none transition-colors focus:border-border-strong focus:bg-card focus:text-foreground focus:ring-2 focus:ring-ring/15";
const PMD_BUTTON = "inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:text-muted-foreground/70 disabled:opacity-100";

function ProductStatusBadge({ status, active }: { status?: string | null; active?: boolean }) {
  const normalized = String(status || (active ? "ACTIVE" : "ARCHIVED")).toUpperCase();
  const label = normalized === "ACTIVE" ? "Active" : normalized === "DRAFT" ? "Draft" : normalized === "ARCHIVED" ? "Obsolete" : normalized.charAt(0) + normalized.slice(1).toLowerCase();
  const tone = normalized === "ACTIVE"
    ? "bg-success/10 text-success border-success/20"
    : normalized === "DRAFT"
      ? "bg-warning/10 text-warning border-warning/25"
      : "bg-muted text-muted-foreground border-border/30";
  const dot = normalized === "ACTIVE" ? "bg-success" : normalized === "DRAFT" ? "bg-warning" : "bg-muted-foreground/55";

  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-px text-[9px] font-semibold ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

const tabs: Array<{ id: Tab; label: string; icon: typeof Layers; accent: string }> = [
  { id: "families", label: "Product Families", icon: Layers, accent: "emerald" },
  { id: "models", label: "Product Models", icon: Box, accent: "blue" },
  { id: "variants", label: "Product Variants", icon: GitBranch, accent: "violet" },
  { id: "parts", label: "Part Numbers", icon: Package, accent: "amber" },
  { id: "boms", label: "BOMs", icon: FileText, accent: "cyan" },
  { id: "routing", label: "Routing Assignments", icon: GitCompare, accent: "rose" },
];

function items<T>(data: { items?: T[] } | T[] | undefined): T[] {
  return Array.isArray(data) ? data : data?.items ?? [];
}

function isOperationallyActive(item: any): boolean {
  return item?.status === "ACTIVE" || (item?.status !== "ARCHIVED" && item?.isActive !== false);
}

function searchMatches(item: any, query: string): boolean {
  if (!query) return true;
  return [
    item.code,
    item.name,
    item.description,
    item.familyName,
    item.modelName,
    item.variantName,
    item.partNumber,
    item.productionLineName,
    item.version,
    item.status,
  ].some((value) => String(value || "").toLowerCase().includes(query));
}

function tabLabel(tab: Tab): string {
  return tabs.find((item) => item.id === tab)?.label ?? "Records";
}

function entityTypeForTab(tab: Tab): EntityType {
  if (tab === "families") return "family";
  if (tab === "models") return "model";
  if (tab === "variants") return "variant";
  if (tab === "parts") return "part";
  if (tab === "boms") return "bom";
  return "routing";
}

function emptyDraft(tab: Tab, families: ProductFamily[], models: ProductModel[], parts: PartNumber[]): ProductDraft {
  if (tab === "families") return { code: "", name: "", description: "", status: "ACTIVE", isActive: true };
  if (tab === "models") return { familyId: families[0]?.id || "", code: "", name: "", description: "", status: "ACTIVE" };
  if (tab === "variants") return { modelId: models[0]?.id || "", code: "", name: "", configurationSummary: "", status: "ACTIVE", isActive: true };
  if (tab === "parts") {
    const model = models[0];
    const familyId = model?.familyId || families[0]?.id || "";
    return { familyId, modelId: model?.id || "", variantId: "", partNumber: "", description: "", revision: "", uom: "EA", status: "ACTIVE", isActive: true };
  }
  if (tab === "boms") return { partNumberId: parts[0]?.id || "", productModelId: parts[0]?.modelId || "", version: "1.0", status: "DRAFT", notes: "" };
  return {};
}

function draftFromEntity(tab: Tab, entity: any): ProductDraft {
  if (!entity) return {};
  if (tab === "families") return { code: entity.code || "", name: entity.name || "", description: entity.description || "", status: entity.status || "ACTIVE", isActive: entity.isActive !== false };
  if (tab === "models") return { familyId: entity.familyId || "", code: entity.code || "", name: entity.name || "", description: entity.description || "", status: entity.status || "ACTIVE" };
  if (tab === "variants") return { modelId: entity.modelId || "", code: entity.code || "", name: entity.name || "", configurationSummary: entity.configurationSummary || "", status: entity.status || "ACTIVE", isActive: entity.isActive !== false };
  if (tab === "parts") return { familyId: entity.familyId || "", modelId: entity.modelId || "", variantId: entity.variantId || "", partNumber: entity.partNumber || "", description: entity.description || "", revision: entity.revision || "", uom: entity.uom || "EA", status: entity.status || "ACTIVE", isActive: entity.isActive !== false };
  if (tab === "boms") return { partNumberId: entity.partNumberId || "", productModelId: entity.productModelId || "", version: entity.version || "1.0", status: entity.status || "DRAFT", notes: entity.notes || "" };
  return {};
}

function validateDraft(tab: Tab, draft: ProductDraft): string | null {
  const required = (key: string, label: string) => !String(draft[key] || "").trim() ? `${label} is required.` : null;
  if (tab === "families") return required("code", "Code") || required("name", "Name");
  if (tab === "models") return required("familyId", "Product Family") || required("code", "Code") || required("name", "Name");
  if (tab === "variants") return required("modelId", "Product Model") || required("code", "Code") || required("name", "Name");
  if (tab === "parts") return required("familyId", "Product Family") || required("modelId", "Product Model") || required("partNumber", "Part Number");
  if (tab === "boms") return required("partNumberId", "Part Number") || required("version", "Version");
  return "Routing assignments are edited in the routing workspace.";
}

function inputFromDraft(tab: Tab, draft: ProductDraft): ProductDraft {
  if (tab === "families") return {
    code: String(draft.code || "").trim(),
    name: String(draft.name || "").trim(),
    description: String(draft.description || "").trim(),
    status: String(draft.status || "ACTIVE"),
    isActive: draft.isActive !== false,
  };
  if (tab === "models") return {
    familyId: String(draft.familyId || ""),
    code: String(draft.code || "").trim(),
    name: String(draft.name || "").trim(),
    description: String(draft.description || "").trim(),
    status: String(draft.status || "ACTIVE"),
  };
  if (tab === "variants") return {
    modelId: String(draft.modelId || ""),
    code: String(draft.code || "").trim(),
    name: String(draft.name || "").trim(),
    configurationSummary: String(draft.configurationSummary || "").trim(),
    status: String(draft.status || "ACTIVE"),
    isActive: draft.isActive !== false,
  };
  if (tab === "parts") return {
    familyId: String(draft.familyId || ""),
    modelId: String(draft.modelId || ""),
    variantId: draft.variantId ? String(draft.variantId) : null,
    partNumber: String(draft.partNumber || "").trim(),
    description: String(draft.description || "").trim(),
    revision: String(draft.revision || "").trim(),
    uom: String(draft.uom || "EA").trim(),
    status: String(draft.status || "ACTIVE"),
    isActive: draft.isActive !== false,
  };
  return {
    partNumberId: String(draft.partNumberId || ""),
    productModelId: String(draft.productModelId || ""),
    version: String(draft.version || "1.0").trim(),
    status: String(draft.status || "DRAFT"),
    notes: String(draft.notes || "").trim(),
  };
}

export function ProductMasterDataPage() {
  const [activeTab, setActiveTab] = useState<Tab>("families");
  const [mode, setMode] = useState<Mode>("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [draft, setDraft] = useState<ProductDraft>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingGuard = useRef(false);
  const [systemMessage, setSystemMessage] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showSystemMessage = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setSystemMessage({ message, type });
    window.setTimeout(() => setSystemMessage(null), 5000);
  }, []);

  const familiesQ = useQuery<{ productFamilies: { items: ProductFamily[] } }>(PRODUCT_FAMILIES_QUERY, { variables: { limit: 500, offset: 0 }, fetchPolicy: "cache-and-network" });
  const modelsQ = useQuery<{ productModels: { items: ProductModel[] } }>(PRODUCT_MODELS_QUERY, { variables: { limit: 500, offset: 0 }, fetchPolicy: "cache-and-network" });
  const variantsQ = useQuery<{ productVariants: { items: ProductVariant[] } }>(PRODUCT_VARIANTS_QUERY, { variables: { limit: 500, offset: 0 }, fetchPolicy: "cache-and-network" });
  const partsQ = useQuery<{ partNumbers: { items: PartNumber[] } }>(PART_NUMBERS_QUERY, { variables: { limit: 500, offset: 0, search: searchText || undefined }, fetchPolicy: "cache-and-network" });
  const bomsQ = useQuery<{ boms: { items: BOM[] } }>(BOMS_QUERY, { variables: { limit: 500, offset: 0 }, fetchPolicy: "cache-and-network" });
  const routingQ = useQuery<{ routings: { items: RoutingAssignment[] } | RoutingAssignment[] }>(ROUTING_ASSIGNMENTS_QUERY, { variables: { limit: 500, offset: 0 }, fetchPolicy: "cache-and-network" });

  const families = items(familiesQ.data?.productFamilies);
  const allModels = items(modelsQ.data?.productModels);
  const allVariants = items(variantsQ.data?.productVariants);
  const parts = items(partsQ.data?.partNumbers);
  const boms = items(bomsQ.data?.boms);
  const routings = items(routingQ.data?.routings);

  const [createFamily] = useMutation(CREATE_PRODUCT_FAMILY);
  const [updateFamily] = useMutation(UPDATE_PRODUCT_FAMILY);
  const [archiveFamily] = useMutation(ARCHIVE_PRODUCT_FAMILY);
  const [createModel] = useMutation(CREATE_PRODUCT_MODEL);
  const [updateModel] = useMutation(UPDATE_PRODUCT_MODEL);
  const [archiveModel] = useMutation(ARCHIVE_PRODUCT_MODEL);
  const [createVariant] = useMutation(CREATE_PRODUCT_VARIANT);
  const [updateVariant] = useMutation(UPDATE_PRODUCT_VARIANT);
  const [archiveVariant] = useMutation(ARCHIVE_PRODUCT_VARIANT);
  const [createPart] = useMutation(CREATE_PART_NUMBER);
  const [updatePart] = useMutation(UPDATE_PART_NUMBER);
  const [archivePart] = useMutation(ARCHIVE_PART_NUMBER);
  const [createBom] = useMutation(CREATE_BOM);
  const [updateBom] = useMutation(UPDATE_BOM);
  const [archiveBom] = useMutation(ARCHIVE_BOM);

  const rawList: ProductEntity[] = useMemo(() => {
    if (activeTab === "families") return families;
    if (activeTab === "models") return allModels;
    if (activeTab === "variants") return allVariants;
    if (activeTab === "parts") return parts;
    if (activeTab === "boms") return boms;
    return routings;
  }, [activeTab, allModels, allVariants, boms, families, parts, routings]);

  const list = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return rawList.filter((item: any) => {
      if (!searchMatches(item, query)) return false;
      if (statusFilter === "active") return isOperationallyActive(item);
      if (statusFilter === "archived") return !isOperationallyActive(item);
      return true;
    });
  }, [rawList, searchText, statusFilter]);

  const selected = selectedId ? list.find((item: any) => item.id === selectedId) ?? null : null;
  const isForm = mode === "create" || mode === "edit";
  const dirty = isForm && JSON.stringify(draft) !== JSON.stringify(mode === "edit" && selected ? draftFromEntity(activeTab, selected) : emptyDraft(activeTab, families, allModels, parts));
  const formValid = isForm && !validateDraft(activeTab, draft);
  const entityType = entityTypeForTab(activeTab);
  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const TabIcon = activeTabConfig.icon;
  const pageCount = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const paginated = list.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const refetchAll = useCallback(async () => {
    if (refreshingGuard.current) return;
    const beforeSelectedId = selectedId;
    refreshingGuard.current = true;
    setRefreshError(null);
    setRefreshing(true);
    try {
      const results = await Promise.all([familiesQ.refetch(), modelsQ.refetch(), variantsQ.refetch(), partsQ.refetch(), bomsQ.refetch(), routingQ.refetch()]);
      const refreshedLists = [
        items((results[0].data as any)?.productFamilies),
        items((results[1].data as any)?.productModels),
        items((results[2].data as any)?.productVariants),
        items((results[3].data as any)?.partNumbers),
        items((results[4].data as any)?.boms),
        items((results[5].data as any)?.routings),
      ];
      const tabIndex = activeTab === "families" ? 0 : activeTab === "models" ? 1 : activeTab === "variants" ? 2 : activeTab === "parts" ? 3 : activeTab === "boms" ? 4 : 5;
      const refreshedActiveList = refreshedLists[tabIndex] as Array<{ id: string }>;
      if (beforeSelectedId && !refreshedActiveList.some((item) => item.id === beforeSelectedId)) {
        setSelectedId(refreshedActiveList[0]?.id ?? null);
      }
    } catch {
      setRefreshError("Refresh failed. Existing data is still shown.");
      showSystemMessage("Refresh failed.", "error");
    } finally {
      refreshingGuard.current = false;
      setRefreshing(false);
    }
  }, [activeTab, bomsQ, familiesQ, modelsQ, partsQ, routingQ, selectedId, showSystemMessage, variantsQ]);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setSelectedId(null);
    setMode("view");
    setDraft({});
    setPage(1);
    setMutationError(null);
  }, []);

  const hNew = useCallback(() => {
    if (activeTab === "routing") return;
    setSelectedId(null);
    setDraft(emptyDraft(activeTab, families, allModels, parts));
    setMutationError(null);
    setMode("create");
  }, [activeTab, allModels, families, parts]);

  const hEdit = useCallback(() => {
    if (!selected || activeTab === "routing") return;
    setDraft(draftFromEntity(activeTab, selected));
    setMutationError(null);
    setMode("edit");
  }, [activeTab, selected]);

  const hCancel = useCallback(() => {
    setMutationError(null);
    setDraft({});
    setMode("view");
  }, []);

  const hDelete = useCallback(async () => {
    if (!selected || activeTab === "routing") return;
    if (!window.confirm(`Archive ${(selected as any).name || (selected as any).partNumber || "this record"}?`)) return;
    setMutationError(null);
    try {
      const fn = activeTab === "families" ? archiveFamily : activeTab === "models" ? archiveModel : activeTab === "variants" ? archiveVariant : activeTab === "parts" ? archivePart : activeTab === "boms" ? archiveBom : null;
      if (!fn) {
        showSystemMessage("Archive is not supported for this entity type.", "error");
        return;
      }
      const currentIndex = list.findIndex((item: any) => item.id === (selected as any).id);
      await fn({ variables: { id: (selected as any).id } });
      await refetchAll();
      const nextSelection = list.filter((item: any) => item.id !== (selected as any).id)[currentIndex] || list.filter((item: any) => item.id !== (selected as any).id)[currentIndex - 1] || null;
      setSelectedId((nextSelection as any)?.id ?? null);
      showSystemMessage("Archived successfully.", "success");
    } catch {
      setMutationError("Could not archive. This item may be in use.");
      showSystemMessage("Could not archive.", "error");
    }
  }, [activeTab, archiveBom, archiveFamily, archiveModel, archivePart, archiveVariant, list, refetchAll, selected, showSystemMessage]);

  const hSave = useCallback(async () => {
    setMutationError(null);
    const validationError = validateDraft(activeTab, draft);
    if (validationError) {
      setMutationError(validationError);
      showSystemMessage(validationError, "error");
      return;
    }

    try {
      let result: any;
      const input = inputFromDraft(activeTab, draft);
      if (activeTab === "families") result = mode === "edit" ? await updateFamily({ variables: { id: selectedId, input } }) : await createFamily({ variables: { input } });
      else if (activeTab === "models") result = mode === "edit" ? await updateModel({ variables: { id: selectedId, input } }) : await createModel({ variables: { input } });
      else if (activeTab === "variants") result = mode === "edit" ? await updateVariant({ variables: { id: selectedId, input } }) : await createVariant({ variables: { input } });
      else if (activeTab === "parts") result = mode === "edit" ? await updatePart({ variables: { id: selectedId, input } }) : await createPart({ variables: { input } });
      else if (activeTab === "boms") result = mode === "edit" ? await updateBom({ variables: { id: selectedId, input } }) : await createBom({ variables: { input } });
      else {
        setMutationError("Routing assignments are opened from the routing workspace.");
        return;
      }

      const payload = Object.values(result.data ?? {})[0] as any;
      if (!payload?.ok) {
        const msg = payload?.errors?.[0]?.message || "Could not save.";
        setMutationError(msg);
        showSystemMessage(msg, "error");
        return;
      }
      const saved = payload.family || payload.model || payload.variant || payload.partNumber || payload.bom;
      if (saved?.id) setSelectedId(saved.id);
      await refetchAll();
      setDraft({});
      setMode("view");
      showSystemMessage("Saved successfully.", "success");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Could not save.";
      setMutationError(msg);
      showSystemMessage("Could not save.", "error");
    }
  }, [activeTab, createBom, createFamily, createModel, createPart, createVariant, draft, mode, refetchAll, selectedId, showSystemMessage, updateBom, updateFamily, updateModel, updatePart, updateVariant]);

  const focusRelatedTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setPage(1);
    setMode("view");
    setMutationError(null);
    if (selected && "partNumberId" in selected && (selected as any).partNumberId) {
      setSelectedId((selected as any).partNumberId);
    } else {
      setSelectedId(null);
    }
  }, [selected]);

  const footerMeta = [
    `${list.length} record${list.length === 1 ? "" : "s"}`,
    `Page ${currentPage} of ${pageCount}`,
    selected ? `Selected ${(selected as any).partNumber || (selected as any).code || (selected as any).id}` : "No selection",
  ];
  const auditMeta = selected ? [
    (selected as any).version ? `v${(selected as any).version}` : (selected as any).revision ? `Rev ${(selected as any).revision}` : null,
    (selected as any).createdAt ? `Created ${(selected as any).createdAt}` : null,
    (selected as any).updatedAt ? `Updated ${(selected as any).updatedAt}` : null,
  ].filter(Boolean) : [];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="relative shrink-0">
        <PageHeader
          icon={<Package className="h-5 w-5 stroke-current" />}
          iconClass={theme.iconBoxAmber}
          title="Product Master Data"
          subtitle="Core manufacturing product hierarchy and manufacturable definitions."
        >
          <StatusBadge label={`${families.length} families`} />
          <StatusBadge label={`${allModels.length} models`} />
          <StatusBadge label={`${parts.length} parts`} />
          <StatusBadge label={`${boms.length} BOMs`} />
          <StatusBadge label={`${routings.length} routings`} />
        </PageHeader>
        {systemMessage && (
          <button
            type="button"
            onClick={() => setSystemMessage(null)}
            className={`absolute right-5 top-1/2 z-10 inline-flex max-w-md -translate-y-1/2 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm ${
              systemMessage.type === "success" ? theme.toastSuccess : systemMessage.type === "error" ? theme.toastError : theme.chip
            }`}
            title={systemMessage.message}
          >
            <span className="truncate">{systemMessage.message}</span>
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ProductMasterContentHeader
          activeTab={activeTab}
          onTabChange={handleTabChange}
          searchText={searchText}
          onSearchTextChange={(value) => { setSearchText(value); setPage(1); }}
          statusFilter={statusFilter}
          onStatusFilterChange={(value) => { setStatusFilter(value); setPage(1); }}
          mode={mode}
          canMutate={activeTab !== "routing"}
          hasSelected={!!selected}
          onNew={hNew}
          onEdit={hEdit}
          onDelete={hDelete}
          onRefresh={refetchAll}
          onSave={hSave}
          onCancel={hCancel}
          refreshing={refreshing}
          canSave={dirty && formValid && !refreshing}
        />
        {refreshError && (
          <div className="shrink-0 border-b border-danger/25 bg-danger/10 px-3 py-1.5 text-[11px] font-semibold text-foreground">
            {refreshError}
          </div>
        )}

        <EntityWorkspacePage
          toolbar={null}
          footer={null}
          list={
            <>
              <div className="flex shrink-0 items-center justify-between border-b border-border/20 bg-card px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{tabLabel(activeTab)}</p>
                  <p className="text-[9px] text-muted-foreground">{list.length} matching records</p>
                </div>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                  {activeTab}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto bg-card pl-2">
                {paginated.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center px-4 text-center">
                    <Package className="mb-1.5 h-4 w-4 text-muted-foreground stroke-current" />
                    <p className="text-xs text-muted-foreground">No {activeTab} found</p>
                  </div>
                ) : (
                  <div>
                    {paginated.map((item: any) => {
                      const count = activeTab === "families"
                        ? allModels.filter((model) => model.familyId === item.id).length
                        : activeTab === "models"
                          ? allVariants.filter((variant) => variant.modelId === item.id).length
                          : activeTab === "variants"
                            ? parts.filter((part) => part.variantId === item.id).length
                            : activeTab === "parts"
                              ? boms.filter((bom) => bom.partNumberId === item.id).length + routings.filter((routing) => routing.partNumberId === item.id).length
                              : 0;
                      const countLabel = activeTab === "families" ? "models" : activeTab === "models" ? "variants" : activeTab === "variants" ? "parts" : activeTab === "parts" ? "links" : "";
                      const code = item.code || item.partNumber || (item.version ? `v${item.version}` : "");
                      const selectedRow = selectedId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => { setSelectedId(item.id); setMode("view"); setMutationError(null); }}
                          className={`flex w-full items-start gap-2 border-l-[3px] px-2.5 py-1.5 text-left transition-colors focus:outline-none ${selectedRow ? "border-l-warning bg-warning/15 shadow-sm shadow-warning/10" : "border-l-transparent hover:bg-muted/60"}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-foreground">
                                {item.partNumber || item.name || item.code || "-"}
                              </span>
                              <ProductStatusBadge status={item.status} active={isOperationallyActive(item)} />
                            </div>
                            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[9px] text-muted-foreground">
                              {code && <span className="truncate font-mono">{code}</span>}
                              {countLabel && (
                                <>
                                  {code && <span className="text-muted-foreground">·</span>}
                                  <span className="shrink-0 rounded bg-muted px-1 py-px text-[8px] font-semibold text-muted-foreground">
                                    {count} {countLabel}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex h-7 shrink-0 items-center justify-between border-t border-border/20 bg-card px-3 text-[10px] text-muted-foreground">
                <span>{list.length} {activeTab}</span>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:text-muted-foreground/70 disabled:opacity-100">
                    <ChevronLeft className="h-3 w-3 stroke-current" />
                  </button>
                  <span className="px-1 font-mono">{currentPage}/{pageCount}</span>
                  <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:text-muted-foreground/70 disabled:opacity-100">
                    <ChevronRight className="h-3 w-3 stroke-current" />
                  </button>
                </div>
              </div>
            </>
          }
          detail={
            <DetailPanel
              selected={selected as any}
              activeTab={activeTab}
              entityType={entityType}
              isForm={isForm}
              draft={draft}
              onDraftChange={(key, value) => {
                setDraft((prev) => {
                  const next = { ...prev, [key]: value };
                  if (key === "modelId" && activeTab === "variants") {
                    const model = allModels.find((item) => item.id === value);
                    if (model?.familyId) next.familyId = model.familyId;
                  }
                  if (key === "partNumberId" && activeTab === "boms") {
                    const part = parts.find((item) => item.id === value);
                    if (part?.modelId) next.productModelId = part.modelId;
                  }
                  if (key === "familyId" && activeTab === "parts") {
                    const model = allModels.find((item) => item.familyId === value);
                    next.modelId = model?.id || "";
                    next.variantId = "";
                  }
                  if (key === "modelId" && activeTab === "parts") next.variantId = "";
                  return next;
                });
                setMutationError(null);
              }}
              mutationError={mutationError}
              tabIcon={TabIcon}
              families={families}
              allModels={allModels}
              allVariants={allVariants}
              parts={parts}
              boms={boms}
              routings={routings}
              onOpenBoms={() => focusRelatedTab("boms")}
              onOpenRouting={() => focusRelatedTab("routing")}
              onNavigateTab={handleTabChange}
            />
          }
        />
      </div>

      <footer className="flex h-14 shrink-0 items-center justify-between border-t border-border/20 bg-muted px-4 text-xs font-medium text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground stroke-current" />
          <span className="truncate text-muted-foreground">{footerMeta.join(" · ")}</span>
        </div>
        <div className="shrink-0 text-muted-foreground">{auditMeta.join(" · ")}</div>
      </footer>
    </div>
  );
}

function ProductMasterContentHeader({
  activeTab,
  onTabChange,
  searchText,
  onSearchTextChange,
  statusFilter,
  onStatusFilterChange,
  mode,
  canMutate,
  hasSelected,
  onNew,
  onEdit,
  onDelete,
  onRefresh,
  onSave,
  onCancel,
  refreshing = false,
  canSave,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  searchText: string;
  onSearchTextChange: (value: string) => void;
  statusFilter: "all" | "active" | "archived";
  onStatusFilterChange: (value: "all" | "active" | "archived") => void;
  mode: Mode;
  canMutate: boolean;
  hasSelected: boolean;
  onNew: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onSave: () => void;
  onCancel: () => void;
  refreshing?: boolean;
  canSave: boolean;
}) {
  const buttonClass = PMD_BUTTON;
  const isForm = mode === "create" || mode === "edit";

  return (
    <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-border/20 bg-card px-2">
      <div className="flex min-w-0 flex-1 items-center gap-2" aria-label="Product Master selector, search, and filters">
        <div className="min-w-0 shrink-0" style={{ width: DEFAULT_LIST_WIDTH - COMMAND_BAR_X_PADDING * 2 }}>
          <select
            id="product-master-entity-selector"
            aria-label="Product master entity"
            value={activeTab}
            onChange={(event) => onTabChange(event.target.value as Tab)}
            className={`h-7 w-full px-2 text-xs font-semibold ${PMD_FIELD}`}
          >
            {tabs.map((tab) => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
          </select>
        </div>
        <span className="h-5 w-px shrink-0 bg-muted" />
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground stroke-current" />
          <input
            id="product-master-search"
            aria-label="Search product master data"
            type="search"
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            placeholder="Search product master data"
            className={`h-7 w-full pl-3 pr-8 text-xs placeholder:text-muted-foreground ${PMD_FIELD}`}
          />
          {searchText && (
            <button type="button" onClick={() => onSearchTextChange("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground">
              <X className="h-3.5 w-3.5 stroke-current" />
            </button>
          )}
        </div>
        <div className="flex h-7 w-36 shrink-0 items-center gap-1 border border-border/20 bg-transparent px-2 transition-colors focus-within:border-border-strong focus-within:bg-card focus-within:ring-2 focus-within:ring-ring/15">
          <Funnel className="h-3.5 w-3.5 text-muted-foreground stroke-current" />
          <select
            id="product-master-status-filter"
            aria-label="Filter records"
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as "all" | "active" | "archived")}
            className="h-full flex-1 border-0 bg-transparent text-xs text-muted-foreground outline-none"
          >
            <option value="all">All records</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5" aria-label="Product Master actions">
        {isForm ? (
          <>
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave}
              title={!canSave ? "Make a valid change before saving." : "Save changes"}
              className={`inline-flex h-7 items-center gap-1.5 rounded px-3 text-[11px] font-semibold ${theme.buttonPrimary} disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground/70 disabled:shadow-none`}
            >
              <CheckCircle className="h-4 w-4 stroke-current" />
              Save
            </button>
            <button type="button" onClick={onCancel} className={`${buttonClass} border border-border/20`}>
              <X className="h-4 w-4 stroke-current" />
              Cancel
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onNew} disabled={!canMutate} title={!canMutate ? "Routing assignments are opened in the routing workspace." : "Create new record"} className={buttonClass}>
              <Plus className="h-4 w-4 stroke-current" />
              New
            </button>
            <button type="button" onClick={onEdit} disabled={!canMutate || !hasSelected} title={!hasSelected ? "Select a record to edit." : !canMutate ? "This record opens in its owning workspace." : "Edit selected record"} className={buttonClass}>
              <Pencil className="h-4 w-4 stroke-current" />
              Edit
            </button>
            <button type="button" onClick={onDelete} disabled={!canMutate || !hasSelected} title={!hasSelected ? "Select a record to archive." : !canMutate ? "This record opens in its owning workspace." : "Archive selected record"} className={buttonClass}>
              <Trash2 className="h-4 w-4 stroke-current" />
              Archive
            </button>
            <span className="mx-1 h-5 w-px shrink-0 bg-muted" />
            <button type="button" onClick={onRefresh} disabled={refreshing} title={refreshing ? "Refresh in progress." : "Refresh product master data"} className={buttonClass}>
              <RefreshCw className={`h-4 w-4 stroke-current ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DetailPanel({
  selected,
  activeTab,
  entityType,
  isForm,
  draft,
  onDraftChange,
  mutationError,
  tabIcon: TabIcon,
  families,
  allModels,
  allVariants,
  parts,
  boms,
  routings,
  onOpenBoms,
  onOpenRouting,
  onNavigateTab,
}: {
  selected: any;
  activeTab: Tab;
  entityType: EntityType;
  isForm: boolean;
  draft: ProductDraft;
  onDraftChange: (key: string, value: string | boolean | null) => void;
  mutationError: string | null;
  tabIcon: typeof Layers;
  families: ProductFamily[];
  allModels: ProductModel[];
  allVariants: ProductVariant[];
  parts: PartNumber[];
  boms: BOM[];
  routings: RoutingAssignment[];
  onOpenBoms: () => void;
  onOpenRouting: () => void;
  onNavigateTab: (tab: Tab) => void;
}) {
  if (!selected && !isForm) {
    return (
      <div className="flex h-full flex-1 flex-col bg-card">
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border/20 bg-card px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center text-warning">
            <TabIcon className="h-4 w-4 stroke-current" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">{tabLabel(activeTab)}</h2>
            <p className="text-[11px] text-muted-foreground">Select a record to view manufacturing details.</p>
          </div>
        </div>
        <div className="grid flex-1 place-items-center px-6 text-center">
          <p className="max-w-md text-xs leading-5 text-muted-foreground">
            Product master data stays organized by family, model, variant, part, BOM, and routing assignment.
          </p>
        </div>
      </div>
    );
  }

  const s = selected || {};
  const modelsInFamily = allModels.filter((model: any) => model.familyId === s.id);
  const partsForEntity = parts.filter((part: any) => activeTab === "families" ? part.familyId === s.id : activeTab === "models" ? part.modelId === s.id : activeTab === "variants" ? part.variantId === s.id : true);
  const entityPartIds = new Set(partsForEntity.map((part: any) => part.id));
  const bomsForEntity = boms.filter((bom: any) => activeTab === "parts" ? bom.partNumberId === s.id : entityPartIds.has(bom.partNumberId));
  const routingsForEntity = routings.filter((routing: any) => activeTab === "parts" ? routing.partNumberId === s.id : entityPartIds.has(routing.partNumberId));
  const activeBomCount = bomsForEntity.filter((bom: any) => bom.status === "ACTIVE").length;
  const activeRoutingCount = routingsForEntity.filter((routing: any) => routing.status === "ACTIVE").length;
  const validationIssues = [
    entityType === "family" && modelsInFamily.length === 0 ? "No Models" : null,
    (entityType === "family" || entityType === "model") && partsForEntity.length === 0 ? "No Part Numbers" : null,
    entityType === "part" && activeBomCount === 0 ? "Missing BOM" : null,
    entityType === "part" && activeRoutingCount === 0 ? "Missing Routing" : null,
    !isOperationallyActive(s) ? "Inactive Assignment" : null,
  ].filter(Boolean);
  const validationState = validationIssues.length === 0 ? "Ready" : `${validationIssues.length} Issue${validationIssues.length !== 1 ? "s" : ""}`;
  const hierarchyParts = [s.familyName, s.modelName, s.variantName].filter(Boolean).join(" / ");
  const statusLabel = entityType === "bom" || entityType === "routing" ? (s.status || "ACTIVE") : (isOperationallyActive(s) ? "Active" : "Archived");
  const title = isForm
    ? (draft.partNumber || draft.name || draft.code || `New ${tabLabel(activeTab)}`)
    : (s.partNumber || s.name || s.code || "");

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-card">
      <div className="shrink-0 border-b border-border/20 px-3 py-1">
        <div className="flex items-stretch gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center text-warning">
            <TabIcon className="h-4 w-4 stroke-current" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[16px] font-bold leading-5 text-foreground">{title}</h2>
              {s.code && s.code !== s.name && <span className="shrink-0 rounded bg-muted px-1.5 py-px font-mono text-[9px] text-muted-foreground">{s.code}</span>}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
              <span>{tabLabel(activeTab)}</span>
              {hierarchyParts && activeTab !== "families" && <><span className="text-muted-foreground">/</span><span>{hierarchyParts}</span></>}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ProductStatusBadge status={statusLabel} active={isOperationallyActive(s)} />
          </div>
        </div>
      </div>

      {mutationError && (
        <div className="shrink-0 px-4 pt-2">
          <div className="flex items-center gap-2 rounded border border-danger/25 bg-danger/10 px-3 py-1.5 text-[10px] font-semibold text-foreground">
            <AlertTriangle className="h-3 w-3 shrink-0 stroke-current text-danger" />
            {mutationError}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-1">
        <div className="w-full space-y-1">
          {/* OPERATIONAL BADGES */}
          {!isForm && (
            <div className="flex flex-wrap gap-1">
              {isOperationallyActive(s) ? <BadgeDot label="Active" color="emerald" /> : <BadgeDot label="Archived" color="slate" />}
              {routingsForEntity.length > 0 && <BadgeDot label="Used in Production" color="blue" />}
              {activeBomCount > 0 && <BadgeDot label="Has BOM" color="cyan" />}
              {activeRoutingCount > 0 && <BadgeDot label="Has Routing" color="violet" />}
              <BadgeDot label={validationState} color={validationIssues.length === 0 ? "emerald" : "amber"} />
              {entityType === "family" && modelsInFamily.length > 0 && <BadgeDot label={`${modelsInFamily.length} Models`} color="emerald" />}
              {(entityType === "family" || entityType === "model") && allVariants.length > 0 && <BadgeDot label={`${entityType === "family" ? allVariants.filter((variant) => modelsInFamily.some((model: any) => model.id === variant.modelId)).length : allVariants.filter((variant) => variant.modelId === s.id).length} Variants`} color="violet" />}
            </div>
          )}

          {/* IDENTITY - compact for view mode, form for edit */}
          <Section title="Identity" level="primary">
            <div className="rounded-md bg-muted px-1.5 py-0.5 text-[11px]">
              {isForm ? (
                <ProductMasterForm
                  activeTab={activeTab}
                  draft={draft}
                  onChange={onDraftChange}
                  families={families}
                  models={allModels}
                  variants={allVariants}
                  parts={parts}
                />
              ) : entityType === "part" ? (
                <CompactRows items={[["Part Number", s.partNumber], ["Revision", s.revision || "-"], ["UoM", s.uom || "EA"], ["Description", s.description || "-"]]} />
              ) : entityType === "bom" ? (
                <CompactRows items={[["Version", s.version], ["Part Number", s.partNumber || "-"], ["Status", s.status], ["Notes", s.notes || "-"]]} />
              ) : entityType === "routing" ? (
                <CompactRows items={[["Version", s.version], ["Status", s.status], ["Part Number", s.partNumber || "-"], ["Notes", s.notes || "-"]]} />
              ) : (
                <CompactRows items={[["Code", s.code], ["Name", s.name], [entityType === "variant" ? "Configuration" : "Description", entityType === "variant" ? (s.configurationSummary || "-") : (s.description || "-")]]} />
              )}
            </div>
          </Section>

          {/* TWO-COLUMN: RELATIONS + USAGE */}
          <div className="grid grid-cols-2 gap-1">
            <Section title="Relations" level="support">
              <div className="rounded-md bg-muted px-1.5 py-0.5 text-[11px]">
                {entityType === "family" && <CompactRows items={[["Models", `${modelsInFamily.length} model${modelsInFamily.length !== 1 ? "s" : ""}`]]} />}
                {entityType === "model" && <CompactRows items={[["Family", s.familyName || "-"]]} />}
                {entityType === "variant" && <CompactRows items={[["Model", s.modelName || "-"]]} />}
                {entityType === "part" && <CompactRows items={[["Family", s.familyName], ["Model", s.modelName], ["Variant", s.variantName || "None"]]} />}
                {entityType === "bom" && <CompactRows items={[["Part Number", s.partNumber || "-"]]} />}
                {entityType === "routing" && <CompactRows items={[["Line", s.productionLineName || "-"], ["Part Number", s.partNumber || "-"]]} />}
              </div>
            </Section>
            <Section title="Where Used" level="support">
              <div className="rounded-md bg-muted px-1.5 py-0.5 text-[11px]">
                <CompactRows items={[
                  ["Production Lines", `${new Set(routingsForEntity.map((routing: any) => routing.productionLineId).filter(Boolean)).size} line${new Set(routingsForEntity.map((routing: any) => routing.productionLineId).filter(Boolean)).size !== 1 ? "s" : ""}`],
                  ["BOMs", `${activeBomCount} active`],
                  ["Routings", `${activeRoutingCount} active`],
                  ["Part Numbers", `${partsForEntity.length} total`],
                ]} />
              </div>
            </Section>
          </div>

          {/* HIERARCHY CHAIN */}
          <Section title="Manufacturing Execution Path" level="operational">
            <HierarchyNav
              activeTab={activeTab}
              onNavigate={onNavigateTab}
              counts={{ families: families.length, models: allModels.length, variants: allVariants.length, parts: parts.length, boms: boms.length, routing: routings.length }}
            />
          </Section>

          {/* TWO-COLUMN: BOMS + ROUTING */}
          <div className="grid grid-cols-2 gap-1">
            <Section title="BOMs" level="support">
              <div className="rounded-md bg-muted px-2 py-1.5 text-[11px]">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-block h-2 w-2 rounded-full ${bomsForEntity.some((b: any) => b.status === "ACTIVE") ? "bg-success" : bomsForEntity.length > 0 ? "bg-warning" : "bg-muted"}`} />
                  <span className="text-sm font-bold text-foreground">{bomsForEntity.filter((b: any) => b.status === "ACTIVE").length}</span>
                  <span className="text-muted-foreground">active</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{bomsForEntity.filter((b: any) => b.status === "DRAFT").length} draft</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{bomsForEntity.filter((b: any) => b.status === "ARCHIVED").length} obsolete</span>
                </div>
                {bomsForEntity.length > 0 && (
                  <div className="text-[10px] text-muted-foreground">
                    Last rev: {bomsForEntity.sort((a: any, b: any) => (b.version || "").localeCompare(a.version || ""))[0]?.version || "-"}
                    {entityType === "part" && <span className="ml-2">· Used by {Math.min(routingsForEntity.length, 3)} production lines</span>}
                  </div>
                )}
                <div className="mt-1 flex gap-1">
                  {bomsForEntity.length === 0 && <span className="text-[10px] font-medium text-muted-foreground">Create or link a BOM before release.</span>}
                  <button type="button" onClick={onOpenBoms} className="h-6 rounded bg-primary px-2.5 text-[10px] font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:ring-2 focus:ring-ring/20">Open BOMs</button>
                </div>
              </div>
            </Section>
            <Section title="Routing" level="support">
              <div className="rounded-md bg-muted px-2 py-1.5 text-[11px]">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-block h-2 w-2 rounded-full ${routingsForEntity.some((r: any) => r.status === "ACTIVE") ? "bg-success" : routingsForEntity.length > 0 ? "bg-warning" : "bg-muted"}`} />
                  <span className="text-sm font-bold text-foreground">{routingsForEntity.filter((r: any) => r.status === "ACTIVE").length}</span>
                  <span className="text-muted-foreground">active</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{routingsForEntity.length} total</span>
                </div>
                {routingsForEntity.length > 0 && (
                  <div className="text-[10px] text-muted-foreground">
                    Lines: {[...new Set(routingsForEntity.map((r: any) => r.productionLineName).filter(Boolean))].join(", ") || "-"}
                  </div>
                )}
                <div className="mt-1 flex gap-1">
                  {routingsForEntity.length === 0 && <span className="text-[10px] font-medium text-muted-foreground">Assign routing before execution.</span>}
                  <button type="button" onClick={onOpenRouting} className="h-6 rounded bg-primary px-2.5 text-[10px] font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:ring-2 focus:ring-ring/20">Open Routing</button>
                  <button type="button" onClick={onOpenRouting} className="h-6 rounded border border-border/20 bg-transparent px-2.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:ring-2 focus:ring-ring/15">View Assignments</button>
                </div>
              </div>
            </Section>
          </div>

          {/* VALIDATION */}
          <div>
            <Section title={`Validation (${validationIssues.length})`} level="operational">
              <div className={`rounded-md border px-1.5 py-1 text-[11px] ${validationIssues.length === 0 ? "border-success/10 bg-success/5 text-foreground" : "border-warning/10 bg-warning/10 text-foreground"}`}>
                <ValidationGroup title="Execution Readiness">
                  {entityType === "part" && <ValidationLine severity={activeBomCount > 0 ? "ok" : "warning"} message={activeBomCount > 0 ? "BOM available" : "Missing BOM"} />}
                  {entityType === "part" && <ValidationLine severity={activeRoutingCount > 0 ? "ok" : "warning"} message={activeRoutingCount > 0 ? "Routing assigned" : "Missing Routing"} />}
                  {entityType !== "part" && <ValidationLine severity={partsForEntity.length > 0 ? "ok" : "warning"} message={partsForEntity.length > 0 ? `${partsForEntity.length} part number${partsForEntity.length !== 1 ? "s" : ""}` : "No Part Numbers"} />}
                </ValidationGroup>
                <ValidationGroup title="Hierarchy">
                  {entityType === "family" && <ValidationLine severity={modelsInFamily.length > 0 ? "ok" : "warning"} message={modelsInFamily.length > 0 ? `${modelsInFamily.length} model${modelsInFamily.length !== 1 ? "s" : ""}` : "No Models"} />}
                  {entityType === "model" && <ValidationLine severity={allVariants.filter((variant) => variant.modelId === s.id).length > 0 ? "ok" : "warning"} message={allVariants.filter((variant) => variant.modelId === s.id).length > 0 ? "Variants available" : "No Variants"} />}
                  {entityType === "variant" && <ValidationLine severity={partsForEntity.length > 0 ? "ok" : "warning"} message={partsForEntity.length > 0 ? "Linked to part number" : "No Part Numbers"} />}
                </ValidationGroup>
                <ValidationGroup title="Assignment State">
                  <ValidationLine severity={isOperationallyActive(s) ? "ok" : "critical"} message={isOperationallyActive(s) ? "Active assignment" : "Inactive Assignment"} />
                </ValidationGroup>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ label }: { label: string }) {
  return <span className="rounded-full border border-border/20 bg-warning/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-warning shadow-sm shadow-warning/5">{label}</span>;
}

function ProductMasterForm({
  activeTab,
  draft,
  onChange,
  families,
  models,
  variants,
  parts,
}: {
  activeTab: Tab;
  draft: ProductDraft;
  onChange: (key: string, value: string | boolean | null) => void;
  families: ProductFamily[];
  models: ProductModel[];
  variants: ProductVariant[];
  parts: PartNumber[];
}) {
  const familyModels = draft.familyId ? models.filter((model) => model.familyId === draft.familyId) : models;
  const modelVariants = draft.modelId ? variants.filter((variant) => variant.modelId === draft.modelId) : variants;

  if (activeTab === "families") {
    return (
      <div className="grid gap-2 md:grid-cols-2">
        <TextField placeholder="Code *" value={draft.code} onChange={(value) => onChange("code", value)} />
        <TextField placeholder="Name *" value={draft.name} onChange={(value) => onChange("name", value)} />
        <TextField className="md:col-span-2" placeholder="Description" value={draft.description} onChange={(value) => onChange("description", value)} />
        <StatusSelect value={draft.status} onChange={(value) => onChange("status", value)} />
      </div>
    );
  }

  if (activeTab === "models") {
    return (
      <div className="grid gap-2 md:grid-cols-2">
        <SelectField value={draft.familyId} onChange={(value) => onChange("familyId", value)} options={families.map((family) => ({ value: family.id, label: family.name }))} placeholder="Product Family *" />
        <TextField placeholder="Code *" value={draft.code} onChange={(value) => onChange("code", value)} />
        <TextField placeholder="Name *" value={draft.name} onChange={(value) => onChange("name", value)} />
        <StatusSelect value={draft.status} onChange={(value) => onChange("status", value)} />
        <TextField className="md:col-span-2" placeholder="Description" value={draft.description} onChange={(value) => onChange("description", value)} />
      </div>
    );
  }

  if (activeTab === "variants") {
    return (
      <div className="grid gap-2 md:grid-cols-2">
        <SelectField value={draft.modelId} onChange={(value) => onChange("modelId", value)} options={models.map((model) => ({ value: model.id, label: `${model.familyName ? `${model.familyName} / ` : ""}${model.name}` }))} placeholder="Product Model *" />
        <TextField placeholder="Code *" value={draft.code} onChange={(value) => onChange("code", value)} />
        <TextField placeholder="Name *" value={draft.name} onChange={(value) => onChange("name", value)} />
        <StatusSelect value={draft.status} onChange={(value) => onChange("status", value)} />
        <TextField className="md:col-span-2" placeholder="Configuration summary" value={draft.configurationSummary} onChange={(value) => onChange("configurationSummary", value)} />
      </div>
    );
  }

  if (activeTab === "parts") {
    return (
      <div className="grid gap-2 md:grid-cols-2">
        <SelectField value={draft.familyId} onChange={(value) => onChange("familyId", value)} options={families.map((family) => ({ value: family.id, label: family.name }))} placeholder="Product Family *" />
        <SelectField value={draft.modelId} onChange={(value) => onChange("modelId", value)} options={familyModels.map((model) => ({ value: model.id, label: model.name }))} placeholder="Product Model *" />
        <SelectField value={draft.variantId} onChange={(value) => onChange("variantId", value || null)} options={modelVariants.map((variant) => ({ value: variant.id, label: variant.name }))} placeholder="No variant" />
        <TextField placeholder="Part Number *" value={draft.partNumber} onChange={(value) => onChange("partNumber", value)} />
        <TextField placeholder="Revision" value={draft.revision} onChange={(value) => onChange("revision", value)} />
        <TextField placeholder="UoM" value={draft.uom} onChange={(value) => onChange("uom", value)} />
        <StatusSelect value={draft.status} onChange={(value) => onChange("status", value)} />
        <TextField className="md:col-span-2" placeholder="Description" value={draft.description} onChange={(value) => onChange("description", value)} />
      </div>
    );
  }

  if (activeTab === "boms") {
    return (
      <div className="grid gap-2 md:grid-cols-2">
        <SelectField value={draft.partNumberId} onChange={(value) => onChange("partNumberId", value)} options={parts.map((part) => ({ value: part.id, label: `${part.partNumber} / ${part.description || part.modelName}` }))} placeholder="Part Number *" />
        <TextField placeholder="Version *" value={draft.version} onChange={(value) => onChange("version", value)} />
        <StatusSelect value={draft.status} onChange={(value) => onChange("status", value)} draftOptions={["DRAFT", "ACTIVE", "ARCHIVED"]} />
        <TextField className="md:col-span-2" placeholder="Notes" value={draft.notes} onChange={(value) => onChange("notes", value)} />
      </div>
    );
  }

  return <p className="text-[11px] text-muted-foreground">Routing assignments are edited from the routing workspace.</p>;
}

function TextField({ value, onChange, placeholder, className = "" }: { value: unknown; onChange: (value: string) => void; placeholder: string; className?: string }) {
  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`h-8 w-full px-2 text-[11px] placeholder:text-muted-foreground ${PMD_FIELD} ${className}`}
    />
  );
}

function SelectField({ value, onChange, options, placeholder }: { value: unknown; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; placeholder: string }) {
  return (
    <select
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
      className={`h-8 w-full px-2 text-[11px] ${PMD_FIELD}`}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function StatusSelect({ value, onChange, draftOptions = ["ACTIVE", "ARCHIVED"] }: { value: unknown; onChange: (value: string) => void; draftOptions?: string[] }) {
  return (
    <select
      value={String(value ?? draftOptions[0])}
      onChange={(event) => onChange(event.target.value)}
      className={`h-8 w-full px-2 text-[11px] ${PMD_FIELD}`}
    >
      {draftOptions.map((status) => <option key={status} value={status}>{status}</option>)}
    </select>
  );
}

function Section({ title, children, level = "support" }: { title: string; children: React.ReactNode; level?: "primary" | "operational" | "support" }) {
  const style = level === "primary"
    ? PMD_CARD
    : level === "operational"
      ? "border border-warning/10 bg-card shadow-md shadow-foreground/10"
      : PMD_CARD;
  const titleStyle = level === "operational"
    ? "text-warning"
    : level === "primary"
      ? "text-foreground"
      : "text-muted-foreground";
  return (
    <section className={`w-full rounded-lg p-1.5 ${style}`}>
      <h3 className={`mb-1 text-[10px] font-black uppercase tracking-wider ${titleStyle}`}>{title}</h3>
      {children}
    </section>
  );
}

function HierarchyNav({ activeTab, counts, onNavigate }: { activeTab: Tab; counts: Record<Tab, number>; onNavigate: (tab: Tab) => void }) {
  const nodes: Array<{ tab: Tab; label: string; icon: React.ReactNode; color: string }> = [
    { tab: "families", label: "Family", icon: <Layers className="h-3 w-3 stroke-current" />, color: "emerald" },
    { tab: "models", label: "Models", icon: <Box className="h-3 w-3 stroke-current" />, color: "blue" },
    { tab: "variants", label: "Variants", icon: <GitBranch className="h-3 w-3 stroke-current" />, color: "violet" },
    { tab: "parts", label: "Parts", icon: <Package className="h-3 w-3 stroke-current" />, color: "amber" },
    { tab: "boms", label: "BOMs", icon: <FileText className="h-3 w-3 stroke-current" />, color: "cyan" },
    { tab: "routing", label: "Routings", icon: <GitCompare className="h-3 w-3 stroke-current" />, color: "rose" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md bg-muted px-1.5 py-1 text-[10px]">
      {nodes.map((node, index) => (
        <div key={node.tab} className="inline-flex items-center gap-1">
          {index > 0 && <span className="text-muted-foreground">→</span>}
          <button
            type="button"
            onClick={() => onNavigate(node.tab)}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-semibold transition-colors focus:ring-2 focus:ring-ring/15 ${
              activeTab === node.tab ? "border-warning/15 bg-warning/15 text-warning" : "border-border/20 bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {node.icon}
            {node.label}
            <span className="rounded bg-background/60 px-1 font-mono text-[9px] text-muted-foreground">{counts[node.tab]}</span>
          </button>
        </div>
      ))}
    </div>
  );
}

function BadgeDot({ label, color }: { label: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: "border-success/20 bg-success/10 text-success",
    blue: "border-primary/20 bg-primary/10 text-primary",
    violet: "border-accent/20 bg-accent/10 text-accent",
    amber: "border-warning/25 bg-warning/10 text-warning",
    slate: "border-border/30 bg-muted text-muted-foreground",
    cyan: "border-info/20 bg-info/10 text-info",
    rose: "border-danger/20 bg-danger/10 text-danger",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${colors[color] || colors.slate}`}>{label}</span>;
}

function ValidationGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <p className="mb-0.5 text-[9px] font-black uppercase tracking-wide text-warning">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ValidationLine({ severity, message }: { severity: "ok" | "warning" | "critical"; message: string }) {
  const color = severity === "ok" ? "text-success bg-success/10" : severity === "critical" ? "text-danger bg-danger/10" : "text-warning bg-warning/15";
  return (
    <div className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 ${severity === "warning" || severity === "critical" ? color.split(" ").slice(1).join(" ") : ""}`}>
      {severity === "ok" ? <CheckCircle className={`h-3 w-3 shrink-0 stroke-current ${color.split(" ")[0]}`} /> : <AlertTriangle className={`h-3 w-3 shrink-0 stroke-current ${color.split(" ")[0]}`} />}
      <span className="text-[10px] font-medium text-foreground">{message}</span>
    </div>
  );
}

function CompactRows({ items }: { items: Array<[string, string | number | null | undefined]> }) {
  return (
    <>
      {items.map(([label, value], i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
          <span className="truncate text-[11px] font-medium text-foreground">{value ?? "-"}</span>
        </div>
      ))}
    </>
  );
}
