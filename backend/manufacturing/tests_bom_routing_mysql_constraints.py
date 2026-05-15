from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from manufacturing.domain.routing_service import RoutingService
from manufacturing.models import (
    BOM,
    Company,
    Plant,
    ProductModel,
    ProductionLine,
    Routing,
    RoutingStatus,
)


class BOMRoutingMySQLConstraintTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(code="CO-BR", name="Company BOM Routing")
        self.plant = Plant.objects.create(company=self.company, code="PL-BR", name="Plant BOM Routing")
        self.line = ProductionLine.objects.create(plant=self.plant, code="LN-BR", name="Line BOM Routing")
        self.model = ProductModel.objects.create(code="PM-BR", name="Product Model BOM Routing")

    def test_check_has_no_mysql_conditional_unique_warnings(self):
        call_command("check", fail_level="WARNING", stdout=StringIO(), stderr=StringIO())

    def test_service_keeps_single_active_bom_per_model(self):
        first = RoutingService.create_bom({
            "product_model_id": str(self.model.id),
            "version": "1.0",
            "status": RoutingStatus.ACTIVE,
        })
        second = RoutingService.create_bom({
            "product_model_id": str(self.model.id),
            "version": "2.0",
            "status": RoutingStatus.ACTIVE,
        })
        first.refresh_from_db()
        second.refresh_from_db()

        self.assertEqual(first.status, RoutingStatus.DRAFT)
        self.assertEqual(second.status, RoutingStatus.ACTIVE)
        self.assertEqual(
            BOM.objects.filter(product_model=self.model, status=RoutingStatus.ACTIVE).count(),
            1,
        )

    def test_service_keeps_single_active_routing_per_line_model_scope(self):
        first = RoutingService.create_routing({
            "production_line_id": str(self.line.id),
            "product_model_id": str(self.model.id),
            "version": "1.0",
            "status": RoutingStatus.ACTIVE,
        })
        second = RoutingService.create_routing({
            "production_line_id": str(self.line.id),
            "product_model_id": str(self.model.id),
            "version": "2.0",
            "status": RoutingStatus.ACTIVE,
        })
        first.refresh_from_db()
        second.refresh_from_db()

        self.assertEqual(first.status, RoutingStatus.DRAFT)
        self.assertEqual(second.status, RoutingStatus.ACTIVE)
        self.assertEqual(
            Routing.objects.filter(
                production_line=self.line,
                product_model=self.model,
                status=RoutingStatus.ACTIVE,
            ).count(),
            1,
        )

    def test_routing_active_save_locks_sibling_rows(self):
        with patch.object(Routing.objects, "select_for_update", wraps=Routing.objects.select_for_update) as locked:
            RoutingService.create_routing({
                "production_line_id": str(self.line.id),
                "product_model_id": str(self.model.id),
                "version": "1.0",
                "status": RoutingStatus.ACTIVE,
            })

        self.assertTrue(locked.called)

    def test_bom_activation_locks_sibling_rows(self):
        bom = BOM.objects.create(
            product_model=self.model,
            version="1.0",
            status=RoutingStatus.DRAFT,
        )
        with patch.object(BOM.objects, "select_for_update", wraps=BOM.objects.select_for_update) as locked:
            RoutingService.activate_bom(str(bom.id))

        self.assertTrue(locked.called)
