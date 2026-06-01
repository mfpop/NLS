from __future__ import annotations

# pylint: disable=no-member

from dataclasses import dataclass
from typing import Any

from django.db import transaction

from manufacturing.models import BOM, PartNumber, ProductFamily, ProductModel, ProductVariant, Routing


@dataclass
class ProductIdentityError(Exception):
    field: str
    code: str
    message: str


class ProductIdentityService:
    @staticmethod
    def _clean_code(value: str, field: str = "code") -> str:
        code = (value or "").strip()
        if not code:
            raise ProductIdentityError(field, "REQUIRED", f"{field} is required.")
        return code

    @staticmethod
    def _get_family(family_id: str) -> ProductFamily:
        try:
            return ProductFamily.objects.get(id=family_id)
        except ProductFamily.DoesNotExist as exc:
            raise ProductIdentityError("familyId", "NOT_FOUND", "Product family not found.") from exc

    @staticmethod
    def _get_model(model_id: str) -> ProductModel:
        try:
            return ProductModel.objects.select_related("family").get(id=model_id)
        except ProductModel.DoesNotExist as exc:
            raise ProductIdentityError("modelId", "NOT_FOUND", "Product model not found.") from exc

    @staticmethod
    def _get_variant(variant_id: str | None) -> ProductVariant | None:
        if not variant_id:
            return None
        try:
            return ProductVariant.objects.select_related("model").get(id=variant_id)
        except ProductVariant.DoesNotExist as exc:
            raise ProductIdentityError("variantId", "NOT_FOUND", "Product variant not found.") from exc

    @classmethod
    def validate_part_hierarchy(cls, family: ProductFamily, model: ProductModel, variant: ProductVariant | None = None) -> None:
        if model.family_id and model.family_id != family.id:
            raise ProductIdentityError("familyId", "FAMILY_MODEL_MISMATCH", "Part number family must match product model family.")
        if variant and variant.model_id != model.id:
            raise ProductIdentityError("variantId", "VARIANT_MODEL_MISMATCH", "Product variant must belong to the selected model.")

    @classmethod
    @transaction.atomic
    def create_family(cls, data: dict[str, Any]) -> ProductFamily:
        return ProductFamily.objects.create(
            code=cls._clean_code(data.get("code")),
            name=(data.get("name") or "").strip(),
            description=data.get("description") or "",
            status=data.get("status") or "ACTIVE",
            is_active=data.get("is_active", True),
        )

    @classmethod
    @transaction.atomic
    def update_family(cls, family_id: str, data: dict[str, Any]) -> ProductFamily:
        family = cls._get_family(family_id)
        for field in ("code", "name", "description", "status", "is_active"):
            if field in data and data[field] is not None:
                setattr(family, field, cls._clean_code(data[field]) if field == "code" else data[field])
        family.save()
        return family

    @classmethod
    @transaction.atomic
    def archive_family(cls, family_id: str) -> ProductFamily:
        family = cls._get_family(family_id)
        family.is_active = False
        family.status = "ARCHIVED"
        family.save()
        return family

    @classmethod
    @transaction.atomic
    def create_model(cls, data: dict[str, Any]) -> ProductModel:
        family = cls._get_family(data.get("family_id"))
        return ProductModel.objects.create(
            family=family,
            code=cls._clean_code(data.get("code")),
            name=(data.get("name") or "").strip(),
            description=data.get("description") or "",
            status=data.get("status") or "ACTIVE",
        )

    @classmethod
    @transaction.atomic
    def update_model(cls, model_id: str, data: dict[str, Any]) -> ProductModel:
        model = cls._get_model(model_id)
        if data.get("family_id"):
            model.family = cls._get_family(data["family_id"])
        for field in ("code", "name", "description", "status"):
            if field in data and data[field] is not None:
                setattr(model, field, cls._clean_code(data[field]) if field == "code" else data[field])
        model.save()
        return model

    @classmethod
    @transaction.atomic
    def archive_model(cls, model_id: str) -> ProductModel:
        model = cls._get_model(model_id)
        model.status = "ARCHIVED"
        model.save()
        return model

    @classmethod
    @transaction.atomic
    def create_variant(cls, data: dict[str, Any]) -> ProductVariant:
        model = cls._get_model(data.get("model_id"))
        part_number = data.get("part_number")
        if part_number is not None:
            part_number = str(part_number).strip() or None
        return ProductVariant.objects.create(
            model=model,
            code=cls._clean_code(data.get("code")),
            name=(data.get("name") or "").strip(),
            configuration_summary=data.get("configuration_summary") or "",
            part_number=part_number,
            status=data.get("status") or "ACTIVE",
            is_active=data.get("is_active", True),
        )

    @classmethod
    @transaction.atomic
    def update_variant(cls, variant_id: str, data: dict[str, Any]) -> ProductVariant:
        variant = cls._get_variant(variant_id)
        if variant is None:
            raise ProductIdentityError("variantId", "NOT_FOUND", "Product variant not found.")
        if data.get("model_id"):
            variant.model = cls._get_model(data["model_id"])
        if "part_number" in data:
            pn = data["part_number"]
            variant.part_number = str(pn).strip() if pn is not None else None
        for field in ("code", "name", "configuration_summary", "status", "is_active"):
            if field in data and data[field] is not None:
                setattr(variant, field, cls._clean_code(data[field]) if field == "code" else data[field])
        variant.save()
        return variant

    @classmethod
    @transaction.atomic
    def archive_variant(cls, variant_id: str) -> ProductVariant:
        variant = cls._get_variant(variant_id)
        if variant is None:
            raise ProductIdentityError("variantId", "NOT_FOUND", "Product variant not found.")
        variant.is_active = False
        variant.status = "ARCHIVED"
        variant.save()
        return variant

    @classmethod
    @transaction.atomic
    def create_part_number(cls, data: dict[str, Any]) -> PartNumber:
        """Create a part number by writing to ProductVariant.part_number.
        No standalone PartNumber row is created — this is the deprecated compatibility path."""
        variant_id = data.get("variant_id")
        if not variant_id:
            raise ProductIdentityError("variantId", "REQUIRED", "Product variant is required for part number assignment.")
        variant = cls._get_variant(variant_id)
        family = cls._get_family(data.get("family_id"))
        model = cls._get_model(data.get("model_id"))
        cls.validate_part_hierarchy(family, model, variant)
        pn_value = cls._clean_code(data.get("part_number"), "partNumber")
        if ProductVariant.objects.filter(part_number=pn_value).exclude(id=variant.id).exists():
            raise ProductIdentityError("partNumber", "DUPLICATE", f"Part number '{pn_value}' is already assigned to another variant.")
        variant.part_number = pn_value
        variant.save()
        return PartNumber(
            id=0, family=family, model=model, variant=variant,
            part_number=pn_value,
            description=data.get("description") or "",
            revision=data.get("revision") or "",
            uom=data.get("uom") or "EA",
            status=data.get("status") or "ACTIVE",
            is_active=data.get("is_active", True),
        )

    @classmethod
    @transaction.atomic
    def update_part_number(cls, part_id: str, data: dict[str, Any]) -> PartNumber:
        """Compatibility-only: updates are handled via ProductVariant mutation.
        If a PartNumber row exists (legacy), update it; otherwise update variant variant_data."""
        try:
            part = PartNumber.objects.select_related("family", "model", "variant").get(id=part_id)
        except PartNumber.DoesNotExist:
            raise ProductIdentityError("id", "NOT_FOUND", "Part number not found. Use updateProductVariant to modify variant-level part numbers.")
        if part.variant and "part_number" in data:
            pn = cls._clean_code(data["part_number"], "partNumber")
            part.variant.part_number = pn
            part.variant.save()
        family = cls._get_family(data["family_id"]) if data.get("family_id") else part.family
        model = cls._get_model(data["model_id"]) if data.get("model_id") else part.model
        variant = cls._get_variant(data["variant_id"]) if "variant_id" in data else part.variant
        cls.validate_part_hierarchy(family, model, variant)
        part.family = family
        part.model = model
        part.variant = variant
        for field in ("part_number", "description", "revision", "uom", "status", "is_active"):
            if field in data and data[field] is not None:
                setattr(part, field, cls._clean_code(data[field], "partNumber") if field == "part_number" else data[field])
        part.save()
        return part

    @classmethod
    @transaction.atomic
    def archive_part_number(cls, part_id: str) -> PartNumber:
        """Compatibility-only: archives a legacy PartNumber row if it exists."""
        try:
            part = PartNumber.objects.get(id=part_id)
        except PartNumber.DoesNotExist as exc:
            raise ProductIdentityError("id", "NOT_FOUND", "Part number not found.") from exc
        if part.variant:
            part.variant.part_number = None
            part.variant.save()
        part.is_active = False
        part.status = "ARCHIVED"
        part.save()
        return part

    @staticmethod
    def is_part_number_referenced(part: PartNumber) -> bool:
        return Routing.objects.filter(part_number=part).exists() or BOM.objects.filter(part_number=part).exists()
