from __future__ import annotations
import json
from typing import Any

from shared.types import ExecutionResult, SkillStatus
from shared.interfaces import ResultFormatter


class SimpleResultFormatter(ResultFormatter):
    def format(self, result: ExecutionResult) -> str:
        if result.status == SkillStatus.FAILED:
            return self._format_error(result)
        if result.status == SkillStatus.SUCCESS:
            return self._format_success(result)
        return self._format_pending(result)

    def _format_success(self, result: ExecutionResult) -> str:
        agent_label = result.agent_id.split(" - ", 1)[1] if " - " in result.agent_id else result.agent_id
        lines = [
            f"[{agent_label}] Task completed.",
        ]
        if isinstance(result.output, dict):
            summary = result.output.get("summary", result.output.get("reply", ""))
            if summary:
                lines.append(str(summary))
            score = result.output.get("score")
            if score is not None:
                lines.append(f"Score: {score}")
            violations = result.output.get("violations")
            if violations:
                lines.append(f"Violations: {len(violations)}")
        elif result.output:
            lines.append(str(result.output))

        if result.context_files_used:
            lines.append(f"Context: {len(result.context_files_used)} files loaded")

        return "\n".join(lines)

    def _format_error(self, result: ExecutionResult) -> str:
        agent_label = result.agent_id.split(" - ", 1)[1] if " - " in result.agent_id else result.agent_id
        return f"[{agent_label}] Error: {result.error or 'Unknown error'}"

    def _format_pending(self, result: ExecutionResult) -> str:
        return "[System] Task is processing..."
