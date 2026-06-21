"""Application services for the check domain."""

from datetime import date, datetime

from django.db.models import Count, Q

from check.models import (
    Problem, Action,
    ProductionCheck, ProductionChecklistItem,
    QualityCheck, QualityChecklistItem,
    DMR, RMA,
    SafetyCheck, SafetyChecklistItem, SafetyIncident, SafetyEvent,
    MaterialCheck, MaterialChecklistItem, MaterialIssue,
    SafetyInjuryClaim, SafetyMedicalCase, SafetyEnvironmentalReport, SafetyCAPA,
)
from check.constants import (
    PROBLEM_STATUS_IN_REVIEW, PROBLEM_STATUS_IN_PROGRESS,
    PROBLEM_STATUS_CONTAINED, PROBLEM_STATUS_RESOLVED,
    PROBLEM_STATUS_CLOSED, PROBLEM_STATUS_CANCELLED,
    ACTION_STATUS_IN_PROGRESS, ACTION_STATUS_COMPLETED, ACTION_STATUS_DONE, ACTION_STATUS_CANCELLED,
    CHECK_STATUS_COMPLETED,
    DMR_STATUS_UNDER_REVIEW, DMR_STATUS_QUARANTINED,
    DMR_STATUS_DISPOSITION_PENDING, DMR_STATUS_DISPOSITION_APPROVED,
    DMR_STATUS_CLOSED, DMR_STATUS_CANCELLED,
    RMA_STATUS_RECEIVED, RMA_STATUS_UNDER_REVIEW,
    RMA_STATUS_DISPOSITION_PENDING, RMA_STATUS_CLOSED, RMA_STATUS_CANCELLED,
    EVENT_STATUS_REPORTED, EVENT_STATUS_UNDER_REVIEW,
    EVENT_STATUS_ACTION_REQUIRED, EVENT_STATUS_CLOSED, EVENT_STATUS_CANCELLED,
    INCIDENT_STATUS_CONTAINED, INCIDENT_STATUS_UNDER_REVIEW,
    INCIDENT_STATUS_CLOSED, INCIDENT_STATUS_CANCELLED,
    MATERIAL_ISSUE_STATUS_CONTAINED, MATERIAL_ISSUE_STATUS_RESOLVED,
    MATERIAL_ISSUE_STATUS_CLOSED, MATERIAL_ISSUE_STATUS_CANCELLED,
    CHECKLIST_RESULT_PASS, CHECKLIST_RESULT_FAIL, CHECKLIST_RESULT_N_A,
)
from check.validators import validate_non_empty, validate_target_type
from check.domain_rules import (
    can_review_problem, can_contain_problem, can_close_problem, can_cancel_problem,
    can_start_action, can_complete_action, can_cancel_action,
    can_complete_check,
    can_review_dmr, can_disposition_dmr, can_quarantine_dmr, can_approve_disposition_dmr, can_close_dmr, can_cancel_dmr,
    can_receive_rma, can_review_rma, can_disposition_rma, can_close_rma, can_cancel_rma,
    can_report_event, can_review_event, can_require_action_event, can_close_event, can_cancel_event,
    can_contain_safety_incident, can_review_safety_incident,
    can_close_safety_incident, can_cancel_safety_incident,
    can_contain_material_issue, can_resolve_material_issue,
    can_close_material_issue, can_cancel_material_issue,
)
from check.exceptions import (
    ProblemNotFoundError, ActionNotFoundError,
    ProductionCheckNotFoundError, QualityCheckNotFoundError,
    DMRNotFoundError, RMANotFoundError,
    SafetyCheckNotFoundError, SafetyEventNotFoundError, SafetyIncidentNotFoundError,
    MaterialCheckNotFoundError, MaterialIssueNotFoundError,
    InvalidStatusTransitionError,
    SafetyInjuryClaimNotFoundError, SafetyMedicalCaseNotFoundError,
    SafetyEnvironmentalReportNotFoundError, SafetyCAPANotFoundError,
    SafetyComplianceValidationError, SafetyCompliancePermissionError,
)


# ──────────────────────────────────────────────
#  ProblemService
# ──────────────────────────────────────────────

class ProblemService:
    def create_problem(self, **kwargs) -> Problem:
        validate_non_empty(kwargs.get("title", ""), "title")
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        problem = Problem(**kwargs)
        problem.save()
        return problem

    def update_problem(self, problem_id: int, **kwargs) -> Problem:
        problem = self._get(problem_id)
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        for key, value in kwargs.items():
            setattr(problem, key, value)
        problem.save()
        return problem

    def review_problem(self, problem_id: int) -> Problem:
        problem = self._get(problem_id)
        if not can_review_problem(problem.status):
            raise InvalidStatusTransitionError(
                f"Cannot review problem in status '{problem.status}'"
            )
        problem.status = PROBLEM_STATUS_IN_REVIEW
        problem.save()
        return problem

    def start_problem(self, problem_id: int) -> Problem:
        problem = self._get(problem_id)
        if not can_start_problem(problem.status):
            raise InvalidStatusTransitionError(
                f"Cannot start problem in status '{problem.status}'"
            )
        problem.status = PROBLEM_STATUS_IN_PROGRESS
        problem.save()
        return problem

    def contain_problem(self, problem_id: int) -> Problem:
        problem = self._get(problem_id)
        if not can_contain_problem(problem.status):
            raise InvalidStatusTransitionError(
                f"Cannot contain problem in status '{problem.status}'"
            )
        problem.status = PROBLEM_STATUS_CONTAINED
        problem.save()
        return problem

    def resolve_problem(self, problem_id: int) -> Problem:
        problem = self._get(problem_id)
        if not can_resolve_problem(problem.status):
            raise InvalidStatusTransitionError(
                f"Cannot resolve problem in status '{problem.status}'"
            )
        problem.status = PROBLEM_STATUS_RESOLVED
        problem.save()
        return problem

    def close_problem(self, problem_id: int) -> Problem:
        problem = self._get(problem_id)
        if not can_close_problem(problem.status):
            raise InvalidStatusTransitionError(
                f"Cannot close problem in status '{problem.status}'"
            )
        problem.status = PROBLEM_STATUS_CLOSED
        problem.closed_at = datetime.now()
        problem.save()
        return problem

    def cancel_problem(self, problem_id: int) -> Problem:
        problem = self._get(problem_id)
        if not can_cancel_problem(problem.status):
            raise InvalidStatusTransitionError(
                f"Cannot cancel problem in status '{problem.status}'"
            )
        problem.status = PROBLEM_STATUS_CANCELLED
        problem.save()
        return problem

    def list_problems(self, filters: dict | None = None) -> list[Problem]:
        qs = Problem.objects.all()
        if filters:
            if filters.get("control_area"):
                qs = qs.filter(control_area=filters["control_area"])
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("problem_type"):
                qs = qs.filter(problem_type=filters["problem_type"])
            if filters.get("target_type"):
                qs = qs.filter(target_type=filters["target_type"])
            if filters.get("search"):
                qs = qs.filter(title__icontains=filters["search"])
        return list(qs)

    def get_problem(self, problem_id: int) -> Problem | None:
        return Problem.objects.filter(id=problem_id).first()

    def _get(self, problem_id: int) -> Problem:
        problem = Problem.objects.filter(id=problem_id).first()
        if not problem:
            raise ProblemNotFoundError(f"Problem {problem_id} not found")
        return problem


