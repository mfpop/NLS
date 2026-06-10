import { gql } from "@apollo/client";

export const CREATE_WORK_ORDER_MUTATION = gql`
  mutation CreateWorkOrder(
    $title: String!, $workOrderType: String!,
    $targetType: String, $targetId: Int,
    $plantId: Int, $productionLineId: Int, $departmentId: Int, $resourceGroupId: Int, $resourceId: Int,
    $description: String, $priority: String,
    $requestedBy: String, $assignedTo: String,
    $dueDate: String, $plannedStartDate: String, $plannedEndDate: String, $workInstructions: String,
    $failureMode: String, $safetyNotes: String,
    $requiredTools: String,
    $labourEstimate: Float
  ) {
    createWorkOrder(
      title: $title, workOrderType: $workOrderType,
      targetType: $targetType, targetId: $targetId,
      plantId: $plantId, productionLineId: $productionLineId,
      departmentId: $departmentId, resourceGroupId: $resourceGroupId, resourceId: $resourceId,
      description: $description, priority: $priority,
      requestedBy: $requestedBy, assignedTo: $assignedTo,
      dueDate: $dueDate, plannedStartDate: $plannedStartDate, plannedEndDate: $plannedEndDate, workInstructions: $workInstructions,
      failureMode: $failureMode, safetyNotes: $safetyNotes,
      requiredTools: $requiredTools,
      labourEstimate: $labourEstimate
    ) {
      ok workOrderId number message
    }
  }
`;

export const UPDATE_WORK_ORDER_MUTATION = gql`
  mutation UpdateWorkOrder(
    $id: Int!, $title: String, $description: String, $workOrderType: String,
    $priority: String, $assignedTo: String,
    $requestedBy: String,
    $targetType: String, $targetId: Int,
    $plantId: Int, $productionLineId: Int, $departmentId: Int, $resourceGroupId: Int, $resourceId: Int,
    $dueDate: String, $plannedStartDate: String, $plannedEndDate: String, $workInstructions: String,
    $failureMode: String, $safetyNotes: String,
    $requiredTools: String, $labourEstimate: Float,
    $workPerformed: String, $completionNotes: String, $partsUsedNotes: String,
    $downtimeMinutes: Int, $rootCause: String, $correctiveAction: String, $verificationResult: String,
    $actualStartDate: String, $actualEndDate: String, $actualLaborHours: Float
  ) {
    updateWorkOrder(
      id: $id,
      title: $title, description: $description, workOrderType: $workOrderType,
      priority: $priority, assignedTo: $assignedTo,
      requestedBy: $requestedBy,
      targetType: $targetType, targetId: $targetId,
      plantId: $plantId, productionLineId: $productionLineId,
      departmentId: $departmentId, resourceGroupId: $resourceGroupId, resourceId: $resourceId,
      dueDate: $dueDate, plannedStartDate: $plannedStartDate, plannedEndDate: $plannedEndDate, workInstructions: $workInstructions,
      failureMode: $failureMode, safetyNotes: $safetyNotes,
      requiredTools: $requiredTools, labourEstimate: $labourEstimate,
      workPerformed: $workPerformed, completionNotes: $completionNotes, partsUsedNotes: $partsUsedNotes,
      downtimeMinutes: $downtimeMinutes, rootCause: $rootCause, correctiveAction: $correctiveAction, verificationResult: $verificationResult,
      actualStartDate: $actualStartDate, actualEndDate: $actualEndDate, actualLaborHours: $actualLaborHours
    )
  }
`;

export const SUBMIT_WORK_ORDER_MUTATION = gql`
  mutation SubmitWorkOrder($id: Int!) {
    submitWorkOrder(id: $id)
  }
`;

export const ASSIGN_WORK_ORDER_MUTATION = gql`
  mutation AssignWorkOrder($id: Int!, $assignedTo: String) {
    assignWorkOrder(id: $id, assignedTo: $assignedTo)
  }
`;

export const START_WORK_ORDER_MUTATION = gql`
  mutation StartWorkOrder($id: Int!) {
    startWorkOrder(id: $id)
  }
`;

