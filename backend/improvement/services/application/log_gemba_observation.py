"""Application use case for logging a gemba observation."""

from improvement.services.domain.gemba_walk_rules import observation_is_actionable


def execute(priority: str) -> bool:
    return observation_is_actionable(priority=priority)