# ──────────────────────────────────────────────
#  ActionService
# ──────────────────────────────────────────────

class ActionService:
    def create_action(self, **kwargs) -> Action:
        validate_non_empty(kwargs.get("title", ""), "title")
        action = Action(**kwargs)
        action.save()
        return action

    def update_action(self, action_id: int, **kwargs) -> Action:
        action = self._get(action_id)
        for key, value in kwargs.items():
            setattr(action, key, value)
        action.save()
        return action

    def start_action(self, action_id: int) -> Action:
        action = self._get(action_id)
        if not can_start_action(action.status):
            raise InvalidStatusTransitionError(
                f"Cannot start action in status '{action.status}'"
            )
        action.status = ACTION_STATUS_IN_PROGRESS
        action.save()
        return action

    def complete_action(self, action_id: int, completed_by: str = "", completion_notes: str = "") -> Action:
        action = self._get(action_id)
        if not can_complete_action(action.status):
            raise InvalidStatusTransitionError(
                f"Cannot complete action in status '{action.status}'"
            )
        action.status = ACTION_STATUS_COMPLETED
        action.completed_at = datetime.now()
        if completed_by:
            action.completed_by = completed_by
        if completion_notes:
            action.completion_notes = completion_notes
        action.save()
        return action

    def cancel_action(self, action_id: int) -> Action:
        action = self._get(action_id)
        if not can_cancel_action(action.status):
            raise InvalidStatusTransitionError(
                f"Cannot cancel action in status '{action.status}'"
            )
        action.status = ACTION_STATUS_CANCELLED
        action.save()
        return action

    def create_action_from_issue(self, issue_id: int, **kwargs) -> Action:
        """Create an action linked to a control issue (Problem)."""
        issue = Problem.objects.filter(id=issue_id).first()
        if not issue:
            raise ProblemNotFoundError(f"Problem {issue_id} not found")
        validate_non_empty(kwargs.get("title", ""), "title")
        kwargs.setdefault("control_area", issue.control_area)
        kwargs.setdefault("source_type", "ISSUE")
        kwargs.setdefault("source_id", issue_id)
        kwargs["linked_issue"] = issue
        action = Action(**kwargs)
        action.save()
        return action

    def link_issue(self, action_id: int, issue_id: int) -> Action:
        """Link an existing action to a control issue."""
        action = self._get(action_id)
        issue = Problem.objects.filter(id=issue_id).first()
        if not issue:
            raise ProblemNotFoundError(f"Problem {issue_id} not found")
        action.linked_issue = issue
        action.save()
        return action

    def list_actions(self, filters: dict | None = None) -> list[Action]:
        qs = Action.objects.all()
        if filters:
            if filters.get("control_area"):
                qs = qs.filter(control_area=filters["control_area"])
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("priority"):
                qs = qs.filter(priority=filters["priority"])
            if filters.get("search"):
                qs = qs.filter(title__icontains=filters["search"])
            if filters.get("linked_issue_id"):
                qs = qs.filter(linked_issue_id=filters["linked_issue_id"])
        return list(qs)

    def get_action(self, action_id: int) -> Action | None:
        return Action.objects.filter(id=action_id).first()

    def _get(self, action_id: int) -> Action:
        action = Action.objects.filter(id=action_id).first()
        if not action:
            raise ActionNotFoundError(f"Action {action_id} not found")
        return action


# ──────────────────────────────────────────────
#  ProductionControlService
# ──────────────────────────────────────────────

class ProductionControlService:
    def create_production_check(self, **kwargs) -> ProductionCheck:
        validate_non_empty(kwargs.get("title", ""), "title")
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        check = ProductionCheck(**kwargs)
        check.save()
        return check

    def update_production_check(self, check_id: int, **kwargs) -> ProductionCheck:
        check = self._get(check_id)
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        for key, value in kwargs.items():
            setattr(check, key, value)
        check.save()
        return check

    def add_checklist_item(self, check_id: int, **kwargs) -> ProductionChecklistItem:
        check = self._get(check_id)
        validate_non_empty(kwargs.get("question", ""), "question")
        item = ProductionChecklistItem(production_check=check, **kwargs)
        item.save()
        return item

    def update_checklist_item(self, item_id: int, result: str = None, comment: str = None) -> ProductionChecklistItem:
        item = self._get_item(item_id)
        if result is not None:
            item.result = result
        if comment is not None:
            item.comment = comment
        item.save()
        return item

    def complete_production_check(self, check_id: int) -> ProductionCheck:
        check = self._get(check_id)
        if not can_complete_check(check.status):
            raise InvalidStatusTransitionError(
                f"Cannot complete production check in status '{check.status}'"
            )
        items = check.checklist_items.all()
        total = items.count()
        if total > 0:
            pass_count = items.filter(result=CHECKLIST_RESULT_PASS).count()
            check.score = (pass_count / total) * 100
        else:
            check.score = 0
        check.status = CHECK_STATUS_COMPLETED
        check.save()
        return check

    def list_production_checks(self, filters: dict | None = None) -> list[ProductionCheck]:
        qs = ProductionCheck.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("check_type"):
                qs = qs.filter(check_type=filters["check_type"])
            if filters.get("target_type"):
                qs = qs.filter(target_type=filters["target_type"])
            if filters.get("search"):
                qs = qs.filter(title__icontains=filters["search"])
        return list(qs)

    def get_production_check(self, check_id: int) -> ProductionCheck | None:
        return ProductionCheck.objects.filter(id=check_id).first()

    def _get(self, check_id: int) -> ProductionCheck:
        check = ProductionCheck.objects.filter(id=check_id).first()
        if not check:
            raise ProductionCheckNotFoundError(f"ProductionCheck {check_id} not found")
        return check

    def _get_item(self, item_id: int) -> ProductionChecklistItem:
        item = ProductionChecklistItem.objects.filter(id=item_id).first()
        if not item:
            from check.exceptions import CheckValidationError
            raise CheckValidationError(f"ProductionChecklistItem {item_id} not found")
        return item


# ──────────────────────────────────────────────
#  QualityControlService
# ──────────────────────────────────────────────

