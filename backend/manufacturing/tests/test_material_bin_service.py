from django.core.exceptions import ValidationError
from django.test import TestCase
from django.db import IntegrityError

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
    Warehouse,
    RoutingStatus,
)


class MaterialBinDomainTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(code="CO-BIN", name="Company Bins")
        self.plant = Plant.objects.create(company=self.company, code="PL-BIN", name="Plant Bins")
        self.other_plant = Plant.objects.create(company=self.company, code="PL-OTHER", name="Other Plant")
        self.line = ProductionLine.objects.create(plant=self.plant, code="LN-BIN", name="Line Bins")
        self.other_line = ProductionLine.objects.create(plant=self.other_plant, code="LN-OTHER", name="Other Line")
        self.department = Department.objects.create(plant=self.plant, code="DE-BIN", name="Department Bins")
        self.other_department = Department.objects.create(plant=self.other_plant, code="DE-OTHER", name="Other Department")
        self.resource_group = ResourceGroup.objects.create(department=self.department, code="RG-BIN", name="Resource Group Bins")
        self.other_resource_group = ResourceGroup.objects.create(department=self.other_department, code="RG-OTHER", name="Other RG")
        self.material = Material.objects.create(code="MAT-BIN", name="Material Bins")
        # Create warehouse records for tests that need them
        self.warehouse = Warehouse.objects.create(plant=self.plant, code="WH-MAIN", name="Main Warehouse")
        self.other_warehouse = Warehouse.objects.create(plant=self.other_plant, code="WH-OTHER", name="Other Warehouse")

    def _active_routing_step_with_bins(self, source_bin, dest_bin):
        """Helper: create a DRAFT routing with a step referencing given bins."""
        routing = Routing.objects.create(production_line=self.line, version="1.0", status=RoutingStatus.DRAFT)
        step = RoutingStep.objects.create(
            routing=routing, sequence=1, department=self.department,
            resource_group=self.resource_group, cycle_time_sec=10,
        )
        MaterialMovementRule.objects.create(
            routing_step=step, source_bin=source_bin, destination_bin=dest_bin,
        )
        return routing, step

    # ── Original tests (adapted for Warehouse FK) ──

    def test_valid_resource_group_input_output_bins(self):
        input_bin = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "IN-1",
            "name": "Input Bin",
            "bin_type": MaterialBinType.INPUT,
            "material_id": str(self.material.id),
            "capacity": 10,
        })
        output_bin = MaterialBinService.create_bin({
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
            MaterialBinService.create_bin({
                "plant_id": str(self.plant.id),
                "resource_group_id": str(self.other_resource_group.id),
                "code": "BAD-1",
                "name": "Bad Bin",
                "bin_type": MaterialBinType.INPUT,
            })

    def test_invalid_cross_plant_production_line_bin_rejected(self):
        with self.assertRaises(MaterialBinServiceError):
            MaterialBinService.create_bin({
                "plant_id": str(self.plant.id),
                "production_line_id": str(self.other_line.id),
                "code": "CROSS-PL",
                "name": "Cross Plant Line",
                "bin_type": MaterialBinType.LINE_SIDE,
            })

    def test_warehouse_bin_requires_warehouse_code(self):
        with self.assertRaises(MaterialBinServiceError):
            MaterialBinService.create_bin({
                "plant_id": str(self.plant.id),
                "code": "RM-NO-WH",
                "name": "RM No Warehouse",
                "bin_type": MaterialBinType.RM,
            })

    def test_fg_bin_requires_warehouse_code(self):
        with self.assertRaises(MaterialBinServiceError):
            MaterialBinService.create_bin({
                "plant_id": str(self.plant.id),
                "code": "FG-NO-WH",
                "name": "FG No Warehouse",
                "bin_type": MaterialBinType.FG,
            })

    def test_input_bin_needs_rg_or_line(self):
        with self.assertRaises(MaterialBinServiceError):
            MaterialBinService.create_bin({
                "plant_id": str(self.plant.id),
                "code": "IN-NO-OWNER",
                "name": "Input No Owner",
                "bin_type": MaterialBinType.INPUT,
            })

    def test_rm_bin_with_warehouse_code_succeeds(self):
        bin_obj = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "code": "RM-WH-1",
            "name": "RM with Warehouse",
            "bin_type": MaterialBinType.RM,
            "warehouse_code": "WH-MAIN",
        })
        self.assertEqual(bin_obj.warehouse_code, "WH-MAIN")
        self.assertEqual(bin_obj.warehouse, self.warehouse)

    def test_create_bin_with_all_new_fields(self):
        bin_obj = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "production_line_id": str(self.line.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "ALL-FIELDS",
            "name": "All Fields Bin",
            "description": "A bin with all fields",
            "bin_type": MaterialBinType.LINE_SIDE,
            "material_id": str(self.material.id),
            "material_group": "METALS",
            "capacity": 500,
            "uom_id": None,
            "replenishment_mode": "KANBAN",
            "fifo_enabled": True,
            "supermarket_enabled": False,
            "location_code": "A-12-B",
            "location_reference": "Rack 3, Shelf 2",
            "warehouse_code": "WH-MAIN",
            "is_active": True,
        })
        self.assertEqual(bin_obj.code, "ALL-FIELDS")
        self.assertEqual(bin_obj.fifo_enabled, True)
        self.assertEqual(bin_obj.replenishment_mode, "KANBAN")
        self.assertEqual(bin_obj.production_line, self.line)

    def test_unique_plant_code_enforced(self):
        MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "code": "DUP-1",
            "name": "First",
            "bin_type": MaterialBinType.INPUT,
            "resource_group_id": str(self.resource_group.id),
        })
        with self.assertRaises(MaterialBinServiceError):
            MaterialBinService.create_bin({
                "plant_id": str(self.plant.id),
                "code": "DUP-1",
                "name": "Duplicate",
                "bin_type": MaterialBinType.INPUT,
                "resource_group_id": str(self.resource_group.id),
            })

    def test_same_code_different_plant_allowed(self):
        bin1 = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "code": "SAME-CODE",
            "name": "First Plant",
            "bin_type": MaterialBinType.INPUT,
            "resource_group_id": str(self.resource_group.id),
        })
        bin2 = MaterialBinService.create_bin({
            "plant_id": str(self.other_plant.id),
            "code": "SAME-CODE",
            "name": "Other Plant",
            "bin_type": MaterialBinType.INPUT,
            "resource_group_id": str(self.other_resource_group.id),
        })
        self.assertNotEqual(bin1.id, bin2.id)

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

    def test_archive_bin_sets_inactive(self):
        bin_obj = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "ARCH-1",
            "name": "To Archive",
            "bin_type": MaterialBinType.INPUT,
        })
        archived = MaterialBinService.archive_bin(str(bin_obj.id))
        self.assertFalse(archived.is_active)

    def test_update_bin_preserves_relations(self):
        bin_obj = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "UPD-1",
            "name": "Original",
            "bin_type": MaterialBinType.INPUT,
        })
        updated = MaterialBinService.update_bin(str(bin_obj.id), {
            "name": "Updated Name",
            "fifo_enabled": True,
        })
        self.assertEqual(updated.name, "Updated Name")
        self.assertTrue(updated.fifo_enabled)
        self.assertEqual(updated.resource_group, self.resource_group)

    def test_assign_to_resource_group(self):
        bin_obj = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "code": "ASSIGN-RG",
            "name": "Assign RG",
            "bin_type": MaterialBinType.FIFO,
        })
        assigned = MaterialBinService.assign_to_resource_group(str(bin_obj.id), str(self.resource_group.id))
        self.assertEqual(assigned.resource_group, self.resource_group)

    def test_assign_to_resource_group_cross_plant_rejected(self):
        bin_obj = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "code": "CROSS-RG",
            "name": "Cross RG",
            "bin_type": MaterialBinType.FIFO,
        })
        with self.assertRaises(MaterialBinServiceError):
            MaterialBinService.assign_to_resource_group(str(bin_obj.id), str(self.other_resource_group.id))

    def test_assign_to_warehouse(self):
        bin_obj = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "WH-ASSIGN",
            "name": "Warehouse Assign",
            "bin_type": MaterialBinType.INPUT,
        })
        assigned = MaterialBinService.assign_to_warehouse(str(bin_obj.id), "WH-MAIN")
        self.assertEqual(assigned.warehouse_code, "WH-MAIN")
        self.assertEqual(assigned.warehouse, self.warehouse)

    def test_validate_material_flow_same_plant_ok(self):
        source = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "FLOW-SRC",
            "name": "Flow Source",
            "bin_type": MaterialBinType.INPUT,
        })
        dest = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "code": "FLOW-DST",
            "name": "Flow Dest",
            "bin_type": MaterialBinType.OUTPUT,
            "resource_group_id": str(self.resource_group.id),
        })
        MaterialBinService.validate_material_flow(str(source.id), str(dest.id))

    def test_validate_material_flow_cross_plant_rejected(self):
        source = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "X-SRC",
            "name": "X Source",
            "bin_type": MaterialBinType.INPUT,
        })
        dest = MaterialBinService.create_bin({
            "plant_id": str(self.other_plant.id),
            "code": "X-DST",
            "name": "X Dest",
            "bin_type": MaterialBinType.OUTPUT,
            "resource_group_id": str(self.other_resource_group.id),
        })
        with self.assertRaises(MaterialBinServiceError):
            MaterialBinService.validate_material_flow(str(source.id), str(dest.id))

    def test_invalid_source_destination_movement_rejected(self):
        routing = Routing.objects.create(production_line=self.line, version="1.0")
        step = RoutingStep.objects.create(
            routing=routing, sequence=1, department=self.department,
            resource_group=self.resource_group, cycle_time_sec=10,
        )
        source = MaterialBin.objects.create(
            plant=self.plant, resource_group=self.resource_group,
            code="SRC-1", name="Source", bin_type=MaterialBinType.INPUT,
        )
        bad_destination = MaterialBin.objects.create(
            plant=self.other_plant, resource_group=self.other_resource_group,
            code="DST-1", name="Destination", bin_type=MaterialBinType.OUTPUT,
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
            routing=routing, sequence=1, department=self.department,
            resource_group=self.resource_group, cycle_time_sec=10,
        )
        MaterialMovementRule.objects.create(routing_step=step)
        codes = {error["code"] for error in RoutingService.validate_routing(str(routing.id))}
        self.assertIn("MISSING_MOVEMENT_BINS", codes)

    # ── Archive blocking tests ──

    def test_cannot_archive_bin_used_as_active_source_bin(self):
        source = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "ARCH-SRC",
            "name": "Archive Source",
            "bin_type": MaterialBinType.INPUT,
        })
        dest = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "ARCH-DST",
            "name": "Archive Dest",
            "bin_type": MaterialBinType.OUTPUT,
        })
        self._active_routing_step_with_bins(source, dest)
        with self.assertRaises(MaterialBinServiceError) as ctx:
            MaterialBinService.archive_bin(str(source.id))
        self.assertEqual(ctx.exception.code, "BIN_IN_ACTIVE_FLOW")
        self.assertIn("references", ctx.exception.details)

    def test_cannot_archive_bin_used_as_active_destination_bin(self):
        source = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "DSRC",
            "name": "Dest Source",
            "bin_type": MaterialBinType.INPUT,
        })
        dest = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "DDST",
            "name": "Dest Dest",
            "bin_type": MaterialBinType.OUTPUT,
        })
        self._active_routing_step_with_bins(source, dest)
        with self.assertRaises(MaterialBinServiceError) as ctx:
            MaterialBinService.archive_bin(str(dest.id))
        self.assertEqual(ctx.exception.code, "BIN_IN_ACTIVE_FLOW")
        self.assertIn("references", ctx.exception.details)

    def test_cannot_archive_bin_used_by_active_operation_input(self):
        bin_obj = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "OI-BIN",
            "name": "Op Input Bin",
            "bin_type": MaterialBinType.INPUT,
        })
        routing = Routing.objects.create(production_line=self.line, version="1.0", status=RoutingStatus.DRAFT)
        step = RoutingStep.objects.create(
            routing=routing, sequence=1, department=self.department,
            resource_group=self.resource_group, cycle_time_sec=10,
        )
        from manufacturing.models import OperationInput
        OperationInput.objects.create(
            routing_step=step, material=self.material, quantity=1, source_bin=bin_obj,
        )
        with self.assertRaises(MaterialBinServiceError) as ctx:
            MaterialBinService.archive_bin(str(bin_obj.id))
        self.assertEqual(ctx.exception.code, "BIN_IN_ACTIVE_FLOW")
        self.assertIn("references", ctx.exception.details)

    def test_cannot_archive_bin_used_by_active_operation_output(self):
        bin_obj = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "OO-BIN",
            "name": "Op Output Bin",
            "bin_type": MaterialBinType.OUTPUT,
        })
        routing = Routing.objects.create(production_line=self.line, version="1.0", status=RoutingStatus.DRAFT)
        step = RoutingStep.objects.create(
            routing=routing, sequence=1, department=self.department,
            resource_group=self.resource_group, cycle_time_sec=10,
        )
        from manufacturing.models import OperationOutput
        OperationOutput.objects.create(
            routing_step=step, material=self.material, quantity=1, destination_bin=bin_obj,
        )
        with self.assertRaises(MaterialBinServiceError) as ctx:
            MaterialBinService.archive_bin(str(bin_obj.id))
        self.assertEqual(ctx.exception.code, "BIN_IN_ACTIVE_FLOW")
        self.assertIn("references", ctx.exception.details)

    def test_can_archive_unused_bin(self):
        bin_obj = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "UNUSED",
            "name": "Unused Bin",
            "bin_type": MaterialBinType.INPUT,
        })
        archived = MaterialBinService.archive_bin(str(bin_obj.id))
        self.assertFalse(archived.is_active)

    def test_can_archive_bin_referenced_by_archived_routing(self):
        bin_obj = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "ARCH-RT",
            "name": "Archived Routing Bin",
            "bin_type": MaterialBinType.INPUT,
        })
        dest = MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "ARCH-RT-DST",
            "name": "Archived Routing Dest",
            "bin_type": MaterialBinType.OUTPUT,
        })
        # Create a routing step referencing the bin, then archive the routing
        routing = Routing.objects.create(production_line=self.line, version="1.0", status=RoutingStatus.DRAFT)
        step = RoutingStep.objects.create(
            routing=routing, sequence=1, department=self.department,
            resource_group=self.resource_group, cycle_time_sec=10,
        )
        MaterialMovementRule.objects.create(
            routing_step=step, source_bin=bin_obj, destination_bin=dest,
        )
        # Archive the routing — the bin should now be archivable
        routing.status = RoutingStatus.ARCHIVED
        routing.save(update_fields=["status"])

        archived = MaterialBinService.archive_bin(str(bin_obj.id))
        self.assertFalse(archived.is_active)

    # ── Error normalization tests ──

    def test_duplicate_plant_code_returns_material_bin_service_error(self):
        MaterialBinService.create_bin({
            "plant_id": str(self.plant.id),
            "resource_group_id": str(self.resource_group.id),
            "code": "DUP-SVC",
            "name": "First",
            "bin_type": MaterialBinType.INPUT,
        })
        with self.assertRaises(MaterialBinServiceError) as ctx:
            MaterialBinService.create_bin({
                "plant_id": str(self.plant.id),
                "resource_group_id": str(self.resource_group.id),
                "code": "DUP-SVC",
                "name": "Duplicate",
                "bin_type": MaterialBinType.INPUT,
            })
        self.assertEqual(ctx.exception.code, "DUPLICATE_PLANT_CODE")

    def test_integrity_error_wrapped_as_material_bin_service_error(self):
        # Direct model creation with duplicate violates uq_material_bin_plant_code constraint
        MaterialBin.objects.create(
            plant=self.plant, resource_group=self.resource_group,
            code="INTEG-TEST", name="First", bin_type=MaterialBinType.INPUT,
        )
        with self.assertRaises(MaterialBinServiceError) as ctx:
            MaterialBinService.create_bin({
                "plant_id": str(self.plant.id),
                "resource_group_id": str(self.resource_group.id),
                "code": "INTEG-TEST",
                "name": "Duplicate",
                "bin_type": MaterialBinType.INPUT,
            })
        self.assertTrue(ctx.exception.code in ("DUPLICATE_PLANT_CODE", "INTEGRITY_ERROR"))

    def test_validation_error_wrapped_as_material_bin_service_error(self):
        # Negative capacity should trigger model ValidationError, wrapped by service
        with self.assertRaises(MaterialBinServiceError) as ctx:
            MaterialBinService.create_bin({
                "plant_id": str(self.plant.id),
                "resource_group_id": str(self.resource_group.id),
                "code": "NEG-SVC",
                "name": "Negative",
                "bin_type": MaterialBinType.INPUT,
                "capacity": -5,
            })
        self.assertEqual(ctx.exception.code, "VALIDATION_ERROR")

    def test_create_invalid_warehouse_code_returns_service_error(self):
        with self.assertRaises(MaterialBinServiceError) as ctx:
            MaterialBinService.create_bin({
                "plant_id": str(self.plant.id),
                "code": "BAD-WH",
                "name": "Bad Warehouse",
                "bin_type": MaterialBinType.RM,
                "warehouse_code": "NONEXISTENT",
            })
        self.assertEqual(ctx.exception.code, "WAREHOUSE_NOT_FOUND")

    # ── Documentation tests ──

    def test_warehouse_code_todo_comment_exists(self):
        import os
        models_path = os.path.join(os.path.dirname(__file__), "..", "models", "routing.py")
        with open(models_path) as f:
            content = f.read()
        self.assertIn("TODO", content)
        self.assertIn("warehouse", content.lower())

    def test_material_bin_migration_note_exists(self):
        import os
        docs_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "docs")
        notes_path = os.path.join(docs_dir, "MATERIAL_BIN_MIGRATION_NOTES.md")
        self.assertTrue(os.path.exists(notes_path))