export const HOLD_WORK_ORDER_FOR_PARTS_MUTATION = gql`
  mutation HoldWorkOrderForParts($id: Int!) {
    holdWorkOrderForParts(id: $id)
  }
`;

export const RESUME_WORK_ORDER_FROM_PARTS_MUTATION = gql`
  mutation ResumeWorkOrderFromParts($id: Int!) {
    resumeWorkOrderFromParts(id: $id)
  }
`;

export const SUBMIT_WORK_ORDER_FOR_APPROVAL_MUTATION = gql`
  mutation SubmitWorkOrderForApproval($id: Int!) {
    submitWorkOrderForApproval(id: $id)
  }
`;

export const APPROVE_WORK_ORDER_MUTATION = gql`
  mutation ApproveWorkOrder($id: Int!) {
    approveWorkOrder(id: $id)
  }
`;

export const COMPLETE_WORK_ORDER_MUTATION = gql`
  mutation CompleteWorkOrder(
    $id: Int!, $workPerformed: String, $completionNotes: String,
    $downtimeMinutes: Int, $rootCause: String,
    $correctiveAction: String, $verificationResult: String,
    $actualEndDate: String, $actualLaborHours: Float,
    $partsUsedNotes: String
  ) {
    completeWorkOrder(
      id: $id, workPerformed: $workPerformed, completionNotes: $completionNotes,
      downtimeMinutes: $downtimeMinutes, rootCause: $rootCause,
      correctiveAction: $correctiveAction, verificationResult: $verificationResult,
      actualEndDate: $actualEndDate, actualLaborHours: $actualLaborHours,
      partsUsedNotes: $partsUsedNotes
    )
  }
`;

export const CANCEL_WORK_ORDER_MUTATION = gql`
  mutation CancelWorkOrder($id: Int!) {
    cancelWorkOrder(id: $id)
  }
`;

export const ARCHIVE_WORK_ORDER_MUTATION = gql`
  mutation ArchiveWorkOrder($id: Int!) {
    archiveWorkOrder(id: $id)
  }
`;

export const CREATE_PM_MUTATION = gql`
  mutation CreatePreventiveMaintenance(
    $title: String!, $frequency: String!, $targetType: String!,
    $targetId: Int, $description: String, $intervalValue: Int,
    $nextDueDate: String, $assignedTo: String, $priority: String,
    $notes: String, $checklistJson: String
  ) {
    createPreventiveMaintenance(
      title: $title, frequency: $frequency, targetType: $targetType,
      targetId: $targetId, description: $description, intervalValue: $intervalValue,
      nextDueDate: $nextDueDate, assignedTo: $assignedTo, priority: $priority,
      notes: $notes, checklistJson: $checklistJson
    )
  }
`;

export const UPDATE_PM_MUTATION = gql`
  mutation UpdatePreventiveMaintenance(
    $id: Int!, $title: String, $description: String,
    $frequency: String, $intervalValue: Int, $assignedTo: String,
    $priority: String, $notes: String, $targetType: String,
    $targetId: Int, $nextDueDate: String, $checklistJson: String
  ) {
    updatePreventiveMaintenance(
      id: $id, title: $title, description: $description,
      frequency: $frequency, intervalValue: $intervalValue, assignedTo: $assignedTo,
      priority: $priority, notes: $notes, targetType: $targetType,
      targetId: $targetId, nextDueDate: $nextDueDate, checklistJson: $checklistJson
    )
  }
`;

export const ACTIVATE_PM_MUTATION = gql`
  mutation ActivatePreventiveMaintenance($id: Int!) {
    activatePreventiveMaintenance(id: $id)
  }
`;

export const PAUSE_PM_MUTATION = gql`
  mutation PausePreventiveMaintenance($id: Int!) {
    pausePreventiveMaintenance(id: $id)
  }
`;

export const ARCHIVE_PM_MUTATION = gql`
  mutation ArchivePreventiveMaintenance($id: Int!) {
    archivePreventiveMaintenance(id: $id)
  }
`;

export const GENERATE_WO_FROM_PM_MUTATION = gql`
  mutation GenerateWorkOrderFromPm($id: Int!, $dueDate: String) {
    generateWorkOrderFromPm(id: $id, dueDate: $dueDate)
  }
`;

