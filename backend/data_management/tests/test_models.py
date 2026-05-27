from django.test import TestCase
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from data_management.models import ErpPattern, ErpPatternMapping, ErpSourceFile, ErpImportLog


class ErpPatternModelTest(TestCase):
    def test_create_pattern_with_required_fields(self):
        pattern = ErpPattern.objects.create(
            name="Test Pattern",
            destination_entity="Plant",
        )
        self.assertEqual(pattern.name, "Test Pattern")
        self.assertEqual(pattern.destination_entity, "Plant")
        self.assertEqual(pattern.source_file_type, "xlsx")
        self.assertTrue(pattern.is_active)
        self.assertIsNotNone(pattern.created_at)
        self.assertIsNotNone(pattern.updated_at)

    def test_create_pattern_with_all_fields(self):
        pattern = ErpPattern.objects.create(
            name="Full Pattern",
            source_file_type="csv",
            destination_entity="Department",
            is_active=True,
            created_by="admin",
        )
        self.assertEqual(pattern.source_file_type, "csv")
        self.assertEqual(pattern.created_by, "admin")

    def test_pattern_name_unique(self):
        ErpPattern.objects.create(name="Unique", destination_entity="Plant")
        with self.assertRaises(IntegrityError):
            ErpPattern.objects.create(name="Unique", destination_entity="Department")

    def test_pattern_str(self):
        pattern = ErpPattern.objects.create(name="My Pattern", destination_entity="Material")
        self.assertIn("My Pattern", str(pattern))
        self.assertIn("Material", str(pattern))

    def test_pattern_ordering(self):
        active = ErpPattern.objects.create(name="B Pattern", destination_entity="Plant", is_active=True)
        inactive = ErpPattern.objects.create(name="A Pattern", destination_entity="Plant", is_active=False)
        qs = ErpPattern.objects.all()
        self.assertEqual(qs[0], active)
        self.assertEqual(qs[1], inactive)

    def test_no_scope_field(self):
        """ErpPattern must not have a scope field per the approved contract."""
        self.assertFalse(hasattr(ErpPattern, "scope"))

    def test_no_source_file_pattern_field(self):
        """ErpPattern must not have source_file_pattern per the approved contract."""
        self.assertFalse(hasattr(ErpPattern, "source_file_pattern"))

    def test_approved_fields_exist(self):
        """Verify the exact approved contract fields exist on ErpPattern."""
        approved = {"name", "source_file_type", "destination_entity",
                     "is_active", "created_by", "created_at", "updated_at"}
        field_names = {f.name for f in ErpPattern._meta.get_fields()
                       if not f.is_relation}
        self.assertTrue(approved.issubset(field_names),
                        msg=f"Missing fields: {approved - field_names}")


class ErpPatternMappingModelTest(TestCase):
    def setUp(self):
        self.pattern = ErpPattern.objects.create(name="Mapping Pattern", destination_entity="Plant")

    def test_create_mapping(self):
        mapping = ErpPatternMapping.objects.create(
            pattern=self.pattern,
            source_name="PlantCode",
            destination_name="code",
            is_required=True,
            order=1,
        )
        self.assertEqual(mapping.pattern, self.pattern)
        self.assertEqual(mapping.source_name, "PlantCode")
        self.assertEqual(mapping.source_data_type, "string")
        self.assertEqual(mapping.destination_data_type, "string")
        self.assertTrue(mapping.is_required)

    def test_mapping_unique_source_per_pattern(self):
        ErpPatternMapping.objects.create(
            pattern=self.pattern, source_name="Code", destination_name="code",
        )
        with self.assertRaises(IntegrityError):
            ErpPatternMapping.objects.create(
                pattern=self.pattern, source_name="Code", destination_name="other",
            )

    def test_mapping_same_source_different_pattern_allowed(self):
        other = ErpPattern.objects.create(name="Other Pattern", destination_entity="Department")
        ErpPatternMapping.objects.create(
            pattern=self.pattern, source_name="Code", destination_name="code",
        )
        mapping2 = ErpPatternMapping.objects.create(
            pattern=other, source_name="Code", destination_name="code",
        )
        self.assertIsNotNone(mapping2.pk)

    def test_mapping_str(self):
        mapping = ErpPatternMapping.objects.create(
            pattern=self.pattern,
            source_name="Name",
            source_data_type="string",
            destination_name="full_name",
            destination_data_type="string",
        )
        self.assertIn("Name", str(mapping))
        self.assertIn("full_name", str(mapping))

    def test_mapping_cascade_delete(self):
        mapping = ErpPatternMapping.objects.create(
            pattern=self.pattern, source_name="Code", destination_name="code",
        )
        pid = mapping.pk
        self.pattern.delete()
        self.assertFalse(ErpPatternMapping.objects.filter(pk=pid).exists())

    def test_transform_rule_nullable(self):
        without = ErpPatternMapping.objects.create(
            pattern=self.pattern, source_name="A", destination_name="a",
        )
        with_transform = ErpPatternMapping.objects.create(
            pattern=self.pattern, source_name="B", destination_name="b",
            transform_rule='{"concat": ["prefix_", "$.name"]}',
        )
        self.assertIsNone(without.transform_rule)
        self.assertEqual(with_transform.transform_rule,
                         '{"concat": ["prefix_", "$.name"]}')

    def test_order_field(self):
        """Mapping must use 'order' not 'sort_order'."""
        self.assertTrue(hasattr(ErpPatternMapping, "order"))
        self.assertFalse(hasattr(ErpPatternMapping, "sort_order"))


