import { gql } from "@apollo/client";

export const PROBLEMS_QUERY = gql`
  query Problems($controlArea: String, $status: String, $problemType: String, $targetType: String, $search: String) {
    problems(controlArea: $controlArea, status: $status, problemType: $problemType, targetType: $targetType, search: $search) {
      id controlArea title description problemType targetType targetId severity status reportedBy reportedAt sourceType sourceId notes createdAt updatedAt
    }
  }
`;

export const PROBLEM_QUERY = gql`
  query Problem($id: Int!) {
    problem(id: $id) {
      id title description problemType targetType targetId severity status reportedBy reportedAt sourceType sourceId notes createdAt updatedAt
    }
  }
`;

export const ACTIONS_QUERY = gql`
  query Actions($controlArea: String, $status: String, $priority: String, $search: String) {
    actions(controlArea: $controlArea, status: $status, priority: $priority, search: $search) {
      id controlArea title description sourceType sourceId owner dueDate status priority completedAt notes createdAt updatedAt
    }
  }
`;

export const ACTION_QUERY = gql`
  query Action($id: Int!) {
    action(id: $id) {
      id title description sourceType sourceId owner dueDate status priority completedAt notes createdAt updatedAt
    }
  }
`;

export const PRODUCTION_CHECKS_QUERY = gql`
  query ProductionChecks($status: String, $checkType: String, $targetType: String, $search: String) {
    productionChecks(status: $status, checkType: $checkType, targetType: $targetType, search: $search) {
      id checkType targetType targetId title checkedBy checkDate status score notes
      checklistItems { id productionCheckId question result comment createdAt updatedAt }
      createdAt updatedAt
    }
  }
`;

export const PRODUCTION_CHECK_QUERY = gql`
  query ProductionCheck($id: Int!) {
    productionCheck(id: $id) {
      id checkType targetType targetId title checkedBy checkDate status score notes
      checklistItems { id productionCheckId question result comment createdAt updatedAt }
      createdAt updatedAt
    }
  }
`;

export const QUALITY_CHECKS_QUERY = gql`
  query QualityChecks($status: String, $checkType: String, $targetType: String, $search: String) {
    qualityChecks(status: $status, checkType: $checkType, targetType: $targetType, search: $search) {
      id checkType targetType targetId title checkedBy checkDate status score notes
      checklistItems { id qualityCheckId question result comment createdAt updatedAt }
      createdAt updatedAt
    }
  }
`;

export const QUALITY_CHECK_QUERY = gql`
  query QualityCheck($id: Int!) {
    qualityCheck(id: $id) {
      id checkType targetType targetId title checkedBy checkDate status score notes
      checklistItems { id qualityCheckId question result comment createdAt updatedAt }
      createdAt updatedAt
    }
  }
`;

export const DMRS_QUERY = gql`
  query Dmrs($status: String, $targetType: String, $search: String) {
    dmrs(status: $status, targetType: $targetType, search: $search) {
      id dmrNumber title description materialItemId productVariantId targetType targetId quantity uom defectDescription containment severity disposition status owner dueDate closedAt notes createdAt updatedAt
    }
  }
`;

export const DMR_QUERY = gql`
  query Dmr($id: Int!) {
    dmr(id: $id) {
      id dmrNumber title description materialItemId productVariantId targetType targetId quantity uom defectDescription containment severity disposition status owner dueDate closedAt notes createdAt updatedAt
    }
  }
`;

export const RMAS_QUERY = gql`
  query Rmas($status: String, $search: String) {
    rmas(status: $status, search: $search) {
      id rmaNumber customerName partNumber serialLot productVariantId materialItemId quantity reason status receivedDate dueDate disposition customerResponseStatus receivingInspectionResult confirmedDefect suspectedCause confirmedCause dispositionOwner dispositionDate customerResponse owner notes createdAt updatedAt
    }
  }
`;

export const RMA_QUERY = gql`
  query Rma($id: Int!) {
    rma(id: $id) {
      id rmaNumber customerName partNumber serialLot productVariantId materialItemId quantity reason status receivedDate dueDate disposition customerResponseStatus receivingInspectionResult confirmedDefect suspectedCause confirmedCause dispositionOwner dispositionDate customerResponse owner notes createdAt updatedAt
    }
  }
`;

export const SAFETY_CHECKS_QUERY = gql`
  query SafetyChecks($status: String, $checkType: String, $targetType: String, $search: String) {
    safetyChecks(status: $status, checkType: $checkType, targetType: $targetType, search: $search) {
      id checkType targetType targetId title checkedBy checkDate status score notes
      checklistItems { id safetyCheckId question result comment createdAt updatedAt }
      createdAt updatedAt
    }
  }
`;

export const SAFETY_CHECK_QUERY = gql`
  query SafetyCheck($id: Int!) {
    safetyCheck(id: $id) {
      id checkType targetType targetId title checkedBy checkDate status score notes
      checklistItems { id safetyCheckId question result comment createdAt updatedAt }
      createdAt updatedAt
    }
  }
`;

export const SAFETY_INCIDENTS_QUERY = gql`
  query SafetyIncidents($status: String, $incidentType: String, $targetType: String, $search: String) {
    safetyIncidents(status: $status, incidentType: $incidentType, targetType: $targetType, search: $search) {
      id title description targetType targetId incidentType severity status reportedBy owner containmentAction closedAt notes createdAt updatedAt
    }
  }
`;

export const SAFETY_INCIDENT_QUERY = gql`
  query SafetyIncident($id: Int!) {
    safetyIncident(id: $id) {
      id title description targetType targetId incidentType severity status reportedBy owner containmentAction closedAt notes createdAt updatedAt
    }
  }
`;

export const MATERIAL_CHECKS_QUERY = gql`
  query MaterialChecks($status: String, $checkType: String, $targetType: String, $search: String) {
    materialChecks(status: $status, checkType: $checkType, targetType: $targetType, search: $search) {
      id checkType targetType targetId title checkedBy checkDate status score notes
      checklistItems { id materialCheckId question result comment createdAt updatedAt }
      createdAt updatedAt
    }
  }
`;

export const MATERIAL_CHECK_QUERY = gql`
  query MaterialCheck($id: Int!) {
    materialCheck(id: $id) {
      id checkType targetType targetId title checkedBy checkDate status score notes
      checklistItems { id materialCheckId question result comment createdAt updatedAt }
      createdAt updatedAt
    }
  }
`;

export const MATERIAL_ISSUES_QUERY = gql`
  query MaterialIssues($status: String, $issueType: String, $targetType: String, $search: String) {
    materialIssues(status: $status, issueType: $issueType, targetType: $targetType, search: $search) {
      id title description issueType targetType targetId materialItemId materialBinId quantity uom severity status reportedBy owner notes createdAt updatedAt
    }
  }
`;

export const MATERIAL_ISSUE_QUERY = gql`
  query MaterialIssue($id: Int!) {
    materialIssue(id: $id) {
      id title description issueType targetType targetId materialItemId materialBinId quantity uom severity status reportedBy owner notes createdAt updatedAt
    }
  }
`;
