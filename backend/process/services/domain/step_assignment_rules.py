"""Domain rules for process-step resource assignment."""


def is_valid_step_assignment(has_group: bool, has_resource: bool) -> bool:
    return has_group or has_resource
