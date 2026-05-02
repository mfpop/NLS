"""Execution domain rules for batch lifecycle behavior."""


def validate_batch_quantities(good_qty: int, scrap_qty: int, planned_qty: int) -> bool:
    total = good_qty + scrap_qty
    return good_qty >= 0 and scrap_qty >= 0 and total <= planned_qty
