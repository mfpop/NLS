// ── Gemba Walk Types ──
// Matches the backend GraphQL schema in execution/schema.py

export interface GembaWalkSession {
  id: number;
  lineId: number | null;
  plantId: number | null;
  shiftName: string;
  walkDate: string | null;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  observer: string;
  startedAt: string | null;
  completedAt: string | null;
  summary: string;
  createdById: number | null;
  updatedById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GembaObservation {
  id: number;
  sessionId: number;
  targetType: string;
  targetId: number | null;
  title: string;
  description: string;
  area: string;
  focus: string;
  category: GembaCategory;
  severity: GembaSeverity;
  priority: GembaPriority;
  linkedResourceText: string;
  ownerId: number | null;
  ownerName: string | null;
  dueDate: string | null;
  status: GembaObservationStatus;
  resolutionNote: string;
  resolvedById: number | null;
  resolvedAt: string | null;
  closedById: number | null;
  closedAt: string | null;
  verificationNote: string;
  verifiedById: number | null;
  verifiedAt: string | null;
  availableActions: string[];
  createdIssueId: number | null;
  createdActionId: number | null;
  createdById: number | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  /** Structured location fields */
  locationPath: string;
  locationLabel: string;
}

export interface GembaObservationActivity {
  id: number;
  observationId: number;
  eventType: string;
  message: string;
  oldStatus: string | null;
  newStatus: string | null;
  actorId: number | null;
  actorName: string | null;
  createdAt: string;
}

export interface GembaMetrics {
  total: number;
  open: number;
  inReview: number;
  actionRequired: number;
  converted: number;
  resolved: number;
  closed: number;
  critical: number;
  overdue: number;
  byCategory: string; // JSON string
}

export interface DailyGembaBoard {
  activeSession: GembaWalkSession | null;
  observations: GembaObservation[];
  metrics: GembaMetrics;
}

export type GembaCategory =
  | "PRODUCTIVITY" | "QUALITY" | "SAFETY" | "FIVE_S"
  | "MAINTENANCE" | "MATERIAL" | "MORALE" | "OTHER";

export type GembaSeverity =
  | "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type GembaPriority =
  | "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type GembaObservationStatus =
  | "OPEN" | "IN_REVIEW" | "ACTION_REQUIRED"
  | "CONVERTED_TO_ACTION" | "CONVERTED_TO_ISSUE"
  | "RESOLVED" | "VERIFIED" | "CLOSED"
  | "REOPENED" | "CANCELLED";

// ── GraphQL input types ──

export interface CreateGembaObservationInput {
  sessionId: number;
  title: string;
  description?: string;
  area?: string;
  focus?: string;
  category: GembaCategory;
  severity?: GembaSeverity;
  priority?: GembaPriority;
  linkedResourceText?: string;
  ownerId?: number | null;
  ownerName?: string | null;
  dueDate?: string | null;
  /** Structured location fields */
  targetType?: string;
  targetId?: string | null;
  locationPath?: string;
  locationLabel?: string;
  /** Scoped context */
  plantId?: number | null;
  productionLineId?: number | null;
}

export interface UpdateGembaObservationInput {
  title?: string;
  description?: string;
  area?: string;
  focus?: string;
  category?: GembaCategory;
  severity?: GembaSeverity;
  priority?: GembaPriority;
  linkedResourceText?: string;
}

export interface AssignGembaObservationInput {
  ownerId?: number | null;
  ownerName?: string | null;
  dueDate?: string | null;
}

export interface ConvertToIssueInput {
  title?: string;
  description?: string;
  severity?: string;
  controlArea?: string;
  owner?: string;
  dueDate?: string | null;
  plant?: string;
  productionLine?: string;
  department?: string;
  resourceGroup?: string;
  resource?: string;
}

export interface ConvertToActionInput {
  title?: string;
  description?: string;
  actionType?: string;
  priority?: string;
  assignedTo?: string;
  dueDate?: string | null;
  controlArea?: string;
  plant?: string;
  productionLine?: string;
  department?: string;
  resourceGroup?: string;
  resource?: string;
}

// ── Query/Mutation response types ──

export interface DailyGembaBoardData {
  dailyGembaBoard: DailyGembaBoard;
}

export interface GembaWalkSessionData {
  gembaWalkSession: GembaWalkSession | null;
}

export interface GembaObservationData {
  gembaObservation: GembaObservation | null;
}

export interface GembaObservationActivitiesData {
  gembaObservationActivities: GembaObservationActivity[];
}

// ── Mutation response types ──

export interface GembaSessionMutationData {
  startGembaWalkSession: GembaWalkSession;
}

export interface GembaCompleteSessionData {
  completeGembaWalkSession: GembaWalkSession;
}

export interface GembaCreateObservationData {
  createGembaObservation: GembaObservation;
}

export interface GembaUpdateObservationData {
  updateGembaObservation: GembaObservation;
}

export interface GembaAssignObservationData {
  assignGembaObservation: GembaObservation;
}

export interface GembaChangeStatusData {
  changeGembaObservationStatus: GembaObservation;
}

export interface GembaResolveObservationData {
  resolveGembaObservation: GembaObservation;
}

export interface GembaCloseObservationData {
  closeGembaObservation: GembaObservation;
}

export interface GembaReopenObservationData {
  reopenGembaObservation: GembaObservation;
}

export interface GembaConvertToIssueData {
  convertGembaObservationToIssue: GembaObservation;
}

export interface GembaConvertToActionData {
  convertGembaObservationToAction: GembaObservation;
}
