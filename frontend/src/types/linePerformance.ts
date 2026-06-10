export interface LinePerformanceLine {
  id: string;
  code: string;
  name: string;
  plantId: string;
  plantName: string;
  status: string;
}

export interface LinePerformanceShift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  date: string;
}

export interface LinePerformanceKpis {
  planQuantity: number;
  actualQuantity: number;
  gap: number;
  gapStatus: string;
  runRate: number;
  runRateUnit: string;
  oeeSignal: number | null;
  oeeStatus: string;
  availability: number | null;
  performance: number | null;
  quality: number | null;
  downtimeMinutes: number;
  firstPassYield: number | null;
  qualityStatus: string;
}

export interface PlanVsActual {
  plannedQuantity: number;
  actualQuantity: number;
  remainingQuantity: number;
  gap: number;
  targetRunRate: number;
  actualRunRate: number;
  runRateUnit: string;
  projectedEndOfShift: number | null;
  progressPercent: number;
  status: string;
}

export interface OeeSignal {
  availability: number | null;
  performance: number | null;
  quality: number | null;
  overall: number | null;
  availabilityStatus: string;
  performanceStatus: string;
  qualityStatus: string;
  overallStatus: string;
  explanation: string | null;
}

export interface ActiveDowntimeEvent {
  id: string;
  startTime: string;
  reason: string;
  reasonCode: string;
  durationMinutes: number;
  status: string;
  linkedIssueId: string | null;
  linkedActionId: string | null;
}

export interface DowntimeSummary {
  totalDowntimeMinutes: number;
  topReason: string | null;
  topReasonDurationMinutes: number | null;
  activeDowntimeEvent: ActiveDowntimeEvent | null;
  totalEvents: number;
}

export interface DowntimeEvent {
  id: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  reason: string;
  reasonCode: string;
  status: string;
  description: string | null;
  linkedIssueId: string | null;
  linkedActionId: string | null;
  resourceName: string | null;
  resourceGroupName: string | null;
}

export interface QualitySummary {
  goodQuantity: number;
  rejectedQuantity: number;
  reworkQuantity: number | null;
  scrapQuantity: number | null;
  firstPassYield: number | null;
  defectCount: number;
  topDefectReason: string | null;
  linkedIssueCount: number;
}

export interface BottleneckSignal {
  resourceName: string | null;
  resourceGroupName: string | null;
  cycleTimeSignal: string | null;
  queueWipSignal: string | null;
  blockedStatus: string | null;
  starvedStatus: string | null;
  runningStatus: string | null;
  reasonSummary: string | null;
  attentionMessage: string | null;
  isConstrained: boolean;
}

export interface LinkedIssue {
  id: string;
  title: string;
  severity: string;
  status: string;
  owner: string | null;
  dueDate: string | null;
  createdAt: string;
}

export interface LinkedAction {
  id: string;
  title: string;
  priority: string;
  status: string;
  assignedTo: string | null;
  dueDate: string | null;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  eventType: string;
  description: string;
  timestamp: string;
  severity: string | null;
  userId: string | null;
  userName: string | null;
}

export interface LinePerformanceDashboard {
  line: LinePerformanceLine | null;
  shift: LinePerformanceShift | null;
  kpis: LinePerformanceKpis | null;
  planVsActual: PlanVsActual | null;
  oeeSignal: OeeSignal | null;
  downtimeSummary: DowntimeSummary | null;
  downtimeEvents: DowntimeEvent[];
  qualitySummary: QualitySummary | null;
  bottleneckSignal: BottleneckSignal | null;
  linkedIssues: LinkedIssue[];
  linkedActions: LinkedAction[];
  timelineEvents: TimelineEvent[];
  allowedActions: string[];
  lastUpdatedAt: string | null;
}

export interface LinePerformanceRecord {
  id: string;
  shiftName: string;
  date: string;
  startTime: string;
  endTime: string;
  plannedQuantity: number;
  actualQuantity: number;
  gap: number;
  oeeStatus: string;
  downtimeMinutes: number;
  qualityIssueCount: number;
  status: string;
}

export interface LinePerformanceRecordFilters {
  shiftId?: string;
  status?: string;
  date?: string;
  search?: string;
}

export interface LinePerformanceFilterShifts {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface LinePerformanceFilters {
  shifts: LinePerformanceFilterShifts[];
  dates: string[];
  statuses: string[];
  downtimeReasons: Array<{ id: string; code: string; name: string }>;
}

export interface DashboardQueryData {
  linePerformanceDashboard: LinePerformanceDashboard;
}

export interface RecordsQueryData {
  linePerformanceRecords: LinePerformanceRecord[];
}

export interface FiltersQueryData {
  linePerformanceFilters: LinePerformanceFilters;
}

export interface LogDowntimeInput {
  lineId: string;
  shiftId?: string;
  startTime: string;
  endTime?: string;
  reasonId: string;
  description?: string;
  resourceId?: string;
  resourceGroupId?: string;
}

export interface CreateIssueFromLinePerformanceInput {
  lineId: string;
  shiftId?: string;
  title: string;
  description?: string;
  severity: string;
  owner?: string;
  dueDate?: string;
  targetId?: string;
  targetType?: string;
  sourceEventId?: string;
}

export interface CreateActionFromLinePerformanceInput {
  lineId: string;
  shiftId?: string;
  title: string;
  description?: string;
  priority: string;
  assignedTo?: string;
  dueDate?: string;
  targetId?: string;
  targetType?: string;
  sourceEventId?: string;
}

export interface MutationResponse<T> {
  ok: boolean;
  errors?: Array<{ field: string; code: string; message: string }>;
  [key: string]: T | boolean | Array<{ field: string; code: string; message: string }> | undefined;
}

export type KpiStatus = "good" | "warning" | "critical" | "neutral";
export type OeeStatusLabel = "good" | "warning" | "critical" | "unavailable";
export type SeverityLabel = "critical" | "high" | "medium" | "low";
export type PriorityLabel = "urgent" | "high" | "medium" | "low";
