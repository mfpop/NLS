from django.db import IntegrityError
from django.db import transaction
from django.test import TestCase

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

    def test_required_parent_fks(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Plant.objects.create(code="NOCO", name="No company")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ProductionLine.objects.create(code="NOPLANT", name="No plant")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Department.objects.create(code="NODEPTPLANT", name="No plant")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ResourceGroup.objects.create(code="NORGD", name="No department")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Resource.objects.create(code="NORESGROUP", name="No group")

    def test_scoped_uniqueness(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Plant.objects.create(company=self.company, code="A", name="Dup Plant")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ProductionLine.objects.create(plant=self.plant_a, code="L1", name="Dup Line")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Department.objects.create(plant=self.plant_a, code="D1", name="Dup Dept")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ResourceGroup.objects.create(department=self.department, code="RG1", name="Dup Group")
        Resource.objects.create(resource_group=self.group, code="R1", name="Resource 1")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Resource.objects.create(resource_group=self.group, code="R1", name="Dup Resource")

    def test_cross_plant_assignment_fails_in_service(self):
        with self.assertRaises(StructureServiceError):
            StructureService.assign_department_to_production_line(str(self.line.id), str(self.other_department.id))

    def test_assignment_persists_plant(self):
        assignment = StructureService.assign_department_to_production_line(str(self.line.id), str(self.department.id))
        self.assertEqual(assignment.plant_id, self.plant_a.id)

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
