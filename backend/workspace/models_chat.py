"""Chat models for direct 1:1 messaging."""

from django.db import models
from shared.models.base import TimeStampedModel


THREAD_TYPE_DIRECT = "DIRECT"
THREAD_TYPE_GROUP = "GROUP"

THREAD_TYPE_CHOICES = [
    (THREAD_TYPE_DIRECT, "Direct"),
    (THREAD_TYPE_GROUP, "Group"),
]


class ChatThread(TimeStampedModel):
    """A direct or group message thread."""

    thread_type = models.CharField(
        max_length=20, choices=THREAD_TYPE_CHOICES, default=THREAD_TYPE_DIRECT,
    )
    title = models.CharField(max_length=255, blank=True, default="")
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = "workspace"
        db_table = "workspace_chat_thread"
        ordering = ["-last_message_at", "-updated_at"]
        verbose_name = "Chat Thread"
        verbose_name_plural = "Chat Threads"
        indexes = [
            models.Index(fields=["-last_message_at"], name="cthread_lmsg_idx"),
        ]

    def __str__(self):
        return f"ChatThread #{self.id} ({self.thread_type})"


class ChatParticipant(models.Model):
    """Links a user to a thread with read-state tracking."""

    thread = models.ForeignKey(
        ChatThread, on_delete=models.CASCADE, related_name="participants",
    )
    user = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE, related_name="chat_participations",
    )
    last_read_at = models.DateTimeField(null=True, blank=True)
    is_favorited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "workspace"
        db_table = "workspace_chat_participant"
        verbose_name = "Chat Participant"
        verbose_name_plural = "Chat Participants"
        constraints = [
            models.UniqueConstraint(
                fields=["thread", "user"], name="uq_thread_user",
            ),
        ]
        indexes = [
            models.Index(fields=["user"], name="cpart_user_idx"),
        ]

    def __str__(self):
        return f"Participant #{self.user_id} in Thread #{self.thread_id}"


class ChatMessage(TimeStampedModel):
    """A single message within a chat thread."""

    thread = models.ForeignKey(
        ChatThread, on_delete=models.CASCADE, related_name="messages",
    )
    sender = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE, related_name="chat_messages",
    )
    body = models.TextField()
    edited_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = "workspace"
        db_table = "workspace_chat_message"
        ordering = ["created_at"]
        verbose_name = "Chat Message"
        verbose_name_plural = "Chat Messages"
        indexes = [
            models.Index(fields=["thread", "created_at"], name="cmsg_thread_created_idx"),
        ]

    def __str__(self):
        return f"Message #{self.id} in Thread #{self.thread_id}"

    def is_deleted(self) -> bool:
        return self.deleted_at is not None


class ChatAttachment(models.Model):
    """A file attached to a chat message."""

    message = models.ForeignKey(
        ChatMessage, on_delete=models.CASCADE, related_name="attachments",
    )
    file_url = models.URLField(max_length=500)
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField(default=0)
    mime_type = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "workspace"
        db_table = "workspace_chat_attachment"
        verbose_name = "Chat Attachment"
        verbose_name_plural = "Chat Attachments"
        indexes = [
            models.Index(fields=["message"], name="catt_msg_idx"),
        ]

    def __str__(self):
        return f"Attachment {self.file_name} on Message #{self.message_id}"
