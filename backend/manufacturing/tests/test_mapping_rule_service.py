from django.test import TestCase

from application.models import ImportSourceConfig
from manufacturing.models import MappingRule
from manufacturing.domain.mapping_rule_service import MappingRuleService, MappingRuleError


class Input:
    """Object-like input for service methods expecting attribute access."""
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

    def __getattr__(self, name):
        return None


class MappingRuleServiceCreateTests(TestCase):

    def test_create_rule_success(self):
        rule = MappingRuleService.create(Input(
            domain="PLANT_STRUCTURE",
            source_field="PlantCode",
            destination_field="code",
            transform_rule="trim, uppercase",
            is_required=True,
        ))
        self.assertEqual(rule.domain, "PLANT_STRUCTURE")
        self.assertEqual(rule.source_field, "PlantCode")
        self.assertEqual(rule.destination_field, "code")
        self.assertEqual(rule.transform_rule, "trim, uppercase")
        self.assertTrue(rule.is_required)
        self.assertTrue(rule.is_active)
        self.assertIsNotNone(rule.id)

    def test_create_rule_minimal_fields(self):
        rule = MappingRuleService.create(Input(
            domain="MATERIALS",
            source_field="MaterialID",
            destination_field="code",
        ))
        self.assertEqual(rule.domain, "MATERIALS")
        self.assertEqual(rule.source_field, "MaterialID")
        self.assertEqual(rule.transform_rule, None)
        self.assertFalse(rule.is_required)

    def test_create_rule_from_dict(self):
        rule = MappingRuleService.create_from_dict({
            "domain": "ROUTING",
            "source_field": "OperationNo",
            "destination_field": "sequence_number",
            "transform_rule": "int",
            "is_required": True,
        })
        self.assertEqual(rule.domain, "ROUTING")
        self.assertEqual(rule.destination_field, "sequence_number")

    def test_create_duplicate_raises_error(self):
        MappingRuleService.create(Input(
            domain="BOM",
            source_field="PartNo",
            destination_field="part_code",
        ))
        with self.assertRaises(MappingRuleError) as ctx:
            MappingRuleService.create(Input(
                domain="bom",  # case-insensitive test
                source_field="  PARTNO  ",  # case-insensitive + whitespace
                destination_field="another_field",
            ))
        self.assertEqual(ctx.exception.code, "DUPLICATE")
        self.assertIn("PARTNO", ctx.exception.message)

    def test_create_duplicate_allows_different_domain(self):
        MappingRuleService.create(Input(
            domain="BOM",
            source_field="PartNo",
            destination_field="part_code",
        ))
        rule = MappingRuleService.create(Input(
            domain="MATERIALS",
            source_field="PartNo",
            destination_field="part_code",
        ))
        self.assertEqual(rule.domain, "MATERIALS")

    def test_create_empty_domain_raises(self):
        with self.assertRaises(MappingRuleError) as ctx:
            MappingRuleService.create(Input(
                domain="",
                source_field="FieldA",
                destination_field="field_b",
            ))
        self.assertEqual(ctx.exception.code, "REQUIRED")

    def test_create_invalid_domain_raises(self):
        with self.assertRaises(MappingRuleError) as ctx:
            MappingRuleService.create(Input(
                domain="INVALID_DOMAIN",
                source_field="FieldA",
                destination_field="field_b",
            ))
        self.assertEqual(ctx.exception.code, "INVALID")

    def test_create_empty_source_field_raises(self):
        with self.assertRaises(MappingRuleError) as ctx:
            MappingRuleService.create(Input(
                domain="BOM",
                source_field="",
                destination_field="field_b",
            ))
        self.assertEqual(ctx.exception.code, "REQUIRED")
        self.assertEqual(ctx.exception.field, "sourceField")

    def test_create_empty_destination_field_raises(self):
        with self.assertRaises(MappingRuleError) as ctx:
            MappingRuleService.create(Input(
                domain="BOM",
                source_field="FieldA",
                destination_field="",
            ))
        self.assertEqual(ctx.exception.code, "REQUIRED")
        self.assertEqual(ctx.exception.field, "destinationField")


