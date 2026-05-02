"""Application use case for evaluating KPI windows."""

from kpi_engine.services.domain.throughput_rules import meets_throughput_target


def execute(actual: float, target: float) -> bool:
    return meets_throughput_target(actual=actual, target=target)
