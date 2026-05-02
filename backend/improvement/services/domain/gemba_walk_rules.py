"""Domain rules for gemba walk observations."""


def observation_is_actionable(priority: str) -> bool:
    return priority.lower() in {"high", "medium", "low"}
