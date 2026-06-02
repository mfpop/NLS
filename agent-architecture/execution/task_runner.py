from __future__ import annotations
import logging
from typing import Optional

from shared.types import (
    Task,
    Intent,
    SkillInput,
    SkillOutput,
    SkillStatus,
)
from shared.interfaces import Agent, MemoryStore
from shared.exceptions import SkillNotAllowedError, AgentPermissionError

logger = logging.getLogger("nexus.execution")


class TaskRunner:
    def __init__(self, registry: AgentRegistry, memory: MemoryStore, workspace_root: str = "."):
        self.registry = registry
        self.memory = memory
        self.workspace_root = workspace_root

    def run(self, task: Task, agent: Agent) -> SkillOutput:
        self._validate_agent_permissions(task, agent)

        decision = agent.decide(task)

        self._validate_skill_allowed(agent, decision.skill_name)

        skill_input = SkillInput(
            task=task,
            params=task.context.get("params", {}),
            context_documents=task.context.get("context_documents", []),
            workspace_root=self.workspace_root,
        )

        output = self._execute_with_retry(agent, decision.skill_name, skill_input)

        output.metadata["skill_name"] = decision.skill_name
        output.metadata["agent_id"] = agent.id

        return output

    DOMAIN_KEYWORDS: dict[str, Intent] = {
        "frontend": Intent.FRONTEND_UI,
        "ui": Intent.FRONTEND_UI,
        "backend": Intent.BACKEND_GRAPHQL,
        "graphql": Intent.BACKEND_GRAPHQL,
        "governance": Intent.GOVERNANCE,
        "compliance": Intent.GOVERNANCE,
        "manufacturing": Intent.MANUFACTURING_STRUCTURE,
        "production": Intent.MANUFACTURING_STRUCTURE,
        "audit": Intent.ARCHITECTURE_AUDIT,
        "architecture": Intent.ARCHITECTURE_AUDIT,
        "redesign": Intent.ARCHITECTURE_AUDIT,
    }

    def _validate_agent_permissions(self, task: Task, agent: Agent) -> None:
        task_intent = task.intent
        for forbidden in agent.forbidden_tasks:
            fw = set(forbidden.lower().split())
            overlap = self.DOMAIN_KEYWORDS.keys() & fw
            for keyword in overlap:
                if self.DOMAIN_KEYWORDS[keyword] == task_intent:
                    logger.warning(
                        "Forbidden task detected for agent '%s': %s (intent=%s)",
                        agent.id, forbidden, task_intent.name,
                    )
                    raise AgentPermissionError(
                        f"Agent '{agent.id}' is not allowed to perform: {forbidden}"
                    )

    def _validate_skill_allowed(self, agent: Agent, skill_name: str) -> None:
        if skill_name not in agent.allowed_skill_ids:
            logger.warning(
                "Skill '%s' not allowed for agent '%s'. Allowed: %s",
                skill_name, agent.id, agent.allowed_skill_ids,
            )
            raise SkillNotAllowedError(
                f"Skill '{skill_name}' is not in agent '{agent.id}' allowed skills"
            )

    def _execute_with_retry(
        self, agent: Agent, skill_name: str, inp: SkillInput, attempt: int = 1
    ) -> SkillOutput:
        output = agent.execute(inp)

        if output.status == SkillStatus.FAILED and attempt < 3:
            logger.info(
                "Retry %d for agent '%s' skill '%s'",
                attempt, agent.id, skill_name,
            )
            inp.params["retry_count"] = attempt
            return self._execute_with_retry(agent, skill_name, inp, attempt + 1)

        return output
