# Nexus Agent Framework — LeanSync

## Purpose

Nexus is a modular, multi-agent framework for the LeanSync manufacturing operations management platform. It provides structured agent definitions, independent skills, intent-based routing, and a clear source-of-truth hierarchy.

## Folder Structure

```
agent-architecture/
├── project_context/         # Permanent source of truth
│   ├── CHAT_INDEX.md
│   ├── LEAN_SYNC_MASTER_CONTEXT.md
│   ├── DOMAIN_CONSTITUTION.md
│   ├── ARCHITECTURE.md
│   ├── WORKSPACE_RULES.md
│   └── ACTIVE_DECISIONS.md
├── agents/                  # Agent definitions
│   ├── 0.Nexus - General Chat/agent.yaml
│   ├── 1.Nexus - Governance/agent.yaml
│   ├── 2.Nexus - Manufacturing Structure/agent.yaml
│   ├── 3.Nexus - Architecture Audit/agent.yaml
│   ├── 4.Nexus - Backend-GraphQL/agent.yaml
│   ├── 5.Nexus - Frontend-UI/agent.yaml
│   ├── base.py              # Generic agent factory
│   └── __init__.py
├── skills/                  # Independent domain skills
│   ├── general/chat_response.py
│   ├── governance/check_governance.py
│   ├── manufacturing/analyze_manufacturing_structure.py
│   ├── audit/audit_architecture.py
│   ├── backend/validate_schema.py
│   ├── backend/analyze_models.py
│   ├── backend/analyze_services.py
│   ├── backend/analyze_graphql.py
│   ├── frontend/analyze_ui.py
│   ├── frontend/validate_tailwind.py
│   ├── frontend/render_component.py
│   └── registry/skill_registry.yaml
├── memory/                  # Runtime memory only
│   ├── memory_config.yaml
│   └── memory_store.py
├── config/                  # System configuration
│   ├── model_config.yaml
│   ├── system_config.yaml
│   ├── routing_config.yaml
│   └── logging_config.yaml
├── execution/               # Orchestration
│   ├── agent_routing.py
│   ├── execution_loop.py
│   ├── task_runner.py
│   └── result_formatter.py
├── shared/                  # Shared contracts
│   ├── types.py
│   ├── interfaces.py
│   ├── constants.py
│   └── exceptions.py
├── tests/                   # Test suite
│   ├── test_routing.py
│   ├── test_agents.py
│   ├── test_skills.py
│   └── test_memory.py
├── main.py                  # CLI entry point
└── README.md
```

## Source of Truth Rules

1. `project_context/` is the official local source of truth.
2. Agents reference `project_context/` as read-only context.
3. `memory/` is runtime memory only.
4. `memory/` must not override `project_context/`.
5. Skills must not define permanent governance rules.
6. Governance-approved rules must be written into `project_context/`.
7. Chats and memory are temporary.
8. Stable decisions belong in `project_context/ACTIVE_DECISIONS.md`.

## Agents

| # | Agent | Role | Mission |
|---|-------|------|---------|
| 0 | General Chat | Coordinator | General consultation, planning, routing, triage |
| 1 | Governance | Rule Authority | Own rules, invariants, permanent decisions |
| 2 | Manufacturing Structure | Domain Expert | Own Company/Plant/Line/Resource hierarchy |
| 3 | Architecture Audit | Verifier | Audit completed work against rules |
| 4 | Backend-GraphQL | Implementer | Own Django, GraphQL, MySQL, services |
| 5 | Frontend-UI | Implementer | Own React, Tailwind, Apollo, UI/UX |

## Skills

| ID | Domain | Side Effects | Risk | Allowed Agents |
|----|--------|-------------|------|----------------|
| `chat_response` | general | false | low | 0 |
| `check_governance` | governance | false | high | 1 |
| `analyze_manufacturing_structure` | manufacturing | false | medium | 2 |
| `audit_architecture` | audit | false | high | 3 |
| `validate_schema` | backend | false | medium | 4 |
| `analyze_models` | backend | false | medium | 4 |
| `analyze_services` | backend | false | medium | 4 |
| `analyze_graphql` | backend | false | medium | 4 |
| `analyze_ui` | frontend | false | low | 5 |
| `validate_tailwind` | frontend | false | low | 5 |
| `render_component` | frontend | true | medium | 5 |

## Routing Rules

- Governance questions -> Nexus Governance
- Backend implementation -> Nexus Backend-GraphQL
- Frontend/UI implementation -> Nexus Frontend-UI
- Manufacturing structure decisions -> Nexus Manufacturing Structure
- Completed implementation verification -> Nexus Architecture Audit
- Cross-domain planning -> Nexus General Chat first
- Unknown intent -> Nexus General Chat

## Memory Rules

- Governance memory may store decisions, but `project_context/` remains source of truth
- Runtime memory expires quickly (7 days TTL)
- Never store temporary debug output as permanent context
- Never let memory override `project_context/` files
- Each agent type has its own namespaced memory with appropriate TTL

## Running the CLI

```bash
python main.py
```

The CLI loads project context, routes to the best agent, executes the selected skill, and returns a formatted response.

## Adding a New Agent

1. Create `agents/{number}.Nexus - {Name}/agent.yaml` with all required fields
2. Add the agent to `agents/base.py` `create_all_agents()`
3. Add model config in `config/model_config.yaml`
4. Add routing keywords in `config/routing_config.yaml`

## Adding a New Skill

1. Create the skill file in the appropriate `skills/{domain}/` subdirectory
2. Register the skill in `skills/registry/skill_registry.yaml` with full schema
3. Import and add to `_SKILL_MAP` in `agents/base.py`
4. Add to the appropriate agent's `allowed_skills` in `agent.yaml`

## Updating project_context

- All permanent governance decisions go in `project_context/ACTIVE_DECISIONS.md`
- Architecture rules go in `project_context/ARCHITECTURE.md`
- Domain laws go in `project_context/DOMAIN_CONSTITUTION.md`
- Changes must be Governance-approved

## Warnings

- **Memory is NOT source of truth.** Never rely on memory for permanent decisions.
- Skills must NOT define permanent rules. Only Governance can do that.
- Architecture Audit must NOT create new rules. Only verify.
- Frontend must NOT contain business logic or mock data.
- Backend resolvers must stay thin. Domain services own business logic.