class QualityControlService:
    def create_quality_check(self, **kwargs) -> QualityCheck:
        validate_non_empty(kwargs.get("title", ""), "title")
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        check = QualityCheck(**kwargs)
        check.save()
        return check

    def update_quality_check(self, check_id: int, **kwargs) -> QualityCheck:
        check = self._get_check(check_id)
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        for key, value in kwargs.items():
            setattr(check, key, value)
        check.save()
        return check

    def add_checklist_item(self, check_id: int, **kwargs) -> QualityChecklistItem:
        check = self._get_check(check_id)
        validate_non_empty(kwargs.get("question", ""), "question")
        item = QualityChecklistItem(quality_check=check, **kwargs)
        item.save()
        return item

    def update_checklist_item(self, item_id: int, result: str = None, comment: str = None) -> QualityChecklistItem:
        item = QualityChecklistItem.objects.filter(id=item_id).first()
        if not item:
            from check.exceptions import CheckValidationError
            raise CheckValidationError(f"QualityChecklistItem {item_id} not found")
        if result is not None:
            item.result = result
        if comment is not None:
            item.comment = comment
        item.save()
        return item

    def complete_quality_check(self, check_id: int) -> QualityCheck:
        check = self._get_check(check_id)
        if not can_complete_check(check.status):
            raise InvalidStatusTransitionError(
                f"Cannot complete quality check in status '{check.status}'"
            )
        items = check.checklist_items.all()
        total = items.count()
        if total > 0:
            pass_count = items.filter(result=CHECKLIST_RESULT_PASS).count()
            check.score = (pass_count / total) * 100
        else:
            check.score = 0
        check.status = CHECK_STATUS_COMPLETED
        check.save()
        return check

    def create_dmr(self, **kwargs) -> DMR:
        validate_non_empty(kwargs.get("title", ""), "title")
        validate_non_empty(kwargs.get("dmr_number", ""), "dmr_number")
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        dmr = DMR(**kwargs)
        dmr.save()
        return dmr

    def update_dmr(self, dmr_id: int, **kwargs) -> DMR:
        dmr = self._get_dmr(dmr_id)
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        for key, value in kwargs.items():
            setattr(dmr, key, value)
        dmr.save()
        return dmr

    def review_dmr(self, dmr_id: int) -> DMR:
        dmr = self._get_dmr(dmr_id)
        if not can_review_dmr(dmr.status):
            raise InvalidStatusTransitionError(
                f"Cannot review DMR in status '{dmr.status}'"
            )
        dmr.status = DMR_STATUS_UNDER_REVIEW
        dmr.save()
        return dmr

    def disposition_dmr(self, dmr_id: int, disposition: str) -> DMR:
        dmr = self._get_dmr(dmr_id)
        if not can_disposition_dmr(dmr.status):
            raise InvalidStatusTransitionError(
                f"Cannot disposition DMR in status '{dmr.status}'"
            )
        dmr.status = DMR_STATUS_DISPOSITION_PENDING
        dmr.disposition = disposition
        dmr.save()
        return dmr

    def quarantine_dmr(self, dmr_id: int) -> DMR:
        dmr = self._get_dmr(dmr_id)
        if not can_quarantine_dmr(dmr.status):
            raise InvalidStatusTransitionError(
                f"Cannot quarantine DMR in status '{dmr.status}'"
            )
        dmr.status = DMR_STATUS_QUARANTINED
        dmr.save()
        return dmr

    def approve_disposition_dmr(self, dmr_id: int) -> DMR:
        dmr = self._get_dmr(dmr_id)
        if not can_approve_disposition_dmr(dmr.status):
            raise InvalidStatusTransitionError(
                f"Cannot approve DMR disposition in status '{dmr.status}'"
            )
        dmr.status = DMR_STATUS_DISPOSITION_APPROVED
        dmr.save()
        return dmr

    def close_dmr(self, dmr_id: int) -> DMR:
        dmr = self._get_dmr(dmr_id)
        if not can_close_dmr(dmr.status):
            raise InvalidStatusTransitionError(
                f"Cannot close DMR in status '{dmr.status}'"
            )
        dmr.status = DMR_STATUS_CLOSED
        dmr.closed_at = datetime.now()
        dmr.save()
        return dmr

    def cancel_dmr(self, dmr_id: int) -> DMR:
        dmr = self._get_dmr(dmr_id)
        if not can_cancel_dmr(dmr.status):
            raise InvalidStatusTransitionError(
                f"Cannot cancel DMR in status '{dmr.status}'"
            )
        dmr.status = DMR_STATUS_CANCELLED
        dmr.save()
        return dmr

    def create_rma(self, **kwargs) -> RMA:
        validate_non_empty(kwargs.get("rma_number", ""), "rma_number")
        validate_non_empty(kwargs.get("customer_name", ""), "customer_name")
        rma = RMA(**kwargs)
        rma.save()
        return rma

    def update_rma(self, rma_id: int, **kwargs) -> RMA:
        rma = self._get_rma(rma_id)
        for key, value in kwargs.items():
            setattr(rma, key, value)
        rma.save()
        return rma

    def receive_rma(self, rma_id: int) -> RMA:
        rma = self._get_rma(rma_id)
        if not can_receive_rma(rma.status):
            raise InvalidStatusTransitionError(
                f"Cannot receive RMA in status '{rma.status}'"
            )
        rma.status = RMA_STATUS_RECEIVED
        rma.received_date = date.today()
        rma.save()
        return rma

    def review_rma(self, rma_id: int) -> RMA:
        rma = self._get_rma(rma_id)
        if not can_review_rma(rma.status):
            raise InvalidStatusTransitionError(
                f"Cannot review RMA in status '{rma.status}'"
            )
        rma.status = RMA_STATUS_UNDER_REVIEW
        rma.save()
        return rma

    def disposition_rma(self, rma_id: int, disposition: str) -> RMA:
        rma = self._get_rma(rma_id)
        if not can_disposition_rma(rma.status):
            raise InvalidStatusTransitionError(
                f"Cannot disposition RMA in status '{rma.status}'"
            )
        rma.status = RMA_STATUS_DISPOSITION_PENDING
        rma.disposition = disposition
        rma.save()
        return rma

    def close_rma(self, rma_id: int) -> RMA:
        rma = self._get_rma(rma_id)
        if not can_close_rma(rma.status):
            raise InvalidStatusTransitionError(
                f"Cannot close RMA in status '{rma.status}'"
            )
        rma.status = RMA_STATUS_CLOSED
        rma.save()
        return rma

    def cancel_rma(self, rma_id: int) -> RMA:
        rma = self._get_rma(rma_id)
        if not can_cancel_rma(rma.status):
            raise InvalidStatusTransitionError(
                f"Cannot cancel RMA in status '{rma.status}'"
            )
        rma.status = RMA_STATUS_CANCELLED
        rma.save()
        return rma

    def list_quality_checks(self, filters: dict | None = None) -> list[QualityCheck]:
        qs = QualityCheck.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("check_type"):
                qs = qs.filter(check_type=filters["check_type"])
            if filters.get("target_type"):
                qs = qs.filter(target_type=filters["target_type"])
            if filters.get("search"):
                qs = qs.filter(title__icontains=filters["search"])
        return list(qs)

    def get_quality_check(self, check_id: int) -> QualityCheck | None:
        return QualityCheck.objects.filter(id=check_id).first()

    def list_dmrs(self, filters: dict | None = None) -> list[DMR]:
        qs = DMR.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("target_type"):
                qs = qs.filter(target_type=filters["target_type"])
            if filters.get("search"):
                qs = qs.filter(title__icontains=filters["search"])
        return list(qs)

    def get_dmr(self, dmr_id: int) -> DMR | None:
        return DMR.objects.filter(id=dmr_id).first()

    def list_rmas(self, filters: dict | None = None) -> list[RMA]:
        qs = RMA.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("search"):
                qs = qs.filter(customer_name__icontains=filters.get("search", ""))
        return list(qs)

    def get_rma(self, rma_id: int) -> RMA | None:
        return RMA.objects.filter(id=rma_id).first()

    def _get_check(self, check_id: int) -> QualityCheck:
        check = QualityCheck.objects.filter(id=check_id).first()
        if not check:
            raise QualityCheckNotFoundError(f"QualityCheck {check_id} not found")
        return check

    def _get_dmr(self, dmr_id: int) -> DMR:
        dmr = DMR.objects.filter(id=dmr_id).first()
        if not dmr:
            raise DMRNotFoundError(f"DMR {dmr_id} not found")
        return dmr

    def _get_rma(self, rma_id: int) -> RMA:
        rma = RMA.objects.filter(id=rma_id).first()
        if not rma:
            raise RMANotFoundError(f"RMA {rma_id} not found")
        return rma


