import { gql } from "@apollo/client";

export const MER_LIST_QUERY = gql`
  query ManufacturingEngineeringRequests($status: String, $requestType: String, $targetType: String, $priority: String, $search: String) {
    manufacturingEngineeringRequests(status: $status, requestType: $requestType, targetType: $targetType, priority: $priority, search: $search) {
      id merCode title description requestType category priority
      targetType targetId submittedBy assignedTo reviewer status
      reviewNotes rejectionReason impactCost impactQuality impactDelivery impactSafety
      estimatedCost actualCost startDate dueDate completedDate
      linkedKaizenId linkedA3Id resultSummary lessonsLearned createdAt updatedAt
    }
  }
`;

export const MER_DETAIL_QUERY = gql`
  query ManufacturingEngineeringRequest($id: Int!) {
    manufacturingEngineeringRequest(id: $id) {
      id merCode title description requestType category priority
      targetType targetId submittedBy assignedTo reviewer status
      reviewNotes rejectionReason impactCost impactQuality impactDelivery impactSafety
      estimatedCost actualCost startDate dueDate completedDate
      linkedKaizenId linkedA3Id resultSummary lessonsLearned createdAt updatedAt
    }
  }
`;

export const MER_SUMMARY_QUERY = gql`
  query MERSummary {
    merSummary {
      total submitted underReview approved inProgress completed rejected cancelled overdue
      byType { requestType count }
      byPriority { priority count }
    }
  }
`;
