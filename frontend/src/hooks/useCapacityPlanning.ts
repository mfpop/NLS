import { useMutation, useQuery } from "@apollo/client/react";
import { useCallback } from "react";
import {
  APPROVE_CAPACITY_PLAN_MUTATION,
  ARCHIVE_CAPACITY_PLAN_MUTATION,
  CALCULATE_CAPACITY_PLAN_MUTATION,
  CAPACITY_PLANS_QUERY,
  CAPACITY_SCENARIOS_QUERY,
  CREATE_CAPACITY_PLAN_MUTATION,
  CREATE_CAPACITY_SCENARIO_MUTATION,
  UPDATE_CAPACITY_PLAN_INPUT_MUTATION,
} from "@/graphql/capacityQueries";
import type {
  CapacityPlan,
  CapacityPlanCreateInput,
  CapacityPlanInputUpdateInput,
  CapacityScenario,
} from "@/types/capacity";

type Payload = { ok: boolean; plan?: CapacityPlan | null; errors?: Array<{ field?: string | null; code: string; message: string }> | null };

function normalizeErrors(errors?: Payload["errors"]) {
  const out: Record<string, string> = {};
  errors?.forEach((error) => {
    out[error.field || "_form"] = error.message;
  });
  return out;
}

export function useCapacityPlans(filters: { plantId?: string; productionLineId?: string; productModelId?: string; status?: string }) {
  const { data, loading, error, refetch } = useQuery<{ capacityPlans: CapacityPlan[] }>(CAPACITY_PLANS_QUERY, {
    variables: {
      plantId: filters.plantId || undefined,
      productionLineId: filters.productionLineId || undefined,
      productModelId: filters.productModelId || undefined,
      status: filters.status && filters.status !== "ALL" ? filters.status : undefined,
    },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  return { plans: data?.capacityPlans ?? [], loading, error, refetch };
}

export function useCapacityScenarios(capacityPlanId?: string | null) {
  const { data, loading, refetch } = useQuery<{ capacityScenarios: CapacityScenario[] }>(CAPACITY_SCENARIOS_QUERY, {
    variables: { capacityPlanId },
    skip: !capacityPlanId,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  return { scenarios: data?.capacityScenarios ?? [], loading, refetch };
}

export function useCapacityPlanMutations() {
  const [createPlanMutation] = useMutation<{ createCapacityPlan: Payload }>(CREATE_CAPACITY_PLAN_MUTATION);
  const [updateInputMutation] = useMutation<{ updateCapacityPlanInput: Payload }>(UPDATE_CAPACITY_PLAN_INPUT_MUTATION);
  const [calculateMutation, calculateState] = useMutation<{ calculateCapacityPlan: Payload }>(CALCULATE_CAPACITY_PLAN_MUTATION);
  const [approveMutation] = useMutation<{ approveCapacityPlan: Payload }>(APPROVE_CAPACITY_PLAN_MUTATION);
  const [archiveMutation] = useMutation<{ archiveCapacityPlan: Payload }>(ARCHIVE_CAPACITY_PLAN_MUTATION);
  const [createScenarioMutation] = useMutation<{ createCapacityScenario: { ok: boolean; scenario?: CapacityScenario | null; errors?: Payload["errors"] } }>(CREATE_CAPACITY_SCENARIO_MUTATION);

  const createPlan = useCallback(async (input: CapacityPlanCreateInput) => {
    const { data } = await createPlanMutation({ variables: { input } });
    const payload = data?.createCapacityPlan;
    return { ok: payload?.ok ?? false, plan: payload?.plan ?? null, errors: normalizeErrors(payload?.errors) };
  }, [createPlanMutation]);

  const updateInputs = useCallback(async (input: CapacityPlanInputUpdateInput) => {
    const { data } = await updateInputMutation({ variables: { input } });
    const payload = data?.updateCapacityPlanInput;
    return { ok: payload?.ok ?? false, plan: payload?.plan ?? null, errors: normalizeErrors(payload?.errors) };
  }, [updateInputMutation]);

  const calculatePlan = useCallback(async (id: string) => {
    const { data } = await calculateMutation({ variables: { id } });
    const payload = data?.calculateCapacityPlan;
    return { ok: payload?.ok ?? false, plan: payload?.plan ?? null, errors: normalizeErrors(payload?.errors) };
  }, [calculateMutation]);

  const approvePlan = useCallback(async (id: string) => {
    const { data } = await approveMutation({ variables: { id } });
    const payload = data?.approveCapacityPlan;
    return { ok: payload?.ok ?? false, plan: payload?.plan ?? null, errors: normalizeErrors(payload?.errors) };
  }, [approveMutation]);

  const archivePlan = useCallback(async (id: string) => {
    const { data } = await archiveMutation({ variables: { id } });
    const payload = data?.archiveCapacityPlan;
    return { ok: payload?.ok ?? false, plan: payload?.plan ?? null, errors: normalizeErrors(payload?.errors) };
  }, [archiveMutation]);

  const createScenario = useCallback(async (capacityPlanId: string, name: string, assumptionsJson: Record<string, any>) => {
    const { data } = await createScenarioMutation({ variables: { input: { capacityPlanId, name, assumptionsJson } } });
    const payload = data?.createCapacityScenario;
    return { ok: payload?.ok ?? false, scenario: payload?.scenario ?? null, errors: normalizeErrors(payload?.errors) };
  }, [createScenarioMutation]);

  return {
    createPlan,
    updateInputs,
    calculatePlan,
    approvePlan,
    archivePlan,
    createScenario,
    calculating: calculateState.loading,
  };
}
