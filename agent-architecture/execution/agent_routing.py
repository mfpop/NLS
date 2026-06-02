from __future__ import annotations
import logging
from typing import Optional

import yaml

from shared.types import Task, Intent, RoutingDecision
from shared.interfaces import Router, Agent
from shared.constants import AGENT_IDS, INTENT_TO_AGENT

logger = logging.getLogger("nexus.routing")


class LeanSyncRouter(Router):
    def __init__(
        self,
        agents: dict[str, Agent],
        config_path: str = "config/routing_config.yaml",
        system_config_path: str = "config/system_config.yaml",
    ):
        self.agents = agents
        with open(config_path) as f:
            self.routing_cfg = yaml.safe_load(f)["routing"]
        with open(system_config_path) as f:
            sys_cfg = yaml.safe_load(f)
        self.fallback_id = sys_cfg["routing"]["fallback_agent"]
        self.threshold = sys_cfg["routing"]["threshold"]

    AUTHORITY_ORDER = [
        Intent.GOVERNANCE,
        Intent.ARCHITECTURE_AUDIT,
        Intent.MANUFACTURING_STRUCTURE,
        Intent.BACKEND_GRAPHQL,
        Intent.FRONTEND_UI,
    ]

    def classify_intent(self, text: str) -> tuple[Intent, list[str], bool]:
        text_lower = text.lower()
        intent_map = self.routing_cfg["intent_keywords"]
        matched_intents: dict[Intent, list[str]] = {}

        for intent_name, keywords in intent_map.items():
            matched = [kw for kw in keywords if kw in text_lower]
            if matched:
                intent_enum = getattr(Intent, intent_name.upper(), None)
                if intent_enum:
                    matched_intents[intent_enum] = matched

        if len(matched_intents) > 1:
            for priority_intent in self.AUTHORITY_ORDER:
                if priority_intent in matched_intents:
                    logger.info(
                        "Multi-domain resolved by authority: %s over others",
                        priority_intent.name,
                    )
                    return priority_intent, matched_intents[priority_intent], False
            return Intent.GENERAL_CHAT, [], True

        for intent, keywords in matched_intents.items():
            return intent, keywords, False

        return Intent.GENERAL_CHAT, [], False

    def route(self, task: Task) -> RoutingDecision:
        intent, keywords, is_multi = self.classify_intent(task.input)

        intent_mapping = self.routing_cfg["agent_mapping"]
        direct_map = {
            Intent.GOVERNANCE: intent_mapping["governance"],
            Intent.MANUFACTURING_STRUCTURE: intent_mapping["manufacturing_structure"],
            Intent.ARCHITECTURE_AUDIT: intent_mapping["architecture_audit"],
            Intent.BACKEND_GRAPHQL: intent_mapping["backend_graphql"],
            Intent.FRONTEND_UI: intent_mapping["frontend_ui"],
            Intent.GENERAL_CHAT: intent_mapping["general_chat"],
        }

        agent_id = direct_map.get(intent, self.fallback_id)
        fallback_used = intent == Intent.GENERAL_CHAT and not keywords
        confidence = 0.9 if keywords else 0.5

        requires_governance = False
        requires_audit = False

        logger.info(
            "Routing decision: intent=%s agent=%s keywords=%s multi=%s fallback=%s",
            intent.name, agent_id, keywords, is_multi, fallback_used,
        )

        return RoutingDecision(
            agent_id=agent_id,
            intent=intent,
            confidence=confidence,
            matched_keywords=keywords,
            is_multi_domain=is_multi,
            fallback_used=fallback_used,
            requires_governance=requires_governance,
            requires_audit=requires_audit,
        )

    def select_agent(self, task: Task) -> str:
        decision = self.route(task)

        if decision.is_multi_domain:
            logger.info("Multi-domain detected, routing to General Chat for coordination")
            return self.fallback_id

        if decision.requires_governance and decision.intent != Intent.GOVERNANCE:
            logger.info("Governance required, routing to Governance")
            return self.routing_cfg["agent_mapping"]["governance"]

        if decision.requires_audit and decision.intent != Intent.ARCHITECTURE_AUDIT:
            logger.info("Audit required, routing to Architecture Audit")
            return self.routing_cfg["agent_mapping"]["architecture_audit"]

        return decision.agent_id
