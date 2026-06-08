"""Fix existing GraphQL type classes to include the new template-driven audit fields."""
import re

with open('api/types/manufacturing.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix AuditTemplateQuestionNode - add responseType, isRequired, weight, helpText
old_question = """@strawberry.type
class AuditTemplateQuestionNode:
    id: strawberry.ID
    category_id: strawberry.ID = strawberry.field(name="categoryId")
    code: str
    question: str
    sequence: int
    max_score: int = strawberry.field(name="maxScore", default=5)
    allow_na: bool = strawberry.field(name="allowNa", default=True)
    is_active: bool = strawberry.field(name="isActive", default=True)

    @classmethod
    def from_db(cls, obj) -> "AuditTemplateQuestionNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            category_id=strawberry.ID(str(obj.category_id)),
            code=obj.code,
            question=obj.question,
            sequence=obj.sequence,
            max_score=obj.max_score,
            allow_na=obj.allow_na,
            is_active=obj.is_active,
        )"""

new_question = """@strawberry.type
class AuditTemplateQuestionNode:
    id: strawberry.ID
    category_id: strawberry.ID = strawberry.field(name="categoryId")
    code: str
    question: str
    response_type: str = strawberry.field(name="responseType", default="SCORE_1_5")
    is_required: bool = strawberry.field(name="isRequired", default=True)
    weight: int = 1
    sequence: int
    help_text: str = strawberry.field(name="helpText", default="")
    max_score: int = strawberry.field(name="maxScore", default=5)
    allow_na: bool = strawberry.field(name="allowNa", default=True)
    is_active: bool = strawberry.field(name="isActive", default=True)

    @classmethod
    def from_db(cls, obj) -> "AuditTemplateQuestionNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            category_id=strawberry.ID(str(obj.category_id)),
            code=obj.code,
            question=obj.question,
            response_type=obj.response_type,
            is_required=obj.is_required,
            weight=obj.weight,
            sequence=obj.sequence,
            help_text=obj.help_text or "",
            max_score=obj.max_score,
            allow_na=obj.allow_na,
            is_active=obj.is_active,
        )"""

if old_question in content:
    content = content.replace(old_question, new_question)
    print("Fixed AuditTemplateQuestionNode")
else:
    print("WARNING: AuditTemplateQuestionNode old pattern not found. Checking alternatives...")
    # Find the existing class
    idx = content.find('class AuditTemplateQuestionNode')
    if idx > 0:
        print(f"Found at position {idx}. Content: {content[idx:idx+300]}")

# 2. Fix AuditTemplateCategoryNode - add templateId, isRequired
old_category = """@strawberry.type
class AuditTemplateCategoryNode:
    id: strawberry.ID
    template_id: strawberry.ID = strawberry.field(name="templateId")
    code: str
    name: str
    sequence: int
    questions: list[AuditTemplateQuestionNode] = strawberry.field(default_factory=list)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj, questions: typing.Optional[list] = None) -> "AuditTemplateCategoryNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            template_id=strawberry.ID(str(obj.template_id)),
            code=obj.code,
            name=obj.name,
            sequence=obj.sequence,
            questions=[AuditTemplateQuestionNode.from_db(q) for q in (questions or [])],
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )"""

new_category = """@strawberry.type
class AuditTemplateCategoryNode:
    id: strawberry.ID
    template_id: strawberry.ID = strawberry.field(name="templateId")
    code: str
    name: str
    sequence: int
    is_required: bool = strawberry.field(name="isRequired", default=True)
    questions: list[AuditTemplateQuestionNode] = strawberry.field(default_factory=list)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj, questions: typing.Optional[list] = None) -> "AuditTemplateCategoryNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            template_id=strawberry.ID(str(obj.template_id)),
            code=obj.code,
            name=obj.name,
            sequence=obj.sequence,
            is_required=obj.is_required,
            questions=[AuditTemplateQuestionNode.from_db(q) for q in (questions or [])],
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )"""

if old_category in content:
    content = content.replace(old_category, new_category)
    print("Fixed AuditTemplateCategoryNode")
else:
    print("WARNING: AuditTemplateCategoryNode old pattern not found. Checking...")
    idx = content.find('class AuditTemplateCategoryNode')
    if idx > 0:
        print(f"Found at position {idx}")

# 3. Fix AuditTemplateNode - add moduleScope, status, isDefault, targetTypes
old_template = """@strawberry.type
class AuditTemplateNode:
    id: strawberry.ID
    code: str
    name: str
    audit_type: str = strawberry.field(name="auditType")
    version: int
    is_active: bool = strawberry.field(name="isActive")
    categories: list[AuditTemplateCategoryNode] = strawberry.field(default_factory=list)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj, categories: typing.Optional[list] = None) -> "AuditTemplateNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            code=obj.code,
            name=obj.name,
            audit_type=obj.audit_type,
            version=obj.version,
            is_active=obj.is_active,
            categories=[AuditTemplateCategoryNode.from_db(c, list(c.questions.all())) for c in (categories or [])],
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )"""

new_template = """@strawberry.type
class AuditTemplateNode:
    id: strawberry.ID
    code: str
    name: str
    audit_type: str = strawberry.field(name="auditType")
    module_scope: str = strawberry.field(name="moduleScope", default="PRODUCTION_CONTROL")
    target_types: list[str] = strawberry.field(name="targetTypes", default_factory=list)
    version: int
    status: str = "ACTIVE"
    is_default: bool = strawberry.field(name="isDefault", default=False)
    is_active: bool = strawberry.field(name="isActive")
    categories: list[AuditTemplateCategoryNode] = strawberry.field(default_factory=list)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj, categories: typing.Optional[list] = None) -> "AuditTemplateNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            code=obj.code,
            name=obj.name,
            audit_type=obj.audit_type,
            module_scope=obj.module_scope or "PRODUCTION_CONTROL",
            target_types=obj.target_types or [],
            version=obj.version,
            status=obj.status or "ACTIVE",
            is_default=obj.is_default,
            is_active=obj.is_active,
            categories=[AuditTemplateCategoryNode.from_db(c, list(c.questions.all())) for c in (categories or [])],
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )"""

if old_template in content:
    content = content.replace(old_template, new_template)
    print("Fixed AuditTemplateNode")
else:
    print("WARNING: AuditTemplateNode old pattern not found. Checking...")
    idx = content.find('class AuditTemplateNode')
    if idx > 0:
        # Find the next 15 lines
        section = content[idx:idx+500]
        print(f"Found at position {idx}")
        print(f"Content: {section[:400]}")

with open('api/types/manufacturing.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done fixing type fields")
