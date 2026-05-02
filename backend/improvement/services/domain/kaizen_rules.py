"""Domain rules for kaizen lifecycle transitions."""


def can_close_kaizen(has_actions: bool) -> bool:
    return has_actions
