import { useQuery, useMutation } from "@apollo/client/react";
import { useState, useCallback } from "react";
import {
  PRODUCTION_LINES_QUERY,
  CREATE_PRODUCTION_LINE_MUTATION,
  UPDATE_PRODUCTION_LINE_MUTATION,
  ARCHIVE_PRODUCTION_LINE_MUTATION,
} from "@/graphql/productionLineQueries";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import type { ProductionLine, ProductionLinesQueryData, ProductionLinesQueryVars } from "@/types/productionLine";
import { MOCK_PRODUCTION_LINES } from "@/types/productionLine";
import type { Plant } from "@/types/plant";

let globalPlantsCache: Plant[] = [];
export function getGlobalPlants(): Plant[] {
  return globalPlantsCache;
}

/* ── Mock fallback data ── */

let mockLines = [...MOCK_PRODUCTION_LINES];
let mockNextId = 7;

function generateMockId(): string {
  return `L${String(mockNextId++).padStart(3, "0")}`;
}

/* ── Default form ── */

export const EMPTY_LINE_FORM = {
  entityIcon: "productionLine",
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
  const rawData = gqlData?.productionLines;
  const lines: ProductionLine[] = isMockFallback
    ? filterMockLines(search, statusFilter)
    : (Array.isArray(rawData) ? rawData : (rawData as any)?.items ?? []);
  const totalCount = lines.length;

  /* ── Mutations ── */
  const [createMutation, createState] = useMutation(CREATE_PRODUCTION_LINE_MUTATION);
  const [updateMutation, updateState] = useMutation(UPDATE_PRODUCTION_LINE_MUTATION);
  const [archiveMutation] = useMutation<any, { id: string }>(ARCHIVE_PRODUCTION_LINE_MUTATION);

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
            shiftPattern: form.shiftPattern,
            isConstraint: form.isConstraint,
            updatedAt: new Date().toISOString(),
          };
        }
      } else {
        const plantName = getPlantName(form.plantId) || "Unknown";
        const newLine: any = {
          id: generateMockId(),
          name: form.name,
          code: form.code,
          status: form.status,
          plantId: form.plantId,
          plantName,
          shiftPattern: form.shiftPattern,
          isConstraint: form.isConstraint,
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

  const archiveLine = useCallback(async (id: string): Promise<{ success: boolean; inUse: boolean; message: string }> => {
    if (isMockFallback) {
      const line = mockLines.find((l) => l.id === id);
      if (line) (line as any).status = "ARCHIVED";
      return { success: true, inUse: false, message: "Production line archived." };
    }
    try {
      const { data } = await archiveMutation({ variables: { id } });
      if (data?.archiveProductionLine?.ok) {
        await refetch();
        return { success: true, inUse: false, message: "Production line archived." };
      }
      const err = data?.archiveProductionLine?.errors?.[0];
      return { success: false, inUse: false, message: err?.message || "Failed to archive production line." };
    } catch {
      return { success: false, inUse: false, message: "Failed to archive production line." };
    }
  }, [archiveMutation, refetch, isMockFallback]);

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
    archiveLine,
    refetch,
    plants: plantsData?.plants ?? getGlobalPlants().map((p) => ({ id: p.id, name: p.name })),
    totalCount,
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
      l.plantName.toLowerCase().includes(q)
    );
  }
  return filtered;
}
