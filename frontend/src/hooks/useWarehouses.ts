import { useMutation, useQuery } from "@apollo/client/react";
import {
  WAREHOUSES_QUERY,
  WAREHOUSE_QUERY,
} from "@/graphql/warehouseQueries";
import {
  CREATE_WAREHOUSE_MUTATION,
  UPDATE_WAREHOUSE_MUTATION,
  ARCHIVE_WAREHOUSE_MUTATION,
} from "@/graphql/warehouseMutations";
import type { Warehouse, WarehousePayload, WarehouseInput } from "@/types/warehouse";

interface WarehousesQueryVars {
  plantId?: string | null;
  isActive?: boolean | null;
  limit?: number | null;
  offset?: number | null;
}

function fieldErrors(errors?: Array<{ field?: string | null; message: string }>): Record<string, string> {
  return (errors ?? []).reduce<Record<string, string>>((acc, error) => {
    acc[error.field || "_form"] = error.message;
    return acc;
  }, {});
}

export function useWarehouses(vars?: WarehousesQueryVars) {
  const query = useQuery<{ warehouses: Warehouse[] }>(WAREHOUSES_QUERY, {
    variables: {
      plantId: vars?.plantId || undefined,
      isActive: vars?.isActive ?? undefined,
      limit: vars?.limit || undefined,
      offset: vars?.offset || undefined,
    },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const [createMutation] = useMutation<{ createWarehouse: WarehousePayload }>(CREATE_WAREHOUSE_MUTATION);
  const [updateMutation] = useMutation<{ updateWarehouse: WarehousePayload }>(UPDATE_WAREHOUSE_MUTATION);
  const [archiveMutation] = useMutation<{ archiveWarehouse: WarehousePayload }>(ARCHIVE_WAREHOUSE_MUTATION);

  const saveWarehouse = async (input: WarehouseInput, id?: string | null) => {
    if (id) {
      const result = await updateMutation({ variables: { id, input } });
      const payload = result.data?.updateWarehouse;
      if (!payload?.ok || (payload.errors && payload.errors.length > 0)) {
        return { ok: false, errors: fieldErrors(payload?.errors) };
      }
      await query.refetch();
      return { ok: true, warehouse: payload.warehouse };
    }
    const result = await createMutation({ variables: { input } });
    const payload = result.data?.createWarehouse;
    if (!payload?.ok || (payload.errors && payload.errors.length > 0)) {
      return { ok: false, errors: fieldErrors(payload?.errors) };
    }
    await query.refetch();
    return { ok: true, warehouse: payload.warehouse };
  };

  const archiveWarehouse = async (id: string) => {
    const result = await archiveMutation({ variables: { id } });
    const payload = result.data?.archiveWarehouse;
    if (!payload?.ok || (payload.errors && payload.errors.length > 0)) {
      return { ok: false, errors: fieldErrors(payload?.errors) };
    }
    await query.refetch();
    return { ok: true, warehouse: payload.warehouse };
  };

  return {
    warehouses: query.data?.warehouses ?? [],
    loading: query.loading,
    error: query.error,
    refetch: query.refetch,
    saveWarehouse,
    archiveWarehouse,
  };
}

export function useWarehouse(id?: string | null) {
  const query = useQuery<{ warehouse: Warehouse | null }>(WAREHOUSE_QUERY, {
    variables: { id },
    skip: !id,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  return {
    warehouse: query.data?.warehouse ?? null,
    loading: query.loading,
    error: query.error,
    refetch: query.refetch,
  };
}
