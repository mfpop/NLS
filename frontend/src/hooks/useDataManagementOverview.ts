import { useEffect, useState } from "react";
import { useQuery } from "@apollo/client/react";
import {
  DATA_MANAGEMENT_OVERVIEW_FULL_QUERY,
  DATA_MANAGEMENT_OVERVIEW_SUMMARY_QUERY,
} from "@/graphql/dataManagementQueries";

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
  resourceGroups: number;
  resources: number;
  plantStatus: string;
}

export interface DataManagementTreeChild {
  id: string;
  type: string;
  name: string;
  code: string;
  status: string;
  departmentName?: string | null;
  childCount: number;
  children: DataManagementTreeChild[];
  scheduleStatus?: string | null;
  scheduleSource?: string | null;
  shiftPatternName?: string | null;
}

export interface DataManagementTreeRoot {
  id: string;
  type: string;
  name: string;
  code: string;
  status: string;
  childCount: number;
  children: DataManagementTreeChild[];
  scheduleStatus?: string | null;
  scheduleSource?: string | null;
  shiftPatternName?: string | null;
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
  includeTree?: boolean;
  /** Paint shell first, then request the heavy tree on the next frame. */
  deferTree?: boolean;
  treeMode?: string;
}

/* ── Hook ── */

export function useDataManagementOverview(vars: DataManagementOverviewVars) {
  const wantsTree = vars.includeTree ?? false;
  const [treeEnabled, setTreeEnabled] = useState(!vars.deferTree || !wantsTree);

  useEffect(() => {
    if (!vars.deferTree || !wantsTree) {
      setTreeEnabled(wantsTree);
      return;
    }
    setTreeEnabled(false);
    const frame = requestAnimationFrame(() => setTreeEnabled(true));
    return () => cancelAnimationFrame(frame);
  }, [vars.deferTree, wantsTree]);

  const includeTree = wantsTree && treeEnabled;

  const { data, loading, error, refetch } = useQuery<
    DataManagementOverviewData,
    DataManagementOverviewVars
  >(includeTree ? DATA_MANAGEMENT_OVERVIEW_FULL_QUERY : DATA_MANAGEMENT_OVERVIEW_SUMMARY_QUERY, {
    variables: {
      plantId: vars.plantId,
      search: vars.search,
      status: vars.status,
      includeTree,
      treeMode: vars.treeMode || undefined,
    },
    fetchPolicy: "cache-first",
    nextFetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  return {
    data: data?.dataManagementOverview ?? null,
    loading,
    error,
    refetch,
  };
}
