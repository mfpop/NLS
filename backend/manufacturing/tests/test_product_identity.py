from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.contrib.auth.models import User

from api.mutations.manufacturing_product_master import ManufacturingProductMasterMutation
from api.types.manufacturing import PartNumberInput
from manufacturing.domain.product_identity_service import ProductIdentityError, ProductIdentityService
from manufacturing.models import PartNumber, ProductFamily, ProductModel, ProductVariant


class ProductIdentityServiceTests(TestCase):
    def setUp(self):
        self.family = ProductIdentityService.create_family({
            "code": "LIFT", "name": "Liftgates", "description": "", "status": "ACTIVE",
        })
        self.model = ProductIdentityService.create_model({
            "family_id": str(self.family.id), "code": "GPT", "name": "GPT",
            "description": "", "status": "ACTIVE",
        })
        self.variant = ProductIdentityService.create_variant({
            "model_id": str(self.model.id), "code": "AL", "name": "Aluminum",
        })

    # ── New createPartNumber behavior: writes to ProductVariant.part_number ──

    def test_create_part_number_with_variant_updates_variant(self):
        part = ProductIdentityService.create_part_number({
            "family_id": str(self.family.id), "model_id": str(self.model.id),
            "variant_id": str(self.variant.id), "part_number": "GPT-1000-AL",
        })
        self.assertEqual(part.part_number, "GPT-1000-AL")
        self.assertEqual(part.variant_id, self.variant.id)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.part_number, "GPT-1000-AL")

    def test_create_part_number_does_not_create_partnumber_row(self):
        before = PartNumber.objects.count()
        ProductIdentityService.create_part_number({
            "family_id": str(self.family.id), "model_id": str(self.model.id),
            "variant_id": str(self.variant.id), "part_number": "NO-ROW",
        })
        self.assertEqual(PartNumber.objects.count(), before)

    def test_create_part_number_without_variant_is_rejected(self):
        with self.assertRaises(ProductIdentityError) as ctx:
            ProductIdentityService.create_part_number({
                "family_id": str(self.family.id), "model_id": str(self.model.id),
                "variant_id": None, "part_number": "REJECTED",
            })
        self.assertEqual(ctx.exception.code, "REQUIRED")

    def test_create_part_number_without_variant_id_key_is_rejected(self):
        with self.assertRaises(ProductIdentityError) as ctx:
            ProductIdentityService.create_part_number({
                "family_id": str(self.family.id), "model_id": str(self.model.id),
                "part_number": "REJECTED",
            })
        self.assertEqual(ctx.exception.code, "REQUIRED")

    def test_reject_variant_from_different_model(self):
        other_model = ProductIdentityService.create_model({
            "family_id": str(self.family.id), "code": "BMR", "name": "BMR",
        })
        bad_variant = ProductIdentityService.create_variant({
            "model_id": str(other_model.id), "code": "X", "name": "Other",
        })
        with self.assertRaises(ProductIdentityError) as ctx:
            ProductIdentityService.create_part_number({
                "family_id": str(self.family.id), "model_id": str(self.model.id),
                "variant_id": str(bad_variant.id), "part_number": "BAD-VAR",
            })
        self.assertEqual(ctx.exception.code, "VARIANT_MODEL_MISMATCH")

    def test_reject_model_from_different_family(self):
        other_family = ProductIdentityService.create_family({"code": "RAIL", "name": "Rail"})
        with self.assertRaises(ProductIdentityError) as ctx:
            ProductIdentityService.create_part_number({
                "family_id": str(other_family.id), "model_id": str(self.model.id),
                "variant_id": str(self.variant.id), "part_number": "BAD-FAM",
            })
        self.assertEqual(ctx.exception.code, "FAMILY_MODEL_MISMATCH")

    def test_reject_duplicate_product_variant_part_number(self):
        ProductIdentityService.create_part_number({
            "family_id": str(self.family.id), "model_id": str(self.model.id),
            "variant_id": str(self.variant.id), "part_number": "UNIQUE-PN",
        })
        v2 = ProductIdentityService.create_variant({
            "model_id": str(self.model.id), "code": "AL2", "name": "Aluminum 2",
        })
        with self.assertRaises(ProductIdentityError) as ctx:
            ProductIdentityService.create_part_number({
                "family_id": str(self.family.id), "model_id": str(self.model.id),
                "variant_id": str(v2.id), "part_number": "UNIQUE-PN",
            })
        self.assertEqual(ctx.exception.code, "DUPLICATE")

    # ── Existing variant part_number tests ──

    def test_create_variant_with_part_number(self):
        v = ProductIdentityService.create_variant({
            "model_id": str(self.model.id), "code": "PN", "name": "With PN",
            "part_number": "VAR-001",
        })
        self.assertEqual(v.part_number, "VAR-001")

    def test_create_variant_part_number_optional(self):
        v = ProductIdentityService.create_variant({
            "model_id": str(self.model.id), "code": "NOPN", "name": "No PN",
        })
        self.assertIsNone(v.part_number)

    def test_update_variant_part_number(self):
        self.assertIsNone(self.variant.part_number)
        updated = ProductIdentityService.update_variant(str(self.variant.id), {"part_number": "VAR-002"})
        self.assertEqual(updated.part_number, "VAR-002")

    def test_update_variant_clear_part_number(self):
        v = ProductIdentityService.create_variant({
            "model_id": str(self.model.id), "code": "CLR", "name": "Clear Test",
            "part_number": "VAR-003",
        })
        updated = ProductIdentityService.update_variant(str(v.id), {"part_number": None})
        self.assertIsNone(updated.part_number)

    # ── Legacy compatibility paths ──

    def test_archive_compatibility_safe_when_partnumber_missing(self):
        with self.assertRaises(ProductIdentityError) as ctx:
            ProductIdentityService.archive_part_number("999999")
        self.assertEqual(ctx.exception.code, "NOT_FOUND")

    def test_legacy_partnumber_update_variant_falls_through_when_row_missing(self):
        with self.assertRaises(ProductIdentityError) as ctx:
            ProductIdentityService.update_part_number("999999", {"part_number": "NOPE"})
        self.assertEqual(ctx.exception.code, "NOT_FOUND")

    def test_partnumber_table_remains_empty_after_create(self):
        ProductIdentityService.create_part_number({
            "family_id": str(self.family.id), "model_id": str(self.model.id),
            "variant_id": str(self.variant.id), "part_number": "NO-ROW-2",
        })
        self.assertEqual(PartNumber.objects.count(), 0)


