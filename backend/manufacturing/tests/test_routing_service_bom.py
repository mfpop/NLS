"""Tests for BOM/Routing ProductVariant path (PartNumber deprecation step 6)."""

from unittest.mock import patch

from django.test import TestCase

from manufacturing.domain.product_identity_service import ProductIdentityService
from manufacturing.domain.routing_service import RoutingService, RoutingValidationError
from manufacturing.models import BOM, PartNumber, ProductFamily, ProductModel, ProductVariant, Routing, Company, Plant, ProductionLine


class RoutingServiceProductVariantPathTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(
            code="C1", name="Test Company",
            default_timezone="UTC", default_language="en",
        )
        self.family = ProductIdentityService.create_family({
            "code": "LIFT", "name": "Liftgates",
        })
        self.model = ProductIdentityService.create_model({
            "family_id": str(self.family.id), "code": "GPT", "name": "GPT",
        })
        self.variant = ProductIdentityService.create_variant({
            "model_id": str(self.model.id), "code": "AL", "name": "Aluminum",
            "part_number": "GPT-1000-AL",
        })

    # ── BOM create with product_variant_id ──

    def test_create_bom_with_product_variant_id_succeeds(self):
        bom = RoutingService.create_bom({
            "product_variant_id": str(self.variant.id),
            "version": "1.0",
            "status": "DRAFT",
        })
        self.assertIsNotNone(bom)
        self.assertEqual(bom.product_model_id, self.model.id)
        self.assertIsNone(bom.part_number_id)

    def test_create_bom_does_not_require_part_number_id(self):
        bom = RoutingService.create_bom({
            "product_variant_id": str(self.variant.id),
        })
        self.assertIsNotNone(bom)
        self.assertEqual(bom.product_model_id, self.model.id)

    def test_create_bom_derives_model_from_variant(self):
        bom = RoutingService.create_bom({
            "product_variant_id": str(self.variant.id),
        })
        self.assertEqual(bom.product_model.id, self.model.id)
        self.assertEqual(bom.product_model.code, "GPT")

    # ── BOM create with legacy part_number_id ──

    def test_create_bom_with_legacy_part_number_row(self):
        legacy = PartNumber.objects.create(
            family=self.family, model=self.model, variant=self.variant,
            part_number="LEGACY-001",
        )
        bom = RoutingService.create_bom({
            "part_number_id": str(legacy.id),
        })
        self.assertIsNotNone(bom)
        self.assertEqual(bom.part_number_id, legacy.id)

    def test_create_bom_with_missing_legacy_part_number_returns_clear_error(self):
        with self.assertRaises(RoutingValidationError) as ctx:
            RoutingService.create_bom({
                "part_number_id": "999999",
            })
        self.assertIn("Use productVariantId instead", str(ctx.exception))
        self.assertEqual(ctx.exception.field, "partNumberId")

    # ── BOM update with product_variant_id ──

    def test_update_bom_with_product_variant_id(self):
        bom = RoutingService.create_bom({
            "product_variant_id": str(self.variant.id),
        })
        v2 = ProductIdentityService.create_variant({
            "model_id": str(self.model.id), "code": "ST", "name": "Steel",
        })
        updated = RoutingService.update_bom(str(bom.id), {
            "product_variant_id": str(v2.id),
        })
        self.assertEqual(updated.product_model_id, v2.model_id)
        self.assertIsNone(updated.part_number_id)

    def test_update_bom_clears_part_number_when_variant_set(self):
        legacy = PartNumber.objects.create(
            family=self.family, model=self.model, variant=self.variant,
            part_number="LEGACY-002",
        )
        bom = RoutingService.create_bom({
            "part_number_id": str(legacy.id),
        })
        self.assertIsNotNone(bom.part_number_id)
        updated = RoutingService.update_bom(str(bom.id), {
            "product_variant_id": str(self.variant.id),
        })
        self.assertIsNone(updated.part_number_id)
        self.assertEqual(updated.product_model_id, self.model.id)

    def _make_line(self, code: str = "L1") -> ProductionLine:
        plant = Plant.objects.create(company=self.company, code=f"PL_{code}", name=f"Plant {code}")
        return ProductionLine.objects.create(plant=plant, code=code, name=f"Line {code}")

    # ── Routing create with product_variant_id ──

    def test_create_routing_with_product_variant_id_succeeds(self):
        line = self._make_line()
        routing = RoutingService.create_routing({
            "production_line_id": str(line.id),
            "product_variant_id": str(self.variant.id),
        })
        self.assertIsNotNone(routing)
        self.assertEqual(routing.product_model_id, self.model.id)
        self.assertIsNone(routing.part_number_id)

    def test_create_routing_does_not_require_part_number_id(self):
        line = self._make_line("L2")
        routing = RoutingService.create_routing({
            "production_line_id": str(line.id),
            "product_variant_id": str(self.variant.id),
        })
        self.assertIsNotNone(routing)
        self.assertIsNone(routing.part_number_id)

    def test_create_routing_derives_model_from_variant(self):
        line = self._make_line("L3")
        routing = RoutingService.create_routing({
            "production_line_id": str(line.id),
            "product_variant_id": str(self.variant.id),
        })
        self.assertEqual(routing.product_model.id, self.model.id)

    # ── Routing create with legacy part_number_id ──

    def test_create_routing_with_legacy_part_number_row(self):
        line = self._make_line("L4")
        legacy = PartNumber.objects.create(
            family=self.family, model=self.model, variant=self.variant,
            part_number="LEGACY-003",
        )
        routing = RoutingService.create_routing({
            "production_line_id": str(line.id),
            "part_number_id": str(legacy.id),
        })
        self.assertIsNotNone(routing)
        self.assertEqual(routing.part_number_id, legacy.id)

    def test_create_routing_with_missing_legacy_part_number_returns_clear_error(self):
        line = self._make_line("L5")
        with self.assertRaises(RoutingValidationError) as ctx:
            RoutingService.create_routing({
                "production_line_id": str(line.id),
                "part_number_id": "999999",
            })
        self.assertIn("Use productVariantId instead", str(ctx.exception))
        self.assertEqual(ctx.exception.field, "partNumberId")

    # ── Routing update with product_variant_id ──

    def test_update_routing_with_product_variant_id(self):
        line = self._make_line("L6")
        routing = RoutingService.create_routing({
            "production_line_id": str(line.id),
            "product_variant_id": str(self.variant.id),
        })
        v2 = ProductIdentityService.create_variant({
            "model_id": str(self.model.id), "code": "ST2", "name": "Steel 2",
        })
        updated = RoutingService.update_routing(str(routing.id), {
            "product_variant_id": str(v2.id),
        })
        self.assertEqual(updated.product_model_id, v2.model_id)
        self.assertIsNone(updated.part_number_id)

    # ── PartNumber table remains empty for new paths ──

    def test_partnumber_table_remains_empty_after_bom_create_with_variant(self):
        before = PartNumber.objects.count()
        RoutingService.create_bom({
            "product_variant_id": str(self.variant.id),
        })
        self.assertEqual(PartNumber.objects.count(), before)

    def test_partnumber_table_remains_empty_after_routing_create_with_variant(self):
        line = self._make_line("L7")
        before = PartNumber.objects.count()
        RoutingService.create_routing({
            "production_line_id": str(line.id),
            "product_variant_id": str(self.variant.id),
        })
        self.assertEqual(PartNumber.objects.count(), before)

    # ── Missing product_variant_id returns clear error ──

    def test_create_bom_with_invalid_variant_id_returns_error(self):
        with self.assertRaises(RoutingValidationError) as ctx:
            RoutingService.create_bom({
                "product_variant_id": "999999",
            })
        self.assertIn("not found", str(ctx.exception))
        self.assertEqual(ctx.exception.field, "productVariantId")

    def test_create_routing_with_invalid_variant_id_returns_error(self):
        line = self._make_line("L8")
        with self.assertRaises(RoutingValidationError) as ctx:
            RoutingService.create_routing({
                "production_line_id": str(line.id),
                "product_variant_id": "999999",
            })
        self.assertIn("not found", str(ctx.exception))
        self.assertEqual(ctx.exception.field, "productVariantId")

    # ── GraphQL input compatibility ──

    def test_bom_input_accepts_product_variant_id(self):
        from api.types.manufacturing import BomInput
        inp = BomInput(product_variant_id=str(self.variant.id))
        self.assertEqual(inp.product_variant_id, str(self.variant.id))
        self.assertIsNone(inp.part_number_id)

    def test_routing_input_accepts_product_variant_id(self):
        from api.types.manufacturing import RoutingInput
        inp = RoutingInput(
            production_line_id="1",
            product_variant_id=str(self.variant.id),
        )
        self.assertEqual(inp.product_variant_id, str(self.variant.id))
        self.assertIsNone(inp.part_number_id)

    def test_save_routing_input_accepts_product_variant_id(self):
        from api.types.manufacturing import SaveRoutingInput
        inp = SaveRoutingInput(
            production_line_id="1",
            product_variant_id=str(self.variant.id),
            steps=[],
        )
        self.assertEqual(inp.product_variant_id, str(self.variant.id))