class ErpSourceFileModelTest(TestCase):
    def test_create_source_file(self):
        sf = ErpSourceFile.objects.create(
            original_name="plants_data.xlsx",
            stored_name="abc123.xlsx",
            file_path="/erp_data/source/abc123.xlsx",
            file_type="xlsx",
            uploaded_by="admin",
        )
        self.assertEqual(sf.original_name, "plants_data.xlsx")
        self.assertEqual(sf.stored_name, "abc123.xlsx")
        self.assertEqual(sf.file_type, "xlsx")
        self.assertEqual(sf.status, "UPLOADED")
        self.assertIsNotNone(sf.uploaded_at)

    def test_source_file_no_pattern_fk(self):
        """Source file must not have a FK to ErpPattern."""
        from django.core.exceptions import FieldDoesNotExist
        with self.assertRaises(FieldDoesNotExist):
            ErpSourceFile._meta.get_field("pattern")

    def test_source_file_str(self):
        sf = ErpSourceFile.objects.create(
            original_name="original.csv",
            stored_name="stored.csv",
            file_path="/erp_data/source/stored.csv",
        )
        self.assertEqual(str(sf), "original.csv")

    def test_approved_status_choices(self):
        approved = {"UPLOADED", "VALIDATED", "IMPORTED", "FAILED", "DELETED"}
        actual = {c[0] for c in ErpSourceFile.STATUS_CHOICES}
        self.assertEqual(actual, approved)

    def test_approved_fields_exist(self):
        approved = {"original_name", "stored_name", "file_path", "file_type",
                     "uploaded_by", "uploaded_at", "status"}
        field_names = {f.name for f in ErpSourceFile._meta.get_fields()
                       if not f.is_relation}
        self.assertTrue(approved.issubset(field_names),
                        msg=f"Missing fields: {approved - field_names}")


class ErpImportLogModelTest(TestCase):
    def setUp(self):
        self.pattern = ErpPattern.objects.create(name="Log Pattern", destination_entity="Plant")

    def test_create_import_log(self):
        log = ErpImportLog.objects.create(
            pattern=self.pattern,
            status="IMPORTED",
            rows_total=100,
            rows_added=80,
            rows_updated=15,
            rows_not_updated=3,
            rows_failed=2,
        )
        self.assertEqual(log.pattern, self.pattern)
        self.assertEqual(log.status, "IMPORTED")
        self.assertEqual(log.rows_total, 100)
        self.assertEqual(log.rows_added, 80)
        self.assertEqual(log.rows_updated, 15)

    def test_import_log_defaults(self):
        log = ErpImportLog.objects.create(pattern=self.pattern)
        self.assertEqual(log.status, "READY")
        self.assertEqual(log.rows_total, 0)
        self.assertEqual(log.rows_added, 0)
        self.assertEqual(log.rows_updated, 0)
        self.assertEqual(log.rows_not_updated, 0)
        self.assertEqual(log.rows_failed, 0)
        self.assertEqual(log.error_message, "")

    def test_import_log_with_source_file(self):
        sf = ErpSourceFile.objects.create(
            original_name="test.xlsx",
            stored_name="test.xlsx",
            file_path="/erp_data/source/test.xlsx",
        )
        log = ErpImportLog.objects.create(
            pattern=self.pattern,
            source_file=sf,
            status="IMPORTED",
        )
        self.assertEqual(log.source_file, sf)

    def test_import_log_source_file_set_null_on_delete(self):
        sf = ErpSourceFile.objects.create(
            original_name="del.xlsx",
            stored_name="del.xlsx",
            file_path="/erp_data/source/del.xlsx",
        )
        log = ErpImportLog.objects.create(pattern=self.pattern, source_file=sf)
        sf.delete()
        log.refresh_from_db()
        self.assertIsNone(log.source_file)

    def test_import_log_protected_against_pattern_delete(self):
        """Deleting a pattern with logs must raise ProtectedError."""
        ErpImportLog.objects.create(pattern=self.pattern)
        with self.assertRaises(ProtectedError):
            self.pattern.delete()

    def test_import_log_survives_source_file_delete(self):
        """Deleting a source file must NOT delete import logs."""
        sf = ErpSourceFile.objects.create(
            original_name="data.xlsx",
            stored_name="data.xlsx",
            file_path="/erp_data/source/data.xlsx",
        )
        log = ErpImportLog.objects.create(pattern=self.pattern, source_file=sf)
        log_id = log.pk
        sf.delete()
        self.assertTrue(ErpImportLog.objects.filter(pk=log_id).exists())

    def test_import_log_append_only(self):
        """Logs should persist — no cascade from pattern or source_file."""
        sf = ErpSourceFile.objects.create(
            original_name="data.xlsx",
            stored_name="data.xlsx",
            file_path="/erp_data/source/data.xlsx",
        )
        log = ErpImportLog.objects.create(pattern=self.pattern, source_file=sf)
        log_id = log.pk
        sf.delete()
        self.assertTrue(ErpImportLog.objects.filter(pk=log_id).exists())

    def test_import_log_str(self):
        log = ErpImportLog.objects.create(pattern=self.pattern, status="FAILED")
        self.assertIn("Log Pattern", str(log))
        self.assertIn("FAILED", str(log))

    def test_import_log_timestamps(self):
        from django.utils import timezone
        now = timezone.now()
        log = ErpImportLog.objects.create(
            pattern=self.pattern,
            started_at=now,
            completed_at=now,
        )
        self.assertIsNotNone(log.started_at)
        self.assertIsNotNone(log.completed_at)

    def test_approved_status_choices(self):
        approved = {"READY", "IMPORTED", "FAILED"}
        actual = {c[0] for c in ErpImportLog.STATUS_CHOICES}
        self.assertEqual(actual, approved)
