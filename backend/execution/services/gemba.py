"""Gemba Walk service — owns all session and observation lifecycle logic."""

from datetime import date, datetime

from django.db import transaction
from django.db.models import Q

from execution.constants import (
    GEMBA_SESSION_PLANNED,
    GEMBA_SESSION_IN_PROGRESS,
    GEMBA_SESSION_COMPLETED,
    GEMBA_SESSION_CANCELLED,
    GEMBA_OBSERVATION_STATUS_OPEN,
    GEMBA_OBSERVATION_STATUS_IN_REVIEW,
    GEMBA_OBSERVATION_STATUS_ACTION_REQUIRED,
    GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ACTION,
    GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ISSUE,
    GEMBA_OBSERVATION_STATUS_RESOLVED,
    GEMBA_OBSERVATION_STATUS_VERIFIED,
    GEMBA_OBSERVATION_STATUS_CLOSED,
    GEMBA_OBSERVATION_STATUS_REOPENED,
    GEMBA_OBSERVATION_STATUS_CANCELLED,
    GEMBA_EVENT_CREATED,
    GEMBA_EVENT_UPDATED,
    GEMBA_EVENT_ASSIGNED,
    GEMBA_EVENT_DUE_DATE_SET,
    GEMBA_EVENT_STATUS_CHANGED,
    GEMBA_EVENT_CONVERTED_TO_ACTION,
    GEMBA_EVENT_CONVERTED_TO_ISSUE,
    GEMBA_EVENT_RESOLVED,
    GEMBA_EVENT_VERIFIED,
    GEMBA_EVENT_CLOSED,
    GEMBA_EVENT_REOPENED,
    GEMBA_EVENT_CANCELLED,
    GEMBA_SEVERITY_MEDIUM,
)
from execution.domain_rules import (
    can_start_session,
    can_complete_session,
    can_cancel_session,
    can_add_observation_to_session,
    can_review_observation,
    can_require_action,
    can_resolve_observation,
    can_verify_observation,
    can_close_observation,
    can_reopen_observation,
    can_cancel_observation,
    can_convert_to_issue,
    can_convert_to_action,
    can_assign_observation,
)
from execution.exceptions import (
    GembaSessionNotFoundError,
    GembaObservationNotFoundError,
    GembaSessionAlreadyActiveError,
    GembaSessionCompletedError,
    GembaObservationAlreadyConvertedError,
    GembaValidationError,
    InvalidStatusTransitionError,
)
from execution.models import GembaWalkSession, GembaObservation, GembaObservationActivity

# ── Helpers ──


def _record_activity(observation, event_type, message, user=None, old_status=None, new_status=None):
    GembaObservationActivity.objects.create(
        observation=observation,
        event_type=event_type,
        message=message,
        old_status=old_status,
        new_status=new_status,
        actor=user,
    )


def _get_session(session_id: int) -> GembaWalkSession:
    try:
        return GembaWalkSession.objects.get(id=session_id)
    except GembaWalkSession.DoesNotExist:
        raise GembaSessionNotFoundError(f"GembaWalkSession {session_id} not found")


def _get_observation(observation_id: int) -> GembaObservation:
    try:
        return GembaObservation.objects.get(id=observation_id)
    except GembaObservation.DoesNotExist:
        raise GembaObservationNotFoundError(f"GembaObservation {observation_id} not found")


# ── Service ──


