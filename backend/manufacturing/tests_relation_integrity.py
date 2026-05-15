from unittest.mock import patch

from django.db import IntegrityError
from django.db import transaction
from django.test import TestCase

from api.mutations.manufacturing import ManufacturingMutation
from api.types.manufacturing import AssignDepartmentInput
from manufacturing.domain.structure_service import StructureService, StructureServiceError
from manufacturing.models import (
    Company,
    Department,
    Plant,
    ProductionLine,
    ProductionLineDepartmentAssignment,
    Resource,
    ResourceGroup,
)


class Input:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

    def __getattr__(self, name):
        return None


class RelationIntegrityTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(code="CO", name="Company")
        self.plant_a = Plant.objects.create(company=self.company, code="A", name="Plant A")
        self.plant_b = Plant.objects.create(company=self.company, code="B", name="Plant B")
        self.line = ProductionLine.objects.create(plant=self.plant_a, code="L1", name="Line 1")
        self.department = Department.objects.create(plant=self.plant_a, code="D1", name="Dept 1")
        self.other_department = Department.objects.create(plant=self.plant_b, code="D1", name="Dept Other")
        self.group = ResourceGroup.objects.create(department=self.department, code="RG1", name="Group 1")

    def assert_db_integrity_error(self, func):
        with self.assertRaises((IntegrityError, Exception)):
            with transaction.atomic():
                func()

    def test_required_parent_fks(self):
        self.assert_db_integrity_error(lambda: Plant.objects.create(code="NOCO", name="No company"))
        self.assert_db_integrity_error(lambda: ProductionLine.objects.bulk_create([ProductionLine(code="NOPLANT", name="No plant")]))
        self.assert_db_integrity_error(lambda: Department.objects.create(code="NODEPTPLANT", name="No plant"))
        self.assert_db_integrity_error(lambda: ResourceGroup.objects.bulk_create([ResourceGroup(code="NORGD", name="No department")]))
        self.assert_db_integrity_error(lambda: Resource.objects.create(code="NORESGROUP", name="No group"))

    def test_scoped_uniqueness(self):
        self.assert_db_integrity_error(lambda: Plant.objects.create(company=self.company, code="A", name="Dup Plant"))
        self.assert_db_integrity_error(lambda: Plant.objects.create(company=self.company, code="PX", name="Plant A"))
        self.assert_db_integrity_error(lambda: ProductionLine.objects.bulk_create([ProductionLine(plant=self.plant_a, code="L1", name="Dup Line")]))
        self.assert_db_integrity_error(lambda: ProductionLine.objects.bulk_create([ProductionLine(plant=self.plant_a, code="L2", name="Line 1")]))
        self.assert_db_integrity_error(lambda: Department.objects.create(plant=self.plant_a, code="D1", name="Dup Dept"))
        self.assert_db_integrity_error(lambda: Department.objects.create(plant=self.plant_a, code="D2", name="Dept 1"))
        self.assert_db_integrity_error(lambda: ResourceGroup.objects.bulk_create([ResourceGroup(department=self.department, code="RG1", name="Dup Group")]))
        self.assert_db_integrity_error(lambda: ResourceGroup.objects.bulk_create([ResourceGroup(department=self.department, code="RG2", name="Group 1")]))
        Resource.objects.create(resource_group=self.group, code="R1", name="Resource 1")
        self.assert_db_integrity_error(lambda: Resource.objects.create(resource_group=self.group, code="R1", name="Dup Resource"))
        self.assert_db_integrity_error(lambda: Resource.objects.create(resource_group=self.group, code="R2", name="Resource 1"))

    def test_cross_plant_assignment_fails_in_service(self):
        with self.assertRaises(StructureServiceError):
            StructureService.assign_department_to_production_line(str(self.line.id), str(self.other_department.id))

    def test_assignment_persists_plant(self):
        assignment = StructureService.assign_department_to_production_line(str(self.line.id), str(self.department.id))
        self.assertEqual(assignment.plant_id, self.plant_a.id)

    def test_cross_plant_assignment_fails_at_database_level(self):
        self.assert_db_integrity_error(lambda: ProductionLineDepartmentAssignment.objects.bulk_create([
            ProductionLineDepartmentAssignment(
                plant=self.plant_a,
                production_line=self.line,
                department=self.other_department,
            )
        ]))

    def test_duplicate_assignment_fails_at_database_level(self):
        ProductionLineDepartmentAssignment.objects.create(
            plant=self.plant_a,
            production_line=self.line,
            department=self.department,
        )
        self.assert_db_integrity_error(lambda: ProductionLineDepartmentAssignment.objects.bulk_create([
            ProductionLineDepartmentAssignment(
                plant=self.plant_a,
                production_line=self.line,
                department=self.department,
            )
        ]))

    def test_delete_parent_with_children_is_protected(self):
        ProductionLineDepartmentAssignment.objects.create(
            plant=self.plant_a,
            production_line=self.line,
            department=self.department,
        )
        with self.assertRaises(Exception):
            self.plant_a.delete()
        with self.assertRaises(Exception):
            self.line.delete()
        with self.assertRaises(Exception):
            self.department.delete()
        Resource.objects.create(resource_group=self.group, code="R1", name="Resource 1")
        with self.assertRaises(Exception):
            self.group.delete()

    def test_assignment_graphql_mutation_delegates_to_service(self):
        mutation = ManufacturingMutation()
        with patch.object(StructureService, "assign_department_to_production_line") as mocked:
            mocked.return_value = ProductionLineDepartmentAssignment(
                plant=self.plant_a,
                production_line=self.line,
                department=self.department,
                sequence=1,
            )
            result = mutation.assign_department_to_production_line(
                AssignDepartmentInput(
                    production_line_id=str(self.line.id),
                    department_id=str(self.department.id),
                    sequence=1,
                    status="ACTIVE",
                )
            )
        self.assertTrue(result.ok)
        mocked.assert_called_once_with(str(self.line.id), str(self.department.id), 1, "ACTIVE")
