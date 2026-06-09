import { gql } from "@apollo/client";

// ── Problems ──
export const CREATE_PROBLEM_MUTATION = gql`
  mutation CreateProblem($title: String!, $problemType: String!, $targetType: String!, $targetId: Int, $description: String, $severity: String, $reportedBy: String, $sourceType: String, $sourceId: Int, $controlArea: String, $notes: String) {
    createProblem(title: $title, problemType: $problemType, targetType: $targetType, targetId: $targetId, description: $description, severity: $severity, reportedBy: $reportedBy, sourceType: $sourceType, sourceId: $sourceId, controlArea: $controlArea, notes: $notes)
  }
`;
export const UPDATE_PROBLEM_MUTATION = gql`
  mutation UpdateProblem($id: Int!, $title: String, $description: String, $severity: String, $notes: String) {
    updateProblem(id: $id, title: $title, description: $description, severity: $severity, notes: $notes)
  }
`;
export const REVIEW_PROBLEM_MUTATION = gql`
  mutation ReviewProblem($id: Int!) { reviewProblem(id: $id) }
`;
export const CONTAIN_PROBLEM_MUTATION = gql`
  mutation ContainProblem($id: Int!) { containProblem(id: $id) }
`;
export const CLOSE_PROBLEM_MUTATION = gql`
  mutation CloseProblem($id: Int!) { closeProblem(id: $id) }
`;
export const CANCEL_PROBLEM_MUTATION = gql`
  mutation CancelProblem($id: Int!) { cancelProblem(id: $id) }
`;

// ── Actions ──
export const CREATE_ACTION_MUTATION = gql`
  mutation CreateAction($title: String!, $description: String, $owner: String, $dueDate: String, $priority: String, $sourceType: String, $sourceId: Int, $controlArea: String, $notes: String) {
    createAction(title: $title, description: $description, owner: $owner, dueDate: $dueDate, priority: $priority, sourceType: $sourceType, sourceId: $sourceId, controlArea: $controlArea, notes: $notes)
  }
`;
export const UPDATE_ACTION_MUTATION = gql`
  mutation UpdateAction($id: Int!, $title: String, $description: String, $owner: String, $priority: String) {
    updateAction(id: $id, title: $title, description: $description, owner: $owner, priority: $priority)
  }
`;
export const START_ACTION_MUTATION = gql`
  mutation StartAction($id: Int!) { startAction(id: $id) }
`;
export const COMPLETE_ACTION_MUTATION = gql`
  mutation CompleteAction($id: Int!) { completeAction(id: $id) }
`;
export const CANCEL_ACTION_MUTATION = gql`
  mutation CancelAction($id: Int!) { cancelAction(id: $id) }
`;

// ── Production Checks ──
export const CREATE_PRODUCTION_CHECK_MUTATION = gql`
  mutation CreateProductionCheck($title: String!, $checkType: String!, $targetType: String!, $targetId: Int, $checkedBy: String, $checkDate: String, $notes: String) {
    createProductionCheck(title: $title, checkType: $checkType, targetType: $targetType, targetId: $targetId, checkedBy: $checkedBy, checkDate: $checkDate, notes: $notes)
  }
`;
export const UPDATE_PRODUCTION_CHECK_MUTATION = gql`
  mutation UpdateProductionCheck($id: Int!, $title: String, $checkedBy: String, $notes: String) {
    updateProductionCheck(id: $id, title: $title, checkedBy: $checkedBy, notes: $notes)
  }
`;
export const ADD_PRODUCTION_CHECKLIST_ITEM_MUTATION = gql`
  mutation AddProductionChecklistItem($checkId: Int!, $question: String!) {
    addProductionChecklistItem(checkId: $checkId, question: $question)
  }
`;
export const UPDATE_PRODUCTION_CHECKLIST_ITEM_MUTATION = gql`
  mutation UpdateProductionChecklistItem($id: Int!, $result: String, $comment: String) {
    updateProductionChecklistItem(id: $id, result: $result, comment: $comment)
  }
`;
export const COMPLETE_PRODUCTION_CHECK_MUTATION = gql`
  mutation CompleteProductionCheck($id: Int!) { completeProductionCheck(id: $id) }
`;

