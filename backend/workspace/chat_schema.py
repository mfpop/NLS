"""GraphQL schema for workspace chat (direct 1:1 messaging)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

import strawberry
from django.contrib.auth.models import User
from api.common.errors import MutationError
from api.types.auth import UserNode
from workspace.chat_service import ChatService, ChatServiceError


# ── Types ──


@strawberry.type
class ChatContactType:
    id: strawberry.ID
    display_name: str = strawberry.field(name="displayName")
    position: str = ""
    avatar_url: Optional[str] = strawberry.field(name="avatarUrl", default=None)
    is_online: Optional[bool] = strawberry.field(name="isOnline", default=None)
    last_message_preview: Optional[str] = strawberry.field(name="lastMessagePreview", default=None)
    unread_count: int = strawberry.field(name="unreadCount", default=0)

    @classmethod
    def from_user(cls, user: User, last_preview: str = "", unread: int = 0) -> "ChatContactType":
        return cls(
            id=strawberry.ID(str(user.id)),
            display_name=user.get_full_name() or user.username,
            position="",
            is_online=None,
            last_message_preview=last_preview or None,
            unread_count=unread,
        )


@strawberry.type
class ChatParticipantType:
    id: strawberry.ID
    user_id: strawberry.ID = strawberry.field(name="userId")
    display_name: str = strawberry.field(name="displayName")
    avatar_url: Optional[str] = strawberry.field(name="avatarUrl", default=None)

    @classmethod
    def from_participant(cls, participant) -> "ChatParticipantType":
        return cls(
            id=strawberry.ID(str(participant.id)),
            user_id=strawberry.ID(str(participant.user_id)),
            display_name=participant.user.get_full_name() or participant.user.username,
        )


@strawberry.type
class ChatThreadType:
    id: strawberry.ID
    thread_type: str = strawberry.field(name="threadType")
    title: str = ""
    participants: list[ChatParticipantType]
    last_message_preview: Optional[str] = strawberry.field(name="lastMessagePreview", default=None)
    last_message_at: Optional[str] = strawberry.field(name="lastMessageAt", default=None)
    unread_count: int = strawberry.field(name="unreadCount", default=0)
    is_favorited: bool = strawberry.field(name="isFavorited")

    @classmethod
    def from_thread(cls, thread, user: User, unread: int = 0) -> "ChatThreadType":
        # Single pass: build participant list AND resolve is_favorited (avoids N+1)
        favorited = False
        participants = []
        for p in thread.participants.select_related("user").all():
            participants.append(ChatParticipantType.from_participant(p))
            if p.user_id == user.id:
                favorited = p.is_favorited

        last_msg = (
            ChatMessage.objects
            .filter(thread=thread, deleted_at__isnull=True)
            .order_by("-created_at")
            .first()
        )
        preview = last_msg.body[:100] if last_msg else None
        last_at = last_msg.created_at.isoformat() if last_msg else None

        return cls(
            id=strawberry.ID(str(thread.id)),
            thread_type=thread.thread_type,
            title=thread.title,
            participants=participants,
            last_message_preview=preview,
            last_message_at=last_at,
            unread_count=unread,
            is_favorited=favorited,
        )


@strawberry.type
class ChatAttachmentType:
    id: strawberry.ID
    file_url: str = strawberry.field(name="fileUrl")
    file_name: str = strawberry.field(name="fileName")
    file_size: int = strawberry.field(name="fileSize")
    mime_type: str = strawberry.field(name="mimeType")

    @classmethod
    def from_attachment(cls, att) -> "ChatAttachmentType":
        return cls(
            id=strawberry.ID(str(att.id)),
            file_url=att.file_url,
            file_name=att.file_name,
            file_size=att.file_size,
            mime_type=att.mime_type,
        )


@strawberry.input
class ChatAttachmentInput:
    url: str
    file_name: str = strawberry.field(name="fileName")
    file_size: int = strawberry.field(name="fileSize")
    mime_type: str = strawberry.field(name="mimeType")


@strawberry.type
class ChatMessageType:
    id: strawberry.ID
    sender: UserNode
    body: str
    created_at: str = strawberry.field(name="createdAt")
    is_mine: bool = strawberry.field(name="isMine")
    attachments: list[ChatAttachmentType] = strawberry.field(name="attachments")

    @classmethod
    def from_message(cls, msg, user: User) -> "ChatMessageType":
        return cls(
            id=strawberry.ID(str(msg.id)),
            sender=UserNode.from_user(msg.sender),
            body=msg.body,
            created_at=msg.created_at.isoformat(),
            is_mine=msg.sender_id == user.id,
            attachments=[ChatAttachmentType.from_attachment(a) for a in msg.attachments.all()],
        )


# Avoid circular import at module level
from workspace.models_chat import ChatMessage  # noqa: E402


@strawberry.type
class ChatMutationPayload:
    thread: Optional[ChatThreadType] = None
    message: Optional[ChatMessageType] = None
    errors: Optional[list[MutationError]] = None


# ── Queries ──


@strawberry.type
class ChatQuery:
    @strawberry.field(name="chatContacts")
    def chat_contacts(
        self, info: strawberry.types.Info,
        search: Optional[str] = None,
    ) -> list[ChatContactType]:
        user = info.context.user
        if not user:
            return []
        contacts = ChatService.list_contacts(user, search or "")
        return [ChatContactType.from_user(u) for u in contacts]

    @strawberry.field(name="chatThreads")
    def chat_threads(
        self, info: strawberry.types.Info,
        search: Optional[str] = None,
        filter_type: Optional[str] = None,
    ) -> list[ChatThreadType]:
        user = info.context.user
        if not user:
            return []
        threads = ChatService.list_threads(user, search or "", filter_type=filter_type or "")
        return [
            ChatThreadType.from_thread(t, user, unread=ChatService.get_thread_unread_count(t, user))
            for t in threads
        ]

    @strawberry.field(name="chatMessages")
    def chat_messages(
        self, info: strawberry.types.Info,
        thread_id: strawberry.ID,
        limit: Optional[int] = 50,
        before: Optional[str] = None,
    ) -> list[ChatMessageType]:
        user = info.context.user
        if not user:
            return []
        before_dt = datetime.fromisoformat(before) if before else None
        msgs = ChatService.list_messages(user, int(thread_id), limit=int(limit or 50), before=before_dt)
        return [ChatMessageType.from_message(m, user) for m in msgs]

    @strawberry.field(name="chatUnreadCount")
    def chat_unread_count(self, info: strawberry.types.Info) -> int:
        user = info.context.user
        if not user:
            return 0
        return ChatService.get_unread_count(user)


# ── Mutations ──


@strawberry.type
class ChatMutation:
    @strawberry.mutation(name="openDirectChat")
    def open_direct_chat(self, info: strawberry.types.Info, user_id: strawberry.ID) -> ChatMutationPayload:
        user = info.context.user
        if not user:
            return ChatMutationPayload(errors=[MutationError(field="auth", code="UNAUTHORIZED", message="Not authenticated.")])
        try:
            thread = ChatService.get_or_create_direct_thread(user, int(user_id))
            unread = ChatService.get_thread_unread_count(thread, user)
            return ChatMutationPayload(thread=ChatThreadType.from_thread(thread, user, unread=unread))
        except ChatServiceError as exc:
            return ChatMutationPayload(errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation(name="createGroupChat")
    def create_group_chat(self, info: strawberry.types.Info, title: str, participant_ids: list[strawberry.ID]) -> ChatMutationPayload:
        user = info.context.user
        if not user:
            return ChatMutationPayload(errors=[MutationError(field="auth", code="UNAUTHORIZED", message="Not authenticated.")])
        try:
            ids = [int(pid) for pid in participant_ids]
            thread = ChatService.create_group_thread(user, title, ids)
            unread = ChatService.get_thread_unread_count(thread, user)
            return ChatMutationPayload(thread=ChatThreadType.from_thread(thread, user, unread=unread))
        except ChatServiceError as exc:
            return ChatMutationPayload(errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation(name="addChatParticipants")
    def add_chat_participants(self, info: strawberry.types.Info, thread_id: strawberry.ID, user_ids: list[strawberry.ID]) -> ChatMutationPayload:
        user = info.context.user
        if not user:
            return ChatMutationPayload(errors=[MutationError(field="auth", code="UNAUTHORIZED", message="Not authenticated.")])
        try:
            ids = [int(uid) for uid in user_ids]
            thread = ChatService.add_participants(int(thread_id), user, ids)
            unread = ChatService.get_thread_unread_count(thread, user)
            return ChatMutationPayload(thread=ChatThreadType.from_thread(thread, user, unread=unread))
        except ChatServiceError as exc:
            return ChatMutationPayload(errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation(name="removeChatParticipant")
    def remove_chat_participant(self, info: strawberry.types.Info, thread_id: strawberry.ID, user_id: strawberry.ID) -> ChatMutationPayload:
        user = info.context.user
        if not user:
            return ChatMutationPayload(errors=[MutationError(field="auth", code="UNAUTHORIZED", message="Not authenticated.")])
        try:
            thread = ChatService.remove_participant(int(thread_id), user, int(user_id))
            unread = ChatService.get_thread_unread_count(thread, user)
            return ChatMutationPayload(thread=ChatThreadType.from_thread(thread, user, unread=unread))
        except ChatServiceError as exc:
            return ChatMutationPayload(errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation(name="sendChatMessage")
    def send_chat_message(
        self, info: strawberry.types.Info,
        thread_id: strawberry.ID,
        body: str,
        attachments: Optional[list[ChatAttachmentInput]] = None,
    ) -> ChatMutationPayload:
        user = info.context.user
        if not user:
            return ChatMutationPayload(errors=[MutationError(field="auth", code="UNAUTHORIZED", message="Not authenticated.")])
        try:
            att_data = None
            if attachments:
                att_data = [
                    {"url": a.url, "file_name": a.file_name, "file_size": a.file_size, "mime_type": a.mime_type}
                    for a in attachments
                ]
            msg = ChatService.send_message(user, int(thread_id), body, attachments=att_data)
            thread = ChatService.get_thread(int(thread_id), user)
            unread = ChatService.get_thread_unread_count(thread, user)
            return ChatMutationPayload(
                message=ChatMessageType.from_message(msg, user),
                thread=ChatThreadType.from_thread(thread, user, unread=unread),
            )
        except ChatServiceError as exc:
            return ChatMutationPayload(errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation(name="markChatThreadRead")
    def mark_chat_thread_read(self, info: strawberry.types.Info, thread_id: strawberry.ID) -> ChatMutationPayload:
        user = info.context.user
        if not user:
            return ChatMutationPayload(errors=[MutationError(field="auth", code="UNAUTHORIZED", message="Not authenticated.")])
        try:
            thread = ChatService.mark_thread_read(int(thread_id), user)
            unread = ChatService.get_thread_unread_count(thread, user)
            return ChatMutationPayload(thread=ChatThreadType.from_thread(thread, user, unread=unread))
        except ChatServiceError as exc:
            return ChatMutationPayload(errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation(name="toggleChatFavorite")
    def toggle_chat_favorite(self, info: strawberry.types.Info, thread_id: strawberry.ID) -> ChatMutationPayload:
        user = info.context.user
        if not user:
            return ChatMutationPayload(errors=[MutationError(field="auth", code="UNAUTHORIZED", message="Not authenticated.")])
        try:
            thread, is_fav = ChatService.toggle_favorite(int(thread_id), user)
            unread = ChatService.get_thread_unread_count(thread, user)
            return ChatMutationPayload(thread=ChatThreadType.from_thread(thread, user, unread=unread))
        except ChatServiceError as exc:
            return ChatMutationPayload(errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])
