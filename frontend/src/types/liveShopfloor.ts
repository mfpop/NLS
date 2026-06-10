export interface LiveShopfloorLineSummary {
  id: string;
  code: string;
  name: string;
  plantId: string;
  plantName: string;
  status: string;
  displayStatus: string;
}

export interface LiveShopfloorShiftSummary {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  date: string;
  elapsedPercent: number | null;
  remainingMinutes: number | null;
  supervisor: string | null;
  crew: string | null;
}

export interface LiveShopfloorCurrentProduction {
  productName: string | null;
  productCode: string | null;
  partNumber: string | null;
  productionOrderId: string | null;
  productionOrderNumber: string | null;
  plannedQuantity: number | null;
  actualQuantity: number | null;
  operationName: string | null;
  routingStep: string | null;
}

export interface LiveShopfloorLiveStatus {
  lineStatus: string;
  displayStatus: string;
  runState: string | null;
  bottleneckResource: string | null;
  lastUpdatedAt: string | null;
}

export interface LiveShopfloorAssignedResourceGroup {
  id: string;
  resourceGroupId: string;
  resourceGroupCode: string;
  resourceGroupName: string;
  departmentName: string;
  sequence: number;
  status: string;
  displayStatus: string;
  activeOperation: string | null;
  activeDowntimeReason: string | null;
  issueCount: number;
  actionCount: number;
  lastUpdated: string | null;
}

export interface LiveShopfloorResourceStatus {
  id: string;
  name: string;
  code: string;
  resourceGroupId: string;
  resourceGroupName: string;
  status: string;
  displayStatus: string;
  currentOperation: string | null;
  activeDowntimeEventId: string | null;
  activeDowntimeReason: string | null;
  lastUpdated: string | null;
}

export interface LiveShopfloorResourceGroupStatusSummary {
  runningCount: number;
  stoppedCount: number;
  blockedCount: number;
  starvedCount: number;
  maintenanceCount: number;
  unknownCount: number;
  activeBottleneckResource: string | null;
}

export interface LiveShopfloorActiveDowntime {
  id: string;
  startTime: string;
  reason: string;
  reasonCode: string;
  durationMinutes: number;
  status: string;
  displayStatus: string;
  affectedResourceName: string | null;
  affectedResourceGroupName: string | null;
  linkedIssueId: string | null;
  linkedActionId: string | null;
  owner: string | null;
}

export interface LiveShopfloorRecentDowntimeEvent {
  id: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  reason: string;
  reasonCode: string;
  status: string;
  displayStatus: string;
  affectedResourceName: string | null;
  affectedResourceGroupName: string | null;
}

export interface LiveShopfloorBottleneckSignal {
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

export interface LiveShopfloorLinkedIssue {
  id: string;
  title: string;
  severity: string;
  displaySeverity: string;
  status: string;
  displayStatus: string;
  owner: string | null;
  dueDate: string | null;
  createdAt: string;
  sourceType: string | null;
  linkedResourceName: string | null;
  linkedResourceGroupName: string | null;
}

export interface LiveShopfloorLinkedAction {
  id: string;
  title: string;
  priority: string;
  displayPriority: string;
  status: string;
  displayStatus: string;
  assignedTo: string | null;
  dueDate: string | null;
  createdAt: string;
  sourceType: string | null;
  linkedResourceName: string | null;
  linkedResourceGroupName: string | null;
}

export interface LiveShopfloorTimelineEvent {
  id: string;
  eventType: string;
  description: string;
  timestamp: string;
  severity: string | null;
  displaySeverity: string | null;
  userId: string | null;
  userName: string | null;
  linkedResourceName: string | null;
  linkedResourceGroupName: string | null;
}

export interface LiveShopfloorEvent {
  id: string;
  eventType: string;
  displayType: string;
  title: string;
  summary: string | null;
  description: string | null;
  severity: string;
  displaySeverity: string;
  status: string;
  displayStatus: string;
  timestamp: string;
  linkedResourceName: string | null;
  linkedResourceGroupName: string | null;
  linkedIssueId: string | null;
  linkedActionId: string | null;
}

export interface LiveShopfloorDashboard {
  lineSummary: LiveShopfloorLineSummary | null;
  shiftSummary: LiveShopfloorShiftSummary | null;
  currentProduction: LiveShopfloorCurrentProduction | null;
  liveStatus: LiveShopfloorLiveStatus | null;
  assignedResourceGroups: LiveShopfloorAssignedResourceGroup[];
  resourceStatuses: LiveShopfloorResourceStatus[];
  resourceGroupStatusSummary: LiveShopfloorResourceGroupStatusSummary | null;
  activeDowntime: LiveShopfloorActiveDowntime | null;
  recentDowntimeEvents: LiveShopfloorRecentDowntimeEvent[];
  bottleneckSignal: LiveShopfloorBottleneckSignal | null;
  openIssues: LiveShopfloorLinkedIssue[];
  openActions: LiveShopfloorLinkedAction[];
  timelineEvents: LiveShopfloorTimelineEvent[];
  allowedActions: string[];
  lastUpdatedAt: string | null;
}

export interface LiveShopfloorEventFilters {
  shiftId?: string;
  eventTypes?: string[];
  status?: string;
}

export interface LiveShopfloorFilterOptions {
  shifts: Array<{ id: string; name: string; startTime: string; endTime: string }>;
  downtimeReasons: Array<{ id: string; code: string; name: string }>;
  eventTypes: string[];
  statusFilters: string[];
}

export interface LiveShopfloorDashboardQueryData {
  liveShopfloorDashboard: LiveShopfloorDashboard;
}

export interface LiveShopfloorEventsQueryData {
  liveShopfloorEvents: LiveShopfloorEvent[];
}

export interface LiveShopfloorFiltersQueryData {
  liveShopfloorFilters: LiveShopfloorFilterOptions;
}

export interface LogShopfloorDowntimeInput {
  lineId: string;
  shiftId?: string;
  startTime: string;
  endTime?: string;
  reasonId: string;
  description?: string;
  resourceId?: string;
  resourceGroupId?: string;
}

export interface CreateIssueFromLiveShopfloorInput {
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
  linkedResourceId?: string;
  linkedResourceGroupId?: string;
}

export interface CreateActionFromLiveShopfloorInput {
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
  linkedResourceId?: string;
  linkedResourceGroupId?: string;
}

export interface MutationResponse<T> {
  ok: boolean;
  errors?: Array<{ field: string; code: string; message: string }>;
  [key: string]: T | boolean | Array<{ field: string; code: string; message: string }> | undefined;
}
