"""GraphQL inputs for audit entities.

Audit, AuditTemplate, Findings, Checklist items, and related inputs.
"""

import typing
import strawberry


@strawberry.input
class AuditInput:
    control_area: str = strawberry.field(name="controlArea")
    audit_type: str = strawberry.field(name="auditType")
    title: str
    target_type: str = strawberry.field(name="targetType")
    target_id: int = strawberry.field(name="targetId")
    auditor: typing.Optional[str] = None
    notes: typing.Optional[str] = ""
    audit_date: typing.Optional[str] = strawberry.field(name="auditDate", default=None)
    template_id: typing.Optional[int] = strawberry.field(name="templateId", default=None)


@strawberry.input
class AuditUpdateInput:
    title: typing.Optional[str] = None
    auditor: typing.Optional[str] = None
    notes: typing.Optional[str] = None
    audit_date: typing.Optional[str] = strawberry.field(name="auditDate", default=None)
    status: typing.Optional[str] = None
    score: typing.Optional[float] = None


@strawberry.input
class AuditChecklistItemInput:
    audit_id: str = strawberry.field(name="auditId")
    item: str
    expected: str = ""
    actual: str = ""
    status: typing.Optional[str] = "PENDING"


@strawberry.input
class AuditChecklistItemUpdateInput:
    item: typing.Optional[str] = None
    expected: typing.Optional[str] = None
    actual: typing.Optional[str] = None
    status: typing.Optional[str] = None


@strawberry.input
class AuditFindingInput:
    audit_id: str = strawberry.field(name="auditId")
    category: str
    description: str
    severity: str = "MINOR"
    corrective_action: typing.Optional[str] = strawberry.field(name="correctiveAction", default="")
    due_date: typing.Optional[str] = strawberry.field(name="dueDate", default=None)
    assigned_to: typing.Optional[str] = strawberry.field(name="assignedTo", default=None)


@strawberry.input
class AuditFindingUpdateInput:
    category: typing.Optional[str] = None
    description: typing.Optional[str] = None
    severity: typing.Optional[str] = None
    status: typing.Optional[str] = None
    corrective_action: typing.Optional[str] = strawberry.field(name="correctiveAction", default=None)
    due_date: typing.Optional[str] = strawberry.field(name="dueDate", default=None)
    assigned_to: typing.Optional[str] = strawberry.field(name="assignedTo", default=None)


@strawberry.input
class AuditTemplateCreateInput:
    audit_type: str = strawberry.field(name="auditType")
    code: str
    name: str
    description: typing.Optional[str] = ""
    module_scope: typing.Optional[str] = strawberry.field(name="moduleScope", default="")
    version: typing.Optional[str] = "1.0"


@strawberry.input
class AuditTemplateUpdateInput:
    name: typing.Optional[str] = None
    description: typing.Optional[str] = None
    status: typing.Optional[str] = None
    version: typing.Optional[str] = None


@strawberry.input
class AuditTemplateCategoryInput:
    template_id: int = strawberry.field(name="templateId")
    name: str
    sequence: int = 0


@strawberry.input
class AuditTemplateCategoryUpdateInput:
    name: typing.Optional[str] = None
    sequence: typing.Optional[int] = None


@strawberry.input
class AuditTemplateQuestionInput:
    category_id: int = strawberry.field(name="categoryId")
    question: str
    response_type: str = strawberry.field(name="responseType", default="PASS_FAIL_NA")
    is_required: bool = strawberry.field(name="isRequired", default=True)
    help_text: typing.Optional[str] = strawberry.field(name="helpText", default="")
    sequence: int = 0
    weight: float = 1.0


@strawberry.input
class AuditTemplateQuestionUpdateInput:
    question: typing.Optional[str] = None
    response_type: typing.Optional[str] = strawberry.field(name="responseType", default=None)
    is_required: typing.Optional[bool] = strawberry.field(name="isRequired", default=None)
    help_text: typing.Optional[str] = strawberry.field(name="helpText", default=None)
    sequence: typing.Optional[int] = None
    weight: typing.Optional[float] = None


@strawberry.input
class CreateAuditFromTemplateInput:
    template_id: int = strawberry.field(name="templateId")
    title: str
    target_type: str = strawberry.field(name="targetType")
    target_id: int = strawberry.field(name="targetId")
    auditor: typing.Optional[str] = None
    audit_date: typing.Optional[str] = strawberry.field(name="auditDate", default=None)
    notes: typing.Optional[str] = ""
    control_area: typing.Optional[str] = strawberry.field(name="controlArea", default=None)


@strawberry.input
class SaveAuditAnswerInput:
    audit_id: str = strawberry.field(name="auditId")
    question_id: int = strawberry.field(name="questionId")
    answer_value: typing.Optional[str] = strawberry.field(name="answerValue", default=None)
    comment: typing.Optional[str] = None
    evidence_url: typing.Optional[str] = strawberry.field(name="evidenceUrl", default=None)


@strawberry.input
class BulkSaveAuditAnswerItem:
    question_id: int = strawberry.field(name="questionId")
    answer_value: typing.Optional[str] = strawberry.field(name="answerValue", default=None)
    comment: typing.Optional[str] = None
    evidence_url: typing.Optional[str] = strawberry.field(name="evidenceUrl", default=None)


@strawberry.input
class SaveAuditAnswersBulkInput:
    audit_id: str = strawberry.field(name="auditId")
    answers: list[BulkSaveAuditAnswerItem]


@strawberry.input
class CreateAuditFindingFromAnswerInput:
    audit_id: str = strawberry.field(name="auditId")
    question_id: int = strawberry.field(name="questionId")
    answer_id: int = strawberry.field(name="answerId")
    description: str
    severity: str = "MINOR"
    owner: typing.Optional[str] = ""
    due_date: typing.Optional[str] = strawberry.field(name="dueDate", default=None)
    corrective_action: typing.Optional[str] = strawberry.field(name="correctiveAction", default="")
