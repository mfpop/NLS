"""
Tests for MaterialsImportHandler — Product Family / Model / Variant / Part Number / Material import logic.

Covers validate, compare, and apply for all entity types.
"""
from unittest.mock import Mock, patch

from django.test import TestCase

from manufacturing.models import (
    ProductFamily, ProductModel, ProductVariant, PartNumber, Material,
)
from manufacturing.domain.domain_import_handler import (
    MaterialsImportHandler,
    ValidationIssue,
    CompareRow,
    ApplyResult,
)
from manufacturing.domain.file_parser_service import (
    SheetData, ParsedColumn, ParsedRow,
)
from manufacturing.domain.product_identity_service import ProductIdentityError


# ═══════════════════════════════════════════════════════════════════
#  Helpers
# ═══════════════════════════════════════════════════════════════════

def _make_sheet(name: str, headers: list[str], rows: list[list[str | None]]) -> SheetData:
    parsed_rows = [
        ParsedRow(row_number=i + 2, values=row, is_empty=all(v is None or v == "" for v in row))
        for i, row in enumerate(rows)
    ]
    return SheetData(
        sheet_name=name,
        column_headers=headers,
        column_types=[ParsedColumn(h, "String") for h in headers],
        rows=parsed_rows,
        total_rows=len(rows),
    )