# ──────────────────────────────────────────────
#  SafetyControlService
# ──────────────────────────────────────────────

class SafetyControlService:
    def create_safety_check(self, **kwargs) -> SafetyCheck:
        validate_non_empty(kwargs.get("title", ""), "title")
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        check = SafetyCheck(**kwargs)
        check.save()
        return check

    def update_safety_check(self, check_id: int, **kwargs) -> SafetyCheck:
        check = self._get_check(check_id)
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        for key, value in kwargs.items():
            setattr(check, key, value)
        check.save()
        return check

    def add_checklist_item(self, check_id: int, **kwargs) -> SafetyChecklistItem:
        check = self._get_check(check_id)
        validate_non_empty(kwargs.get("question", ""), "question")
        item = SafetyChecklistItem(safety_check=check, **kwargs)
        item.save()
        return item

    def update_checklist_item(self, item_id: int, result: str = None, comment: str = None) -> SafetyChecklistItem:
        item = SafetyChecklistItem.objects.filter(id=item_id).first()
        if not item:
            from check.exceptions import CheckValidationError
            raise CheckValidationError(f"SafetyChecklistItem {item_id} not found")
        if result is not None:
            item.result = result
        if comment is not None:
            item.comment = comment
        item.save()
        return item

    def complete_safety_check(self, check_id: int) -> SafetyCheck:
        check = self._get_check(check_id)
        if not can_complete_check(check.status):
            raise InvalidStatusTransitionError(
                f"Cannot complete safety check in status '{check.status}'"
            )
        items = check.checklist_items.all()
        total = items.count()
        if total > 0:
            pass_count = items.filter(result=CHECKLIST_RESULT_PASS).count()
            check.score = (pass_count / total) * 100
        else:
            check.score = 0
        check.status = CHECK_STATUS_COMPLETED
        check.save()
        return check

    def create_safety_incident(self, **kwargs) -> SafetyIncident:
        validate_non_empty(kwargs.get("title", ""), "title")
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        incident = SafetyIncident(**kwargs)
        incident.save()
        return incident

    def update_safety_incident(self, incident_id: int, **kwargs) -> SafetyIncident:
        incident = self._get_incident(incident_id)
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        for key, value in kwargs.items():
            setattr(incident, key, value)
        incident.save()
        return incident

    def contain_safety_incident(self, incident_id: int) -> SafetyIncident:
        incident = self._get_incident(incident_id)
        if not can_contain_safety_incident(incident.status):
            raise InvalidStatusTransitionError(
                f"Cannot contain safety incident in status '{incident.status}'"
            )
        incident.status = INCIDENT_STATUS_CONTAINED
        incident.save()
        return incident

    def review_safety_incident(self, incident_id: int) -> SafetyIncident:
        incident = self._get_incident(incident_id)
        if not can_review_safety_incident(incident.status):
            raise InvalidStatusTransitionError(
                f"Cannot review safety incident in status '{incident.status}'"
            )
        incident.status = INCIDENT_STATUS_UNDER_REVIEW
        incident.save()
        return incident

    def close_safety_incident(self, incident_id: int) -> SafetyIncident:
        incident = self._get_incident(incident_id)
        if not can_close_safety_incident(incident.status):
            raise InvalidStatusTransitionError(
                f"Cannot close safety incident in status '{incident.status}'"
            )
        incident.status = INCIDENT_STATUS_CLOSED
        incident.closed_at = datetime.now()
        incident.save()
        return incident

    def cancel_safety_incident(self, incident_id: int) -> SafetyIncident:
        incident = self._get_incident(incident_id)
        if not can_cancel_safety_incident(incident.status):
            raise InvalidStatusTransitionError(
                f"Cannot cancel safety incident in status '{incident.status}'"
            )
        incident.status = INCIDENT_STATUS_CANCELLED
        incident.save()
        return incident

    def list_safety_checks(self, filters: dict | None = None) -> list[SafetyCheck]:
        qs = SafetyCheck.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("check_type"):
                qs = qs.filter(check_type=filters["check_type"])
            if filters.get("target_type"):
                qs = qs.filter(target_type=filters["target_type"])
            if filters.get("search"):
                qs = qs.filter(title__icontains=filters["search"])
        return list(qs)

    def get_safety_check(self, check_id: int) -> SafetyCheck | None:
        return SafetyCheck.objects.filter(id=check_id).first()

    def list_safety_incidents(self, filters: dict | None = None) -> list[SafetyIncident]:
        qs = SafetyIncident.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("incident_type"):
                qs = qs.filter(incident_type=filters["incident_type"])
            if filters.get("target_type"):
                qs = qs.filter(target_type=filters["target_type"])
            if filters.get("search"):
                qs = qs.filter(title__icontains=filters["search"])
        return list(qs)

    def get_safety_incident(self, incident_id: int) -> SafetyIncident | None:
        return SafetyIncident.objects.filter(id=incident_id).first()

    def _get_check(self, check_id: int) -> SafetyCheck:
        check = SafetyCheck.objects.filter(id=check_id).first()
        if not check:
            raise SafetyCheckNotFoundError(f"SafetyCheck {check_id} not found")
        return check

    def _get_incident(self, incident_id: int) -> SafetyIncident:
        incident = SafetyIncident.objects.filter(id=incident_id).first()
        if not incident:
            raise SafetyIncidentNotFoundError(f"SafetyIncident {incident_id} not found")
        return incident


# ──────────────────────────────────────────────
#  SafetyEventService
# ──────────────────────────────────────────────

