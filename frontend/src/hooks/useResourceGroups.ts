import { useMutation, useQuery } from "@apollo/client/react";
import { RESOURCE_GROUPS_QUERY, RESOURCE_GROUP_QUERY } from "@/graphql/manufacturingQueries";
import { CREATE_RESOURCE_GROUP, DELETE_RESOURCE_GROUP, UPDATE_RESOURCE_GROUP } from "@/graphql/dataManagementMutations";

type ListResult<T> = T[] | { items?: T[] };

export interface CapacitySnapshotNode {
  availableMinutes: number;
  theoreticalCapacity: number;
  effectiveCapacity: number;
  bottleneckCapacity: number | null;
  capacityUom: string;
  fromDatetime: string;
  toDatetime: string;
  calculatedAt: string;
}

export interface ResourceGroupNode {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  status?: string;
  statusId?: string;
  departmentId?: string;
  departmentName?: string;
  plantId?: string;
  plantName?: string;
  resourceCount?: number;
  capacityModel?: string;
  oeeTarget?: number | null;
  isBottleneck?: boolean;
  isConstraint?: boolean;
  createdAt?: string;
  updatedAt?: string;
  latestCapacity?: CapacitySnapshotNode | null;
}

type ResourceGroupPayload = {
  ok: boolean;
  resourceGroup?: ResourceGroupNode | null;
  errors?: Array<{ field?: string | null; message: string }>;
};

function listItems<T>(value: ListResult<T> | null | undefined): T[] {
  return Array.isArray(value) ? value : (value?.items ?? []);
}

function fieldErrors(errors?: Array<{ field?: string | null; message: string }>): Record<string, string> {
  return (errors ?? []).reduce<Record<string, string>>((acc, error) => {
    acc[error.field || "_form"] = error.message;
    return acc;
  }, {});
}

export function useResourceGroups(departmentId?: string | null) {
  const query = useQuery<{ resourceGroups: ListResult<ResourceGroupNode> }>(RESOURCE_GROUPS_QUERY, {
    variables: { departmentId: departmentId || undefined },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const [createMutation] = useMutation<{ createResourceGroup: ResourceGroupPayload }>(CREATE_RESOURCE_GROUP);
  const [updateMutation] = useMutation<{ updateResourceGroup: ResourceGroupPayload }>(UPDATE_RESOURCE_GROUP);
  const [archiveMutation] = useMutation<{ archiveResourceGroup: ResourceGroupPayload }>(DELETE_RESOURCE_GROUP);

  const saveResourceGroup = async (input: Record<string, unknown>, id?: string | null) => {
    if (id) {
      const result = await updateMutation({ variables: { id, input } });
      const payload = result.data?.updateResourceGroup;
      if (!payload?.ok || payload.errors?.length) return { ok: false, errors: fieldErrors(payload?.errors) };
      await query.refetch();
      return { ok: true, resourceGroup: payload.resourceGroup };
    }
    const result = await createMutation({ variables: { input } });
    const payload = result.data?.createResourceGroup;
    if (!payload?.ok || payload.errors?.length) return { ok: false, errors: fieldErrors(payload?.errors) };
    await query.refetch();
    return { ok: true, resourceGroup: payload.resourceGroup };
  };

  const archiveResourceGroup = async (id: string) => {
    const result = await archiveMutation({ variables: { id } });
    const payload = result.data?.archiveResourceGroup;
    if (!payload?.ok || payload.errors?.length) return { ok: false, errors: fieldErrors(payload?.errors) };
    await query.refetch();
    return { ok: true, resourceGroup: payload.resourceGroup };
  };

  return {
    resourceGroups: listItems(query.data?.resourceGroups),
    loading: query.loading,
    error: query.error,
    refetch: query.refetch,
    saveResourceGroup,
    archiveResourceGroup,
  };
}

export function useResourceGroup(id?: string | null) {
  const query = useQuery<{ resourceGroup: ResourceGroupNode | null }>(RESOURCE_GROUP_QUERY, {
    variables: { id },
    skip: !id,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  return {
    resourceGroup: query.data?.resourceGroup ?? null,
    loading: query.loading,
    error: query.error,
    refetch: query.refetch,
  };
}
