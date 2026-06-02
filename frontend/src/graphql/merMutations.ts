import { gql } from "@apollo/client";

// ── MER Mutations ──
export const CREATE_MER_MUTATION = gql`
  mutation CreateMer($input: MERInput!) {
    createMer(input: $input) {
      ok
      mer { id merCode title status }
      errors { field code message }
    }
  }
`;

export const UPDATE_MER_MUTATION = gql`
  mutation UpdateMer($id: Int!, $input: MERUpdateInput!) {
    updateMer(id: $id, input: $input) {
      ok
      mer { id merCode title status }
      errors { field code message }
    }
  }
`;

export const REVIEW_MER_MUTATION = gql`
  mutation ReviewMer($id: Int!) {
    reviewMer(id: $id) {
      ok
      mer { id status }
      errors { field code message }
    }
  }
`;

export const APPROVE_MER_MUTATION = gql`
  mutation ApproveMer($id: Int!, $reviewNotes: String!) {
    approveMer(id: $id, reviewNotes: $reviewNotes) {
      ok
      mer { id status }
      errors { field code message }
    }
  }
`;

export const REJECT_MER_MUTATION = gql`
  mutation RejectMer($id: Int!, $reason: String!) {
    rejectMer(id: $id, reason: $reason) {
      ok
      mer { id status }
      errors { field code message }
    }
  }
`;

export const START_MER_MUTATION = gql`
  mutation StartMer($id: Int!) {
    startMer(id: $id) {
      ok
      mer { id status }
      errors { field code message }
    }
  }
`;

export const COMPLETE_MER_MUTATION = gql`
  mutation CompleteMer($id: Int!, $resultSummary: String!) {
    completeMer(id: $id, resultSummary: $resultSummary) {
      ok
      mer { id status }
      errors { field code message }
    }
  }
`;

export const CANCEL_MER_MUTATION = gql`
  mutation CancelMer($id: Int!) {
    cancelMer(id: $id) {
      ok
      mer { id status }
      errors { field code message }
    }
  }
`;

export const CONVERT_MER_TO_KAIZEN_MUTATION = gql`
  mutation ConvertMerToKaizen($id: Int!) {
    convertMerToKaizen(id: $id) {
      ok
      mer { id linkedKaizenId }
      errors { field code message }
    }
  }
`;

export const DELETE_MER_MUTATION = gql`
  mutation DeleteMer($id: Int!) {
    deleteMer(id: $id) {
      ok
      errors { field code message }
    }
  }
`;