class SafetyEventService:
    def create_event(self, **kwargs) -> SafetyEvent:
        validate_non_empty(kwargs.get("title", ""), "title")
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        if "reported_at" not in kwargs or not kwargs.get("reported_at"):
            from datetime import datetime
            kwargs["reported_at"] = datetime.now()
        event = SafetyEvent(**kwargs)
        event.save()
        return event

    def update_event(self, event_id: int, **kwargs) -> SafetyEvent:
        event = self._get(event_id)
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        for key, value in kwargs.items():
            setattr(event, key, value)
        event.save()
        return event

    def report_event(self, event_id: int) -> SafetyEvent:
        event = self._get(event_id)
        if not can_report_event(event.status):
            raise InvalidStatusTransitionError(
                f"Cannot report event in status '{event.status}'"
            )
        event.status = EVENT_STATUS_REPORTED
        event.save()
        return event

    def review_event(self, event_id: int) -> SafetyEvent:
        event = self._get(event_id)
        if not can_review_event(event.status):
            raise InvalidStatusTransitionError(
                f"Cannot review event in status '{event.status}'"
            )
        event.status = EVENT_STATUS_UNDER_REVIEW
        event.save()
        return event

    def require_action_event(self, event_id: int) -> SafetyEvent:
        event = self._get(event_id)
        if not can_require_action_event(event.status):
            raise InvalidStatusTransitionError(
                f"Cannot mark event action-required in status '{event.status}'"
            )
        event.status = EVENT_STATUS_ACTION_REQUIRED
        event.save()
        return event

    def close_event(self, event_id: int) -> SafetyEvent:
        event = self._get(event_id)
        if not can_close_event(event.status):
            raise InvalidStatusTransitionError(
                f"Cannot close event in status '{event.status}'"
            )
        event.status = EVENT_STATUS_CLOSED
        from datetime import datetime
        event.closed_at = datetime.now()
        event.save()
        return event

    def cancel_event(self, event_id: int) -> SafetyEvent:
        event = self._get(event_id)
        if not can_cancel_event(event.status):
            raise InvalidStatusTransitionError(
                f"Cannot cancel event in status '{event.status}'"
            )
        event.status = EVENT_STATUS_CANCELLED
        event.save()
        return event

    def list_events(self, filters: dict | None = None) -> list[SafetyEvent]:
        qs = SafetyEvent.objects.all()
        if filters:
            if filters.get("event_type"):
                types = [t.strip() for t in filters["event_type"].split(",") if t.strip()]
                if len(types) == 1:
                    qs = qs.filter(event_type=types[0])
                else:
                    qs = qs.filter(event_type__in=types)
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("target_type"):
                qs = qs.filter(target_type=filters["target_type"])
            if filters.get("severity"):
                qs = qs.filter(severity=filters["severity"])
            if filters.get("search"):
                qs = qs.filter(title__icontains=filters["search"])
            if filters.get("is_overdue"):
                from datetime import date
                qs = qs.filter(
                    Q(status__in=["ACTION_REQUIRED", "UNDER_REVIEW"]) &
                    Q(occurred_at__lt=date.today())
                )
        return list(qs)

    def get_event(self, event_id: int) -> SafetyEvent | None:
        return SafetyEvent.objects.filter(id=event_id).first()

    def _get(self, event_id: int) -> SafetyEvent:
        event = SafetyEvent.objects.filter(id=event_id).first()
        if not event:
            raise SafetyEventNotFoundError(f"SafetyEvent {event_id} not found")
        return event


# ──────────────────────────────────────────────
#  MaterialControlService
# ──────────────────────────────────────────────

class MaterialControlService:
    def create_material_check(self, **kwargs) -> MaterialCheck:
        validate_non_empty(kwargs.get("title", ""), "title")
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        check = MaterialCheck(**kwargs)
        check.save()
        return check

    def update_material_check(self, check_id: int, **kwargs) -> MaterialCheck:
        check = self._get_check(check_id)
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        for key, value in kwargs.items():
            setattr(check, key, value)
        check.save()
        return check

    def add_checklist_item(self, check_id: int, **kwargs) -> MaterialChecklistItem:
        check = self._get_check(check_id)
        validate_non_empty(kwargs.get("question", ""), "question")
        item = MaterialChecklistItem(material_check=check, **kwargs)
        item.save()
        return item

    def update_checklist_item(self, item_id: int, result: str = None, comment: str = None) -> MaterialChecklistItem:
        item = MaterialChecklistItem.objects.filter(id=item_id).first()
        if not item:
            from check.exceptions import CheckValidationError
            raise CheckValidationError(f"MaterialChecklistItem {item_id} not found")
        if result is not None:
            item.result = result
        if comment is not None:
            item.comment = comment
        item.save()
        return item

    def complete_material_check(self, check_id: int) -> MaterialCheck:
        check = self._get_check(check_id)
        if not can_complete_check(check.status):
            raise InvalidStatusTransitionError(
                f"Cannot complete material check in status '{check.status}'"
            )
        items = check.checklist_items.all()
        total = items.count()
        if total > 0:
            pass_count = items.filter(result=CHECKLIST_RESULT_PASS).count()
            check.score = (pass_count / total) * 100
        else:
            check.score = 0
        check.status = CHECK_STATUS_COMPLETED
        check.save()
        return check

    def create_material_issue(self, **kwargs) -> MaterialIssue:
        validate_non_empty(kwargs.get("title", ""), "title")
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        issue = MaterialIssue(**kwargs)
        issue.save()
        return issue

    def update_material_issue(self, issue_id: int, **kwargs) -> MaterialIssue:
        issue = self._get_issue(issue_id)
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        for key, value in kwargs.items():
            setattr(issue, key, value)
        issue.save()
        return issue

    def contain_material_issue(self, issue_id: int) -> MaterialIssue:
        issue = self._get_issue(issue_id)
        if not can_contain_material_issue(issue.status):
            raise InvalidStatusTransitionError(
                f"Cannot contain material issue in status '{issue.status}'"
            )
        issue.status = MATERIAL_ISSUE_STATUS_CONTAINED
        issue.save()
        return issue

    def resolve_material_issue(self, issue_id: int) -> MaterialIssue:
        issue = self._get_issue(issue_id)
        if not can_resolve_material_issue(issue.status):
            raise InvalidStatusTransitionError(
                f"Cannot resolve material issue in status '{issue.status}'"
            )
        issue.status = MATERIAL_ISSUE_STATUS_RESOLVED
        issue.save()
        return issue

    def close_material_issue(self, issue_id: int) -> MaterialIssue:
        issue = self._get_issue(issue_id)
        if not can_close_material_issue(issue.status):
            raise InvalidStatusTransitionError(
                f"Cannot close material issue in status '{issue.status}'"
            )
        issue.status = MATERIAL_ISSUE_STATUS_CLOSED
        issue.save()
        return issue

    def cancel_material_issue(self, issue_id: int) -> MaterialIssue:
        issue = self._get_issue(issue_id)
        if not can_cancel_material_issue(issue.status):
            raise InvalidStatusTransitionError(
                f"Cannot cancel material issue in status '{issue.status}'"
            )
        issue.status = MATERIAL_ISSUE_STATUS_CANCELLED
        issue.save()
        return issue

    def list_material_checks(self, filters: dict | None = None) -> list[MaterialCheck]:
        qs = MaterialCheck.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("check_type"):
                qs = qs.filter(check_type=filters["check_type"])
            if filters.get("target_type"):
                qs = qs.filter(target_type=filters["target_type"])
            if filters.get("search"):
                qs = qs.filter(title__icontains=filters["search"])
        return list(qs)

    def get_material_check(self, check_id: int) -> MaterialCheck | None:
        return MaterialCheck.objects.filter(id=check_id).first()

    def list_material_issues(self, filters: dict | None = None) -> list[MaterialIssue]:
        qs = MaterialIssue.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("issue_type"):
                qs = qs.filter(issue_type=filters["issue_type"])
            if filters.get("target_type"):
                qs = qs.filter(target_type=filters["target_type"])
            if filters.get("search"):
                qs = qs.filter(title__icontains=filters["search"])
        return list(qs)

    def get_material_issue(self, issue_id: int) -> MaterialIssue | None:
        return MaterialIssue.objects.filter(id=issue_id).first()

    def _get_check(self, check_id: int) -> MaterialCheck:
        check = MaterialCheck.objects.filter(id=check_id).first()
        if not check:
            raise MaterialCheckNotFoundError(f"MaterialCheck {check_id} not found")
        return check

    def _get_issue(self, issue_id: int) -> MaterialIssue:
        issue = MaterialIssue.objects.filter(id=issue_id).first()
        if not issue:
            raise MaterialIssueNotFoundError(f"MaterialIssue {issue_id} not found")
        return issue


