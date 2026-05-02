"""Application use case for refreshing KPI snapshots."""

from kpi_engine.services.domain.oee_rules import is_valid_oee


def execute(avail: float, perf: float, quality: float) -> bool:
    return is_valid_oee(avail=avail, perf=perf, quality=quality)
