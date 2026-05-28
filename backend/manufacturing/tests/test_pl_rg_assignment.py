import io
from django.test import TestCase
from django.db import transaction, IntegrityError
from django.core.management import call_command
from unittest.mock import Mock, patch

from manufacturing.models import (
    Company, Plant, ProductionLine, Department, ResourceGroup,
    ProductionLineResourceGroup, ProductionLineDepartmentAssignment,
    Routing, RoutingStep, RoutingStatus,
)
from manufacturing.domain.line_resource_group_service import (
    ProductionLineResourceGroupService, LineResourceGroupError,
)
from manufacturing.domain.routing_service import RoutingService, RoutingValidationError
from manufacturing.domain.capacity_service import NewCapacityService
from api.schema import schema
from api.schema import GraphQLContext


# ══════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════

def _make_company(name: str = "Test Corp") -> Company:
    return Company.objects.create(name=name)


def _make_plant(company: Company, name: str = "Test Plant") -> Plant:
    return Plant.objects.create(company=company, name=name, code=name[:10])


def _make_production_line(plant: Plant, name: str = "Line 1") -> ProductionLine:
    return ProductionLine.objects.create(plant=plant, name=name, code=name[:10])


def _make_department(plant: Plant, name: str = "Dept 1") -> Department:
    return Department.objects.create(plant=plant, name=name, code=name[:10])


def _make_resource_group(department: Department, name: str = "RG 1") -> ResourceGroup:
    return ResourceGroup.objects.create(department=department, name=name, code=name[:10])


def _make_context():
    user = Mock()
    user.is_authenticated = True
    user.username = "testuser"
    user.role_profile.role = "app_owner"
    ctx = Mock(spec=GraphQLContext)
    ctx.user = user
    ctx.request = Mock()
    return ctx


# ══════════════════════════════════════════════════════════════════
#  MODEL / SERVICE TESTS
# ══════════════════════════════════════════════════════════════════

