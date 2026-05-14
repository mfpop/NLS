import { useQuery, useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import {
  ROUTING_QUERY,
  ROUTINGS_QUERY,
  PRODUCTION_LINE_ROUTING_SUMMARY_QUERY,
  CREATE_ROUTING_MUTATION,
  UPDATE_ROUTING_MUTATION,
  ACTIVATE_ROUTING_MUTATION,
  ARCHIVE_ROUTING_MUTATION,
  CREATE_ROUTING_STEP_MUTATION,
  UPDATE_ROUTING_STEP_MUTATION,
  DELETE_ROUTING_STEP_MUTATION,
  REORDER_ROUTING_STEPS_MUTATION,
  ROUTING_STEP_CAPACITIES_QUERY,
} from "@/graphql/routingQueries";
import type {
  Routing,
  RoutingStep,
  RoutingSummary,
  StepCapacity,
  RoutingInput,
  RoutingStepInput,
} from "@/types/routing";

type MutationData = Record<string, any>;

export function useRoutingSummary(productionLineId: string | null) {
  const { data, loading, error, refetch } = useQuery<{ productionLineRoutingSummary: RoutingSummary }>(
    PRODUCTION_LINE_ROUTING_SUMMARY_QUERY,
    {
      variables: { productionLineId },
      skip: !productionLineId,
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );
  return {
    summary: data?.productionLineRoutingSummary ?? null,
    loading,
    error,
    refetch,
  };
}

export function useRouting(id: string | null) {
  const { data, loading, error, refetch } = useQuery<{ routing: Routing }>(
    ROUTING_QUERY,
    {
      variables: { id },
      skip: !id,
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );
  return {
    routing: data?.routing ?? null,
    loading,
    error,
    refetch,
  };
}

export function useRoutings(
  productionLineId?: string | null,
  productModelId?: string | null,
  productFamilyId?: string | null
) {
  const { data, loading, error, refetch } = useQuery<{ routings: Routing[] }>(
    ROUTINGS_QUERY,
    {
      variables: { productionLineId, productModelId, productFamilyId },
      skip: !productionLineId,
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );
  return {
    routings: data?.routings ?? [],
    loading,
    error,
    refetch,
  };
}

export function useStepCapacities(
  routingId: string | null,
  demand: number = 1000,
  availableHours: number = 8.0
) {
  const { data, loading } = useQuery<{ routingStepCapacities: StepCapacity[] }>(
    ROUTING_STEP_CAPACITIES_QUERY,
    {
      variables: { routingId, demand, availableHours },
      skip: !routingId,
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );
  return {
    capacities: data?.routingStepCapacities ?? [],
    loading,
  };
}

export function useRoutingMutations() {
  const [createMutation, createState] = useMutation<MutationData>(CREATE_ROUTING_MUTATION);
  const [updateMutation, updateState] = useMutation<MutationData>(UPDATE_ROUTING_MUTATION);
  const [activateMutation] = useMutation<MutationData>(ACTIVATE_ROUTING_MUTATION);
  const [archiveMutation] = useMutation<MutationData>(ARCHIVE_ROUTING_MUTATION);
  const [createStepMutation] = useMutation<MutationData>(CREATE_ROUTING_STEP_MUTATION);
  const [updateStepMutation] = useMutation<MutationData>(UPDATE_ROUTING_STEP_MUTATION);
  const [deleteStepMutation] = useMutation<MutationData>(DELETE_ROUTING_STEP_MUTATION);
  const [reorderStepsMutation] = useMutation<MutationData>(REORDER_ROUTING_STEPS_MUTATION);

  const saving = createState.loading || updateState.loading;

  const createRouting = useCallback(
    async (input: RoutingInput): Promise<{ ok: boolean; routing?: Routing; errors?: any }> => {
      try {
        const { data } = await createMutation({ variables: { input } });
        return {
          ok: data?.createRouting?.ok ?? false,
          routing: data?.createRouting?.routing ?? null,
          errors: data?.createRouting?.errors,
        };
      } catch {
        return { ok: false, errors: [{ field: "_form", code: "ERROR", message: "Failed to create routing" }] };
      }
    },
    [createMutation]
  );

  const updateRouting = useCallback(
    async (id: string, input: RoutingInput): Promise<{ ok: boolean; routing?: Routing; errors?: any }> => {
      try {
        const { data } = await updateMutation({ variables: { id, input } });
        return {
          ok: data?.updateRouting?.ok ?? false,
          routing: data?.updateRouting?.routing ?? null,
          errors: data?.updateRouting?.errors,
        };
      } catch {
        return { ok: false, errors: [{ field: "_form", code: "ERROR", message: "Failed to update routing" }] };
      }
    },
    [updateMutation]
  );

  const activateRouting = useCallback(
    async (id: string): Promise<{ ok: boolean; routing?: Routing; errors?: any }> => {
      try {
        const { data } = await activateMutation({ variables: { id } });
        return {
          ok: data?.activateRouting?.ok ?? false,
          routing: data?.activateRouting?.routing ?? null,
          errors: data?.activateRouting?.errors,
        };
      } catch {
        return { ok: false, errors: [{ field: "_form", code: "ERROR", message: "Failed to activate routing" }] };
      }
    },
    [activateMutation]
  );

  const archiveRouting = useCallback(
    async (id: string): Promise<{ ok: boolean; errors?: any }> => {
      try {
        const { data } = await archiveMutation({ variables: { id } });
        return { ok: data?.archiveRouting?.ok ?? false, errors: data?.archiveRouting?.errors };
      } catch {
        return { ok: false, errors: [{ field: "_form", code: "ERROR", message: "Failed to archive routing" }] };
      }
    },
    [archiveMutation]
  );

  const createStep = useCallback(
    async (input: RoutingStepInput): Promise<{ ok: boolean; step?: RoutingStep; errors?: any }> => {
      try {
        const { data } = await createStepMutation({ variables: { input } });
        return {
          ok: data?.createRoutingStep?.ok ?? false,
          step: data?.createRoutingStep?.step ?? null,
          errors: data?.createRoutingStep?.errors,
        };
      } catch {
        return { ok: false, errors: [{ field: "_form", code: "ERROR", message: "Failed to create step" }] };
      }
    },
    [createStepMutation]
  );

  const updateStep = useCallback(
    async (id: string, input: RoutingStepInput): Promise<{ ok: boolean; step?: RoutingStep; errors?: any }> => {
      try {
        const { data } = await updateStepMutation({ variables: { id, input } });
        return {
          ok: data?.updateRoutingStep?.ok ?? false,
          step: data?.updateRoutingStep?.step ?? null,
          errors: data?.updateRoutingStep?.errors,
        };
      } catch {
        return { ok: false, errors: [{ field: "_form", code: "ERROR", message: "Failed to update step" }] };
      }
    },
    [updateStepMutation]
  );

  const deleteStep = useCallback(
    async (id: string): Promise<{ ok: boolean; errors?: any }> => {
      try {
        const { data } = await deleteStepMutation({ variables: { id } });
        return { ok: data?.deleteRoutingStep?.ok ?? false, errors: data?.deleteRoutingStep?.errors };
      } catch {
        return { ok: false, errors: [{ field: "_form", code: "ERROR", message: "Failed to delete step" }] };
      }
    },
    [deleteStepMutation]
  );

  const reorderSteps = useCallback(
    async (routingId: string, orderedStepIds: string[]): Promise<{ ok: boolean; errors?: any }> => {
      try {
        const { data } = await reorderStepsMutation({ variables: { input: { routingId, orderedStepIds } } });
        return { ok: data?.reorderRoutingSteps?.ok ?? false, errors: data?.reorderRoutingSteps?.errors };
      } catch {
        return { ok: false, errors: [{ field: "_form", code: "ERROR", message: "Failed to reorder steps" }] };
      }
    },
    [reorderStepsMutation]
  );

  return {
    createRouting,
    updateRouting,
    activateRouting,
    archiveRouting,
    createStep,
    updateStep,
    deleteStep,
    reorderSteps,
    saving,
  };
}
