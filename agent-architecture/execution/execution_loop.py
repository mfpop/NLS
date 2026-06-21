from __future__ import annotations
import logging
import traceback
import uuid
from datetime import datetime
from typing import Optional

import yaml

from shared.types import (
    Task,
    Message,
    SkillInput,
    SkillOutput,
    SkillStatus,
    Intent,
    ContextDocument,
    ExecutionResult,
)
from shared.interfaces import Agent, MemoryStore, Router, ContextProvider, ResultFormatter
from shared.constants import CONTEXT_FILES, AGENT_IDS
from memory.memory_store import get_memory_store
from execution.agent_routing import LeanSyncRouter
from execution.task_runner import TaskRunner
from execution.result_formatter import SimpleResultFormatter

logger = logging.getLogger("nexus.execution")


class FileContextProvider(ContextProvider):
    def __init__(self, base_path: str = "."):
        self.base_path = base_path

    def set_context_base(self, path: str) -> None:
        self.base_path = path

    def load_context(self, paths: list[str]) -> list[ContextDocument]:
        docs = []
        for path in paths:
            doc = self.get_document(path)
            if doc:
                docs.append(doc)
        return docs

    def get_document(self, path: str) -> Optional[ContextDocument]:
        full_path = f"{self.base_path}/{path}" if self.base_path != "." else path
        try:
            with open(full_path, encoding="utf-8") as f:
                content = f.read()
            return ContextDocument(
                path=path,
                content=content,
                loaded_at=datetime.utcnow().isoformat(),
            )
        except FileNotFoundError:
            logger.warning("Context file not found: %s", full_path)
            return None
        except Exception as e:
            logger.error("Error loading context file %s: %s", full_path, e)
            return None


class AgentRegistry:
    def __init__(self):
        self._agents: dict[str, Agent] = {}

    def register(self, agent: Agent) -> None:
        self._agents[agent.id] = agent

    def get(self, agent_id: str) -> Optional[Agent]:
        return self._agents.get(agent_id)

    def all(self) -> dict[str, Agent]:
        return dict(self._agents)


