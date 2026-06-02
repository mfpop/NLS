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
from shared.constants import CONTEXT_FILES
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