class MappingRuleServiceUpdateTests(TestCase):

    def setUp(self):
        self.rule = MappingRuleService.create(Input(
            domain="SCHEDULES",
            source_field="LineCode",
            destination_field="production_line.code",
            transform_rule="trim",
        ))

    def test_update_destination_field(self):
        updated = MappingRuleService.update(self.rule.id, Input(
            domain=self.rule.domain,
            source_field=self.rule.source_field,
            destination_field="production_line.code_override",
        ))
        self.assertEqual(updated.destination_field, "production_line.code_override")
        self.assertEqual(updated.transform_rule, "trim")  # unchanged

    def test_update_transform_rule(self):
        updated = MappingRuleService.update(self.rule.id, Input(
            domain=self.rule.domain,
            source_field=self.rule.source_field,
            destination_field=self.rule.destination_field,
            transform_rule="uppercase, trim",
        ))
        self.assertEqual(updated.transform_rule, "uppercase, trim")

    def test_update_from_dict(self):
        updated = MappingRuleService.update_from_dict(self.rule.id, {
            "destination_field": "line.code_new",
            "is_required": True,
        })
        self.assertEqual(updated.destination_field, "line.code_new")
        self.assertTrue(updated.is_required)
        self.assertEqual(updated.source_field, "LineCode")  # unchanged

    def test_update_not_found_raises(self):
        with self.assertRaises(MappingRuleError) as ctx:
            MappingRuleService.update(999999, Input(
                domain="BOM",
                source_field="X",
                destination_field="Y",
            ))
        self.assertEqual(ctx.exception.code, "NOT_FOUND")

    def test_update_duplicate_raises(self):
        MappingRuleService.create(Input(
            domain="SCHEDULES",
            source_field="ShiftCode",
            destination_field="shift.code",
        ))
        with self.assertRaises(MappingRuleError) as ctx:
            MappingRuleService.update(self.rule.id, Input(
                domain="SCHEDULES",
                source_field="  SHIFTCODE  ",
                destination_field="shift.code_new",
            ))
        self.assertEqual(ctx.exception.code, "DUPLICATE")

    def test_update_allows_own_duplicate(self):
        updated = MappingRuleService.update(self.rule.id, Input(
            domain="SCHEDULES",
            source_field="  LINECODE  ",
            destination_field="production_line.code_changed",
        ))
        self.assertEqual(updated.destination_field, "production_line.code_changed")


class MappingRuleServiceArchiveRestoreTests(TestCase):

    def setUp(self):
        self.rule = MappingRuleService.create(Input(
            domain="INVENTORY",
            source_field="WarehouseCode",
            destination_field="location.code",
        ))

    def test_archive_rule(self):
        archived = MappingRuleService.archive(self.rule.id)
        self.assertFalse(archived.is_active)
        # Verify from DB
        db_rule = MappingRule.objects.get(id=self.rule.id)
        self.assertFalse(db_rule.is_active)

    def test_archive_already_inactive_raises(self):
        MappingRuleService.archive(self.rule.id)
        with self.assertRaises(MappingRuleError) as ctx:
            MappingRuleService.archive(self.rule.id)
        self.assertEqual(ctx.exception.code, "ALREADY_INACTIVE")

    def test_restore_rule(self):
        MappingRuleService.archive(self.rule.id)
        restored = MappingRuleService.restore(self.rule.id)
        self.assertTrue(restored.is_active)

    def test_restore_already_active_raises(self):
        with self.assertRaises(MappingRuleError) as ctx:
            MappingRuleService.restore(self.rule.id)
        self.assertEqual(ctx.exception.code, "ALREADY_ACTIVE")

    def test_restore_with_duplicate_raises(self):
        MappingRuleService.archive(self.rule.id)
        MappingRuleService.create(Input(
            domain="INVENTORY",
            source_field="WarehouseCode",
            destination_field="location.code_new",
        ))
        with self.assertRaises(MappingRuleError) as ctx:
            MappingRuleService.restore(self.rule.id)
        self.assertEqual(ctx.exception.code, "DUPLICATE")

    def test_archive_not_found_raises(self):
        with self.assertRaises(MappingRuleError) as ctx:
            MappingRuleService.archive(999999)
        self.assertEqual(ctx.exception.code, "NOT_FOUND")


