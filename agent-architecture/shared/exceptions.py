class NexusError(Exception):
    """Base exception for Nexus agent system errors."""


class RoutingError(NexusError):
    """Raised when routing fails to find a suitable agent."""


class AgentPermissionError(NexusError):
    """Raised when an agent attempts a forbidden task."""


class SkillExecutionError(NexusError):
    """Raised when a skill execution fails."""


class SkillNotAllowedError(NexusError):
    """Raised when an agent tries to use a skill it is not allowed to use."""


class ContextLoadError(NexusError):
    """Raised when project context files cannot be loaded."""


class MemoryOverflowError(NexusError):
    """Raised when memory storage exceeds limits."""


class InvalidConfigurationError(NexusError):
    """Raised when a configuration file is invalid or missing required fields."""
