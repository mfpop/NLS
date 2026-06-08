"""Update GraphQL types in api/types/manufacturing.py with template-driven audit types."""
import re

with open('api/types/manufacturing.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add AuditTemplateQuestionNode if not present
if 'class AuditTemplateQuestionNode' not in content:
    question_node = """
@strawberry.type
class AuditTemplateQuestionNode:
    id: strawberry.ID
    category_id: strawberry.ID = strawberry.field(name="categoryId")
    code: str
    question: str
    response_type: str = strawberry.field(name="responseType")
    is_required: bool = strawberry.field(name="isRequired")
    weight: int
    sequence: int
    help_text: str = strawberry.field(name="helpText", default="")
    max_score: typing.Optional[int] = strawberry.field(name="maxScore", default=5)
    allow_na: bool = strawberry.field(name="allowNa", default=True)

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
        )

@strawberry.type
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
        )

@strawberry.type
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
    is_active: bool = strawberry.field(name="isActive", default=True)
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
            is_active=obj.status == "ACTIVE",
            categories=[AuditTemplateCategoryNode.from_db(c, list(c.questions.all())) for c in (categories or [])],
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )

@strawberry.input
class SaveAuditAnswerInput:
    audit_id: int = strawberry.field(name="auditId")
    question_id: int = strawberry.field(name="questionId")
    answer_value: str = strawberry.field(name="answerValue", default="")
    comment: str = ""
    evidence_url: typing.Optional[str] = strawberry.field(name="evidenceUrl", default=None)

@strawberry.input
class CreateAuditFindingFromAnswerInput:
    audit_id: int = strawberry.field(name="auditId")
    answer_id: int = strawberry.field(name="answerId")
    description: str
    severity: str = "MEDIUM"
    owner: str = ""
    due_date: typing.Optional[str] = strawberry.field(name="dueDate", default=None)
"""

    # Insert after CreateAuditFromTemplateInput
    insert_pos = content.find('@strawberry.input\nclass CreateAuditFromTemplateInput:\n')
    end_insert = content.find('@strawberry.type\nclass AuditChecklistItemNode:\n')
    if end_insert > 0:
        content = content[:end_insert] + question_node + content[end_insert:]

# 2. Add AuditAnswerNode and updated AuditNode with answers + template_id
if 'class AuditAnswerNode' not in content:
    answer_node = """
@strawberry.type
class AuditAnswerNode:
    id: strawberry.ID
    audit_id: strawberry.ID = strawberry.field(name="auditId")
    question_id: strawberry.ID = strawberry.field(name="questionId")
    answer_value: str = strawberry.field(name="answerValue", default="")
    comment: str = ""
    evidence_url: str = strawberry.field(name="evidenceUrl", default="")
    finding_required: bool = strawberry.field(name="findingRequired", default=False)
    question: typing.Optional[AuditTemplateQuestionNode] = None
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj, question: typing.Optional[object] = None) -> "AuditAnswerNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            audit_id=strawberry.ID(str(obj.audit_id)),
            question_id=strawberry.ID(str(obj.template_question_id)),
            answer_value=obj.answer_value or "",
            comment=obj.comment or "",
            evidence_url=obj.evidence_url or "",
            finding_required=obj.finding_required,
            question=AuditTemplateQuestionNode.from_db(question or obj.template_question) if (question or obj.template_question_id) else None,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )

@strawberry.input
class SaveAuditAnswerInput:
    audit_id: int = strawberry.field(name="auditId")
    question_id: int = strawberry.field(name="questionId")
    answer_value: str = strawberry.field(name="answerValue", default="")
    comment: str = ""
    evidence_url: typing.Optional[str] = strawberry.field(name="evidenceUrl", default=None)

@strawberry.input
class CreateAuditFindingFromAnswerInput:
    audit_id: int = strawberry.field(name="auditId")
    answer_id: int = strawberry.field(name="answerId")
    description: str
    severity: str = "MEDIUM"
    owner: str = ""
    due_date: typing.Optional[str] = strawberry.field(name="dueDate", default=None)
"""

    # Insert after AuditPayload but before AuditChecklistItemPayload
    insert_after = 'class AuditPayload:'
    insert_pos = content.find(insert_after)
    if insert_pos > 0:
        # Find the next class definition after AuditPayload
        rest = content[insert_pos:]
        next_class = re.search(r'\n@strawberry\.(type|input)\nclass ', rest)
        if next_class:
            end_pos = insert_pos + next_class.start()
            content = content[:end_pos] + '\n' + answer_node + content[end_pos:]

# 3. Update AuditNode to include template_id and answers
if 'template_id: strawberry.ID' not in content:
    # Find the AuditNode class and add template_id and answers fields
    old_audit_node = """@strawberry.type
class AuditNode:
    id: strawberry.ID
    control_area: str = strawberry.field(name="controlArea")
    audit_type: str = strawberry.field(name="auditType")
    target_type: str = strawberry.field(name="targetType")
    target_id: int = strawberry.field(name="targetId")
    title: str
    auditor: str = \"\"
    audit_date: typing.Optional[str] = strawberry.field(name="auditDate", default=None)
    status: str
    score: typing.Optional[float] = None
    notes: str = \"\"
    checklist_items: list[AuditChecklistItemNode] = strawberry.field(name="checklistItems", default_factory=list)
    findings: list[AuditFindingNode] = strawberry.field(default_factory=list)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")"""

    new_audit_node = """@strawberry.type
class AuditNode:
    id: strawberry.ID
    control_area: str = strawberry.field(name="controlArea")
    audit_type: str = strawberry.field(name="auditType")
    target_type: str = strawberry.field(name="targetType")
    target_id: int = strawberry.field(name="targetId")
    title: str
    auditor: str = \"\"
    audit_date: typing.Optional[str] = strawberry.field(name="auditDate", default=None)
    status: str
    score: typing.Optional[float] = None
    notes: str = \"\"
    template_id: typing.Optional[strawberry.ID] = strawberry.field(name="templateId", default=None)
    checklist_items: list[AuditChecklistItemNode] = strawberry.field(name="checklistItems", default_factory=list)
    findings: list[AuditFindingNode] = strawberry.field(default_factory=list)
    answers: list[AuditAnswerNode] = strawberry.field(default_factory=list)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")"""

    content = content.replace(old_audit_node, new_audit_node)

    # Update AuditNode.from_db to include template_id and answers
    old_from_db = """    @classmethod
    def from_db(cls, obj, checklist: typing.Optional[list] = None, findings: typing.Optional[list] = None) -> \"AuditNode\":
        return cls(
            id=strawberry.ID(str(obj.id)),
            control_area=obj.control_area,
            audit_type=obj.audit_type,
            target_type=obj.target_type,
            target_id=obj.target_id,
            title=obj.title,
            auditor=obj.auditor or \"\",
            audit_date=obj.audit_date.isoformat() if obj.audit_date else None,
            status=obj.status,
            score=obj.score,
            notes=obj.notes or \"\",
            checklist_items=[AuditChecklistItemNode.from_db(i) for i in (checklist or [])],
            findings=[AuditFindingNode.from_db(f) for f in (findings or [])],
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )"""

    new_from_db = """    @classmethod
    def from_db(cls, obj, checklist: typing.Optional[list] = None, findings: typing.Optional[list] = None, answers: typing.Optional[list] = None) -> \"AuditNode\":
        return cls(
            id=strawberry.ID(str(obj.id)),
            control_area=obj.control_area,
            audit_type=obj.audit_type,
            target_type=obj.target_type,
            target_id=obj.target_id,
            title=obj.title,
            auditor=obj.auditor or \"\",
            audit_date=obj.audit_date.isoformat() if obj.audit_date else None,
            status=obj.status,
            score=obj.score,
            notes=obj.notes or \"\",
            template_id=strawberry.ID(str(obj.template_id)) if obj.template_id else None,
            checklist_items=[AuditChecklistItemNode.from_db(i) for i in (checklist or [])],
            findings=[AuditFindingNode.from_db(f) for f in (findings or [])],
            answers=[AuditAnswerNode.from_db(a) for a in (answers or [])],
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )"""

    content = content.replace(old_from_db, new_from_db)

with open('api/types/manufacturing.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("OK: Updated api/types/manufacturing.py with template-driven audit types")
