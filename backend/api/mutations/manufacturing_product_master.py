import strawberry
import typing
from strawberry.types import Info
from django.db import transaction
from api.permissions import ensure_access
from api.types.manufacturing import (
    ProductFamilyInput, ProductFamilyNode, ProductFamilyPayload,
    ProductModelInput, ProductModelNode, ProductModelPayload,
    ProductVariantInput, ProductVariantNode, ProductVariantPayload,
    PartNumberInput, PartNumberNode, PartNumberPayload,
    BomInput, BOMNode, BomPayload,
    RoutingNode, RoutingPayload, RoutingInput,
    RoutingStepNode, RoutingStepPayload, RoutingStepInput,
    ReorderStepsInput, SaveRoutingInput,
    MutationError,
)
from manufacturing.domain.product_identity_service import ProductIdentityError, ProductIdentityService
from manufacturing.domain.routing_service import RoutingService, RoutingValidationError


def _user(info):
    return info.context.user


def _product_identity_error(payload_cls, exc: ProductIdentityError):
    return payload_cls(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])


@strawberry.type
class ManufacturingProductMasterMutation:

    # ── Product Family ──

    @strawberry.mutation
    @transaction.atomic
    def create_product_family(self, info: Info, input: ProductFamilyInput) -> ProductFamilyPayload:
        ensure_access(user=_user(info), action="manage_product_master")
        from manufacturing.models import ProductFamily
        try:
            family = ProductFamily.objects.create(
                code=input.code, name=input.name, description=input.description or "",
                is_active=True,
            )
            return ProductFamilyPayload(ok=True, family=ProductFamilyNode.from_db(family))
        except Exception as exc:
            return ProductFamilyPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])

    @strawberry.mutation
    @transaction.atomic
    def update_product_family(self, info: Info, id: str, input: ProductFamilyInput) -> ProductFamilyPayload:
        ensure_access(user=_user(info), action="manage_product_master")
        from manufacturing.models import ProductFamily
        try:
            family = ProductFamily.objects.get(id=id)
            if input.code is not None: family.code = input.code
            if input.name is not None: family.name = input.name
            if input.description is not None: family.description = input.description
            family.save()
            return ProductFamilyPayload(ok=True, family=ProductFamilyNode.from_db(family))
        except ProductFamily.DoesNotExist:
            return ProductFamilyPayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Family not found")])
        except Exception as exc:
            return ProductFamilyPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])

    @strawberry.mutation
    @transaction.atomic
    def archive_product_family(self, info: Info, id: str) -> ProductFamilyPayload:
        ensure_access(user=_user(info), action="manage_product_master")
        from manufacturing.models import ProductFamily
        try:
            family = ProductFamily.objects.get(id=id)
            family.is_active = False
            family.save()
            return ProductFamilyPayload(ok=True, family=ProductFamilyNode.from_db(family))
        except ProductFamily.DoesNotExist:
            return ProductFamilyPayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Family not found")])

    # ── Product Model ──

    @strawberry.mutation
    @transaction.atomic
    def create_product_model(self, info: Info, input: ProductModelInput) -> ProductModelPayload:
        ensure_access(user=_user(info), action="manage_product_master")
        from manufacturing.models import ProductModel
        try:
            model = ProductModel.objects.create(
                code=input.code, name=input.name,
                family_id=input.family_id,
                description=input.description or "",
                is_active=True,
            )
            return ProductModelPayload(ok=True, model=ProductModelNode.from_db(model))
        except Exception as exc:
            return ProductModelPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])

    @strawberry.mutation
    @transaction.atomic
    def update_product_model(self, info: Info, id: str, input: ProductModelInput) -> ProductModelPayload:
        ensure_access(user=_user(info), action="manage_product_master")
        from manufacturing.models import ProductModel
        try:
            model = ProductModel.objects.get(id=id)
            if input.code is not None: model.code = input.code
            if input.name is not None: model.name = input.name
            if input.family_id is not None: model.family_id = input.family_id
            if input.description is not None: model.description = input.description
            model.save()
            return ProductModelPayload(ok=True, model=ProductModelNode.from_db(model))
        except ProductModel.DoesNotExist:
            return ProductModelPayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Model not found")])
        except Exception as exc:
            return ProductModelPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])

    @strawberry.mutation
    @transaction.atomic
    def archive_product_model(self, info: Info, id: str) -> ProductModelPayload:
        ensure_access(user=_user(info), action="manage_product_master")
        from manufacturing.models import ProductModel
        try:
            model = ProductModel.objects.get(id=id)
            model.is_active = False
            model.save()
            return ProductModelPayload(ok=True, model=ProductModelNode.from_db(model))
        except ProductModel.DoesNotExist:
            return ProductModelPayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Model not found")])

    # ── Product Variant ──

    @strawberry.mutation
    @transaction.atomic
    def create_product_variant(self, info: Info, input: ProductVariantInput) -> ProductVariantPayload:
        ensure_access(user=_user(info), action="manage_product_master")
        from manufacturing.models import ProductVariant
        try:
            variant = ProductVariant.objects.create(
                model_id=input.model_id, code=input.code, name=input.name,
                part_number=input.part_number or "",
                is_active=True,
            )
            return ProductVariantPayload(ok=True, variant=ProductVariantNode.from_db(variant))
        except Exception as exc:
            return ProductVariantPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])

    @strawberry.mutation
    @transaction.atomic
    def update_product_variant(self, info: Info, id: str, input: ProductVariantInput) -> ProductVariantPayload:
        ensure_access(user=_user(info), action="manage_product_master")
        from manufacturing.models import ProductVariant
        try:
            variant = ProductVariant.objects.get(id=id)
            if input.model_id is not None: variant.model_id = input.model_id
            if input.code is not None: variant.code = input.code
            if input.name is not None: variant.name = input.name
            if input.part_number is not None: variant.part_number = input.part_number
            variant.save()
            return ProductVariantPayload(ok=True, variant=ProductVariantNode.from_db(variant))
        except ProductVariant.DoesNotExist:
            return ProductVariantPayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Variant not found")])
        except Exception as exc:
            return ProductVariantPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])

    @strawberry.mutation
    @transaction.atomic
    def archive_product_variant(self, info: Info, id: str) -> ProductVariantPayload:
        ensure_access(user=_user(info), action="manage_product_master")
        from manufacturing.models import ProductVariant
        try:
            variant = ProductVariant.objects.get(id=id)
            variant.is_active = False
            variant.save()
            return ProductVariantPayload(ok=True, variant=ProductVariantNode.from_db(variant))
        except ProductVariant.DoesNotExist:
            return ProductVariantPayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Variant not found")])

    # ── Part Number ──

    @strawberry.mutation
    @transaction.atomic
    def create_part_number(self, info: Info, input: PartNumberInput) -> PartNumberPayload:
        ensure_access(user=_user(info), action="manage_product_master")
        from manufacturing.models import PartNumber
        try:
            pn = ProductIdentityService.create_part_number(
                variant_id=input.variant_id,
                part_number=input.part_number,
                description=input.description or "",
            )
            return PartNumberPayload(ok=True, part_number=PartNumberNode.from_db(pn))
        except ProductIdentityError as exc:
            return _product_identity_error(PartNumberPayload, exc)

    @strawberry.mutation
    @transaction.atomic
    def update_part_number(self, info: Info, id: str, input: PartNumberInput) -> PartNumberPayload:
        ensure_access(user=_user(info), action="manage_product_master")
        try:
            pn = ProductIdentityService.update_part_number(id, input)
            return PartNumberPayload(ok=True, part_number=PartNumberNode.from_db(pn))
        except ProductIdentityError as exc:
            return _product_identity_error(PartNumberPayload, exc)

    @strawberry.mutation
    @transaction.atomic
    def archive_part_number(self, info: Info, id: str) -> PartNumberPayload:
        ensure_access(user=_user(info), action="manage_product_master")
        try:
            pn = ProductIdentityService.archive_part_number(id)
            return PartNumberPayload(ok=True, part_number=PartNumberNode.from_db(pn))
        except ProductIdentityError as exc:
            return _product_identity_error(PartNumberPayload, exc)

    # ── BOM ──

    @strawberry.mutation
    @transaction.atomic
    def create_bom(self, info: Info, input: BomInput) -> BomPayload:
        ensure_access(user=_user(info), action="manage_bom")
        from manufacturing.models import BOM
        try:
            bom = BOM.objects.create(
                product_variant_id=input.product_variant_id,
                description=input.description or "",
                is_active=True,
            )
            return BomPayload(ok=True, bom=BOMNode.from_db(bom))
        except Exception as exc:
            return BomPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])

    @strawberry.mutation
    @transaction.atomic
    def update_bom(self, info: Info, id: str, input: BomInput) -> BomPayload:
        ensure_access(user=_user(info), action="manage_bom")
        from manufacturing.models import BOM
        try:
            bom = BOM.objects.get(id=id)
            if input.product_variant_id is not None: bom.product_variant_id = input.product_variant_id
            if input.description is not None: bom.description = input.description
            bom.save()
            return BomPayload(ok=True, bom=BOMNode.from_db(bom))
        except BOM.DoesNotExist:
            return BomPayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="BOM not found")])
        except Exception as exc:
            return BomPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])

    @strawberry.mutation
    @transaction.atomic
    def archive_bom(self, info: Info, id: str) -> BomPayload:
        ensure_access(user=_user(info), action="manage_bom")
        from manufacturing.models import BOM
        try:
            bom = BOM.objects.get(id=id)
            bom.is_active = False
            bom.save()
            return BomPayload(ok=True, bom=BOMNode.from_db(bom))
        except BOM.DoesNotExist:
            return BomPayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="BOM not found")])

    # ── Routing ──

    @strawberry.mutation
    @transaction.atomic
    def create_routing(self, info: Info, input: RoutingInput) -> RoutingPayload:
        ensure_access(user=_user(info), action="manage_routing")
        from manufacturing.models import Routing
        try:
            routing = Routing.objects.create(
                production_line_id=input.production_line_id,
                product_variant_id=input.product_variant_id,
                name=input.name or "",
                description=input.description or "",
                version=input.version or 1,
                status="DRAFT",
                is_active=True,
            )
            return RoutingPayload(ok=True, routing=RoutingNode.from_db(routing))
        except Exception as exc:
            return RoutingPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])

    @strawberry.mutation
    @transaction.atomic
    def update_routing(self, info: Info, id: str, input: RoutingInput) -> RoutingPayload:
        ensure_access(user=_user(info), action="manage_routing")
        from manufacturing.models import Routing
        try:
            routing = Routing.objects.get(id=id)
            if input.production_line_id is not None: routing.production_line_id = input.production_line_id
            if input.product_variant_id is not None: routing.product_variant_id = input.product_variant_id
            if input.name is not None: routing.name = input.name
            if input.description is not None: routing.description = input.description
            if input.version is not None: routing.version = input.version
            routing.save()
            return RoutingPayload(ok=True, routing=RoutingNode.from_db(routing))
        except Routing.DoesNotExist:
            return RoutingPayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Routing not found")])
        except Exception as exc:
            return RoutingPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])

    @strawberry.mutation
    @transaction.atomic
    def activate_routing(self, info: Info, id: str) -> RoutingPayload:
        ensure_access(user=_user(info), action="manage_routing")
        from manufacturing.models import Routing
        try:
            routing = Routing.objects.get(id=id)
            routing.status = "ACTIVE"
            routing.save()
            return RoutingPayload(ok=True, routing=RoutingNode.from_db(routing))
        except Routing.DoesNotExist:
            return RoutingPayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Routing not found")])

    @strawberry.mutation
    @transaction.atomic
    def archive_routing(self, info: Info, id: str) -> RoutingPayload:
        ensure_access(user=_user(info), action="manage_routing")
        from manufacturing.models import Routing
        try:
            routing = Routing.objects.get(id=id)
            routing.is_active = False
            routing.save()
            return RoutingPayload(ok=True, routing=RoutingNode.from_db(routing))
        except Routing.DoesNotExist:
            return RoutingPayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Routing not found")])

    @strawberry.mutation
    @transaction.atomic
    def save_routing(self, info: Info, input: SaveRoutingInput) -> RoutingPayload:
        ensure_access(user=_user(info), action="manage_routing")
        from manufacturing.models import Routing
        try:
            routing = RoutingService.save_routing(input)
            return RoutingPayload(ok=True, routing=RoutingNode.from_db(routing))
        except RoutingValidationError as exc:
            return RoutingPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    # ── Routing Steps ──

    @strawberry.mutation
    @transaction.atomic
    def create_routing_step(self, info: Info, routing_id: str, input: RoutingStepInput) -> RoutingStepPayload:
        ensure_access(user=_user(info), action="manage_routing")
        try:
            step = RoutingService.add_step(routing_id, input)
            return RoutingStepPayload(ok=True, step=RoutingStepNode.from_db(step))
        except RoutingValidationError as exc:
            return RoutingStepPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation
    @transaction.atomic
    def update_routing_step(self, info: Info, id: str, input: RoutingStepInput) -> RoutingStepPayload:
        ensure_access(user=_user(info), action="manage_routing")
        try:
            step = RoutingService.update_step(id, input)
            return RoutingStepPayload(ok=True, step=RoutingStepNode.from_db(step))
        except RoutingValidationError as exc:
            return RoutingStepPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation
    @transaction.atomic
    def delete_routing_step(self, info: Info, id: str) -> RoutingStepPayload:
        ensure_access(user=_user(info), action="manage_routing")
        try:
            RoutingService.delete_step(id)
            return RoutingStepPayload(ok=True, step=None)
        except RoutingValidationError as exc:
            return RoutingStepPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation
    @transaction.atomic
    def reorder_routing_steps(self, info: Info, input: ReorderStepsInput) -> RoutingStepPayload:
        ensure_access(user=_user(info), action="manage_routing")
        try:
            steps = RoutingService.reorder_steps(input.routing_id, input.step_ids)
            return RoutingStepPayload(ok=True, steps=[RoutingStepNode.from_db(s) for s in steps])
        except RoutingValidationError as exc:
            return RoutingStepPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])
