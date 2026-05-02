export interface ManufacturingSnapshot {
  plantCount: number;
  departmentCount: number;
  resourceGroupCount: number;
  resourceCount: number;
}

export interface ProcessSnapshot {
  productModelCount: number;
  productVariantCount: number;
  processFlowCount: number;
  activeFlowCount: number;
}

export interface ExecutionSnapshot {
  openWorkOrders: number;
  activeCycles: number;
  downtimeEventsLast24h: number;
}

export interface ImprovementSnapshot {
  openKaizens: number;
  gembaWalksThisWeek: number;
  observationsThisWeek: number;
}

export interface KpiSnapshot {
  oee: number;
  leadTimeMinutes: number;
  bottleneckResourceCode: string;
}

export interface DashboardQueryData {
  health: string;
  manufacturingSnapshot: ManufacturingSnapshot;
  processSnapshot: ProcessSnapshot;
  executionSnapshot: ExecutionSnapshot;
  improvementSnapshot: ImprovementSnapshot;
  kpiSnapshot: KpiSnapshot;
}
