import { gql } from "@apollo/client";

// ── Suggestions ──
export const CREATE_SUGGESTION_MUTATION = gql`
  mutation CreateSuggestion($title: String!, $description: String!, $submittedBy: String!, $targetType: String!, $targetId: Int, $category: String!, $priority: String!) {
    createSuggestion(title: $title, description: $description, submittedBy: $submittedBy, targetType: $targetType, targetId: $targetId, category: $category, priority: $priority)
  }
`;
export const UPDATE_SUGGESTION_MUTATION = gql`
  mutation UpdateSuggestion($id: Int!, $title: String, $description: String, $category: String, $priority: String, $comments: String) {
    updateSuggestion(id: $id, title: $title, description: $description, category: $category, priority: $priority, comments: $comments)
  }
`;
export const REVIEW_SUGGESTION_MUTATION = gql`
  mutation ReviewSuggestion($id: Int!) { reviewSuggestion(id: $id) }
`;
export const ACCEPT_SUGGESTION_MUTATION = gql`
  mutation AcceptSuggestion($id: Int!, $decision: String!) { acceptSuggestion(id: $id, decision: $decision) }
`;
export const REJECT_SUGGESTION_MUTATION = gql`
  mutation RejectSuggestion($id: Int!, $decision: String!) { rejectSuggestion(id: $id, decision: $decision) }
`;
export const CONVERT_SUGGESTION_TO_KAIZEN_MUTATION = gql`
  mutation ConvertSuggestionToKaizen($id: Int!) { convertSuggestionToKaizen(id: $id) }
`;

export const DELETE_SUGGESTION_MUTATION = gql`
  mutation DeleteSuggestion($id: Int!) { deleteSuggestion(id: $id) }
`;

// ── Kaizen ──
export const CREATE_KAIZEN_MUTATION = gql`
  mutation CreateKaizen($title: String!, $problemStatement: String!, $targetType: String!, $targetId: Int, $currentCondition: String!, $targetCondition: String!, $owner: String!, $sourceType: String!, $priority: String!, $startDate: String, $dueDate: String, $sourceSuggestionId: Int) {
    createKaizen(title: $title, problemStatement: $problemStatement, targetType: $targetType, targetId: $targetId, currentCondition: $currentCondition, targetCondition: $targetCondition, owner: $owner, sourceType: $sourceType, priority: $priority, startDate: $startDate, dueDate: $dueDate, sourceSuggestionId: $sourceSuggestionId)
  }
`;
export const UPDATE_KAIZEN_MUTATION = gql`
  mutation UpdateKaizen($id: Int!, $title: String, $problemStatement: String, $currentCondition: String, $targetCondition: String, $owner: String, $priority: String, $sourceType: String, $resultSummary: String) {
    updateKaizen(id: $id, title: $title, problemStatement: $problemStatement, currentCondition: $currentCondition, targetCondition: $targetCondition, owner: $owner, priority: $priority, sourceType: $sourceType, resultSummary: $resultSummary)
  }
`;
export const START_KAIZEN_MUTATION = gql`
  mutation StartKaizen($id: Int!) { startKaizen(id: $id) }
`;
export const COMPLETE_KAIZEN_MUTATION = gql`
  mutation CompleteKaizen($id: Int!, $resultSummary: String!) { completeKaizen(id: $id, resultSummary: $resultSummary) }
`;
export const CANCEL_KAIZEN_MUTATION = gql`
  mutation CancelKaizen($id: Int!) { cancelKaizen(id: $id) }
`;
export const ADD_KAIZEN_ACTION_MUTATION = gql`
  mutation AddKaizenAction($kaizenId: Int!, $title: String!, $description: String!, $owner: String!, $dueDate: String) {
    addKaizenAction(kaizenId: $kaizenId, title: $title, description: $description, owner: $owner, dueDate: $dueDate)
  }
`;
export const UPDATE_KAIZEN_ACTION_MUTATION = gql`
  mutation UpdateKaizenAction($id: Int!, $title: String, $description: String, $owner: String) {
    updateKaizenAction(id: $id, title: $title, description: $description, owner: $owner)
  }
`;
export const COMPLETE_KAIZEN_ACTION_MUTATION = gql`
  mutation CompleteKaizenAction($id: Int!) { completeKaizenAction(id: $id) }
`;
export const CANCEL_KAIZEN_ACTION_MUTATION = gql`
  mutation CancelKaizenAction($id: Int!) { cancelKaizenAction(id: $id) }
`;
export const CREATE_A3_FROM_KAIZEN_MUTATION = gql`
  mutation CreateA3FromKaizen($kaizenId: Int!) { createA3FromKaizen(kaizenId: $kaizenId) }
`;

