from __future__ import annotations
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import yaml
from pathlib import Path


REQUIRED_AGENT_FIELDS = [
    "name",
    "role",
    "mission",
    "authority",
    "allowed_tasks",
    "forbidden_tasks",
    "routing_rules",
    "required_context_files",
    "allowed_skills",
    "output_format",
    "response_rules",
    "handoff_rules",
]

AGENT_DIRS = [
    "0.Nexus - General Chat",
    "1.Nexus - Governance",
    "2.Nexus - Manufacturing Structure",
    "3.Nexus - Architecture Audit",
    "4.Nexus - Backend-GraphQL",
    "5.Nexus - Frontend-UI",
]


def test_all_agent_yamls_have_required_fields():
    base = Path("agents")
    for agent_dir in AGENT_DIRS:
        path = base / agent_dir / "agent.yaml"
        assert path.exists(), f"Missing agent.yaml for {agent_dir}"
        with open(path) as f:
            data = yaml.safe_load(f)
        for field in REQUIRED_AGENT_FIELDS:
            assert field in data, f"Missing field '{field}' in {agent_dir}/agent.yaml"


def test_agent_forbidden_tasks_are_defined():
    base = Path("agents")
    for agent_dir in AGENT_DIRS:
        with open(base / agent_dir / "agent.yaml") as f:
            data = yaml.safe_load(f)
        forbidden = data.get("forbidden_tasks", [])
        assert len(forbidden) > 0, f"No forbidden_tasks in {agent_dir}"


def test_agent_allowed_skills_are_defined():
    base = Path("agents")
    for agent_dir in AGENT_DIRS:
        with open(base / agent_dir / "agent.yaml") as f:
            data = yaml.safe_load(f)
        skills = data.get("allowed_skills", [])
        assert len(skills) > 0, f"No allowed_skills in {agent_dir}"


def test_agent_handoff_rules_are_defined():
    base = Path("agents")
    for agent_dir in AGENT_DIRS:
        with open(base / agent_dir / "agent.yaml") as f:
            data = yaml.safe_load(f)
        rules = data.get("handoff_rules", [])
        assert len(rules) > 0, f"No handoff_rules in {agent_dir}"


if __name__ == "__main__":
    test_all_agent_yamls_have_required_fields()
    test_agent_forbidden_tasks_are_defined()
    test_agent_allowed_skills_are_defined()
    test_agent_handoff_rules_are_defined()
    print("All agent tests passed.")
