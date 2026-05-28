import json
import logging
from pathlib import Path

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from application.erp_storage_service import ERPStorageService, FOLDERS

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["POST"])
def upload_staging_file(request):
    """Upload a file directly into staging for pattern-based definitions.

    Accepts multipart form with:
      - source_definition_name: str (matched against pattern definition name)
      - file: File (Excel, CSV, or JSON)

    The file is saved to ``erp_data/source/``, parsed, and a companion
    ``{stem}_data.json`` is written so the existing ``load_sample_staging_rows``
    resolver finds it.

    Returns JSON with ``ok``, ``file_name``, ``row_count``, ``sheet_count``.
    """
    if "file" not in request.FILES:
        return JsonResponse(
            {"ok": False, "code": "FILE_REQUIRED", "message": "No file uploaded"},
            status=400,
        )

    uploaded = request.FILES["file"]
    source_definition_name = request.POST.get("source_definition_name", "").strip()
    if not source_definition_name:
        return JsonResponse(
            {"ok": False, "code": "NAME_REQUIRED", "message": "source_definition_name is required"},
            status=400,
        )

    safe_name = Path(uploaded.name).name

    # ── Save raw file to erp_data/source/ ────────────────────────────
    try:
        saved_path = ERPStorageService.save_source_file(safe_name, uploaded.read())
        uploaded.seek(0)
    except Exception as exc:
        logger.exception("Failed to save uploaded file")
        return JsonResponse(
            {"ok": False, "code": "STORAGE_SAVE_FAILED", "message": f"Failed to save file: {exc}"},
            status=500,
        )

    # ── Parse the file ───────────────────────────────────────────────
    from manufacturing.domain.file_parser_service import FileParserService

    ext = Path(safe_name).suffix.lower()
    try:
        source_type = "EXCEL" if ext in (".xlsx", ".xls") else "CSV" if ext == ".csv" else None
        parse_result = FileParserService.parse(saved_path, source_type)
    except Exception as exc:
        logger.exception("Failed to parse uploaded file")
        return JsonResponse(
            {"ok": False, "code": "PARSE_FAILED", "message": f"Failed to parse file: {exc}"},
            status=400,
        )

    # ── Build rows array ────────────────────────────────────────────
    rows = []
    for sheet in parse_result.sheets:
        for row in sheet.rows:
            raw_data = {}
            for i, header in enumerate(sheet.column_headers):
                if i < len(row.values) and row.values[i] is not None and str(row.values[i]).strip():
                    raw_data[header] = row.values[i]
            if raw_data:
                rows.append({
                    "rowNumber": row.row_number,
                    "rawData": raw_data,
                })

    # ── Write companion data JSON ───────────────────────────────────
    data_file_name = f"{Path(safe_name).stem}_data.json"
    data = {
        "name": source_definition_name,
        "sourceFile": safe_name,
        "rows": rows,
    }

    source_dir = Path(ERPStorageService.root()) / FOLDERS["source"]
    data_file_path = source_dir / data_file_name

    try:
        source_dir.mkdir(parents=True, exist_ok=True)
        with open(str(data_file_path), "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as exc:
        logger.exception("Failed to write staging data file")
        return JsonResponse(
            {"ok": False, "code": "DATA_WRITE_FAILED", "message": f"Failed to write staging data: {exc}"},
            status=500,
        )

    logger.info(
        "Staging upload: %s -> %s (%d rows across %d sheets)",
        safe_name, data_file_name, len(rows), len(parse_result.sheets),
    )

    # ── Also clean up any *previous* data files for this definition ──
    try:
        for f in source_dir.iterdir():
            if f.name != data_file_name and f.suffix == ".json":
                try:
                    existing = json.loads(f.read_text(encoding="utf-8"))
                    if existing.get("name") == source_definition_name:
                        f.unlink()
                        logger.info("Removed stale staging data: %s", f.name)
                except (json.JSONDecodeError, OSError):
                    pass
    except OSError:
        pass

    return JsonResponse({
        "ok": True,
        "file_name": safe_name,
        "file_path": saved_path,
        "file_size": uploaded.size,
        "row_count": len(rows),
        "sheet_count": len(parse_result.sheets),
        "data_file": data_file_name,
    })
