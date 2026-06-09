import { gql } from "@apollo/client";

const AUDIT_FIELDS = `
  id
  controlArea
  auditType
  targetType
  targetId
  title
  auditor
  auditDate
  status
  score
  notes
  templateId
  createdAt
  updatedAt
`;

const CHECKLIST_ITEM_FIELDS = `
  id
  auditId
  question
  score
  isNa
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
  query Audits($controlArea: String, $auditType: String, $status: String, $targetType: String, $targetId: Int, $auditor: String) {
    audits(controlArea: $controlArea, auditType: $auditType, status: $status, targetType: $targetType, targetId: $targetId, auditor: $auditor) {
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
      answers {
        id
        auditId
        questionId
        answerValue
        comment
        evidenceUrl
        findingRequired
        question {
          id
          categoryId
          code
          question
          responseType
          isRequired
          weight
          sequence
          helpText
          maxScore
          allowNa
        }
        createdAt
        updatedAt
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

export const DELETE_AUDIT_MUTATION = gql`
  mutation DeleteAudit($id: String!) {
    deleteAudit(id: $id) {
      ok
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

// ── Template Question Fields ──

const TEMPLATE_QUESTION_FIELDS = `
  id
  categoryId
  code
  question
  responseType
  isRequired
  weight
  sequence
  helpText
  maxScore
  allowNa
`;

const TEMPLATE_CATEGORY_FIELDS = `
  id
  templateId
  code
  name
  sequence
  isRequired
  questions {
    ${TEMPLATE_QUESTION_FIELDS}
  }
`;

const TEMPLATE_FIELDS = `
  id
  code
  name
  auditType
  moduleScope
  targetTypes
  version
  status
  isDefault
  isActive
  categories {
    ${TEMPLATE_CATEGORY_FIELDS}
  }
  createdAt
  updatedAt
`;

// ── Template Queries ──

export const AUDIT_TEMPLATES_QUERY = gql`
  query AuditTemplates($moduleScope: String, $status: String) {
    auditTemplates(moduleScope: $moduleScope, status: $status) {
      ${TEMPLATE_FIELDS}
    }
  }
`;

export const AUDIT_TEMPLATE_QUERY = gql`
  query AuditTemplate($id: String!) {
    auditTemplate(id: $id) {
      ${TEMPLATE_FIELDS}
    }
  }
`;

// ── Answer Fields ──

const ANSWER_FIELDS = `
  id
  auditId
  questionId
  answerValue
  comment
  evidenceUrl
  findingRequired
  createdAt
  updatedAt
`;

// ── Audit Mutations ──

export const CREATE_AUDIT_FROM_TEMPLATE_MUTATION = gql`
  mutation CreateAuditFromTemplate($input: CreateAuditFromTemplateInput!) {
    createAuditFromTemplate(input: $input) {
      ok
      audit {
        ${AUDIT_FIELDS}
        checklistItems {
          ${CHECKLIST_ITEM_FIELDS}
        }
        findings {
          ${FINDING_FIELDS}
        }
        answers {
          ${ANSWER_FIELDS}
          question { ${TEMPLATE_QUESTION_FIELDS} }
        }
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const COMPLETE_AUDIT_MUTATION = gql`
  mutation CompleteAudit($id: String!) {
    completeAudit(id: $id) {
      ok
      audit {
        ${AUDIT_FIELDS}
        checklistItems {
          ${CHECKLIST_ITEM_FIELDS}
        }
        findings {
          ${FINDING_FIELDS}
        }
        answers {
          ${ANSWER_FIELDS}
          question { ${TEMPLATE_QUESTION_FIELDS} }
        }
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const SAVE_AUDIT_ANSWER_MUTATION = gql`
  mutation SaveAuditAnswer($input: SaveAuditAnswerInput!) {
    saveAuditAnswer(input: $input) {
      ok
      answer {
        ${ANSWER_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const CREATE_AUDIT_FINDING_FROM_ANSWER_MUTATION = gql`
  mutation CreateAuditFindingFromAnswer($input: CreateAuditFindingFromAnswerInput!) {
    createAuditFindingFromAnswer(input: $input) {
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

export const SAVE_AUDIT_ANSWERS_BULK_MUTATION = gql`
  mutation SaveAuditAnswersBulk($input: SaveAuditAnswersBulkInput!) {
    saveAuditAnswersBulk(input: $input) {
      ok
      audit {
        ${AUDIT_FIELDS}
        answers {
          ${ANSWER_FIELDS}
          question { ${TEMPLATE_QUESTION_FIELDS} }
        }
        findings { ${FINDING_FIELDS} }
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const AUDIT_EXECUTION_FORM_QUERY = gql`
  query AuditExecutionForm($auditId: String!) {
    auditExecutionForm(auditId: $auditId) {
      id
      title
      status
      score
      auditor
      auditDate
      notes
      targetType
      targetId
      targetDisplayName
      template {
        id
        code
        name
        version
      }
      sections {
        id
        title
        sequence
        questions {
          id
          questionText
          responseType
          isRequired
          helpText
          sequence
          weight
          answerId
          answerValue
          comment
          evidenceUrl
          isNonconforming
          findingRequired
        }
      }
      findings {
        id
        auditId
        description
        severity
        status
        owner
        dueDate
        createdAt
        updatedAt
      }
      summary {
        answeredCount
        totalQuestions
        requiredMissingCount
        findingsCount
        lastSavedAt
        score
      }
    }
  }
`;

// ── Template Manager Mutations ──

export const CREATE_AUDIT_TEMPLATE_MUTATION = gql`
  mutation CreateAuditTemplate($input: AuditTemplateCreateInput!) {
    createAuditTemplate(input: $input) {
      ok
      template {
        ${TEMPLATE_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const UPDATE_AUDIT_TEMPLATE_MUTATION = gql`
  mutation UpdateAuditTemplate($id: String!, $input: AuditTemplateUpdateInput!) {
    updateAuditTemplate(id: $id, input: $input) {
      ok
      template {
        ${TEMPLATE_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ACTIVATE_AUDIT_TEMPLATE_MUTATION = gql`
  mutation ActivateAuditTemplate($id: String!) {
    activateAuditTemplate(id: $id) {
      ok
      template {
        ${TEMPLATE_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ARCHIVE_AUDIT_TEMPLATE_MUTATION = gql`
  mutation ArchiveAuditTemplate($id: String!) {
    archiveAuditTemplate(id: $id) {
      ok
      template {
        ${TEMPLATE_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const CLONE_AUDIT_TEMPLATE_MUTATION = gql`
  mutation CloneAuditTemplateVersion($id: String!) {
    cloneAuditTemplateVersion(id: $id) {
      ok
      template {
        ${TEMPLATE_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ADD_AUDIT_TEMPLATE_CATEGORY_MUTATION = gql`
  mutation AddAuditTemplateCategory($templateId: String!, $input: AuditTemplateCategoryInput!) {
    addAuditTemplateCategory(templateId: $templateId, input: $input) {
      ok
      template {
        ${TEMPLATE_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const UPDATE_AUDIT_TEMPLATE_CATEGORY_MUTATION = gql`
  mutation UpdateAuditTemplateCategory($id: String!, $input: AuditTemplateCategoryUpdateInput!) {
    updateAuditTemplateCategory(id: $id, input: $input) {
      ok
      template {
        ${TEMPLATE_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const REMOVE_AUDIT_TEMPLATE_CATEGORY_MUTATION = gql`
  mutation RemoveAuditTemplateCategory($id: String!) {
    removeAuditTemplateCategory(id: $id) {
      ok
      template {
        ${TEMPLATE_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ADD_AUDIT_TEMPLATE_QUESTION_MUTATION = gql`
  mutation AddAuditTemplateQuestion($categoryId: String!, $input: AuditTemplateQuestionInput!) {
    addAuditTemplateQuestion(categoryId: $categoryId, input: $input) {
      ok
      template {
        ${TEMPLATE_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const UPDATE_AUDIT_TEMPLATE_QUESTION_MUTATION = gql`
  mutation UpdateAuditTemplateQuestion($id: String!, $input: AuditTemplateQuestionUpdateInput!) {
    updateAuditTemplateQuestion(id: $id, input: $input) {
      ok
      template {
        ${TEMPLATE_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const REMOVE_AUDIT_TEMPLATE_QUESTION_MUTATION = gql`
  mutation RemoveAuditTemplateQuestion($id: String!) {
    removeAuditTemplateQuestion(id: $id) {
      ok
      template {
        ${TEMPLATE_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const INSTALL_DEFAULT_PC_TEMPLATES_MUTATION = gql`
  mutation InstallDefaultProductionControlAuditTemplates {
    installDefaultProductionControlAuditTemplates {
      ok
      message
      errors {
        field
        code
        message
      }
    }
  }
`;

export const INSTALL_DEFAULT_QC_TEMPLATES_MUTATION = gql`
  mutation InstallDefaultQualityControlAuditTemplates {
    installDefaultQualityControlAuditTemplates {
      ok
      message
      errors {
        field
        code
        message
      }
    }
  }
`;

export const INSTALL_DEFAULT_SAFETY_TEMPLATES_MUTATION = gql`
  mutation InstallDefaultSafetyControlAuditTemplates {
    installDefaultSafetyControlAuditTemplates {
      ok
      message
      errors {
        field
        code
        message
      }
    }
  }
`;

export const INSTALL_DEFAULT_MATERIAL_TEMPLATES_MUTATION = gql`
  mutation InstallDefaultMaterialControlAuditTemplates {
    installDefaultMaterialControlAuditTemplates {
      ok
      message
      errors {
        field
        code
        message
      }
    }
  }
`;

// ── New Audit Mutations (Cancel, Bulk Findings, Issue/Action from Finding) ──

export const CANCEL_AUDIT_MUTATION = gql`
  mutation CancelAudit($id: String!) {
    cancelAudit(id: $id) {
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

export const CREATE_FINDINGS_FROM_AUDIT_MUTATION = gql`
  mutation CreateFindingsFromAudit($auditId: String!, $severity: String) {
    createFindingsFromAudit(auditId: $auditId, severity: $severity) {
      ok
      findings {
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

export const CREATE_ISSUE_FROM_FINDING_MUTATION = gql`
  mutation CreateIssueFromFinding($findingId: String!, $title: String!, $description: String, $severity: String, $owner: String) {
    createIssueFromFinding(findingId: $findingId, title: $title, description: $description, severity: $severity, owner: $owner) {
      ok
      issueId
      errors {
        field
        code
        message
      }
    }
  }
`;

export const CREATE_ACTION_FROM_FINDING_MUTATION = gql`
  mutation CreateActionFromFinding($findingId: String!, $title: String!, $description: String, $priority: String, $owner: String) {
    createActionFromFinding(findingId: $findingId, title: $title, description: $description, priority: $priority, owner: $owner) {
      ok
      actionId
      errors {
        field
        code
        message
      }
    }
  }
`;
