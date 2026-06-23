import { gql } from "@apollo/client";

/* ══════════════════════════════════════════════════════════════
   FRAGMENTS — shared field selections for type consistency
   ══════════════════════════════════════════════════════════════ */

export const CHAT_USER_FIELDS = gql`
  fragment ChatUserFields on UserNode {
    id
    name
    username
    email
    displayName
  }
`;

export const CHAT_PARTICIPANT_FIELDS = gql`
  fragment ChatParticipantFields on ChatParticipantType {
    id
    userId
    displayName
    avatarUrl
  }
`;

export const CHAT_THREAD_BASE_FIELDS = gql`
  fragment ChatThreadBaseFields on ChatThreadType {
    id
    threadType
    title
    participants {
      ...ChatParticipantFields
    }
    lastMessagePreview
    lastMessageAt
    unreadCount
    isFavorited
  }
  ${CHAT_PARTICIPANT_FIELDS}
`;

export const CHAT_ATTACHMENT_FIELDS = gql`
  fragment ChatAttachmentFields on ChatAttachmentType {
    id
    fileUrl
    fileName
    fileSize
    mimeType
  }
`;

export const CHAT_MESSAGE_FIELDS = gql`
  fragment ChatMessageFields on ChatMessageType {
    id
    sender {
      ...ChatUserFields
    }
    body
    createdAt
    isMine
    attachments {
      ...ChatAttachmentFields
    }
  }
  ${CHAT_USER_FIELDS}
  ${CHAT_ATTACHMENT_FIELDS}
`;

export const CHAT_MUTATION_ERROR_FIELDS = gql`
  fragment ChatMutationErrorFields on MutationError {
    field
    code
    message
  }
`;

/* ══════════════════════════════════════════════════════════════
   QUERIES
   ══════════════════════════════════════════════════════════════ */

export const CHAT_CONTACTS_QUERY = gql`
  query ChatContacts($search: String) {
    chatContacts(search: $search) {
      id
      displayName
      position
      avatarUrl
      isOnline
      lastMessagePreview
      unreadCount
    }
  }
`;

export const CHAT_THREADS_QUERY = gql`
  query ChatThreads($search: String, $filterType: String) {
    chatThreads(search: $search, filterType: $filterType) {
      ...ChatThreadBaseFields
    }
  }
  ${CHAT_THREAD_BASE_FIELDS}
`;

export const CHAT_MESSAGES_QUERY = gql`
  query ChatMessages($threadId: ID!, $limit: Int, $before: DateTime) {
    chatMessages(threadId: $threadId, limit: $limit, before: $before) {
      ...ChatMessageFields
    }
  }
  ${CHAT_MESSAGE_FIELDS}
`;

export const CHAT_UNREAD_COUNT_QUERY = gql`
  query ChatUnreadCount {
    chatUnreadCount
  }
`;

/* ══════════════════════════════════════════════════════════════
   MUTATIONS
   ══════════════════════════════════════════════════════════════ */

/**
 * Open (or create) a direct 1:1 thread with another user.
 * Returns the full thread with participants and read state.
 */
export const OPEN_DIRECT_CHAT_MUTATION = gql`
  mutation OpenDirectChat($userId: ID!) {
    openDirectChat(userId: $userId) {
      thread {
        ...ChatThreadBaseFields
      }
      errors {
        ...ChatMutationErrorFields
      }
    }
  }
  ${CHAT_THREAD_BASE_FIELDS}
  ${CHAT_MUTATION_ERROR_FIELDS}
`;

/**
 * Send a message in a thread.
 * Returns the created message and the updated thread.
 */
export const SEND_CHAT_MESSAGE_MUTATION = gql`
  mutation SendChatMessage($threadId: ID!, $body: String!, $attachments: [ChatAttachmentInput!]) {
    sendChatMessage(threadId: $threadId, body: $body, attachments: $attachments) {
      message {
        ...ChatMessageFields
      }
      thread {
        ...ChatThreadBaseFields
      }
      errors {
        ...ChatMutationErrorFields
      }
    }
  }
  ${CHAT_MESSAGE_FIELDS}
  ${CHAT_THREAD_BASE_FIELDS}
  ${CHAT_MUTATION_ERROR_FIELDS}
`;

/**
 * Toggle favorite status on a thread for the current user.
 */
export const TOGGLE_CHAT_FAVORITE_MUTATION = gql`
  mutation ToggleChatFavorite($threadId: ID!) {
    toggleChatFavorite(threadId: $threadId) {
      thread {
        id
        isFavorited
        unreadCount
      }
      errors {
        ...ChatMutationErrorFields
      }
    }
  }
  ${CHAT_MUTATION_ERROR_FIELDS}
`;

/**
 * Mark a thread as read by the current user.
 */
export const MARK_CHAT_THREAD_READ_MUTATION = gql`
  mutation MarkChatThreadRead($threadId: ID!) {
    markChatThreadRead(threadId: $threadId) {
      thread {
        id
        unreadCount
      }
      errors {
        ...ChatMutationErrorFields
      }
    }
  }
  ${CHAT_MUTATION_ERROR_FIELDS}
`;

/**
 * Create a group chat with 2+ other participants.
 */
export const CREATE_GROUP_CHAT_MUTATION = gql`
  mutation CreateGroupChat($title: String!, $participantIds: [ID!]!) {
    createGroupChat(title: $title, participantIds: $participantIds) {
      thread {
        ...ChatThreadBaseFields
      }
      errors {
        ...ChatMutationErrorFields
      }
    }
  }
  ${CHAT_THREAD_BASE_FIELDS}
  ${CHAT_MUTATION_ERROR_FIELDS}
`;

/**
 * Add participants to an existing group thread.
 */
export const ADD_CHAT_PARTICIPANTS_MUTATION = gql`
  mutation AddChatParticipants($threadId: ID!, $userIds: [ID!]!) {
    addChatParticipants(threadId: $threadId, userIds: $userIds) {
      thread {
        ...ChatThreadBaseFields
      }
      errors {
        ...ChatMutationErrorFields
      }
    }
  }
  ${CHAT_THREAD_BASE_FIELDS}
  ${CHAT_MUTATION_ERROR_FIELDS}
`;

/**
 * Remove a participant from a group thread (self-removal only).
 */
export const REMOVE_CHAT_PARTICIPANT_MUTATION = gql`
  mutation RemoveChatParticipant($threadId: ID!, $userId: ID!) {
    removeChatParticipant(threadId: $threadId, userId: $userId) {
      thread {
        ...ChatThreadBaseFields
      }
      errors {
        ...ChatMutationErrorFields
      }
    }
  }
  ${CHAT_THREAD_BASE_FIELDS}
  ${CHAT_MUTATION_ERROR_FIELDS}
`;
