from shared.types import Intent


AGENT_IDS = {
    "general_chat": "0.Nexus - General Chat",
    "governance": "1.Nexus - Governance",
    "manufacturing_structure": "2.Nexus - Manufacturing Structure",
    "architecture_audit": "3.Nexus - Architecture Audit",
    "backend_graphql": "4.Nexus - Backend-GraphQL",
    "frontend_ui": "5.Nexus - Frontend-UI",
    "manager": "10.Nexus - Manager",
}

INTENT_TO_AGENT: dict[Intent, str] = {
    Intent.GENERAL_CHAT: AGENT_IDS["general_chat"],
    Intent.GOVERNANCE: AGENT_IDS["governance"],
    Intent.MANUFACTURING_STRUCTURE: AGENT_IDS["manufacturing_structure"],
    Intent.ARCHITECTURE_AUDIT: AGENT_IDS["architecture_audit"],
    Intent.BACKEND_GRAPHQL: AGENT_IDS["backend_graphql"],
    Intent.FRONTEND_UI: AGENT_IDS["frontend_ui"],
}

AGENT_TO_INTENT: dict[str, Intent] = {v: k for k, v in INTENT_TO_AGENT.items()}

CONTEXT_FILES = [
    "project_context/CHAT_INDEX.md",
    "project_context/LEAN_SYNC_MASTER_CONTEXT.md",
    "project_context/DOMAIN_CONSTITUTION.md",
    "project_context/ARCHITECTURE.md",
    "project_context/WORKSPACE_RULES.md",
    "project_context/ACTIVE_DECISIONS.md",
]

DEFAULT_NEXUS_AGENT = "10.Nexus - Manager"
MAX_RETRIES = 3
DEFAULT_TIMEOUT_SECONDS = 60
