"""Application service for Continuous Improvement dashboard data."""

from improvement.selectors import ImprovementSelector


class ContinuousImprovementService:
    def __init__(self):
        self.selector = ImprovementSelector()

    def get_improvement_summary(self, filters: dict | None = None) -> dict:
        return self.selector.get_summary(filters)

    def get_improvements_by_status(self) -> list[dict]:
        return self.selector.get_improvements_by_status()

    def get_improvements_by_target(self) -> list[dict]:
        return self.selector.get_improvements_by_target()

    def get_suggestions_summary(self, filters: dict | None = None) -> dict:
        return self.selector.get_suggestions_summary(filters)

    def get_kaizen_summary(self, filters: dict | None = None) -> dict:
        return self.selector.get_kaizen_summary(filters)

    def get_a3_pdca_summary(self, filters: dict | None = None) -> dict:
        return self.selector.get_a3_pdca_summary(filters)
