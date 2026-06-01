export interface StructureDocumentTreeNodeData {
  id: string;
  nodeType: string;
  name: string;
  parentId: string | null;
  documentStatus: string;
  localDocumentId: string | null;
  inheritedDocumentId: string | null;
  children: StructureDocumentTreeNodeData[];
}

export interface StructureDocumentData {
  id: string;
  documentType: string;
  targetType: string;
  targetId: number;
  title: string;
  code: string;
  content: string;
  revision: string;
  status: string;
  owner: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  reviewDate: string | null;
  changeReason: string;
  isControlledCopy: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRevisionHistoryEntry {
  id: string;
  documentId: string;
  documentType: string;
  targetType: string;
  targetId: number;
  code: string;
  title: string;
  revision: string;
  statusFrom: string | null;
  statusTo: string;
  contentSnapshot: string;
  changeReason: string;
  changedBy: string;
  lifecycleAction: string;
  changedAt: string;
}

export interface DocumentAuditTrailEntry {
  id: string;
  documentId: string;
  action: string;
  actor: string;
  occurredAt: string;
  metadata: string;
  reason: string;
}

export interface StructureDocumentTreeQueryData {
  structureDocumentTree: StructureDocumentTreeNodeData[];
}

export interface StructureDocumentQueryData {
  structureDocument: StructureDocumentData | null;
}

export interface StructureDocumentsQueryData {
  structureDocuments: StructureDocumentData[];
}

export interface StructureDocumentHistoryQueryData {
  structureDocumentHistory: StructureDocumentData[];
}

export interface StructureDocumentRevisionHistoryQueryData {
  structureDocumentRevisionHistory: DocumentRevisionHistoryEntry[];
}

export interface StructureDocumentAuditTrailQueryData {
  structureDocumentAuditTrail: DocumentAuditTrailEntry[];
}

export interface StructureDocumentTreeQueryVars {
  documentType: string;
}

export interface StructureDocumentQueryVars {
  targetType: string;
  targetId: number;
  documentType: string;
}

export interface StructureDocumentsQueryVars {
  documentType: string;
  status?: string;
  targetType?: string;
  targetId?: number;
}

export interface StructureDocumentHistoryQueryVars {
  targetType: string;
  targetId: number;
  documentType: string;
}

export interface StructureDocumentRevisionHistoryQueryVars {
  documentId: string;
}

export interface StructureDocumentAuditTrailQueryVars {
  documentId: string;
}

export interface MutationError {
  field: string | null;
  code: string;
  message: string;
}

export interface StructureDocumentPayload {
  ok: boolean;
  document: StructureDocumentData | null;
  errors: MutationError[] | null;
}

export interface CreateStructureDocumentVars {
  input: {
    documentType: string;
    targetType: string;
    targetId: number;
    title: string;
    code: string;
    content?: string;
    revision?: string;
    owner?: string;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
  };
}

export interface UpdateStructureDocumentVars {
  id: string;
  input: {
    title?: string;
    content?: string;
    revision?: string;
    owner?: string;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
  };
}

export interface ApproveArchiveVars {
  id: string;
}

export interface CreateRevisionVars {
  input: {
    documentId: string;
    newRevision: string;
    changeReason?: string;
  };
}

export interface ControlledCopyVars {
  input: {
    documentId: string;
    isControlledCopy: boolean;
    reason?: string;
  };
}
