from __future__ import annotations

import os
import uuid
from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import UploadedFile
from django.db import transaction

from data_management.models import ErpSourceFile

VALID_FILE_TYPES = {"xlsx", "xls", "csv", "tsv", "xml", "json"}

EXTENSION_MAP = {
    ".xlsx": "xlsx", ".xls": "xls",
    ".csv": "csv", ".tsv": "tsv",
    ".xml": "xml", ".json": "json",
}


class ErpSourceFileError(ValueError):
    def __init__(self, field: str, code: str, message: str):
        super().__init__(message)
        self.field = field
        self.code = code
        self.message = message


def get_source_root() -> Path:
    root = getattr(settings, "ERP_DATA_ROOT", None)
    if root:
        return Path(root) / "source"
    return Path(settings.MEDIA_ROOT)


def _validate_path_within_source_root(file_path: str) -> Path:
    resolved = Path(file_path).resolve()
    source_root = get_source_root().resolve()
    if not str(resolved).startswith(str(source_root)):
        raise ErpSourceFileError(
            "file_path", "PATH_ESCAPE",
            f"File path {resolved} is outside the ERP source folder {source_root}",
        )
    return resolved


class ErpSourceFileService:

    @staticmethod
    def detect_file_type(filename: str) -> str:
        ext = Path(filename).suffix.lower()
        file_type = EXTENSION_MAP.get(ext)
        if not file_type:
            raise ErpSourceFileError(
                "file_type", "UNSUPPORTED",
                f"Unsupported file extension '{ext}'. "
                f"Supported: {', '.join(sorted(VALID_FILE_TYPES))}",
            )
        return file_type

    @staticmethod
    def _generate_stored_name(original_name: str) -> str:
        ext = Path(original_name).suffix.lower()
        return f"{uuid.uuid4().hex}{ext}"

    @staticmethod
    @transaction.atomic
    def upload_file(file: UploadedFile, uploaded_by: str = "") -> ErpSourceFile:
        if not file.name:
            raise ErpSourceFileError("file", "NO_NAME", "Uploaded file has no name")
        file_type = ErpSourceFileService.detect_file_type(file.name)
        stored_name = ErpSourceFileService._generate_stored_name(file.name)
        source_root = get_source_root()
        os.makedirs(source_root, exist_ok=True)
        file_path = str(source_root / stored_name)
        with open(file_path, "wb") as f:
            for chunk in file.chunks():
                f.write(chunk)
        source_file = ErpSourceFile.objects.create(
            original_name=file.name,
            stored_name=stored_name,
            file_path=file_path,
            file_type=file_type,
            uploaded_by=uploaded_by or "",
        )
        return source_file

    @staticmethod
    def store_source_file(file: UploadedFile, uploaded_by: str = "") -> ErpSourceFile:
        return ErpSourceFileService.upload_file(file, uploaded_by)

    @staticmethod
    def verify_file_exists(source_file: ErpSourceFile) -> bool:
        return os.path.isfile(source_file.file_path)

    @staticmethod
    @transaction.atomic
    def cleanup_source_files(confirmed: bool = False) -> int:
        if not confirmed:
            raise ErpSourceFileError("confirmed", "REQUIRED", "Cleanup requires confirmed=True")
        count = 0
        for sf in ErpSourceFile.objects.all():
            _validate_path_within_source_root(sf.file_path)
            if os.path.isfile(sf.file_path):
                try:
                    os.remove(sf.file_path)
                except OSError:
                    pass
            sf.status = "DELETED"
            sf.save()
            count += 1
        return count
