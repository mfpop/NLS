# Nexus Chat Index

## Agent Architecture

```
agent-architecture/
├── agents/
│   ├── 0.Nexus - General Chat/
│   ├── 1.Nexus - Governance/
│   ├── 2.Nexus - Manufacturing Structure/
│   ├── 3.Nexus - Architecture Audit/
│   ├── 4.Nexus - Backend-GraphQL/
│   ├── 5.Nexus - Frontend-UI/
│   ├── 6.Nexus - Deployment/
│   └── 10.Nexus - Manager/
├── skills/
├── docs/
└── README.md
```

## Agent Registry

| # | Agent | Role | Scope |
|---|-------|------|-------|
| 0 | Nexus — General Chat | General project questions, status, redirection | Project-wide |
| 1 | Nexus — Governance | Rules & architecture decisions | Naming, invariants, patterns |
| 2 | Nexus — Manufacturing Structure | Org structure, BOM, routing | Manufacturing domain |
| 3 | Nexus — Architecture Audit | Implementation validation | Backend + Frontend |
| 4 | Nexus — Backend/GraphQL | Django, GraphQL, services | Backend |
| 5 | Nexus — Frontend/UI | React, TypeScript, Tailwind | Frontend |
| 6 | Nexus — Deployment | Build, deploy, smoke tests | Infrastructure |
| 10 | Nexus — Manager | Orchestration, task routing, conflict surfacing | All agents |

## Routing Rules

| Request Type | Target Agent |
|-------------|--------------|
| Orchestration, routing, multi-agent coordination | Nexus Manager |
| Project planning, chat organization | Nexus General Chat |
| Rules, naming, architecture decisions | Nexus Governance |
| Company/Plant/Dept/RG/Resource structure | Nexus Manufacturing Structure |
| Backend models, GraphQL, services, tests | Nexus Backend/GraphQL |
| React pages, components, forms, layout | Nexus Frontend/UI |
| Implementation validation | Nexus Architecture Audit |
| Build, deploy, migration execution | Nexus Deployment |

## Default Workflow
1. Governance
2. Backend/GraphQL
3. Frontend/UI
4. Architecture Audit
5. Deployment

## Key Documents
- `/docs/NEXUS_PROJECT_OPERATING_MODEL.md` — Operating model and conventions
- `/docs/agent-routing.md` — Detailed agent routing guide
- `/docs/deployment/README.md` — Deployment procedures
- `/agent-architecture/README.md` — Agent architecture overview
- `/agent-architecture/project_context/ACTIVE_DECISIONS.md` — Governance-approved active decisions
- `/agent-architecture/project_context/DOMAIN_CONSTITUTION.md` — Domain rules and constitution
- `/agent-architecture/project_context/ARCHITECTURE.md` — System architecture
- `/agent-architecture/project_context/LEAN_SYNC_MASTER_CONTEXT.md` — Full project context
- `/agent-architecture/project_context/WORKSPACE_RULES.md` — Workspace organization rules

## Agent Documentation
Each agent has both `AGENT.md` (human-readable) and `agent.yaml` (machine-readable) in its directory under `agent-architecture/agents/`.

## Skills Documentation
Each skill domain has a `SKILL.md` in its directory under `agent-architecture/skills/`.

## Quick Reference
```text
agent-architecture/
├── agents/           # Agent definitions (AGENT.md + agent.yaml)
│   ├── 0.Nexus - General Chat/
│   ├── 1.Nexus - Governance/
│   ├── 2.Nexus - Manufacturing Structure/
│   ├── 3.Nexus - Architecture Audit/
│   ├── 4.Nexus - Backend-GraphQL/
│   ├── 5.Nexus - Frontend-UI/
│   ├── 6.Nexus - Deployment/
│   └── 10.Nexus - Manager/
├── skills/           # Skill implementations + SKILL.md docs
├── project_context/  # Permanent source of truth
├── config/           # System configuration
├── execution/        # Orchestration and routing
└── shared/           # Types, interfaces, constants
```
