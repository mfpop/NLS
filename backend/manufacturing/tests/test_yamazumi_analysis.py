from datetime import datetime
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from manufacturing.domain.yamazumi_analysis import YamazumiAnalysisInput, YamazumiAnalysisService
from manufacturing.models import (
    Company,
    Department,
    Plant,
    ProductionLine,
    Resource,
    ResourceGroup,
    Routing,
    RoutingStep,
)


def capacity_result(scope_type="PRODUCTION_LINE", scope_id="1", effective=60):
    return {
        "scope_type": scope_type,
        "scope_id": scope_id,
        "available_minutes": effective,
        "theoretical_capacity": effective,
        "effective_capacity": effective,
        "capacity_uom": "minutes",
        "from_datetime": timezone.make_aware(datetime(2025, 1, 1)),
        "to_datetime": timezone.make_aware(datetime(2025, 1, 2)),
    }


class YamazumiAnalysisDelegationTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(code="YAM-CO", name="Yamazumi Company")
        self.plant = Plant.objects.create(company=self.company, code="YAM-PL", name="Yamazumi Plant")
        self.line = ProductionLine.objects.create(plant=self.plant, code="YAM-LN", name="Yamazumi Line")
        self.department = Department.objects.create(plant=self.plant, code="YAM-DP", name="Yamazumi Department")
        self.resource_group = ResourceGroup.objects.create(department=self.department, code="YAM-RG", name="Yamazumi RG")
        self.resource = Resource.objects.create(resource_group=self.resource_group, code="YAM-R", name="Yamazumi Resource")
        self.routing = Routing.objects.create(production_line=self.line, version="1.0")
        self.step = RoutingStep.objects.create(
            routing=self.routing,
            sequence=1,
            department=self.department,
            resource_group=self.resource_group,
            resource=self.resource,
            cycle_time_sec=30,
            setup_time_sec=0,
            changeover_time_sec=0,
            required_operators=1,
        )

    def analyze(self):
        return YamazumiAnalysisService.analyze(YamazumiAnalysisInput(
            routing=self.routing,
            planned_quantity=60,
            available_time_min=999,
            break_time_min=100,
            downtime_min=100,
            operators=99,
        ))

    @patch("manufacturing.domain.yamazumi_analysis.CapacityService.calculate_production_line_capacity")
    def test_yamazumi_delegates_resource_capacity_to_capacity_service(self, line_capacity):
        self.routing.production_line = None
        self.routing.production_line_id = None
        line_capacity.return_value = capacity_result()
        with patch("manufacturing.domain.yamazumi_analysis.CapacityService.calculate_resource_capacity") as resource_capacity:
            resource_capacity.return_value = capacity_result("RESOURCE", str(self.resource.id), 60)
            self.analyze()
            resource_capacity.assert_called_once()

    @patch("manufacturing.domain.yamazumi_analysis.CapacityService.calculate_production_line_capacity")
    def test_yamazumi_delegates_resource_group_capacity_to_capacity_service(self, line_capacity):
        self.routing.production_line = None
        self.routing.production_line_id = None
        self.step.resource = None
        self.step.resource_id = None
        self.step.save()
        line_capacity.return_value = capacity_result()
        with patch("manufacturing.domain.yamazumi_analysis.CapacityService.calculate_resource_group_capacity") as group_capacity:
            group_capacity.return_value = capacity_result("RESOURCE_GROUP", str(self.resource_group.id), 60)
            self.analyze()
            group_capacity.assert_called_once()

    def test_yamazumi_does_not_query_work_schedule(self):
        with patch("manufacturing.domain.yamazumi_analysis.CapacityService.calculate_production_line_capacity") as line_capacity:
            line_capacity.return_value = capacity_result(effective=60)
            with patch("manufacturing.models.capacity.WorkSchedule.objects") as schedules:
                self.analyze()
                schedules.filter.assert_not_called()

    def test_yamazumi_does_not_query_work_shift(self):
        with patch("manufacturing.domain.yamazumi_analysis.CapacityService.calculate_production_line_capacity") as line_capacity:
            line_capacity.return_value = capacity_result(effective=60)
            with patch("manufacturing.models.capacity.WorkShift.objects") as shifts:
                self.analyze()
                shifts.filter.assert_not_called()

    def test_yamazumi_preserves_existing_output_contract(self):
        with patch("manufacturing.domain.yamazumi_analysis.CapacityService.calculate_production_line_capacity") as line_capacity:
            line_capacity.return_value = capacity_result(effective=60)
            result = self.analyze()
        for key in [
            "ok", "message", "routing_id", "routing_status", "routing_version",
            "production_line_id", "product_model_id", "planned_quantity",
            "net_available_time_sec", "takt_time_sec", "total_work_content_sec",
            "bottleneck_step_name", "balance_loss_percent", "operators_required",
            "overloaded_resources", "steps",
        ]:
            self.assertIn(key, result)
        self.assertEqual(result["capacity_source"], "CapacityService")

    def test_yamazumi_uses_capacity_service_effective_capacity(self):
        with patch("manufacturing.domain.yamazumi_analysis.CapacityService.calculate_production_line_capacity") as line_capacity:
            line_capacity.return_value = capacity_result(effective=30)
            result = self.analyze()
        self.assertEqual(result["net_available_time_sec"], 1800)
        self.assertEqual(result["takt_time_sec"], 30)

    def test_yamazumi_marks_over_capacity_from_service_result(self):
        with patch("manufacturing.domain.yamazumi_analysis.CapacityService.calculate_production_line_capacity") as line_capacity:
            line_capacity.return_value = capacity_result(effective=15)
            result = self.analyze()
        self.assertTrue(result["steps"][0]["is_overloaded"])
        self.assertIn("Yamazumi Resource", result["overloaded_resources"])

    def test_yamazumi_no_duplicate_capacity_formula(self):
        with patch("manufacturing.domain.yamazumi_analysis.CapacityService.calculate_production_line_capacity") as line_capacity:
            line_capacity.return_value = capacity_result(effective=60)
            result = self.analyze()
        self.assertEqual(result["net_available_time_sec"], 3600)
        self.assertNotEqual(result["net_available_time_sec"], (999 - 100 - 100) * 60)
