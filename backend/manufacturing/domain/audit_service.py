from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Optional

from django.db import transaction, models as db_models

from manufacturing.models.audit import (
    Audit,
    AuditChecklistItem,
    AuditFinding,
    AuditType,
    AuditTargetType,
    AuditStatus,
    ChecklistResult,
    Severity,
    FindingStatus,
    ALLOWED_AUDIT_TARGET_TYPES,
    FORBIDDEN_TARGET_TYPES,
)
from manufacturing.models import (
    Plant,
    ProductionLine,
    Department,
    ResourceGroup,
    Resource,
)


@dataclass
class AuditServiceError(Exception):
    field: Optional[str]
    code: str
    message: str


AUDIT_TARGET_MODEL_MAP: dict[str, type[db_models.Model]] = {
    AuditTargetType.PLANT: Plant,
    AuditTargetType.PRODUCTION_LINE: ProductionLine,
    AuditTargetType.DEPARTMENT: Department,
    AuditTargetType.RESOURCE_GROUP: ResourceGroup,
    AuditTargetType.RESOURCE: Resource,
}


class AuditService:

    @classmethod
    def validate_audit_type(cls, audit_type: str) -> None:
        if audit_type not in AuditType.values:
            raise AuditServiceError(
                field="auditType",
                code="INVALID_AUDIT_TYPE",
                message=f"Invalid audit type '{audit_type}'. Allowed: {', '.join(sorted(AuditType.values))}",
            )

    @classmethod
    def validate_target(cls, target_type: str, target_id: int) -> None:
        if target_type in FORBIDDEN_TARGET_TYPES:
            raise AuditServiceError(
                field="targetType",
                code="FORBIDDEN_TARGET_TYPE",
                message=f"Target type '{target_type}' is not allowed for audits. Allowed: {', '.join(sorted(AUDIT_TARGET_MODEL_MAP))}",
            )
        if target_type not in AUDIT_TARGET_MODEL_MAP:
            raise AuditServiceError(
                field="targetType",
                code="INVALID_TARGET_TYPE",
                message=f"Invalid target type '{target_type}'. Allowed: {', '.join(sorted(AUDIT_TARGET_MODEL_MAP))}",
            )
        model = AUDIT_TARGET_MODEL_MAP[target_type]
        if not model.objects.filter(id=target_id).exists():
            raise AuditServiceError(
                field="targetId",
                code="TARGET_NOT_FOUND",
                message=f"{model.__name__} with id {target_id} not found",
            )

    @classmethod
    def _calculate_score(cls, audit_id: int) -> Optional[float]:
        items = AuditChecklistItem.objects.filter(audit_id=audit_id)
        applicable = items.exclude(result=ChecklistResult.N_A)
        total = applicable.count()
        if total == 0:
            return None
        passed = applicable.filter(result=ChecklistResult.PASS).count()
        return round((passed / total) * 100, 2)

    @classmethod
    @transaction.atomic
    def create_audit(
        cls,
        audit_type: str,
        target_type: str,
        target_id: int,
        title: str,
        auditor: str = "",
        audit_date: Optional[str] = None,
        notes: str = "",
    ) -> Audit:
        cls.validate_audit_type(audit_type)
        cls.validate_target(target_type, target_id)
        parsed_date = date.fromisoformat(audit_date) if audit_date else None
        audit = Audit.objects.create(
            audit_type=audit_type,
            target_type=target_type,
            target_id=target_id,
            title=title,
            auditor=auditor,
            audit_date=parsed_date,
            notes=notes,
        )
        return audit

    @classmethod
    @transaction.atomic
    def update_audit(
        cls,
        audit_id: int,
        title: Optional[str] = None,
        auditor: Optional[str] = None,
        audit_date: Optional[str] = None,
        notes: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Audit:
        try:
            audit = Audit.objects.select_for_update().get(id=audit_id)
        except Audit.DoesNotExist:
            raise AuditServiceError(
                field="id", code="NOT_FOUND", message=f"Audit {audit_id} not found"
            )
        if title is not None:
            audit.title = title
        if auditor is not None:
            audit.auditor = auditor
        if audit_date is not None:
            audit.audit_date = date.fromisoformat(audit_date) if audit_date else None
        if notes is not None:
            audit.notes = notes
        if status is not None:
            if status not in AuditStatus.values:
                raise AuditServiceError(
                    field="status",
                    code="INVALID_STATUS",
                    message=f"Invalid status '{status}'. Allowed: {', '.join(AuditStatus.values)}",
                )
            audit.status = status
        audit.save()
        return audit

    @classmethod
    def get_audit(cls, audit_id: int) -> Optional[Audit]:
        try:
            return Audit.objects.get(id=audit_id)
        except Audit.DoesNotExist:
            return None

    @classmethod
    def list_audits(
        cls,
        audit_type: Optional[str] = None,
        status: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[int] = None,
        auditor: Optional[str] = None,
    ) -> list[Audit]:
        qs = Audit.objects.all()
        if audit_type:
            qs = qs.filter(audit_type=audit_type)
        if status:
            qs = qs.filter(status=status)
        if target_type:
            qs = qs.filter(target_type=target_type)
        if target_id is not None:
            qs = qs.filter(target_id=target_id)
        if auditor:
            qs = qs.filter(auditor__icontains=auditor)
        return list(qs.order_by("-updated_at"))

    @classmethod
    @transaction.atomic
    def add_checklist_item(
        cls,
        audit_id: int,
        question: str,
        result: Optional[str] = None,
        comment: str = "",
    ) -> AuditChecklistItem:
        try:
            audit = Audit.objects.select_for_update().get(id=audit_id)
        except Audit.DoesNotExist:
            raise AuditServiceError(
                field="auditId", code="NOT_FOUND", message=f"Audit {audit_id} not found"
            )
        if result is not None and result not in ChecklistResult.values:
            raise AuditServiceError(
                field="result",
                code="INVALID_RESULT",
                message=f"Invalid result '{result}'. Allowed: {', '.join(ChecklistResult.values)}",
            )
        item = AuditChecklistItem.objects.create(
            audit=audit, question=question, result=result, comment=comment
        )
        audit.score = cls._calculate_score(audit.id)
        audit.save(update_fields=["score"])
        return item

    @classmethod
    @transaction.atomic
    def update_checklist_item(
        cls,
        item_id: int,
        question: Optional[str] = None,
        result: Optional[str] = None,
        comment: Optional[str] = None,
    ) -> AuditChecklistItem:
        try:
            item = AuditChecklistItem.objects.select_related("audit").select_for_update().get(id=item_id)
        except AuditChecklistItem.DoesNotExist:
            raise AuditServiceError(
                field="id", code="NOT_FOUND", message=f"Checklist item {item_id} not found"
            )
        if question is not None:
            item.question = question
        if result is not None:
            if result not in ChecklistResult.values:
                raise AuditServiceError(
                    field="result",
                    code="INVALID_RESULT",
                    message=f"Invalid result '{result}'. Allowed: {', '.join(ChecklistResult.values)}",
                )
            item.result = result
        if comment is not None:
            item.comment = comment
        item.save()
        item.audit.score = cls._calculate_score(item.audit.id)
        item.audit.save(update_fields=["score"])
        return item

    @classmethod
    @transaction.atomic
    def add_finding(
        cls,
        audit_id: int,
        description: str,
        severity: str,
        owner: str = "",
        due_date: Optional[str] = None,
    ) -> AuditFinding:
        try:
            audit = Audit.objects.select_for_update().get(id=audit_id)
        except Audit.DoesNotExist:
            raise AuditServiceError(
                field="auditId", code="NOT_FOUND", message=f"Audit {audit_id} not found"
            )
        if severity not in Severity.values:
            raise AuditServiceError(
                field="severity",
                code="INVALID_SEVERITY",
                message=f"Invalid severity '{severity}'. Allowed: {', '.join(Severity.values)}",
            )
        parsed_date = date.fromisoformat(due_date) if due_date else None
        finding = AuditFinding.objects.create(
            audit=audit,
            description=description,
            severity=severity,
            owner=owner,
            due_date=parsed_date,
        )
        return finding

    @classmethod
    @transaction.atomic
    def update_finding(
        cls,
        finding_id: int,
        description: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        owner: Optional[str] = None,
        due_date: Optional[str] = None,
    ) -> AuditFinding:
        try:
            finding = AuditFinding.objects.select_for_update().get(id=finding_id)
        except AuditFinding.DoesNotExist:
            raise AuditServiceError(
                field="id", code="NOT_FOUND", message=f"Finding {finding_id} not found"
            )
        if description is not None:
            finding.description = description
        if severity is not None:
            if severity not in Severity.values:
                raise AuditServiceError(
                    field="severity",
                    code="INVALID_SEVERITY",
                    message=f"Invalid severity '{severity}'. Allowed: {', '.join(Severity.values)}",
                )
            finding.severity = severity
        if status is not None:
            if status not in FindingStatus.values:
                raise AuditServiceError(
                    field="status",
                    code="INVALID_FINDING_STATUS",
                    message=f"Invalid finding status '{status}'. Allowed: {', '.join(FindingStatus.values)}",
                )
            finding.status = status
        if owner is not None:
            finding.owner = owner
        if due_date is not None:
            finding.due_date = date.fromisoformat(due_date) if due_date else None
        finding.save()
        return finding

    @classmethod
    @transaction.atomic
    def close_finding(cls, finding_id: int) -> AuditFinding:
        try:
            finding = AuditFinding.objects.select_for_update().get(id=finding_id)
        except AuditFinding.DoesNotExist:
            raise AuditServiceError(
                field="id", code="NOT_FOUND", message=f"Finding {finding_id} not found"
            )
        finding.status = FindingStatus.CLOSED
        finding.save()
        return finding

    @classmethod
    def calculate_score(cls, audit_id: int) -> Optional[float]:
        try:
            Audit.objects.get(id=audit_id)
        except Audit.DoesNotExist:
            raise AuditServiceError(
                field="id", code="NOT_FOUND", message=f"Audit {audit_id} not found"
            )
        return cls._calculate_score(audit_id)
