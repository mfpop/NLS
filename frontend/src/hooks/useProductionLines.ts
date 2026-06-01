import { useQuery, useMutation } from "@apollo/client/react";
import { useState, useCallback } from "react";
import {
  PRODUCTION_LINES_QUERY,
  PRODUCTION_LINE_FLOW_CONTEXT_QUERY,
  CREATE_PRODUCTION_LINE_MUTATION,
  UPDATE_PRODUCTION_LINE_MUTATION,
  ARCHIVE_PRODUCTION_LINE_MUTATION,
  DELETE_PRODUCTION_LINE_MUTATION,
} from "@/graphql/productionLineQueries";
import {
  ASSIGN_FAMILIES_MUTATION,
  REMOVE_FAMILY_MUTATION,
  ASSIGN_MODELS_MUTATION,
  REMOVE_MODEL_MUTATION,
  SET_PRIMARY_FAMILY_MUTATION,
  SET_PRIMARY_MODEL_MUTATION,
} from "@/graphql/productionLineMutations";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import type { ProductionLine, ProductionLineFlowContext, ProductionLinesQueryData, ProductionLinesQueryVars, ProductFamilyAssignment, ProductModelAssignment } from "@/types/productionLine";

type MutationData = Record<string, any>;

export function useProductionLineFlowContext(productionLineId?: string | null, productModelId?: string | null) {
  const { data, loading, error, refetch } = useQuery<{ productionLineFlowContext: ProductionLineFlowContext }>(
    PRODUCTION_LINE_FLOW_CONTEXT_QUERY,
    {
      variables: { productionLineId, productModelId },
      skip: !productionLineId,
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );
  return {
    context: data?.productionLineFlowContext ?? null,
    loading,
    error,
    refetch,
  };
}

/* ── Default form ── */

export const EMPTY_LINE_FORM = {
  entityIcon: "productionLine",
  name: "",
  code: "",
  plantId: "",
  status: "active" as "active" | "inactive",
  statusId: "",
  lineTypeId: "",
  shiftPattern: "",
  shiftPatternId: "",
  isConstraint: false,
  description: "",
  defaultCalendarId: "",
  weekStartDayId: "",
  timezoneId: "",
  capacityBasis: "",
  capacityUomId: "",
  bottleneckResourceGroupId: "",
  productFamilyId: "",
  modelIds: [] as string[],
  primaryModelId: "",
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

  /* ── GraphQL query ── */
  const { data: gqlData, loading: gqlLoading, error: gqlError, refetch } = useQuery<ProductionLinesQueryData, ProductionLinesQueryVars>(
    PRODUCTION_LINES_QUERY,
    {
      variables: {
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

  const rawData = gqlData?.productionLines;
  const lines: ProductionLine[] = Array.isArray(rawData) ? rawData : (rawData as any)?.items ?? [];
  const totalCount = lines.length;

  /* ── Mutations ── */
  const [createMutation, createState] = useMutation<MutationData>(CREATE_PRODUCTION_LINE_MUTATION);
  const [updateMutation, updateState] = useMutation<MutationData>(UPDATE_PRODUCTION_LINE_MUTATION);
  const [archiveMutation] = useMutation<any, { id: string }>(ARCHIVE_PRODUCTION_LINE_MUTATION);
  const [deleteMutation] = useMutation<any, { id: string }>(DELETE_PRODUCTION_LINE_MUTATION);
  const [assignFamiliesMutation] = useMutation<MutationData>(ASSIGN_FAMILIES_MUTATION);
  const [removeFamilyMutation] = useMutation<MutationData>(REMOVE_FAMILY_MUTATION);
  const [assignModelsMutation] = useMutation<MutationData>(ASSIGN_MODELS_MUTATION);
  const [removeModelMutation] = useMutation<MutationData>(REMOVE_MODEL_MUTATION);
  const [setPrimaryFamilyMutation] = useMutation<MutationData>(SET_PRIMARY_FAMILY_MUTATION);
  const [setPrimaryModelMutation] = useMutation<MutationData>(SET_PRIMARY_MODEL_MUTATION);

  const saveLoading = createState.loading || updateState.loading;

  /* ── CRUD helpers ── */

  const saveLine = useCallback(async (form: typeof EMPTY_LINE_FORM, editingId?: string | null): Promise<{ ok: boolean; line?: ProductionLine; errors?: Record<string, string> }> => {
    const validation = validateLineForm(form);
    if (Object.keys(validation).length > 0) return { ok: false, errors: validation };

    try {
      const input = {
        name: form.name,
        code: form.code,
        plantId: form.plantId,
        status: form.status,
        statusId: form.statusId || null,
        lineTypeId: form.lineTypeId || null,
        shiftPattern: form.shiftPattern,
        shiftPatternId: form.shiftPatternId || null,
        isConstraint: form.isConstraint,
        description: form.description || "",
        defaultCalendarId: form.defaultCalendarId || null,
        weekStartDayId: form.weekStartDayId || null,
        timezoneId: form.timezoneId || null,
        capacityBasis: form.capacityBasis || "",
        capacityUomId: form.capacityUomId || null,
        bottleneckResourceGroupId: form.bottleneckResourceGroupId || null,
        productFamilyId: form.productFamilyId || null,
        productModelIds: form.modelIds || [],
        primaryProductModelId: form.primaryModelId || null,
      };
      if (editingId) {
        const { data } = await updateMutation({
          variables: { id: editingId, input },
        });
        if (data?.updateProductionLine?.errors?.length) {
          const fieldErrors: Record<string, string> = {};
          data.updateProductionLine.errors.forEach((e: { field?: string | null; message: string }) => {
            fieldErrors[e.field || "_form"] = e.message;
          });
          return { ok: false, errors: fieldErrors };
        }
        await refetch();
        return { ok: true, line: data?.updateProductionLine?.productionLine };
      } else {
        const { data } = await createMutation({
          variables: { input },
        });
        if (data?.createProductionLine?.errors?.length) {
          const fieldErrors: Record<string, string> = {};
          data.createProductionLine.errors.forEach((e: { field?: string | null; message: string }) => {
            fieldErrors[e.field || "_form"] = e.message;
          });
          return { ok: false, errors: fieldErrors };
        }
        await refetch();
        return { ok: true, line: data?.createProductionLine?.productionLine };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save production line. Please try again.";
      return { ok: false, errors: { _form: message } };
    }
  }, [createMutation, updateMutation, refetch]);

  const archiveLine = useCallback(async (id: string): Promise<{ success: boolean; inUse: boolean; message: string }> => {
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
  }, [archiveMutation, refetch]);

  const deleteLine = useCallback(async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const { data } = await deleteMutation({ variables: { id } });
      if (data?.deleteProductionLine?.ok) {
        await refetch();
        return { success: true, message: "Production line deleted." };
      }
      const err = data?.deleteProductionLine?.errors?.[0];
      return { success: false, message: err?.message || "Failed to delete production line." };
    } catch {
      return { success: false, message: "Failed to delete production line." };
    }
  }, [deleteMutation, refetch]);

  const assignFamilies = useCallback(async (productionLineId: string, familyIds: string[], primaryFamilyId?: string | null): Promise<{ ok: boolean; assignments?: ProductFamilyAssignment[]; errors?: any }> => {
    try {
      const { data } = await assignFamiliesMutation({ variables: { productionLineId, familyIds, primaryFamilyId } });
      return { ok: data?.assignFamiliesToProductionLine?.ok ?? false, assignments: data?.assignFamiliesToProductionLine?.assignments, errors: data?.assignFamiliesToProductionLine?.errors };
    } catch { return { ok: false, errors: [{ field: "_form", code: "ERROR", message: "Failed to assign families" }] }; }
  }, [assignFamiliesMutation]);

  const removeFamily = useCallback(async (productionLineId: string, familyId: string): Promise<{ ok: boolean; errors?: any }> => {
    try {
      const { data } = await removeFamilyMutation({ variables: { productionLineId, familyId } });
      return { ok: data?.removeFamilyFromProductionLine?.ok ?? false, errors: data?.removeFamilyFromProductionLine?.errors };
    } catch { return { ok: false, errors: [{ field: "_form", code: "ERROR", message: "Failed to remove family" }] }; }
  }, [removeFamilyMutation]);

  const assignModels = useCallback(async (productionLineId: string, modelIds: string[], primaryModelId?: string | null): Promise<{ ok: boolean; assignments?: ProductModelAssignment[]; errors?: any }> => {
    try {
      const { data } = await assignModelsMutation({ variables: { productionLineId, modelIds, primaryModelId } });
      return { ok: data?.assignModelsToProductionLine?.ok ?? false, assignments: data?.assignModelsToProductionLine?.assignments, errors: data?.assignModelsToProductionLine?.errors };
    } catch { return { ok: false, errors: [{ field: "_form", code: "ERROR", message: "Failed to assign models" }] }; }
  }, [assignModelsMutation]);

  const removeModel = useCallback(async (productionLineId: string, modelId: string): Promise<{ ok: boolean; errors?: any }> => {
    try {
      const { data } = await removeModelMutation({ variables: { productionLineId, modelId } });
      return { ok: data?.removeModelFromProductionLine?.ok ?? false, errors: data?.removeModelFromProductionLine?.errors };
    } catch { return { ok: false, errors: [{ field: "_form", code: "ERROR", message: "Failed to remove model" }] }; }
  }, [removeModelMutation]);

  const setPrimaryFamily = useCallback(async (productionLineId: string, familyId: string): Promise<{ ok: boolean; errors?: any }> => {
    try {
      const { data } = await setPrimaryFamilyMutation({ variables: { productionLineId, familyId } });
      return { ok: data?.setPrimaryProductionLineFamily?.ok ?? false, errors: data?.setPrimaryProductionLineFamily?.errors };
    } catch { return { ok: false, errors: [{ field: "_form", code: "ERROR", message: "Failed to set primary family" }] }; }
  }, [setPrimaryFamilyMutation]);

  const setPrimaryModel = useCallback(async (productionLineId: string, modelId: string): Promise<{ ok: boolean; errors?: any }> => {
    try {
      const { data } = await setPrimaryModelMutation({ variables: { productionLineId, modelId } });
      return { ok: data?.setPrimaryProductionLineModel?.ok ?? false, errors: data?.setPrimaryProductionLineModel?.errors };
    } catch { return { ok: false, errors: [{ field: "_form", code: "ERROR", message: "Failed to set primary model" }] }; }
  }, [setPrimaryModelMutation]);

  const loading = gqlLoading;

  return {
    lines,
    loading,
    error: gqlError,
    saveLoading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    saveLine,
    archiveLine,
    deleteLine,
    refetch,
    assignFamilies,
    removeFamily,
    assignModels,
    removeModel,
    setPrimaryFamily,
    setPrimaryModel,
    plants: plantsData?.plants ?? [],
    totalCount,
  };
}

