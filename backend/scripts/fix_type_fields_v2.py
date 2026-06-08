"""Fix GraphQL type fields using line-by-line extraction and replacement."""
with open('api/types/manufacturing.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: AuditTemplateQuestionNode - add new fields
old_question = """@strawberry.type
class AuditTemplateQuestionNode:
    id: strawberry.ID
    code: str
    question: str
    sequence: int
    max_score: int = strawberry.field(name="maxScore")
    allow_na: bool = strawberry.field(name="allowNa")
    is_active: bool = strawberry.field(name="isActive")

    @classmethod
    def from_db(cls, obj) -> "AuditTemplateQuestionNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
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
    max_score: int = strawberry.field(name="maxScore")
    allow_na: bool = strawberry.field(name="allowNa")
    is_active: bool = strawberry.field(name="isActive")

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
    print("ERROR: AuditTemplateQuestionNode old pattern not found!")
    # Print what we have
    idx = content.find('class AuditTemplateQuestionNode:')
    if idx > 0:
        print(f"Found at {idx}")
        print(repr(content[idx:idx+400]))

# Fix 2: AuditTemplateCategoryNode - add template_id, created_at, updated_at
old_category = """@strawberry.type
class AuditTemplateCategoryNode:
    id: strawberry.ID
    code: str
    name: str
    sequence: int
    is_required: bool = strawberry.field(name="isRequired")
    questions: list[AuditTemplateQuestionNode] = strawberry.field(default_factory=list)

    @classmethod
    def from_db(cls, obj, questions: typing.Optional[list] = None) -> "AuditTemplateCategoryNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            code=obj.code,
            name=obj.name,
            sequence=obj.sequence,
            is_required=obj.is_required,
            questions=[AuditTemplateQuestionNode.from_db(q) for q in (questions or [])],
        )"""

new_category = """@strawberry.type
class AuditTemplateCategoryNode:
    id: strawberry.ID
    template_id: strawberry.ID = strawberry.field(name="templateId")
    code: str
    name: str
    sequence: int
    is_required: bool = strawberry.field(name="isRequired")
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
    print("ERROR: AuditTemplateCategoryNode old pattern not found!")

with open('api/types/manufacturing.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