class GembaWalkService:

    # ── Session lifecycle ──

    @transaction.atomic
    def get_or_create_daily_session(self, line_id: int | None, shift_name: str,
                                    walk_date: date | None = None, user=None) -> GembaWalkSession:
        if walk_date is None:
            walk_date = date.today()

        # Check for existing active session
        existing = GembaWalkSession.objects.filter(
            line_id=line_id,
            shift_name=shift_name,
            walk_date=walk_date,
            status__in=[GEMBA_SESSION_PLANNED, GEMBA_SESSION_IN_PROGRESS],
        ).first()

        if existing:
            return existing

        session = GembaWalkSession.objects.create(
            line_id=line_id,
            shift_name=shift_name,
            walk_date=walk_date,
            status=GEMBA_SESSION_PLANNED,
            created_by=user,
        )
        return session

    @transaction.atomic
    def start_session(self, session_id: int, user=None) -> GembaWalkSession:
        _get_session(session_id)  # validate exists
        session = GembaWalkSession.objects.select_for_update().get(id=session_id)
        if not can_start_session(session.status):
            raise InvalidStatusTransitionError(
                f"Cannot start session in status '{session.status}'"
            )

        # Ensure no other active session for same line+shift+date
        active = GembaWalkSession.objects.filter(
            line=session.line,
            shift_name=session.shift_name,
            walk_date=session.walk_date,
            status=GEMBA_SESSION_IN_PROGRESS,
        ).exclude(id=session.id).exists()

        if active:
            raise GembaSessionAlreadyActiveError(
                "An active session already exists for this line, shift, and date."
            )

        session.status = GEMBA_SESSION_IN_PROGRESS
        session.started_at = datetime.now()
        session.updated_by = user
        session.save(update_fields=["status", "started_at", "updated_by", "updated_at"])
        return session

    @transaction.atomic
    def complete_session(self, session_id: int, summary: str = "", user=None) -> GembaWalkSession:
        session = _get_session(session_id)
        if not can_complete_session(session.status):
            raise InvalidStatusTransitionError(
                f"Cannot complete session in status '{session.status}'"
            )
        session = GembaWalkSession.objects.select_for_update().get(id=session_id)
        session.status = GEMBA_SESSION_COMPLETED
        session.completed_at = datetime.now()
        if summary:
            session.summary = summary
        session.updated_by = user
        session.save(update_fields=["status", "completed_at", "summary", "updated_by", "updated_at"])
        return session

    @transaction.atomic
    def cancel_session(self, session_id: int, user=None) -> GembaWalkSession:
        session = _get_session(session_id)
        if not can_cancel_session(session.status):
            raise InvalidStatusTransitionError(
                f"Cannot cancel session in status '{session.status}'"
            )
        session = GembaWalkSession.objects.select_for_update().get(id=session_id)
        session.status = GEMBA_SESSION_CANCELLED
        session.updated_by = user
        session.save(update_fields=["status", "updated_by", "updated_at"])
        return session

    # ── Observation lifecycle ──

    def _validate_target_in_context(self, target_type: str, target_id: int | None,
                                       plant_id: int | None, production_line_id: int | None) -> None:
        """Validate that the selected target exists and belongs to the given plant/line context."""
        if not target_type or target_id is None:
            return  # No target selected — skip validation

        from manufacturing.models import ProductionLine, Department, ResourceGroup, Resource

        if production_line_id is not None:
            try:
                line = ProductionLine.objects.get(id=production_line_id)
            except ProductionLine.DoesNotExist:
                raise GembaValidationError(f"ProductionLine {production_line_id} not found")
            if plant_id is not None and line.plant_id != plant_id:
                raise GembaValidationError(
                    f"ProductionLine {production_line_id} does not belong to Plant {plant_id}"
                )

            if target_type == "PRODUCTION_LINE":
                if target_id != production_line_id:
                    raise GembaValidationError(
                        f"Target ProductionLine {target_id} does not match context line {production_line_id}"
                    )

            elif target_type == "DEPARTMENT":
                try:
                    dept = Department.objects.get(id=target_id)
                except Department.DoesNotExist:
                    raise GembaValidationError(f"Department {target_id} not found")
                # Verify department plant match
                if plant_id is not None and dept.plant_id and str(dept.plant_id) != str(plant_id):
                    raise GembaValidationError(
                        f"Department {target_id} does not belong to Plant {plant_id}"
                    )
                # Verify department — production line association if relation exists
                if hasattr(dept, 'production_lines'):
                    try:
                        dept_lines = dept.production_lines.all()
                        line_ids = [str(l.id) for l in dept_lines]
                        if line_ids and str(production_line_id) not in line_ids:
                            raise GembaValidationError(
                                f"Department {target_id} is not linked to ProductionLine {production_line_id}"
                            )
                    except Exception:
                        pass  # Ignore runtime issues with the M2M relation

            elif target_type == "RESOURCE_GROUP":
                try:
                    rg = ResourceGroup.objects.get(id=target_id)
                except ResourceGroup.DoesNotExist:
                    raise GembaValidationError(f"ResourceGroup {target_id} not found")
                # Verify via ProductionLineResourceGroup assignment
                if production_line_id:
                    from manufacturing.models import ProductionLineResourceGroup
                    is_assigned = ProductionLineResourceGroup.objects.filter(
                        production_line_id=production_line_id,
                        resource_group_id=target_id,
                    ).exists()
                    if not is_assigned:
                        raise GembaValidationError(
                            f"ResourceGroup {target_id} is not assigned to ProductionLine {production_line_id}"
                        )

            elif target_type == "RESOURCE":
                try:
                    res = Resource.objects.get(id=target_id)
                except Resource.DoesNotExist:
                    raise GembaValidationError(f"Resource {target_id} not found")

    @transaction.atomic
    def create_observation(self, session_id: int, *, title: str, description: str = "",
                           area: str = "", category: str = "", severity: str = GEMBA_SEVERITY_MEDIUM,
                           priority: str = "", focus: str = "",
                           linked_resource_text: str = "",
                           owner_id: int | None = None,
                           due_date: date | None = None,
                           target_type: str = "", target_id: int | None = None,
                           location_path: str = "", location_label: str = "",
                           plant_id: int | None = None,
                           production_line_id: int | None = None,
                           user=None) -> GembaObservation:
        session = _get_session(session_id)

        if not can_add_observation_to_session(session.status):
            raise GembaSessionCompletedError(
                f"Cannot add observation to session in status '{session.status}'"
            )

        if not title.strip():
            raise GembaValidationError("Title is required")
        if not category.strip():
            raise GembaValidationError("Category is required")

        # Validate target belongs to context
        self._validate_target_in_context(
            target_type, target_id,
            plant_id=plant_id,
            production_line_id=production_line_id,
        )

        observation = GembaObservation.objects.create(
            session=session,
            title=title.strip(),
            description=description.strip(),
            area=area.strip(),
            focus=focus.strip(),
            category=category,
            severity=severity,
            priority=priority or "MEDIUM",
            linked_resource_text=linked_resource_text.strip(),
            owner_id=owner_id,
            due_date=due_date,
            target_type=target_type,
            target_id=target_id,
            location_path=location_path,
            location_label=location_label,
            status=GEMBA_OBSERVATION_STATUS_OPEN,
            created_by=user,
        )

        _record_activity(
            observation, GEMBA_EVENT_CREATED,
            f"Observation created: {observation.title}",
            user=user,
        )

        return observation

    @transaction.atomic
    def update_observation(self, observation_id: int, *, title: str | None = None,
                           description: str | None = None, area: str | None = None,
                           focus: str | None = None, category: str | None = None,
                           severity: str | None = None, priority: str | None = None,
                           linked_resource_text: str | None = None,
                           user=None) -> GembaObservation:
        observation = _get_observation(observation_id)

        changed = []
        if title is not None:
            observation.title = title.strip()
            changed.append("title")
        if description is not None:
            observation.description = description.strip()
            changed.append("description")
        if area is not None:
            observation.area = area.strip()
            changed.append("area")
        if focus is not None:
            observation.focus = focus.strip()
            changed.append("focus")
        if category is not None:
            observation.category = category
            changed.append("category")
        if severity is not None:
            observation.severity = severity
            changed.append("severity")
        if priority is not None:
            observation.priority = priority
            changed.append("priority")
        if linked_resource_text is not None:
            observation.linked_resource_text = linked_resource_text.strip()
            changed.append("linked_resource_text")

        if changed:
            observation.updated_by = user
            observation.save(update_fields=changed + ["updated_by", "updated_at"])
            _record_activity(
                observation, GEMBA_EVENT_UPDATED,
                f"Updated: {', '.join(changed)}",
                user=user,
            )

        return observation

    @transaction.atomic
    def assign_observation(self, observation_id: int, owner_id: int | None,
                           due_date: date | None = None, note: str = "",
                           user=None) -> GembaObservation:
        observation = GembaObservation.objects.select_for_update().get(id=observation_id)

        if not can_assign_observation(observation.status):
            raise InvalidStatusTransitionError(
                f"Cannot assign observation in status '{observation.status}'"
            )

        observation.owner_id = owner_id
        if due_date is not None:
            observation.due_date = due_date
        observation.updated_by = user
        observation.save(update_fields=["owner_id", "due_date", "updated_by", "updated_at"])

        msg_parts = []
        if owner_id:
            msg_parts.append(f"Assigned to user #{owner_id}")
        if due_date is not None:
            msg_parts.append(f"Due date set to {due_date}")
            _record_activity(
                observation, GEMBA_EVENT_DUE_DATE_SET,
                f"Due date set to {due_date}",
                user=user,
            )
        if note:
            msg_parts.append(f"Note: {note[:100]}")

        _record_activity(
            observation, GEMBA_EVENT_ASSIGNED,
            " ".join(msg_parts) if msg_parts else "Assigned",
            user=user,
        )

        return observation

    @transaction.atomic
    def mark_observation_action_required(self, observation_id: int, owner_id: int | None,
                                          due_date: date | None, user=None) -> GembaObservation:
        observation = GembaObservation.objects.select_for_update().get(id=observation_id)

        if not can_require_action(observation.status):
            raise InvalidStatusTransitionError(
                f"Cannot mark observation as action required in status '{observation.status}'"
            )

        if not owner_id:
            raise GembaValidationError("Owner is required when marking observation as action required")
        if not due_date:
            raise GembaValidationError("Due date is required when marking observation as action required")

        old_status = observation.status
        observation.status = GEMBA_OBSERVATION_STATUS_ACTION_REQUIRED
        observation.owner_id = owner_id
        observation.due_date = due_date
        observation.updated_by = user
        observation.save(update_fields=[
            "status", "owner_id", "due_date", "updated_by", "updated_at",
        ])

        _record_activity(
            observation, GEMBA_EVENT_STATUS_CHANGED,
            f"Action required - assigned to #{owner_id}, due {due_date}",
            user=user, old_status=old_status,
            new_status=GEMBA_OBSERVATION_STATUS_ACTION_REQUIRED,
        )

        return observation

    @transaction.atomic
    def change_observation_status(self, observation_id: int, new_status: str,
                                  user=None) -> GembaObservation:
        observation = GembaObservation.objects.select_for_update().get(id=observation_id)
        old_status = observation.status

        if old_status == new_status:
            return observation

        valid_transition = {
            GEMBA_OBSERVATION_STATUS_OPEN: [GEMBA_OBSERVATION_STATUS_IN_REVIEW,
                                            GEMBA_OBSERVATION_STATUS_ACTION_REQUIRED],
            GEMBA_OBSERVATION_STATUS_IN_REVIEW: [GEMBA_OBSERVATION_STATUS_ACTION_REQUIRED],
            GEMBA_OBSERVATION_STATUS_RESOLVED: [GEMBA_OBSERVATION_STATUS_CLOSED],
        }

        if new_status not in valid_transition.get(old_status, []):
            raise InvalidStatusTransitionError(
                f"Cannot transition from '{old_status}' to '{new_status}'"
            )

        observation.status = new_status
        observation.updated_by = user
        observation.save(update_fields=["status", "updated_by", "updated_at"])

        _record_activity(
            observation, GEMBA_EVENT_STATUS_CHANGED,
            f"Status changed from {old_status} to {new_status}",
            user=user, old_status=old_status, new_status=new_status,
        )

        return observation

    @transaction.atomic
    def resolve_observation(self, observation_id: int, resolution_note: str,
                            user=None) -> GembaObservation:
        observation = GembaObservation.objects.select_for_update().get(id=observation_id)

        if not can_resolve_observation(observation.status):
            raise InvalidStatusTransitionError(
                f"Cannot resolve observation in status '{observation.status}'"
            )

        if not resolution_note.strip():
            raise GembaValidationError("Resolution note is required to resolve an observation")

        old_status = observation.status
        observation.status = GEMBA_OBSERVATION_STATUS_RESOLVED
        observation.resolution_note = resolution_note.strip()
        observation.resolved_by = user
        observation.resolved_at = datetime.now()
        observation.updated_by = user
        observation.save(update_fields=[
            "status", "resolution_note", "resolved_by", "resolved_at",
            "updated_by", "updated_at",
        ])

        _record_activity(
            observation, GEMBA_EVENT_RESOLVED,
            f"Observation resolved: {resolution_note[:100]}",
            user=user, old_status=old_status,
            new_status=GEMBA_OBSERVATION_STATUS_RESOLVED,
        )

        return observation

    @transaction.atomic
    def verify_observation(self, observation_id: int, verification_note: str,
                            user=None) -> GembaObservation:
        observation = GembaObservation.objects.select_for_update().get(id=observation_id)

        if not can_verify_observation(observation.status):
            raise InvalidStatusTransitionError(
                f"Cannot verify observation in status '{observation.status}'"
            )

        if not verification_note.strip():
            raise GembaValidationError("Verification note is required to verify an observation")

        old_status = observation.status
        observation.status = GEMBA_OBSERVATION_STATUS_VERIFIED
        observation.verification_note = verification_note.strip()
        observation.verified_by = user
        observation.verified_at = datetime.now()
        observation.updated_by = user
        observation.save(update_fields=[
            "status", "verification_note", "verified_by", "verified_at",
            "updated_by", "updated_at",
        ])

        _record_activity(
            observation, GEMBA_EVENT_VERIFIED,
            f"Observation verified: {verification_note[:100]}",
            user=user, old_status=old_status,
            new_status=GEMBA_OBSERVATION_STATUS_VERIFIED,
        )

        return observation

    @transaction.atomic
    def close_observation(self, observation_id: int, user=None) -> GembaObservation:
        observation = GembaObservation.objects.select_for_update().get(id=observation_id)

        if not can_close_observation(observation.status):
            raise InvalidStatusTransitionError(
                f"Cannot close observation in status '{observation.status}'"
            )

        old_status = observation.status
        observation.status = GEMBA_OBSERVATION_STATUS_CLOSED
        observation.closed_by = user
        observation.closed_at = datetime.now()
        observation.updated_by = user
        observation.save(update_fields=[
            "status", "closed_by", "closed_at", "updated_by", "updated_at",
        ])

        _record_activity(
            observation, GEMBA_EVENT_CLOSED,
            "Observation closed",
            user=user, old_status=old_status,
            new_status=GEMBA_OBSERVATION_STATUS_CLOSED,
        )

        return observation

    @transaction.atomic
    def reopen_observation(self, observation_id: int, reason: str = "", user=None) -> GembaObservation:
        observation = GembaObservation.objects.select_for_update().get(id=observation_id)

        if not can_reopen_observation(observation.status):
            raise InvalidStatusTransitionError(
                f"Cannot reopen observation in status '{observation.status}'"
            )

        old_status = observation.status
        observation.status = GEMBA_OBSERVATION_STATUS_REOPENED
        observation.closed_by = None
        observation.closed_at = None
        observation.updated_by = user
        observation.save(update_fields=[
            "status", "closed_by", "closed_at", "updated_by", "updated_at",
        ])

        _record_activity(
            observation, GEMBA_EVENT_REOPENED,
            f"Observation reopened from {old_status}" + (f": {reason[:100]}" if reason else ""),
            user=user, old_status=old_status,
            new_status=GEMBA_OBSERVATION_STATUS_REOPENED,
        )

        return observation

    @transaction.atomic
    def convert_observation_to_issue(self, observation_id: int, *,
                                     title: str | None = None,
                                     description: str = "",
                                     severity: str = "MEDIUM",
                                     control_area: str = "PRODUCTION",
                                     owner: str = "",
                                     due_date: date | None = None,
                                     plant: str = "",
                                     production_line: str = "",
                                     department: str = "",
                                     resource_group: str = "",
                                     resource: str = "",
                                     user=None) -> GembaObservation:
        from check.models import Problem

        observation = GembaObservation.objects.select_for_update().get(id=observation_id)

        if not can_convert_to_issue(observation.status):
            raise GembaObservationAlreadyConvertedError(
                f"Cannot convert observation in status '{observation.status}'"
            )

        issue_title = title or observation.title

        problem = Problem.objects.create(
            control_area=control_area,
            title=issue_title,
            description=description or observation.description,
            problem_type=category_to_problem_type(observation.category),
            target_type="RESOURCE",
            target_id=None,
            severity=severity,
            reported_by=str(user) if user else "",
            source_type="GEMBA_WALK",
            source_id=observation_id,
            owner=owner,
            due_date=due_date,
            plant=plant or "",
            production_line=production_line or "",
            department=department or "",
            resource_group=resource_group or "",
            resource=resource or "",
        )

        observation.status = GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ISSUE
        observation.created_issue = problem
        observation.updated_by = user
        observation.save(update_fields=["status", "created_issue", "updated_by", "updated_at"])

        _record_activity(
            observation, GEMBA_EVENT_CONVERTED_TO_ISSUE,
            f"Converted to issue #{problem.id}: {problem.title}",
            user=user,
        )

        return observation

    @transaction.atomic
    def convert_observation_to_action(self, observation_id: int, *,
                                      title: str | None = None,
                                      description: str = "",
                                      action_type: str = "CORRECTIVE",
                                      priority: str = "MEDIUM",
                                      assigned_to: str = "",
                                      due_date: date | None = None,
                                      control_area: str = "PRODUCTION",
                                      plant: str = "",
                                      production_line: str = "",
                                      department: str = "",
                                      resource_group: str = "",
                                      resource: str = "",
                                      user=None) -> GembaObservation:
        from check.models import Action

        observation = GembaObservation.objects.select_for_update().get(id=observation_id)

        if not can_convert_to_action(observation.status):
            raise GembaObservationAlreadyConvertedError(
                f"Cannot convert observation in status '{observation.status}'"
            )

        action_title = title or observation.title

        action = Action.objects.create(
            control_area=control_area,
            title=action_title,
            description=description or observation.description,
            action_type=action_type,
            source_type="GEMBA_WALK",
            source_id=observation_id,
            owner=assigned_to,
            assigned_to=assigned_to,
            due_date=due_date,
            priority=priority,
            plant=plant or "",
            production_line=production_line or "",
            department=department or "",
            resource_group=resource_group or "",
            resource=resource or "",
        )

        observation.status = GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ACTION
        observation.created_action = action
        observation.updated_by = user
        observation.save(update_fields=["status", "created_action", "updated_by", "updated_at"])

        _record_activity(
            observation, GEMBA_EVENT_CONVERTED_TO_ACTION,
            f"Converted to action #{action.id}: {action.title}",
            user=user,
        )

        return observation

    # ── Queries ──

    def get_or_create_daily_session_for_line(self, line_id: int,
                                             walk_date: date | None = None,
                                             shift_name: str = "DAY",
                                             user=None) -> GembaWalkSession:
        """Get or create the daily session for the given production line."""
        return self.get_or_create_daily_session(line_id, shift_name, walk_date, user)

    def get_daily_gemba_board(self, line_id: int | None = None,
                               plant_id: int | None = None,
                               walk_date: date | None = None,
                               shift_name: str | None = None,
                               session_id: int | None = None,
                               user=None) -> dict:
        """Return the full daily Gemba board data."""
        # Auto-create a planned session if none exists for today
        if walk_date is None:
            walk_date = date.today()
        if not shift_name:
            shift_name = "DAY"

        # Get or create the daily session so the toolbar always shows Start Walk
        if line_id is not None and not session_id:
            try:
                session = self.get_or_create_daily_session(
                    line_id=line_id,
                    shift_name=shift_name,
                    walk_date=walk_date,
                    user=user,
                )
            except Exception:
                session = None
        else:
            filters = Q()
            if session_id:
                filters &= Q(id=session_id)
            if line_id:
                filters &= Q(line_id=line_id)
            if plant_id:
                filters &= Q(plant_id=plant_id)
            if walk_date:
                filters &= Q(walk_date=walk_date)
            if shift_name:
                filters &= Q(shift_name=shift_name)

            sessions = GembaWalkSession.objects.filter(filters).order_by("-walk_date", "-created_at")
            active_session = sessions.filter(
                status__in=[GEMBA_SESSION_PLANNED, GEMBA_SESSION_IN_PROGRESS]
            ).first()
            latest_session = sessions.first()
            session = active_session or latest_session

        if not session:
            return {
                "active_session": None,
                "observations": [],
                "metrics": self._empty_metrics(),
            }

        observations = list(GembaObservation.objects.filter(
            session=session
        ).select_related("owner", "created_issue", "created_action", "created_by").order_by("-created_at"))

        return {
            "active_session": session,
            "observations": observations,
            "metrics": self._compute_metrics(observations),
        }

    def get_target_options(self, plant_id: int | None = None,
                               production_line_id: int | None = None) -> dict:
        """Return scoped target options for the cascading selector."""
        from manufacturing.models import (
            ProductionLine, Department, ResourceGroup, Resource,
            ProductionLineResourceGroup,
        )

        result = {
            "production_line": None,
            "departments": [],
            "resource_groups": [],
            "resources": [],
        }

        # Production Line
        if production_line_id is not None:
            try:
                line = ProductionLine.objects.get(id=production_line_id)
                result["production_line"] = {
                    "id": str(line.id),
                    "target_type": "PRODUCTION_LINE",
                    "name": line.name,
                    "code": line.code or "",
                    "department_id": None,
                    "department_name": None,
                    "resource_group_id": None,
                    "resource_group_name": None,
                    "production_line_id": str(line.id),
                    "location_path": f"{line.name}",
                }
            except ProductionLine.DoesNotExist:
                pass

        # Departments — scoped by plant or production line
        dept_qs = Department.objects.filter(status="ACTIVE")
        if plant_id is not None:
            dept_qs = dept_qs.filter(plant_id=plant_id)
        # Filter by production line assignment if relation exists
        if production_line_id is not None:
            from manufacturing.models import ProductionLineDepartmentAssignment
            assigned_dept_ids = ProductionLineDepartmentAssignment.objects.filter(
                production_line_id=production_line_id,
            ).values_list("department_id", flat=True)
            if assigned_dept_ids:
                dept_qs = dept_qs.filter(id__in=list(assigned_dept_ids))
        for dept in dept_qs.order_by("name")[:200]:
            result["departments"].append({
                "id": str(dept.id),
                "target_type": "DEPARTMENT",
                "name": dept.name,
                "code": dept.code or "",
                "department_id": str(dept.id),
                "department_name": dept.name,
                "resource_group_id": None,
                "resource_group_name": None,
                "production_line_id": str(production_line_id) if production_line_id else None,
                "location_path": f"{dept.name}",
            })

        # Resource groups — assigned to production line
        if production_line_id is not None:
            assigned_rgs = ProductionLineResourceGroup.objects.filter(
                production_line_id=production_line_id,
            ).select_related(
                "resource_group", "resource_group__department",
            )
            for plrg in assigned_rgs.order_by("resource_group__name"):
                rg = plrg.resource_group
                dept_name = rg.department.name if rg.department else ""
                result["resource_groups"].append({
                    "id": str(rg.id),
                    "target_type": "RESOURCE_GROUP",
                    "name": rg.name,
                    "code": rg.code or "",
                    "department_id": str(rg.department_id) if rg.department_id else None,
                    "department_name": dept_name,
                    "resource_group_id": str(rg.id),
                    "resource_group_name": rg.name,
                    "production_line_id": str(production_line_id),
                    "location_path": f"{dept_name} \u203a {rg.name}" if dept_name else rg.name,
                })

        # Resources — under assigned resource groups for this line
        if production_line_id is not None:
            assigned_rg_ids = ProductionLineResourceGroup.objects.filter(
                production_line_id=production_line_id,
            ).values_list("resource_group_id", flat=True)
            if assigned_rg_ids:
                for res in Resource.objects.filter(
                    resource_group_id__in=list(assigned_rg_ids),
                    status="ACTIVE",
                ).select_related("resource_group", "resource_group__department").order_by("name")[:300]:
                    rg_name = res.resource_group.name if res.resource_group else ""
                    dept_name = res.resource_group.department.name if res.resource_group and res.resource_group.department else ""
                    result["resources"].append({
                        "id": str(res.id),
                        "target_type": "RESOURCE",
                        "name": res.name,
                        "code": res.code or "",
                        "department_id": str(res.resource_group.department_id) if res.resource_group else None,
                        "department_name": dept_name,
                        "resource_group_id": str(res.resource_group_id) if res.resource_group else None,
                        "resource_group_name": rg_name,
                        "production_line_id": str(production_line_id),
                        "location_path": f"{dept_name} \u203a {rg_name} \u203a {res.name}" if dept_name and rg_name else res.name,
                    })

        return result

    def get_session_activities(self, session_id: int) -> list[GembaObservationActivity]:
        return list(GembaObservationActivity.objects.filter(
            observation__session_id=session_id
        ).select_related("actor").order_by("-created_at")[:50])

    def _empty_metrics(self) -> dict:
        return {
            "total": 0, "open": 0, "in_review": 0,
            "action_required": 0, "converted": 0,
            "resolved": 0, "closed": 0,
            "critical": 0, "overdue": 0,
            "by_category": {},
        }

    def _compute_metrics(self, observations: list) -> dict:
        from datetime import date
        today = date.today()
        total = len(observations)
        open_count = sum(1 for o in observations if o.status == GEMBA_OBSERVATION_STATUS_OPEN)
        in_review = sum(1 for o in observations if o.status == GEMBA_OBSERVATION_STATUS_IN_REVIEW)
        action_required = sum(1 for o in observations if o.status == GEMBA_OBSERVATION_STATUS_ACTION_REQUIRED)
        converted = sum(1 for o in observations if o.status in (
            GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ACTION,
            GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ISSUE,
        ))
        resolved = sum(1 for o in observations if o.status == GEMBA_OBSERVATION_STATUS_RESOLVED)
        closed = sum(1 for o in observations if o.status == GEMBA_OBSERVATION_STATUS_CLOSED)
        critical = sum(1 for o in observations if o.severity == "CRITICAL" and o.status not in (
            GEMBA_OBSERVATION_STATUS_RESOLVED, GEMBA_OBSERVATION_STATUS_CLOSED))
        overdue = sum(1 for o in observations if o.due_date and o.due_date < today and o.status not in (
            GEMBA_OBSERVATION_STATUS_RESOLVED, GEMBA_OBSERVATION_STATUS_CLOSED))

        by_category = {}
        for o in observations:
            cat = o.category or "OTHER"
            by_category[cat] = by_category.get(cat, 0) + 1

        return {
            "total": total,
            "open": open_count,
            "in_review": in_review,
            "action_required": action_required,
            "converted": converted,
            "resolved": resolved,
            "closed": closed,
            "critical": critical,
            "overdue": overdue,
            "by_category": by_category,
        }


def category_to_problem_type(category: str) -> str:
    """Map Gemba category to Problem problem_type."""
    mapping = {
        "PRODUCTIVITY": "PRODUCTION",
        "QUALITY": "QUALITY",
        "SAFETY": "SAFETY",
        "FIVE_S": "PRODUCTION",
        "MAINTENANCE": "PRODUCTION",
        "MATERIAL": "MATERIAL",
        "MORALE": "GENERAL",
        "OTHER": "GENERAL",
    }
    return mapping.get(category, "GENERAL")
