import { useQuery } from "@apollo/client/react";
import { PRODUCTION_STRUCTURE_TREE_QUERY } from "@/graphql/productionStructureQueries";

/* ── Types ── */

export interface ResourceStructure {
  id: string;
  name: string;
  code: string;
  status: string;
}

export interface ResourceGroupStructure {
  id: string;
  name: string;
  code: string;
  status: string;
  resources: ResourceStructure[];
}

export interface DepartmentStructure {
  id: string;
  name: string;
  code: string;
  status: string;
  resourceGroups: ResourceGroupStructure[];
}

export interface ProductionLineStructure {
  id: string;
  name: string;
  code: string;
  status: string;
  departments: DepartmentStructure[];
  plantId: string;
  plantName: string;
}

export interface ProductionStructureNode {
  id: string;
  name: string;
  code: string;
  status: string;
  productionLines: ProductionLineStructure[];
  departments: DepartmentStructure[];
}

interface StructureTreeQueryData {
  productionStructureTree: ProductionStructureNode | null;
}

interface StructureTreeQueryVars {
  plantId: string;
  search?: string;
  status?: string;
}

/* ── Plants Selector (populated from API) ── */

export const MOCK_PLANTS_SELECTOR: { id: string; name: string; code: string; status: string }[] = [];
/* ── Hook ── */

export function useProductionStructureTree(plantId: string, search?: string, status?: string) {
  const { data, loading, error, refetch } = useQuery<StructureTreeQueryData, StructureTreeQueryVars>(
    PRODUCTION_STRUCTURE_TREE_QUERY,
    {
      variables: { plantId, search: search || undefined, status: status !== "all" ? status : undefined },
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
      skip: !plantId,
    }
  );

  const isMockFallback = false;
  const productionData = data?.productionStructureTree ?? null;

  return {
    data: productionData,
    loading,
    error,
    isMockFallback,
    refetch,
  };
}
