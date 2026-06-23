"""Chat domain service — owns thread lifecycle, message persistence, permission checks, and read-state."""

from datetime import datetime
from typing import Optional

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Count, Q, OuterRef

from workspace.models_chat import ChatThread, ChatParticipant, ChatMessage, ChatAttachment
from workspace.models_chat import THREAD_TYPE_DIRECT, THREAD_TYPE_GROUP

MAX_BODY_LENGTH = 2000


class ChatServiceError(Exception):
    def __init__(self, field: str, code: str, message: str):
        self.field = field
        self.code = code
        self.message = message
        super().__init__(message)


class ChatService:

    # ── Contacts ──

    @staticmethod
    def list_contacts(user: User, search: str = "") -> list[User]:
        """Return users the current user can chat with (all active users)."""
        qs = User.objects.filter(is_active=True).exclude(id=user.id).order_by("username")
        term = search.strip()
        if term:
            qs = qs.filter(
                Q(username__icontains=term)
                | Q(email__icontains=term)
                | Q(first_name__icontains=term)
                | Q(last_name__icontains=term),
            )
        return list(qs[:50])

    # ── Threads ──

    @staticmethod
    def list_threads(user: User, search: str = "", filter_type: str = "") -> list[ChatThread]:
        """Return all threads the user participates in, most recent first.

        ``filter_type`` can be "favorites", "unread", or "" (all).
        Favorited threads always sort to the top.
        """
        qs = ChatThread.objects.filter(participants__user=user)
        term = search.strip()

        if term:
            # Search by other participant's name in direct threads
            other_user_ids = (
                ChatParticipant.objects
                .filter(thread=OuterRef("pk"))
                .exclude(user=user)
                .values("user_id")[:1]
            )
            other_users = User.objects.filter(
                Q(id__in=other_user_ids)
                & (
                    Q(username__icontains=term)
                    | Q(email__icontains=term)
                    | Q(first_name__icontains=term)
                    | Q(last_name__icontains=term)
                ),
            )
            qs = qs.filter(participants__user__in=other_users).distinct()

        threads = list(qs.order_by("-last_message_at", "-updated_at"))

        # Resolve favorites filter on the Python side since it requires
        # a per-thread participant lookup
        if filter_type == "favorites":
            participant_map = {
                p.thread_id: p
                for p in ChatParticipant.objects.filter(
                    user=user, thread_id__in=[t.id for t in threads],
                )
            }
            threads = [t for t in threads if participant_map.get(t.id) and participant_map[t.id].is_favorited]

        return threads

    @staticmethod
    def toggle_favorite(thread_id: int, user: User) -> tuple[ChatThread, bool]:
        """Toggle the favorited status of a thread. Returns (thread, is_now_favorited)."""
        thread = ChatService.get_thread(thread_id, user)
        cp = ChatParticipant.objects.get(thread=thread, user=user)
        cp.is_favorited = not cp.is_favorited
        cp.save(update_fields=["is_favorited"])
        return thread, cp.is_favorited

    @staticmethod
    def get_or_create_direct_thread(user: User, other_user_id: int) -> ChatThread:
        """Find an existing direct thread or create one. Validates exactly 2 participants."""
        if user.id == other_user_id:
            raise ChatServiceError("userId", "SELF_CHAT", "Cannot start a chat with yourself.")

        try:
            other_user = User.objects.get(id=other_user_id, is_active=True)
        except User.DoesNotExist:
            raise ChatServiceError("userId", "NOT_FOUND", "User not found.")

        # Look for existing mutual direct thread
        existing = (
            ChatThread.objects
            .filter(thread_type=THREAD_TYPE_DIRECT)
            .annotate(participant_count=Count("participants"))
            .filter(participant_count=2)
            .filter(participants__user=user)
            .filter(participants__user=other_user)
            .distinct()
            .first()
        )
        if existing:
            return existing

        # Create new thread
        with transaction.atomic():
            thread = ChatThread.objects.create(thread_type=THREAD_TYPE_DIRECT)
            ChatParticipant.objects.create(thread=thread, user=user)
            ChatParticipant.objects.create(thread=thread, user=other_user)

        return thread

    @staticmethod
    def get_thread(thread_id: int, user: User) -> ChatThread:
        """Get a thread with participant check."""
        try:
            thread = ChatThread.objects.get(id=thread_id, participants__user=user)
        except ChatThread.DoesNotExist:
            raise ChatServiceError("threadId", "NOT_FOUND", "Thread not found or access denied.")
        return thread

    @staticmethod
    def mark_thread_read(thread_id: int, user: User) -> ChatThread:
        """Mark thread as read by the user."""
        thread = ChatService.get_thread(thread_id, user)
        ChatParticipant.objects.filter(thread=thread, user=user).update(
            last_read_at=datetime.now(),
        )
        return thread

    @staticmethod
    def get_unread_count(user: User) -> int:
        """Count threads with unread messages for the user."""
        threads = ChatThread.objects.filter(
            participants__user=user,
            last_message_at__isnull=False,
        )
        unread = 0
        for t in threads:
            try:
                cp = ChatParticipant.objects.get(thread=t, user=user)
                if cp.last_read_at is None or (t.last_message_at and cp.last_read_at < t.last_message_at):
                    unread += 1
            except ChatParticipant.DoesNotExist:
                pass
        return unread

    # ── Group Threads ──

    @staticmethod
    def create_group_thread(user: User, title: str, participant_ids: list[int]) -> ChatThread:
        """Create a group thread with specified participants (min 3: creator + 2 others)."""
        title = title.strip()
        if not title:
            raise ChatServiceError("title", "REQUIRED", "Group title is required.")
        if len(title) > 255:
            raise ChatServiceError("title", "TOO_LONG", "Group title cannot exceed 255 characters.")

        # Remove duplicates and self
        unique_ids = set(participant_ids)
        unique_ids.discard(user.id)
        unique_ids = list(unique_ids)[:50]  # max 50 participants

        if len(unique_ids) < 2:
            raise ChatServiceError("participantIds", "MINIMUM", "Group chat requires at least 3 participants (including you).")

        # Validate all users exist
        valid_users = list(User.objects.filter(id__in=unique_ids, is_active=True))
        if len(valid_users) < 2:
            raise ChatServiceError("participantIds", "INVALID", "Could not find enough valid users.")

        with transaction.atomic():
            thread = ChatThread.objects.create(thread_type=THREAD_TYPE_GROUP, title=title)
            ChatParticipant.objects.create(thread=thread, user=user)
            for u in valid_users:
                ChatParticipant.objects.create(thread=thread, user=u)

        return thread

    @staticmethod
    def add_participants(thread_id: int, user: User, new_user_ids: list[int]) -> ChatThread:
        """Add participants to a group thread. Only existing participants can add."""
        thread = ChatService.get_thread(thread_id, user)  # permission check

        if thread.thread_type != THREAD_TYPE_GROUP:
            raise ChatServiceError("threadType", "NOT_GROUP", "Can only add participants to group threads.")

        # Get current participant IDs
        current_ids = set(ChatParticipant.objects.filter(thread=thread).values_list("user_id", flat=True))
        to_add = [uid for uid in new_user_ids if uid not in current_ids and uid != user.id]

        if not to_add:
            return thread

        valid_users = list(User.objects.filter(id__in=to_add, is_active=True))
        if not valid_users:
            return thread

        with transaction.atomic():
            for u in valid_users:
                ChatParticipant.objects.get_or_create(thread=thread, user=u)

        return ChatThread.objects.get(id=thread.id)

    @staticmethod
    def remove_participant(thread_id: int, user: User, remove_user_id: int) -> ChatThread:
        """Remove a participant from a group thread. Users can remove themselves."""
        thread = ChatService.get_thread(thread_id, user)  # permission check

        if thread.thread_type != THREAD_TYPE_GROUP:
            raise ChatServiceError("threadType", "NOT_GROUP", "Can only remove participants from group threads.")

        if user.id != remove_user_id:
            # Only allow self-removal for now (admin capability can be added later)
            raise ChatServiceError("permission", "DENIED", "You can only remove yourself from a group chat.")

        with transaction.atomic():
            ChatParticipant.objects.filter(thread=thread, user_id=remove_user_id).delete()

        return ChatThread.objects.get(id=thread.id)

    # ── Messages ──

    @staticmethod
    def list_messages(user: User, thread_id: int, limit: int = 50, before: Optional[datetime] = None) -> list[ChatMessage]:
        """List messages in a thread (participant check enforced)."""
        ChatService.get_thread(thread_id, user)  # permission check
        qs = ChatMessage.objects.filter(thread_id=thread_id, deleted_at__isnull=True)
        if before:
            qs = qs.filter(created_at__lt=before)
        return list(qs.prefetch_related("attachments").order_by("-created_at")[:limit])

    @staticmethod
    def send_message(user: User, thread_id: int, body: str, attachments: Optional[list[dict]] = None) -> ChatMessage:
        """Send a message in a thread (participant check enforced).

        ``attachments`` is an optional list of dicts with keys:
          url, file_name, file_size, mime_type
        """
        thread = ChatService.get_thread(thread_id, user)

        body = body.strip()
        if not body and (not attachments or len(attachments) == 0):
            raise ChatServiceError("body", "EMPTY", "Message body or attachment is required.")
        if len(body) > MAX_BODY_LENGTH:
            raise ChatServiceError("body", "TOO_LONG", f"Message body cannot exceed {MAX_BODY_LENGTH} characters.")

        now = datetime.now()
        with transaction.atomic():
            msg = ChatMessage.objects.create(thread=thread, sender=user, body=body)

            # Create attachment records
            if attachments:
                for att in attachments:
                    ChatAttachment.objects.create(
                        message=msg,
                        file_url=att.get("url", ""),
                        file_name=att.get("file_name", ""),
                        file_size=att.get("file_size", 0),
                        mime_type=att.get("mime_type", ""),
                    )

            thread.last_message_at = now
            thread.save(update_fields=["last_message_at", "updated_at"])
            # Mark sender's read state
            ChatParticipant.objects.filter(thread=thread, user=user).update(last_read_at=now)

        return msg

    @staticmethod
    def get_thread_unread_count(thread: ChatThread, user: User) -> int:
        """Count unread messages in a specific thread for the user."""
        try:
            cp = ChatParticipant.objects.get(thread=thread, user=user)
        except ChatParticipant.DoesNotExist:
            return 0
        base = ChatMessage.objects.filter(thread=thread, deleted_at__isnull=True)
        if cp.last_read_at:
            return base.filter(created_at__gt=cp.last_read_at).count()
        return base.count()
