import { gql } from "@apollo/client";

export const MAINTENANCE_SUMMARY_QUERY = gql`
  query MaintenanceSummary {
    maintenanceSummary {
      openWorkOrders
      overdueWorkOrders
      activeBreakdowns
      pmDueThisWeek
      completedWorkOrders
      totalDowntimeMinutes
      lowStockSpareParts
      lastUpdated
    }
  }
`;

export const SPARE_PART_USAGES_BY_PART_QUERY = gql`
  query SparePartUsagesByPart($sparePartId: Int!) {
    sparePartUsages(sparePartId: $sparePartId) {
      id partId workOrderId quantity usedBy usedAt notes createdAt updatedAt
    }
  }
`;

export const WORK_ORDER_DASHBOARD_QUERY = gql`
  query WorkOrderDashboard {
    workOrderDashboard {
      openWorkOrders
      inProgress
      overdue
      completed
      preventive
      correctiveBreakdown
      waitingParts
      dueThisWeek
      totalDowntimeMinutes
      lastUpdated
    }
  }
`;

const WORK_ORDER_FIELDS = `
  id number title description workOrderType
  targetType targetId
  plantId productionLineId departmentId resourceGroupId resourceId
  priority status requestedBy assignedTo
  dateOpened dueDate
  plannedStartDate plannedEndDate
  actualStartDate actualEndDate
  downtimeMinutes
  workInstructions failureMode safetyNotes laborEstimate
  completionNotes rootCause correctiveAction verificationResult
  sparePartsRequired attachments
  linkedPmId linkedBreakdownId linkedMerId
  createdAt updatedAt
`;

export const WORK_ORDERS_QUERY = gql`
  query MaintenanceWorkOrders($status: String, $workOrderType: String, $priority: String, $targetType: String, $assignedTo: String, $search: String, $overdue: Boolean) {
    maintenanceWorkOrders(status: $status, workOrderType: $workOrderType, priority: $priority, targetType: $targetType, assignedTo: $assignedTo, search: $search, overdue: $overdue) {
      ${WORK_ORDER_FIELDS}
    }
  }
`;

export const WORK_ORDER_QUERY = gql`
  query MaintenanceWorkOrder($id: Int!) {
    maintenanceWorkOrder(id: $id) {
      ${WORK_ORDER_FIELDS}
    }
  }
`;

export const PM_PLANS_QUERY = gql`
  query PreventiveMaintenancePlans($status: String, $frequency: String, $targetType: String, $search: String, $priority: String) {
    preventiveMaintenancePlans(status: $status, frequency: $frequency, targetType: $targetType, search: $search, priority: $priority) {
      id code title description targetType targetId frequency intervalValue nextDueDate lastCompletedDate assignedTo priority status checklistJson notes createdAt updatedAt
    }
  }
`;

export const PM_PLAN_QUERY = gql`
  query PreventiveMaintenancePlan($id: Int!) {
    preventiveMaintenancePlan(id: $id) {
      id code title description targetType targetId frequency intervalValue nextDueDate lastCompletedDate assignedTo priority status checklistJson notes createdAt updatedAt
    }
  }
`;

export const DUE_PM_QUERY = gql`
  query DuePreventiveMaintenance {
    duePreventiveMaintenance {
      id code title description targetType targetId frequency intervalValue nextDueDate lastCompletedDate assignedTo priority status createdAt updatedAt
    }
  }
`;

export const BREAKDOWNS_QUERY = gql`
  query Breakdowns($status: String, $severity: String, $targetType: String, $search: String) {
    breakdowns(status: $status, severity: $severity, targetType: $targetType, search: $search) {
      id number title description targetType targetId severity status reportedBy reportedAt repairStartedAt repairCompletedAt downtimeMinutes rootCause repairSummary linkedWorkOrderId createdAt updatedAt
    }
  }
`;

export const BREAKDOWN_QUERY = gql`
  query Breakdown($id: Int!) {
    breakdown(id: $id) {
      id number title description targetType targetId severity status reportedBy reportedAt repairStartedAt repairCompletedAt downtimeMinutes rootCause repairSummary linkedWorkOrderId createdAt updatedAt
    }
  }
`;

export const SPARE_PARTS_QUERY = gql`
  query SpareParts($status: String, $category: String, $search: String) {
    spareParts(status: $status, category: $category, search: $search) {
      id partNumber name description category manufacturer supplier uom minQuantity quantityOnHand storageLocation notes status createdAt updatedAt
    }
  }
`;

export const SPARE_PART_QUERY = gql`
  query SparePart($id: Int!) {
    sparePart(id: $id) {
      id partNumber name description category manufacturer supplier uom minQuantity quantityOnHand storageLocation notes status createdAt updatedAt
    }
  }
`;

export const LOW_STOCK_SPARE_PARTS_QUERY = gql`
  query LowStockSpareParts {
    lowStockSpareParts {
      id partNumber name description category uom minQuantity quantityOnHand storageLocation status createdAt updatedAt
    }
  }
`;

export const SPARE_PART_USAGES_QUERY = gql`
  query SparePartUsages($workOrderId: Int, $sparePartId: Int) {
    sparePartUsages(workOrderId: $workOrderId, sparePartId: $sparePartId) {
      id partId workOrderId quantity usedBy usedAt notes createdAt updatedAt
    }
  }
`;