class ProductionLineResourceGroupServiceTest(TestCase):
    """Tests for the assignment service."""

    def setUp(self):
        self.company = _make_company()
        self.plant = _make_plant(self.company)
        self.line = _make_production_line(self.plant)
        self.dept = _make_department(self.plant)
        self.rg = _make_resource_group(self.dept)

    def test_assign_resource_group_to_line(self):
        assignment = ProductionLineResourceGroupService.assign_resource_group_to_line(
            str(self.line.id), str(self.rg.id),
        )
        self.assertEqual(int(assignment.production_line_id), self.line.id)
        self.assertEqual(int(assignment.resource_group_id), self.rg.id)
        self.assertEqual(assignment.sequence, 1)
        self.assertTrue(assignment.is_active)

    def test_auto_sequence_increments(self):
        rg2 = _make_resource_group(self.dept, name="RG 2")
        ProductionLineResourceGroupService.assign_resource_group_to_line(str(self.line.id), str(self.rg.id))
        a2 = ProductionLineResourceGroupService.assign_resource_group_to_line(str(self.line.id), str(rg2.id))
        self.assertEqual(a2.sequence, 2)

    def test_prevent_duplicate_assignment(self):
        ProductionLineResourceGroupService.assign_resource_group_to_line(str(self.line.id), str(self.rg.id))
        with self.assertRaises(LineResourceGroupError) as ctx:
            ProductionLineResourceGroupService.assign_resource_group_to_line(str(self.line.id), str(self.rg.id))
        self.assertEqual(ctx.exception.code, "DUPLICATE")

    def test_prevent_cross_plant_assignment(self):
        other_plant = _make_plant(self.company, name="Other Plant")
        other_dept = _make_department(other_plant, name="Other Dept")
        other_rg = _make_resource_group(other_dept, name="Other RG")
        with self.assertRaises(LineResourceGroupError) as ctx:
            ProductionLineResourceGroupService.assign_resource_group_to_line(str(self.line.id), str(other_rg.id))
        self.assertEqual(ctx.exception.code, "CROSS_PLANT")

    def test_reject_negative_sequence(self):
        with self.assertRaises(LineResourceGroupError) as ctx:
            ProductionLineResourceGroupService.assign_resource_group_to_line(
                str(self.line.id), str(self.rg.id), sequence=0,
            )
        self.assertEqual(ctx.exception.code, "INVALID")

    def test_activate_assignment(self):
        assignment = ProductionLineResourceGroupService.assign_resource_group_to_line(
            str(self.line.id), str(self.rg.id),
        )
        assignment.is_active = False
        assignment.save()
        result = ProductionLineResourceGroupService.activate_line_resource_group(
            str(self.line.id), str(self.rg.id),
        )
        self.assertTrue(result.is_active)

    def test_deactivate_assignment(self):
        ProductionLineResourceGroupService.assign_resource_group_to_line(
            str(self.line.id), str(self.rg.id),
        )
        result = ProductionLineResourceGroupService.deactivate_line_resource_group(
            str(self.line.id), str(self.rg.id),
        )
        self.assertFalse(result.is_active)

    def test_active_only_filtering(self):
        rg2 = _make_resource_group(self.dept, name="RG 2")
        ProductionLineResourceGroupService.assign_resource_group_to_line(str(self.line.id), str(self.rg.id))
        a2 = ProductionLineResourceGroupService.assign_resource_group_to_line(str(self.line.id), str(rg2.id))
        a2.is_active = False
        a2.save()

        all_assignments = ProductionLineResourceGroupService.get_assigned_resource_groups(
            str(self.line.id), active_only=False,
        )
        self.assertEqual(len(all_assignments), 2)

        active_assignments = ProductionLineResourceGroupService.get_assigned_resource_groups(
            str(self.line.id), active_only=True,
        )
        self.assertEqual(len(active_assignments), 1)

    def test_remove_assignment(self):
        ProductionLineResourceGroupService.assign_resource_group_to_line(str(self.line.id), str(self.rg.id))
        ProductionLineResourceGroupService.remove_resource_group_from_line(str(self.line.id), str(self.rg.id))
        count = ProductionLineResourceGroup.objects.filter(
            production_line_id=self.line.id, resource_group_id=self.rg.id,
        ).count()
        self.assertEqual(count, 0)

    def test_reorder_assignments(self):
        rg2 = _make_resource_group(self.dept, name="RG 2")
        rg3 = _make_resource_group(self.dept, name="RG 3")
        a1 = ProductionLineResourceGroupService.assign_resource_group_to_line(str(self.line.id), str(self.rg.id))
        a2 = ProductionLineResourceGroupService.assign_resource_group_to_line(str(self.line.id), str(rg2.id))
        a3 = ProductionLineResourceGroupService.assign_resource_group_to_line(str(self.line.id), str(rg3.id))

        ProductionLineResourceGroupService.reorder_assigned_resource_groups(
            str(self.line.id),
            [str(rg3.id), str(rg2.id), str(self.rg.id)],
        )

        self.assertEqual(
            ProductionLineResourceGroup.objects.get(id=a3.id).sequence, 1,
        )
        self.assertEqual(
            ProductionLineResourceGroup.objects.get(id=a2.id).sequence, 2,
        )
        self.assertEqual(
            ProductionLineResourceGroup.objects.get(id=a1.id).sequence, 3,
        )

    def test_reorder_rejects_unassigned_rg(self):
        rg2 = _make_resource_group(self.dept, name="RG 2")
        with self.assertRaises(LineResourceGroupError) as ctx:
            ProductionLineResourceGroupService.reorder_assigned_resource_groups(
                str(self.line.id), [str(rg2.id)],
            )
        self.assertEqual(ctx.exception.code, "NOT_FOUND")

    def test_select_for_update_used_on_write(self):
        rg2 = _make_resource_group(self.dept, name="RG 2")
        ProductionLineResourceGroupService.assign_resource_group_to_line(str(self.line.id), str(rg2.id))
        self.assertTrue(ProductionLineResourceGroup.objects.filter(
            production_line_id=self.line.id, resource_group_id=rg2.id,
        ).exists())


# ══════════════════════════════════════════════════════════════════
#  GRAPHQL TESTS
# ══════════════════════════════════════════════════════════════════