# ──────────────────────────────────────────────
#  SafetyInjuryClaimService
# ──────────────────────────────────────────────

class SafetyInjuryClaimService:
    def create(self, **kwargs) -> SafetyInjuryClaim:
        validate_non_empty(kwargs.get("claimant_name", ""), "claimant_name")
        validate_non_empty(kwargs.get("claim_type", ""), "claim_type")
        if kwargs.get("safety_event"):
            self._validate_event_exists(kwargs["safety_event"])
            self._validate_event_has_injury(kwargs["safety_event"], kwargs.get("override_reason", ""))
        if "override_reason" in kwargs:
            del kwargs["override_reason"]
        claim = SafetyInjuryClaim(**kwargs)
        claim.save()
        return claim

    def update(self, claim_id: int, **kwargs) -> SafetyInjuryClaim:
        claim = self._get(claim_id)
        if kwargs.get("safety_event"):
            self._validate_event_exists(kwargs["safety_event"])
            self._validate_event_has_injury(kwargs["safety_event"], kwargs.get("override_reason", ""))
        skip = {"override_reason"}
        for key, value in kwargs.items():
            if key not in skip:
                setattr(claim, key, value)
        claim.save()
        return claim

    def open_claim(self, claim_id: int) -> SafetyInjuryClaim:
        from check.domain_rules import can_open_claim
        claim = self._get(claim_id)
        if not can_open_claim(claim.status):
            raise InvalidStatusTransitionError(f"Cannot open claim in status '{claim.status}'")
        claim.status = "OPEN"
        from datetime import datetime
        claim.opened_at = datetime.now()
        claim.save()
        return claim

    def review_claim(self, claim_id: int) -> SafetyInjuryClaim:
        from check.domain_rules import can_review_claim
        claim = self._get(claim_id)
        if not can_review_claim(claim.status):
            raise InvalidStatusTransitionError(f"Cannot review claim in status '{claim.status}'")
        claim.status = "UNDER_REVIEW"
        claim.save()
        return claim

    def wait_info_claim(self, claim_id: int) -> SafetyInjuryClaim:
        from check.domain_rules import can_wait_info_claim
        claim = self._get(claim_id)
        if not can_wait_info_claim(claim.status):
            raise InvalidStatusTransitionError(f"Cannot set waiting info for claim in status '{claim.status}'")
        claim.status = "WAITING_INFO"
        claim.save()
        return claim

    def close_claim(self, claim_id: int) -> SafetyInjuryClaim:
        from check.domain_rules import can_close_claim
        claim = self._get(claim_id)
        if not can_close_claim(claim.status):
            raise InvalidStatusTransitionError(f"Cannot close claim in status '{claim.status}'")
        claim.status = "CLOSED"
        from datetime import datetime
        claim.closed_at = datetime.now()
        claim.save()
        return claim

    def cancel_claim(self, claim_id: int) -> SafetyInjuryClaim:
        from check.domain_rules import can_cancel_claim
        claim = self._get(claim_id)
        if not can_cancel_claim(claim.status):
            raise InvalidStatusTransitionError(f"Cannot cancel claim in status '{claim.status}'")
        claim.status = "CANCELLED"
        claim.save()
        return claim

    def list(self, filters: dict | None = None) -> list[SafetyInjuryClaim]:
        qs = SafetyInjuryClaim.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("claim_type"):
                qs = qs.filter(claim_type=filters["claim_type"])
            if filters.get("safety_event_id"):
                qs = qs.filter(safety_event_id=filters["safety_event_id"])
            if filters.get("search"):
                qs = qs.filter(claimant_name__icontains=filters["search"])
        return list(qs)

    def get(self, claim_id: int) -> SafetyInjuryClaim | None:
        return SafetyInjuryClaim.objects.filter(id=claim_id).first()

    def _get(self, claim_id: int) -> SafetyInjuryClaim:
        claim = SafetyInjuryClaim.objects.filter(id=claim_id).first()
        if not claim:
            raise SafetyInjuryClaimNotFoundError(f"SafetyInjuryClaim {claim_id} not found")
        return claim

    def _validate_event_exists(self, event_id: int):
        if not SafetyEvent.objects.filter(id=event_id).exists():
            raise SafetyComplianceValidationError(f"SafetyEvent {event_id} does not exist")

    def _validate_event_has_injury(self, event_id: int, override_reason: str = ""):
        event = SafetyEvent.objects.filter(id=event_id).first()
        if event and not event.injury_involved and not override_reason:
            raise SafetyComplianceValidationError(
                "Linked safety event does not have injury_involved=True. Provide override_reason if intentional."
            )


# ──────────────────────────────────────────────
#  SafetyMedicalCaseService
# ──────────────────────────────────────────────

