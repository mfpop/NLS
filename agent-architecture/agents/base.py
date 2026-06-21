from __future__ import annotations
import yaml
from typing import Any, Optional

from shared.types import Task, SkillInput, SkillOutput, SkillStatus, AgentDecision
from shared.interfaces import Agent, Skill

from skills.general.chat_response import ChatResponseSkill
from skills.governance.check_governance import CheckGovernanceSkill
from skills.manufacturing.analyze_manufacturing_structure import AnalyzeManufacturingStructureSkill
from skills.audit.audit_architecture import AuditArchitectureSkill
from skills.backend.validate_schema import ValidateSchemaSkill
from skills.backend.analyze_models import AnalyzeModelsSkill
from skills.backend.analyze_services import AnalyzeServicesSkill
from skills.backend.analyze_graphql import AnalyzeGraphQLSkill
from skills.frontend.analyze_ui import AnalyzeUISkill
from skills.frontend.validate_tailwind import ValidateTailwindSkill
from skills.frontend.render_component import RenderComponentSkill


_SKILL_MAP: dict[str, Skill] = {
    "chat_response": ChatResponseSkill(),
    "check_governance": CheckGovernanceSkill(),
    "analyze_manufacturing_structure": AnalyzeManufacturingStructureSkill(),
    "audit_architecture": AuditArchitectureSkill(),
    "validate_schema": ValidateSchemaSkill(),
    "analyze_models": AnalyzeModelsSkill(),
    "analyze_services": AnalyzeServicesSkill(),
    "analyze_graphql": AnalyzeGraphQLSkill(),
    "analyze_ui": AnalyzeUISkill(),
    "validate_tailwind": ValidateTailwindSkill(),
    "render_component": RenderComponentSkill(),
}


class NexusAgent(Agent):
    def __init__(self, agent_path: str):
        with open(f"{agent_path}/agent.yaml") as f:
            meta = yaml.safe_load(f)

        self._id = meta["name"]
        self._role = meta["role"]
        self._mission = meta["mission"]
        self._authority = meta["authority"]
        self._allowed_tasks = meta.get("allowed_tasks", [])
        self._forbidden_tasks = meta.get("forbidden_tasks", [])
        self._allowed_skill_ids = meta.get("allowed_skills", [])
        self._required_context = meta.get("required_context_files", [])
        self._skills = [
            _SKILL_MAP[sid] for sid in self._allowed_skill_ids if sid in _SKILL_MAP
        ]
        self._response_rules = meta.get("response_rules", [])
        self._handoff_rules = meta.get("handoff_rules", [])
        self._default_entry = meta.get("default_entry", False)

    @property
    def id(self) -> str:
        return self._id

    @property
    def role(self) -> str:
        return self._role

    @property
    def mission(self) -> str:
        return self._mission

    @property
    def authority(self) -> str:
        return self._authority

    @property
    def allowed_tasks(self) -> list[str]:
        return list(self._allowed_tasks)

    @property
    def forbidden_tasks(self) -> list[str]:
        return list(self._forbidden_tasks)

    @property
    def allowed_skill_ids(self) -> list[str]:
        return list(self._allowed_skill_ids)

    @property
    def required_context_files(self) -> list[str]:
        return list(self._required_context)

    @property
    def response_rules(self) -> list[str]:
        return list(self._response_rules)

    @property
    def handoff_rules(self) -> list[str]:
        return list(self._handoff_rules)

    @property
    def default_entry(self) -> bool:
        return self._default_entry

    def decide(self, task: Task) -> AgentDecision:
        if not self._skills:
            return AgentDecision(
                agent_id=self._id,
                skill_name="",
                confidence=1.0,
                routing_reason="manager orchestrator — delegates to specialists",
            )

        best_score = 0.0
        best_skill = self._skills[0].id
        routing_reason = "default fallback"

        for skill in self._skills:
            score = 0.5
            domain_keywords = {
                "governance": ["governance", "compliance", "policy", "rule"],
                "manufacturing": ["manufacturing", "production", "plant", "bom", "routing"],
                "audit": ["audit", "verify", "review", "check"],
                "backend": ["graphql", "schema", "django", "api", "mutation"],
                "frontend": ["component", "ui", "react", "tailwind", "layout"],
            }
            for domain, keywords in domain_keywords.items():
                if domain in skill.domain:
                    if any(kw in task.input.lower() for kw in keywords):
                        score = 0.9
                        routing_reason = f"matched domain '{domain}'"
                        break

            if score > best_score:
                best_score = score
                best_skill = skill.id

        return AgentDecision(
            agent_id=self._id,
            skill_name=best_skill,
            confidence=best_score,
            routing_reason=routing_reason,
        )

    def execute(self, inp: SkillInput) -> SkillOutput:
        decision = self.decide(inp.task)
        skill = _SKILL_MAP.get(decision.skill_name)
        if not skill:
            return SkillOutput(
                status=SkillStatus.FAILED,
                error=f"Skill '{decision.skill_name}' not found for agent '{self._id}'",
            )
        if skill.forbidden_agents and self._id in skill.forbidden_agents:
            return SkillOutput(
                status=SkillStatus.FAILED,
                error=f"Skill '{skill.id}' is forbidden for agent '{self._id}'",
            )
        return skill.execute(inp)


def create_agent(number: int, name: str) -> NexusAgent:
    path = f"agents/{number}.Nexus - {name}"
    return NexusAgent(path)


def create_all_agents() -> list[NexusAgent]:
    return [
        create_agent(0, "General Chat"),
        create_agent(1, "Governance"),
        create_agent(2, "Manufacturing Structure"),
        create_agent(3, "Architecture Audit"),
        create_agent(4, "Backend-GraphQL"),
        create_agent(5, "Frontend-UI"),
        create_agent(10, "Manager"),
    ]
