from hashlib import sha256
from pathlib import Path
import tempfile

from django.test import TestCase

from application.models import ImportSourceConfig
from manufacturing.domain.import_job_service import ImportJobDuplicateError, ImportJobError, ImportJobService
from manufacturing.models import ImportJob


def _temp_file_with_bytes(data: bytes, suffix: str = ".csv") -> str:
    handle = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        handle.write(data)
        handle.flush()
        return handle.name
    finally:
        handle.close()


class ImportJobServiceDuplicateTests(TestCase):

    def setUp(self):
        self.config = ImportSourceConfig.objects.create(
            name="Test Source",
            domain=ImportSourceConfig.Domain.ROUTING,
            source_type=ImportSourceConfig.SourceType.CSV,
            path="/imports",
            file_pattern="*.csv",
        )

    def _create_active_job(self, file_name: str = "routing.csv", file_hash: str = "hash-1"):
        return ImportJob.objects.create(
            source_config=self.config,
            status=ImportJob.Status.FILE_ATTACHED,
            started_at="2024-01-01 00:00:00",
            file_name=file_name,
            file_hash=file_hash,
        )

    def test_create_draft_job_creates_one_active_job(self):
        job = ImportJobService.create_draft_job(str(self.config.id))
        self.assertEqual(ImportJob.objects.count(), 1)
        self.assertEqual(job.status, ImportJob.Status.DRAFT)

    def test_create_draft_job_rejects_duplicate_active_file_name(self):
        self._create_active_job(file_name="routing.csv", file_hash="hash-1")

        with self.assertRaises(ImportJobDuplicateError) as ctx:
            ImportJobService.create_draft_job(str(self.config.id), file_name="routing.csv")

        self.assertEqual(ctx.exception.code, "DUPLICATE_ACTIVE_IMPORT_JOB")
        self.assertEqual(ctx.exception.source_config_id, str(self.config.id))

    def test_applied_job_allows_reimport_same_file(self):
        ImportJob.objects.create(
            source_config=self.config,
            status=ImportJob.Status.APPLIED,
            started_at="2024-01-01 00:00:00",
            file_name="routing.csv",
            file_hash="hash-1",
        )

        job = ImportJobService.create_draft_job(str(self.config.id), file_name="routing.csv")
        self.assertEqual(job.status, ImportJob.Status.DRAFT)

    def test_failed_job_allows_reimport_same_file(self):
        ImportJob.objects.create(
            source_config=self.config,
            status=ImportJob.Status.FAILED,
            started_at="2024-01-01 00:00:00",
            file_name="routing.csv",
            file_hash="hash-1",
        )

        job = ImportJobService.create_draft_job(str(self.config.id), file_name="routing.csv")
        self.assertEqual(job.status, ImportJob.Status.DRAFT)

    def test_cancelled_job_allows_reimport_same_file(self):
        ImportJob.objects.create(
            source_config=self.config,
            status=ImportJob.Status.CANCELLED,
            started_at="2024-01-01 00:00:00",
            file_name="routing.csv",
            file_hash="hash-1",
        )

        job = ImportJobService.create_draft_job(str(self.config.id), file_name="routing.csv")
        self.assertEqual(job.status, ImportJob.Status.DRAFT)

    def test_duplicate_error_contains_existing_job_id(self):
        existing = self._create_active_job(file_name="routing.csv", file_hash="hash-1")

        with self.assertRaises(ImportJobDuplicateError) as ctx:
            ImportJobService.create_draft_job(str(self.config.id), file_name="routing.csv")

        self.assertEqual(ctx.exception.existing_job_id, str(existing.id))


class ImportJobServiceAttachFileTests(TestCase):

    def setUp(self):
        self.config = ImportSourceConfig.objects.create(
            name="Test Source",
            domain=ImportSourceConfig.Domain.ROUTING,
            source_type=ImportSourceConfig.SourceType.CSV,
            path="/imports",
            file_pattern="*.csv",
        )
        self.job = ImportJob.objects.create(
            source_config=self.config,
            status=ImportJob.Status.DRAFT,
            started_at="2024-01-01 00:00:00",
        )

    def test_attach_file_stores_sha256_file_hash(self):
        file_path = _temp_file_with_bytes(b"a,b,c\n1,2,3\n")
        expected_hash = sha256(Path(file_path).read_bytes()).hexdigest()

        updated = ImportJobService.attach_file(
            str(self.job.id),
            file_name="routing.csv",
            file_path=file_path,
            file_size=12,
        )

        updated.refresh_from_db()
        self.assertEqual(updated.file_hash, expected_hash)

    def test_attach_file_preserves_current_job_id(self):
        updated = ImportJobService.attach_file(
            str(self.job.id),
            file_name="routing.csv",
            file_path=_temp_file_with_bytes(b"x,y\n1,2\n"),
        )
        self.assertEqual(str(updated.id), str(self.job.id))

    def test_attach_file_does_not_create_second_job(self):
        ImportJobService.attach_file(
            str(self.job.id),
            file_name="routing.csv",
            file_path=_temp_file_with_bytes(b"x,y\n1,2\n"),
        )
        self.assertEqual(ImportJob.objects.count(), 1)

    def test_attach_file_rejects_duplicate_active_file_hash(self):
        file_path = _temp_file_with_bytes(b"duplicate,data\n1,2\n")
        file_hash = sha256(Path(file_path).read_bytes()).hexdigest()
        existing = ImportJob.objects.create(
            source_config=self.config,
            status=ImportJob.Status.FILE_ATTACHED,
            started_at="2024-01-01 00:00:00",
            file_name="routing.csv",
            file_hash=file_hash,
        )

        with self.assertRaises(ImportJobDuplicateError) as ctx:
            ImportJobService.attach_file(
                str(self.job.id),
                file_name="routing.csv",
                file_path=file_path,
            )

        self.assertEqual(ctx.exception.existing_job_id, str(existing.id))
