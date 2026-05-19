import { useMutation, useQuery } from "@apollo/client/react";
import { MATERIAL_BINS_QUERY, MATERIAL_BIN_QUERY } from "@/graphql/manufacturingQueries";
import { CREATE_MATERIAL_BIN, UPDATE_MATERIAL_BIN, ARCHIVE_MATERIAL_BIN } from "@/graphql/dataManagementMutations";
import type { MaterialBin, MaterialBinPayload } from "@/types/materialBin";

type ListResult<T> = T[] | { items?: T[] };

function listItems<T>(value: ListResult<T> | null | undefined): T[] {
  return Array.isArray(value) ? value : (value?.items ?? []);
}

function fieldErrors(errors?: Array<{ field?: string | null; message: string }>): Record<string, string> {
  return (errors ?? []).reduce<Record<string, string>>((acc, error) => {
    acc[error.field || "_form"] = error.message;
    return acc;
  }, {});
}

interface BinsQueryVars {
  plantId?: string | null;
  warehouseCode?: string | null;
  productionLineId?: string | null;
  resourceGroupId?: string | null;
  binType?: string | null;
  replenishmentMode?: string | null;
  isActive?: boolean | null;
  search?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export function useMaterialBins(vars?: BinsQueryVars) {
  const query = useQuery<{ materialBins: ListResult<MaterialBin> }>(MATERIAL_BINS_QUERY, {
    variables: {
      plantId: vars?.plantId || undefined,
      warehouseCode: vars?.warehouseCode || undefined,
      productionLineId: vars?.productionLineId || undefined,
      resourceGroupId: vars?.resourceGroupId || undefined,
      binType: vars?.binType || undefined,
      replenishmentMode: vars?.replenishmentMode || undefined,
      isActive: vars?.isActive ?? undefined,
      search: vars?.search || undefined,
      limit: vars?.limit || undefined,
      offset: vars?.offset || undefined,
    },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const [createMutation] = useMutation<{ createMaterialBin: MaterialBinPayload }>(CREATE_MATERIAL_BIN);
  const [updateMutation] = useMutation<{ updateMaterialBin: MaterialBinPayload }>(UPDATE_MATERIAL_BIN);
  const [archiveMutation] = useMutation<{ archiveMaterialBin: MaterialBinPayload }>(ARCHIVE_MATERIAL_BIN);

  const saveMaterialBin = async (input: Record<string, unknown>, id?: string | null) => {
    if (id) {
      const result = await updateMutation({ variables: { id, input } });
      const payload = result.data?.updateMaterialBin;
      if (!payload?.ok || (payload.errors && payload.errors.length > 0)) return { ok: false, errors: fieldErrors(payload?.errors) };
      await query.refetch();
      return { ok: true, materialBin: payload.materialBin };
    }
    const result = await createMutation({ variables: { input } });
    const payload = result.data?.createMaterialBin;
    if (!payload?.ok || (payload.errors && payload.errors.length > 0)) return { ok: false, errors: fieldErrors(payload?.errors) };
    await query.refetch();
    return { ok: true, materialBin: payload.materialBin };
  };

  const archiveMaterialBin = async (id: string) => {
    const result = await archiveMutation({ variables: { id } });
    const payload = result.data?.archiveMaterialBin;
    if (!payload?.ok || (payload.errors && payload.errors.length > 0)) return { ok: false, errors: fieldErrors(payload?.errors) };
    await query.refetch();
    return { ok: true, materialBin: payload.materialBin };
  };

  return {
    materialBins: listItems(query.data?.materialBins),
    loading: query.loading,
    error: query.error,
    refetch: query.refetch,
    saveMaterialBin,
    archiveMaterialBin,
  };
}

export function useMaterialBin(id?: string | null) {
  const query = useQuery<{ materialBin: MaterialBin | null }>(MATERIAL_BIN_QUERY, {
    variables: { id },
    skip: !id,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  return {
    materialBin: query.data?.materialBin ?? null,
    loading: query.loading,
    error: query.error,
    refetch: query.refetch,
  };
}
