import { gql } from "@apollo/client";

// ── Queries ──

export const DAILY_GEMBA_BOARD_QUERY = gql`
  query DailyGembaBoard($lineId: Int, $plantId: Int, $walkDate: String, $shiftName: String) {
    dailyGembaBoard(lineId: $lineId, plantId: $plantId, walkDate: $walkDate, shiftName: $shiftName) {
      activeSession {
        id
        lineId
        shiftName
        walkDate
        status
        observer
        startedAt
        completedAt
        summary
        createdById
        createdAt
        updatedAt
      }
      observations {
        id
        sessionId
        targetType
        targetId
        title
        description
        area
        focus
        category
        severity
        priority
        linkedResourceText
        ownerId
        ownerName
        dueDate
        status
        resolutionNote
        resolvedById
        resolvedAt
        verificationNote
        verifiedById
        verifiedAt
        closedById
        closedAt
        availableActions
        createdIssueId
        createdActionId
        createdById
        createdByName
        createdAt
        updatedAt
        locationPath
        locationLabel
      }
      metrics {
        total
        open
        inReview
        actionRequired
        converted
        resolved
        closed
        critical
        overdue
        byCategory
      }
    }
  }
`;

export const GEMBA_WALK_SESSION_QUERY = gql`
  query GembaWalkSession($id: Int!) {
    gembaWalkSession(id: $id) {
      id
      lineId
      shiftName
      walkDate
      status
      observer
      startedAt
      completedAt
      summary
      createdAt
      updatedAt
    }
  }
`;

export const GEMBA_TARGET_OPTIONS_QUERY = gql`
  query GembaTargetOptions($plantId: Int, $productionLineId: Int) {
    gembaTargetOptions(plantId: $plantId, productionLineId: $productionLineId) {
      productionLine {
        id
        targetType
        name
        code
        departmentId
        departmentName
        resourceGroupId
        resourceGroupName
        productionLineId
        locationPath
      }
      departments {
        id
        targetType
        name
        code
        departmentId
        departmentName
        locationPath
      }
      resourceGroups {
        id
        targetType
        name
        code
        departmentId
        departmentName
        resourceGroupId
        resourceGroupName
        locationPath
      }
      resources {
        id
        targetType
        name
        code
        departmentId
        departmentName
        resourceGroupId
        resourceGroupName
        locationPath
      }
    }
  }
`;

export const GEMBA_OBSERVATION_ACTIVITIES_QUERY = gql`
  query GembaObservationActivities($observationId: Int!) {
    gembaObservationActivities(observationId: $observationId) {
      id
      observationId
      eventType
      message
      oldStatus
      newStatus
      actorId
      actorName
      createdAt
    }
  }
`;

// ── Session Mutations ──

export const START_GEMBA_SESSION_MUTATION = gql`
  mutation StartGembaWalkSession($id: Int!) {
    startGembaWalkSession(id: $id) {
      id
      lineId
      shiftName
      walkDate
      status
      observer
      startedAt
      completedAt
      summary
      createdAt
      updatedAt
    }
  }
`;

export const COMPLETE_GEMBA_SESSION_MUTATION = gql`
  mutation CompleteGembaWalkSession($id: Int!, $summary: String) {
    completeGembaWalkSession(id: $id, summary: $summary) {
      id
      lineId
      shiftName
      walkDate
      status
      observer
      startedAt
      completedAt
      summary
      createdAt
      updatedAt
    }
  }
`;

export const CANCEL_GEMBA_SESSION_MUTATION = gql`
  mutation CancelGembaWalkSession($id: Int!) {
    cancelGembaWalkSession(id: $id) {
      id
      lineId
      shiftName
      walkDate
      status
      observer
      createdAt
    }
  }
`;

export const VERIFY_GEMBA_OBSERVATION_MUTATION = gql`
  mutation VerifyGembaObservation($id: Int!, $verificationNote: String!) {
    verifyGembaObservation(id: $id, verificationNote: $verificationNote) {
      id
      status
      verificationNote
      verifiedById
      verifiedAt
      updatedAt
    }
  }
`;

export const MARK_ACTION_REQUIRED_MUTATION = gql`
  mutation MarkGembaObservationActionRequired($id: Int!, $ownerId: Int!, $dueDate: String!) {
    markGembaObservationActionRequired(id: $id, ownerId: $ownerId, dueDate: $dueDate) {
      id
      status
      ownerId
      ownerName
      dueDate
      updatedAt
    }
  }
`;

// ── Observation Mutations ──

export const CREATE_GEMBA_OBSERVATION_MUTATION = gql`
  mutation CreateGembaObservation($input: CreateGembaObservationInput!) {
    createGembaObservation(input: $input) {
      id
      sessionId
      targetType
      targetId
      title
      description
      area
      focus
      category
      severity
      priority
      linkedResourceText
      ownerId
      ownerName
      dueDate
      status
      createdById
      createdByName
      createdAt
      updatedAt
      locationPath
      locationLabel
    }
  }
`;


export const UPDATE_GEMBA_OBSERVATION_MUTATION = gql`
  mutation UpdateGembaObservation($id: Int!, $input: UpdateGembaObservationInput!) {
    updateGembaObservation(id: $id, input: $input) {
      id
      title
      description
      area
      focus
      category
      severity
      priority
      linkedResourceText
      status
      updatedAt
    }
  }
`;

export const ASSIGN_GEMBA_OBSERVATION_MUTATION = gql`
  mutation AssignGembaObservation($id: Int!, $input: AssignGembaObservationInput!) {
    assignGembaObservation(id: $id, input: $input) {
      id
      ownerId
      ownerName
      dueDate
      status
      updatedAt
    }
  }
`;

export const RESOLVE_GEMBA_OBSERVATION_MUTATION = gql`
  mutation ResolveGembaObservation($id: Int!, $resolutionNote: String!) {
    resolveGembaObservation(id: $id, resolutionNote: $resolutionNote) {
      id
      status
      resolutionNote
      resolvedById
      resolvedAt
      updatedAt
    }
  }
`;

export const CLOSE_GEMBA_OBSERVATION_MUTATION = gql`
  mutation CloseGembaObservation($id: Int!) {
    closeGembaObservation(id: $id) {
      id
      status
      closedById
      closedAt
      updatedAt
    }
  }
`;

export const REOPEN_GEMBA_OBSERVATION_MUTATION = gql`
  mutation ReopenGembaObservation($id: Int!) {
    reopenGembaObservation(id: $id) {
      id
      status
      updatedAt
    }
  }
`;

export const CONVERT_GEMBA_TO_ISSUE_MUTATION = gql`
  mutation ConvertGembaObservationToIssue($id: Int!, $input: ConvertToIssueInput!) {
    convertGembaObservationToIssue(id: $id, input: $input) {
      id
      status
      createdIssueId
      updatedAt
    }
  }
`;

export const CONVERT_GEMBA_TO_ACTION_MUTATION = gql`
  mutation ConvertGembaObservationToAction($id: Int!, $input: ConvertToActionInput!) {
    convertGembaObservationToAction(id: $id, input: $input) {
      id
      status
      createdActionId
      updatedAt
    }
  }
`;
