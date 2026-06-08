# -*- coding: utf-8 -*-
"""
Add audit template CRUD:
1. Service method: AuditTemplateService.update_template_metadata
2. GraphQL input types: AuditTemplateCreateInput, AuditTemplateUpdateInput,
   AuditTemplateCategoryInput, AuditTemplateQuestionInput
3. GraphQL mutations: createAuditTemplate, updateAuditTemplate,
   addAuditTemplateCategory, updateAuditTemplateCategory, removeAuditTemplateCategory,
   addAuditTemplateQuestion, updateAuditTemplateQuestion, removeAuditTemplateQuestion
"""
import sys

def log(msg):
    sys.stdout.write(msg + "\n")
    sys.stdout.flush()

# --- Step 1: Add service method ---

with open('manufacturing/domain/audit_service.py', 'r', encoding='utf-8') as f:
    svc_content = f.read()

marker = "        return clone"
new_method = """        return clone

    @classmethod
    @transaction.atomic
    def update_template_metadata(
        cls,
        template_id: int,
        name: Optional[str] = None,
        module_scope: Optional[str] = None,
        target_types: Optional[list] = None,
    ) -> AuditTemplate:
        template = AuditTemplate.objects.filter(id=template_id).first()
        if not template:
            raise AuditServiceError(
                field="templateId", code="TEMPLATE_NOT_FOUND",
                message=f"Audit template {template_id} not found",
            )
        if name is not None:
            template.name = name
        if module_scope is not None:
            template.module_scope = module_scope
        if target_types is not None:
            template.target_types = target_types
        template.save()
        return template"""

if marker in svc_content:
    svc_content = svc_content.replace(marker, new_method, 1)
    with open('manufacturing/domain/audit_service.py', 'w', encoding='utf-8') as f:
        f.write(svc_content)
    log("OK - Added update_template_metadata to AuditTemplateService")
else:
    log("ERROR - Marker not found in audit_service.py")

# --- Step 2: Add GraphQL input types ---

with open('api/types/manufacturing.py', 'r', encoding='utf-8') as f:
    types_content = f.read()

# Check what's already there
if 'class AuditTemplateCreateInput' in types_content:
    log("INFO - AuditTemplateCreateInput already exists, skipping input types")
else:
    # Find position to insert - before AuditAnswerPayload
    insert_before = "\n@strawberry.type\nclass AuditAnswerPayload:"
    input_types = """

# --- Audit Template CRUD Inputs ---

@strawberry.input
class AuditTemplateCreateInput:
    code: str
    name: str
    audit_type: str = strawberry.field(name="auditType")
    module_scope: typing.Optional[str] = strawberry.field(name="moduleScope", default="PRODUCTION_CONTROL")
    target_types: typing.Optional[list[str]] = strawberry.field(name="targetTypes", default=None)

@strawberry.input
class AuditTemplateUpdateInput:
    name: typing.Optional[str] = None
    module_scope: typing.Optional[str] = strawberry.field(name="moduleScope", default=None)
    target_types: typing.Optional[list[str]] = strawberry.field(name="targetTypes", default=None)

@strawberry.input
class AuditTemplateCategoryInput:
    code: str
    name: str
    sequence: typing.Optional[int] = 0
    is_required: typing.Optional[bool] = strawberry.field(name="isRequired", default=True)

@strawberry.input
class AuditTemplateCategoryUpdateInput:
    code: typing.Optional[str] = None
    name: typing.Optional[str] = None
    sequence: typing.Optional[int] = None
    is_required: typing.Optional[bool] = strawberry.field(name="isRequired", default=None)

@strawberry.input
class AuditTemplateQuestionInput:
    code: str
    question: str
    response_type: typing.Optional[str] = strawberry.field(name="responseType", default="PASS_FAIL_NA")
    is_required: typing.Optional[bool] = strawberry.field(name="isRequired", default=True)
    weight: typing.Optional[int] = 1
    sequence: typing.Optional[int] = 0
    help_text: typing.Optional[str] = strawberry.field(name="helpText", default="")

@strawberry.input
class AuditTemplateQuestionUpdateInput:
    code: typing.Optional[str] = None
    question: typing.Optional[str] = None
    response_type: typing.Optional[str] = strawberry.field(name="responseType", default=None)
    is_required: typing.Optional[bool] = strawberry.field(name="isRequired", default=None)
    weight: typing.Optional[int] = None
    sequence: typing.Optional[int] = None
    help_text: typing.Optional[str] = strawberry.field(name="helpText", default=None)
"""

    if insert_before in types_content:
        types_content = types_content.replace(insert_before, input_types + insert_before, 1)
        with open('api/types/manufacturing.py', 'w', encoding='utf-8') as f:
            f.write(types_content)
        log("OK - Added template CRUD input types")
    else:
        log("ERROR - Could not find insertion point in types file")

