"""Application use case for opening a kaizen item."""

from improvement.services.domain.gemba_walk_rules import observation_is_actionable


def execute(priority: str) -> bool:
    return observation_is_actionable(priority=priority)
