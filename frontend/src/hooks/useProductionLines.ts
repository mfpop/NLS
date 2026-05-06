import { useQuery, useMutation } from "@apollo/client/react";
import { useState, useCallback } from "react";
import {
  PRODUCTION_LINES_QUERY,
  CREATE_PRODUCTION_LINE_MUTATION,
  UPDATE_PRODUCTION_LINE_MUTATION,
  DELETE_PRODUCTION_LINE_MUTATION,
  TOGGLE_PRODUCTION_LINE_STATUS_MUTATION,
} from "@/graphql/productionLineQueries";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import type { ProductionLine, ProductionLinesQueryData, ProductionLinesQueryVars } from "@/types/productionLine";
import { MOCK_PRODUCTION_LINES } from "@/types/productionLine";
import type { DeletePlantResult } from "@/types/plant";
import { getGlobalPlants } from "@/pages/system/data-management/PlantDetailPage";

/* ── Mock fallback data ── */

let mockLines = [...MOCK_PRODUCTION_LINES];
let mockNextId = 7;

function generateMockId(): string {
  return `L${String(mockNextId++).padStart(3, "0")}`;
}

/* ── Default form ── */

export const EMPTY_LINE_FORM = {
  name: "",
  code: "",
  plantId: "",
  status: "active" as "active" | "inactive",
  modelsProduced: "",
  shiftPattern: "",
  isConstraint: false,
};

/* ── Inline validation ── */

export function validateLineForm(form: typeof EMPTY_LINE_FORM): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Line name is required";
  if (!form.code.trim()) errors.code = "Line code is required";
  if (!form.plantId) errors.plantId = "Plant is required";
  return errors;
}

/* ── Hook ── */

