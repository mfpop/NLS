from __future__ import annotations
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import yaml
from pathlib import Path

from shared.types import Task, SkillInput, Intent
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


REQUIRED_REGISTRY_FIELDS = [
    "id",
    "name",
    "domain",
    "description",
    "input_schema",
    "output_schema",
    "allowed_agents",
    "forbidden_agents",
    "requires_context",
    "side_effects",
    "risk_level",
]

SKILL_CLASSES = [
    ChatResponseSkill,
    CheckGovernanceSkill,
    AnalyzeManufacturingStructureSkill,
    AuditArchitectureSkill,
    ValidateSchemaSkill,
    AnalyzeModelsSkill,
    AnalyzeServicesSkill,
    AnalyzeGraphQLSkill,
    AnalyzeUISkill,
    ValidateTailwindSkill,
    RenderComponentSkill,
]


def test_skill_registry_entries_have_required_fields():
    with open("skills/registry/skill_registry.yaml") as f:
        data = yaml.safe_load(f)

    for entry in data["skills"]:
        for field in REQUIRED_REGISTRY_FIELDS:
            assert field in entry, f"Missing field '{field}' in skill '{entry.get('name', 'unknown')}'"


def test_all_skills_have_required_properties():
    for skill_cls in SKILL_CLASSES:
        skill = skill_cls()
        assert skill.id, f"{skill_cls.__name__} missing id"
        assert skill.name, f"{skill_cls.__name__} missing name"
        assert skill.domain, f"{skill_cls.__name__} missing domain"
        assert skill.description, f"{skill_cls.__name__} missing description"
        assert len(skill.allowed_agents) > 0, f"{skill_cls.__name__} has no allowed_agents"
        assert skill.risk_level in ("low", "medium", "high"), f"{skill_cls.__name__} invalid risk_level"


def test_skills_cannot_run_under_forbidden_agents():
    chat_skill = ChatResponseSkill()
    assert "1.Nexus - Governance" in chat_skill.forbidden_agents
    assert "4.Nexus - Backend-GraphQL" in chat_skill.forbidden_agents

    gov_skill = CheckGovernanceSkill()
    assert "0.Nexus - General Chat" in gov_skill.forbidden_agents
    assert "5.Nexus - Frontend-UI" in gov_skill.forbidden_agents

    audit_skill = AuditArchitectureSkill()
    assert "1.Nexus - Governance" in audit_skill.forbidden_agents
    assert "4.Nexus - Backend-GraphQL" in audit_skill.forbidden_agents


def test_skills_return_structured_output():
    task = Task(id="test", intent=Intent.GENERAL_CHAT, input="Test input")
    for skill_cls in SKILL_CLASSES:
        skill = skill_cls()
        inp = SkillInput(task=task)
        output = skill.execute(inp)
        assert output.status.name in ("SUCCESS", "FAILED"), f"{skill_cls.__name__} unexpected status"
        if output.status.name == "SUCCESS":
            assert output.result is not None, f"{skill_cls.__name__} returned None result"
            assert isinstance(output.result, dict), f"{skill_cls.__name__} result not a dict"


if __name__ == "__main__":
    test_skill_registry_entries_have_required_fields()
    test_all_skills_have_required_properties()
    test_skills_cannot_run_under_forbidden_agents()
    test_skills_return_structured_output()
    print("All skill tests passed.")
