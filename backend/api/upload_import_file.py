import json
import logging
import base64
from hashlib import sha256
from pathlib import Path
from urllib.parse import unquote
from uuid import UUID

from django.core.files.storage import default_storage
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from manufacturing.models import ImportJob

logger = logging.getLogger(__name__)


def _normalize_job_id(job_id: str) -> str | None:
    raw = (job_id or "").strip()
    if not raw:
        return None

    # Django ImportJob uses BigAutoField — plain integer IDs are valid
    if raw.isdigit():
        return raw

    candidates = [raw, unquote(raw)]
    # Common prefixed/global-id forms can still include a UUID tail.
    candidates.extend([
        raw.rsplit(":", 1)[-1].strip(),
        raw.rsplit("/", 1)[-1].strip(),
        unquote(raw).rsplit(":", 1)[-1].strip(),
        unquote(raw).rsplit("/", 1)[-1].strip(),
    ])

    for candidate in candidates:
        if not candidate:
            continue
        try:
            return str(UUID(candidate.strip("{}")))
        except Exception:
            pass

    # Relay/global-id style payloads often base64-encode "TypeName:<uuid>"
    for candidate in candidates:
        if not candidate:
            continue
        padded = candidate + "=" * (-len(candidate) % 4)
        for decoder in (base64.b64decode, base64.urlsafe_b64decode):
            try:
                decoded = decoder(padded).decode("utf-8", errors="ignore").strip()
                for probe in (decoded, decoded.rsplit(":", 1)[-1].strip(), decoded.rsplit("/", 1)[-1].strip()):
                    if not probe:
                        continue
                    try:
                        return str(UUID(probe.strip("{}")))
                    except Exception:
                        continue
            except Exception:
                continue

    return None


@csrf_exempt
@require_http_methods(["POST"])
def upload_import_file(request, job_id):
    normalized_job_id = _normalize_job_id(job_id)
    if normalized_job_id is None:
        logger.warning("Invalid import job ID payload: %s", job_id)
        return JsonResponse({"ok": False, "code": "INVALID_JOB_ID", "message": "Invalid import job ID"}, status=400)

    try:
        job = ImportJob.objects.select_related("source_config").get(id=normalized_job_id)
    except ImportJob.DoesNotExist:
        return JsonResponse({"ok": False, "code": "NOT_FOUND", "message": "Import job not found"}, status=404)

    allowed = [ImportJob.Status.DRAFT, ImportJob.Status.FILE_ATTACHED]
    if job.status not in allowed:
        return JsonResponse(
            {"ok": False, "code": "INVALID_STATUS", "message": f"Cannot attach file to job in status {job.status}"},
            status=400,
        )

    if "file" not in request.FILES:
        return JsonResponse({"ok": False, "code": "FILE_REQUIRED", "message": "No file uploaded"}, status=400)

    uploaded = request.FILES["file"]
    safe_name = Path(uploaded.name).name
    storage_path = f"import_jobs/{job.id}/{safe_name}"

    try:
        saved_path = default_storage.save(storage_path, uploaded)
    except Exception as exc:
        logger.exception("Failed to save upload for job %s", job.id)
        return JsonResponse(
            {"ok": False, "code": "STORAGE_SAVE_FAILED", "message": f"Failed to save uploaded file: {exc}"},
            status=500,
        )

    # Verify file exists in storage
    if not default_storage.exists(saved_path):
        job.status = ImportJob.Status.FILE_MISSING
        job.file_name = safe_name
        job.file_path = saved_path
        job.save(update_fields=["status", "file_name", "file_path", "updated_at"])
        logger.error("Uploaded file missing from storage immediately after save for job %s", job.id)
        return JsonResponse(
            {"ok": False, "code": "IMPORT_FILE_NOT_FOUND", "message": "Uploaded file could not be verified in storage"},
            status=500,
        )

    # Calculate hash from storage
    try:
        with default_storage.open(saved_path, "rb") as f:
            file_hash = sha256(f.read()).hexdigest()
    except Exception as exc:
        logger.exception("Failed to read uploaded file for hash for job %s", job.id)
        file_hash = ""

    file_size = uploaded.size

    job.file_name = safe_name
    job.file_path = saved_path
    job.file_size = file_size
    job.file_hash = file_hash
    job.status = ImportJob.Status.FILE_ATTACHED
    job.save(update_fields=["file_name", "file_path", "file_size", "file_hash", "status", "updated_at"])

    logger.info("File uploaded for job %s: storage_key=%s size=%s", job.id, saved_path, file_size)

    return JsonResponse({
        "ok": True,
        "job_id": str(job.id),
        "file_name": safe_name,
        "file_path": saved_path,
        "file_size": file_size,
        "file_hash": file_hash,
        "status": ImportJob.Status.FILE_ATTACHED,
    })
