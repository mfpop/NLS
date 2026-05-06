import { useQuery } from "@apollo/client/react";
import { DATA_MANAGEMENT_OVERVIEW_QUERY } from "@/graphql/dataManagementQueries";

/* ── Types ── */

export interface DataManagementPlantNode {
  id: string;
  name: string;
  code: string;
  status: string;
}

export interface DataManagementKpis {
  productionLines: number;
  departments: number;
  resources: number;
  plantStatus: string;
}

export interface DataManagementTreeChild {
  id: string;
  type: string;
  name: string;
  code: string;
  status: string;
  childCount: number;
  children: DataManagementTreeChild[];
}

export interface DataManagementTreeRoot {
  id: string;
  type: string;
  name: string;
  code: string;
  status: string;
  childCount: number;
  children: DataManagementTreeChild[];
}

export interface DataManagementNavCounts {
  plants: number;
  productionLines: number;
  departments: number;
  resourceGroups: number;
  resources: number;
  referenceTables: number;
}

export interface DataManagementSystemHealth {
  runningLines: number;
  resourcesDown: number;
  highUtilizationResources: number;
}

export interface DataManagementOverviewData {
  dataManagementOverview: {
    selectedPlant: DataManagementPlantNode | null;
    plants: DataManagementPlantNode[];
    kpis: DataManagementKpis;
    tree: DataManagementTreeRoot | null;
    navigationCounts: DataManagementNavCounts;
    systemHealth: DataManagementSystemHealth;
  };
}

export interface DataManagementOverviewVars {
  plantId?: string | null;
  search?: string;
  status?: string;
}

/* ── Hook ── */

export function useDataManagementOverview(vars: DataManagementOverviewVars) {
  const { data, loading, error, refetch } = useQuery<
    DataManagementOverviewData,
    DataManagementOverviewVars
  >(DATA_MANAGEMENT_OVERVIEW_QUERY, {
    variables: vars,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  return {
    data: data?.dataManagementOverview ?? null,
    loading,
    error,
    refetch,
  };
}
