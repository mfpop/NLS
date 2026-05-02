"""Domain rules for OEE calculation and sanity checks."""


def is_valid_oee(avail: float, perf: float, quality: float) -> bool:
    return 0.0 <= avail <= 1.0 and 0.0 <= perf <= 1.0 and 0.0 <= quality <= 1.0
