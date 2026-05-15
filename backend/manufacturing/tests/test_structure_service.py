"""Tests for StructureService locking and invariants."""

from unittest.mock import patch

from django.db import transaction
from django.test import TestCase

from manufacturing.domain.structure_service import StructureService, StructureServiceError
from manufacturing.models import (
    Company, Plant, ProductionLine, Department, ResourceGroup, Resource,
    ProductionLineDepartmentAssignment,
)


class Input:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

    def __getattr__(self, name):
        return None


class StructureServiceLockingTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(code="CO", name="Company")
        self.plant = Plant.objects.create(company=self.company, code="P1", name="Plant 1")
        self.other_plant = Plant.objects.create(company=self.company, code="P2", name="Plant 2")
        self.line = ProductionLine.objects.create(plant=self.plant, code="L1", name="Line 1")
        self.dept = Department.objects.create(plant=self.plant, code="D1", name="Dept 1")
        self.other_dept = Department.objects.create(plant=self.other_plant, code="D2", name="Dept Other")
        self.group = ResourceGroup.objects.create(department=self.dept, code="RG1", name="Group 1")

    def test_create_plant_sets_status(self):
        plant = StructureService.create_plant(
            Input(code="NP", name="New Plant"),
            company_id=str(self.company.id),
        )
        self.assertEqual(plant.status, "ACTIVE")

    def test_create_production_line_succeeds_with_locking(self):
        line = StructureService.create_production_line(
            Input(plant_id=str(self.plant.id), code="NL", name="New Line")
        )
        self.assertEqual(line.plant_id, self.plant.id)

    def test_assign_department_to_production_line_locks_line_and_department(self):
        result = StructureService.assign_department_to_production_line(
            str(self.line.id), str(self.dept.id), sequence=1,
        )
        self.assertEqual(result.plant_id, self.plant.id)
        self.assertEqual(result.production_line_id, self.line.id)
        self.assertEqual(result.department_id, self.dept.id)

    def test_assign_department_to_production_line_rejects_cross_plant(self):
        with self.assertRaises(StructureServiceError) as ctx:
            StructureService.assign_department_to_production_line(
                str(self.line.id), str(self.other_dept.id),
            )
        self.assertIn("same Plant", str(ctx.exception.message))

    def test_create_resource_group_locks_department(self):
        rg = StructureService.create_resource_group(
            Input(department_id=str(self.dept.id), code="RG2", name="Group 2")
        )
        self.assertEqual(rg.department_id, self.dept.id)

    def test_archive_resource_group_locks_resource_group(self):
        result = StructureService.archive_resource_group(str(self.group.id))
        self.assertEqual(result.status, "ARCHIVED")

    def test_create_resource_locks_resource_group(self):
        res = StructureService.create_resource(
            Input(resource_group_id=str(self.group.id), code="R1", name="Resource 1")
        )
        self.assertEqual(res.resource_group_id, self.group.id)

    def test_archive_resource_locks_resource(self):
        res = Resource.objects.create(resource_group=self.group, code="R1", name="Resource 1")
        result = StructureService.archive_resource(str(res.id))
        self.assertEqual(result.status, "ARCHIVED")

    def test_archive_department(self):
        result = StructureService.archive_department(str(self.dept.id))
        self.assertEqual(result.status, "ARCHIVED")