# --- Step 3: Add mutations ---

with open('api/mutations/manufacturing.py', 'r', encoding='utf-8') as f:
    mut_content = f.read()

# Fix imports
old_import = """    AuditTemplateNode, AuditTemplatePayload,
    CreateAuditFromTemplateInput, SaveAuditAnswerInput, CreateAuditFindingFromAnswerInput,
)"""

new_import = """    AuditTemplateNode, AuditTemplatePayload,
    AuditTemplateCreateInput, AuditTemplateUpdateInput,
    AuditTemplateCategoryInput, AuditTemplateCategoryUpdateInput,
    AuditTemplateQuestionInput, AuditTemplateQuestionUpdateInput,
    CreateAuditFromTemplateInput, SaveAuditAnswerInput, CreateAuditFindingFromAnswerInput,
)"""

if old_import in mut_content:
    mut_content = mut_content.replace(old_import, new_import, 1)
    log("OK - Added imports for template CRUD types")
else:
    # Try alternative import pattern
    old_import2 = """    AuditTemplateNode, AuditTemplatePayload,
    CreateAuditFromTemplateInput, SaveAuditAnswerInput, CreateAuditFindingFromAnswerInput,"""
    new_import2 = """    AuditTemplateNode, AuditTemplatePayload,
    AuditTemplateCreateInput, AuditTemplateUpdateInput,
    AuditTemplateCategoryInput, AuditTemplateCategoryUpdateInput,
    AuditTemplateQuestionInput, AuditTemplateQuestionUpdateInput,
    CreateAuditFromTemplateInput, SaveAuditAnswerInput, CreateAuditFindingFromAnswerInput,"""
    if old_import2 in mut_content:
        mut_content = mut_content.replace(old_import2, new_import2, 1)
        log("OK - Added imports (alt pattern)")
    else:
        log("ERROR - Could not find import section to update")

# Add CRUD mutations - find the install mutation
insert_after = '@strawberry.mutation(name="installDefaultProductionControlAuditTemplates")'

