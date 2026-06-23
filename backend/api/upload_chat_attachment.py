"""Upload endpoint for chat message file attachments."""

import logging
import uuid
from pathlib import Path

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf", ".docx", ".xlsx", ".xls", ".txt", ".csv", ".json", ".zip", ".mp4", ".mov", ".avi"}


@csrf_exempt
@require_http_methods(["POST"])
def upload_chat_attachment(request):
    """Upload a file attachment for a chat message.

    Accepts multipart form with:
      - file: The file to attach

    Saves to ``<MEDIA_ROOT>/chat-attachments/`` and returns the public URL
    along with file metadata so the frontend can include it in the message mutation.

    Returns JSON:
      { "ok": true, "url": "...", "file_name": "...", "file_size": 12345, "mime_type": "..." }
    """
    if "file" not in request.FILES:
        return JsonResponse(
            {"ok": False, "code": "FILE_REQUIRED", "message": "No file uploaded"},
            status=400,
        )

    uploaded = request.FILES["file"]
    ext = Path(uploaded.name).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        return JsonResponse(
            {
                "ok": False,
                "code": "INVALID_TYPE",
                "message": f"File type '{ext}' is not allowed.",
            },
            status=400,
        )

    if uploaded.size > MAX_FILE_SIZE:
        return JsonResponse(
            {
                "ok": False,
                "code": "FILE_TOO_LARGE",
                "message": f"File exceeds maximum size of {MAX_FILE_SIZE // (1024 * 1024)} MB",
            },
            status=413,
        )

    safe_stem = Path(uploaded.name).stem
    safe_stem = "".join(c for c in safe_stem if c.isalnum() or c in "-_.")
    unique_name = f"{safe_stem}_{uuid.uuid4().hex[:12]}{ext}"
    relative_dir = "chat-attachments"
    upload_dir = Path(settings.MEDIA_ROOT) / relative_dir

    try:
        upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = upload_dir / unique_name
        with open(str(file_path), "wb") as f:
            for chunk in uploaded.chunks():
                f.write(chunk)
    except Exception as exc:
        logger.exception("Failed to save chat attachment")
        return JsonResponse(
            {"ok": False, "code": "STORAGE_SAVE_FAILED", "message": f"Failed to save file: {exc}"},
            status=500,
        )

    url = f"{settings.MEDIA_URL}{relative_dir}/{unique_name}"
    mime_type = uploaded.content_type or "application/octet-stream"
    logger.info("Chat attachment uploaded: %s -> %s (%s)", uploaded.name, url, mime_type)

    return JsonResponse({
        "ok": True,
        "url": url,
        "file_name": uploaded.name,
        "file_size": uploaded.size,
        "mime_type": mime_type,
    })
