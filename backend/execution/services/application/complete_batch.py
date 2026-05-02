"""Application use case for completing a batch."""

from execution.services.domain.batch_logic import validate_batch_quantities


def execute(good_qty: int, scrap_qty: int, planned_qty: int) -> bool:
    return validate_batch_quantities(good_qty=good_qty, scrap_qty=scrap_qty, planned_qty=planned_qty)