class MaterialsImportHandlerTests(TestCase):
    def setUp(self):
        self.handler = MaterialsImportHandler()

    # ═══════════════════════════════════════════════════════════════
    #  VALIDATE
    # ═══════════════════════════════════════════════════════════════

    def test_validate_family_required_fields(self):
        sheet = _make_sheet("Families", ["code", "name"], [
            ["F001", "Family One"],       # OK
            ["", "Missing Code"],          # missing code
            ["F003", ""],                  # missing name
            [None, None],                  # skipped (empty)
        ])
        issues = self.handler.validate([sheet], [])
        codes = {(i.field_name, i.error_code) for i in issues}
        self.assertIn(("code", "REQUIRED"), codes)
        self.assertIn(("name", "REQUIRED"), codes)
        self.assertEqual(len(issues), 2)

    def test_validate_family_invalid_status(self):
        sheet = _make_sheet("Families", ["code", "name", "status"], [
            ["F001", "Family One", "BAD_STATUS"],
        ])
        issues = self.handler.validate([sheet], [])
        self.assertIn(("status", "INVALID_STATUS"), {(i.field_name, i.error_code) for i in issues})

    def test_validate_model_requires_family_code(self):
        sheet = _make_sheet("Models", ["code", "name", "family_code"], [
            ["M001", "Model One", ""],  # missing family_code
        ])
        issues = self.handler.validate([sheet], [])
        self.assertIn(("family_code", "REQUIRED"), {(i.field_name, i.error_code) for i in issues})

    def test_validate_variant_requires_model_code(self):
        sheet = _make_sheet("Variants", ["code", "name", "model_code"], [
            ["V001", "Variant One", ""],
        ])
        issues = self.handler.validate([sheet], [])
        self.assertIn(("model_code", "REQUIRED"), {(i.field_name, i.error_code) for i in issues})

    def test_validate_part_number_requires_family_and_model(self):
        sheet = _make_sheet("Parts", ["part_number", "family_code", "model_code"], [
            ["PN001", "", ""],
        ])
        issues = self.handler.validate([sheet], [])
        codes = {(i.field_name, i.error_code) for i in issues}
        self.assertIn(("family_code", "REQUIRED"), codes)
        self.assertIn(("model_code", "REQUIRED"), codes)

    def test_validate_part_number_max_length(self):
        sheet = _make_sheet("Parts", ["part_number", "family_code", "model_code"], [
            ["X" * 101, "F001", "M001"],
        ])
        issues = self.handler.validate([sheet], [])
        self.assertIn(("part_number", "MAX_LENGTH"), {(i.field_name, i.error_code) for i in issues})

    def test_validate_material_required_fields(self):
        sheet = _make_sheet("Materials", ["code", "name"], [
            ["", ""],
        ])
        issues = self.handler.validate([sheet], [])
        codes = {(i.field_name, i.error_code) for i in issues}
        self.assertIn(("code", "REQUIRED"), codes)
        self.assertIn(("name", "REQUIRED"), codes)

    def test_validate_material_invalid_state(self):
        sheet = _make_sheet("Materials", ["code", "name", "material_state"], [
            ["M001", "Mat One", "INVALID"],
        ])
        issues = self.handler.validate([sheet], [])
        self.assertIn(("material_state", "INVALID_STATE"), {(i.field_name, i.error_code) for i in issues})

    def test_validate_material_valid_states(self):
        sheet = _make_sheet("Materials", ["code", "name", "material_state"], [
            ["M001", "RM", "RAW_MATERIAL"],
            ["M002", "WIP", "WIP"],
            ["M003", "FG", "FINISHED_GOOD"],
            ["M004", "Scrap", "SCRAP"],
        ])
        issues = self.handler.validate([sheet], [])
        self.assertEqual(len(issues), 0)

    def test_validate_field_max_length(self):
        sheet = _make_sheet("Families", ["code", "name"], [
            ["F" + "x" * 200, "Long Code"],
        ])
        issues = self.handler.validate([sheet], [])
        self.assertIn(("code", "MAX_LENGTH"), {(i.field_name, i.error_code) for i in issues})

    def test_validate_mixed_sheets(self):
        """Multiple sheets dispatched correctly."""
        families = _make_sheet("Families", ["code", "name"], [
            ["", "No Code"],
        ])
        models = _make_sheet("Models", ["code", "name", "family_code"], [
            ["", "", ""],
        ])
        issues = self.handler.validate([families, models], [])
        self.assertEqual(len(issues), 4)  # 2 from family + 3 from model (2 required + 1 missing family_code)

    # ═══════════════════════════════════════════════════════════════
    #  COMPARE
    # ═══════════════════════════════════════════════════════════════

    def test_compare_family_create(self):
        sheet = _make_sheet("Families", ["code", "name"], [
            ["F001", "New Family"],
        ])
        rows = self.handler.compare([sheet])
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].action, "CREATE")
        self.assertEqual(rows[0].entity_type, "ProductFamily")
        self.assertEqual(rows[0].stable_key, "F001")

    def test_compare_family_unchanged(self):
        ProductFamily.objects.create(code="F001", name="Existing")
        sheet = _make_sheet("Families", ["code", "name"], [
            ["F001", "Existing"],
        ])
        rows = self.handler.compare([sheet])
        self.assertEqual(rows[0].action, "UNCHANGED")

    def test_compare_family_update(self):
        ProductFamily.objects.create(code="F001", name="Old Name")
        sheet = _make_sheet("Families", ["code", "name"], [
            ["F001", "New Name"],
        ])
        rows = self.handler.compare([sheet])
        self.assertEqual(rows[0].action, "UPDATE")

    def test_compare_model_create(self):
        sheet = _make_sheet("Models", ["code", "name", "family_code"], [
            ["M001", "New Model", "F001"],
        ])
        rows = self.handler.compare([sheet])
        self.assertEqual(rows[0].action, "CREATE")
        self.assertEqual(rows[0].entity_type, "ProductModel")

    def test_compare_variant_create(self):
        sheet = _make_sheet("Variants", ["code", "name", "model_code"], [
            ["V001", "New Variant", "M001"],
        ])
        rows = self.handler.compare([sheet])
        self.assertEqual(rows[0].action, "CREATE")

    def test_compare_part_number_create(self):
        sheet = _make_sheet("Part Numbers", ["part_number", "family_code", "model_code"], [
            ["PN001", "F001", "M001"],
        ])
        rows = self.handler.compare([sheet])
        self.assertEqual(rows[0].action, "CREATE")
        self.assertEqual(rows[0].entity_type, "PartNumber")

    def test_compare_part_number_unchanged(self):
        family = ProductFamily.objects.create(code="F001", name="Family")
        model = ProductModel.objects.create(code="M001", name="Model", family=family)
        PartNumber.objects.create(part_number="PN001", family=family, model=model)
        sheet = _make_sheet("Parts", ["part_number", "family_code", "model_code", "description"], [
            ["PN001", "F001", "M001", ""],
        ])
        rows = self.handler.compare([sheet])
        self.assertEqual(rows[0].action, "UNCHANGED")

    def test_compare_material_create(self):
        sheet = _make_sheet("Materials", ["code", "name", "material_state"], [
            ["MAT001", "New Mat", "RAW_MATERIAL"],
        ])
        rows = self.handler.compare([sheet])
        self.assertEqual(rows[0].action, "CREATE")
        self.assertEqual(rows[0].entity_type, "Material")

    def test_compare_material_update(self):
        Material.objects.create(code="MAT001", name="Old Name")
        sheet = _make_sheet("Materials", ["code", "name"], [
            ["MAT001", "New Name"],
        ])
        rows = self.handler.compare([sheet])
        self.assertEqual(rows[0].action, "UPDATE")

    def test_compare_skips_empty_rows(self):
        sheet = _make_sheet("Families", ["code", "name"], [
            [None, None],
            ["", ""],
            ["F001", "Real"],
        ])
        rows = self.handler.compare([sheet])
        self.assertEqual(len(rows), 1)

    def test_compare_skips_rows_without_code(self):
        sheet = _make_sheet("Families", ["code", "name"], [
            ["", "No Code"],
        ])
        rows = self.handler.compare([sheet])
        self.assertEqual(len(rows), 0)

    # ═══════════════════════════════════════════════════════════════
    #  APPLY — Create
    # ═══════════════════════════════════════════════════════════════

    def test_apply_create_family(self):
        rows = [
            CompareRow(action="CREATE", entity_type="ProductFamily",
                       stable_key="F001",
                       current_value=None, incoming_value={"code": "F001", "name": "New Family"},
                       diff={"code": "F001"}),
        ]
        result = self.handler.apply([], rows)
        self.assertEqual(result.records_created, 1)
        self.assertEqual(result.records_failed, 0)
        self.assertTrue(ProductFamily.objects.filter(code="F001").exists())

    def test_apply_create_model(self):
        family = ProductFamily.objects.create(code="F001", name="Family")
        rows = [
            CompareRow(action="CREATE", entity_type="ProductModel",
                       stable_key="M001",
                       current_value=None,
                       incoming_value={"code": "M001", "name": "New Model", "family_code": "F001"},
                       diff={"code": "M001"}),
        ]
        result = self.handler.apply([], rows)
        self.assertEqual(result.records_created, 1)
        model = ProductModel.objects.get(code="M001")
        self.assertEqual(model.family_id, family.id)

    def test_apply_create_variant(self):
        family = ProductFamily.objects.create(code="F001", name="Family")
        model = ProductModel.objects.create(code="M001", name="Model", family=family)
        rows = [
            CompareRow(action="CREATE", entity_type="ProductVariant",
                       stable_key="V001",
                       current_value=None,
                       incoming_value={"code": "V001", "name": "New Variant", "model_code": "M001"},
                       diff={"code": "V001"}),
        ]
        result = self.handler.apply([], rows)
        self.assertEqual(result.records_created, 1)
        variant = ProductVariant.objects.get(code="V001")
        self.assertEqual(variant.model_id, model.id)

    def test_apply_create_part_number(self):
        family = ProductFamily.objects.create(code="F001", name="Family")
        model = ProductModel.objects.create(code="M001", name="Model", family=family)
        rows = [
            CompareRow(action="CREATE", entity_type="PartNumber",
                       stable_key="PN001",
                       current_value=None,
                       incoming_value={
                           "part_number": "PN001", "family_code": "F001", "model_code": "M001",
                           "description": "Test part", "revision": "A", "uom": "EA",
                       },
                       diff={"part_number": "PN001"}),
        ]
        result = self.handler.apply([], rows)
        self.assertEqual(result.records_created, 1)
        part = PartNumber.objects.get(part_number="PN001")
        self.assertEqual(part.family_id, family.id)
        self.assertEqual(part.model_id, model.id)
        self.assertEqual(part.uom, "EA")

    def test_apply_create_material(self):
        rows = [
            CompareRow(action="CREATE", entity_type="Material",
                       stable_key="MAT001",
                       current_value=None,
                       incoming_value={"code": "MAT001", "name": "New Material",
                                      "material_state": "RAW_MATERIAL"},
                       diff={"code": "MAT001"}),
        ]
        result = self.handler.apply([], rows)
        self.assertEqual(result.records_created, 1)
        mat = Material.objects.get(code="MAT001")
        self.assertEqual(mat.material_state, "RAW_MATERIAL")

    # ═══════════════════════════════════════════════════════════════
    #  APPLY — Update
    # ═══════════════════════════════════════════════════════════════

    def test_apply_update_family(self):
        ProductFamily.objects.create(code="F001", name="Old Name")
        rows = [
            CompareRow(action="UPDATE", entity_type="ProductFamily",
                       stable_key="F001",
                       current_value={"code": "F001", "name": "Old Name"},
                       incoming_value={"code": "F001", "name": "Updated Name"},
                       diff={"name": {"from": "Old Name", "to": "Updated Name"}}),
        ]
        result = self.handler.apply([], rows)
        self.assertEqual(result.records_updated, 1)
        family = ProductFamily.objects.get(code="F001")
        self.assertEqual(family.name, "Updated Name")

    def test_apply_update_material(self):
        Material.objects.create(code="MAT001", name="Old Mat")
        rows = [
            CompareRow(action="UPDATE", entity_type="Material",
                       stable_key="MAT001",
                       current_value={"code": "MAT001", "name": "Old Mat"},
                       incoming_value={"code": "MAT001", "name": "Updated Mat"},
                       diff={"name": {"from": "Old Mat", "to": "Updated Mat"}}),
        ]
        result = self.handler.apply([], rows)
        self.assertEqual(result.records_updated, 1)
        mat = Material.objects.get(code="MAT001")
        self.assertEqual(mat.name, "Updated Mat")

    # ═══════════════════════════════════════════════════════════════
    #  APPLY — Error handling
    # ═══════════════════════════════════════════════════════════════

    def test_apply_create_family_duplicate_code(self):
        ProductFamily.objects.create(code="F001", name="Existing")
        rows = [
            CompareRow(action="CREATE", entity_type="ProductFamily",
                       stable_key="F001",
                       current_value=None,
                       incoming_value={"code": "F001", "name": "Duplicate"},
                       diff={"code": "F001"}),
        ]
        result = self.handler.apply([], rows)
        self.assertEqual(result.records_failed, 1)
        self.assertIn("F001", result.error_summary)

    def test_apply_mixed_creates_and_failures(self):
        rows = [
            CompareRow(action="CREATE", entity_type="ProductFamily",
                       stable_key="F001",
                       current_value=None,
                       incoming_value={"code": "F001", "name": "Good Family"},
                       diff={"code": "F001"}),
            CompareRow(action="CREATE", entity_type="ProductFamily",
                       stable_key="F001",  # duplicate key
                       current_value=None,
                       incoming_value={"code": "F001", "name": "Duplicate"},
                       diff={"code": "F001"}),
        ]
        result = self.handler.apply([], rows)
        self.assertEqual(result.records_created, 1)
        self.assertEqual(result.records_failed, 1)

    def test_apply_creates_no_compare_rows(self):
        result = self.handler.apply([], [])
        self.assertEqual(result.records_created, 0)
        self.assertEqual(result.records_updated, 0)
        self.assertEqual(result.records_failed, 0)

    # ═══════════════════════════════════════════════════════════════
    #  APPLY — Auto-resolve parent references
    # ═══════════════════════════════════════════════════════════════

    def test_apply_create_model_auto_creates_family(self):
        """If the family doesn't exist, it gets auto-created."""
        rows = [
            CompareRow(action="CREATE", entity_type="ProductModel",
                       stable_key="M001",
                       current_value=None,
                       incoming_value={"code": "M001", "name": "Model", "family_code": "AUTO_FAM"},
                       diff={"code": "M001"}),
        ]
        result = self.handler.apply([], rows)
        self.assertEqual(result.records_created, 1)
        self.assertTrue(ProductFamily.objects.filter(code="AUTO_FAM").exists())
        self.assertTrue(ProductModel.objects.filter(code="M001").exists())

    def test_apply_create_part_number_auto_resolves_hierarchy(self):
        """Part number auto-creates family, model, and variant."""
        rows = [
            CompareRow(action="CREATE", entity_type="PartNumber",
                       stable_key="PN001",
                       current_value=None,
                       incoming_value={
                           "part_number": "PN001",
                           "family_code": "FAM", "model_code": "MOD", "variant_code": "VAR",
                           "description": "Auto-resolved", "revision": "1", "uom": "EA",
                       },
                       diff={"part_number": "PN001"}),
        ]
        result = self.handler.apply([], rows)
        self.assertEqual(result.records_created, 1)
        self.assertTrue(ProductFamily.objects.filter(code="FAM").exists())
        self.assertTrue(ProductModel.objects.filter(code="MOD").exists())
        self.assertTrue(ProductVariant.objects.filter(code="VAR").exists())
        self.assertTrue(PartNumber.objects.filter(part_number="PN001").exists())