class ProductIdentityGraphQLTests(TestCase):
    def _mock_info(self):
        info = MagicMock()
        info.context.user = User.objects.create_user(username="testuser", password="testpass", is_staff=True)
        return info

    @patch("api.mutations.manufacturing_product_master.ensure_access")
    def test_create_part_number_mutation_delegates_to_service(self, _mock_perm):
        with patch.object(ProductIdentityService, "create_part_number") as mock:
            family = ProductFamily(id=1, code="F", name="Family")
            model = ProductModel(id=2, family=family, code="M", name="Model")
            mock.return_value = PartNumber(
                id=0, family=family, model=model, variant=None,
                part_number="PN-1", description="Part", revision="",
                uom="EA", status="ACTIVE", is_active=True,
            )
            result = ManufacturingProductMasterMutation().create_part_number(
                self._mock_info(), PartNumberInput(
                    family_id="1", model_id="2", variant_id="3", part_number="PN-1",
                ),
            )
            self.assertTrue(result.ok)
            mock.assert_called_once()

    def test_create_part_number_mutation_name_still_exists(self):
        self.assertTrue(hasattr(ManufacturingProductMasterMutation, "create_part_number"))

    def test_update_part_number_mutation_name_still_exists(self):
        self.assertTrue(hasattr(ManufacturingProductMasterMutation, "update_part_number"))

    def test_archive_part_number_mutation_name_still_exists(self):
        self.assertTrue(hasattr(ManufacturingProductMasterMutation, "archive_part_number"))