// ── Quality Checks ──
export const CREATE_QUALITY_CHECK_MUTATION = gql`
  mutation CreateQualityCheck($title: String!, $checkType: String!, $targetType: String!, $targetId: Int, $checkedBy: String, $checkDate: String, $notes: String) {
    createQualityCheck(title: $title, checkType: $checkType, targetType: $targetType, targetId: $targetId, checkedBy: $checkedBy, checkDate: $checkDate, notes: $notes)
  }
`;
export const UPDATE_QUALITY_CHECK_MUTATION = gql`
  mutation UpdateQualityCheck($id: Int!, $title: String, $checkedBy: String, $notes: String) {
    updateQualityCheck(id: $id, title: $title, checkedBy: $checkedBy, notes: $notes)
  }
`;
export const ADD_QUALITY_CHECKLIST_ITEM_MUTATION = gql`
  mutation AddQualityChecklistItem($checkId: Int!, $question: String!) {
    addQualityChecklistItem(checkId: $checkId, question: $question)
  }
`;
export const UPDATE_QUALITY_CHECKLIST_ITEM_MUTATION = gql`
  mutation UpdateQualityChecklistItem($id: Int!, $result: String, $comment: String) {
    updateQualityChecklistItem(id: $id, result: $result, comment: $comment)
  }
`;
export const COMPLETE_QUALITY_CHECK_MUTATION = gql`
  mutation CompleteQualityCheck($id: Int!) { completeQualityCheck(id: $id) }
`;

// ── DMRs ──
export const CREATE_DMR_MUTATION = gql`
  mutation CreateDmr($dmrNumber: String!, $title: String!, $targetType: String!, $targetId: Int, $description: String, $defectDescription: String, $containment: String, $severity: String, $quantity: Float, $uom: String, $owner: String, $dueDate: String, $notes: String) {
    createDmr(dmrNumber: $dmrNumber, title: $title, targetType: $targetType, targetId: $targetId, description: $description, defectDescription: $defectDescription, containment: $containment, severity: $severity, quantity: $quantity, uom: $uom, owner: $owner, dueDate: $dueDate, notes: $notes)
  }
`;
export const UPDATE_DMR_MUTATION = gql`
  mutation UpdateDmr($id: Int!, $title: String, $description: String, $defectDescription: String, $containment: String, $severity: String, $quantity: Float, $uom: String, $owner: String, $dueDate: String, $notes: String) {
    updateDmr(id: $id, title: $title, description: $description, defectDescription: $defectDescription, containment: $containment, severity: $severity, quantity: $quantity, uom: $uom, owner: $owner, dueDate: $dueDate, notes: $notes)
  }
`;
export const REVIEW_DMR_MUTATION = gql`
  mutation ReviewDmr($id: Int!) { reviewDmr(id: $id) }
`;
export const DISPOSITION_DMR_MUTATION = gql`
  mutation DispositionDmr($id: Int!, $disposition: String!) { dispositionDmr(id: $id, disposition: $disposition) }
`;
export const QUARANTINE_DMR_MUTATION = gql`
  mutation QuarantineDmr($id: Int!) { quarantineDmr(id: $id) }
`;
export const APPROVE_DISPOSITION_DMR_MUTATION = gql`
  mutation ApproveDispositionDmr($id: Int!) { approveDispositionDmr(id: $id) }
`;
export const CLOSE_DMR_MUTATION = gql`
  mutation CloseDmr($id: Int!) { closeDmr(id: $id) }
`;
export const CANCEL_DMR_MUTATION = gql`
  mutation CancelDmr($id: Int!) { cancelDmr(id: $id) }
`;

