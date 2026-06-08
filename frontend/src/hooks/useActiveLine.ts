import { useEffect, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { PRODUCTION_LINES_QUERY } from "@/graphql/productionLineQueries";
import { useActiveLineId, useSelectedPlantId } from "@/stores/activeLineStore";
import type { ProductionLine } from "@/types/productionLine";

type ProductionLinesResult = {
  productionLines: ProductionLine[] | { items?: ProductionLine[] };
};

function listItems(value: ProductionLinesResult["productionLines"] | null | undefined): ProductionLine[] {
  return Array.isArray(value) ? value : (value?.items ?? []);
}

export function useActiveLine() {
  const [productionLineId, setProductionLineId] = useActiveLineId();
  const [selectedPlantId] = useSelectedPlantId();
  const { data, loading, error, refetch } = useQuery<ProductionLinesResult>(PRODUCTION_LINES_QUERY, {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const productionLines = useMemo(() => listItems(data?.productionLines), [data?.productionLines]);
  const activeLine = useMemo(
    () => productionLines.find((line) => line.id === productionLineId) ?? null,
    [productionLineId, productionLines]
  );

  useEffect(() => {
    if (productionLineId && productionLines.length > 0 && !activeLine) {
      setProductionLineId(null);
    }
  }, [activeLine, productionLineId, productionLines.length, setProductionLineId]);

  const activePlantId = activeLine?.plantId ?? selectedPlantId;

  return {
    productionLineId,
    activeLine,
    productionLines,
    loading,
    error,
    refetch,
    setActiveLine: setProductionLineId,
    selectedPlantId,
    activePlantId,
  };
}

export function useSetActiveLine() {
  const [, setProductionLineId] = useActiveLineId();
  return setProductionLineId;
}
