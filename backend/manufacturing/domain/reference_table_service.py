"""
Domain service for reference table CRUD operations.

Provides transaction-safe create/update/deactivate methods for ReferenceValue
records, matching the established pattern used by DepartmentService and
StructureService. All mutation-level write operations are wrapped in
@transaction.atomic for consistency.

Usage:
    rv = ReferenceTableRecordService.create(table_type, input)
    rv = ReferenceTableRecordService.update(id, input)
    rv = ReferenceTableRecordService.deactivate(id)
"""

from dataclasses import dataclass, field
from typing import Optional

from django.db import transaction

from manufacturing.models import ReferenceCategory, ReferenceValue


@dataclass
class ReferenceTableServiceError(Exception):
    """Error raised by ReferenceTableRecordService operations."""
    field: str | None
    code: str
    message: str


@dataclass
class ReferenceValidationError:
    """Lightweight validation error returned by validate_input.

    The mutation layer converts these to GraphQL MutationError types.
    """
    field: str
    code: str
    message: str


# ── Table type to category mapping (single source of truth) ──

TABLE_TYPE_TO_CATEGORY: dict[str, str] = {
    "production_calendar": "calendar",
    "shift_pattern": "shift_model",
    "language": "language",
    "timezone": "timezone",
    "manufacturing_type": "plant_type",
    "work_center_type": "department_type",
    "machine_type": "resource_type",
    "operation_code": "resource_capability",
    "routing_type": "product_line",
    "material_category": "manufacturing_focus",
    "inventory_type": "resource_group_type",
    "kanban_type": "lean_methodology",
    "industry_type": "industry_type",
    "container_type": "container_type",
    "unit_type": "schedule",
    "downtime_code": "downtime_reason",
    "defect_code": "defect_type",
    "scrap_reason": "scrap_reason",
    "kaizen_category": "lean_value",
    "priority": "priority",
    "label_badge": "label_badge",
    "maintenance_type": "maintenance_type",
    "material_flow_type": "material_flow_type",
    "process_type": "process_type",
    "skill_type": "skill_type",
    "role": "role",
    "shift_team": "shift_team",
    "staff_user": "__staff_user__",
    "staff_assignment": "__staff_assignment__",
    "product_model": "product_model",
    "production_family": "production_family",
}


def table_type_to_category(table_type: str) -> str:
    """Map a legacy table type code to a ReferenceCategory code."""
    return TABLE_TYPE_TO_CATEGORY.get(table_type, table_type)


WORKFLOW_MANAGED_REFERENCE_TABLES: set[str] = set()


