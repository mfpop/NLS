"""Application use case for assigning resources to a group."""

from manufacturing.services.domain.resource_capacity_rules import has_capacity


def execute(planned_load: int, capacity: int) -> bool:
    return has_capacity(planned_load=planned_load, capacity=capacity)
