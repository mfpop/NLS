import logging
import uuid
from pathlib import Path

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@csrf_exempt
@require_http_methods(["POST"])
def upload_image(request):
    """Upload an image for use in rich text editor content.

    Accepts multipart form with:
      - file: Image file (jpg, jpeg, png, gif, webp, svg)

    Saves to ``<MEDIA_ROOT>/editor-images/`` and returns the public URL.

    Returns JSON with ``ok``, ``url``, ``file_name`` or ``ok``, ``code``, ``message``.
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
                "message": f"File type '{ext}' is not allowed. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
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

    # Generate a unique filename to prevent collisions / path traversal
    safe_stem = Path(uploaded.name).stem
    # Sanitize: keep only alphanumeric, dashes, underscores
    safe_stem = "".join(c for c in safe_stem if c.isalnum() or c in "-_.")
    unique_name = f"{safe_stem}_{uuid.uuid4().hex[:12]}{ext}"
    relative_dir = "editor-images"
    upload_dir = Path(settings.MEDIA_ROOT) / relative_dir

    try:
        upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = upload_dir / unique_name
        with open(str(file_path), "wb") as f:
            for chunk in uploaded.chunks():
                f.write(chunk)
    except Exception as exc:
        logger.exception("Failed to save uploaded image")
        return JsonResponse(
            {"ok": False, "code": "STORAGE_SAVE_FAILED", "message": f"Failed to save image: {exc}"},
            status=500,
        )

    url = f"{settings.MEDIA_URL}{relative_dir}/{unique_name}"
    logger.info("Image uploaded: %s -> %s", uploaded.name, url)

    return JsonResponse({
        "ok": True,
        "url": url,
        "file_name": unique_name,
        "size": uploaded.size,
    })
