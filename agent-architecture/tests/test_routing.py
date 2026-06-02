from __future__ import annotations
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from shared.types import Task, Intent
from execution.agent_routing import LeanSyncRouter
from agents.base import create_all_agents


def test_router_sends_governance_to_governance():
    agents = create_all_agents()
    agent_map = {a.id: a for a in agents}
    router = LeanSyncRouter(agent_map)

    task = Task(id="1", intent=Intent.GENERAL_CHAT, input="I need to check compliance with governance policy ISO 9001")
    decision = router.route(task)
    agent_id = router.select_agent(task)

    assert decision.intent == Intent.GOVERNANCE, f"Expected GOVERNANCE, got {decision.intent}"
    assert agent_id == "1.Nexus - Governance", f"Expected Governance agent, got {agent_id}"


def test_router_sends_frontend_to_frontend():
    agents = create_all_agents()
    agent_map = {a.id: a for a in agents}
    router = LeanSyncRouter(agent_map)

    task = Task(id="2", intent=Intent.GENERAL_CHAT, input="Create a React component with a form and Tailwind styling")
    decision = router.route(task)
    agent_id = router.select_agent(task)

    assert decision.intent == Intent.FRONTEND_UI, f"Expected FRONTEND_UI, got {decision.intent}"
    assert agent_id == "5.Nexus - Frontend-UI", f"Expected Frontend-UI agent, got {agent_id}"


def test_router_sends_backend_to_backend():
    agents = create_all_agents()
    agent_map = {a.id: a for a in agents}
    router = LeanSyncRouter(agent_map)

    task = Task(id="3", intent=Intent.GENERAL_CHAT, input="Implement a GraphQL resolver with schema validation")
    decision = router.route(task)
    agent_id = router.select_agent(task)

    assert decision.intent == Intent.BACKEND_GRAPHQL, f"Expected BACKEND_GRAPHQL, got {decision.intent}"
    assert agent_id == "4.Nexus - Backend-GraphQL", f"Expected Backend-GraphQL agent, got {agent_id}"


def test_router_sends_audit_to_architecture_audit():
    agents = create_all_agents()
    agent_map = {a.id: a for a in agents}
    router = LeanSyncRouter(agent_map)

    task = Task(id="4", intent=Intent.GENERAL_CHAT, input="Verify the implementation for code review and technical debt")
    decision = router.route(task)
    agent_id = router.select_agent(task)

    assert decision.intent == Intent.ARCHITECTURE_AUDIT, f"Expected ARCHITECTURE_AUDIT, got {decision.intent}"
    assert agent_id == "3.Nexus - Architecture Audit", f"Expected Architecture Audit agent, got {agent_id}"


def test_router_falls_back_to_general_chat():
    agents = create_all_agents()
    agent_map = {a.id: a for a in agents}
    router = LeanSyncRouter(agent_map)

    task = Task(id="5", intent=Intent.GENERAL_CHAT, input="Hello, how are you today?")
    decision = router.route(task)
    agent_id = router.select_agent(task)

    assert decision.intent == Intent.GENERAL_CHAT, f"Expected GENERAL_CHAT, got {decision.intent}"
    assert agent_id == "0.Nexus - General Chat", f"Expected General Chat agent, got {agent_id}"
    assert decision.fallback_used, "Expected fallback to be used"


def test_router_resolves_multi_domain_by_authority():
    agents = create_all_agents()
    agent_map = {a.id: a for a in agents}
    router = LeanSyncRouter(agent_map)

    task = Task(id="6", intent=Intent.GENERAL_CHAT, input="Create a React component and a GraphQL resolver for it")
    decision = router.route(task)
    agent_id = router.select_agent(task)

    assert not decision.is_multi_domain, "Authority resolution should resolve multi-domain"
    assert decision.intent in (Intent.FRONTEND_UI, Intent.BACKEND_GRAPHQL), \
        f"Expected FRONTEND_UI or BACKEND_GRAPHQL, got {decision.intent}"


def test_router_governance_takes_priority_in_multi_domain():
    agents = create_all_agents()
    agent_map = {a.id: a for a in agents}
    router = LeanSyncRouter(agent_map)

    task = Task(id="8", intent=Intent.GENERAL_CHAT,
                input="Governance policy for production plant resources in the backend UI")
    decision = router.route(task)
    agent_id = router.select_agent(task)

    assert decision.intent == Intent.GOVERNANCE, \
        f"Governance should take priority, got {decision.intent}"
    assert agent_id == "1.Nexus - Governance"


def test_router_sends_manufacturing_to_manufacturing():
    agents = create_all_agents()
    agent_map = {a.id: a for a in agents}
    router = LeanSyncRouter(agent_map)

    task = Task(id="7", intent=Intent.GENERAL_CHAT, input="Analyze the production line routing and BOM structure")
    decision = router.route(task)
    agent_id = router.select_agent(task)

    assert decision.intent == Intent.MANUFACTURING_STRUCTURE, f"Expected MANUFACTURING_STRUCTURE, got {decision.intent}"
    assert agent_id == "2.Nexus - Manufacturing Structure", f"Expected Manufacturing Structure agent, got {agent_id}"


if __name__ == "__main__":
    test_router_sends_governance_to_governance()
    test_router_sends_frontend_to_frontend()
    test_router_sends_backend_to_backend()
    test_router_sends_audit_to_architecture_audit()
    test_router_falls_back_to_general_chat()
    test_router_resolves_multi_domain_by_authority()
    test_router_governance_takes_priority_in_multi_domain()
    test_router_sends_manufacturing_to_manufacturing()
    print("All routing tests passed.")