class ProductionLineResourceGroupGraphQLTest(TestCase):
    """Tests for GraphQL integration."""

    def setUp(self):
        self.company = _make_company()
        self.plant = _make_plant(self.company)
        self.line = _make_production_line(self.plant)
        self.dept = _make_department(self.plant)
        self.rg = _make_resource_group(self.dept)
        self.ctx = _make_context()

    def test_assigned_resource_groups_appears_on_production_line(self):
        ProductionLineResourceGroupService.assign_resource_group_to_line(
            str(self.line.id), str(self.rg.id),
        )
        q = """
        query($id: String!) {
            productionLine(id: $id) {
                id
                assignedResourceGroups {
                    id
                    resourceGroupId
                    resourceGroupCode
                    resourceGroupName
                    sequence
                    isActive
                }
            }
        }
        """
        result = schema.execute_sync(q, variable_values={"id": str(self.line.id)}, context_value=self.ctx)
        self.assertIsNone(result.errors, msg=str(result.errors))
        data = result.data["productionLine"]["assignedResourceGroups"]
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["resourceGroupId"], str(self.rg.id))

    def test_assign_mutation_delegates(self):
        with patch(
            "api.mutations.manufacturing.ProductionLineResourceGroupService.assign_resource_group_to_line"
        ) as mock_assign:
            from manufacturing.models import ProductionLine
            mock_assign.return_value = ProductionLineResourceGroup(
                production_line_id=self.line.id, resource_group_id=self.rg.id,
                sequence=1, is_active=True,
            )
            q = """
            mutation($lineId: String!, $rgId: String!) {
                assignResourceGroupToProductionLine(productionLineId: $lineId, resourceGroupId: $rgId) {
                    ok
                }
            }
            """
            result = schema.execute_sync(
                q,
                variable_values={"lineId": str(self.line.id), "rgId": str(self.rg.id)},
                context_value=self.ctx,
            )
            self.assertIsNone(result.errors, msg=str(result.errors))
            self.assertTrue(result.data["assignResourceGroupToProductionLine"]["ok"])

    def test_remove_mutation_delegates(self):
        with patch(
            "api.mutations.manufacturing.ProductionLineResourceGroupService.remove_resource_group_from_line"
        ) as mock_remove:
            q = """
            mutation($lineId: String!, $rgId: String!) {
                removeResourceGroupFromProductionLine(productionLineId: $lineId, resourceGroupId: $rgId) {
                    ok
                }
            }
            """
            result = schema.execute_sync(
                q,
                variable_values={"lineId": str(self.line.id), "rgId": str(self.rg.id)},
                context_value=self.ctx,
            )
            self.assertIsNone(result.errors, msg=str(result.errors))
            mock_remove.assert_called_once()

    def test_reorder_mutation_delegates(self):
        with patch(
            "api.mutations.manufacturing.ProductionLineResourceGroupService.reorder_assigned_resource_groups"
        ) as mock_reorder:
            q = """
            mutation($lineId: String!, $rgIds: [String!]!) {
                reorderProductionLineResourceGroups(productionLineId: $lineId, orderedResourceGroupIds: $rgIds) {
                    ok
                }
            }
            """
            result = schema.execute_sync(
                q,
                variable_values={"lineId": str(self.line.id), "rgIds": [str(self.rg.id)]},
                context_value=self.ctx,
            )
            self.assertIsNone(result.errors, msg=str(result.errors))
            mock_reorder.assert_called_once()

    def test_activate_mutation_delegates(self):
        with patch(
            "api.mutations.manufacturing.ProductionLineResourceGroupService.activate_line_resource_group"
        ) as mock_activate:
            q = """
            mutation($lineId: String!, $rgId: String!) {
                activateProductionLineResourceGroup(productionLineId: $lineId, resourceGroupId: $rgId) {
                    ok
                }
            }
            """
            result = schema.execute_sync(
                q,
                variable_values={"lineId": str(self.line.id), "rgId": str(self.rg.id)},
                context_value=self.ctx,
            )
            self.assertIsNone(result.errors, msg=str(result.errors))
            mock_activate.assert_called_once()

    def test_deactivate_mutation_delegates(self):
        with patch(
            "api.mutations.manufacturing.ProductionLineResourceGroupService.deactivate_line_resource_group"
        ) as mock_deactivate:
            q = """
            mutation($lineId: String!, $rgId: String!) {
                deactivateProductionLineResourceGroup(productionLineId: $lineId, resourceGroupId: $rgId) {
                    ok
                }
            }
            """
            result = schema.execute_sync(
                q,
                variable_values={"lineId": str(self.line.id), "rgId": str(self.rg.id)},
                context_value=self.ctx,
            )
            self.assertIsNone(result.errors, msg=str(result.errors))
            mock_deactivate.assert_called_once()

    def test_pl_rg_resolvers_contain_no_business_logic(self):
        import inspect
        from api.mutations.manufacturing import ManufacturingMutation

        pl_rg_mutations = [
            "assign_resource_group_to_production_line",
            "remove_resource_group_from_production_line",
            "reorder_production_line_resource_groups",
            "activate_production_line_resource_group",
            "deactivate_production_line_resource_group",
        ]
        forbidden = ["transaction.atomic", "open(", ".read(", ".write(",
                     "bulk_create", " save(", ".delete("]
        for name, method in inspect.getmembers(ManufacturingMutation, predicate=inspect.isfunction):
            if name not in pl_rg_mutations:
                continue
            source = inspect.getsource(method)
            body = source.split(":", 1)[-1] if ":" in source else source
            for token in forbidden:
                self.assertNotIn(token, body,
                                 f"Mutation '{name}' contains forbidden '{token}'")


