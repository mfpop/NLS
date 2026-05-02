"""Domain rules for process-flow activation and versioning."""


def can_activate_flow(existing_active_count: int) -> bool:
    return existing_active_count == 0