// ── RMAs ──
export const CREATE_RMA_MUTATION = gql`
  mutation CreateRma($rmaNumber: String!, $customerName: String!, $partNumber: String, $serialLot: String, $quantity: Float, $reason: String, $dueDate: String, $disposition: String, $customerResponseStatus: String, $receivingInspectionResult: String, $confirmedDefect: String, $suspectedCause: String, $confirmedCause: String, $dispositionOwner: String, $dispositionDate: String, $customerResponse: String, $owner: String, $notes: String) {
    createRma(rmaNumber: $rmaNumber, customerName: $customerName, partNumber: $partNumber, serialLot: $serialLot, quantity: $quantity, reason: $reason, dueDate: $dueDate, disposition: $disposition, customerResponseStatus: $customerResponseStatus, receivingInspectionResult: $receivingInspectionResult, confirmedDefect: $confirmedDefect, suspectedCause: $suspectedCause, confirmedCause: $confirmedCause, dispositionOwner: $dispositionOwner, dispositionDate: $dispositionDate, customerResponse: $customerResponse, owner: $owner, notes: $notes) { id }
  }
`;
export const UPDATE_RMA_MUTATION = gql`
  mutation UpdateRma($id: Int!, $customerName: String, $partNumber: String, $serialLot: String, $reason: String, $dueDate: String, $disposition: String, $customerResponseStatus: String, $receivingInspectionResult: String, $confirmedDefect: String, $suspectedCause: String, $confirmedCause: String, $dispositionOwner: String, $dispositionDate: String, $customerResponse: String, $owner: String, $notes: String) {
    updateRma(id: $id, customerName: $customerName, partNumber: $partNumber, serialLot: $serialLot, reason: $reason, dueDate: $dueDate, disposition: $disposition, customerResponseStatus: $customerResponseStatus, receivingInspectionResult: $receivingInspectionResult, confirmedDefect: $confirmedDefect, suspectedCause: $suspectedCause, confirmedCause: $confirmedCause, dispositionOwner: $dispositionOwner, dispositionDate: $dispositionDate, customerResponse: $customerResponse, owner: $owner, notes: $notes)
  }
`;
export const RECEIVE_RMA_MUTATION = gql`
  mutation ReceiveRma($id: Int!) { receiveRma(id: $id) }
`;
export const REVIEW_RMA_MUTATION = gql`
  mutation ReviewRma($id: Int!) { reviewRma(id: $id) }
`;
export const DISPOSITION_RMA_MUTATION = gql`
  mutation DispositionRma($id: Int!, $disposition: String!) { dispositionRma(id: $id, disposition: $disposition) }
`;
export const CLOSE_RMA_MUTATION = gql`
  mutation CloseRma($id: Int!) { closeRma(id: $id) }
`;
export const CANCEL_RMA_MUTATION = gql`
  mutation CancelRma($id: Int!) { cancelRma(id: $id) }
`;

// ── Safety Checks ──
export const CREATE_SAFETY_CHECK_MUTATION = gql`
  mutation CreateSafetyCheck($title: String!, $checkType: String!, $targetType: String!, $targetId: Int, $checkedBy: String, $checkDate: String, $notes: String) {
    createSafetyCheck(title: $title, checkType: $checkType, targetType: $targetType, targetId: $targetId, checkedBy: $checkedBy, checkDate: $checkDate, notes: $notes)
  }
`;
export const UPDATE_SAFETY_CHECK_MUTATION = gql`
  mutation UpdateSafetyCheck($id: Int!, $title: String, $checkedBy: String, $notes: String) {
    updateSafetyCheck(id: $id, title: $title, checkedBy: $checkedBy, notes: $notes)
  }
`;
export const ADD_SAFETY_CHECKLIST_ITEM_MUTATION = gql`
  mutation AddSafetyChecklistItem($checkId: Int!, $question: String!) {
    addSafetyChecklistItem(checkId: $checkId, question: $question)
  }
`;
export const UPDATE_SAFETY_CHECKLIST_ITEM_MUTATION = gql`
  mutation UpdateSafetyChecklistItem($id: Int!, $result: String, $comment: String) {
    updateSafetyChecklistItem(id: $id, result: $result, comment: $comment)
  }
`;
export const COMPLETE_SAFETY_CHECK_MUTATION = gql`
  mutation CompleteSafetyCheck($id: Int!) { completeSafetyCheck(id: $id) }
`;

