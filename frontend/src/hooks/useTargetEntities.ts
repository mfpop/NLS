import { useQuery } from "@apollo/client/react";
import { useMemo } from "react";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { PRODUCTION_LINES_QUERY } from "@/graphql/productionLineQueries";
import {
  DEPARTMENTS_QUERY, RESOURCE_GROUPS_QUERY, RESOURCES_QUERY,
} from "@/graphql/manufacturingQueries";

export interface TargetOption {
  value: string;
  label: string;
}

export interface TargetEntity {
  id: string;
  name: string;
  code: string;
  parent: string;
}

/**
 * Consolidated hook that fetches all target entity types (Plants, Production Lines,
 * Departments, Resource Groups, Resources) with skip logic based on the active `targetType`.
 * Returns formatted dropdown options and a merged entity list for label resolution.
 */
export function useTargetEntities(targetType: string) {
  const { data: plantsData } = useQuery<{ plants: { id: string; name: string; code: string; plantName?: string }[] }>(PLANTS_QUERY, {
    variables: { status: "ACTIVE" },
    skip: targetType !== "Plant",
    fetchPolicy: "cache-and-network",
  });
  const { data: linesData } = useQuery<{ productionLines: { id: string; name: string; code: string; plantName?: string }[] }>(PRODUCTION_LINES_QUERY, {
    variables: { status: "ACTIVE", limit: 500 },
    skip: targetType !== "ProductionLine",
    fetchPolicy: "cache-and-network",
  });
  const { data: deptsData } = useQuery<{ departments: { id: string; name: string; code: string; plant?: { name: string } }[] }>(DEPARTMENTS_QUERY, {
    variables: { status: "ACTIVE" },
    skip: targetType !== "Department",
    fetchPolicy: "cache-and-network",
  });
  const { data: rgsData } = useQuery<{ resourceGroups: { id: string; name: string; code: string; plantName?: string }[] }>(RESOURCE_GROUPS_QUERY, {
    skip: targetType !== "ResourceGroup",
    fetchPolicy: "cache-and-network",
  });
  const { data: resourcesData } = useQuery<{ resources: { id: string; name: string; code: string; plantName?: string }[] }>(RESOURCES_QUERY, {
    skip: targetType !== "Resource",
    fetchPolicy: "cache-and-network",
  });

  const plants: any[] = Array.isArray(plantsData?.plants) ? plantsData.plants : [];
  const lines: any[] = Array.isArray(linesData?.productionLines) ? linesData.productionLines : [];
  const depts: any[] = Array.isArray(deptsData?.departments) ? deptsData.departments : [];
  const rgs: any[] = Array.isArray(rgsData?.resourceGroups) ? rgsData.resourceGroups : [];
  const resources: any[] = Array.isArray(resourcesData?.resources) ? resourcesData.resources : [];

  const targetOptions = useMemo((): TargetOption[] => {
    switch (targetType) {
      case "Plant":
        return plants.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }));
      case "ProductionLine":
        return lines.map((l) => ({ value: l.id, label: `${l.code} — ${l.name}${l.plantName ? ` (${l.plantName})` : ""}` }));
      case "Department":
        return depts.map((d) => ({ value: d.id, label: `${d.code} — ${d.name}${d.plant?.name ? ` (${d.plant.name})` : ""}` }));
      case "ResourceGroup":
        return rgs.map((rg) => ({ value: rg.id, label: `${rg.code} — ${rg.name}${rg.plantName ? ` (${rg.plantName})` : ""}` }));
      case "Resource":
        return resources.map((r) => ({ value: r.id, label: `${r.code} — ${r.name}${r.plantName ? ` (${r.plantName})` : ""}` }));
      default:
        return [];
    }
  }, [targetType, plants, lines, depts, rgs, resources]);

  const allEntities = useMemo((): TargetEntity[] => [
    ...plants.map((p) => ({ id: p.id, name: p.name, code: p.code, parent: p.plantName || "" })),
    ...lines.map((l) => ({ id: l.id, name: l.name, code: l.code, parent: l.plantName || "" })),
    ...depts.map((d) => ({ id: d.id, name: d.name, code: d.code, parent: d.plant?.name || "" })),
    ...rgs.map((rg) => ({ id: rg.id, name: rg.name, code: rg.code, parent: rg.plantName || "" })),
    ...resources.map((r) => ({ id: r.id, name: r.name, code: r.code, parent: r.plantName || "" })),
  ], [plants, lines, depts, rgs, resources]);

  const loading = (
    (targetType === "Plant" && plants.length === 0) ||
    (targetType === "ProductionLine" && lines.length === 0) ||
    (targetType === "Department" && depts.length === 0) ||
    (targetType === "ResourceGroup" && rgs.length === 0) ||
    (targetType === "Resource" && resources.length === 0)
  );

  return { targetOptions, allEntities, loading };
}

/**
 * Resolves a target entity ID into a human-readable label (e.g. "Tijuana Plant / Assembly Line 1").
 */
export function resolveTargetLabel(allEntities: TargetEntity[], targetId: string): string {
  const found = allEntities.find((e) => e.id === targetId);
  return found ? (found.parent ? `${found.parent} / ${found.name}` : found.name) : "";
}
