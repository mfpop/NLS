"""Execution domain rules for production-cycle state transitions."""


def can_start_cycle(batch_is_open: bool) -> bool:
    return batch_is_open


def can_complete_cycle(has_started: bool, produced_qty: int) -> bool:
    return has_started and produced_qty >= 0
