import typing
import strawberry
from datetime import datetime

from manufacturing.models.audit import (
    Audit, AuditFinding, AuditChecklistItem, AuditAnswer,
    AuditTemplate, AuditTemplateCategory, AuditTemplateQuestion,
)
from api.common.errors import MutationError
from api.utils.converters import _iso

@strawberry.type
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
        )


@strawberry.type
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
            is_active=obj.status == "ACTIVE",
            categories=[AuditTemplateCategoryNode.from_db(c, list(c.questions.all())) for c in (categories or [])],
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class AuditChecklistItemNode:
    id: strawberry.ID
    audit_id: strawberry.ID = strawberry.field(name="auditId")
    question: str
    score: typing.Optional[int] = None
    is_na: bool = strawberry.field(name="isNa")
    result: typing.Optional[str] = None
    comment: str = ""
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj) -> "AuditChecklistItemNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            audit_id=strawberry.ID(str(obj.audit_id)),
            question=obj.question,
            score=obj.score,
            is_na=obj.is_na,
            result=obj.result,
            comment=obj.comment or "",
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class AuditFindingNode:
    id: strawberry.ID
    audit_id: strawberry.ID = strawberry.field(name="auditId")
    description: str
    severity: str
    status: str
    owner: str = ""
    due_date: typing.Optional[str] = strawberry.field(name="dueDate", default=None)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj) -> "AuditFindingNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            audit_id=strawberry.ID(str(obj.audit_id)),
            description=obj.description,
            severity=obj.severity,
            status=obj.status,
            owner=obj.owner or "",
            due_date=obj.due_date.isoformat() if obj.due_date else None,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


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


@strawberry.type
class SaveAuditAnswersBulkPayload:
    ok: bool
    audit: typing.Optional["AuditNode"] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.type
class AuditNode:
    id: strawberry.ID
    control_area: str = strawberry.field(name="controlArea")
    audit_type: str = strawberry.field(name="auditType")
    target_type: str = strawberry.field(name="targetType")
    target_id: int = strawberry.field(name="targetId")
    title: str
    auditor: str = ""
    audit_date: typing.Optional[str] = strawberry.field(name="auditDate", default=None)
    status: str
    score: typing.Optional[float] = None
    notes: str = ""
    template_id: typing.Optional[strawberry.ID] = strawberry.field(name="templateId", default=None)
    checklist_items: list[AuditChecklistItemNode] = strawberry.field(name="checklistItems", default_factory=list)
    findings: list[AuditFindingNode] = strawberry.field(default_factory=list)
    answers: list[AuditAnswerNode] = strawberry.field(default_factory=list)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj, checklist: typing.Optional[list] = None, findings: typing.Optional[list] = None, answers: typing.Optional[list] = None) -> "AuditNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            control_area=obj.control_area,
            audit_type=obj.audit_type,
            target_type=obj.target_type,
            target_id=obj.target_id,
            title=obj.title,
            auditor=obj.auditor or "",
            audit_date=obj.audit_date.isoformat() if obj.audit_date else None,
            status=obj.status,
            score=obj.score,
            notes=obj.notes or "",
            template_id=strawberry.ID(str(obj.template_id)) if obj.template_id else None,
            checklist_items=[AuditChecklistItemNode.from_db(i) for i in (checklist or [])],
            findings=[AuditFindingNode.from_db(f) for f in (findings or [])],
            answers=[AuditAnswerNode.from_db(a) for a in (answers or [])],
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class AuditPayload:
    ok: bool
    audit: typing.Optional[AuditNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.type
class AuditChecklistItemPayload:
    ok: bool
    item: typing.Optional[AuditChecklistItemNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.type
class AuditFindingPayload:
    ok: bool
    finding: typing.Optional[AuditFindingNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.type
class AuditAnswerPayload:
    ok: bool
    answer: typing.Optional[AuditAnswerNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class AuditInstallTemplatesPayload:
    ok: bool
    message: str = ""
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class AuditTemplatePayload:
    ok: bool
    template: typing.Optional[AuditTemplateNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


# ── Audit Execution Form Types ──

@strawberry.type
class AuditExecutionQuestion:
    id: strawberry.ID
    question_text: str = strawberry.field(name="questionText")
    response_type: str = strawberry.field(name="responseType")
    is_required: bool = strawberry.field(name="isRequired")
    help_text: str = strawberry.field(name="helpText", default="")
    sequence: int
    weight: int = 1
    answer_id: typing.Optional[strawberry.ID] = strawberry.field(name="answerId", default=None)
    answer_value: str = strawberry.field(name="answerValue", default="")
    comment: str = ""
    evidence_url: str = strawberry.field(name="evidenceUrl", default="")
    is_nonconforming: bool = strawberry.field(name="isNonconforming", default=False)
    finding_required: bool = strawberry.field(name="findingRequired", default=False)


@strawberry.type
class AuditExecutionSection:
    id: strawberry.ID
    title: str
    sequence: int
    questions: list[AuditExecutionQuestion]


@strawberry.type
class AuditTemplateInfo:
    id: strawberry.ID
    code: str
    name: str
    version: int


@strawberry.type
class AuditExecutionSummary:
    answered_count: int = strawberry.field(name="answeredCount")
    total_questions: int = strawberry.field(name="totalQuestions")
    required_missing_count: int = strawberry.field(name="requiredMissingCount")
    findings_count: int = strawberry.field(name="findingsCount")
    last_saved_at: typing.Optional[str] = strawberry.field(name="lastSavedAt", default=None)
    score: typing.Optional[float] = None


@strawberry.type
class AuditExecutionForm:
    id: strawberry.ID
    title: str
    status: str
    score: typing.Optional[float] = None
    auditor: str = ""
    audit_date: typing.Optional[str] = strawberry.field(name="auditDate", default=None)
    notes: str = ""
    target_type: str = strawberry.field(name="targetType")
    target_id: int = strawberry.field(name="targetId")
    target_display_name: str = strawberry.field(name="targetDisplayName", default="")
    template: AuditTemplateInfo
    sections: list[AuditExecutionSection]
    findings: list[AuditFindingNode]
    summary: AuditExecutionSummary