class SafetyMedicalCaseService:
    def create(self, **kwargs) -> SafetyMedicalCase:
        validate_non_empty(kwargs.get("care_type", ""), "care_type")
        if kwargs.get("safety_event"):
            self._validate_event_exists(kwargs["safety_event"])
        if kwargs.get("injury_claim"):
            self._validate_claim_exists(kwargs["injury_claim"])
        if kwargs.get("affected_person_id"):
            self._validate_person_exists(kwargs["affected_person_id"])
            kwargs["affected_person_id"] = kwargs.pop("affected_person_id")
        case = SafetyMedicalCase(**kwargs)
        case.save()
        return case

    def update(self, case_id: int, **kwargs) -> SafetyMedicalCase:
        case = self._get(case_id)
        if kwargs.get("safety_event"):
            self._validate_event_exists(kwargs["safety_event"])
        if kwargs.get("injury_claim"):
            self._validate_claim_exists(kwargs["injury_claim"])
        if kwargs.get("affected_person_id"):
            self._validate_person_exists(kwargs["affected_person_id"])
            kwargs["affected_person_id"] = kwargs.pop("affected_person_id")
        for key, value in kwargs.items():
            setattr(case, key, value)
        case.save()
        return case

    def open_case(self, case_id: int) -> SafetyMedicalCase:
        from check.domain_rules import can_open_medical
        case = self._get(case_id)
        if not can_open_medical(case.status):
            raise InvalidStatusTransitionError(f"Cannot open medical case in status '{case.status}'")
        case.status = "OPEN"
        case.save()
        return case

    def monitor_case(self, case_id: int) -> SafetyMedicalCase:
        from check.domain_rules import can_monitor_medical
        case = self._get(case_id)
        if not can_monitor_medical(case.status):
            raise InvalidStatusTransitionError(f"Cannot monitor medical case in status '{case.status}'")
        case.status = "MONITORING"
        case.save()
        return case

    def return_to_work(self, case_id: int) -> SafetyMedicalCase:
        from check.domain_rules import can_return_to_work
        case = self._get(case_id)
        if not can_return_to_work(case.status):
            raise InvalidStatusTransitionError(f"Cannot return to work for case in status '{case.status}'")
        case.status = "RETURNED_TO_WORK"
        from datetime import datetime
        case.return_to_work_date = datetime.now()
        case.save()
        return case

    def close_case(self, case_id: int) -> SafetyMedicalCase:
        from check.domain_rules import can_close_medical
        case = self._get(case_id)
        if not can_close_medical(case.status):
            raise InvalidStatusTransitionError(f"Cannot close medical case in status '{case.status}'")
        case.status = "CLOSED"
        case.save()
        return case

    def cancel_case(self, case_id: int) -> SafetyMedicalCase:
        from check.domain_rules import can_cancel_medical
        case = self._get(case_id)
        if not can_cancel_medical(case.status):
            raise InvalidStatusTransitionError(f"Cannot cancel medical case in status '{case.status}'")
        case.status = "CANCELLED"
        case.save()
        return case

    def list(self, filters: dict | None = None) -> list[SafetyMedicalCase]:
        qs = SafetyMedicalCase.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("care_type"):
                qs = qs.filter(care_type=filters["care_type"])
            if filters.get("safety_event_id"):
                qs = qs.filter(safety_event_id=filters["safety_event_id"])
            if filters.get("injury_claim_id"):
                qs = qs.filter(injury_claim_id=filters["injury_claim_id"])
        return list(qs)

    def get(self, case_id: int) -> SafetyMedicalCase | None:
        return SafetyMedicalCase.objects.filter(id=case_id).first()

    def _get(self, case_id: int) -> SafetyMedicalCase:
        case = SafetyMedicalCase.objects.filter(id=case_id).first()
        if not case:
            raise SafetyMedicalCaseNotFoundError(f"SafetyMedicalCase {case_id} not found")
        return case

    def _validate_event_exists(self, event_id: int):
        if not SafetyEvent.objects.filter(id=event_id).exists():
            raise SafetyComplianceValidationError(f"SafetyEvent {event_id} does not exist")

    def _validate_claim_exists(self, claim_id: int):
        if not SafetyInjuryClaim.objects.filter(id=claim_id).exists():
            raise SafetyComplianceValidationError(f"SafetyInjuryClaim {claim_id} does not exist")

    def _validate_person_exists(self, person_id: int):
        from administration.models import UserProfile
        if not UserProfile.objects.filter(id=person_id).exists():
            raise SafetyComplianceValidationError(f"UserProfile {person_id} does not exist")


# ──────────────────────────────────────────────
#  SafetyEnvironmentalReportService
# ──────────────────────────────────────────────

class SafetyEnvironmentalReportService:
    def create(self, **kwargs) -> SafetyEnvironmentalReport:
        validate_non_empty(kwargs.get("title", ""), "title")
        validate_non_empty(kwargs.get("report_type", ""), "report_type")
        if kwargs.get("safety_event"):
            self._validate_event_exists(kwargs["safety_event"])
            self._validate_event_env_impact(kwargs["safety_event"], kwargs.get("override_reason", ""))
        if "override_reason" in kwargs:
            del kwargs["override_reason"]
        report = SafetyEnvironmentalReport(**kwargs)
        report.save()
        return report

    def update(self, report_id: int, **kwargs) -> SafetyEnvironmentalReport:
        report = self._get(report_id)
        if kwargs.get("safety_event"):
            self._validate_event_exists(kwargs["safety_event"])
            self._validate_event_env_impact(kwargs["safety_event"], kwargs.get("override_reason", ""))
        skip = {"override_reason"}
        for key, value in kwargs.items():
            if key not in skip:
                setattr(report, key, value)
        report.save()
        return report

    def report(self, report_id: int) -> SafetyEnvironmentalReport:
        from check.domain_rules import can_report_env_report
        report = self._get(report_id)
        if not can_report_env_report(report.status):
            raise InvalidStatusTransitionError(f"Cannot report in status '{report.status}'")
        report.status = "REPORTED"
        from datetime import datetime
        report.reported_at = datetime.now()
        report.save()
        return report

    def review(self, report_id: int) -> SafetyEnvironmentalReport:
        from check.domain_rules import can_review_env_report
        report = self._get(report_id)
        if not can_review_env_report(report.status):
            raise InvalidStatusTransitionError(f"Cannot review in status '{report.status}'")
        report.status = "UNDER_REVIEW"
        report.save()
        return report

    def require_action(self, report_id: int) -> SafetyEnvironmentalReport:
        from check.domain_rules import can_require_action_env_report
        report = self._get(report_id)
        if not can_require_action_env_report(report.status):
            raise InvalidStatusTransitionError(f"Cannot require action in status '{report.status}'")
        report.status = "ACTION_REQUIRED"
        report.save()
        return report

    def close(self, report_id: int) -> SafetyEnvironmentalReport:
        from check.domain_rules import can_close_env_report
        report = self._get(report_id)
        if not can_close_env_report(report.status):
            raise InvalidStatusTransitionError(f"Cannot close in status '{report.status}'")
        report.status = "CLOSED"
        report.save()
        return report

    def cancel(self, report_id: int) -> SafetyEnvironmentalReport:
        from check.domain_rules import can_cancel_env_report
        report = self._get(report_id)
        if not can_cancel_env_report(report.status):
            raise InvalidStatusTransitionError(f"Cannot cancel in status '{report.status}'")
        report.status = "CANCELLED"
        report.save()
        return report

    def list(self, filters: dict | None = None) -> list[SafetyEnvironmentalReport]:
        qs = SafetyEnvironmentalReport.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("report_type"):
                qs = qs.filter(report_type=filters["report_type"])
            if filters.get("safety_event_id"):
                qs = qs.filter(safety_event_id=filters["safety_event_id"])
            if filters.get("search"):
                qs = qs.filter(title__icontains=filters["search"])
        return list(qs)

    def get(self, report_id: int) -> SafetyEnvironmentalReport | None:
        return SafetyEnvironmentalReport.objects.filter(id=report_id).first()

    def _get(self, report_id: int) -> SafetyEnvironmentalReport:
        report = SafetyEnvironmentalReport.objects.filter(id=report_id).first()
        if not report:
            raise SafetyEnvironmentalReportNotFoundError(f"SafetyEnvironmentalReport {report_id} not found")
        return report

    def _validate_event_exists(self, event_id: int):
        if not SafetyEvent.objects.filter(id=event_id).exists():
            raise SafetyComplianceValidationError(f"SafetyEvent {event_id} does not exist")

    def _validate_event_env_impact(self, event_id: int, override_reason: str = ""):
        event = SafetyEvent.objects.filter(id=event_id).first()
        if event and not event.environmental_impact and not override_reason:
            raise SafetyComplianceValidationError(
                "Linked safety event does not have environmental_impact=True. Provide override_reason if intentional."
            )


