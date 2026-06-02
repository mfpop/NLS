import { gql } from "@apollo/client";

export const SUGGESTIONS_QUERY = gql`
  query Suggestions($status: String, $targetType: String, $search: String) {
    suggestions(status: $status, targetType: $targetType, search: $search) {
      id title description submittedBy targetType targetId category priority status decision comments createdAt updatedAt
    }
  }
`;

export const SUGGESTION_QUERY = gql`
  query Suggestion($id: Int!) {
    suggestion(id: $id) { id title description submittedBy targetType targetId category priority status decision comments createdAt updatedAt }
  }
`;

export const KAIZENS_QUERY = gql`
  query Kaizens($status: String, $targetType: String, $search: String) {
    kaizens(status: $status, targetType: $targetType, search: $search) {
      id title kaizenCode problemStatement targetType targetId currentCondition targetCondition owner priority sourceType sourceSuggestionId startDate dueDate completedDate status resultSummary
      actions { id kaizenId title description owner dueDate status notes createdAt updatedAt }
      createdAt updatedAt
    }
  }
`;

export const KAIZEN_QUERY = gql`
  query Kaizen($id: Int!) {
    kaizen(id: $id) {
      id title kaizenCode problemStatement targetType targetId currentCondition targetCondition owner priority sourceType sourceSuggestionId startDate dueDate completedDate status resultSummary
      actions { id kaizenId title description owner dueDate status notes createdAt updatedAt }
      createdAt updatedAt
    }
  }
`;

export const A3_PDCA_RECORDS_QUERY = gql`
  query A3PdcaRecords($status: String, $targetType: String, $search: String) {
    a3PdcaRecords(status: $status, targetType: $targetType, search: $search) {
      id title a3Code sourceType sourceKaizenId targetType targetId owner priority
      background problemStatement currentCondition targetCondition rootCauseAnalysis countermeasures implementationPlan
      doNotes blockers resultValidation beforeAfterComparison effectivenessCheck
      standardizationActions lessonsLearned followUpPlan resultSummary
      status startDate dueDate completedDate
      actions { id a3PdcaId phase title description owner dueDate status notes createdAt updatedAt }
      createdAt updatedAt
    }
  }
`;

export const A3_PDCA_QUERY = gql`
  query A3Pdca($id: Int!) {
    a3Pdca(id: $id) {
      id title a3Code sourceType sourceKaizenId targetType targetId owner priority
      background problemStatement currentCondition targetCondition rootCauseAnalysis countermeasures implementationPlan
      doNotes blockers resultValidation beforeAfterComparison effectivenessCheck
      standardizationActions lessonsLearned followUpPlan resultSummary
      status startDate dueDate completedDate
      actions { id a3PdcaId phase title description owner dueDate status notes createdAt updatedAt }
      createdAt updatedAt
    }
  }
`;

export const CONTINUOUS_IMPROVEMENT_SUMMARY_QUERY = gql`
  query ContinuousImprovementSummary($targetType: String) {
    continuousImprovementSummary(targetType: $targetType) {
      totalSuggestions acceptedSuggestions rejectedSuggestions convertedSuggestions
      activeKaizenCount completedKaizenCount overdueKaizenCount
      activeA3Count completedA3Count overdueA3Count
      improvementsByTarget { targetType count }
      improvementsByStatus { status count }
    }
  }
`;
