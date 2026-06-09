import logging
import strawberry
from strawberry.types import Info
from strawberry.file_uploads import Upload

from api.permissions import ensure_access
from api.common.errors import MutationError
from api.types.plant_structure import (
    PlantStructureCompareRowType,
    PlantStructureFieldDifferenceType,
    PlantStructureImportResultType,
)
from manufacturing.domain.plant_structure_import_service import (
    PlantStructureImportService,
    ImportMode,
    ValidationError,
)
from manufacturing.domain.plant_structure_compare_service import PlantStructureCompareService

logger = logging.getLogger(__name__)

IMPORT_MODE_MAP = {
    "VALIDATE_ONLY": ImportMode.VALIDATE_ONLY,
    "COMPARE_ONLY": ImportMode.COMPARE_ONLY,
    "UPSERT": ImportMode.UPSERT,
    "REJECT_ON_DIFF": ImportMode.REJECT_ON_DIFF,
}


def _validation_errors_to_mutation(errors: list[ValidationError]) -> list[MutationError]:
    return [
        MutationError(
            field=f"{e.sheet}/{e.field}",
            code="VALIDATION_ERROR",
            message=f"Row {e.row_number}: {e.message}",
        )
        for e in errors
    ]


def _user(info: Info):
    return info.context.user


def _save_upload(file: Upload, prefix: str) -> str:
    from django.core.files.storage import default_storage
    from pathlib import Path

    safe_name = Path(file.filename or "upload").name if hasattr(file, "filename") else "upload.xlsx"
    storage_path = f"imports/{prefix}/{safe_name}"
    saved_path = default_storage.save(storage_path, file)
    return default_storage.path(saved_path) if hasattr(default_storage, "path") else saved_path


def _resolve_job_file(job_id: str) -> str:
    from manufacturing.models.integration import ImportJob
    from manufacturing.domain.erp_import_service import ErpImportService
    from django.core.exceptions import ObjectDoesNotExist

    job = ImportJob.objects.get(id=job_id)
    path = ErpImportService._resolve_file_path(job)
    if not path:
        raise FileNotFoundError(f"No file found for import job {job_id}")
    return path


def _resolve_file(file: Upload | None, job_id: str | None) -> str:
    if job_id:
        return _resolve_job_file(job_id)
    if file is None:
        raise ValueError("Either file or jobId must be provided")
    return _save_upload(file, "plant_structure")


@strawberry.type
class PlantStructureMutation:

    @strawberry.mutation
    def validate_plant_structure_excel(
        self, info: Info, file: Upload | None = None, job_id: str | None = None
    ) -> PlantStructureImportResultType:
        ensure_access(user=_user(info), action="import_plant_structure")
        try:
            file_path = _resolve_file(file, job_id)
            result = PlantStructureImportService.import_workbook(file_path, ImportMode.VALIDATE_ONLY)
            return PlantStructureImportResultType(
                ok=result.ok,
                validation_errors=_validation_errors_to_mutation(result.validation_errors),
            )
        except Exception as exc:
            logger.exception("Validate plant structure Excel failed")
            return PlantStructureImportResultType(
                ok=False,
                validation_errors=[MutationError(field="file", code="PARSE_ERROR", message=str(exc))],
            )

    @strawberry.mutation
    def compare_plant_structure_excel(
        self, info: Info, file: Upload | None = None, job_id: str | None = None
    ) -> PlantStructureImportResultType:
        ensure_access(user=_user(info), action="import_plant_structure")
        try:
            file_path = _resolve_file(file, job_id)
            compare_result = PlantStructureCompareService.compare_all(file_path)
            return PlantStructureImportResultType(
                ok=compare_result.ok,
                validation_errors=[
                    MutationError(
                        field=e.get("field", ""),
                        code="VALIDATION_ERROR",
                        message=f"Row {e.get('row', 0)}: {e.get('message', '')}",
                    )
                    for e in compare_result.validation_errors
                ],
                compare_rows=[PlantStructureCompareRowType.from_dataclass(r) for r in compare_result.rows],
            )
        except Exception as exc:
            logger.exception("Compare plant structure Excel failed")
            return PlantStructureImportResultType(
                ok=False,
                validation_errors=[MutationError(field="file", code="PARSE_ERROR", message=str(exc))],
            )

    @strawberry.mutation
    def import_plant_structure_excel(
        self, info: Info, file: Upload | None = None, job_id: str | None = None, mode: str = "UPSERT"
    ) -> PlantStructureImportResultType:
        ensure_access(user=_user(info), action="import_plant_structure")
        try:
            file_path = _resolve_file(file, job_id)
            mode_upper = mode.upper()
            resolved_mode = IMPORT_MODE_MAP.get(mode_upper, ImportMode.UPSERT)
            if resolved_mode == ImportMode.REJECT_ON_DIFF:
                compare_result = PlantStructureCompareService.compare_all(file_path)
                differences = [r for r in compare_result.rows if r.status in ("DIFFERENT", "MISSING_IN_APP", "MISSING_IN_EXCEL")]
                if differences:
                    return PlantStructureImportResultType(
                        ok=False,
                        validation_errors=[
                            MutationError(field="file", code="REJECT_ON_DIFF", message=f"Found {len(differences)} differences — import rejected")
                        ],
                        compare_rows=[PlantStructureCompareRowType.from_dataclass(r) for r in differences],
                    )
                import_result = PlantStructureImportService.import_workbook(file_path, ImportMode.UPSERT)
            else:
                import_result = PlantStructureImportService.import_workbook(file_path, resolved_mode)
        except Exception as exc:
            logger.exception("Import plant structure Excel failed")
            return PlantStructureImportResultType(
                ok=False,
                validation_errors=[MutationError(field="file", code="PARSE_ERROR", message=str(exc))],
            )

        created = (
            import_result.companies_created
            + import_result.plants_created
            + import_result.lines_created
            + import_result.departments_created
            + import_result.assignments_created
            + import_result.resource_groups_created
            + import_result.resources_created
        )
        updated = (
            import_result.companies_updated
            + import_result.plants_updated
            + import_result.lines_updated
            + import_result.departments_updated
            + import_result.assignments_updated
            + import_result.resource_groups_updated
            + import_result.resources_updated
        )

        return PlantStructureImportResultType(
            ok=import_result.ok,
            validation_errors=_validation_errors_to_mutation(import_result.validation_errors),
            companies_created=import_result.companies_created,
            companies_updated=import_result.companies_updated,
            plants_created=import_result.plants_created,
            plants_updated=import_result.plants_updated,
            lines_created=import_result.lines_created,
            lines_updated=import_result.lines_updated,
            departments_created=import_result.departments_created,
            departments_updated=import_result.departments_updated,
            assignments_created=import_result.assignments_created,
            assignments_updated=import_result.assignments_updated,
            resource_groups_created=import_result.resource_groups_created,
            resource_groups_updated=import_result.resource_groups_updated,
            resources_created=import_result.resources_created,
            resources_updated=import_result.resources_updated,
            total_created=created,
            total_updated=updated,
        )
