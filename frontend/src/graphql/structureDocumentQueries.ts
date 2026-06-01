import { gql } from "@apollo/client";

const DOCUMENT_FIELDS = `
  id
  documentType
  targetType
  targetId
  title
  code
  content
  revision
  status
  owner
  effectiveFrom
  effectiveTo
  reviewDate
  changeReason
  isControlledCopy
  isActive
  createdAt
  updatedAt
`;

export const STRUCTURE_DOCUMENT_TREE_QUERY = gql`
  query StructureDocumentTree($documentType: String!) {
    structureDocumentTree(documentType: $documentType) {
      id
      nodeType
      name
      parentId
      documentStatus
      localDocumentId
      inheritedDocumentId
      children {
        id
        nodeType
        name
        parentId
        documentStatus
        localDocumentId
        inheritedDocumentId
        children {
          id
          nodeType
          name
          parentId
          documentStatus
          localDocumentId
          inheritedDocumentId
          children {
            id
            nodeType
            name
            parentId
            documentStatus
            localDocumentId
            inheritedDocumentId
            children {
              id
              nodeType
              name
              parentId
              documentStatus
              localDocumentId
              inheritedDocumentId
              children {
                id
                nodeType
                name
                parentId
                documentStatus
                localDocumentId
                inheritedDocumentId
              }
            }
          }
        }
      }
    }
  }
`;

export const STRUCTURE_DOCUMENT_QUERY = gql`
  query StructureDocument($targetType: String!, $targetId: Int!, $documentType: String!) {
    structureDocument(targetType: $targetType, targetId: $targetId, documentType: $documentType) {
      ${DOCUMENT_FIELDS}
    }
  }
`;

export const STRUCTURE_DOCUMENTS_QUERY = gql`
  query StructureDocuments($documentType: String!, $status: String, $targetType: String, $targetId: Int) {
    structureDocuments(documentType: $documentType, status: $status, targetType: $targetType, targetId: $targetId) {
      ${DOCUMENT_FIELDS}
    }
  }
`;

export const STRUCTURE_DOCUMENT_HISTORY_QUERY = gql`
  query StructureDocumentHistory($targetType: String!, $targetId: Int!, $documentType: String!) {
    structureDocumentHistory(targetType: $targetType, targetId: $targetId, documentType: $documentType) {
      ${DOCUMENT_FIELDS}
    }
  }
`;

export const STRUCTURE_DOCUMENT_REVISION_HISTORY_QUERY = gql`
  query StructureDocumentRevisionHistory($documentId: String!) {
    structureDocumentRevisionHistory(documentId: $documentId) {
      id
      documentId
      documentType
      targetType
      targetId
      code
      title
      revision
      statusFrom
      statusTo
      contentSnapshot
      changeReason
      changedBy
      lifecycleAction
      changedAt
    }
  }
`;

export const STRUCTURE_DOCUMENT_AUDIT_TRAIL_QUERY = gql`
  query StructureDocumentAuditTrail($documentId: String!) {
    structureDocumentAuditTrail(documentId: $documentId) {
      id
      documentId
      action
      actor
      occurredAt
      metadata
      reason
    }
  }
`;

export const CREATE_STRUCTURE_DOCUMENT_MUTATION = gql`
  mutation CreateStructureDocument($input: StructureDocumentInput!) {
    createStructureDocument(input: $input) {
      ok
      document {
        ${DOCUMENT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const UPDATE_STRUCTURE_DOCUMENT_MUTATION = gql`
  mutation UpdateStructureDocument($id: String!, $input: StructureDocumentUpdateInput!) {
    updateStructureDocument(id: $id, input: $input) {
      ok
      document {
        ${DOCUMENT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const APPROVE_STRUCTURE_DOCUMENT_MUTATION = gql`
  mutation ApproveStructureDocument($id: String!) {
    approveStructureDocument(id: $id) {
      ok
      document {
        ${DOCUMENT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ARCHIVE_STRUCTURE_DOCUMENT_MUTATION = gql`
  mutation ArchiveStructureDocument($id: String!) {
    archiveStructureDocument(id: $id) {
      ok
      document {
        ${DOCUMENT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const CREATE_STRUCTURE_DOCUMENT_REVISION = gql`
  mutation CreateStructureDocumentRevision($input: CreateRevisionInput!) {
    createStructureDocumentRevision(input: $input) {
      ok
      document {
        ${DOCUMENT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const SET_STRUCTURE_DOCUMENT_CONTROLLED_COPY = gql`
  mutation SetStructureDocumentControlledCopy($input: ControlledCopyInput!) {
    setStructureDocumentControlledCopy(input: $input) {
      ok
      document {
        ${DOCUMENT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;
