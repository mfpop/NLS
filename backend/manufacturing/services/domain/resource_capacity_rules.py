"""Compatibility wrapper."""


def has_capacity(planned_load: int, capacity: int) -> bool:
    return planned_load >= 0 and capacity >= 0 and planned_load <= capacity
