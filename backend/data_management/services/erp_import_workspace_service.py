from __future__ import annotations

import os

from django.db import transaction

from data_management.models import ErpPattern, ErpSourceFile
from data_management.services.erp_source_file_service import _validate_path_within_source_root


class ErpImportWorkspaceError(ValueError):
    def __init__(self, field: str, code: str, message: str):
        super().__init__(message)
        self.field = field
        self.code = code
        self.message = message


class ErpImportWorkspaceService:

    @staticmethod
    def refresh_pattern_list() -> list[ErpPattern]:
        return list(ErpPattern.objects.filter(is_active=True).order_by("name"))

    @staticmethod
    @transaction.atomic
    def reset_workspace(user: str = "", confirmed: bool = False) -> int:
        if not confirmed:
            raise ErpImportWorkspaceError(
                "confirmed", "REQUIRED",
                "Workspace reset requires confirmed=True",
            )

        cleaned = 0
        for sf in ErpSourceFile.objects.all():
            _validate_path_within_source_root(sf.file_path)
            if os.path.isfile(sf.file_path):
                try:
                    os.remove(sf.file_path)
                except OSError:
                    pass
            sf.status = "DELETED"
            sf.save(update_fields=["status"])
            cleaned += 1

        return cleaned