class MappingRuleServiceListTests(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.rules = []
        for domain, src, dest in [
            ("MATERIALS", "PartNo", "part_code"),
            ("MATERIALS", "RevNo", "revision"),
            ("BOM", "PartNo", "parent_part_code"),
            ("ROUTING", "OpNo", "sequence_number"),
            ("SCHEDULES", "Date", "schedule_date"),
            ("INVENTORY", "Qty", "quantity"),
        ]:
            cls.rules.append(MappingRuleService.create(Input(
                domain=domain,
                source_field=src,
                destination_field=dest,
            )))
        # Create an inactive one
        inactive = MappingRuleService.create(Input(
            domain="MATERIALS",
            source_field="InactiveField",
            destination_field="old_field",
        ))
        MappingRuleService.archive(inactive.id)

    def test_list_all(self):
        qs = MappingRuleService.list()
        self.assertEqual(len(qs), 7)  # 6 active + 1 inactive

    def test_list_active_only(self):
        qs = MappingRuleService.list(active_only=True)
        self.assertEqual(len(qs), 6)
        for rule in qs:
            self.assertTrue(rule.is_active)

    def test_list_filter_by_domain(self):
        qs = MappingRuleService.list(domain="MATERIALS")
        self.assertEqual(len(qs), 3)  # 2 active + 1 inactive

    def test_list_filter_by_domain_active(self):
        qs = MappingRuleService.list(domain="MATERIALS", active_only=True)
        self.assertEqual(len(qs), 2)

    def test_list_sort_asc(self):
        qs = MappingRuleService.list(sort_by="source_field", sort_order="asc")
        names = [r.source_field for r in qs]
        self.assertEqual(names, sorted(names))

    def test_list_sort_desc(self):
        qs = MappingRuleService.list(sort_by="source_field", sort_order="desc")
        names = [r.source_field for r in qs]
        self.assertEqual(names, sorted(names, reverse=True))

    def test_list_invalid_sort_falls_back_to_default(self):
        qs = MappingRuleService.list(sort_by="nonexistent_field")
        self.assertEqual(len(qs), 7)  # should not crash

    def test_get_by_domain(self):
        rules = MappingRuleService.get_by_domain("BOM")
        self.assertEqual(len(rules), 1)
        self.assertEqual(rules[0].source_field, "PartNo")

    def test_get_rule_by_id(self):
        rule_id = self.rules[0].id
        found = MappingRuleService.get(rule_id)
        self.assertEqual(found.id, rule_id)

    def test_get_nonexistent_raises(self):
        with self.assertRaises(MappingRuleError) as ctx:
            MappingRuleService.get(999999)
        self.assertEqual(ctx.exception.code, "NOT_FOUND")


class MappingRuleServiceBulkCreateTests(TestCase):

    def test_bulk_create_success(self):
        rules = MappingRuleService.bulk_create([
            {"domain": "PLANT_STRUCTURE", "source_field": "PlantCode", "destination_field": "code"},
            {"domain": "PLANT_STRUCTURE", "source_field": "PlantName", "destination_field": "name"},
            {"domain": "MATERIALS", "source_field": "MaterialID", "destination_field": "code", "is_required": True},
        ])
        self.assertEqual(len(rules), 3)
        self.assertEqual(MappingRule.objects.count(), 3)
        self.assertTrue(rules[2].is_required)

    def test_bulk_create_duplicate_fails_all(self):
        MappingRuleService.create(Input(
            domain="BOM",
            source_field="PartNo",
            destination_field="part_code",
        ))
        with self.assertRaises(MappingRuleError):
            MappingRuleService.bulk_create([
                {"domain": "BOM", "source_field": "Qty", "destination_field": "quantity"},
                {"domain": "bom", "source_field": "  PARTNO  ", "destination_field": "another"},  # duplicate
            ])
        # Verify no rules were created (transaction rolled back)
        self.assertEqual(MappingRule.objects.count(), 1)
