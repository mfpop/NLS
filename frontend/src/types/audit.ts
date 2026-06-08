import type { MutationError } from "./structureDocument";

// ── Template Types ──

export interface AuditTemplateQuestionData {
  id: string;
  categoryId: string;
  code: string;
  question: string;
  responseType: string; // PASS_FAIL_NA | YES_NO_NA | SCORE_1_5 | TEXT | NUMBER
  isRequired: boolean;
  weight: number;
  sequence: number;
  helpText: string;
  maxScore: number;
  allowNa: boolean;
}

export interface AuditTemplateCategoryData {
  id: string;
  templateId: string;
  code: string;
  name: string;
  sequence: number;
  isRequired: boolean;
  questions: AuditTemplateQuestionData[];
}

export interface AuditTemplateData {
  id: string;
  code: string;
  name: string;
  auditType: string;
  moduleScope: string;
  targetTypes: string[];
  version: number;
  status: string;
  isDefault: boolean;
  isActive: boolean;
  categories: AuditTemplateCategoryData[];
  createdAt: string;
  updatedAt: string;
}

// ── Audit Types ──

export interface AuditChecklistItemData {
  id: string;
  auditId: string;
  question: string;
  score: number | null;
  isNa: boolean;
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

export interface AuditAnswerData {
  id: string;
  auditId: string;
  questionId: string;
  answerValue: string;
  comment: string;
  evidenceUrl: string;
  findingRequired: boolean;
  question?: AuditTemplateQuestionData | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditData {
  id: string;
  controlArea: string;
  auditType: string;
  targetType: string;
  targetId: number;
  title: string;
  auditor: string;
  auditDate: string | null;
  status: string;
  score: number | null;
  notes: string;
  templateId: string | null;
  checklistItems: AuditChecklistItemData[];
  findings: AuditFindingData[];
  answers: AuditAnswerData[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditsQueryData {
  audits: AuditData[];
}

export interface AuditsQueryVars {
  controlArea?: string | null;
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

export interface AuditAnswerPayload {
  ok: boolean;
  answer: AuditAnswerData | null;
  errors: MutationError[] | null;
}

export interface CreateAuditVars {
  input: {
    controlArea?: string;
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
    score?: number | null;
    isNa?: boolean;
    result?: string | null;
    comment?: string;
  };
}

export interface UpdateChecklistItemVars {
  id: string;
  input: {
    question?: string | null;
    score?: number | null;
    isNa?: boolean | null;
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

// ── Template Query Vars ──

export interface AuditTemplatesQueryData {
  auditTemplates: AuditTemplateData[];
}

export interface AuditTemplatesQueryVars {
  moduleScope?: string | null;
  status?: string | null;
}

export interface AuditTemplateQueryData {
  auditTemplate: AuditTemplateData | null;
}

export interface AuditTemplateQueryVars {
  id: string;
}

// ── Template-Based Audit Vars ──

export interface CreateAuditFromTemplateVars {
  input: {
    templateId: number;
    targetType: string;
    targetId: number;
    title: string;
    auditor?: string;
    auditDate?: string | null;
    notes?: string;
  };
}

export interface CompleteAuditVars {
  id: string;
}

export interface SaveAuditAnswerVars {
  input: {
    auditId: number;
    questionId: number;
    answerValue: string;
    comment?: string;
    evidenceUrl?: string | null;
  };
}

export interface CreateAuditFindingFromAnswerVars {
  input: {
    auditId: number;
    answerId: number;
    description: string;
    severity?: string;
    owner?: string;
    dueDate?: string | null;
  };
}

// ── Audit Execution Form Types ──

export interface AuditExecutionQuestion {
  id: string;
  questionText: string;
  responseType: string;
  isRequired: boolean;
  helpText: string;
  sequence: number;
  weight: number;
  answerId: string | null;
  answerValue: string;
  comment: string;
  evidenceUrl: string;
  isNonconforming: boolean;
  findingRequired: boolean;
}

export interface AuditExecutionSection {
  id: string;
  title: string;
  sequence: number;
  questions: AuditExecutionQuestion[];
}

export interface AuditExecutionSummary {
  answeredCount: number;
  totalQuestions: number;
  requiredMissingCount: number;
  findingsCount: number;
  lastSavedAt: string | null;
  score: number | null;
}

export interface AuditExecutionFormData {
  id: string;
  title: string;
  status: string;
  score: number | null;
  auditor: string;
  auditDate: string | null;
  notes: string;
  targetType: string;
  targetId: number;
  targetDisplayName: string;
  template: AuditExecutionTemplateInfo;
  sections: AuditExecutionSection[];
  findings: AuditFindingData[];
  summary: AuditExecutionSummary;
}

export interface AuditExecutionTemplateInfo {
  id: string;
  code: string;
  name: string;
  version: number;
}

export interface AuditExecutionFormQueryData {
  auditExecutionForm: AuditExecutionFormData | null;
}

export interface AuditExecutionFormQueryVars {
  auditId: string;
}
