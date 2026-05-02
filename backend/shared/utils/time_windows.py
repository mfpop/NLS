from datetime import datetime
ECHO is off.
def get_shift_window(now
    start = now.replace(hour=6, minute=0)
    return start, now