crud_mutations = """
    # --- Audit Template CRUD ---

    @strawberry.mutation(name="createAuditTemplate")
    def create_audit_template(self, info: Info, input: "AuditTemplateCreateInput") -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.models.audit import (
            AuditTemplate, TemplateStatus, ModuleScope,
        )
        try:
            existing = AuditTemplate.objects.filter(code=input.code).first()
            if existing:
                return AuditTemplatePayload(ok=False, errors=[MutationError(field="code", code="DUPLICATE", message=f"Template with code '{input.code}' already exists")])
            template = AuditTemplate.objects.create(
                code=input.code,
                name=input.name,
                audit_type=input.audit_type,
                module_scope=input.module_scope or ModuleScope.PRODUCTION_CONTROL,
                target_types=input.target_types or [],
                version=1,
                status=TemplateStatus.DRAFT,
                is_default=False,
            )
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(template))
        except Exception as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation(name="updateAuditTemplate")
    def update_audit_template(self, info: Info, id: str, input: "AuditTemplateUpdateInput") -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditTemplateService, AuditServiceError
        try:
            template = AuditTemplateService.update_template_metadata(
                template_id=int(id), name=input.name,
                module_scope=input.module_scope, target_types=input.target_types,
            )
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(template))
        except AuditServiceError as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="addAuditTemplateCategory")
    def add_audit_template_category(self, info: Info, template_id: str, input: "AuditTemplateCategoryInput") -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.models.audit import AuditTemplate, AuditTemplateCategory
        try:
            template = AuditTemplate.objects.filter(id=int(template_id)).first()
            if not template:
                return AuditTemplatePayload(ok=False, errors=[MutationError(field="templateId", code="NOT_FOUND", message="Template not found")])
            AuditTemplateCategory.objects.create(
                template=template, code=input.code, name=input.name,
                sequence=input.sequence or 0,
                is_required=input.is_required if input.is_required is not None else True,
            )
            cats = list(AuditTemplateCategory.objects.filter(template=template).prefetch_related("questions").order_by("sequence"))
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(template, categories=cats))
        except Exception as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation(name="updateAuditTemplateCategory")
    def update_audit_template_category(self, info: Info, id: str, input: "AuditTemplateCategoryUpdateInput") -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.models.audit import AuditTemplateCategory
        try:
            category = AuditTemplateCategory.objects.select_related("template").filter(id=int(id)).first()
            if not category:
                return AuditTemplatePayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Category not found")])
            if input.code is not None: category.code = input.code
            if input.name is not None: category.name = input.name
            if input.sequence is not None: category.sequence = input.sequence
            if input.is_required is not None: category.is_required = input.is_required
            category.save()
            cats = list(AuditTemplateCategory.objects.filter(template=category.template).prefetch_related("questions").order_by("sequence"))
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(category.template, categories=cats))
        except Exception as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation(name="removeAuditTemplateCategory")
    def remove_audit_template_category(self, info: Info, id: str) -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.models.audit import AuditTemplateCategory
        try:
            category = AuditTemplateCategory.objects.select_related("template").filter(id=int(id)).first()
            if not category:
                return AuditTemplatePayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Category not found")])
            template = category.template
            category.delete()
            cats = list(AuditTemplateCategory.objects.filter(template=template).prefetch_related("questions").order_by("sequence"))
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(template, categories=cats))
        except Exception as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation(name="addAuditTemplateQuestion")
    def add_audit_template_question(self, info: Info, category_id: str, input: "AuditTemplateQuestionInput") -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.models.audit import AuditTemplateCategory, AuditTemplateQuestion
        try:
            category = AuditTemplateCategory.objects.select_related("template").filter(id=int(category_id)).first()
            if not category:
                return AuditTemplatePayload(ok=False, errors=[MutationError(field="categoryId", code="NOT_FOUND", message="Category not found")])
            AuditTemplateQuestion.objects.create(
                category=category, code=input.code, question=input.question,
                response_type=input.response_type or "PASS_FAIL_NA",
                is_required=input.is_required if input.is_required is not None else True,
                weight=input.weight or 1, sequence=input.sequence or 0,
                help_text=input.help_text or "",
            )
            cats = list(AuditTemplateCategory.objects.filter(template=category.template).prefetch_related("questions").order_by("sequence"))
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(category.template, categories=cats))
        except Exception as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation(name="updateAuditTemplateQuestion")
    def update_audit_template_question(self, info: Info, id: str, input: "AuditTemplateQuestionUpdateInput") -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.models.audit import AuditTemplateQuestion
        try:
            question = AuditTemplateQuestion.objects.select_related("category__template").filter(id=int(id)).first()
            if not question:
                return AuditTemplatePayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Question not found")])
            if input.code is not None: question.code = input.code
            if input.question is not None: question.question = input.question
            if input.response_type is not None: question.response_type = input.response_type
            if input.is_required is not None: question.is_required = input.is_required
            if input.weight is not None: question.weight = input.weight
            if input.sequence is not None: question.sequence = input.sequence
            if input.help_text is not None: question.help_text = input.help_text
            question.save()
            from manufacturing.models.audit import AuditTemplateCategory
            cats = list(AuditTemplateCategory.objects.filter(template=question.category.template).prefetch_related("questions").order_by("sequence"))
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(question.category.template, categories=cats))
        except Exception as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation(name="removeAuditTemplateQuestion")
    def remove_audit_template_question(self, info: Info, id: str) -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.models.audit import AuditTemplateQuestion, AuditTemplateCategory
        try:
            question = AuditTemplateQuestion.objects.select_related("category__template").filter(id=int(id)).first()
            if not question:
                return AuditTemplatePayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Question not found")])
            template = question.category.template
            question.delete()
            cats = list(AuditTemplateCategory.objects.filter(template=template).prefetch_related("questions").order_by("sequence"))
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(template, categories=cats))
        except Exception as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])
"""

if insert_after in mut_content:
    mut_content = mut_content.replace(insert_after, crud_mutations + insert_after, 1)
    with open('api/mutations/manufacturing.py', 'w', encoding='utf-8') as f:
        f.write(mut_content)
    log("OK - Added template CRUD mutations")
else:
    log("ERROR - Could not find insertion point in mutations file")

log("Done!")
