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
}

interface StructureTreeQueryData {
  productionStructureTree: ProductionStructureNode | null;
}

interface StructureTreeQueryVars {
  plantId: string;
  search?: string;
  status?: string;
}

/* ── Mock fallback data ── */

const MOCK_STRUCTURE: Record<string, ProductionStructureNode> = {
  "P001": {
    id: "P001", name: "Main Plant", code: "MP-01", status: "active",
    productionLines: [
      {
        id: "L001", name: "C2-Cylinder Assembly", code: "L-CYL", status: "active",
        plantId: "P001", plantName: "Main Plant",
        departments: [
          {
            id: "D001", name: "Machining", code: "MCH", status: "active",
            resourceGroups: [
              {
                id: "RG001", name: "CNC Section", code: "CNC", status: "active",
                resources: [
                  { id: "R001", name: "CNC Lathe 1", code: "CNC-01", status: "active" },
                  { id: "R002", name: "CNC Lathe 2", code: "CNC-02", status: "active" },
                ],
              },
              {
                id: "RG002", name: "Inspection", code: "INS", status: "active",
                resources: [
                  { id: "R003", name: "CMM 1", code: "CMM-01", status: "active" },
                ],
              },
            ],
          },
          {
            id: "D002", name: "Assembly", code: "ASM", status: "active",
            resourceGroups: [
              {
                id: "RG003", name: "Line 1 Assembly", code: "L1-ASM", status: "active",
                resources: [
                  { id: "R004", name: "Assembly Station 1", code: "AS-01", status: "active" },
                  { id: "R005", name: "Assembly Station 2", code: "AS-02", status: "active" },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "L002", name: "Line B (STB Units)", code: "L-B", status: "active",
        plantId: "P001", plantName: "Main Plant",
        departments: [
          {
            id: "D003", name: "STB Fabrication", code: "STB-FAB", status: "active",
            resourceGroups: [
              {
                id: "RG004", name: "Welding", code: "WLD", status: "active",
                resources: [
                  { id: "R006", name: "Welding Robot 1", code: "WLD-01", status: "active" },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "L003", name: "Line C (Pipes)", code: "L-C", status: "active",
        plantId: "P001", plantName: "Main Plant",
        departments: [
          {
            id: "D004", name: "Pipe Bending", code: "PB", status: "active",
            resourceGroups: [
              {
                id: "RG005", name: "Benders", code: "BND", status: "active",
                resources: [
                  { id: "R007", name: "Pipe Bender 1", code: "PB-01", status: "active" },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "L004", name: "Line A", code: "L-A", status: "active",
        plantId: "P001", plantName: "Main Plant",
        departments: [],
      },
      {
        id: "L007", name: "C2 Units Line", code: "C2-UL", status: "active",
        plantId: "P001", plantName: "Main Plant",
        departments: [
          {
            id: "D006", name: "Machining", code: "MCH", status: "active",
            resourceGroups: [
              {
                id: "RG007", name: "CNC Section", code: "CNC", status: "active",
                resources: [
                  { id: "R009", name: "CNC Mill 1", code: "CNC-MILL-01", status: "active" },
                  { id: "R010", name: "CNC Lathe 1", code: "CNC-LATHE-01", status: "active" },
                ],
              },
            ],
          },
          {
            id: "D007", name: "Welding", code: "WLD", status: "active",
            resourceGroups: [
              {
                id: "RG008", name: "Welding Operators", code: "RG-WLD-OP", status: "active",
                resources: [
                  { id: "R011", name: "Welding Station 1", code: "WLD-ST-001", status: "active" },
                  { id: "R012", name: "Welding Station 2", code: "WLD-ST-002", status: "active" },
                  { id: "R013", name: "Welding Station 3", code: "WLD-ST-003", status: "active" },
                ],
              },
              {
                id: "RG009", name: "Welding Technicians", code: "RG-WLD-TECH", status: "active",
                resources: [
                  { id: "R014", name: "Welding Robot 1", code: "WLD-RBT-001", status: "active" },
                  { id: "R015", name: "Welding Robot 2", code: "WLD-RBT-002", status: "active" },
                  { id: "R016", name: "Welding Robot 3", code: "WLD-RBT-003", status: "active" },
                ],
              },
              {
                id: "RG010", name: "Welding Inspection", code: "RG-WLD-QC", status: "active",
                resources: [
                  { id: "R017", name: "Weld Inspection Station 1", code: "WLD-INSP-001", status: "active" },
                  { id: "R018", name: "Weld Inspection Station 2", code: "WLD-INSP-002", status: "active" },
                ],
              },
              {
                id: "RG011", name: "Welding Material Handlers", code: "RG-WLD-LOG", status: "active",
                resources: [
                  { id: "R019", name: "Weld Material Cart 1", code: "WLD-CART-001", status: "active" },
                  { id: "R020", name: "Weld Material Cart 2", code: "WLD-CART-002", status: "active" },
                  { id: "R021", name: "Weld Material Cart 3", code: "WLD-CART-003", status: "active" },
                ],
              },
              {
                id: "RG012", name: "Welding Supervision", code: "RG-WLD-MGT", status: "active",
                resources: [
                  { id: "R022", name: "Welding Control Room", code: "WLD-CTRL-001", status: "active" },
                  { id: "R023", name: "Welding Quality Terminal", code: "WLD-TERM-001", status: "active" },
                ],
              },
            ],
          },
          {
            id: "D008", name: "Coating Internal", code: "CIT", status: "active",
            resourceGroups: [],
          },
          {
            id: "D009", name: "Coating External", code: "CET", status: "active",
            resourceGroups: [],
          },
          {
            id: "D010", name: "Assembly", code: "ASM", status: "active",
            resourceGroups: [
              {
                id: "RG013", name: "Line Operators", code: "RG-OP", status: "active",
                resources: [
                  { id: "R024", name: "Assembly Station A1", code: "WS-A1", status: "active" },
                  { id: "R025", name: "Assembly Station A2", code: "WS-A2", status: "active" },
                  { id: "R026", name: "Torque Tool Set", code: "TQ-001", status: "active" },
                ],
              },
            ],
          },
          {
            id: "D011", name: "Packaging", code: "PKG", status: "active",
            resourceGroups: [
              {
                id: "RG014", name: "Packaging Operators", code: "RG-PKG", status: "active",
                resources: [
                  { id: "R027", name: "Packaging Line 1", code: "PKG-LINE-001", status: "active" },
                  { id: "R028", name: "Packaging Line 2", code: "PKG-LINE-002", status: "active" },
                  { id: "R029", name: "Packaging Station 1", code: "PKG-ST-001", status: "active" },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  "P002": {
    id: "P002", name: "Secondary Plant", code: "SP-01", status: "active",
    productionLines: [
      {
        id: "L005", name: "Line B (Shared)", code: "L-B2", status: "active",
        plantId: "P002", plantName: "Secondary Plant",
        departments: [
          {
            id: "D005", name: "Logistics", code: "LOG", status: "active",
            resourceGroups: [
              {
                id: "RG006", name: "Forklift Pool", code: "FLT", status: "active",
                resources: [
                  { id: "R008", name: "Forklift 1", code: "FL-01", status: "active" },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "L006", name: "Line C (Quality)", code: "L-CQ", status: "inactive",
        plantId: "P002", plantName: "Secondary Plant",
        departments: [],
      },
    ],
  },
  "P003": {
    id: "P003", name: "Warehouse Plant", code: "WP-01", status: "inactive",
    productionLines: [],
  },
};

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

  const productionData = data?.productionStructureTree ?? MOCK_STRUCTURE[plantId] ?? null;
  const isMockFallback = !!(error || !data || (!data?.productionStructureTree && plantId in MOCK_STRUCTURE));

  return {
    data: productionData,
    loading: loading && !isMockFallback,
    error: isMockFallback ? null : error,
    isMockFallback,
    refetch,
  };
}
