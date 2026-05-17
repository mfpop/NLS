import { useMutation, useQuery } from "@apollo/client/react";
import { RESOURCE_QUERY, RESOURCES_QUERY } from "@/graphql/manufacturingQueries";
import { CREATE_RESOURCE, DELETE_RESOURCE, UPDATE_RESOURCE } from "@/graphql/dataManagementMutations";

type ListResult<T> = T[] | { items?: T[] };

export interface ResourceNode {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  status?: string;
  statusId?: string;
  resourceGroupId?: string;
  resourceGroupName?: string;
  departmentId?: string;
  departmentName?: string;
  plantId?: string;
  plantName?: string;
  resourceTypeId?: string;
  utilization?: number | null;
  opStatus?: string;
  lastActivity?: string;
  shiftPattern?: string;
  createdAt?: string;
  updatedAt?: string;
}

type ResourcePayload = {
  ok: boolean;
  resource?: ResourceNode | null;
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

export function useResources(resourceGroupId?: string | null) {
  const query = useQuery<{ resources: ListResult<ResourceNode> }>(RESOURCES_QUERY, {
    variables: { resourceGroupId: resourceGroupId || undefined },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const [createMutation] = useMutation<{ createResource: ResourcePayload }>(CREATE_RESOURCE);
  const [updateMutation] = useMutation<{ updateResource: ResourcePayload }>(UPDATE_RESOURCE);
  const [archiveMutation] = useMutation<{ archiveResource: ResourcePayload }>(DELETE_RESOURCE);

  const saveResource = async (input: Record<string, unknown>, id?: string | null) => {
    if (id) {
      const result = await updateMutation({ variables: { id, input } });
      const payload = result.data?.updateResource;
      if (!payload?.ok || payload.errors?.length) return { ok: false, errors: fieldErrors(payload?.errors) };
      await query.refetch();
      return { ok: true, resource: payload.resource };
    }
    const result = await createMutation({ variables: { input } });
    const payload = result.data?.createResource;
    if (!payload?.ok || payload.errors?.length) return { ok: false, errors: fieldErrors(payload?.errors) };
    await query.refetch();
    return { ok: true, resource: payload.resource };
  };

  const archiveResource = async (id: string) => {
    const result = await archiveMutation({ variables: { id } });
    const payload = result.data?.archiveResource;
    if (!payload?.ok || payload.errors?.length) return { ok: false, errors: fieldErrors(payload?.errors) };
    await query.refetch();
    return { ok: true, resource: payload.resource };
  };

  return {
    resources: listItems(query.data?.resources),
    loading: query.loading,
    error: query.error,
    refetch: query.refetch,
    saveResource,
    archiveResource,
  };
}

export function useResource(id?: string | null) {
  const query = useQuery<{ resource: ResourceNode | null }>(RESOURCE_QUERY, {
    variables: { id },
    skip: !id,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  return {
    resource: query.data?.resource ?? null,
    loading: query.loading,
    error: query.error,
    refetch: query.refetch,
  };
}