export const REPORT_BREAKDOWN_MUTATION = gql`
  mutation ReportBreakdown($title: String!, $targetType: String!, $targetId: Int, $description: String, $severity: String, $reportedBy: String) {
    reportBreakdown(title: $title, targetType: $targetType, targetId: $targetId, description: $description, severity: $severity, reportedBy: $reportedBy)
  }
`;

export const UPDATE_BREAKDOWN_MUTATION = gql`
  mutation UpdateBreakdown($id: Int!, $title: String, $description: String, $severity: String) {
    updateBreakdown(id: $id, title: $title, description: $description, severity: $severity)
  }
`;

export const START_BREAKDOWN_REPAIR_MUTATION = gql`
  mutation StartBreakdownRepair($id: Int!) {
    startBreakdownRepair(id: $id)
  }
`;

export const COMPLETE_BREAKDOWN_REPAIR_MUTATION = gql`
  mutation CompleteBreakdownRepair($id: Int!, $repairSummary: String, $rootCause: String) {
    completeBreakdownRepair(id: $id, repairSummary: $repairSummary, rootCause: $rootCause)
  }
`;

export const CLOSE_BREAKDOWN_MUTATION = gql`
  mutation CloseBreakdown($id: Int!) {
    closeBreakdown(id: $id)
  }
`;

export const CANCEL_BREAKDOWN_MUTATION = gql`
  mutation CancelBreakdown($id: Int!) {
    cancelBreakdown(id: $id)
  }
`;

export const CREATE_WO_FROM_BREAKDOWN_MUTATION = gql`
  mutation CreateWorkOrderFromBreakdown($id: Int!, $assignedTo: String) {
    createWorkOrderFromBreakdown(id: $id, assignedTo: $assignedTo)
  }
`;

export const CREATE_SPARE_PART_MUTATION = gql`
  mutation CreateSparePart(
    $partNumber: String!, $name: String!,
    $description: String, $category: String,
    $manufacturer: String, $supplier: String,
    $uom: String, $minQuantity: Int, $quantityOnHand: Int,
    $storageLocation: String, $notes: String
  ) {
    createSparePart(
      partNumber: $partNumber, name: $name,
      description: $description, category: $category,
      manufacturer: $manufacturer, supplier: $supplier,
      uom: $uom, minQuantity: $minQuantity, quantityOnHand: $quantityOnHand,
      storageLocation: $storageLocation, notes: $notes
    )
  }
`;

export const UPDATE_SPARE_PART_MUTATION = gql`
  mutation UpdateSparePart(
    $id: Int!, $name: String, $description: String,
    $category: String, $manufacturer: String, $supplier: String,
    $uom: String, $minQuantity: Int, $storageLocation: String,
    $notes: String
  ) {
    updateSparePart(
      id: $id, name: $name, description: $description,
      category: $category, manufacturer: $manufacturer, supplier: $supplier,
      uom: $uom, minQuantity: $minQuantity,
      storageLocation: $storageLocation, notes: $notes
    )
  }
`;

export const ADJUST_SPARE_PART_QUANTITY_MUTATION = gql`
  mutation AdjustSparePartQuantity($id: Int!, $adjustment: Int!) {
    adjustSparePartQuantity(id: $id, adjustment: $adjustment)
  }
`;

export const RECORD_SPARE_PART_USAGE_MUTATION = gql`
  mutation RecordSparePartUsage($partId: Int!, $workOrderId: Int!, $quantity: Int!, $usedBy: String, $notes: String) {
    recordSparePartUsage(partId: $partId, workOrderId: $workOrderId, quantity: $quantity, usedBy: $usedBy, notes: $notes)
  }
`;

export const MARK_SPARE_PART_INACTIVE_MUTATION = gql`
  mutation MarkSparePartInactive($id: Int!) {
    markSparePartInactive(id: $id)
  }
`;

export const MARK_SPARE_PART_OBSOLETE_MUTATION = gql`
  mutation MarkSparePartObsolete($id: Int!) {
    markSparePartObsolete(id: $id)
  }
`;