export function useProductionLines(pageSize: number = 10, page: number = 1) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const offset = (page - 1) * pageSize;

  /* ── Attempt GraphQL query, fall back to mock data ── */
  const { data: gqlData, loading: gqlLoading, error: gqlError, refetch } = useQuery<ProductionLinesQueryData, ProductionLinesQueryVars>(
    PRODUCTION_LINES_QUERY,
    {
      variables: {
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        limit: pageSize,
        offset,
      },
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  // Also fetch plants for the plant dropdown
  const { data: plantsData } = useQuery<{ plants: { id: string; name: string }[] }>(PLANTS_QUERY, {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const isMockFallback = !!gqlError || !gqlData;
  const pageData = isMockFallback
    ? null
    : gqlData?.productionLines;
  const lines = isMockFallback
    ? filterMockLines(search, statusFilter)
    : (pageData?.items ?? []);
  const totalCount = isMockFallback ? lines.length : (pageData?.totalCount ?? 0);
  const totalPages = isMockFallback ? 1 : (pageData?.totalPages ?? 1);

  /* ── Mutations ── */
  const [createMutation, createState] = useMutation(CREATE_PRODUCTION_LINE_MUTATION);
  const [updateMutation, updateState] = useMutation(UPDATE_PRODUCTION_LINE_MUTATION);
  const [deleteMutation] = useMutation<{ deleteProductionLine: DeletePlantResult }>(DELETE_PRODUCTION_LINE_MUTATION);
  const [toggleStatusMutation] = useMutation(TOGGLE_PRODUCTION_LINE_STATUS_MUTATION);

  const saveLoading = createState.loading || updateState.loading;

  /* ── CRUD helpers ── */

  const saveLine = useCallback(async (form: typeof EMPTY_LINE_FORM, editingId?: string | null): Promise<{ ok: boolean; errors?: Record<string, string> }> => {
    const validation = validateLineForm(form);
    if (Object.keys(validation).length > 0) return { ok: false, errors: validation };

    if (isMockFallback) {
      if (editingId) {
        const idx = mockLines.findIndex((l) => l.id === editingId);
        if (idx >= 0) {
          const plantName = getPlantName(form.plantId) || "Unknown";
          mockLines[idx] = {
            ...mockLines[idx],
            name: form.name,
            status: form.status,
            plantId: form.plantId,
            plantName,
            modelsProduced: form.modelsProduced ? form.modelsProduced.split(",").map((m: string) => m.trim()) : [],
            shiftPattern: form.shiftPattern,
            isConstraint: form.isConstraint,
            updatedAt: new Date().toISOString(),
          };
        }
      } else {
        const plantName = getPlantName(form.plantId) || "Unknown";
        const newLine: ProductionLine = {
          id: generateMockId(),
          name: form.name,
          code: form.code,
          status: form.status,
          plantId: form.plantId,
          plantName,
          modelsProduced: form.modelsProduced ? form.modelsProduced.split(",").map((m: string) => m.trim()) : [],
          shiftPattern: form.shiftPattern,
          isConstraint: form.isConstraint,
          departmentCount: 0,
          groupCount: 0,
          resourceCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockLines.push(newLine);
      }
      return { ok: true };
    }

    try {
      if (editingId) {
        await updateMutation({
          variables: {
            id: editingId,
            name: form.name,
            code: form.code,
            plantId: form.plantId,
            status: form.status,
            modelsProduced: form.modelsProduced,
            shiftPattern: form.shiftPattern,
            isConstraint: form.isConstraint,
          },
        });
      } else {
        await createMutation({
          variables: {
            name: form.name,
            code: form.code,
            plantId: form.plantId,
            status: form.status,
            modelsProduced: form.modelsProduced,
            shiftPattern: form.shiftPattern,
            isConstraint: form.isConstraint,
          },
        });
      }
      await refetch();
      return { ok: true };
    } catch {
      return { ok: false, errors: { _form: "Failed to save production line. Please try again." } };
    }
  }, [createMutation, updateMutation, refetch, isMockFallback]);

  const deleteLine = useCallback(async (id: string): Promise<{ success: boolean; inUse: boolean; message: string }> => {
    if (isMockFallback) {
      const idx = mockLines.findIndex((l) => l.id === id);
      if (idx >= 0) {
        const line = mockLines[idx];
        if (line.resourceCount > 0) {
          return { success: false, inUse: true, message: "Line has resources assigned. Remove resources first." };
        }
        mockLines.splice(idx, 1);
      }
      return { success: true, inUse: false, message: "Production line deleted." };
    }
    try {
      const { data } = await deleteMutation({ variables: { id } });
      if (data?.deleteProductionLine) {
        if (data.deleteProductionLine.inUse) {
          return { success: false, inUse: true, message: data.deleteProductionLine.message || "Line is in use." };
        }
        await refetch();
        return { success: data.deleteProductionLine.success, inUse: false, message: data.deleteProductionLine.message || "Deleted." };
      }
      return { success: false, inUse: false, message: "Failed to delete production line." };
    } catch {
      return { success: false, inUse: false, message: "Failed to delete production line." };
    }
  }, [deleteMutation, refetch, isMockFallback]);

  const toggleStatus = useCallback(async (id: string): Promise<boolean> => {
    if (isMockFallback) {
      const line = mockLines.find((l) => l.id === id);
      if (line) {
        line.status = line.status === "active" ? "inactive" : "active";
      }
      return true;
    }
    try {
      await toggleStatusMutation({ variables: { id } });
      await refetch();
      return true;
    } catch {
      return false;
    }
  }, [toggleStatusMutation, refetch, isMockFallback]);

  const loading = gqlLoading && !isMockFallback;

  return {
    lines,
    loading,
    isMockFallback,
    saveLoading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    saveLine,
    deleteLine,
    toggleStatus,
    refetch,
    plants: plantsData?.plants ?? getGlobalPlants().map((p) => ({ id: p.id, name: p.name })),
    totalCount,
    totalPages,
  };
}

/* ── Helpers ── */

function getPlantName(plantId: string): string {
  const allPlants = getGlobalPlants();
  const plant = allPlants.find((p) => p.id === plantId);
  return plant?.name ?? "";
}

function filterMockLines(search: string, statusFilter: string): ProductionLine[] {
  let filtered = [...mockLines];
  if (statusFilter !== "all") {
    filtered = filtered.filter((l) => l.status === statusFilter);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((l) =>
      l.name.toLowerCase().includes(q) ||
      l.plantName.toLowerCase().includes(q) ||
      l.modelsProduced.some((m) => m.toLowerCase().includes(q))
    );
  }
  return filtered;
}
