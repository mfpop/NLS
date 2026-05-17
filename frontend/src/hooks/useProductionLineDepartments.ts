import { useMutation, useQuery } from "@apollo/client/react";
import { PRODUCTION_LINE_QUERY } from "@/graphql/productionLineQueries";
import { ASSIGN_DEPARTMENT_TO_LINE_MUTATION, REMOVE_DEPARTMENT_FROM_LINE_MUTATION } from "@/graphql/departmentMutations";
import type { ProductionLine } from "@/types/productionLine";

type MutationError = { field?: string | null; message: string };
type AssignmentPayload = {
  ok: boolean;
  assignment?: { id: string } | null;
  errors?: MutationError[];
};

function fieldErrors(errors?: MutationError[]): Record<string, string> {
  return (errors ?? []).reduce<Record<string, string>>((acc, error) => {
    acc[error.field || "_form"] = error.message;
    return acc;
  }, {});
}

export function useProductionLineDepartments(productionLineId?: string | null) {
  const query = useQuery<{ productionLine: ProductionLine | null }>(PRODUCTION_LINE_QUERY, {
    variables: { id: productionLineId },
    skip: !productionLineId,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const [assignMutation] = useMutation<{ assignDepartmentToProductionLine: AssignmentPayload }>(ASSIGN_DEPARTMENT_TO_LINE_MUTATION);
  const [removeMutation] = useMutation<{ removeDepartmentFromProductionLine: AssignmentPayload }>(REMOVE_DEPARTMENT_FROM_LINE_MUTATION);

  const assignDepartment = async (departmentId: string, sequence = 0, status = "ACTIVE") => {
    if (!productionLineId) return { ok: false, errors: { productionLineId: "Production line is required" } };
    const result = await assignMutation({ variables: { input: { productionLineId, departmentId, sequence, status } } });
    const payload = result.data?.assignDepartmentToProductionLine;
    if (!payload?.ok || payload.errors?.length) return { ok: false, errors: fieldErrors(payload?.errors) };
    await query.refetch();
    return { ok: true, assignment: payload.assignment };
  };

  const unassignDepartment = async (departmentId: string) => {
    if (!productionLineId) return { ok: false, errors: { productionLineId: "Production line is required" } };
    const result = await removeMutation({ variables: { productionLineId, departmentId } });
    const payload = result.data?.removeDepartmentFromProductionLine;
    if (!payload?.ok || payload.errors?.length) return { ok: false, errors: fieldErrors(payload?.errors) };
    await query.refetch();
    return { ok: true };
  };

  return {
    assignments: query.data?.productionLine?.departmentLinks ?? [],
    productionLine: query.data?.productionLine ?? null,
    loading: query.loading,
    error: query.error,
    refetch: query.refetch,
    assignDepartment,
    unassignDepartment,
  };
}
