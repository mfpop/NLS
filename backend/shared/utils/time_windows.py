from datetime import datetime


def get_shift_window(now: datetime) -> tuple[datetime, datetime]:
    start = now.replace(hour=6, minute=0)
    return start, now
