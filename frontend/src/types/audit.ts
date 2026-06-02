import type { MutationError } from "./structureDocument";

export interface AuditChecklistItemData {
  id: string;
  auditId: string;
  question: string;
  result: string | null;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditFindingData {
  id: string;
  auditId: string;
  description: string;
  severity: string;
  status: string;
  owner: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditData {
  id: string;
  auditType: string;
  targetType: string;
  targetId: number;
  title: string;
  auditor: string;
  auditDate: string | null;
  status: string;
  score: number | null;
  notes: string;
  checklistItems: AuditChecklistItemData[];
  findings: AuditFindingData[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditsQueryData {
  audits: AuditData[];
}

export interface AuditsQueryVars {
  auditType?: string | null;
  status?: string | null;
  targetType?: string | null;
  targetId?: number | null;
  auditor?: string | null;
}

export interface AuditQueryData {
  audit: AuditData | null;
}

export interface AuditQueryVars {
  id: string;
}

export interface AuditPayload {
  ok: boolean;
  audit: AuditData | null;
  errors: MutationError[] | null;
}

export interface AuditChecklistItemPayload {
  ok: boolean;
  item: AuditChecklistItemData | null;
  errors: MutationError[] | null;
}

export interface AuditFindingPayload {
  ok: boolean;
  finding: AuditFindingData | null;
  errors: MutationError[] | null;
}

export interface CreateAuditVars {
  input: {
    auditType: string;
    targetType: string;
    targetId: number;
    title: string;
    auditor?: string;
    auditDate?: string | null;
    notes?: string;
  };
}

export interface UpdateAuditVars {
  id: string;
  input: {
    title?: string | null;
    auditor?: string | null;
    auditDate?: string | null;
    notes?: string | null;
    status?: string | null;
  };
}

export interface AddChecklistItemVars {
  auditId: string;
  input: {
    question: string;
    result?: string | null;
    comment?: string;
  };
}

export interface UpdateChecklistItemVars {
  id: string;
  input: {
    question?: string | null;
    result?: string | null;
    comment?: string | null;
  };
}

export interface AddFindingVars {
  auditId: string;
  input: {
    description: string;
    severity: string;
    owner?: string;
    dueDate?: string | null;
  };
}

export interface UpdateFindingVars {
  id: string;
  input: {
    description?: string | null;
    severity?: string | null;
    status?: string | null;
    owner?: string | null;
    dueDate?: string | null;
  };
}

export interface CloseFindingVars {
  id: string;
}
