from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.test import TestCase

from api.mutations.manufacturing import ManufacturingMutation
from api.types.manufacturing import PartNumberInput
from manufacturing.domain.product_identity_service import ProductIdentityError, ProductIdentityService
from manufacturing.models import PartNumber, ProductFamily, ProductModel, ProductVariant


class ProductIdentityServiceTests(TestCase):
    def setUp(self):
        self.family = ProductIdentityService.create_family({
            "code": "LIFT",
            "name": "Liftgates",
            "description": "",
            "status": "ACTIVE",
        })
        self.model = ProductIdentityService.create_model({
            "family_id": str(self.family.id),
            "code": "GPT",
            "name": "GPT",
            "description": "",
            "status": "ACTIVE",
        })

    def test_create_part_number_without_variant(self):
        part = ProductIdentityService.create_part_number({
            "family_id": str(self.family.id),
            "model_id": str(self.model.id),
            "variant_id": None,
            "part_number": "GPT-1000",
            "description": "Base gate",
        })
        self.assertEqual(part.part_number, "GPT-1000")
        self.assertIsNone(part.variant_id)

    def test_create_part_number_with_variant(self):
        variant = ProductIdentityService.create_variant({
            "model_id": str(self.model.id),
            "code": "AL",
            "name": "Aluminum",
        })
        part = ProductIdentityService.create_part_number({
            "family_id": str(self.family.id),
            "model_id": str(self.model.id),
            "variant_id": str(variant.id),
            "part_number": "GPT-1000-AL",
        })
        self.assertEqual(part.variant_id, variant.id)

    def test_reject_variant_from_different_model(self):
        other_model = ProductIdentityService.create_model({
            "family_id": str(self.family.id),
            "code": "BMR",
            "name": "BMR",
        })
        variant = ProductIdentityService.create_variant({
            "model_id": str(other_model.id),
            "code": "X",
            "name": "Other",
        })
        with self.assertRaises(ProductIdentityError) as ctx:
            ProductIdentityService.create_part_number({
                "family_id": str(self.family.id),
                "model_id": str(self.model.id),
                "variant_id": str(variant.id),
                "part_number": "BAD-VAR",
            })
        self.assertEqual(ctx.exception.code, "VARIANT_MODEL_MISMATCH")

    def test_reject_model_from_different_family(self):
        other_family = ProductIdentityService.create_family({"code": "RAIL", "name": "Rail"})
        with self.assertRaises(ProductIdentityError) as ctx:
            ProductIdentityService.create_part_number({
                "family_id": str(other_family.id),
                "model_id": str(self.model.id),
                "part_number": "BAD-FAM",
            })
        self.assertEqual(ctx.exception.code, "FAMILY_MODEL_MISMATCH")

    def test_enforce_unique_part_number(self):
        ProductIdentityService.create_part_number({
            "family_id": str(self.family.id),
            "model_id": str(self.model.id),
            "part_number": "GPT-1000",
        })
        with self.assertRaises(ValidationError):
            ProductIdentityService.create_part_number({
                "family_id": str(self.family.id),
                "model_id": str(self.model.id),
                "part_number": "GPT-1000",
            })

    def test_archive_part_number_marks_inactive(self):
        part = ProductIdentityService.create_part_number({
            "family_id": str(self.family.id),
            "model_id": str(self.model.id),
            "part_number": "GPT-1000",
        })
        archived = ProductIdentityService.archive_part_number(str(part.id))
        self.assertFalse(archived.is_active)
        self.assertEqual(archived.status, "ARCHIVED")


class ProductIdentityGraphQLTests(TestCase):
    def test_create_part_number_mutation_delegates_to_service(self):
        with patch.object(ProductIdentityService, "create_part_number") as mock:
            family = ProductFamily(id=1, code="F", name="Family")
            model = ProductModel(id=2, family=family, code="M", name="Model")
            mock.return_value = PartNumber(
                id=3,
                family=family,
                model=model,
                part_number="PN-1",
                description="Part",
                revision="",
                uom="EA",
                status="ACTIVE",
                is_active=True,
            )
            result = ManufacturingMutation().create_part_number(PartNumberInput(
                family_id="1",
                model_id="2",
                variant_id=None,
                part_number="PN-1",
            ))
            self.assertTrue(result.ok)
            mock.assert_called_once()
