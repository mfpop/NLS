"""Application use case for publishing a process flow version."""

from process.services.domain.process_flow_rules import can_activate_flow


def execute(existing_active_count: int) -> bool:
    return can_activate_flow(existing_active_count=existing_active_count)
