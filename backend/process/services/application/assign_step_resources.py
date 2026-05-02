"""Application use case for assigning resources to a process step."""

from process.services.domain.step_assignment_rules import is_valid_step_assignment


def execute(has_group: bool, has_resource: bool) -> bool:
    return is_valid_step_assignment(has_group=has_group, has_resource=has_resource)
