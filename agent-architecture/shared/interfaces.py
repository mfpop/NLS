from abc import ABC, abstractmethod
from typing import Any, Optional

from shared.types import (
    Task,
    SkillInput,
    SkillOutput,
    AgentDecision,
    RoutingDecision,
    ExecutionResult,
    ContextDocument,
)


class Skill(ABC):
    @property
    @abstractmethod
    def id(self) -> str: ...

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def domain(self) -> str: ...

    @property
    @abstractmethod
    def description(self) -> str: ...

    @property
    @abstractmethod
    def allowed_agents(self) -> list[str]: ...

    @property
    @abstractmethod
    def forbidden_agents(self) -> list[str]: ...

    @property
    @abstractmethod
    def side_effects(self) -> bool: ...

    @property
    @abstractmethod
    def risk_level(self) -> str: ...

    @abstractmethod
    def execute(self, inp: SkillInput) -> SkillOutput: ...


class Agent(ABC):
    @property
    @abstractmethod
    def id(self) -> str: ...

    @property
    @abstractmethod
    def role(self) -> str: ...

    @property
    @abstractmethod
    def mission(self) -> str: ...

    @property
    @abstractmethod
    def authority(self) -> str: ...

    @property
    @abstractmethod
    def allowed_tasks(self) -> list[str]: ...

    @property
    @abstractmethod
    def forbidden_tasks(self) -> list[str]: ...

    @property
    @abstractmethod
    def allowed_skill_ids(self) -> list[str]: ...

    @abstractmethod
    def decide(self, task: Task) -> AgentDecision: ...

    @abstractmethod
    def execute(self, inp: SkillInput) -> SkillOutput: ...


class Router(ABC):
    @abstractmethod
    def route(self, task: Task) -> RoutingDecision: ...

    @abstractmethod
    def select_agent(self, task: Task) -> str: ...


class MemoryStore(ABC):
    @abstractmethod
    def save(self, namespace: str, key: str, value: Any) -> None: ...

    @abstractmethod
    def load(self, namespace: str, key: str) -> Any: ...

    @abstractmethod
    def search(self, namespace: str, query: str, limit: int = 10) -> list[Any]: ...

    @abstractmethod
    def delete(self, namespace: str, key: str) -> None: ...

    @abstractmethod
    def clear_namespace(self, namespace: str) -> None: ...


class ContextProvider(ABC):
    @abstractmethod
    def load_context(self, paths: list[str]) -> list[ContextDocument]: ...

    @abstractmethod
    def get_document(self, path: str) -> Optional[ContextDocument]: ...


class ResultFormatter(ABC):
    @abstractmethod
    def format(self, result: ExecutionResult) -> str: ...
