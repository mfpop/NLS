from __future__ import annotations

from typing import Any

from django.db import transaction, models as db_models

from manufacturing.models import MappingRule

VALID_DOMAINS = frozenset({
    "PLANT_STRUCTURE", "MATERIALS", "BOM", "ROUTING",
    "SCHEDULES", "INVENTORY", "PRODUCTS",
})


class MappingRuleError(ValueError):
    def __init__(self, field: str, message: str, code: str = "VALIDATION") -> None:
        super().__init__(message)
        self.field = field
        self.code = code
        self.message = message


class MappingRuleService:
    """Full CRUD for Mapping Rules with duplicate detection and validation."""

    # ── Query methods ──

    @staticmethod
    def list(
        domain: str | None = None,
        active_only: bool = False,
        sort_by: str = "domain",
        sort_order: str = "asc",
    ):
        """Return a QuerySet of MappingRule, optionally filtered."""
        qs = MappingRule.objects.all()
        if domain:
            qs = qs.filter(domain=domain.upper())
        if active_only:
            qs = qs.filter(is_active=True)

        # Validate sort field
        allowed_sort_fields = {"domain", "source_field", "destination_field",
                               "is_active", "is_required", "created_at", "updated_at"}
        if sort_by not in allowed_sort_fields:
            sort_by = "domain"

        order_prefix = "-" if sort_order.lower() == "desc" else ""
        return qs.order_by(f"{order_prefix}{sort_by}")

    @staticmethod
    def get(rule_id: str | int) -> MappingRule:
        try:
            return MappingRule.objects.get(id=rule_id)
        except MappingRule.DoesNotExist:
            raise MappingRuleError("id", "Mapping rule not found", "NOT_FOUND")

    @staticmethod
    def get_by_domain(domain: str, active_only: bool = True) -> list[MappingRule]:
        """Get all rules for a given domain."""
        qs = MappingRule.objects.filter(domain=domain.upper())
        if active_only:
            qs = qs.filter(is_active=True)
        return list(qs.order_by("source_field"))

    # ── Validation helpers ──

    @staticmethod
    def _validate_domain(domain: str) -> str:
        domain = domain.strip().upper()
        if not domain:
            raise MappingRuleError("domain", "Domain is required", "REQUIRED")
        if domain not in VALID_DOMAINS:
            raise MappingRuleError(
                "domain", f"Invalid domain: {domain}. Must be one of: {', '.join(sorted(VALID_DOMAINS))}", "INVALID"
            )
        return domain

    @staticmethod
    def _validate_source_field(value: str) -> str:
        value = value.strip()
        if not value:
            raise MappingRuleError("sourceField", "Source (ERP) field is required", "REQUIRED")
        if len(value) > 200:
            raise MappingRuleError("sourceField", "Source field must be 200 characters or less", "MAX_LENGTH")
        return value

    @staticmethod
    def _validate_destination_field(value: str) -> str:
        value = value.strip()
        if not value:
            raise MappingRuleError("destinationField", "Destination (Nexus) field is required", "REQUIRED")
        if len(value) > 200:
            raise MappingRuleError("destinationField", "Destination field must be 200 characters or less", "MAX_LENGTH")
        return value

    @staticmethod
    def _check_duplicate(
        domain: str,
        source_field: str,
        exclude_id: str | int | None = None,
    ) -> None:
        """Raise if another active rule exists with the same domain+source_field."""
        qs = MappingRule.objects.filter(
            domain=domain.upper(),
            source_field__iexact=source_field.strip(),
            is_active=True,
        )
        if exclude_id:
            qs = qs.exclude(pk=exclude_id)
        if qs.exists():
            existing = qs.first()
            raise MappingRuleError(
                "sourceField",
                f"An active rule already maps '{source_field}' in domain {domain} "
                f"(current destination: {existing.destination_field})",
                "DUPLICATE",
            )

    # ── CRUD ──

    @classmethod
    @transaction.atomic
    def create(cls, input_data) -> MappingRule:
        """Create a mapping rule from an object-like input (attribute access)."""
        domain = cls._validate_domain(getattr(input_data, 'domain', ""))
        source_field = cls._validate_source_field(getattr(input_data, 'source_field', ""))
        destination_field = cls._validate_destination_field(getattr(input_data, 'destination_field', ""))
        transform_rule = getattr(input_data, 'transform_rule', None)
        is_required = bool(getattr(input_data, 'is_required', False))

        cls._check_duplicate(domain, source_field)

        return MappingRule.objects.create(
            domain=domain,
            source_field=source_field,
            destination_field=destination_field,
            transform_rule=transform_rule.strip() if transform_rule else None,
            is_required=is_required,
        )

    @classmethod
    @transaction.atomic
    def create_from_dict(cls, data: dict[str, Any]) -> MappingRule:
        """Create a mapping rule from a dict (for GraphQL dict-based input)."""
        domain = cls._validate_domain(data.get("domain") or "")
        source_field = cls._validate_source_field(data.get("source_field") or "")
        destination_field = cls._validate_destination_field(data.get("destination_field") or "")
        transform_rule = data.get("transform_rule")
        is_required = bool(data.get("is_required", False))

        cls._check_duplicate(domain, source_field)

        return MappingRule.objects.create(
            domain=domain,
            source_field=source_field,
            destination_field=destination_field,
            transform_rule=transform_rule.strip() if transform_rule else None,
            is_required=is_required,
        )

    @classmethod
    @transaction.atomic
    def update(cls, rule_id: str | int, input_data) -> MappingRule:
        """Update a mapping rule from an object-like input."""
        rule = cls.get(rule_id)

        domain = cls._validate_domain(getattr(input_data, 'domain', rule.domain))
        source_field = cls._validate_source_field(getattr(input_data, 'source_field', rule.source_field))
        destination_field = cls._validate_destination_field(getattr(input_data, 'destination_field', rule.destination_field))
        transform_rule = getattr(input_data, 'transform_rule', None)
        is_required = getattr(input_data, 'is_required', None)

        cls._check_duplicate(domain, source_field, exclude_id=rule_id)

        rule.domain = domain
        rule.source_field = source_field
        rule.destination_field = destination_field
        if transform_rule is not None:
            rule.transform_rule = transform_rule.strip() if transform_rule else None
        if is_required is not None:
            rule.is_required = bool(is_required)
        rule.save()
        return rule

    @classmethod
    @transaction.atomic
    def update_from_dict(cls, rule_id: str | int, data: dict[str, Any]) -> MappingRule:
        """Update a mapping rule from a dict."""
        rule = cls.get(rule_id)

        if "domain" in data and data["domain"] is not None:
            rule.domain = cls._validate_domain(data["domain"])
        if "source_field" in data and data["source_field"] is not None:
            rule.source_field = cls._validate_source_field(data["source_field"])
        if "destination_field" in data and data["destination_field"] is not None:
            rule.destination_field = cls._validate_destination_field(data["destination_field"])
        if "transform_rule" in data:
            rule.transform_rule = data["transform_rule"].strip() if data["transform_rule"] else None
        if "is_required" in data:
            rule.is_required = bool(data["is_required"])

        cls._check_duplicate(rule.domain, rule.source_field, exclude_id=rule_id)

        rule.save()
        return rule

    @classmethod
    @transaction.atomic
    def archive(cls, rule_id: str | int) -> MappingRule:
        """Soft-delete: set is_active=False."""
        rule = cls.get(rule_id)
        if not rule.is_active:
            raise MappingRuleError("id", "Rule is already inactive", "ALREADY_INACTIVE")
        rule.is_active = False
        rule.save(update_fields=["is_active", "updated_at"])
        return rule

    @classmethod
    @transaction.atomic
    def restore(cls, rule_id: str | int) -> MappingRule:
        """Restore an archived rule."""
        rule = cls.get(rule_id)
        if rule.is_active:
            raise MappingRuleError("id", "Rule is already active", "ALREADY_ACTIVE")
        cls._check_duplicate(rule.domain, rule.source_field)
        rule.is_active = True
        rule.save(update_fields=["is_active", "updated_at"])
        return rule

    @classmethod
    @transaction.atomic
    def bulk_create(cls, rules: list[dict[str, Any]]) -> list[MappingRule]:
        """Create multiple rules in a single transaction."""
        created: list[MappingRule] = []
        for data in rules:
            rule = cls.create_from_dict(data)
            created.append(rule)
        return created
