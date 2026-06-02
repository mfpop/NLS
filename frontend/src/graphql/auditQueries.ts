import { gql } from "@apollo/client";

const AUDIT_FIELDS = `
  id
  auditType
  targetType
  targetId
  title
  auditor
  auditDate
  status
  score
  notes
  createdAt
  updatedAt
`;

const CHECKLIST_ITEM_FIELDS = `
  id
  auditId
  question
  result
  comment
  createdAt
  updatedAt
`;

const FINDING_FIELDS = `
  id
  auditId
  description
  severity
  status
  owner
  dueDate
  createdAt
  updatedAt
`;

export const AUDITS_QUERY = gql`
  query Audits($auditType: String, $status: String, $targetType: String, $targetId: Int, $auditor: String) {
    audits(auditType: $auditType, status: $status, targetType: $targetType, targetId: $targetId, auditor: $auditor) {
      ${AUDIT_FIELDS}
    }
  }
`;

export const AUDIT_QUERY = gql`
  query Audit($id: String!) {
    audit(id: $id) {
      ${AUDIT_FIELDS}
      checklistItems {
        ${CHECKLIST_ITEM_FIELDS}
      }
      findings {
        ${FINDING_FIELDS}
      }
    }
  }
`;

export const CREATE_AUDIT_MUTATION = gql`
  mutation CreateAudit($input: AuditInput!) {
    createAudit(input: $input) {
      ok
      audit {
        ${AUDIT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const UPDATE_AUDIT_MUTATION = gql`
  mutation UpdateAudit($id: String!, $input: AuditUpdateInput!) {
    updateAudit(id: $id, input: $input) {
      ok
      audit {
        ${AUDIT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ADD_CHECKLIST_ITEM_MUTATION = gql`
  mutation AddAuditChecklistItem($auditId: String!, $input: AuditChecklistItemInput!) {
    addAuditChecklistItem(auditId: $auditId, input: $input) {
      ok
      item {
        ${CHECKLIST_ITEM_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const UPDATE_CHECKLIST_ITEM_MUTATION = gql`
  mutation UpdateAuditChecklistItem($id: String!, $input: AuditChecklistItemUpdateInput!) {
    updateAuditChecklistItem(id: $id, input: $input) {
      ok
      item {
        ${CHECKLIST_ITEM_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ADD_FINDING_MUTATION = gql`
  mutation AddAuditFinding($auditId: String!, $input: AuditFindingInput!) {
    addAuditFinding(auditId: $auditId, input: $input) {
      ok
      finding {
        ${FINDING_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const UPDATE_FINDING_MUTATION = gql`
  mutation UpdateAuditFinding($id: String!, $input: AuditFindingUpdateInput!) {
    updateAuditFinding(id: $id, input: $input) {
      ok
      finding {
        ${FINDING_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const CLOSE_FINDING_MUTATION = gql`
  mutation CloseAuditFinding($id: String!) {
    closeAuditFinding(id: $id) {
      ok
      finding {
        ${FINDING_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;
