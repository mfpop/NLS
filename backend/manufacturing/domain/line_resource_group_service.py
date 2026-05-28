from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from django.db import transaction
from django.db.models import F

from manufacturing.models import ProductionLine, ResourceGroup, ProductionLineResourceGroup


class LineResourceGroupError(ValueError):
    def __init__(self, field: str, code: str, message: str):
        super().__init__(message)
        self.field = field
        self.code = code
        self.message = message


@dataclass
class AssignedResourceGroupData:
    id: str
    production_line_id: str
    resource_group_id: str
    resource_group_code: str
    resource_group_name: str
    department_name: str
    sequence: int
    is_active: bool


class ProductionLineResourceGroupService:

    @staticmethod
    def get_assigned_resource_groups(
        production_line_id: str,
        active_only: bool = True,
    ) -> list[ProductionLineResourceGroup]:
        qs = ProductionLineResourceGroup.objects.filter(
            production_line_id=production_line_id,
        ).select_related(
            "resource_group", "resource_group__department",
        ).order_by("sequence")
        if active_only:
            qs = qs.filter(is_active=True)
        return list(qs)

    @staticmethod
    @transaction.atomic
    def assign_resource_group_to_line(
        production_line_id: str,
        resource_group_id: str,
        sequence: int | None = None,
    ) -> ProductionLineResourceGroup:
        try:
            line = ProductionLine.objects.select_for_update().get(id=production_line_id)
            rg = ResourceGroup.objects.select_for_update().get(id=resource_group_id)
        except ProductionLine.DoesNotExist:
            raise LineResourceGroupError("productionLineId", "NOT_FOUND", "Production line not found")
        except ResourceGroup.DoesNotExist:
            raise LineResourceGroupError("resourceGroupId", "NOT_FOUND", "Resource group not found")

        if line.plant_id != rg.department.plant_id:
            raise LineResourceGroupError(
                "resourceGroupId", "CROSS_PLANT",
                "Resource group must belong to the same plant as the production line",
            )

        existing = ProductionLineResourceGroup.objects.filter(
            production_line_id=production_line_id,
            resource_group_id=resource_group_id,
        ).first()
        if existing:
            raise LineResourceGroupError(
                "resourceGroupId", "DUPLICATE",
                "Resource group is already assigned to this production line",
            )

        if sequence is None:
            max_seq = ProductionLineResourceGroup.objects.filter(
                production_line_id=production_line_id,
            ).order_by("-sequence").values_list("sequence", flat=True).first()
            sequence = (max_seq or 0) + 1

        if sequence < 1:
            raise LineResourceGroupError("sequence", "INVALID", "Sequence must be positive")

        if ProductionLineResourceGroup.objects.filter(
            production_line_id=production_line_id,
            sequence=sequence,
        ).exists():
            ProductionLineResourceGroup.objects.filter(
                production_line_id=production_line_id,
                sequence__gte=sequence,
            ).update(sequence=F("sequence") + 1)

        return ProductionLineResourceGroup.objects.create(
            production_line_id=production_line_id,
            resource_group_id=resource_group_id,
            sequence=sequence,
            is_active=True,
        )

    @staticmethod
    @transaction.atomic
    def remove_resource_group_from_line(
        production_line_id: str,
        resource_group_id: str,
    ) -> None:
        try:
            assignment = ProductionLineResourceGroup.objects.select_for_update().get(
                production_line_id=production_line_id,
                resource_group_id=resource_group_id,
            )
        except ProductionLineResourceGroup.DoesNotExist:
            raise LineResourceGroupError(
                "resourceGroupId", "NOT_FOUND",
                "Assignment not found",
            )
        assignment.delete()

    @staticmethod
    @transaction.atomic
    def reorder_assigned_resource_groups(
        production_line_id: str,
        ordered_resource_group_ids: list[str],
    ) -> list[ProductionLineResourceGroup]:
        assignments = list(
            ProductionLineResourceGroup.objects.select_for_update().filter(
                production_line_id=production_line_id,
            )
        )
        found = {a.resource_group_id for a in assignments}
        given = {int(rid) for rid in ordered_resource_group_ids}
        missing = given - found
        if missing:
            raise LineResourceGroupError(
                "resourceGroupIds", "NOT_FOUND",
                f"Resource groups not assigned to this line: {missing}",
            )

        # Bulk update using a temporary offset to avoid unique constraint
        offset = len(assignments) + 1
        assignment_map = {a.resource_group_id: a for a in assignments}
        for seq, rg_id_str in enumerate(ordered_resource_group_ids, start=1):
            rg_id = int(rg_id_str)
            assignment = assignment_map[rg_id]
            assignment.sequence = seq + offset
        ProductionLineResourceGroup.objects.bulk_update(
            [assignment_map[rg_id] for rg_id in (int(r) for r in ordered_resource_group_ids)],
            ["sequence"],
        )

        # Now set real sequences
        for seq, rg_id_str in enumerate(ordered_resource_group_ids, start=1):
            rg_id = int(rg_id_str)
            assignment = assignment_map[rg_id]
            assignment.sequence = seq
        ProductionLineResourceGroup.objects.bulk_update(
            [assignment_map[rg_id] for rg_id in (int(r) for r in ordered_resource_group_ids)],
            ["sequence"],
        )

        return list(
            ProductionLineResourceGroup.objects.filter(
                production_line_id=production_line_id,
            ).select_related("resource_group").order_by("sequence")
        )

    @staticmethod
    @transaction.atomic
    def activate_line_resource_group(
        production_line_id: str,
        resource_group_id: str,
    ) -> ProductionLineResourceGroup:
        try:
            assignment = ProductionLineResourceGroup.objects.select_for_update().get(
                production_line_id=production_line_id,
                resource_group_id=resource_group_id,
            )
        except ProductionLineResourceGroup.DoesNotExist:
            raise LineResourceGroupError(
                "resourceGroupId", "NOT_FOUND",
                "Assignment not found",
            )
        assignment.is_active = True
        assignment.save(update_fields=["is_active"])
        return assignment

    @staticmethod
    @transaction.atomic
    def deactivate_line_resource_group(
        production_line_id: str,
        resource_group_id: str,
    ) -> ProductionLineResourceGroup:
        try:
            assignment = ProductionLineResourceGroup.objects.select_for_update().get(
                production_line_id=production_line_id,
                resource_group_id=resource_group_id,
            )
        except ProductionLineResourceGroup.DoesNotExist:
            raise LineResourceGroupError(
                "resourceGroupId", "NOT_FOUND",
                "Assignment not found",
            )
        assignment.is_active = False
        assignment.save(update_fields=["is_active"])
        return assignment