class ExecutionLoop:
    def __init__(
        self,
        registry: AgentRegistry,
        router: Router,
        memory: Optional[MemoryStore] = None,
        context_provider: Optional[ContextProvider] = None,
        result_formatter: Optional[ResultFormatter] = None,
        config_path: str = "config/system_config.yaml",
        workspace_root: str = ".",
    ):
        self.registry = registry
        self.router = router
        self.memory = memory or get_memory_store()
        self.workspace_root = workspace_root
        self.context_provider = context_provider or FileContextProvider(base_path=workspace_root)
        self.result_formatter = result_formatter or SimpleResultFormatter()
        self.task_runner = TaskRunner(self.registry, self.memory, workspace_root=workspace_root)

        with open(config_path) as f:
            self.cfg = yaml.safe_load(f)
        self.store_results = self.cfg["execution"]["store_results"]

    def run(self, user_input: str, context: Optional[dict] = None) -> ExecutionResult:
        task = Task(
            id=str(uuid.uuid4()),
            intent=Intent.GENERAL_CHAT,
            input=user_input,
            messages=[Message(role="user", content=user_input)],
            context=context or {},
        )

        logger.info("Processing task %s: %s", task.id, user_input[:80])

        context_docs = self.context_provider.load_context(CONTEXT_FILES)
        context_files_used = [doc.path for doc in context_docs]

        routing_decision = self.router.route(task)
        agent_id = self.router.select_agent(task)

        task.intent = routing_decision.intent
        task.context["context_documents"] = context_docs
        task.context["routing_decision"] = routing_decision
        task.context["workspace_root"] = self.workspace_root

        default_entry_id = self.cfg.get("routing", {}).get("default_entry_agent", "")
        if default_entry_id and self.registry.get(default_entry_id):
            logger.info("Default entry agent '%s' active — orchestrating through Manager", default_entry_id)
            return self._run_manager_orchestration(task, context_docs, routing_decision)

        agent = self.registry.get(agent_id)
        if not agent:
            logger.error("Agent '%s' not found in registry", agent_id)
            return ExecutionResult(
                task_id=task.id,
                agent_id=agent_id,
                skill_name="",
                status=SkillStatus.FAILED,
                error=f"Agent '{agent_id}' not found",
                context_files_used=context_files_used,
                routing_decision=routing_decision,
            )

        try:
            output = self.task_runner.run(task, agent)
        except Exception as e:
            logger.error("Task %s failed: %s", task.id, str(e))
            logger.debug(traceback.format_exc())
            output = SkillOutput(
                status=SkillStatus.FAILED,
                error=str(e),
                metadata={"skill_name": "none"},
            )

        if self.store_results:
            self.memory.save(
                "runtime",
                task.id,
                {
                    "input": user_input,
                    "agent": agent_id,
                    "intent": routing_decision.intent.name,
                    "status": output.status.name,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

        result = ExecutionResult(
            task_id=task.id,
            agent_id=agent_id,
            skill_name=output.metadata.get("skill_name", ""),
            status=output.status,
            output=output.result,
            error=output.error,
            context_files_used=context_files_used,
            routing_decision=routing_decision,
        )

        logger.info(
            "Task %s complete: agent=%s status=%s",
            task.id, agent_id, output.status.name,
        )

        return result

    def _run_manager_orchestration(
        self,
        task: Task,
        context_docs: list[ContextDocument],
        routing_decision: RoutingDecision,
    ) -> ExecutionResult:
        user_input = task.input
        intent = routing_decision.intent
        context_files_used = [doc.path for doc in context_docs]

        intent_to_specialist = {
            Intent.GOVERNANCE: AGENT_IDS["governance"],
            Intent.MANUFACTURING_STRUCTURE: AGENT_IDS["manufacturing_structure"],
            Intent.ARCHITECTURE_AUDIT: AGENT_IDS["architecture_audit"],
            Intent.BACKEND_GRAPHQL: AGENT_IDS["backend_graphql"],
            Intent.FRONTEND_UI: AGENT_IDS["frontend_ui"],
            Intent.GENERAL_CHAT: AGENT_IDS["general_chat"],
        }

        specialist_id = intent_to_specialist.get(intent, AGENT_IDS["general_chat"])
        specialist = self.registry.get(specialist_id)
        specialist_name = specialist_id.split(".", 1)[-1].strip() if specialist_id else "unknown"

        handoff_lines = [
            "## Response",
            "",
            f"Your request has been classified as **{intent.name.replace('_', ' ').title()}**.",
            f"Routing to **{specialist_name}** for specialized handling.",
            "",
            "## Routing",
            f"- Intent: `{intent.name}`",
            f"- Specialist: `{specialist_id}`",
            f"- Confidence: {routing_decision.confidence:.1f}",
            f"- Fallback: {routing_decision.fallback_used}",
            "",
        ]

        if specialist:
            handoff_lines.extend([
                "## Handoff",
                "",
                "```text",
                "Task:",
                f"  {user_input[:200]}",
                "Target Agent:",
                f"  {specialist_id}",
                "Context:",
                f"  {specialist_name} — {specialist.mission[:100] if specialist.mission else ''}",
                "Rules:",
                "  - Domain services own business logic",
                "  - Resolvers thin, frontend has no business rules",
                "  - No mock/hardcoded operational data",
                "  - Files under 1000 lines",
                "Validation:",
                "  - Verify against ACTIVE_DECISIONS.md",
                "  - Preserve Clean Architecture layering",
                "```",
            ])

        result_text = "\n".join(handoff_lines)

        if self.store_results:
            self.memory.save(
                "runtime",
                task.id,
                {
                    "input": user_input,
                    "agent": AGENT_IDS["manager"],
                    "specialist": specialist_id,
                    "intent": intent.name,
                    "status": "SUCCESS",
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

        logger.info(
            "Manager orchestrated: intent=%s specialist=%s",
            intent.name, specialist_id,
        )

        return ExecutionResult(
            task_id=task.id,
            agent_id=AGENT_IDS["manager"],
            skill_name="manager_orchestrate",
            status=SkillStatus.SUCCESS,
            output=result_text,
            context_files_used=context_files_used,
            routing_decision=routing_decision,
        )


def create_default_loop(workspace_root: str = ".", context_base: str = "") -> ExecutionLoop:
    from agents.base import create_all_agents

    registry = AgentRegistry()
    agents = create_all_agents()
    for a in agents:
        registry.register(a)

    router = LeanSyncRouter(registry.all())
    context_provider = FileContextProvider(base_path=context_base or workspace_root)
    formatter = SimpleResultFormatter()
    return ExecutionLoop(
        registry=registry,
        router=router,
        context_provider=context_provider,
        result_formatter=formatter,
        workspace_root=workspace_root,
    )
