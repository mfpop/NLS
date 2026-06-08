# Nexus Chat Index

## Agent Architecture

```
agent-architecture/
├── agents/
│   ├── 0.Nexus - Global Manager/
│   ├── 1.Nexus - General Chat/
│   ├── 2.Nexus - Governance/
│   ├── 3.Nexus - Manufacturing Structure/
│   ├── 4.Nexus - Architecture Audit/
│   ├── 5.Nexus - Backend-GraphQL/
│   ├── 6.Nexus - Frontend-UI/
│   └── 7.Nexus - Deployment/
├── skills/
├── docs/
└── README.md
```

## Agent Registry

| # | Agent | Role | Scope |
|---|-------|------|-------|
| 0 | Nexus — Global Manager | Orchestration & routing | All agents |
| 1 | Nexus — General Chat | Planning & coordination | Project-wide |
| 2 | Nexus — Governance | Rules & architecture decisions | Naming, invariants, patterns |
| 3 | Nexus — Manufacturing Structure | Org structure, BOM, routing | Manufacturing domain |
| 4 | Nexus — Architecture Audit | Implementation validation | Backend + Frontend |
| 5 | Nexus — Backend/GraphQL | Django, GraphQL, services | Backend |
| 6 | Nexus — Frontend/UI | React, TypeScript, Tailwind | Frontend |
| 7 | Nexus — Deployment | Build, deploy, smoke tests | Infrastructure |

## Routing Rules

| Request Type | Target Agent |
|-------------|--------------|
| Orchestration, routing, multi-agent coordination | Global Manager |
| Project planning, chat organization | General Chat |
| Rules, naming, architecture decisions | Governance |
| Company/Plant/Dept/RG/Resource structure | Manufacturing Structure |
| Backend models, GraphQL, services, tests | Backend/GraphQL |
| React pages, components, forms, layout | Frontend/UI |
| Implementation validation | Architecture Audit |
| Build, deploy, migration execution | Deployment |

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
│   ├── 0.Nexus - Global Manager/
│   ├── 1.Nexus - General Chat/
│   ├── 2.Nexus - Governance/
│   ├── 3.Nexus - Manufacturing Structure/
│   ├── 4.Nexus - Architecture Audit/
│   ├── 5.Nexus - Backend-GraphQL/
│   ├── 6.Nexus - Frontend-UI/
│   └── 7.Nexus - Deployment/
├── skills/           # Skill implementations + SKILL.md docs
├── project_context/  # Permanent source of truth
├── config/           # System configuration
├── execution/        # Orchestration and routing
└── shared/           # Types, interfaces, constants
```