# ══════════════════════════════════════════════════════════════════
#  ROUTING DEPENDENCY TESTS
# ══════════════════════════════════════════════════════════════════

class RoutingResourceGroupAssignmentTest(TestCase):
    """Routing must use assigned ResourceGroups for flow."""

    def setUp(self):
        self.company = _make_company()
        self.plant = _make_plant(self.company)
        self.line = _make_production_line(self.plant)
        self.dept = _make_department(self.plant)
        self.rg = _make_resource_group(self.dept, name="Assigned RG")

        ProductionLineResourceGroupService.assign_resource_group_to_line(
            str(self.line.id), str(self.rg.id),
        )

        self.routing = Routing.objects.create(
            production_line=self.line,
            product_model=None,
            version="V1",
            status=RoutingStatus.DRAFT,
        )

    def test_routing_with_assigned_rg_passes_validation(self):
        step = RoutingStep.objects.create(
            routing=self.routing,
            sequence=1,
            department=self.dept,
            resource_group=self.rg,
            cycle_time_sec=10,
        )
        errors = RoutingService.validate_routing(str(self.routing.id))
        rg_errors = [e for e in errors if e.get("code") == "UNASSIGNED_RG"]
        self.assertEqual(len(rg_errors), 0)

    def test_routing_with_unassigned_rg_fails_validation(self):
        other_dept = _make_department(self.plant, name="Other Dept")
        other_rg = _make_resource_group(other_dept, name="Unassigned RG")
        step = RoutingStep.objects.create(
            routing=self.routing,
            sequence=1,
            department=other_dept,
            resource_group=other_rg,
            cycle_time_sec=10,
        )
        errors = RoutingService.validate_routing(str(self.routing.id))
        rg_errors = [e for e in errors if e.get("code") == "UNASSIGNED_RG"]
        self.assertEqual(len(rg_errors), 1)

    def test_inactive_assigned_rg_rejected_in_routing(self):
        ProductionLineResourceGroupService.deactivate_line_resource_group(
            str(self.line.id), str(self.rg.id),
        )
        step = RoutingStep.objects.create(
            routing=self.routing,
            sequence=1,
            department=self.dept,
            resource_group=self.rg,
            cycle_time_sec=10,
        )
        errors = RoutingService.validate_routing(str(self.routing.id))
        rg_errors = [e for e in errors if e.get("code") == "UNASSIGNED_RG"]
        self.assertEqual(len(rg_errors), 1)


# ══════════════════════════════════════════════════════════════════
#  CAPACITY DEPENDENCY TESTS
# ══════════════════════════════════════════════════════════════════