class ReferenceTableRecordService:
    """Domain service for reference table record CRUD.

    Follows the same pattern as DepartmentService and StructureService:
    static methods, @transaction.atomic on write operations, and
    domain-specific error types raised on validation/not-found failures.
    """

    # ── Validation ──

    @staticmethod
    def validate_input(
        *,
        table_type: str,
        code: str,
        name: str,
        description: str = "",
        usage_context: str = "",
        current_id: Optional[str] = None,
    ) -> list[ReferenceValidationError]:
        """Validate a reference item input without side effects.

        Returns a list of ReferenceValidationError objects (empty = valid).
        The mutation layer converts these to MutationError for GraphQL responses.
        """
        errors: list[ReferenceValidationError] = []

        if table_type in WORKFLOW_MANAGED_REFERENCE_TABLES:
            errors.append(ReferenceValidationError(
                field="tableType", code="WORKFLOW_MANAGED",
                message="This table is managed by the staff workflow. Direct edits are not allowed.",
            ))
            return errors

        # Staff user / assignment have different validation rules
        if table_type in {"staff_user", "staff_assignment"}:
            if not name.strip():
                errors.append(ReferenceValidationError(
                    field="name", code="REQUIRED", message="Name is required",
                ))
            if table_type == "staff_assignment" and not (usage_context or "").strip():
                errors.append(ReferenceValidationError(
                    field="usageContext", code="REQUIRED", message="Usage context is required",
                ))
            return errors

        # Standard reference value validation
        if not code.strip():
            errors.append(ReferenceValidationError(
                field="code", code="REQUIRED", message="Code is required",
            ))
        if not name.strip():
            errors.append(ReferenceValidationError(
                field="name", code="REQUIRED", message="Name is required",
            ))
        if not description.strip():
            errors.append(ReferenceValidationError(
                field="description", code="REQUIRED", message="Description is required",
            ))
        if not usage_context.strip():
            errors.append(ReferenceValidationError(
                field="usageContext", code="REQUIRED", message="Usage context is required",
            ))

        # Duplicate code check (case-insensitive)
        if code.strip():
            cat_code = table_type_to_category(table_type)
            duplicate_qs = ReferenceValue.objects.filter(
                category__code=cat_code, code__iexact=code.strip(),
            )
            if current_id:
                duplicate_qs = duplicate_qs.exclude(id=current_id)
            if duplicate_qs.exists():
                errors.append(ReferenceValidationError(
                    field="code", code="DUPLICATE",
                    message="Code must be unique inside this table",
                ))

        return errors

    # ── Create ──

    @staticmethod
    @transaction.atomic
    def create(
        table_type: str,
        code: str,
        name: str,
        description: str = "",
        usage_context: str = "",
        sort_order: int = 0,
        is_active: bool = True,
    ) -> ReferenceValue:
        """Create a new ReferenceValue record.

        Raises ReferenceTableServiceError if the category is not found.
        """
        cat_code = table_type_to_category(table_type)
        try:
            cat = ReferenceCategory.objects.get(code=cat_code)
        except ReferenceCategory.DoesNotExist:
            raise ReferenceTableServiceError(
                "tableType", "INVALID",
                f"Unknown table type: {table_type}",
            )

        rv = ReferenceValue.objects.create(
            category=cat,
            code=code.strip(),
            name=name.strip(),
            description=description.strip(),
            usage_context=usage_context.strip(),
            sort_order=sort_order,
            is_active=is_active,
        )
        return rv

    # ── Update ──

    @staticmethod
    @transaction.atomic
    def update(
        id: str,
        code: str,
        name: str,
        description: str = "",
        usage_context: str = "",
        sort_order: int = 0,
        is_active: Optional[bool] = None,
    ) -> ReferenceValue:
        """Update an existing ReferenceValue record.

        Raises ReferenceTableServiceError if:
        - The record is not found
        - The record is system-managed or non-configurable
        """
        try:
            rv = ReferenceValue.objects.get(id=id)
        except ReferenceValue.DoesNotExist:
            raise ReferenceTableServiceError(
                "id", "NOT_FOUND", "Reference item not found",
            )

        if rv.is_system_managed or not rv.is_configurable:
            raise ReferenceTableServiceError(
                "id", "SYSTEM_MANAGED",
                "System-managed records cannot be edited here",
            )

        rv.code = code.strip()
        rv.name = name.strip()
        rv.description = description.strip()
        rv.usage_context = usage_context.strip()
        rv.sort_order = sort_order
        if is_active is not None:
            rv.is_active = is_active
        rv.save()
        return rv

    # ── Deactivate ──

    @staticmethod
    @transaction.atomic
    def deactivate(id: str) -> ReferenceValue:
        """Deactivate a ReferenceValue record.

        Raises ReferenceTableServiceError if:
        - The record is not found
        - The record is system-managed or non-configurable
        """
        try:
            rv = ReferenceValue.objects.get(id=id)
        except ReferenceValue.DoesNotExist:
            raise ReferenceTableServiceError(
                "id", "NOT_FOUND", "Reference item not found",
            )

        if rv.is_system_managed or not rv.is_configurable:
            raise ReferenceTableServiceError(
                "id", "SYSTEM_MANAGED",
                "System-managed records cannot be deactivated here",
            )

        rv.is_active = False
        rv.save()
        return rv