# ──────────────────────────────────────────────
#  SafetyCAPAService
# ──────────────────────────────────────────────

class SafetyCAPAService:
    CAPA_SOURCE_TYPES = ["SAFETY_EVENT", "SAFETY_CHECK", "INJURY_CLAIM", "MEDICAL_CASE", "ENVIRONMENTAL_REPORT"]

    def create(self, **kwargs) -> SafetyCAPA:
        validate_non_empty(kwargs.get("title", ""), "title")
        source_type = kwargs.get("source_type", "")
        if source_type:
            if source_type not in self.CAPA_SOURCE_TYPES:
                raise SafetyComplianceValidationError(
                    f"Invalid source_type '{source_type}'. Must be one of: {', '.join(self.CAPA_SOURCE_TYPES)}"
                )
            self._validate_source_exists(kwargs["source_type"], kwargs.get("source_id", None))
        capa = SafetyCAPA(**kwargs)
        capa.save()
        return capa

    def update(self, capa_id: int, **kwargs) -> SafetyCAPA:
        capa = self._get(capa_id)
        source_type = kwargs.get("source_type", capa.source_type)
        if source_type and source_type not in self.CAPA_SOURCE_TYPES:
            raise SafetyComplianceValidationError(
                f"Invalid source_type '{source_type}'. Must be one of: {', '.join(self.CAPA_SOURCE_TYPES)}"
            )
        source_id = kwargs.get("source_id", capa.source_id)
        if source_type and source_id:
            self._validate_source_exists(source_type, source_id)
        for key, value in kwargs.items():
            setattr(capa, key, value)
        capa.save()
        return capa

    def open(self, capa_id: int) -> SafetyCAPA:
        from check.domain_rules import can_open_capa
        capa = self._get(capa_id)
        if not can_open_capa(capa.status):
            raise InvalidStatusTransitionError(f"Cannot open CAPA in status '{capa.status}'")
        capa.status = "OPEN"
        capa.save()
        return capa

    def start(self, capa_id: int) -> SafetyCAPA:
        from check.domain_rules import can_start_capa
        capa = self._get(capa_id)
        if not can_start_capa(capa.status):
            raise InvalidStatusTransitionError(f"Cannot start CAPA in status '{capa.status}'")
        capa.status = "IN_PROGRESS"
        capa.save()
        return capa

    def pending_effectiveness(self, capa_id: int) -> SafetyCAPA:
        from check.domain_rules import can_pending_effectiveness_capa
        capa = self._get(capa_id)
        if not can_pending_effectiveness_capa(capa.status):
            raise InvalidStatusTransitionError(f"Cannot set pending effectiveness in status '{capa.status}'")
        capa.status = "PENDING_EFFECTIVENESS"
        capa.save()
        return capa

    def complete_effectiveness(self, capa_id: int, effective: bool) -> SafetyCAPA:
        from check.domain_rules import can_complete_effectiveness_capa
        capa = self._get(capa_id)
        if not can_complete_effectiveness_capa(capa.status):
            raise InvalidStatusTransitionError(f"Cannot complete effectiveness in status '{capa.status}'")
        from datetime import datetime
        capa.status = "EFFECTIVE" if effective else "INEFFECTIVE"
        capa.effectiveness_result = "EFFECTIVE" if effective else "INEFFECTIVE"
        capa.completed_at = datetime.now()
        capa.save()
        return capa

    def close(self, capa_id: int) -> SafetyCAPA:
        from check.domain_rules import can_close_capa
        capa = self._get(capa_id)
        if not can_close_capa(capa.status):
            raise InvalidStatusTransitionError(f"Cannot close CAPA in status '{capa.status}'")
        from datetime import datetime
        capa.status = "CLOSED"
        if not capa.completed_at:
            capa.completed_at = datetime.now()
        capa.save()
        return capa

    def cancel(self, capa_id: int) -> SafetyCAPA:
        from check.domain_rules import can_cancel_capa
        capa = self._get(capa_id)
        if not can_cancel_capa(capa.status):
            raise InvalidStatusTransitionError(f"Cannot cancel CAPA in status '{capa.status}'")
        capa.status = "CANCELLED"
        capa.save()
        return capa

    def list(self, filters: dict | None = None) -> list[SafetyCAPA]:
        qs = SafetyCAPA.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("source_type"):
                qs = qs.filter(source_type=filters["source_type"])
            if filters.get("source_id"):
                qs = qs.filter(source_id=filters["source_id"])
            if filters.get("owner"):
                qs = qs.filter(owner__icontains=filters["owner"])
            if filters.get("search"):
                qs = qs.filter(title__icontains=filters["search"])
        return list(qs)

    def get(self, capa_id: int) -> SafetyCAPA | None:
        return SafetyCAPA.objects.filter(id=capa_id).first()

    def _get(self, capa_id: int) -> SafetyCAPA:
        capa = SafetyCAPA.objects.filter(id=capa_id).first()
        if not capa:
            raise SafetyCAPANotFoundError(f"SafetyCAPA {capa_id} not found")
        return capa

    def _validate_source_exists(self, source_type: str, source_id: int | None):
        if not source_id:
            return
        models_map = {
            "SAFETY_EVENT": SafetyEvent,
            "SAFETY_CHECK": SafetyCheck,
            "INJURY_CLAIM": SafetyInjuryClaim,
            "MEDICAL_CASE": SafetyMedicalCase,
            "ENVIRONMENTAL_REPORT": SafetyEnvironmentalReport,
        }
        model_cls = models_map.get(source_type)
        if model_cls and not model_cls.objects.filter(id=source_id).exists():
            raise SafetyComplianceValidationError(f"{source_type} {source_id} does not exist")