class CapacityResourceGroupAssignmentTest(TestCase):
    """Capacity must use only active ProductionLineResourceGroup assignments."""

    def setUp(self):
        self.company = _make_company()
        self.plant = _make_plant(self.company)
        self.line = _make_production_line(self.plant)
        self.dept = _make_department(self.plant)
        self.rg = _make_resource_group(self.dept, name="Capacity RG")

    def test_capacity_includes_directly_assigned_rgs(self):
        ProductionLineResourceGroupService.assign_resource_group_to_line(
            str(self.line.id), str(self.rg.id),
        )
        rg_ids = NewCapacityService._resource_group_ids_for_scope(
            "PRODUCTION_LINE", str(self.line.id),
        )
        self.assertIn(str(self.rg.id), rg_ids)

    def test_capacity_excludes_inactive_assigned_rgs(self):
        a = ProductionLineResourceGroupService.assign_resource_group_to_line(
            str(self.line.id), str(self.rg.id),
        )
        a.is_active = False
        a.save()
        rg_ids = NewCapacityService._resource_group_ids_for_scope(
            "PRODUCTION_LINE", str(self.line.id),
        )
        self.assertNotIn(str(self.rg.id), rg_ids)

    def test_capacity_excludes_legacy_department_assignment_only(self):
        ProductionLineDepartmentAssignment.objects.create(
            plant=self.plant,
            production_line=self.line,
            department=self.dept,
            sequence=1,
        )
        rg_ids = NewCapacityService._resource_group_ids_for_scope(
            "PRODUCTION_LINE", str(self.line.id),
        )
        self.assertNotIn(str(self.rg.id), rg_ids)
        self.assertEqual(len(rg_ids), 0)

    def test_capacity_line_with_no_pl_rg_returns_empty(self):
        rg_ids = NewCapacityService._resource_group_ids_for_scope(
            "PRODUCTION_LINE", str(self.line.id),
        )
        self.assertEqual(len(rg_ids), 0)


# ══════════════════════════════════════════════════════════════════
#  ERP / LABEL SAFETY TESTS
# ══════════════════════════════════════════════════════════════════

class ErpLabelSafetyTest(TestCase):
    """ERP import destination safety for ProductionLineResourceGroup."""

    def setUp(self):
        self.company = _make_company()
        self.plant = _make_plant(self.company)
        self.line = _make_production_line(self.plant)
        self.dept = _make_department(self.plant)
        self.rg = _make_resource_group(self.dept)

    def test_user_facing_label_is_assigned_resource_groups(self):
        from api.types.manufacturing import ProductionLineNode
        fields = {f.name: f for f in ProductionLineNode.__strawberry_definition__.fields}
        self.assertIn("assigned_resource_groups", fields)
        field = fields["assigned_resource_groups"]
        self.assertEqual(field.graphql_name, "assignedResourceGroups")

    def test_no_pivot_terminology_exposed_in_graphql(self):
        from api.types.manufacturing import ProductionLineNode
        field_names = [f.name for f in ProductionLineNode.__strawberry_definition__.fields]
        forbidden = ["ProductionLineResourceGroup", "PLRG", "join_table", "pivot"]
        for name in field_names:
            for term in forbidden:
                self.assertNotIn(term, name)

    def test_line_rg_created_via_service_import(self):
        count = ProductionLineResourceGroup.objects.filter(
            production_line_id=self.line.id,
        ).count()
        self.assertEqual(count, 0)
        ProductionLineResourceGroupService.assign_resource_group_to_line(
            str(self.line.id), str(self.rg.id),
        )
        count = ProductionLineResourceGroup.objects.filter(
            production_line_id=self.line.id,
        ).count()
        self.assertEqual(count, 1)

    def test_erp_backend_uses_technical_name_not_user_facing(self):
        db_table = ProductionLineResourceGroup._meta.db_table
        self.assertEqual(db_table, "manufacturing_production_line_resource_group")
        verbose_name = ProductionLineResourceGroup._meta.verbose_name
        self.assertIn("Assignment", verbose_name)


# ══════════════════════════════════════════════════════════════════
#  BACKFILL COMMAND TESTS
# ══════════════════════════════════════════════════════════════════

