"""Domain rules for throughput windows and thresholds."""


def meets_throughput_target(actual: float, target: float) -> bool:
    return actual >= target
