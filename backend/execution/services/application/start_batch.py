"""Application use case for starting a batch."""

from execution.services.domain.production_cycle_rules import can_start_cycle


def execute(batch_is_open: bool) -> bool:
    return can_start_cycle(batch_is_open=batch_is_open)