// ── Safety Incidents ──
export const CREATE_SAFETY_INCIDENT_MUTATION = gql`
  mutation CreateSafetyIncident($title: String!, $incidentType: String!, $targetType: String!, $targetId: Int, $description: String, $severity: String, $reportedBy: String, $owner: String, $containmentAction: String, $notes: String) {
    createSafetyIncident(title: $title, incidentType: $incidentType, targetType: $targetType, targetId: $targetId, description: $description, severity: $severity, reportedBy: $reportedBy, owner: $owner, containmentAction: $containmentAction, notes: $notes)
  }
`;
export const UPDATE_SAFETY_INCIDENT_MUTATION = gql`
  mutation UpdateSafetyIncident($id: Int!, $title: String, $description: String, $severity: String, $owner: String, $containmentAction: String, $notes: String) {
    updateSafetyIncident(id: $id, title: $title, description: $description, severity: $severity, owner: $owner, containmentAction: $containmentAction, notes: $notes)
  }
`;
export const CONTAIN_SAFETY_INCIDENT_MUTATION = gql`
  mutation ContainSafetyIncident($id: Int!) { containSafetyIncident(id: $id) }
`;
export const REVIEW_SAFETY_INCIDENT_MUTATION = gql`
  mutation ReviewSafetyIncident($id: Int!) { reviewSafetyIncident(id: $id) }
`;
export const CLOSE_SAFETY_INCIDENT_MUTATION = gql`
  mutation CloseSafetyIncident($id: Int!) { closeSafetyIncident(id: $id) }
`;
export const CANCEL_SAFETY_INCIDENT_MUTATION = gql`
  mutation CancelSafetyIncident($id: Int!) { cancelSafetyIncident(id: $id) }
`;

// ── Material Checks ──
export const CREATE_MATERIAL_CHECK_MUTATION = gql`
  mutation CreateMaterialCheck($title: String!, $checkType: String!, $targetType: String!, $targetId: Int, $checkedBy: String, $checkDate: String, $notes: String) {
    createMaterialCheck(title: $title, checkType: $checkType, targetType: $targetType, targetId: $targetId, checkedBy: $checkedBy, checkDate: $checkDate, notes: $notes)
  }
`;
export const UPDATE_MATERIAL_CHECK_MUTATION = gql`
  mutation UpdateMaterialCheck($id: Int!, $title: String, $checkedBy: String, $notes: String) {
    updateMaterialCheck(id: $id, title: $title, checkedBy: $checkedBy, notes: $notes)
  }
`;
export const ADD_MATERIAL_CHECKLIST_ITEM_MUTATION = gql`
  mutation AddMaterialChecklistItem($checkId: Int!, $question: String!) {
    addMaterialChecklistItem(checkId: $checkId, question: $question)
  }
`;
export const UPDATE_MATERIAL_CHECKLIST_ITEM_MUTATION = gql`
  mutation UpdateMaterialChecklistItem($id: Int!, $result: String, $comment: String) {
    updateMaterialChecklistItem(id: $id, result: $result, comment: $comment)
  }
`;
export const COMPLETE_MATERIAL_CHECK_MUTATION = gql`
  mutation CompleteMaterialCheck($id: Int!) { completeMaterialCheck(id: $id) }
`;

// ── Material Issues ──
export const CREATE_MATERIAL_ISSUE_MUTATION = gql`
  mutation CreateMaterialIssue($title: String!, $issueType: String!, $targetType: String!, $targetId: Int, $description: String, $quantity: Float, $uom: String, $severity: String, $reportedBy: String, $owner: String, $notes: String) {
    createMaterialIssue(title: $title, issueType: $issueType, targetType: $targetType, targetId: $targetId, description: $description, quantity: $quantity, uom: $uom, severity: $severity, reportedBy: $reportedBy, owner: $owner, notes: $notes)
  }
`;
export const UPDATE_MATERIAL_ISSUE_MUTATION = gql`
  mutation UpdateMaterialIssue($id: Int!, $title: String, $description: String, $severity: String, $owner: String, $notes: String) {
    updateMaterialIssue(id: $id, title: $title, description: $description, severity: $severity, owner: $owner, notes: $notes)
  }
`;
export const CONTAIN_MATERIAL_ISSUE_MUTATION = gql`
  mutation ContainMaterialIssue($id: Int!) { containMaterialIssue(id: $id) }
`;
export const RESOLVE_MATERIAL_ISSUE_MUTATION = gql`
  mutation ResolveMaterialIssue($id: Int!) { resolveMaterialIssue(id: $id) }
`;
export const CLOSE_MATERIAL_ISSUE_MUTATION = gql`
  mutation CloseMaterialIssue($id: Int!) { closeMaterialIssue(id: $id) }
`;
export const CANCEL_MATERIAL_ISSUE_MUTATION = gql`
  mutation CancelMaterialIssue($id: Int!) { cancelMaterialIssue(id: $id) }
`;
