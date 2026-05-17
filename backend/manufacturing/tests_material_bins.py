from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.test import TestCase

from api.mutations.manufacturing import ManufacturingMutation
from api.types.manufacturing import MaterialBinInput
from manufacturing.domain.material_bin_service import MaterialBinService, MaterialBinServiceError
from manufacturing.domain.routing_service import RoutingService, RoutingValidationError
from manufacturing.models import (
    Company,
    Department,
    Material,
    MaterialBin,
    MaterialBinType,
    MaterialMovementRule,
    Plant,
    ProductionLine,
    ResourceGroup,
    Routing,
    RoutingStep,
)


class MaterialBinDomainTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(code="CO-BIN", name="Company Bins")
        self.plant = Plant.objects.create(company=self.company, code="PL-BIN", name="Plant Bins")
        self.other_plant = Plant.objects.create(company=self.company, code="PL-OTHER", name="Other Plant")
        self.line = ProductionLine.objects.create(plant=self.plant, code="LN-BIN", name="Line Bins")
        self.department = Department.objects.create(plant=self.plant, code="DE-BIN", name="Department Bins")
        self.other_department = Department.objects.create(plant=self.other_plant, code="DE-OTHER", name="Other Department")
        self.resource_group = ResourceGroup.objects.create(department=self.department, code="RG-BIN", name="Resource Group Bins")
        self.other_resource_group = ResourceGroup.objects.create(department=self.other_department, code="RG-OTHER", name="Other RG")
        self.material = Material.objects.create(code="MAT-BIN", name="Material Bins")

    def test_valid_resource_group_input_output_bins(self):
        input_bin = MaterialBinService.create({
            "plant_id": str(self.plant.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "IN-1",
            "name": "Input Bin",
            "bin_type": MaterialBinType.INPUT,
            "material_id": str(self.material.id),
            "capacity": 10,
        })
        output_bin = MaterialBinService.create({
            "plant_id": str(self.plant.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "OUT-1",
            "name": "Output Bin",
            "bin_type": MaterialBinType.OUTPUT,
            "material_id": str(self.material.id),
            "capacity": 10,
        })

        self.assertEqual(input_bin.resource_group, self.resource_group)
        self.assertEqual(output_bin.resource_group, self.resource_group)

    def test_invalid_cross_plant_resource_group_bin_rejected(self):
        with self.assertRaises(MaterialBinServiceError):
            MaterialBinService.create({
                "plant_id": str(self.plant.id),
                "resource_group_id": str(self.other_resource_group.id),
                "code": "BAD-1",
                "name": "Bad Bin",
                "bin_type": MaterialBinType.INPUT,
            })

    def test_model_rejects_negative_capacity(self):
        with self.assertRaises(ValidationError):
            MaterialBin.objects.create(
                plant=self.plant,
                resource_group=self.resource_group,
                code="NEG-1",
                name="Negative Capacity",
                bin_type=MaterialBinType.INPUT,
                capacity=-1,
            )

    def test_invalid_source_destination_movement_rejected(self):
        routing = Routing.objects.create(production_line=self.line, version="1.0")
        step = RoutingStep.objects.create(
            routing=routing,
            sequence=1,
            department=self.department,
            resource_group=self.resource_group,
            cycle_time_sec=10,
        )
        source = MaterialBin.objects.create(
            plant=self.plant,
            resource_group=self.resource_group,
            code="SRC-1",
            name="Source",
            bin_type=MaterialBinType.INPUT,
        )
        bad_destination = MaterialBin.objects.create(
            plant=self.other_plant,
            resource_group=self.other_resource_group,
            code="DST-1",
            name="Destination",
            bin_type=MaterialBinType.OUTPUT,
        )

        with self.assertRaises(RoutingValidationError):
            RoutingService._save_step_material_flow(step, {
                "material_inputs": [{"material_id": str(self.material.id), "quantity": 1, "bin_id": str(source.id)}],
                "material_outputs": [{"material_id": str(self.material.id), "quantity": 1, "bin_id": str(bad_destination.id)}],
                "movement_rule": {"source_bin_id": str(source.id), "destination_bin_id": str(bad_destination.id)},
            })

    def test_validate_routing_requires_movement_bins(self):
        routing = Routing.objects.create(production_line=self.line, version="1.0")
        step = RoutingStep.objects.create(
            routing=routing,
            sequence=1,
            department=self.department,
            resource_group=self.resource_group,
            cycle_time_sec=10,
        )
        MaterialMovementRule.objects.create(routing_step=step)

        codes = {error["code"] for error in RoutingService.validate_routing(str(routing.id))}
        self.assertIn("MISSING_MOVEMENT_BINS", codes)


class MaterialBinGraphQLDelegationTests(TestCase):
    def test_create_material_bin_delegates_to_service(self):
        input_obj = MaterialBinInput(
            plant_id="plant-1",
            resource_group_id="rg-1",
            code="BIN-1",
            name="Bin 1",
            bin_type="INPUT",
        )
        with patch.object(MaterialBinService, "create") as create:
            create.side_effect = MaterialBinServiceError("plantId", "NOT_FOUND", "missing")
            result = ManufacturingMutation().create_material_bin(input_obj)

        self.assertFalse(result.ok)
        create.assert_called_once()