// ── A3 / PDCA ──
export const CREATE_A3_PDCA_MUTATION = gql`
  mutation CreateA3Pdca($title: String!, $background: String!, $problemStatement: String!, $currentCondition: String!, $targetCondition: String!, $rootCauseAnalysis: String!, $countermeasures: String!, $implementationPlan: String!, $targetType: String!, $targetId: Int, $owner: String!, $priority: String!, $sourceType: String!, $sourceKaizenId: Int, $startDate: String, $dueDate: String) {
    createA3Pdca(title: $title, background: $background, problemStatement: $problemStatement, currentCondition: $currentCondition, targetCondition: $targetCondition, rootCauseAnalysis: $rootCauseAnalysis, countermeasures: $countermeasures, implementationPlan: $implementationPlan, targetType: $targetType, targetId: $targetId, owner: $owner, priority: $priority, sourceType: $sourceType, sourceKaizenId: $sourceKaizenId, startDate: $startDate, dueDate: $dueDate)
  }
`;
export const UPDATE_A3_PDCA_MUTATION = gql`
  mutation UpdateA3Pdca($id: Int!, $title: String, $background: String, $problemStatement: String, $currentCondition: String, $targetCondition: String, $rootCauseAnalysis: String, $countermeasures: String, $implementationPlan: String, $doNotes: String, $blockers: String, $resultValidation: String, $beforeAfterComparison: String, $effectivenessCheck: String, $standardizationActions: String, $lessonsLearned: String, $followUpPlan: String, $priority: String, $resultSummary: String) {
    updateA3Pdca(id: $id, title: $title, background: $background, problemStatement: $problemStatement, currentCondition: $currentCondition, targetCondition: $targetCondition, rootCauseAnalysis: $rootCauseAnalysis, countermeasures: $countermeasures, implementationPlan: $implementationPlan, doNotes: $doNotes, blockers: $blockers, resultValidation: $resultValidation, beforeAfterComparison: $beforeAfterComparison, effectivenessCheck: $effectivenessCheck, standardizationActions: $standardizationActions, lessonsLearned: $lessonsLearned, followUpPlan: $followUpPlan, priority: $priority, resultSummary: $resultSummary)
  }
`;
export const MOVE_A3_PDCA_TO_PLAN_MUTATION = gql`
  mutation MoveA3PdcaToPlan($id: Int!) { moveA3PdcaToPlan(id: $id) }
`;
export const MOVE_A3_PDCA_TO_DO_MUTATION = gql`
  mutation MoveA3PdcaToDo($id: Int!) { moveA3PdcaToDo(id: $id) }
`;
export const MOVE_A3_PDCA_TO_CHECK_MUTATION = gql`
  mutation MoveA3PdcaToCheck($id: Int!) { moveA3PdcaToCheck(id: $id) }
`;
export const MOVE_A3_PDCA_TO_ACT_MUTATION = gql`
  mutation MoveA3PdcaToAct($id: Int!) { moveA3PdcaToAct(id: $id) }
`;
export const COMPLETE_A3_PDCA_MUTATION = gql`
  mutation CompleteA3Pdca($id: Int!) { completeA3Pdca(id: $id) }
`;
export const CANCEL_A3_PDCA_MUTATION = gql`
  mutation CancelA3Pdca($id: Int!) { cancelA3Pdca(id: $id) }
`;
export const ADD_A3_PDCA_ACTION_MUTATION = gql`
  mutation AddA3PdcaAction($a3PdcaId: Int!, $title: String!, $phase: String!, $description: String!, $owner: String!, $dueDate: String) {
    addA3PdcaAction(a3PdcaId: $a3PdcaId, title: $title, phase: $phase, description: $description, owner: $owner, dueDate: $dueDate)
  }
`;
export const UPDATE_A3_PDCA_ACTION_MUTATION = gql`
  mutation UpdateA3PdcaAction($id: Int!, $title: String, $description: String, $owner: String) {
    updateA3PdcaAction(id: $id, title: $title, description: $description, owner: $owner)
  }
`;
export const COMPLETE_A3_PDCA_ACTION_MUTATION = gql`
  mutation CompleteA3PdcaAction($id: Int!) { completeA3PdcaAction(id: $id) }
`;
export const CANCEL_A3_PDCA_ACTION_MUTATION = gql`
  mutation CancelA3PdcaAction($id: Int!) { cancelA3PdcaAction(id: $id) }
`;
