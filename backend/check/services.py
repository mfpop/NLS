"""Application services for the check domain."""

from datetime import date, datetime

from django.db.models import Count, Q

from check.models import (
    Problem, Action,
    ProductionCheck, ProductionChecklistItem,
    QualityCheck, QualityChecklistItem,
    DMR, RMA,
    SafetyCheck, SafetyChecklistItem, SafetyIncident,
    MaterialCheck, MaterialChecklistItem, MaterialIssue,
)
from check.constants import (
    PROBLEM_STATUS_IN_REVIEW, PROBLEM_STATUS_CONTAINED,
    PROBLEM_STATUS_CLOSED, PROBLEM_STATUS_CANCELLED,
    ACTION_STATUS_IN_PROGRESS, ACTION_STATUS_DONE, ACTION_STATUS_CANCELLED,
    CHECK_STATUS_COMPLETED,
    DMR_STATUS_UNDER_REVIEW, DMR_STATUS_QUARANTINED,
    DMR_STATUS_DISPOSITION_PENDING, DMR_STATUS_DISPOSITION_APPROVED,
    DMR_STATUS_CLOSED, DMR_STATUS_CANCELLED,
    RMA_STATUS_RECEIVED, RMA_STATUS_UNDER_REVIEW,
    RMA_STATUS_DISPOSITION_PENDING, RMA_STATUS_CLOSED, RMA_STATUS_CANCELLED,
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
    can_contain_safety_incident, can_review_safety_incident,
    can_close_safety_incident, can_cancel_safety_incident,
    can_contain_material_issue, can_resolve_material_issue,
    can_close_material_issue, can_cancel_material_issue,
)
from check.exceptions import (
    ProblemNotFoundError, ActionNotFoundError,
    ProductionCheckNotFoundError, QualityCheckNotFoundError,
    DMRNotFoundError, RMANotFoundError,
    SafetyCheckNotFoundError, SafetyIncidentNotFoundError,
    MaterialCheckNotFoundError, MaterialIssueNotFoundError,
    InvalidStatusTransitionError,
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

    def contain_problem(self, problem_id: int) -> Problem:
        problem = self._get(problem_id)
        if not can_contain_problem(problem.status):
            raise InvalidStatusTransitionError(
                f"Cannot contain problem in status '{problem.status}'"
            )
        problem.status = PROBLEM_STATUS_CONTAINED
        problem.save()
        return problem

    def close_problem(self, problem_id: int) -> Problem:
        problem = self._get(problem_id)
        if not can_close_problem(problem.status):
            raise InvalidStatusTransitionError(
                f"Cannot close problem in status '{problem.status}'"
            )
        problem.status = PROBLEM_STATUS_CLOSED
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

    def complete_action(self, action_id: int) -> Action:
        action = self._get(action_id)
        if not can_complete_action(action.status):
            raise InvalidStatusTransitionError(
                f"Cannot complete action in status '{action.status}'"
            )
        action.status = ACTION_STATUS_DONE
        action.completed_at = datetime.now()
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