class BackfillLineResourceGroupsCommandTest(TestCase):
    """Tests for python manage.py backfill_line_resource_groups."""

    def setUp(self):
        self.company = _make_company("Backfill Corp")
        self.plant = _make_plant(self.company, "Backfill Plant")
        self.line = _make_production_line(self.plant, "Backfill Line")
        self.dept = _make_department(self.plant, "Backfill Dept")
        self.rg1 = _make_resource_group(self.dept, "RG A")
        self.rg2 = _make_resource_group(self.dept, "RG B")

        # Create legacy assignment
        ProductionLineDepartmentAssignment.objects.create(
            plant=self.plant,
            production_line=self.line,
            department=self.dept,
            sequence=1,
        )

    def test_creates_missing_plrg_from_legacy_assignments(self):
        out = io.StringIO()
        call_command("backfill_line_resource_groups", stdout=out)
        output = out.getvalue()

        created = ProductionLineResourceGroup.objects.filter(
            production_line=self.line,
        ).count()
        self.assertEqual(created, 2)
        self.assertIn("2", output)
        self.assertIn("CREATED", output)

    def test_skips_duplicates(self):
        ProductionLineResourceGroupService.assign_resource_group_to_line(
            str(self.line.id), str(self.rg1.id),
        )
        out = io.StringIO()
        call_command("backfill_line_resource_groups", stdout=out)
        output = out.getvalue()

        total = ProductionLineResourceGroup.objects.filter(
            production_line=self.line,
        ).count()
        self.assertEqual(total, 2)
        self.assertIn("skipped (already exist)", output)

    def test_deterministic_sequence_order(self):
        out = io.StringIO()
        call_command("backfill_line_resource_groups", stdout=out)

        assignments = ProductionLineResourceGroup.objects.filter(
            production_line=self.line,
        ).order_by("sequence")
        self.assertEqual(assignments[0].resource_group.code, "RG A")
        self.assertEqual(assignments[1].resource_group.code, "RG B")

    def test_does_not_overwrite_existing_sequence(self):
        a = ProductionLineResourceGroupService.assign_resource_group_to_line(
            str(self.line.id), str(self.rg1.id), sequence=5,
        )
        out = io.StringIO()
        call_command("backfill_line_resource_groups", stdout=out)

        a.refresh_from_db()
        self.assertEqual(a.sequence, 5)

        new_assignments = ProductionLineResourceGroup.objects.filter(
            production_line=self.line,
        ).order_by("sequence")
        self.assertEqual(len(new_assignments), 2)
        self.assertEqual(new_assignments[0].sequence, 5)

    def test_dry_run_does_not_create(self):
        out = io.StringIO()
        call_command("backfill_line_resource_groups", dry_run=True, stdout=out)
        output = out.getvalue()

        count = ProductionLineResourceGroup.objects.filter(
            production_line=self.line,
        ).count()
        self.assertEqual(count, 0)
        self.assertIn("WOULD CREATE", output)

    def test_skips_department_with_no_active_resource_groups(self):
        empty_dept = _make_department(self.plant, "Empty Dept")
        ProductionLineDepartmentAssignment.objects.create(
            plant=self.plant,
            production_line=self.line,
            department=empty_dept,
            sequence=2,
        )
        out = io.StringIO()
        call_command("backfill_line_resource_groups", stdout=out)
        output = out.getvalue()
        self.assertIn("no active RGs", output)

    def test_filter_by_production_line_id(self):
        other_line = _make_production_line(self.plant, "Other Line")
        ProductionLineDepartmentAssignment.objects.create(
            plant=self.plant,
            production_line=other_line,
            department=self.dept,
            sequence=1,
        )
        out = io.StringIO()
        call_command(
            "backfill_line_resource_groups",
            production_line_id=str(self.line.id),
            stdout=out,
        )
        line_rgs = ProductionLineResourceGroup.objects.filter(
            production_line=self.line,
        ).count()
        other_rgs = ProductionLineResourceGroup.objects.filter(
            production_line=other_line,
        ).count()
        self.assertGreater(line_rgs, 0)
        self.assertEqual(other_rgs, 0)
