from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Optional


class Intent(Enum):
    GENERAL_CHAT = auto()
    GOVERNANCE = auto()
    MANUFACTURING_STRUCTURE = auto()
    ARCHITECTURE_AUDIT = auto()
    BACKEND_GRAPHQL = auto()
    FRONTEND_UI = auto()


class SkillStatus(Enum):
    PENDING = auto()
    RUNNING = auto()
    SUCCESS = auto()
    FAILED = auto()


@dataclass
class Message:
    role: str
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Task:
    id: str
    intent: Intent
    input: str
    messages: list[Message] = field(default_factory=list)
    context: dict[str, Any] = field(default_factory=dict)


@dataclass
class ContextDocument:
    path: str
    content: str
    loaded_at: Optional[str] = None


@dataclass
class SkillInput:
    task: Task
    params: dict[str, Any] = field(default_factory=dict)
    context_documents: list[ContextDocument] = field(default_factory=list)
    workspace_root: str = "."


@dataclass
class SkillOutput:
    status: SkillStatus
    result: Any = None
    error: Optional[str] = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentDecision:
    agent_id: str
    skill_name: str
    confidence: float
    routing_reason: str = ""


@dataclass
class RoutingDecision:
    agent_id: str
    intent: Intent
    confidence: float
    matched_keywords: list[str] = field(default_factory=list)
    is_multi_domain: bool = False
    fallback_used: bool = False
    requires_governance: bool = False
    requires_audit: bool = False


@dataclass
class ExecutionResult:
    task_id: str
    agent_id: str
    skill_name: str
    status: SkillStatus
    output: Any = None
    error: Optional[str] = None
    context_files_used: list[str] = field(default_factory=list)
    routing_decision: Optional[RoutingDecision] = None


@dataclass
class MemoryRecord:
    namespace: str
    key: str
    value: Any
    timestamp: str
    ttl_days: int
